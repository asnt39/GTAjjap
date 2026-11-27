import {clearPose,overlapsCar,resetVehicleGround} from './driving.js'

export function parkedPoses(fleet,spawnById){
 const moved={}
 for(const {id,x,z,heading} of fleet){
  const spawn=spawnById.get(id)
  const angle=Math.atan2(Math.sin(heading),Math.cos(heading))
  const turn=angle-spawn.heading
  if(Math.hypot(x-spawn.x,z-spawn.z)>.001||Math.abs(Math.atan2(Math.sin(turn),Math.cos(turn)))>.001){
   moved[id]={x,z,heading:angle}
  }
 }
 return moved
}

function validPose(pose){
 return pose&&Number.isFinite(pose.x)&&Number.isFinite(pose.z)&&Number.isFinite(pose.heading)&&
  Math.abs(pose.x)<2048&&Math.abs(pose.z)<2048&&Math.abs(pose.heading)<=Math.PI
}

export function restoreParkedPoses(fleet,saved,boxes){
 const placements=new Map()
 for(const car of fleet){
  const pose=Object.hasOwn(saved,car.id)?saved[car.id]:null
  if(!validPose(pose))continue
  const candidate={...car,x:pose.x,z:pose.z,heading:pose.heading}
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
  const {x,z,heading}=pose
  Object.assign(car,{x,z,heading})
  resetVehicleGround(car)
 }
}

export function restoreTrafficVehicle(car,pose,boxes,traffic){
 if(!validPose(pose))return false
 const candidate={...car,x:pose.x,z:pose.z,heading:pose.heading}
 if(!clearPose(candidate,boxes,true,true)||traffic.some(other=>other!==car&&overlapsCar(candidate,other)))return false
 Object.assign(car,{x:pose.x,z:pose.z,heading:pose.heading})
 resetVehicleGround(car)
 return true
}
