// All dynamics use metres, seconds and radians. Heading zero faces north (-Z).
import {canWalk} from './navigation.js'
import {onDrivePavement,pavedDriveBounds,townCurbBlocks,townDriveBounds,unpavedDriveBlocks,useTownDriveMask} from './old-town-plan.js'
import {touringSetup} from './vehicles.js'
import {dentVehicle} from './vehicle-damage.js'
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v))
const approach=(a,b,step)=>a+clamp(b-a,-step,step)
const step=1/120
const dockDriveBounds=[-97,25.3,-101,58]
const curbBlocks=[[-100,-6.05,-200,-43],[6.05,100,-200,-43],[-100,-6.05,-31,200],[6.05,100,-31,200]]
export function localPoint(car,x,z){
 const c=Math.cos(car.heading),s=Math.sin(car.heading),dx=x-car.x,dz=z-car.z
 return {x:dx*c+dz*s,z:-dx*s+dz*c}
}
export function worldPoint(car,x,z){
 const c=Math.cos(car.heading),s=Math.sin(car.heading)
 return {x:car.x+c*x-s*z,z:car.z+s*x+c*z}
}
export function nearBody(car,x,z,r=.32){
 const p=localPoint(car,x,z)
 return Math.hypot(Math.max(0,Math.abs(p.x)-car.width/2),Math.max(0,Math.abs(p.z)-car.length/2))<r
}
export function clearPose(car,boxes,allowOldTown=true,allowSidewalk=false,contact){
 const cs=Math.cos(car.heading),sn=Math.sin(car.heading),c=Math.abs(cs),s=Math.abs(sn)
 const w=car.width/2,l=car.length/2,rx=c*w+s*l,rz=s*w+c*l
 const inTown=allowOldTown&&useTownDriveMask(car.x,car.z)
 const [west,east,north,south]=allowSidewalk?pavedDriveBounds:inTown?townDriveBounds:dockDriveBounds
 if(car.x-rx<west||car.x+rx>east||car.z-rz<north||car.z+rz>south)return false
 const overlaps=([x1,x2,z1,z2])=>{
  if(car.x+rx<=x1||car.x-rx>=x2||car.z+rz<=z1||car.z-rz>=z2)return false
  const a=(x2-x1)/2,b=(z2-z1)/2,dx=(x1+x2)/2-car.x,dz=(z1+z2)/2-car.z
  return Math.abs(dx*cs+dz*sn)<w+a*c+b*s && Math.abs(-dx*sn+dz*cs)<l+a*s+b*c
 }
 const block=(allowSidewalk?unpavedDriveBlocks:inTown?townCurbBlocks:curbBlocks).find(overlaps)??boxes.find(bounds=>(bounds[6]??0)<car.height+.16&&overlaps(bounds))
 if(contact&&block){
  contact.x=clamp(car.x,block[0],block[1])
  contact.z=clamp(car.z,block[2],block[3])
 }
 return !block
}

export function vehicleLift(car){
 const c=Math.cos(car.heading),s=Math.sin(car.heading)
 const across=car.width*.39,axle=car.length*(car.setup?.wheelbase??touringSetup.wheelbase)*.5
 let wheelsOnPavement=0
 for(const side of [-1,1])for(const end of [-1,1]){
  if(onDrivePavement(car.x+c*across*side-s*axle*end,car.z+s*across*side+c*axle*end))wheelsOnPavement++
 }
 return .083*wheelsOnPavement/4
}
// Separation along the four axes of two oriented rectangles.
export function overlapsCar(a,b){
 const reach=(a.width+a.length+b.width+b.length)*.5
 if(Math.abs(a.x-b.x)>=reach||Math.abs(a.z-b.z)>=reach)return false
 const relative=localPoint(a,b.x,b.z),back=localPoint(b,a.x,a.z)
 const c=Math.abs(Math.cos(a.heading-b.heading)),s=Math.abs(Math.sin(a.heading-b.heading))
 return Math.abs(relative.x)*2<a.width+b.width*c+b.length*s &&
  Math.abs(relative.z)*2<a.length+b.width*s+b.length*c &&
  Math.abs(back.x)*2<b.width+a.width*c+a.length*s &&
  Math.abs(back.z)*2<b.length+a.width*s+a.length*c
}
export function stepDrive(car,input,boxes,elapsed,others=[],allowSidewalk=false){
 const setup=car.setup??touringSetup
 const clear=contact=>{
  if(!clearPose(car,boxes,true,allowSidewalk,contact))return false
  const other=others.find(other=>other!==car&&overlapsCar(car,other))
  if(other&&contact)Object.assign(contact,{x:other.x,z:other.z,other})
  return !other
 }
 const contact={}
 const command=input.forward-input.back
 car.remainder+=clamp(elapsed,0,.25)
 car.travel=0
 let impact=0
 while(car.remainder+1e-10>=step){
  car.remainder-=step
  const old=car.speed,mag=Math.abs(old)
  const target=input.steer*(setup.steer/(1+mag*.064))
  const steerRate=input.steer?setup.steerRate/(1+mag*.055):2.1
  car.steer=approach(car.steer,target,step*steerRate)
  const opposite=command*old<0
  car.braking=!!input.handbrake||opposite
  if(!command||car.braking||car.shiftDelay>0||command*car.throttle<0)car.throttle=0
  if(input.handbrake||opposite){
   car.speed=approach(old,0,(input.handbrake?setup.handbrake:setup.brake)*step)
   if(opposite&&car.speed===0)car.shiftDelay=setup.bike?.16:.13
  }else if(car.shiftDelay>0){
   car.shiftDelay-=step
  }else if(command){
   const max=command>0?setup.top:setup.reverse,power=command>0?setup.power:setup.reversePower
   car.throttle=approach(car.throttle,command,step*6.5)
   car.speed=old+car.throttle*power*(1-(mag/max)**1.4)*step
  }else{
   car.speed=approach(old,0,(.63+.006*mag*mag)*step)
  }
  const travel=(old+car.speed)*.5*step
  const turn=travel*Math.tan(car.steer)/(car.length*setup.wheelbase)
  // Advance the rear axle, then reconstruct the body centre. This lets the
  // nose pull away from a close curb without swinging the whole rear across it.
  const angle=car.heading+turn*.5,rearOffset=car.length*.312
  const dx=Math.sin(angle)*travel+rearOffset*(Math.sin(car.heading+turn)-Math.sin(car.heading))
  const dz=-Math.cos(angle)*travel-rearOffset*(Math.cos(car.heading+turn)-Math.cos(car.heading))
  if(travel!==0){
   const x=car.x,z=car.z,h=car.heading
   car.x+=dx;car.z+=dz;car.heading+=turn
   contact.x=contact.z=contact.other=undefined
   if(clear(contact))car.travel+=travel
   else{
    const alongX=Math.abs(dx)>Math.abs(dz)
    const tangent=Math.abs(alongX?dx:dz)/Math.hypot(dx,dz)
    // A shallow scrape cancels motion into the obstacle. Try the dominant
    // axis with the last clear heading so the body cannot rotate into it.
    car.heading=h
    car.x=x+(alongX?dx:0);car.z=z+(alongX?0:dz)
    if(tangent>.97&&clear()){
     car.travel+=travel*tangent
     car.speed*=tangent*tangent
     impact=Math.max(impact,mag*(1-tangent*tangent))
    }else{
     // Advance to contact on a hard hit instead of stopping a full step short.
     let safe=0,blocked=1
     if(mag>.35)for(let i=0;i<4;i++){
      const part=(safe+blocked)*.5
      car.x=x+dx*part;car.z=z+dz*part;car.heading=h+turn*part
      if(clear())safe=part
      else blocked=part
     }
     car.x=x+dx*safe;car.z=z+dz*safe;car.heading=h+turn*safe
     car.travel+=travel*safe
     if(mag>=3.8){
      const hit=localPoint(car,contact.x??x+dx*100,contact.z??z+dz*100)
      const dent=dentVehicle(car,hit.x,hit.z,mag)
      if(dent)car.collision=worldPoint(car,dent.x*car.width*.5,dent.z*car.length*.5)
      if(contact.other){
       const otherHit=localPoint(contact.other,car.x,car.z)
       dentVehicle(contact.other,otherHit.x,otherHit.z,mag*.8)
      }
     }
     impact=Math.max(impact,mag);car.speed=0
    }
   }
   if(allowSidewalk){
    const lift=vehicleLift(car),rise=Math.max(0,lift-car.lift)
    if(rise){
     car.speed*=1-.28*rise/.083
     impact=Math.max(impact,Math.min(2.2,.55+mag*.12))
    }
    car.lift=lift
   }
  }
  car.accel=approach(car.accel,clamp((car.speed-old)/step,-9,6),step*32)
 }
 car.impact=impact
 return impact
}
export function doorPoint(car,side,extra=.47){return worldPoint(car,side*(car.width/2+extra),car.setup?.doorZ??-.16)}
// Keep the shared approach point stable for deployed room servers. The rig can
// place its animated sill farther forward when the cab has a different shape.
export function cabinPoint(car,side,extra){
 return worldPoint(car,side*(car.width/2+extra),car.setup?.cabinZ??car.setup?.doorZ??-.16)
}
export function clearPath(a,b,boxes,r=.32,blocked){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.14))
 for(let i=0;i<=n;i++){const t=i/n;const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(!canWalk(x,z,boxes,r)||blocked?.(x,z))return false}
 return true
}
export function availableDoor(car,p,boxes,blocked){
 for(const side of [-1,1]){
  const door=doorPoint(car,side)
  if(side*localPoint(car,p.x,p.z).x>0 && Math.hypot(p.x-door.x,p.z-door.z)<1.65 && clearPath(p,door,boxes,.32,blocked)&&(!car.setup?.cabinZ||clearPath(p,cabinPoint(car,side,.26),boxes,.32,blocked)))return {side,door}
 }
 return null
}
export function safeExit(car,boxes,preferred=-1,blocked){
 for(const side of [preferred,-preferred]){
  const start=doorPoint(car,side,.05),target=doorPoint(car,side,.61)
  if(clearPath(start,target,boxes,.32,blocked)&&(!car.setup?.cabinZ||clearPath(cabinPoint(car,side,.26),target,boxes,.32,blocked))&&!nearBody(car,target.x,target.z))return {side,door:target}
 }
 return null
}
export function newDrive(rig,setup=touringSetup){
 const car={setup,x:rig.x,z:rig.z,width:rig.width,length:rig.length,height:rig.height,heading:rig.heading,speed:0,throttle:0,steer:0,remainder:0,shiftDelay:0,braking:false,accel:0,impact:0,dents:undefined,collision:null}
 car.lift=vehicleLift(car)
 return car
}
