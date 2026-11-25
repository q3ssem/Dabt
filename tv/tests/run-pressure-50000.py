"""Execute five independent browser games per shard, without reruns."""
import os, sys, subprocess, json
from pathlib import Path
shard=int(os.environ['QA_BATCH']);assert 0<=shard<100
root=Path(__file__).resolve().parent
out=root/'results'/'2.3.8'
failed=[]
for game in range(shard*5,shard*5+5):
    print(f'GAME {game} START',flush=True)
    env={**os.environ,'QA_GAME':str(game),'QA_OUTPUT':str(out)}
    status=subprocess.run([sys.executable,str(root/'browser-pressure-50000.py')],env=env).returncode
    if status:failed.append(game)
print(json.dumps({'batch':shard,'games':5,'failed':failed}),flush=True)
sys.exit(bool(failed))
