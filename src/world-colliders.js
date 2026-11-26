// Pedestrian sweeps are short and frequent. Index the same bounds used by
// vehicle, camera and combat queries; keep array order for existing callers.
export function worldColliders(){
 const list=[],bins=new Map(),padding=.5
 const cell=v=>Math.floor(v/8),key=(i,j)=>i*65536+j
 function visit(b,fn){
  for(let i=cell(b[0]-padding);i<=cell(b[1]+padding);i++)
   for(let j=cell(b[2]-padding);j<=cell(b[3]+padding);j++)fn(key(i,j))
 }
 function add(b){visit(b,k=>{let bin=bins.get(k);if(!bin){bin=new Set();bins.set(k,bin)}bin.add(b)})}
 function remove(b){visit(b,k=>{const bin=bins.get(k);if(bin){bin.delete(b);if(!bin.size)bins.delete(k)}})}
 Object.defineProperties(list,{
  push:{value(...bounds){for(const b of bounds)add(b);return Array.prototype.push.apply(list,bounds)}},
  splice:{value(...args){
   const removed=Array.prototype.splice.apply(list,args)
   for(const b of removed)remove(b)
   for(const b of args.slice(2))add(b)
   return removed
  }},
  unindex:{value:remove},reindex:{value:add},
  near:{value(x,z,r){return r<=padding?bins.get(key(cell(x),cell(z)))??[]:list}}
 })
 return list
}
