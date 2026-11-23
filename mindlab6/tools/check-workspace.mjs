import fs from 'node:fs';
import path from 'node:path';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const state=JSON.parse(read('PROJECT_STATE.json'));
const registry=JSON.parse(read('research/REGISTRY.json'));
const errors=[];
if(state.phase!=='foundation')errors.push('Unexpected phase: verify migration status');
if(state.current_experiment!==registry.current)errors.push('Current experiment mismatch');
const ids=new Set();
for(const exp of registry.experiments){
  if(!/^EXP-\d{4}$/.test(exp.id))errors.push('Invalid experiment ID: '+exp.id);
  if(ids.has(exp.id))errors.push('Duplicate experiment ID: '+exp.id);
  ids.add(exp.id);
  if(!['planned','in-progress','blocked','validated','rejected','archived'].includes(exp.status))errors.push('Invalid experiment status: '+exp.id);
  if(!fs.existsSync(new URL(exp.path,root)))errors.push('Missing experiment: '+exp.path);
}
for(const file of ['START_HERE.md','handoff/CURRENT_TASK.md','handoff/SESSION_LOG.md','research/README.md','research/decisions/ADR-0003-cross-chat-handoff.md']){
  if(!fs.existsSync(new URL(file,root)))errors.push('Missing handoff file: '+file);
}
for(const key of ['brain_games_migrated','puzzles_migrated','story_stations_migrated','child_games_migrated']){
  if(!Number.isInteger(state.content_status[key])||state.content_status[key]<0)errors.push('Unverifiable content count: '+key);
}
function inspectProductionSources(dir){
  for(const e of fs.readdirSync(new URL(dir,root),{withFileTypes:true})){
    const relative=dir+e.name;
    if(e.isDirectory()){inspectProductionSources(relative+'/');continue}
    if(!/\.(js|mjs|ts)$/.test(e.name))continue;
    const source=read(relative);
    if(/from\s*['"][^'"]*research\/|import\s*\([^)]*research\//.test(source))
      errors.push('Production code imports research workspace: '+relative);
  }
}
inspectProductionSources('src/');
if(!state.source_baseline.read_only||!state.boundaries.main_untouched)errors.push('Protected baseline flags missing');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}
else console.log('MindLab6 workspace PASS: '+ids.size+' indexed experiment(s), handoff present, isolated foundation, source pinned');
