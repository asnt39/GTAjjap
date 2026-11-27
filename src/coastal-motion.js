import {boatWater,beachGround,coastalBoats,inCoast,inPier,rockSolid,seaLevel,seabed,swellAt} from './coast-plan.js'
import {overlapsCar,worldPoint} from './driving.js'

const clamp=(v,min,max)=>Math.min(max,Math.max(min,v))
const damp=(v,to,rate,dt)=>v+(to-v)*(1-Math.exp(-rate*dt))
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const headingError=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b))
const diveDepth=1.36

export function canStartSwimming(x,z){
 return x>31&&inCoast(x,z)&&!inPier(x,z)&&beachGround(x,z)<seaLevel-.45&&!rockSolid(x,z,.34)
}

export function swimmer(){
 let vx=0,vz=0,drowning=0
 const state={diving:false,air:1,stroke:0,wet:0,
  start(pos){
   vx=vz=drowning=0
   state.diving=false;state.air=1;state.stroke=0;state.wet=0;pos.y=Math.max(seabed(pos.x,pos.z)+.23,seaLevel-.97)
  },
  toggle(pos){
   if(!state.diving&&seabed(pos.x,pos.z)>seaLevel-diveDepth)return false
   state.diving=!state.diving
   return true
  },
  step(pos,dt,x,z,elapsed,land,occupied){
   const magnitude=Math.hypot(x,z),rate=state.diving?2.25:2.68
   vx=damp(vx,x*rate,4.4,dt);vz=damp(vz,z*rate,4.4,dt)
   const oldX=pos.x,oldZ=pos.z
   const valid=(a,b)=>inCoast(a,b,.31)&&!rockSolid(a,b,.36)&&!occupied(a,b)&&
    (!(a<30&&b>102&&b<218)||land(a,b))
   const dx=vx*dt,dz=vz*dt
   if(valid(pos.x+dx,pos.z+dz)){pos.x+=dx;pos.z+=dz}
   else{
    if(dx&&valid(pos.x+dx,pos.z))pos.x+=dx;else vx=0
    if(dz&&valid(pos.x,pos.z+dz))pos.z+=dz;else vz=0
   }
   const bottom=seabed(pos.x,pos.z),surface=swellAt(pos.x,pos.z,elapsed)
   if(state.diving&&bottom>seaLevel-diveDepth)state.diving=false
   const atPier=inPier(pos.x,pos.z)
   const depth=state.diving?2.32+.33*Math.sin(elapsed*.82):.98
   const height=Math.max(bottom+.22,surface-depth)
   pos.y=damp(pos.y,height,6,dt)
   state.wet=damp(state.wet,pos.y<seaLevel-1.26?1:0,5,dt)
   if(state.wet>.66)state.air=Math.max(0,state.air-dt/28)
   else if(state.wet<.30)state.air=Math.min(1,state.air+dt*.58)
   drowning=state.air>0?0:drowning+dt
   const damage=drowning>=1.1?12:0
   if(damage)drowning-=1.1
   state.stroke+=dt*(.57+magnitude*2.55)
   return {land:!state.diving&&!atPier&&bottom>seaLevel-.34&&land(pos.x,pos.z),damage,
    speed:dt?Math.hypot(pos.x-oldX,pos.z-oldZ)/dt:0,face:Math.atan2(pos.x-oldX,pos.z-oldZ)}
  }
 }
 return state
}
export function createBoats(){
 return coastalBoats.map(setup=>({...setup,setup,speed:0,rudder:0,slip:0,hit:0,damage:0,travel:0,stepTime:0,bob:0,heel:0}))
}
export function boatPoseClear(b,others=[]){
 const corners=[[-.47,-.36],[.47,-.36],[-.46,.40],[.46,.40],[0,-.5],[0,.50],[0,0]]
 for(const [x,z] of corners){
  const p=worldPoint(b,x*b.width,z*b.length)
  if(!boatWater(p.x,p.z,b.draft))return false
 }
 return !others.some(other=>other!==b&&overlapsCar(b,other))
}
export function driveBoat(boat,input,elapsed,others){
 const step=1/90
 boat.hit=boat.travel=0
 boat.stepTime+=Math.min(elapsed,.12)
 while(boat.stepTime+1e-10>=step){
  boat.stepTime-=step
  const startX=boat.x,startZ=boat.z,startHeading=boat.heading
  const throttle=clamp(input.forward-input.back,-1,1)
  const cap=(throttle<0?3.6:boat.top)*(1-boat.damage*.38)
  const throttleMagnitude=Math.min(1,Math.abs(throttle))
  const speed=boat.speed
  boat.rudder=damp(boat.rudder,input.steer,4.3,step)
  if(input.brake)boat.speed=damp(speed,0,2.9,step)
  else if(throttleMagnitude>.01){
   const opposite=speed*throttle<0
   const power=opposite?2.65:boat.power*Math.max(0,1-(Math.abs(speed)/cap)**1.55)
   boat.speed=clamp(speed+throttle*power*step,-3.6,boat.top)
  }else boat.speed=damp(speed,0,.37+.028*Math.abs(speed),step)
  if(Math.abs(speed)>cap&&Math.sign(speed)===Math.sign(throttle))boat.speed=damp(boat.speed,Math.sign(speed)*cap,1.75,step)
  const turn=boat.rudder*clamp(speed/3.8,-.63,1)*boat.turn/(1+.032*Math.abs(speed))
  boat.heading+=turn*step
  boat.slip=damp(boat.slip,turn*.43,1.65,step)
  const distance=(speed+boat.speed)*.5*step,course=boat.heading-boat.slip
  boat.x+=Math.sin(course)*distance;boat.z-=Math.cos(course)*distance
  if(!boatPoseClear(boat,others)){
   const hit=Math.abs(speed)
   if(hit>boat.hit)boat.hit=hit
   if(hit>2.1)boat.damage=clamp(boat.damage+(hit-2.1)*.018,0,1)
   Object.assign(boat,{x:startX,z:startZ,heading:startHeading,speed:0,slip:0})
  }else boat.travel+=Math.abs(distance)
 }
 return boat.hit
}
export function nearestBoat(pos,boats,swimming){
 let best=null,range=swimming?2.45:3
 if(!swimming&&!inPier(pos.x,pos.z))return null
 for(const b of boats){
  const gap=distance(pos,b)
  if(gap<range&&Math.abs(b.speed)<1.3){best=b;range=gap}
 }
 return best
}
export function boatExit(b,dry,others){
 const spots=[[-1.45,.15],[1.45,.15],[-2.55,.45],[2.55,.45],[0,b.length*.63]].map(([x,z])=>worldPoint(b,x,z))
 for(const spot of spots)if(dry(spot.x,spot.z)&&!rockSolid(spot.x,spot.z,.45))return {...spot,dry:true}
 for(const spot of spots)if(canStartSwimming(spot.x,spot.z)&&!others.some(k=>k!==b&&distance(spot,k)<k.width))return {...spot,dry:false}
 return null
}
export const steerTo=(heading,target)=>headingError(target,heading)
