// Read-only, AST-based scan of the frozen V5 browser registries.
// It NEVER evaluates V5 JavaScript or alters old application data.
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const REF = '7327fdc6c6f36deaf63a2b20a7b6db9a315ad446';
const read = file => execFileSync('git', ['show', REF + ':' + file], {
  encoding: 'utf8', maxBuffer: 12 * 1024 * 1024
});
const html = read('index.html');
const units = [];
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
for (const s of scripts) {
  if (/\bsrc\s*=/.test(s[1])) continue;
  const prefix = html.slice(0, s.index + s[0].indexOf('>') + 1);
  units.push({ path:'index.html:inline', code:s[2], lineBase:prefix.split('\n').length });
}
units.push({path:'upgrade/games.js',code:read('upgrade/games.js'),lineBase:1});

function literal(node) {
  if (!node) return null;
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  return null;
}
function objectValue(obj, key) {
  for (const p of obj.properties) {
    if (!ts.isPropertyAssignment(p)) continue;
    const name = ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name) ? p.name.text : null;
    if (name === key) return p.initializer;
  }
  return null;
}
const arrays = [];
const additions = [];
const parseErrors = [];
for (const unit of units) {
  const sf=ts.createSourceFile(unit.path,unit.code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if (sf.parseDiagnostics.length) parseErrors.push({file:unit.path,count:sf.parseDiagnostics.length,
    examples:sf.parseDiagnostics.slice(0,4).map(e=>ts.flattenDiagnosticMessageText(e.messageText,' '))});
  const lineno=node=>unit.lineBase+sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
  function collect(name, arr, origin) {
    const entries=[];
    for (const obj of arr.elements) {
      if (!ts.isObjectLiteralExpression(obj)) continue;
      const id=literal(objectValue(obj,'id'));
      if (typeof id!=='string') continue;
      const title=literal(objectValue(obj,'name'));
      const cat=literal(objectValue(obj,'cat'));
      const run=objectValue(obj,'run');
      const type=literal(objectValue(obj,'type'));
      entries.push({id,name:typeof title==='string'?title:null,cat:typeof cat==='string'?cat:null,
        type:typeof type==='string'?type:null,run_expression:run?run.getText(sf).slice(0,130):null,
        source_file:unit.path,source_array:name,source_line:lineno(obj),evidence_kind:origin});
    }
    arrays.push({name,source_file:unit.path,source_line:lineno(arr),entries});
  }
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
        node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      collect(node.name.text,node.initializer,'literal-array');
    }
    if (ts.isBinaryExpression(node) &&
        node.operatorToken.kind===ts.SyntaxKind.EqualsToken &&
        ts.isArrayLiteralExpression(node.right) &&
        node.left.getText(sf)==='DX.brain') collect('DX.brain',node.right,'assignment-array');
    if (ts.isBinaryExpression(node) &&
        node.operatorToken.kind===ts.SyntaxKind.EqualsToken &&
        ts.isArrayLiteralExpression(node.right) &&
        node.left.getText(sf)==='DX.child') collect('DX.child',node.right,'assignment-array');
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text==='forEach') {
      const target=node.expression.expression.getText(sf);
      if (node.arguments.some(a=>a.getText(sf).includes('KID_GAMES.push('))) {
        additions.push({array:target,file:unit.path,line:lineno(node),kind:'forEach-appends-kid-game'});
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(sf);
}
const find = name => arrays.filter(x=>x.name===name);
const useSingle = name => {
  const candidates=find(name).filter(x=>x.entries.length);
  if (candidates.length!==1) throw new Error(name+' expected 1 static array, found '+candidates.length);
  return candidates[0].entries;
};
const primaryBrain=useSingle('G');
const primaryKids=useSingle('KID_GAMES');
const extraBrain=useSingle('DX.brain');
const extraKids=useSingle('DX.child').map(x=>({...x,id:'dx_k_'+x.id,
  generated_id_rule:'upgrade/games.js: DX.child.forEach => id: dx_k_ + c.id'}));
const dynamicKids=[];
const unresolved=[];
for (const group of additions) {
  const registered=find(group.array).filter(x=>x.source_file===group.file);
  if (registered.length!==1) {unresolved.push(group);continue;}
  for (const x of registered[0].entries) {
    if (group.array==='KID_GAMES') continue;
    dynamicKids.push({...x, registration_evidence:group});
  }
}
const brain=[...primaryBrain,...extraBrain].map(x=>({...x,kind:'brain'}));
const kids=[...primaryKids,...extraKids,...dynamicKids].map(x=>({...x,kind:'kid'}));
const unique=items=>new Set(items.map(x=>x.id)).size===items.length;
const result={
  schema_version:1,source_commit:REF,verification:'static-ast-only; browser registration and play not yet verified',
  discovered:{brain_count:brain.length,child_count:kids.length,base_brain:primaryBrain.length,
    upgrade_brain:extraBrain.length,base_child:primaryKids.length,upgrade_child:extraKids.length,
    other_child:dynamicKids.length},
  kid_registration_lookups:additions,unresolved_registration_lookups:unresolved,
  duplicate_brain_ids:!unique(brain),duplicate_child_ids:!unique(kids),
  parser_warnings:parseErrors,brain,kids,
  disclaimer:'Static source declarations, not verified active registry after runtime overrides. No V5 code executed or migrated.'
};
const output='research/experiments/EXP-0001-dependency-inventory/results/parsed-source-registry.json';
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log('V5_REGISTRY_SUMMARY '+JSON.stringify({counts:result.discovered,uniqueBrain:unique(brain),
  uniqueKids:unique(kids),unresolved,parseErrors,brainIds:brain.map(x=>x.id),kidIds:kids.map(x=>x.id)}));
const encoded=Buffer.from(JSON.stringify(result,null,2)+'\n').toString('base64');
for(let i=0,n=0;i<encoded.length;i+=4096,n++) console.log('V5REGCHUNK '+n+' '+encoded.slice(i,i+4096));
console.log('V5REGEND chunks='+Math.ceil(encoded.length/4096));
