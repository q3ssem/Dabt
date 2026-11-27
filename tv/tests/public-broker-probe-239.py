"""One MQTT round trip per configured public broker, unique topic, no app rooms or load."""
import asyncio,json,os,secrets,subprocess,time,ssl
from pathlib import Path
from websockets.asyncio.client import connect
root=Path(__file__).resolve().parent.parent
urls=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./shared/core.js').config({}).brokers))"],cwd=root))
def mqttstr(s):
    a=s.encode();return len(a).to_bytes(2,'big')+a
def packet(h,b):
    n=len(b);a=[]
    while True:
        v=n%128;n//=128;a.append(v|(128 if n else 0))
        if not n:break
    return bytes([h,*a])+b
async def probe(url):
    start=time.monotonic();stage='wss'
    try:
        async with connect(url,subprotocols=['mqtt'],open_timeout=12,close_timeout=2,ping_interval=None) as ws:
            stage='connack'
            await ws.send(packet(0x10,mqttstr('MQTT')+bytes([4,2,0,20])+mqttstr('majlisqa-'+secrets.token_hex(6))))
            reply=await asyncio.wait_for(ws.recv(),8)
            assert reply==bytes([0x20,2,0,0]),repr(reply)
            stage='suback';topic='majlis-qa/'+secrets.token_hex(16);token=secrets.token_hex(8).encode()
            await ws.send(packet(0x82,b'\x00\x01'+mqttstr(topic)+b'\x00'))
            reply=await asyncio.wait_for(ws.recv(),8)
            assert reply==bytes([0x90,3,0,1,0]),repr(reply)
            stage='publish echo';await ws.send(packet(0x30,mqttstr(topic)+token))
            reply=await asyncio.wait_for(ws.recv(),8)
            assert reply==packet(0x30,mqttstr(topic)+token),repr(reply)
            await ws.send(bytes([0xe0,0]))
            return {'url':url,'passed':True,'stage':'mqtt roundtrip','milliseconds':round((time.monotonic()-start)*1000)}
    except Exception as e:return {'url':url,'passed':False,'stage':stage,'error':type(e).__name__+': '+str(e)[:200]}
async def main():
    results=await asyncio.gather(*(probe(u) for u in urls))
    out=root/'tests/results/2.3.9-public-probe';out.mkdir(parents=True,exist_ok=True)
    report={'results':results,'reachable':sum(r['passed'] for r in results),'total':len(results),'runnerOnly':True,'physicalDevice':False,'appLoad':False}
    (out/'public-probe.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
    if not report['reachable']:raise SystemExit('No public broker roundtrip from this runner')
asyncio.run(main())
