#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {table} from './lib/format.mjs';
import {reads,tables,resolve,tx,audit,number,date,groupReview,add,fulfil} from './lib/domain.mjs';
import {importBundle} from './lib/import.mjs';
export const commands=[...Object.keys(reads),'group-review','order','weekly-review','add','line','release','cancel-order','ship','receive','adjust-stock','log','set-rate','retain-record','draft-order','draft-chase','import','export','help'];
export async function run(db,args){
 const [cmd='help',...a]=args;
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='help')return commands.map(command=>({command}));
 if(cmd==='group-review')return groupReview(db,a[0]||new Date().toISOString().slice(0,10));
 if(cmd==='weekly-review')return {attention:await db.query(reads.attention),dispatch:await db.query(reads.dispatch),intercompany:await db.query(reads.intercompany)};
 if(cmd==='order'){const o=await resolve(db,'orders',a[0]);return {order:o,lines:await db.query('select l.*,i.name item from order_lines l join items i on i.id=l.item_id where order_id=$1 order by l.id',[o.id]),notes:await db.query('select * from followups where order_id=$1 order by created_at,id',[o.id])};}
 if(cmd==='export'){
 if(!a[0])throw Error('export <snapshot.json>');const snapshot=await tx(db,async()=>{await db.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');const o={format:1,exported_at:new Date().toISOString()};for(const t of tables)o[t]=await db.query(`select * from ${t} order by id`);return o;});fs.writeFileSync(path.resolve(a[0]),JSON.stringify(snapshot,null,2));return {file:path.resolve(a[0]),records:tables.reduce((n,t)=>n+snapshot[t].length,0)};
 }
 if(cmd==='import'){if(a[0]!=='netsuite'||!a[1])throw Error('import netsuite <directory> [--apply]');return importBundle(db,path.resolve(a[1]),a.includes('--apply'));}
 if(cmd.startsWith('draft-')){
 if(!['draft-order','draft-chase'].includes(cmd))throw Error('Unknown command');const o=await run(db,['order',a[0]]);const dir=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`${cmd}-${o.order.id}.md`);const text=cmd==='draft-chase'?`# Draft supplier follow-up\n\nPlease confirm the remaining quantities and delivery date for ${o.order.name}, due ${o.order.due_date}.\n\n`:'# Draft order confirmation\n\n';fs.writeFileSync(file,text+format(o)+'\n\nDraft only. Verify quantities before sending.\n');return {file};
 }
 return tx(db,async()=>{
 let r;
 if(cmd==='add'){if(!a[1])throw Error('add <entity> <JSON>');return add(db,a[0],JSON.parse(a[1]));}
 if(cmd==='line'){
 const o=await resolve(db,'orders',a[0]);await db.query('select id from orders where id=$1 for update',[o.id]);const [locked]=await db.query('select status from orders where id=$1',[o.id]);if(locked.status!=='draft')throw Error('Lines require a draft order');const i=await resolve(db,'items',a[1]);number(a[2],'quantity',{positive:true});number(a[3],'unit price');number(a[4],'unit cost');[r]=await db.query('insert into order_lines(order_id,item_id,quantity,unit_price,unit_cost) values($1,$2,$3,$4,$5) returning *',[o.id,i.id,...a.slice(2,5)]);
 }else if(cmd==='release'||cmd==='cancel-order'){
 const o=await resolve(db,'orders',a[0]);const [locked]=await db.query('select * from orders where id=$1 for update',[o.id]);
 if(cmd==='release'){if(locked.status!=='draft')throw Error('Only draft orders can be released');const [count]=await db.query('select count(*) n from order_lines where order_id=$1',[o.id]);if(Number(count.n)===0)throw Error('Order needs lines');}
 else {if(!['draft','open'].includes(locked.status))throw Error('Order is already closed or cancelled');const [done]=await db.query('select count(*) n from order_lines where order_id=$1 and completed>0',[o.id]);if(Number(done.n))throw Error('Cannot cancel fulfilled history');}
 [r]=await db.query('update orders set status=$2 where id=$1 returning name,status',[o.id,cmd==='release'?'open':'cancelled']);
 }else if(cmd==='ship'||cmd==='receive')return fulfil(db,a[0],a[1],a[2],cmd==='ship'?'sale':'purchase');
 else if(cmd==='adjust-stock'){
 const w=await resolve(db,'locations',a[0]),i=await resolve(db,'items',a[1]);const qty=Number(a[2]);if(!Number.isFinite(qty)||qty===0||!a[3]||!a[4])throw Error('adjust-stock <location> <item> <signed quantity> <unique reference> <reason>');
 const [prior]=await db.query('select * from movements where name=$1',[a[3]]);if(prior){if(prior.location_id===w.id&&prior.item_id===i.id&&Number(prior.quantity)===qty&&prior.reason===a[4])return {event:a[3],replayed:true};throw Error('Event reference already used');}
 await db.query('insert into stock(location_id,item_id) values($1,$2) on conflict do nothing',[w.id,i.id]);const changed=await db.query('update stock set quantity=quantity+$3 where location_id=$1 and item_id=$2 and quantity+$3>=0 returning *',[w.id,i.id,qty]);if(!changed.length)throw Error('Insufficient stock');[r]=await db.query('insert into movements(name,location_id,item_id,quantity,reason) values($1,$2,$3,$4,$5) returning *',[a[3],w.id,i.id,qty,a[4]]);
 }else if(cmd==='log'){
 const o=await resolve(db,'orders',a[0]);if(!a[1]?.trim())throw Error('Note required');[r]=await db.query('insert into followups(order_id,note) values($1,$2) returning *',[o.id,a[1]]);await db.query('update orders set last_contact=current_date where id=$1',[o.id]);
 }else if(cmd==='set-rate'){
 date(a[1]);number(a[2],'rate',{positive:true});if(!a[3])throw Error('Rate source required');if(a[0]==='NZD'&&Number(a[2])!==1)throw Error('NZD base rate must be 1');[r]=await db.query('insert into fx_rates(currency,rate_date,nzd_per_unit,source) values($1,$2,$3,$4) on conflict(currency,rate_date) do update set nzd_per_unit=excluded.nzd_per_unit,source=excluded.source returning *',a.slice(0,4));
 }else if(cmd==='retain-record'){
 const e=await resolve(db,'evidence',a[0]);date(a[1]);date(a[3]);if(!a[2])throw Error('Archive reference required');[r]=await db.query('update evidence set retain_until=$2,archive_ref=$3,last_backup=$4 where id=$1 returning *',[e.id,a[1],a[2],a[3]]);
 }else throw Error('Unknown command: '+cmd);
 await audit(db,cmd,r);return r;
 });
}
export function format(value){
 if(Array.isArray(value)){if(!value.length)return '(none)';return table(value,Object.keys(value[0]).map(key=>({key,label:key,format:v=>v===null?'':typeof v==='object'?JSON.stringify(v):String(v)})));}
 if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>typeof v==='object'?k+'\n'+format(v):`${k}: ${v}`).join('\n');return String(value);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const args=process.argv.slice(2),json=args.includes('--json');const r=await run(db,args.filter(x=>x!=='--json'));console.log(json?JSON.stringify(r,null,2):format(r));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
