import {Vector3} from 'three'
import {createEquipmentArt} from './equipment-art.js'
import {equipmentTrace} from './equipment-contact.js'
import {gear} from './equipment.js'

export function policeFire(boxes,traffic,residents,eligible=resident=>resident.officer){
 const trace=equipmentTrace(boxes,traffic,residents)
 const start=new Vector3(),target=new Vector3(),ray=new Vector3(),end=new Vector3()
 const states=new WeakMap()
 let armed=false,spacing=0
 function newState(officer){
  const state={art:createEquipmentArt(officer.rig),aim:0,cooldown:0,recoil:0,mag:gear.pistol.capacity,reload:0,hold:0}
  states.set(officer,state)
  return state
 }
 function targetPoint(player){
  target.copy(player.pos)
  target.y=player.inVehicle?(player.inVehicle.lift??0)+player.inVehicle.height*.68:target.y+1.28
 }
 function clear(officer,player,origin){
  targetPoint(player)
  ray.subVectors(target,origin)
  const distance=ray.length()
  if(distance<.06)return false
  const hit=trace(origin,ray.multiplyScalar(1/distance),distance,officer)
  end.copy(origin).addScaledVector(ray,hit.distance)
  if(player.inVehicle)return hit.vehicle===player.inVehicle
  return !hit.target&&!hit.blocked
 }
 return {
  get active(){return armed},
  snapshot(officers){
   return {armed,spacing,officers:officers.map(officer=>{
    const state=states.get(officer)
    if(!state)return null
    const {art,...timing}=state
    return timing
   })}
  },
  restore(officers,snapshot){
   armed=snapshot.armed;spacing=snapshot.spacing
   for(const [index,officer] of officers.entries()){
    const timing=snapshot.officers[index],state=states.get(officer)
    if(timing)Object.assign(state??newState(officer),timing)
    else if(state){state.art.dispose();states.delete(officer)}
   }
  },
  clear(officers){
   for(const officer of officers){states.get(officer)?.art.dispose();states.delete(officer)}
   armed=false;spacing=0
  },
  reloading:officer=>states.get(officer)?.reload>0,
  escalate(){armed=true},
  update(dt,wanted){if(!wanted)armed=false;spacing=Math.max(0,spacing-dt)},
  aim(officer,player,distance){
   if(!armed||!player.exposed||!eligible(officer)||officer.f.action||officer.policeOrder?.aboard||distance>23)return false
   start.copy(officer.pos);start.y+=officer.height*.77
   return clear(officer,player,start)
  },
  pose(officer,player,dt,aiming,shot){
   let state=states.get(officer)
   if(!state&&!aiming)return
   state??=newState(officer)
   const drawn=armed&&!officer.f.action&&(aiming||state.reload>0||state.hold>0||officer.state==='guard')
   state.hold=aiming?3.4:Math.max(0,state.hold-dt)
   if(drawn&&state.reload>0){
    state.reload=Math.max(0,state.reload-dt)
    if(!state.reload)state.mag=gear.pistol.capacity
   }
   state.cooldown=Math.max(0,state.cooldown-dt)
   state.recoil=Math.max(0,state.recoil-dt*8)
   state.aim=aiming?state.aim+dt:0
   targetPoint(player)
   const pitch=Math.atan2(target.y-officer.pos.y-officer.height*.76,Math.hypot(target.x-officer.pos.x,target.z-officer.pos.z))
   state.art.update({dt,weapon:'pistol',aiming:aiming&&!state.reload,hidden:!drawn,recoil:state.recoil,pitch,
    speed:officer.stepping??0,reload:state.reload?1-state.reload/gear.pistol.reload:0})
   if(!aiming||!drawn||!state.mag||spacing||state.cooldown||state.aim<.36+officer.stagger*.35)return
   const toward=Math.atan2(target.x-officer.pos.x,target.z-officer.pos.z)
   if(Math.cos(toward-officer.face)<.96)return
   const ready=state.art.ready('pistol')
   if(!ready&&!state.art.failed('pistol'))return
   state.art.muzzlePosition(start)
   if(!clear(officer,player,start))return
   spacing=.33;state.cooldown=.73+officer.stagger*.35;state.recoil=.9
   if(--state.mag===0)state.reload=gear.pistol.reload
   state.art.flash()
   shot(officer,start,end,player.inVehicle)
  }
 }
}
