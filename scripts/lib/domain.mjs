export const reads={
 subsidiaries:'select * from subsidiaries order by name',customers:"select * from partners where kind='customer' order by name",vendors:"select * from partners where kind='vendor' order by name",items:'select * from items order by name',locations:'select w.id,w.name,s.name subsidiary from locations w join subsidiaries s on s.id=w.subsidiary_id order by w.name',
 'sales-orders':"select * from v_orders where kind='sale' order by due_date,name",'purchase-orders':"select * from v_orders where kind='purchase' order by due_date,name",
 attention:"select name,subsidiary,kind,due_date,currency,remaining_value,case when status='draft' then 'unreleased' when due_date<current_date then 'overdue' else 'quiet' end reason from v_orders where status='draft' or (status='open' and (due_date<current_date or coalesce(last_contact,current_date-8)<current_date-7)) order by due_date,name",
 dispatch:'select * from v_dispatch order by due_date,order_name,item',stock:'select * from v_stock order by subsidiary,item',
 replenishment:'select *, greatest(committed+reorder_point-quantity-incoming,0) buy_units from v_stock where quantity+incoming-committed<reorder_point order by subsidiary,item',
 'supplier-chase':"select name,subsidiary,partner,due_date,currency,remaining_value from v_orders where kind='purchase' and status='open' and due_date<=current_date+7 order by due_date,name",
 intercompany:'select * from v_intercompany order by reference,currency',
 'entity-review':"select subsidiary,currency,kind,sum(remaining_value)::numeric(16,2) open_value from v_orders where status='open' group by subsidiary,currency,kind order by subsidiary,kind",
 margins:"select s.name subsidiary,o.currency,sum(l.completed*l.unit_price)::numeric(16,2) shipped_sales,sum(l.completed*l.unit_cost)::numeric(16,2) recorded_cost,sum(l.completed*(l.unit_price-l.unit_cost))::numeric(16,2) margin from order_lines l join orders o on o.id=l.order_id join subsidiaries s on s.id=o.subsidiary_id where o.kind='sale' and o.status<>'cancelled' group by s.name,o.currency order by s.name",
 rates:'select * from fx_rates order by rate_date desc,currency',records:'select e.*,s.name subsidiary from evidence e join subsidiaries s on s.id=e.subsidiary_id order by e.name',movements:'select * from movements order by created_at,id',audit:'select * from audit order by created_at,id',activity:'select o.name,f.note,f.created_at from followups f join orders o on o.id=f.order_id order by f.created_at,f.id',
 compliance:`select e.name,s.name subsidiary,'RETENTION' rule,'Retain at least seven years from period end; confirm any longer obligation' finding from evidence e join subsidiaries s on s.id=e.subsidiary_id where e.retain_until<(e.period_end+interval '7 years')::date union all select e.name,s.name,'ARCHIVE','No retrievable archive reference recorded' from evidence e join subsidiaries s on s.id=e.subsidiary_id where e.archive_ref='' union all select e.name,s.name,'BACKUP','Backup evidence older than 30 days or missing (house rule)' from evidence e join subsidiaries s on s.id=e.subsidiary_id where e.last_backup is null or e.last_backup<current_date-30 union all select name,subsidiary,'EMPTY_ORDER','Released order has no lines' from v_orders where status='open' and value=0 order by subsidiary,name,rule`,
};
export const tables=['subsidiaries','partners','items','locations','orders','order_lines','stock','movements','followups','intercompany','fx_rates','evidence','audit','import_sources'];
export async function resolve(db,t,v){
 if(!tables.includes(t)||!v)throw Error('A record name or ID is required');
 const col=t==='order_lines'?'external_id':'name';
 const rows=await db.query(`select * from ${t} where id::text ilike $1 or ${col} ilike $2 order by id`,[v+'%','%'+v+'%']);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${t}:\n`+rows.map(r=>`${r.id} ${r[col]}`).join('\n'):`No ${t} match: ${v}`);
 return rows[0];
}
export async function tx(db,fn){await db.exec('BEGIN');try{const r=await fn();await db.exec('COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}
export async function audit(db,action,detail){await db.query('insert into audit(action,detail) values($1,$2)',[action,JSON.stringify(detail)]);}
export function number(v,label,{positive=false}={}){const n=Number(v);if(v===undefined||v===null||v===''||!Number.isFinite(n)||(positive?n<=0:n<0))throw Error(`Invalid ${label}`);return n;}
export function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||'')||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Date must be YYYY-MM-DD');return v;}
export async function groupReview(db,asof){
 date(asof);
 return db.query(`with x as (select currency,nzd_per_unit,rate_date,row_number() over(partition by currency order by rate_date desc) n from fx_rates where rate_date<=$1::date), a as (select subsidiary,currency,kind,sum(remaining_value) local_value from v_orders where status='open' group by subsidiary,currency,kind) select a.*,x.nzd_per_unit,x.rate_date,case when x.rate_date is null then 'MISSING RATE' when $1::date-x.rate_date>7 then 'STALE RATE' else 'current' end rate_status,case when x.rate_date is not null then round(a.local_value*x.nzd_per_unit,2) end indicative_nzd from a left join x on x.currency=a.currency and x.n=1 order by subsidiary,kind`,[asof]);
}
const fields={subsidiaries:['name','country','currency','tax_year_end'],partners:['name','kind'],items:['name','unit'],locations:['name','subsidiary_id'],orders:['name','subsidiary_id','location_id','partner_id','kind','currency','due_date'],intercompany:['name','subsidiary_id','counterparty_id','side','currency','amount','due_date','evidence'],evidence:['name','subsidiary_id','period_end','retain_until','archive_ref','last_backup']};
export async function add(db,t,obj){
 if(!fields[t])throw Error('Add supports '+Object.keys(fields).join(', '));
 const keys=Object.keys(obj);if(!keys.length||keys.some(k=>!fields[t].includes(k)))throw Error('Unknown or empty fields for '+t);
 if(t==='orders'){
 const [s]=await db.query('select * from subsidiaries where id=$1',[obj.subsidiary_id]);const [p]=await db.query('select * from partners where id=$1',[obj.partner_id]);
 if(!s||s.currency!==obj.currency)throw Error('Order currency must match subsidiary base currency');
 if(!p||p.kind!==(obj.kind==='sale'?'customer':'vendor'))throw Error('Wrong partner kind');
 }
 const [r]=await db.query(`insert into ${t}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,keys.map(k=>obj[k]));await audit(db,'add '+t,{id:r.id});return r;
}
export async function fulfil(db,line,qty,ref,kind){
 number(qty,'quantity',{positive:true}); if(!ref)throw Error('Unique event reference required');
 const l=await resolve(db,'order_lines',line);await db.query('select id from orders where id=$1 for update',[l.order_id]);
 const [r]=await db.query('select l.*,o.status,o.kind,o.location_id from order_lines l join orders o on o.id=l.order_id where l.id=$1 for update of l',[l.id]);
 const [prior]=await db.query('select * from movements where name=$1',[ref]);const delta=kind==='sale'?-Number(qty):Number(qty);
 if(prior){if(prior.line_id===l.id&&Number(prior.quantity)===delta)return {event:ref,replayed:true};throw Error('Event reference already used for different work');}
 if(r.status!=='open'||r.kind!==kind)throw Error('Requires an open '+kind+' order');
 if(Number(qty)>Number(r.quantity)-Number(r.completed))throw Error('Exceeds remaining quantity');
 await db.query('insert into stock(location_id,item_id) values($1,$2) on conflict do nothing',[r.location_id,r.item_id]);
 const changed=await db.query('update stock set quantity=quantity+$3 where location_id=$1 and item_id=$2 and quantity+$3>=0 returning quantity',[r.location_id,r.item_id,delta]);if(!changed.length)throw Error('Insufficient stock');
 await db.query('update order_lines set completed=completed+$2 where id=$1',[l.id,qty]);
 await db.query('insert into movements(name,location_id,item_id,line_id,quantity,reason) values($1,$2,$3,$4,$5,$6)',[ref,r.location_id,r.item_id,l.id,delta,kind==='sale'?'Shipment':'Receipt']);
 await db.query("update orders set status='closed' where id=$1 and not exists(select 1 from order_lines where order_id=$1 and completed<quantity)",[r.order_id]);
 await audit(db,kind==='sale'?'ship':'receive',{line:l.id,qty,ref});return {event:ref,quantity:Number(qty),on_hand:changed[0].quantity};
}
