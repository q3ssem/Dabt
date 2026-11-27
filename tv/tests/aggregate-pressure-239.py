import json,sys
from pathlib import Path
rows=[json.loads(p.read_text()) for p in Path(sys.argv[1]).rglob('stress-result.json')]
assert len(rows)==20 and {r['game'] for r in rows}==set(range(20)), 'missing/duplicate games'
assert len({r['sessionId'] for r in rows})==20
for r in rows:
    assert r['passed'] and not r['pageErrors']
    assert (r['players'],r['questions'],r['answers'],r['browserPhoneContexts'])==(20,30,600,20)
    assert len(r['rounds'])==30 and {x['round'] for x in r['rounds']}==set(range(1,31))
    assert all(x['answers']==20 for x in r['rounds'])
    f=r['faults'];assert f['decodeErrors']==0 and f['observedAnswerPackets']>=600
    profile={0:'drop',1:'reload',2:'late',3:'help',4:'overlap'}.get(r['game'],'standard')
    assert r['profile']==profile
    if profile=='drop':assert f['droppedAnswerCopies']==3 and f['dropAckConfirmed'] and f['retryAfterMs']>=600
    if profile=='reload':assert f['reloaded']
    if profile=='late':assert 55000<=f['lateElapsedMs']<60000
    if profile=='help':assert f['help'] and f['objection']
    if profile=='overlap':assert f['overlap']
report={'passed':True,'version':'2.3.9','answers':sum(r['answers'] for r in rows),'games':20,'assertions':sum(r['assertions'] for r in rows),'rounds':600,'publicBrokers':False,'physicalTV':False,'physicalPhone':False}
assert report['answers']==12000
Path('majlis-acceptance.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
