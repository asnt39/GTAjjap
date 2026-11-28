// These are game balance values in world units and simulation seconds.
export const gear = Object.freeze({
 fists: {name:'맨손'},
 pistol: {name:'권총', price:1800, ammoPrice:60, capacity:8, stock:32, delay:.32, reload:1.15, damage:29, range:24},
 shotgun: {name:'산탄총', price:3600, ammoPrice:200, capacity:4, stock:16, delay:.88, reload:1.65, damage:16, range:17},
 bat: {name:'야구방망이', price:800, delay:.78, damage:36},
 grenade: {name:'수류탄',price:650,consumable:true,stock:4,delay:.62},
 sniper: {name:'저격총', price:7000, ammoPrice:310, capacity:3, stock:9, delay:2, reload:2, lethal:true, range:Infinity}
})
const saveKey='harborline.equipment.v1'
const sniperCycle=.72
const count=(value,max)=>Number.isInteger(value)?Math.min(max,Math.max(0,value)):0
const validRounds=(id,item)=>Object.hasOwn(gear,id)&&item&&Number.isInteger(item.mag)&&Number.isInteger(item.reserve)&&
 item.mag===count(item.mag,gear[id].capacity??0)&&item.reserve===count(item.reserve,gear[id].stock??0)

export function createLoadout(storage,episode){
 let saved
 try{saved=episode?.savedEquipment??JSON.parse(storage?.getItem(saveKey)??'null')}catch{}
 const items={fists:{mag:0,reserve:0}}
 for(const [id,def] of Object.entries(gear)){
  if(id!=='fists'&&saved?.items?.[id])items[id]={mag:count(saved.items[id].mag,def.capacity??0),reserve:count(saved.items[id].reserve,def.stock??0)}
 }
 let selected=Object.hasOwn(items,saved?.selected)?saved.selected:'fists'
 let cooldown=0,reloading=0,swingLeft=0,kick=0,boltLeft=0,loan=null
 function state(){
  const personal={...items}
  if(loan){if(loan.pistol)personal.pistol=loan.pistol;else delete personal.pistol}
  return {items:Object.fromEntries(Object.entries(personal).map(([id,item])=>[id,{...item}])),
   selected:loan&&selected==='pistol'?loan.selected:selected}
 }
 function save(){
  const next=state()
  if(episode?.savedEquipment)episode.saveEquipment(next)
  else try{storage?.setItem(saveKey,JSON.stringify(next))}catch{}
 }
 function reserveSpace(id){
  if(id==='pistol'&&loan)return 0
  return Object.hasOwn(items,id)?Math.max(0,(gear[id].stock??0)-items[id].reserve):0
 }
 return {
  items,get selected(){return selected},get def(){return gear[selected]},get item(){return items[selected]},
  get swing(){return swingLeft?1-swingLeft/gear.bat.delay:0},
  get recoil(){return kick},get reloadProgress(){return reloading?1-reloading/gear[selected].reload:0},
  get boltProgress(){return boltLeft?1-boltLeft/sniperCycle:0},
  get reloading(){return reloading>0},get coolingDown(){return cooldown>0},
  missionSnapshot(){
   return {personal:state(),selected,loan:loan?{...items.pistol}:null}
  },
  planMissionRestore(snapshot){
   if(!snapshot?.personal?.items||!!snapshot.loan!==!!loan)return null
   const {personal,selected:weapon,loan:missionPistol}=snapshot
   if(!Object.hasOwn(personal.items,personal.selected)||
    !Object.hasOwn(personal.items,weapon)&&!(missionPistol&&weapon==='pistol'))return null
   const rounds=[]
   for(const [id,item] of Object.entries(personal.items)){
    const equipped=id==='pistol'&&loan?loan.pistol:Object.hasOwn(items,id)?items[id]:null
    if(!equipped||!validRounds(id,item))return null
    rounds.push([equipped,item.mag,item.reserve])
   }
   if(missionPistol){
    if(!validRounds('pistol',missionPistol))return null
    rounds.push([items.pistol,missionPistol.mag,missionPistol.reserve])
   }
   return ()=>{
    for(const [equipped,mag,reserve] of rounds)Object.assign(equipped,{mag,reserve})
    if(loan)loan.selected=personal.selected
    selected=weapon
    cooldown=reloading=swingLeft=kick=boltLeft=0
    save()
   }
  },
  missionLoan(enabled){
   if(enabled&&!loan){
    loan={pistol:items.pistol,selected};items.pistol={mag:8,reserve:32};selected='pistol'
   }else if(!enabled&&loan){
    if(loan.pistol)items.pistol=loan.pistol;else delete items.pistol
    if(selected==='pistol')selected=loan.selected
    loan=null
   }else return false
   cooldown=reloading=swingLeft=kick=boltLeft=0
   return true
  },
  select(id){
   if(!Object.hasOwn(items,id)||swingLeft>0)return false
   if(selected===id)return true
   selected=id;reloading=0;kick=0;boltLeft=0;save();return true
  },
  ammoOffer(id){
   const def=gear[id]
   const price=def?.consumable?def.price:def?.ammoPrice
   const amount=price?Math.min(def.capacity??1,reserveSpace(id)):0
   return {amount,price:amount?amount*price:0}
  },
  buy(id,kind){
   const fail=message=>({ok:false,message})
   if(loan&&id==='pistol')return fail('임무 장비 반납 후 구매하십시오.')
   if(!Object.hasOwn(gear,id)||!gear[id].price||!episode)return fail('판매하지 않는 장비야.')
   const def=gear[id],owned=Object.hasOwn(items,id)
   if(kind==='weapon'&&owned)return fail('이미 보유한 장비야.')
   if(kind==='ammo'&&(!owned||(!def.ammoPrice&&!def.consumable)))return fail('먼저 해당 무기를 구매해.')
   if(kind!=='weapon'&&kind!=='ammo')return fail('판매하지 않는 장비야.')
   const offer=this.ammoOffer(id)
   if(kind==='ammo'&&!offer.amount)return fail('예비탄이 가득 찼어.')
   const next=state()
   const item=kind==='weapon'?{mag:0,reserve:def.consumable?1:0}:{...items[id],reserve:items[id].reserve+offer.amount}
   next.items[id]={...item}
   const purchase=episode.purchaseEquipment(kind==='weapon'?def.price:offer.price,next)
   if(!purchase.ok)return purchase
   items[id]=item
   return {ok:true,message:def.name+(kind==='weapon'||def.consumable?' 구매 완료':' 예비탄 +'+offer.amount)}
  },
  reserveSpace,
  addReserve(id,rounds){
   const amount=count(rounds,reserveSpace(id))
   if(amount){items[id].reserve+=amount;save()}
   return amount
  },
  interrupt(){reloading=swingLeft=kick=boltLeft=0},
  reload(){
   const def=gear[selected],item=items[selected]
   if(!def.capacity||reloading||!item.reserve||item.mag>=def.capacity)return false
   reloading=def.reload;return true
  },
  use(){
   const def=gear[selected],item=items[selected]
   if(selected==='fists'||reloading||cooldown>0)return false
   if(def.capacity&&!item.mag||def.consumable&&!item.reserve)return false
   cooldown=def.delay
   if(selected==='bat')swingLeft=def.delay
   else if(def.consumable){item.reserve--;save()}
   else{
    item.mag--;kick=1
    if(selected==='sniper'){
     boltLeft=sniperCycle
     if(item.mag===0&&item.reserve>0)reloading=def.reload
    }
    save()
   }
   return true
  },
  tick(dt){
   cooldown=Math.max(0,cooldown-dt);swingLeft=Math.max(0,swingLeft-dt);kick=Math.max(0,kick-6*dt)
   boltLeft=Math.max(0,boltLeft-dt)
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
