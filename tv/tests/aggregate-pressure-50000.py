import json, sys
from pathlib import Path
files=list(Path(sys.argv[1]).rglob('stress-result.json'))
rows=[json.loads(f.read_text()) for f in files]
assert len(rows)==500 and {r['game'] for r in rows}==set(range(500)), 'missing/duplicate game evidence'
assert all(r['passed'] and not r['pageErrors'] for r in rows), 'failed game'
assert len({r['sessionId'] for r in rows})==500
for r in rows:
    i=r['game'];p,n=(20,20) if i<50 else (20,5) if i<150 else (10,8) if i<300 else (5,8)
    assert (r['players'],r['questions'],r['answers'],r['browserPhoneContexts'])==(p,n,p*n,p)
    assert len(r['rounds'])==n and {q['round'] for q in r['rounds']}==set(range(1,n+1))
    assert all(q['answers']==p for q in r['rounds'])
    profile={0:'drop',1:'reload',2:'late',3:'help',4:'overlap'}.get(i%25,'standard')
    assert r['profile']==profile
    f=r['faults']
    assert f['decodeErrors']==0 and f['observedAnswerPackets']>=p*n
    if profile=='drop':assert f['droppedAnswerCopies']==3 and f['dropAckConfirmed'] and f['retryAfterMs']>=600
    if profile=='reload':assert f['reloaded']
    if profile=='late':assert 55000<=f['lateElapsedMs']<60000
    if profile=='help':assert f['help'] and f['objection']
    if profile=='overlap':assert f['overlap']
total=sum(r['answers'] for r in rows)
assert total==50000
report={'passed':True,'runtimeVersion':'2.3.8.1','qaVersion':'2.3.8','games':len(rows),'answers':total,'rounds':sum(r['questions'] for r in rows),'browserPhoneContexts':sum(r['players'] for r in rows),'assertions':sum(r['assertions'] for r in rows),'profiles':{p:sum(r['profile']==p for r in rows) for p in ['standard','drop','reload','late','help','overlap']},'physicalTV':False,'physicalPhone':False,'publicBrokers':False}
Path('acceptance-50000.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
