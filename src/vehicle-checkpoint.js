import {clearPose,overlapsCar,resetVehicleGround} from './driving.js'
import {parkingLevel} from './chapter-sites.js'

export function vehicleCheckpointPose({x,z,heading,lift=0}){
 const pose={x,z,heading:Math.atan2(Math.sin(heading),Math.cos(heading))}
 if(parkingLevel(x,z,lift)>.16)pose.lift=lift
 return pose
}

export function parkedPoses(fleet,spawnById){
 const moved={}
 for(const vehicle of fleet){
  const {id,x,z}=vehicle,spawn=spawnById.get(id),pose=vehicleCheckpointPose(vehicle)
  const turn=pose.heading-spawn.heading
  if(Math.hypot(x-spawn.x,z-spawn.z)>.001||Math.abs(Math.atan2(Math.sin(turn),Math.cos(turn)))>.001){
   moved[id]=pose
  }
 }
 return moved
}

export function isVehicleCheckpointPose(pose){
 return pose&&Number.isFinite(pose.x)&&Number.isFinite(pose.z)&&Number.isFinite(pose.heading)&&
  Math.abs(pose.x)<2048&&Math.abs(pose.z)<2048&&Math.abs(pose.heading)<=Math.PI&&
  (pose.lift===undefined||Number.isFinite(pose.lift)&&pose.lift>.16&&pose.lift<7&&
   Math.abs((parkingLevel(pose.x,pose.z,pose.lift)??0)-pose.lift)<.14)
}

export function restoreParkedPoses(fleet,saved,boxes){
 const placements=new Map()
 for(const car of fleet){
  const pose=Object.hasOwn(saved,car.id)?saved[car.id]:null
  if(!isVehicleCheckpointPose(pose))continue
  const candidate={...car,x:pose.x,z:pose.z,heading:pose.heading,lift:pose.lift??0}
  if(clearPose(candidate,boxes,true,true))placements.set(car,candidate)
 }

 // A saved pose can occupy another car's vacated spawn. Compare the final
 // arrangement, then recheck any spawn that reappears after rejecting a pose.
 let conflict
 do {
  conflict=false
  for(const [car,candidate] of placements){
   if(fleet.some(other=>other!==car&&overlapsCar(candidate,placements.get(other)??other))){
    placements.delete(car)
    conflict=true
   }
  }
 } while(conflict)

 for(const [car,pose] of placements){
  const {x,z,heading,lift}=pose
  Object.assign(car,{x,z,heading,lift})
  resetVehicleGround(car)
 }
}

export function restoreTrafficVehicle(car,pose,boxes,traffic){
 if(!isVehicleCheckpointPose(pose))return false
 const candidate={...car,x:pose.x,z:pose.z,heading:pose.heading,lift:pose.lift??0}
 if(!clearPose(candidate,boxes,true,true)||traffic.some(other=>other!==car&&overlapsCar(candidate,other)))return false
 Object.assign(car,{x:pose.x,z:pose.z,heading:pose.heading,lift:pose.lift??0})
 resetVehicleGround(car)
 return true
}
