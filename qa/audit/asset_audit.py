from collections import defaultdict
from pathlib import Path
import hashlib, json
ROOT=Path(__file__).resolve().parents[2]
MEDIA={'.webp','.png','.jpg','.jpeg','.avif','.svg','.gif'}
SOURCE={'.js','.cjs','.css','.html','.json','.webmanifest','.csv','.py'}
EXCLUDE={'.git','node_modules','__pycache__'}
files=[p for p in ROOT.rglob('*') if p.is_file() and not EXCLUDE.intersection(p.relative_to(ROOT).parts)]
groups=defaultdict(list); sources={}
for file in files:
    rel=file.relative_to(ROOT).as_posix()
    if file.suffix.lower() in MEDIA:
        payload=file.read_bytes()
        groups[hashlib.sha256(payload).hexdigest()].append((rel,len(payload)))
    elif file.suffix.lower() in SOURCE:
        sources[rel]=file.read_text('utf-8',errors='replace')
duplicates=[]
for entries in groups.values():
    if len(entries)<2: continue
    size=entries[0][1]; details=[]
    for path,_ in entries:
        refs=[name for name,content in sources.items() if name!=path and (path in content or Path(path).name in content)]
        details.append({'path':path,'textual_references':len(refs),'examples':refs[:3]})
    duplicates.append({'size_bytes':size,'potential_duplicate_bytes':size*(len(entries)-1),'paths':details})
duplicates.sort(key=lambda x:x['potential_duplicate_bytes'],reverse=True)
print('PHASE2_ASSET_AUDIT='+json.dumps({
    'media_files':sum(len(v) for v in groups.values()),
    'duplicate_groups':len(duplicates),
    'potential_duplicate_bytes':sum(x['potential_duplicate_bytes'] for x in duplicates),
    'top_duplicate_groups':duplicates[:16],
    'note':'Text matches are not proof of runtime usage; dynamic filenames require manual review.'
},ensure_ascii=False))
