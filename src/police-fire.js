import {Vector3} from 'three'
import {createEquipmentArt} from './equipment-art.js'
import {equipmentTrace} from './equipment-contact.js'

export function policeFire(boxes,traffic,residents){
 const trace=equipmentTrace(boxes,traffic,residents)
 const start=new Vector3(),target=new Vector3(),ray=new Vector3(),end=new Vector3()
 const states=new WeakMap()
 let armed=false,spacing=0
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
  escalate(){armed=true},
  update(dt,wanted){if(!wanted)armed=false;spacing=Math.max(0,spacing-dt)},
  aim(officer,player,distance){
   if(!armed||!player.exposed||!officer.officer||officer.f.action||officer.policeOrder?.aboard||distance>23)return false
   start.copy(officer.pos);start.y+=officer.height*.77
   return clear(officer,player,start)
  },
  pose(officer,player,dt,aiming,shot){
   let state=states.get(officer)
   if(!state&&!aiming)return
   if(!state){
    state={art:createEquipmentArt(officer.rig),aim:0,cooldown:0,recoil:0}
    states.set(officer,state)
   }
   state.cooldown=Math.max(0,state.cooldown-dt)
   state.recoil=Math.max(0,state.recoil-dt*8)
   state.aim=aiming?state.aim+dt:0
   targetPoint(player)
   const pitch=Math.atan2(target.y-officer.pos.y-officer.height*.76,Math.hypot(target.x-officer.pos.x,target.z-officer.pos.z))
   state.art.update({dt,weapon:'pistol',aiming,hidden:!aiming,recoil:state.recoil,pitch})
   if(!aiming||spacing||state.cooldown||state.aim<.36+officer.stagger*.35)return
   const toward=Math.atan2(target.x-officer.pos.x,target.z-officer.pos.z)
   if(Math.cos(toward-officer.face)<.96)return
   const ready=state.art.ready('pistol')
   if(!ready&&!state.art.failed('pistol'))return
   state.art.muzzlePosition(start)
   if(!clear(officer,player,start))return
   spacing=.33;state.cooldown=1.05+officer.stagger*.46;state.recoil=.9
   state.art.flash()
   shot(officer,start,end,player.inVehicle)
  }
 }
}
