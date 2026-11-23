// These are game balance values in world units and simulation seconds.
export const gear = Object.freeze({
 fists: {name:'맨손'},
 pistol: {name:'권총', capacity:8, stock:32, delay:.32, reload:1.15, damage:29, range:44},
 shotgun: {name:'산탄총', capacity:4, stock:16, delay:.88, reload:1.65, damage:16, range:26},
 bat: {name:'야구방망이', delay:.78, damage:36}
})
const saveKey='harborline.equipment.v1'
const count=(value,max)=>Number.isInteger(value)?Math.min(max,Math.max(0,value)):0

export function createLoadout(storage){
 let saved
 try{saved=JSON.parse(storage?.getItem(saveKey)??'null')}catch{}
 const items={fists:{mag:0,reserve:0}}
 for(const [id,def] of Object.entries(gear)){
  if(id!=='fists'&&saved?.items?.[id])items[id]={mag:count(saved.items[id].mag,def.capacity??0),reserve:count(saved.items[id].reserve,def.stock??0)}
 }
 let selected=Object.hasOwn(items,saved?.selected)?saved.selected:'fists'
 let cooldown=0,reloading=0,swingLeft=0,kick=0
 function save(){try{storage?.setItem(saveKey,JSON.stringify({items,selected}))}catch{}}
 function reserveSpace(id){return Object.hasOwn(items,id)?Math.max(0,(gear[id].stock??0)-items[id].reserve):0}
 return {
  items,get selected(){return selected},get def(){return gear[selected]},get item(){return items[selected]},
  get swing(){return swingLeft?1-swingLeft/gear.bat.delay:0},
  get recoil(){return kick},get reloadProgress(){return reloading?1-reloading/gear[selected].reload:0},
  get reloading(){return reloading>0},
  select(id){
   if(!Object.hasOwn(gear,id)||swingLeft>0)return false
   if(!items[id])items[id]={mag:gear[id].capacity??0,reserve:gear[id].stock??0}
   selected=id;reloading=0;kick=0;save();return true
  },
  resupply(){
   for(const [id,item] of Object.entries(items))if(gear[id].stock)item.reserve=gear[id].stock
   save()
  },
  reserveSpace,
  addReserve(id,rounds){
   const amount=count(rounds,reserveSpace(id))
   if(amount){items[id].reserve+=amount;save()}
   return amount
  },
  interrupt(){reloading=swingLeft=kick=0},
  reload(){
   const def=gear[selected],item=items[selected]
   if(!def.capacity||reloading||!item.reserve||item.mag>=def.capacity)return false
   reloading=def.reload;return true
  },
  use(){
   const def=gear[selected],item=items[selected]
   if(selected==='fists'||reloading||cooldown>0)return false
   if(def.capacity&&!item.mag)return false
   cooldown=def.delay
   if(selected==='bat')swingLeft=def.delay
   else{item.mag--;kick=1;save()}
   return true
  },
  tick(dt){
   cooldown=Math.max(0,cooldown-dt);swingLeft=Math.max(0,swingLeft-dt);kick=Math.max(0,kick-6*dt)
   if(reloading>0){
    reloading=Math.max(0,reloading-dt)
    if(!reloading){
     const item=items[selected],transfer=Math.min(gear[selected].capacity-item.mag,item.reserve)
     item.mag+=transfer;item.reserve-=transfer;save()
    }
   }
  }
 }
}
