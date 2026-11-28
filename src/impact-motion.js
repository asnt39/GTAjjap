import {safeExit} from './driving.js'
import {movePlayer} from './navigation.js'

const profiles={
 melee:{force:1.35,gain:.035,decay:6.5,pitch:.28},
 shot:{force:.52,gain:.021,decay:9,pitch:.14},
 vehicle:{force:2.2,gain:.10,decay:4.6,pitch:.39},
 blast:{force:2.8,gain:.10,decay:4.2,pitch:.44}
}
export function impactReaction(kind,x,z,face=0){
 const length=Math.hypot(x,z),pitch=profiles[kind].pitch
 if(length<.0001)return {kind,lateral:0,front:-1,pitch}
 const nx=x/length,nz=z/length
 return {kind,lateral:nx*Math.cos(face)-nz*Math.sin(face),front:nx*Math.sin(face)+nz*Math.cos(face),pitch}
}
export function impulse(f,kind,x,z,strength,{vx=0,vz=0,face=0,lift=0}={}){
 const profile=profiles[kind]
 const length=Math.hypot(x,z)||1
 const nx=x/length,nz=z/length
 const force=Math.min(8,profile.force+Math.max(0,strength)*profile.gain)
 f.reaction=impactReaction(kind,x,z,face)
 f.motion={x:nx*force+vx*.33,z:nz*force+vz*.33,decay:profile.decay,lift,time:0}
}
export function moveImpact(f,pos,dt,boxes,occupied){
 const m=f.motion
 if(!m)return 0
 m.time+=dt
 const damping=Math.exp(-m.decay*dt),distance=(1-damping)/m.decay
 const x=pos.x,z=pos.z
 movePlayer(pos,m.x*distance,m.z*distance,boxes,occupied,pos.y)
 if(Math.abs(pos.x-x)<Math.abs(m.x*distance)*.38)m.x=0
 if(Math.abs(pos.z-z)<Math.abs(m.z*distance)*.38)m.z=0
 m.x*=damping;m.z*=damping
 const height=m.time<.54?Math.sin(Math.PI*m.time/.54)*m.lift:0
 if(m.time>1.05||!f.action)f.motion=null
 return height
}

export function crashInjury(speed,bike=false){
 const protection=bike?3.4:5.9
 const excess=Math.max(0,speed-protection)
 return {damage:Math.min(bike?100:72,Math.round(excess*(bike?6.7:3.35))),eject:bike&&speed>=7.2}
}

export function crashEvents(){
 const recent=new WeakMap()
 return (car,clock)=>{
  const contact=car.hardContact
  if(!contact||contact.speed<3.4||clock<(recent.get(car)??-Infinity))return null
  recent.set(car,clock+.76)
  return {...contact,...crashInjury(contact.speed,car.setup.bike)}
 }
}


export function crashExit(car,collision,boxes,blocked){
 const toRight=collision.x*Math.cos(car.heading)+collision.z*Math.sin(car.heading)
 return safeExit(car,boxes,toRight<0?-1:1,blocked)
}
