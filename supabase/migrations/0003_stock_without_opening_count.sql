-- An open order must appear in replenishment even before its first stock count.
create or replace view v_stock as
with pairs as (
 select location_id,item_id from stock
 union
 select o.location_id,l.item_id from orders o join order_lines l on l.order_id=o.id where o.status='open'
)
select k.id,s.name subsidiary,w.name location,i.name item,coalesce(k.quantity,0)::numeric(14,3) quantity,coalesce(k.reorder_point,0)::numeric(14,3) reorder_point,
 coalesce((select sum(l.quantity-l.completed) from order_lines l join orders o on o.id=l.order_id where o.location_id=p.location_id and l.item_id=p.item_id and o.kind='sale' and o.status='open'),0) committed,
 coalesce((select sum(l.quantity-l.completed) from order_lines l join orders o on o.id=l.order_id where o.location_id=p.location_id and l.item_id=p.item_id and o.kind='purchase' and o.status='open'),0) incoming
from pairs p left join stock k on k.location_id=p.location_id and k.item_id=p.item_id join locations w on w.id=p.location_id join subsidiaries s on s.id=w.subsidiary_id join items i on i.id=p.item_id;
