"""Isolated real WebSocket TCP endpoints speaking MQTT 3.1.1 QoS 0.
No public network, no production changes. Browser maps explicit QA WSS URLs
to loopback WS; protocol bytes and socket lifetime are genuine.
"""
import asyncio, json, threading
from websockets.asyncio.server import serve

BROKERS=[f'wss://qa-broker-{i}.invalid/mqtt' for i in range(3)]

def encode(topic, raw):
    t=topic.encode();body=len(t).to_bytes(2,'big')+t+raw;n=len(body);buf=[]
    while True:
        d=n%128;n//=128;buf.append(d|(128 if n else 0))
        if not n:break
    return bytes([0x30,*buf])+body

def packets(raw):
    assert isinstance(raw,bytes),'expected binary MQTT'
    i=0
    while i<len(raw):
        typ=raw[i]>>4;i+=1;n=0;mul=1
        for _ in range(4):
            b=raw[i];i+=1;n+=(b&127)*mul;mul*=128
            if not b&128:break
        else:raise ValueError('MQTT remaining length overflow')
        assert i+n<=len(raw),'incomplete MQTT packet'
        yield typ,raw[i:i+n];i+=n

class LocalBrokers:
    def __init__(self, observe=None):
        self.observe=observe
        self.loop=asyncio.new_event_loop();self.ready=threading.Event()
        self.peers={};self.counter=0;self.errors=[];self.mapping={};self.blocked=False
        self.thread=threading.Thread(target=self._run,daemon=True);self.thread.start()
        assert self.ready.wait(15),'loopback brokers did not start'
        assert len(self.mapping)==3,self.errors
    def _run(self):
        asyncio.set_event_loop(self.loop)
        try:self.loop.run_until_complete(self._start())
        except Exception as e:self.errors.append(repr(e));self.ready.set();return
        self.ready.set();self.loop.run_forever()
    async def _start(self):
        self.servers=[]
        for url in BROKERS:
            async def handler(ws, broker=url):await self._handle(ws,broker)
            server=await serve(handler,'127.0.0.1',0,subprotocols=['mqtt'],max_size=2_000_000,ping_interval=None)
            self.servers.append(server)
            port=server.sockets[0].getsockname()[1];self.mapping[url]=f'ws://127.0.0.1:{port}/mqtt'
    async def _handle(self,ws,broker):
        if self.blocked:
            await ws.close(code=1013,reason='QA temporary outage');return
        self.counter+=1;pid=self.counter;peer={'id':pid,'broker':broker,'ws':ws,'subs':set(),'open':True};self.peers[pid]=peer
        try:
            async for raw in ws:
                for typ,body in packets(raw):
                    if typ==1:await ws.send(bytes([0x20,2,0,0]))
                    elif typ==8:
                        cursor=2;codes=[]
                        while cursor<len(body):
                            n=int.from_bytes(body[cursor:cursor+2],'big');cursor+=2
                            topic=body[cursor:cursor+n].decode();cursor+=n
                            assert cursor<len(body)
                            peer['subs'].add(topic);codes.append(0);cursor+=1
                        await ws.send(bytes([0x90,2+len(codes),body[0],body[1],*codes]))
                    elif typ==12:await ws.send(bytes([0xd0,0]))
                    elif typ==3:
                        n=int.from_bytes(body[:2],'big');topic=body[2:2+n].decode();payload=body[2+n:]
                        if self.observe and self.observe(topic,payload,broker):continue
                        for other in list(self.peers.values()):
                            if other['open'] and other['broker']==broker and topic in other['subs']:
                                try:await other['ws'].send(encode(topic,payload))
                                except Exception:pass
        except Exception as e:
            from websockets.exceptions import ConnectionClosed
            if not isinstance(e,ConnectionClosed):self.errors.append(repr(e))
        finally:peer['open']=False
    def install(self,ctx):
        # Native WebSocket is retained; only exact synthetic test destinations map to loopback.
        ctx.add_init_script("""(()=>{const map=MAP, Native=window.WebSocket;class QAWebSocket extends Native{constructor(url,protocols){const dest=map[String(url)];if(!dest)throw new Error('Unexpected QA WebSocket destination: '+url);super(dest,protocols)}}window.WebSocket=QAWebSocket})()""".replace('MAP',json.dumps(self.mapping),1))
    async def _snapshot(self):
        return [{'id':p['id'],'broker':p['broker'],'open':p['open'],'subs':sorted(p['subs'])} for p in self.peers.values()]
    def snapshot(self):
        return asyncio.run_coroutine_threadsafe(self._snapshot(),self.loop).result(5)
    async def _disconnect(self,pid):
        peer=self.peers[pid];await peer['ws'].close(code=1001,reason='QA broker fault')
    def disconnect(self,pid):
        asyncio.run_coroutine_threadsafe(self._disconnect(pid),self.loop).result(15)
    def assert_clean(self):assert not self.errors,self.errors

    async def _outage(self, blocked):
        self.blocked=blocked
        if blocked:
            await asyncio.gather(*(p['ws'].close(code=1013,reason='QA outage') for p in list(self.peers.values()) if p['open']),return_exceptions=True)
    def outage(self, blocked):
        asyncio.run_coroutine_threadsafe(self._outage(blocked),self.loop).result(15)
