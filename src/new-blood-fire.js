import {Vector3} from 'three'
import {createEquipmentArt} from './equipment-art.js'
import {equipmentTrace} from './equipment-contact.js'
import {gear} from './equipment.js'

export function clubFire(boxes,traffic,residents){
 const trace=equipmentTrace(boxes,traffic,residents)
 const start=new Vector3(),targetPoint=new Vector3(),ray=new Vector3(),end=new Vector3()
 const states=new Map(),spacing={ally:0,hostile:0}

 function center(target){
  targetPoint.copy(target.pos)
  targetPoint.y=target.inVehicle?(target.inVehicle.lift??0)+target.inVehicle.height*.68:targetPoint.y+(target.height??1.80)*.71
 }
 function segment(shooter,target,spread=0){
  center(target)
  if(spread){
   const dx=targetPoint.x-start.x,dz=targetPoint.z-start.z,distance=Math.hypot(dx,dz)||1
   targetPoint.x+=dz*spread/distance;targetPoint.z-=dx*spread/distance
  }
  ray.subVectors(targetPoint,start)
  const distance=ray.length()
  if(distance<.08)return false
  const result=trace(start,ray.multiplyScalar(1/distance),distance,shooter)
  end.copy(start).addScaledVector(ray,result.distance)
  if(target.inVehicle)return result.vehicle===target.inVehicle
  if(target.missionRole)return result.target===target
  return !spread&&!result.blocked&&!result.target
 }

 return {
  update(dt){for(const side of Object.keys(spacing))spacing[side]=Math.max(0,spacing[side]-dt)},
  visible(shooter,target,point=shooter.pos){
   if(!target||!target.f.hp||target.exposed===false)return false
   start.copy(point);start.y+=shooter.height*.77
   return segment(shooter,target)
  },
  reloading:shooter=>!!states.get(shooter)?.reload,
  tick(shooter,target,dt,aim,active,shot){
   const role=shooter.combat
   if(!role)return
   let state=states.get(shooter)
   if(!state&&!active)return
   if(!state){
    state={art:createEquipmentArt(shooter.rig),mag:role.mag,reload:0,cooldown:0,aim:0,shots:0,recoil:0}
    states.set(shooter,state)
   }
   const drawn=active&&shooter.f.hp>0&&!shooter.f.action
   if(drawn&&state.reload){
    state.reload=Math.max(0,state.reload-dt)
    if(!state.reload)state.mag=role.mag
   }
   state.cooldown=Math.max(0,state.cooldown-dt)
   state.recoil=Math.max(0,state.recoil-dt*8)
   state.aim=aim&&drawn?state.aim+dt:0
   const point=target?.pos??shooter.pos
   const bearing=Math.atan2(point.x-shooter.pos.x,point.z-shooter.pos.z)
   const pitch=target?Math.atan2(point.y+(target.height??1.8)*.71-shooter.pos.y-shooter.height*.76,
    Math.hypot(point.x-shooter.pos.x,point.z-shooter.pos.z)):0
   state.art.update({dt,weapon:role.weapon,hidden:!drawn,aiming:aim&&!state.reload,recoil:state.recoil,pitch,
    speed:shooter.speed,reload:state.reload?1-state.reload/gear[role.weapon].reload:0})
   const side=shooter.missionRole
   if(state.aim<role.aim||!state.mag||state.cooldown||spacing[side]||Math.cos(bearing-shooter.face)<.94)return
   if(!state.art.ready(role.weapon)&&!state.art.failed(role.weapon))return
   state.art.muzzlePosition(start)
   if(!segment(shooter,target))return

   const miss=side==='hostile'&&state.shots%4===2
   const hit=miss?segment(shooter,target,shooter.stagger%2?.48:-.48):true
   state.shots++
   state.cooldown=role.cadence;state.recoil=.92
   spacing[side]=side==='hostile'?.30:.10
   if(--state.mag===0)state.reload=gear[role.weapon].reload
   state.art.flash()
   shot(shooter,target,start,end,hit,role.weapon,role.damage)
  },
  reset(){
   for(const state of states.values())state.art.dispose()
   states.clear();spacing.ally=spacing.hostile=0
  }
 }
}
