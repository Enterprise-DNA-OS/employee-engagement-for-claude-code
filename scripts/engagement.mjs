#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table as textTable} from './lib/format.mjs';
import {table as htmlTable,page,writeOut} from './lib/render.mjs';

export const READS={
 surveys:'select code,name,closed_on,owner,minimum_responses from surveys order by closed_on,code',
 questions:'select code,name,factor from questions order by code',
 scorecard:'select survey,question,factor,responses,favorable_pct,state from scorecard order by closed_on,survey,question',
 'score-changes':'select survey,question,previous_survey,favorable_pct,change_points,state from score_changes order by closed_on,survey,question',
 'focus-areas':'select survey,question,factor,favorable_pct,open_actions from priorities order by closed_on desc,favorable_pct,question',
 'action-plan':'select code,name,owner,status,due_on,review_on from action_queue order by due_on,code',
 'actions-due':"select code,name,owner,due_on,attention from action_queue where status<>'done' and due_on<=current_date+7 order by due_on,code",
 'stale-actions':"select code,name,owner,last_checkin,latest_progress from action_queue where status<>'done' and (last_checkin is null or last_checkin<now()-interval '14 days') order by code",
 'owner-load':"select owner,count(*)::integer open_actions,count(*) filter(where due_on<current_date)::integer overdue from actions where status<>'done' group by owner order by owner",
 'outcome-review':'select code,question,baseline_pct,followup_pct,target_pct,change_points,outcome from outcome_review order by code',
 'confidentiality':'select survey,question,state from scorecard where state<>\'released\' order by survey,question',
 compliance:'select * from compliance_checks order by record,rule',
 attention:"select code,name,owner,attention,latest_progress from action_queue where attention<>'scheduled' or latest_progress='blocked' order by due_on,code",
 activity:'select entity,actor,operation,created_at from activity order by created_at desc,id desc limit 50'
};
export const WRITES=['add-survey','add-question','record-score','add-action','start-action','check-in','complete-action','review-policy','log','import'];
export const COMMANDS=[...Object.keys(READS),'show','weekly-review',...WRITES,'export','draft-action-brief','draft-weekly','help'];
const HELP={
 'add-survey':'--code --name --closed-on --owner --purpose --notice-ref --access-review-on --retention-review-on [--minimum-responses=5]',
 'add-question':'--code --name --factor',
 'record-score':'--survey --question --responses --favorable-pct --source-ref --released=yes [--update]',
 'add-action':'--code --name --result=<survey:question> --owner --due-on --review-on --target-pct',
 'start-action':'--action',
 'check-in':'--action --note --progress=on-track|blocked|completed --evidence-ref',
 'complete-action':'--action --evidence-ref [--completed-on=YYYY-MM-DD] (requires a completed check-in)',
 'review-policy':'--survey --notice-ref --access-review-on --retention-review-on',
 log:'--survey --note (operating note, never a respondent comment)',
 import:'culture-amp --survey --file --map --source-ref [--dry-run] [--update] (overall Questions CSV only)',
 show:'--survey | --action',export:'[--table=surveys|questions|results|actions|checkins|notes|activity] [--format=json|csv]',
 'draft-action-brief':'--action','draft-weekly':''
};
export function parseArgs(args){const opts={};const positional=[];for(const a of args){if(!a.startsWith('--')){positional.push(a);continue;}const at=a.indexOf('=');const key=a.slice(2,at<0?undefined:at);if(key in opts)throw Error('Duplicate option: '+key);opts[key]=at<0?true:a.slice(at+1);}return {command:positional[0]||'help',rest:positional.slice(1),opts};}
const text=(v,label)=>{if(typeof v!=='string'||!v.trim()||v.length>4000)throw Error(label+' requires nonempty text (up to 4000 characters)');return v.trim();};
const need=(o,k)=>text(o[k],'--'+k);
const code=(v)=>{if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,59}$/.test(v))throw Error('Codes use letters, digits, underscores or hyphens');return v;};
const num=(v,label,min,max,integer=false)=>{if(v===null||v===undefined||typeof v==='boolean'||String(v).trim()==='')throw Error(label+' requires a number');const n=Number(v);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw Error(label+' is out of range');return n;};
const date=(v,label)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v))||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(label+' requires YYYY-MM-DD');return v;};
const flag=(o,k)=>{if(o[k]===undefined)return false;if(o[k]!==true)throw Error('--'+k+' is a switch, not a value');return true;};
export async function resolve(db,entity,ref){ref=text(ref,entity+' reference');const rows=await db.query(`select * from ${entity} where lower(code)=lower($1)`,[ref]);if(rows.length===1)return rows[0];const found=await db.query(`select * from ${entity} where id::text ilike $1 or name ilike $2 order by code`,[ref+'%', '%'+ref+'%']);if(found.length!==1)throw Error(found.length?'Ambiguous '+entity+': '+found.map(r=>r.code+' '+r.name).join('; '):'No matching '+entity);return found[0];}
const resultRef=async(db,ref)=>{const parts=text(ref,'result').split(':');if(parts.length!==2)throw Error('Use survey:question');const s=await resolve(db,'surveys',parts[0]),q=await resolve(db,'questions',parts[1]);const [r]=await db.query('select * from results where survey_id=$1 and question_id=$2',[s.id,q.id]);if(!r)throw Error('No score for this survey and question');return r;};
async function saveScore(db,s,q,data,update){
 const old=(await db.query('select * from results where survey_id=$1 and question_id=$2',[s.id,q.id]))[0];
 const hash=createHash('sha256').update(JSON.stringify(data)).digest('hex');
 if(old?.source_hash===hash)return 'unchanged';
 if(old&&!update)throw Error('Changed source score requires --update');
 if(old&&(await db.query('select id from actions where result_id=$1 limit 1',[old.id])).length)throw Error('Score is an action baseline and cannot be rewritten');
 await db.query(`insert into results(survey_id,question_id,responses,favorable_pct,state,source_ref,source_hash) values($1,$2,$3,$4,$5,$6,$7)
 on conflict(survey_id,question_id) do update set responses=excluded.responses,favorable_pct=excluded.favorable_pct,state=excluded.state,source_ref=excluded.source_ref,source_hash=excluded.source_hash`,[s.id,q.id,data.responses,data.favorable_pct,data.state,data.source_ref,hash]);return old?'updated':'inserted';
}
function safeScore({responses,score,released,source},minimum){
 const source_ref=text(source,'source reference');
 if(!released)return {responses:null,favorable_pct:null,state:'suppressed',source_ref};
 if(responses===null||responses===undefined||String(responses).trim()==='')return {responses:null,favorable_pct:null,state:'unknown',source_ref};
 const n=num(responses,'Responses',0,1e8,true);
 if(n<minimum)return {responses:null,favorable_pct:null,state:'suppressed',source_ref};
 const pct=num(score,'Favorable percent',0,100);
 return {responses:n,favorable_pct:pct,state:'released',source_ref};
}
const sourceWithheld=v=>['','-','--','n/a','na','suppressed','not reported','*','null'].includes(String(v??'').trim().toLowerCase());
async function importCsv(db,o){
 const s=await resolve(db,'surveys',need(o,'survey'));
 const map=JSON.parse(fs.readFileSync(need(o,'map'),'utf8'));
 if(map.scope!=='overall')throw Error('Only overall question reports are supported, no demographic slices');
 const source=need(o,'source-ref');const rows=parseCsv(fs.readFileSync(need(o,'file'),'utf8'));
 if(!rows.length)throw Error('CSV is empty');
 const headers=Object.keys(rows[0]);
 if(headers.some(h=>/email|employee|respondent|comment|first.?name|last.?name|demographic|department|gender|birth|tenure/i.test(h)))throw Error('Employee-level, comment and demographic exports are not accepted');
 for(const key of ['question','factor','score'])if(!headers.includes(map[key]))throw Error('Missing mapped column: '+key);
 for(const key of ['question_code','responses'])if(map[key]&&!headers.includes(map[key]))throw Error('Missing mapped column: '+key);
 if(!Array.isArray(map.ignore||[]))throw Error('ignore must be a list of reviewed column names');
 const allowed=new Set(['question','factor','score','question_code','responses'].map(k=>map[k]).filter(Boolean).concat(map.ignore||[]));
 if(headers.some(h=>!allowed.has(h)))throw Error('Unmapped columns: '+headers.filter(h=>!allowed.has(h)).join(', '));
 const stats={inserted:0,updated:0,unchanged:0,withheld:0};const seen=new Set();
 for(const row of rows){
  const name=text(row[map.question],'Question'),factor=text(row[map.factor],'Factor');
  const key=map.question_code?code(text(row[map.question_code],'Question code')):'Q-'+createHash('sha256').update(name).digest('hex').slice(0,16);
  if(seen.has(key))throw Error('Duplicate question in CSV: '+key);seen.add(key);
  let q=(await db.query('select * from questions where lower(code)=lower($1)',[key]))[0];
  if(q&&(q.name!==name||q.factor!==factor))throw Error('Question wording or factor differs: create a new question code');
  if(!q)q=(await db.query('insert into questions(code,name,factor) values($1,$2,$3) returning *',[key,name,factor]))[0];
  const raw=row[map.score];const score=String(raw).trim().replace(/%$/,'');
  const data=safeScore({responses:map.responses?row[map.responses]:null,score,released:!sourceWithheld(raw),source},s.minimum_responses);
  stats[await saveScore(db,s,q,data,flag(o,'update'))]++;if(data.state!=='released')stats.withheld++;
 }
 return {rows:rows.length,...stats,dry_run:flag(o,'dry-run')};
}
export async function execute(db,command,o={},rest=[]){
 if(!COMMANDS.includes(command))throw Error('Unknown command. Use help.');
 const allowed=new Set(['json',...(HELP[command]||'').matchAll(/--([a-z-]+)/g)].map(v=>typeof v==='string'?v:v[1]));
 if(WRITES.includes(command))allowed.add('actor');
 for(const key of Object.keys(o))if(!allowed.has(key))throw Error('Unknown option --'+key+' for '+command);
 if(o.json!==undefined)flag(o,'json');
 if(rest.length&&(command!=='import'||rest.length!==1))throw Error('Unexpected positional arguments');
 if(command==='help')return COMMANDS.map(name=>({command:name,options:HELP[name]||'',actor:WRITES.includes(name)?'required':''}));
 if(READS[command])return db.query(READS[command]);
 if(command==='weekly-review'){const out={};for(const name of ['focus-areas','actions-due','stale-actions','outcome-review','compliance'])out[name]=await db.query(READS[name]);return out;}
 if(command==='show'){
  if(Boolean(o.survey)===Boolean(o.action))throw Error('Choose --survey or --action');
  if(o.survey){const s=await resolve(db,'surveys',o.survey);return {survey:s,scores:await db.query('select question,favorable_pct,state,source_ref from scorecard where survey_id=$1 order by question',[s.id]),notes:await db.query('select note,created_at from notes where survey_id=$1 order by created_at',[s.id])};}
  const a=await resolve(db,'actions',o.action);return {action:a,checkins:await db.query('select note,progress,evidence_ref,created_at from checkins where action_id=$1 order by created_at',[a.id]),history:await db.query('select actor,operation,before_value,after_value,created_at from activity where record_id=$1 order by created_at',[a.id])};
 }
 if(command==='export'){
  const names=['surveys','questions','results','actions','checkins','notes','activity'];
  if(o.table&&!names.includes(o.table))throw Error('Unknown export record type');
  if(o.format&&!['json','csv'].includes(o.format))throw Error('Choose json or csv');
  if(o.format==='csv'&&!o.table)throw Error('CSV requires --table');
  const snapshot={};for(const t of o.table?[o.table]:names)snapshot[t]=await db.query('select * from '+t+' order by id');
  const file=writePrivate('exports',o.table||'snapshot',o.format==='csv'?'csv':'json',o.format==='csv'?csv(snapshot[o.table]):JSON.stringify(snapshot,null,2));return {file,records:Object.values(snapshot).reduce((a,r)=>a+r.length,0)};
 }
 if(command.startsWith('draft-')){
  const title=command==='draft-weekly'?'Engagement weekly review':'Action brief';let sections=[];let name='weekly-review';
  if(command==='draft-weekly'){const results=await execute(db,'weekly-review');sections=Object.entries(results).map(([title,rows])=>({title,html:htmlTable(rows)}));}
  else{const a=await resolve(db,'actions',need(o,'action'));name=a.code;sections=[{title:'Action',html:htmlTable(await db.query('select code,name,owner,status,due_on,review_on,target_pct from action_queue where id=$1',[a.id]))},{title:'Evidence',html:htmlTable(await db.query('select note,progress,evidence_ref from checkins where action_id=$1 order by created_at',[a.id]))}];}
  return {file:writeOut('drafts',name,page({title,subtitle:'Private draft. Review before sharing.',sections}))};
 }
 const actor=need(o,'actor');
 await db.exec('BEGIN');
 try{
  await db.exec('LOCK TABLE surveys,questions,results,actions,checkins,notes IN SHARE ROW EXCLUSIVE MODE');
  await db.query("select set_config('app.actor',$1,true)",[actor]);let answer;
  switch(command){
   case 'add-survey':{
    const closed=date(need(o,'closed-on'),'Closed date');if(closed>new Date().toISOString().slice(0,10))throw Error('Closed date cannot be in the future');
    answer=await db.query(`insert into surveys(code,name,closed_on,owner,purpose,notice_ref,access_review_on,retention_review_on,minimum_responses) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning code,name`,[code(need(o,'code')),need(o,'name'),closed,need(o,'owner'),need(o,'purpose'),need(o,'notice-ref'),date(need(o,'access-review-on'),'Access review'),date(need(o,'retention-review-on'),'Retention review'),num(o['minimum-responses']??5,'Minimum responses',5,100000,true)]);break;
   }
   case 'add-question':answer=await db.query('insert into questions(code,name,factor) values($1,$2,$3) returning code,name',[code(need(o,'code')),need(o,'name'),need(o,'factor')]);break;
   case 'record-score':{
    const s=await resolve(db,'surveys',need(o,'survey')),q=await resolve(db,'questions',need(o,'question'));
    if(!['yes','no'].includes(o.released))throw Error('--released must be yes or no, based on source report');
    const data=safeScore({responses:o.responses,score:o['favorable-pct'],released:o.released==='yes',source:need(o,'source-ref')},s.minimum_responses);
    answer={result:await saveScore(db,s,q,data,flag(o,'update')),state:data.state};break;
   }
   case 'add-action':{
    const r=await resultRef(db,need(o,'result'));if(r.state!=='released')throw Error('An action baseline needs a released score');
    answer=await db.query(`insert into actions(code,name,result_id,owner,due_on,review_on,target_pct) values($1,$2,$3,$4,$5,$6,$7) returning code,name,status`,[code(need(o,'code')),need(o,'name'),r.id,need(o,'owner'),date(need(o,'due-on'),'Due date'),date(need(o,'review-on'),'Review date'),num(o['target-pct'],'Target',0,100)]);break;
   }
   case 'start-action':{const a=await resolve(db,'actions',need(o,'action'));if(a.status!=='open')throw Error('Only open actions can start');answer=await db.query("update actions set status='active' where id=$1 returning code,status",[a.id]);break;}
   case 'check-in':{
    const a=await resolve(db,'actions',need(o,'action'));if(a.status!=='active')throw Error('Only active actions accept check-ins');
    answer=await db.query('insert into checkins(action_id,note,progress,evidence_ref) values($1,$2,$3,$4) returning id,progress',[a.id,need(o,'note'),need(o,'progress'),need(o,'evidence-ref')]);break;
   }
   case 'complete-action':{
    const a=await resolve(db,'actions',need(o,'action'));if(a.status!=='active')throw Error('Only active actions can complete');
    const checks=await db.query('select progress from checkins where action_id=$1 order by created_at desc,id desc limit 1',[a.id]);if(checks[0]?.progress!=='completed')throw Error('Latest check-in must record completed work');
    const completed=date(o['completed-on']||new Date().toISOString().slice(0,10),'Completion date');
    const [baseline]=await db.query('select s.closed_on from results r join surveys s on s.id=r.survey_id where r.id=$1',[a.result_id]);
    if(completed>new Date().toISOString().slice(0,10)||completed<baseline.closed_on)throw Error('Completion date must be after baseline and no later than today');
    answer=await db.query("update actions set status='done',completion_ref=$2,completed_on=$3 where id=$1 returning code,status",[a.id,need(o,'evidence-ref'),completed]);break;
   }
   case 'review-policy':{const s=await resolve(db,'surveys',need(o,'survey'));answer=await db.query('update surveys set notice_ref=$2,access_review_on=$3,retention_review_on=$4 where id=$1 returning code,notice_ref,access_review_on,retention_review_on',[s.id,need(o,'notice-ref'),date(need(o,'access-review-on'),'Access review'),date(need(o,'retention-review-on'),'Retention review')]);break;}
   case 'log':{const s=await resolve(db,'surveys',need(o,'survey'));answer=await db.query('insert into notes(survey_id,note) values($1,$2) returning id,note',[s.id,need(o,'note')]);break;}
   case 'import':if(rest[0]!=='culture-amp')throw Error('Use import culture-amp');answer=await importCsv(db,o);break;
   default:throw Error('Unsupported write');
  }
  await db.exec(command==='import'&&flag(o,'dry-run')?'ROLLBACK':'COMMIT');return answer;
 }catch(error){await db.exec('ROLLBACK');throw error;}
}
export function csv(rows){if(!rows.length)return '';const cols=Object.keys(rows[0]);const cell=v=>{let s=v===null?'':typeof v==='object'?JSON.stringify(v):String(v);if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return [cols.map(cell).join(','),...rows.map(r=>cols.map(k=>cell(r[k])).join(','))].join('\r\n')+'\r\n';}
function writePrivate(dir,name,ext,content){const folder=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,dir);fs.mkdirSync(folder,{recursive:true,mode:0o700});const file=path.join(folder,name+'.'+ext);fs.writeFileSync(file,content,{mode:0o600});fs.chmodSync(file,0o600);return file;}
export function human(value){
 if(Array.isArray(value)){
  if(!value.length)return '  (none)';
  const keys=Object.keys(value[0]);
  return textTable(value,keys.map(key=>({key,label:key.replace(/_pct$/, ' %').replace(/_/g,' '),format:v=>v===null?(/pct|points/.test(key)?'withheld':'not recorded'):typeof v==='object'?JSON.stringify(v):String(v)})));
 }
 if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>Array.isArray(v)?k+'\n'+human(v):k+': '+(typeof v==='object'?JSON.stringify(v):v)).join('\n\n');
 return String(value);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;let json=process.argv.includes('--json');try{const {command,rest,opts}=parseArgs(process.argv.slice(2));db=await getDb();const result=await execute(db,command,opts,rest);console.log(json?JSON.stringify(result,null,2):human(result));}catch(e){console.error(json?JSON.stringify({error:e.message}):e.message);process.exitCode=1;}finally{if(db)await db.close();}}
