import fs from 'node:fs';
import path from 'node:path';
import {parseCsv,pick} from './csv.mjs';
import {audit,number,date} from './domain.mjs';
const specs={
 'subsidiaries.csv':{table:'subsidiaries',columns:{name:'Name',country:'Country',currency:'Currency',tax_year_end:'Tax Year End'}},
 'customers.csv':{table:'partners',columns:{name:'Name'},defaults:{kind:'customer'}},
 'vendors.csv':{table:'partners',columns:{name:'Name'},defaults:{kind:'vendor'}},
 'items.csv':{table:'items',columns:{name:'Name',unit:'Units'}},
 'locations.csv':{table:'locations',columns:{name:'Name',subsidiary_id:'Subsidiary Internal ID'}},
 'orders.csv':{table:'orders',columns:{name:'Document Number',subsidiary_id:'Subsidiary Internal ID',location_id:'Location Internal ID',partner_id:'Name Internal ID',kind:'Type',currency:'Currency',due_date:'Due Date'}},
 'lines.csv':{table:'order_lines',columns:{order_id:'Order Internal ID',item_id:'Item Internal ID',quantity:'Quantity',unit_price:'Rate',unit_cost:'Unit Cost'}},
 'stock.csv':{table:'stock',columns:{location_id:'Location Internal ID',item_id:'Item Internal ID',quantity:'On Hand',reorder_point:'Reorder Point'}},
 'intercompany.csv':{table:'intercompany',columns:{name:'Reference',subsidiary_id:'Subsidiary Internal ID',counterparty_id:'Counterparty Internal ID',side:'Side',currency:'Currency',amount:'Amount',due_date:'Due Date',evidence:'Evidence'}},
 'evidence.csv':{table:'evidence',columns:{name:'Name',subsidiary_id:'Subsidiary Internal ID',period_end:'Period End',retain_until:'Retain Until',archive_ref:'Archive Reference',last_backup:'Last Backup'}}
};
const refs={subsidiary_id:'subsidiaries',counterparty_id:'subsidiaries',location_id:'locations',partner_id:'partners',order_id:'orders',item_id:'items'};
async function ref(db,t,id){const rows=await db.query(`select id from ${t} where external_id=$1`,[id]);if(rows.length!==1)throw Error(`Missing ${t} Internal ID ${id}`);return rows[0].id;}
export async function importBundle(db,dir,apply=false){
 const files=Object.keys(specs).filter(f=>fs.existsSync(path.join(dir,f)));if(!files.length)throw Error('No supported CSV files in '+dir);
 const result={applied:apply,inserted:0,skipped:0,files:[]};await db.exec('BEGIN');
 try{
 for(const file of files){const spec=specs[file];const text=fs.readFileSync(path.join(dir,file),'utf8');const rows=parseCsv(text);const seen=new Set();
 for(const [index,row] of rows.entries()){
 try{
 const id=pick(row,'Internal ID');if(!id)throw Error('Internal ID required (Line Unique Key for lines)');if(seen.has(id))throw Error('Duplicate Internal ID '+id);seen.add(id);
 const data={...spec.defaults};for(const [col,heading] of Object.entries(spec.columns)){let v=pick(row,heading);if(v===''&&!['archive_ref','last_backup','evidence'].includes(col))throw Error('Missing '+heading);
 if(refs[col])v=await ref(db,refs[col],v);
 if(['quantity','unit_price','unit_cost','reorder_point','amount'].includes(col))v=number(v,col,{positive:col==='quantity'&&spec.table==='order_lines'});
 if(['due_date','tax_year_end','period_end','retain_until','last_backup'].includes(col))v=v?date(v):null;
 if(col==='country')v=({'New Zealand':'NZ','Australia':'AU'})[v]||v;
 if(col==='kind')v=({'Sales Order':'sale','Purchase Order':'purchase'})[v]||v;
 data[col]=v;
 }
 if(spec.table==='orders'){
 const [s]=await db.query('select currency from subsidiaries where id=$1',[data.subsidiary_id]);const [p]=await db.query('select kind from partners where id=$1',[data.partner_id]);if(s.currency!==data.currency)throw Error('Order currency differs from subsidiary');if(p.kind!==(data.kind==='sale'?'customer':'vendor'))throw Error('Wrong partner kind');
 }
 if(spec.table==='stock'){
 const name='netsuite-opening-'+id;const [prior]=await db.query('select * from import_sources where name=$1',[name]);if(prior){const keys=Object.keys(data);if(keys.some(k=>String(prior.payload[k])!==String(data[k])))throw Error('Opening reference changed');result.skipped++;continue;}
 const existing=await db.query('select id from stock where location_id=$1 and item_id=$2',[data.location_id,data.item_id]);if(existing.length)throw Error('Opening stock already exists for this item and location');
 const keys=Object.keys(data);await db.query(`insert into stock(${keys}) values(${keys.map((_,i)=>'$'+(i+1))})`,Object.values(data));
 // A zero opening count is retained in stock; no movement is necessary.
 if(data.quantity!==0)await db.query('insert into movements(name,location_id,item_id,quantity,reason) values($1,$2,$3,$4,$5)',[name,data.location_id,data.item_id,data.quantity,'NetSuite opening count']);
 await db.query('insert into import_sources(name,payload) values($1,$2)',[name,JSON.stringify(data)]);result.inserted++;continue;
 }
 const prior=await db.query(`select * from ${spec.table} where external_id=$1`,[id]);
 if(prior.length){const changed=Object.keys(data).filter(k=>String(prior[0][k]??'')!==String(data[k]??'')&&!(typeof data[k]==='number'&&Number(prior[0][k])===data[k]));if(changed.length)throw Error('Existing Internal ID '+id+' differs in '+changed.join(', ')+'; reconcile instead of overwriting');result.skipped++;continue;}
 if(spec.table==='order_lines'){const [o]=await db.query('select status from orders where id=$1',[data.order_id]);if(o.status!=='draft')throw Error('Imported lines require draft orders');}
 const keys=['external_id',...Object.keys(data)];await db.query(`insert into ${spec.table}(${keys}) values(${keys.map((_,i)=>'$'+(i+1))})`,[id,...Object.values(data)]);result.inserted++;
 }catch(e){throw Error(`${file} row ${index+2}: ${e.message}`);}
 }
 result.files.push({file,rows:rows.length});
 }
 await audit(db,'import netsuite',result);await db.exec(apply?'COMMIT':'ROLLBACK');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export {specs};
