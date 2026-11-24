import {cabinPoint,worldPoint} from './driving.js'

const ramp=(value,start,end)=>{
 const t=Math.max(0,Math.min(1,(value-start)/(end-start)))
 return t*t*(3-2*t)
}
const mix=(a,b,t)=>a+(b-a)*t
export const entryTime=1.42

// The driver's feet first reach the sill. The upper body crouches and turns
// through the opening before the camera switches to the driving view.
export function entryPose(car,transition,entering) {
 const {side,door,from,time}=transition
 if(car.setup?.bike){
  const seated=entering?ramp(time,.33,1.03):1-ramp(time,.20,.88)
  const step=entering?from:door,seat=worldPoint(car,0,.25)
  const pivot=entering?ramp(time,0,.68):ramp(time,.36,1.08)
  const heading=Math.PI-car.heading
  return {x:mix(step.x,seat.x,seated),z:mix(step.z,seat.z,seated),face:heading+side*.64*(entering?1-pivot:pivot),
   y:(car.lift??0)-.10*seated+Math.sin(seated*Math.PI)*.13,crouch:0,reach:0,opening:0,visible:true,
   speed:(1-seated)*Math.sin(Math.PI*pivot)*1.2,ride:seated}
 }
 const approach=entering?ramp(time,0,.35):1
 const passage=entering?ramp(time,.69,1.13):1-ramp(time,.32,.87)
 const opening=entering?ramp(time,.35,.68)*(1-ramp(time,1.10,entryTime)):
  ramp(time,0,.32)*(1-ramp(time,.91,1.26))
 const crouch=entering?ramp(time,.54,.94):1-ramp(time,.49,.96)
 const reach=entering?ramp(time,.26,.44)*(1-ramp(time,.65,.88)):
  ramp(time,.51,.72)*(1-ramp(time,1.10,1.26))
 const sill=cabinPoint(car,side,.26)
 const seat=worldPoint(car,side*car.width*.23,car.setup?.cabinZ??car.setup?.doorZ??-.16)
 const x=mix(mix(from.x,sill.x,approach),mix(sill.x,seat.x,passage),approach)
 const z=mix(mix(from.z,sill.z,approach),mix(sill.z,seat.z,passage),approach)
 const toward=-car.heading-side*Math.PI/2,forward=Math.PI-car.heading
 const turn=-side*Math.PI/2
 const face=entering?toward+turn*ramp(time,.65,.98):forward+turn*ramp(time,.29,.60)
 const settle=entering?0:ramp(time,.82,1.10)
 return {
  x:mix(x,door.x,settle),z:mix(z,door.z,settle),face,
  y:.027+(car.setup?.seatLift??.30)*Math.sin(passage*Math.PI/2)-(car.setup?.crouchDrop??.56)*crouch,
  crouch,reach,opening:opening?side*opening:0,visible:passage<.88,
  speed:entering&&time<.35?Math.min(2,Math.hypot(sill.x-from.x,sill.z-from.z)*2.9):0
 }
}
