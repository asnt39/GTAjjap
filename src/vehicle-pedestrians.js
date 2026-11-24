import {nearBody} from './driving.js'

export const knockoutVehicleSpeed=12

// The rigid body already sweeps the road at 120 Hz. Check its actual movement
// between the last clear poses against nearby game pedestrians.
export function createPedestrianImpacts(){
 const lastContact=new WeakMap(),sweep={}
 let clock=0
 return (dt,before,car,residents,onHit)=>{
  clock+=dt
  const travel=Math.hypot(car.x-before.x,car.z-before.z)
  const speed=Math.min(Math.max(Math.abs(before.speed),Math.abs(car.speed)),travel/Math.max(dt,.001)+.6)
  if(speed<3.6||travel<.028)return 0
  const headingDelta=car.heading-before.heading
  const x=(car.x-before.x)/travel,z=(car.z-before.z)/travel
  let hits=0
  sweep.width=car.width;sweep.length=car.length
  for(const resident of residents){
   if(resident.f.hp<=0||resident.f.action==='knockdown'||resident.policeOrder?.aboard||resident===car.driver||
      Math.hypot(resident.pos.x-car.x,resident.pos.z-car.z)>car.length+travel||
      clock-(lastContact.get(resident)??-10)<.85)continue
   if(nearBody(before,resident.pos.x,resident.pos.z,.30))continue
   const samples=Math.max(1,Math.ceil((travel+Math.abs(headingDelta)*car.length/2)/.19))
   for(let i=1;i<=samples;i++){
    const part=i/samples
    sweep.x=before.x+(car.x-before.x)*part;sweep.z=before.z+(car.z-before.z)*part
    sweep.heading=before.heading+headingDelta*part
    if(!nearBody(sweep,resident.pos.x,resident.pos.z,.30))continue
    const knockout=speed>=knockoutVehicleSpeed
    const damage=Math.min(resident.f.hp-1,Math.round(13+(speed-3.6)*5.4))
    if(onHit(resident,damage,{x,z,speed,knockout})!==false){
     lastContact.set(resident,clock);hits++
    }
    break
   }
  }
  return hits
 }
}
