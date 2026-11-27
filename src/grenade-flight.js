import {Vector3} from 'three'
import {equipmentTrace} from './equipment-contact.js'
import {clearPose,localPoint,nearBody,overlapsCar} from './driving.js'
import {dentVehicle} from './vehicle-damage.js'

const step=1/90, radius=.08, fuse=1.8
export const blastRadius=11
const noFloor=()=>0,noCeiling=()=>Infinity

export function grenadeFlight({origin,heading,pitch,boxes,floor=noFloor,ceiling=noCeiling,vehicles=[]}){
 const position=new Vector3().copy(origin)
 const flat=Math.cos(pitch)
 const velocity=new Vector3(Math.sin(heading)*flat*12,4.7-Math.sin(pitch)*9,-Math.cos(heading)*flat*12)
 let elapsed=0,remainder=0,finished=false
 function solid(x,y,z){
  for(const [l,r,n,s,top,,bottom=0] of boxes.near?.(x,z,radius)??boxes){
   if(y+radius>bottom&&y-radius<top&&x+radius>l&&x-radius<r&&z+radius>n&&z-radius<s)return true
  }
  return vehicles.some(v=>y+radius>(v.lift??0)&&y-radius<v.height+(v.lift??0)&&nearBody(v,x,z,radius))
 }
 return {position,velocity,update(dt){
  if(finished)return false
  remainder+=Math.min(.12,Math.max(0,dt))
  while(remainder+1e-9>=step){
   remainder-=step;elapsed+=step
   velocity.y-=12*step
   let next=position.x+velocity.x*step
   if(solid(next,position.y,position.z))velocity.x*=-.48
   else position.x=next
   next=position.z+velocity.z*step
   if(solid(position.x,position.y,next))velocity.z*=-.48
   else position.z=next
   const ground=floor(position.x,position.z)+radius
   const overhead=ceiling(position.x,position.z,position.y)-radius
   next=position.y+velocity.y*step
   if(position.y<=overhead&&next>=overhead){
    position.y=overhead;velocity.y*=-.40
   }else if(next<=ground){
    position.y=ground
    velocity.y=velocity.y<-1.3?-velocity.y*.40:0
    velocity.x*=Math.exp(-7*step);velocity.z*=Math.exp(-7*step)
   }else if(solid(position.x,next,position.z)){
    velocity.y*=-.40
    velocity.x*=.93;velocity.z*=.93
   }else position.y=next
   if(elapsed+1e-9>=fuse){finished=true;return true}
  }
  return false
 }}
}

export function grenadePreview(options,sample){
 const flight=grenadeFlight(options)
 sample(flight.position)
 for(let i=0;i<Math.ceil(fuse/(step*4))+1;i++){
  const exploded=flight.update(step*4)
  sample(flight.position)
  if(exploded)break
 }
 return flight.position
}
export function grenadeBlast(boxes){
 const trace=equipmentTrace(boxes,[],[]),direction=new Vector3()
 return (center,target)=>{
  direction.subVectors(target,center)
  const distance=direction.length()
  if(distance===0)return 1
  if(distance>=blastRadius||trace(center,direction.multiplyScalar(1/distance),distance).blocked)return 0
  return (1-distance/blastRadius)**1.35
 }
}

export function kickVehicle(car,center,strength,boxes,vehicles,move=true){
 if(!strength)return
 const contact=localPoint(car,center.x,center.z)
 dentVehicle(car,contact.x,contact.z,4+strength*15)
 if(!move)return
 const distance=Math.hypot(car.x-center.x,car.z-center.z)
 if(distance<.01)return
 const dx=(car.x-center.x)/distance*strength*.72/5,dz=(car.z-center.z)/distance*strength*.72/5
 for(let i=0;i<5;i++){
  car.x+=dx;car.z+=dz
  if(!clearPose(car,boxes,true,true)||vehicles.some(other=>other!==car&&overlapsCar(car,other))){
   car.x-=dx;car.z-=dz;break
  }
 }
 car.speed*=1-strength*.50
}
