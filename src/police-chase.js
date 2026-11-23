import {canWalk} from './navigation.js'
import {createPoliceVehicleRig} from './vehicle-rig.js'
import {newDrive,nearBody,overlapsCar,clearPose,safeExit,stepDrive} from './driving.js'
import {entryPose,entryTime} from './vehicle-entry.js'
import {vehicles} from './vehicles.js'
import {roadDriver} from './police-road.js'

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const lots=[
 {officer:'constable',x:4.39,z:24.5,heading:0},
 {officer:'sergeant',x:-4.33,z:-27,heading:Math.PI}
]
const setup={...vehicles.sport,name:'Harbor Patrol',top:15,power:5.1,wheelbase:.55,steer:.88,steerRate:3.2}
const brake={forward:0,back:0,steer:0,handbrake:true}

export function policeChase(scene,boxes,traffic,civilianCount,crowd,height) {
 const units=lots.map(home=>{
  const rig=createPoliceVehicleRig('sport',{police:true})
  const car=Object.assign(newDrive(rig,setup),home)
  rig.root.visible=false;scene.add(rig.root)
  return {rig,car,home,driver:roadDriver(car),crew:crowd.officers.find(n=>n.id===home.officer),
   active:false,stage:'parked',clock:0,carry:0,lastHeading:home.heading,retry:0}
 })
 let enabled=false,signalClock=0
 const change=(unit,next)=>{unit.stage=next;unit.clock=0;unit.observed=false}
 const resetOrder=unit=>{unit.crew.policeOrder=null;unit.crew.path=[];unit.crew.replan=0;unit.crew.speed=0}
 function enable(allow,player){
  if(allow===enabled)return
  enabled=allow
  traffic.length=civilianCount
  for(const unit of units){
   const {car,home,crew,rig}=unit
   if(crew.policeOrder?.aboard){
    crew.pos.set(crew.x,height(crew.x,crew.z),crew.z)
    crew.rig.root.position.copy(crew.pos);crew.rig.root.visible=true
   }
   resetOrder(unit)
   Object.assign(car,newDrive(rig,setup),home)
   change(unit,'parked');unit.driver.reset();unit.carry=unit.retry=0
   unit.active=allow;unit.hasPose=false;unit.pullAhead=0
   rig.root.visible=false
  }
  if(allow)for(const unit of units)activate(unit,player)
 }
 function activate(unit,player){
  if(!unit.active||traffic.includes(unit.car))return
  if(traffic.some(other=>overlapsCar(unit.car,other))||nearBody(unit.car,player.x,player.z,.65)||!clearPose(unit.car,boxes))return
  traffic.push(unit.car)
 }
 function blockedExit(unit,player,x,z){
  return traffic.some(other=>other!==unit.car&&nearBody(other,x,z))||
   crowd.blockedBy(unit.crew,x,z)||Math.hypot(x-player.x,z-player.z)<.68
 }
 function door(unit,player){
  return safeExit(unit.car,boxes,-1,(x,z)=>blockedExit(unit,player,x,z))
 }
 function orderBoard(unit,player,returning){
  const walk=distance(unit.crew.pos,unit.car)
  if(unit.retry>0||!unit.crew.f.hp||unit.crew.f.action||!returning&&walk>19)return false
  unit.approachLimit=returning?Math.max(8,walk/1.45+5):7
  const exit=door(unit,player)
  if(!exit)return false
  unit.door=exit;unit.returning=returning
  unit.crew.policeOrder={target:exit.door,aboard:false}
  unit.crew.path=[];unit.crew.replan=0
  change(unit,'approach');return true
 }
 function animate(unit,dt,entering){
  const {car,crew}=unit
  unit.transition.time+=dt
  const pose=entryPose(car,unit.transition,entering)
  car.door=pose.opening
  crew.rig.root.visible=pose.visible&&unit.rig.root.visible
  crew.rig.root.position.set(pose.x,pose.y,pose.z)
  crew.rig.root.rotation.y=pose.face
  if(pose.visible)crew.rig.update(dt,pose.speed,{vehicle:{side:unit.door.side,crouch:pose.crouch,reach:pose.reach}})
  return unit.transition.time>=entryTime
 }
 function disembark(unit,player,next){
  const exit=door(unit,player)
  if(!exit)return false
  unit.door=exit;unit.afterExit=next
  unit.transition={...exit,time:0,from:unit.car}
  change(unit,'exit');return true
 }
 function sight(unit,target){
  if(!target||!['chase','stopping'].includes(unit.stage))return false
  const gap=distance(unit.car,target)
  if(gap>27)return false
  const {x,z,heading}=unit.car
  if(gap>5&&((target.x-x)*Math.sin(heading)-(target.z-z)*Math.cos(heading))/gap<-.44)return false
  for(let d=2;d<gap-1;d+=1.1){
   const t=d/gap,px=x+(target.x-x)*t,pz=z+(target.z-z)*t
   if(!canWalk(px,pz,boxes,.08))return false
   if(traffic.some(other=>other!==unit.car&&other!==target&&nearBody(other,px,pz,.05)))return false
  }
  return true
 }
 function simulate(unit,dt,player,target,law){
  const {car,crew,driver}=unit
  const vehiclePursuit=target&&law.level>=2
  unit.clock+=dt
  unit.retry=Math.max(0,unit.retry-dt)
  switch(unit.stage){
   case 'approach':
    if(!crew.f.hp||unit.clock>unit.approachLimit||(!vehiclePursuit&&!unit.returning)){
     resetOrder(unit);unit.retry=2.5;change(unit,unit.returning?'foot':'parked')
    }else if(distance(crew.pos,unit.door.door)<.48&&!crew.f.action){
     crew.policeOrder.aboard=true
     unit.transition={...unit.door,from:{x:crew.pos.x,z:crew.pos.z},time:0}
     change(unit,'board')
    }
    break
   case 'board':
    if(animate(unit,dt,true)){
     car.door=0;crew.rig.root.visible=false;driver.reset()
     change(unit,vehiclePursuit?'chase':'return')
    }
    break
   case 'chase':
    if(!vehiclePursuit){driver.reset();change(unit,law.level>=2?'stopping':'return');break}
    unit.observed=sight(unit,target)
    if(unit.observed)unit.lastHeading=target.heading+(target.speed<-.4?Math.PI:0)
    if(law.lastKnown)driver.step(dt,boxes,traffic,{...law.lastKnown,heading:unit.lastHeading},{follow:true})
    break
   case 'stopping':
    if(vehiclePursuit){unit.pullAhead=0;driver.reset();change(unit,'chase');break}
    if(law.level<2){driver.reset();change(unit,'return');break}
    if(unit.pullAhead>0){
     unit.pullAhead-=dt
     stepDrive(car,{forward:.28,back:0,steer:0,handbrake:false},boxes,dt,traffic)
    }else{
     stepDrive(car,brake,boxes,dt,traffic)
     if(Math.abs(car.speed)<.12&&!disembark(unit,player,'foot'))unit.pullAhead=.85
    }
    break
   case 'exit':
    if(animate(unit,dt,false)){
     const {x,z}=unit.door.door
     if(blockedExit(unit,player,x,z)){
      car.door=0;crew.rig.root.visible=false;unit.pullAhead=.85
      change(unit,law.level>=2?'stopping':'stand-down')
      break
     }
     crew.pos.set(x,height(x,z),z);crew.rig.root.position.copy(crew.pos)
     crew.face=crew.rig.root.rotation.y;car.door=0
     resetOrder(unit);change(unit,unit.afterExit)
     if(law.level>=2)crowd.takePursuit(crew)
    }
    break
   case 'foot':
    if(vehiclePursuit||law.level===0)orderBoard(unit,player,!vehiclePursuit)
    break
   case 'return':
    if(vehiclePursuit){driver.reset();change(unit,'chase');break}
    if(unit.clock>24){unit.pullAhead=0;change(unit,'stand-down');break}
    if(driver.step(dt,boxes,traffic,unit.home,{park:true})){
     car.speed=0
     disembark(unit,player,'parked')
    }
    break
   case 'stand-down':
    // An obstructed return can end at a safe local stop, so it never leaves
    // the crew driving in circles. Keep the car and its actual position.
    if(vehiclePursuit){driver.reset();change(unit,'chase');break}
    if(unit.pullAhead>0){
     unit.pullAhead-=dt
     stepDrive(car,{forward:.23,back:0,steer:0,handbrake:false},boxes,dt,traffic)
    }else{
     stepDrive(car,brake,boxes,dt,traffic)
     if(Math.abs(car.speed)<.12&&!disembark(unit,player,'parked'))unit.pullAhead=.9
    }
    break
  }
 }
 return {
  units,
  update(dt,player,target,law,allow){
   enable(allow,player)
   if(!enabled)return {observed:false,moving:false}
   signalClock+=dt
   let moving=false
   const limit=law.level===3?2:1
   let occupied=units.filter(u=>['approach','board','chase','stopping','exit','foot'].includes(u.stage)).length
   for(const unit of [...units].sort((a,b)=>distance(a.car,player)-distance(b.car,player))){
    activate(unit,player)
    if(!traffic.includes(unit.car))continue
    const range=distance(unit.car,player)
    const shown=range<57
    if(unit.rig.root.visible!==shown)moving=true
    unit.rig.root.visible=shown
    if(unit.stage==='parked'&&target&&law.level>=2&&occupied<limit&&range<58){
     if(orderBoard(unit,player,false))occupied++
    }
    unit.carry+=dt
    const interval=range<25?0:range<57?.06:.12
    if(unit.carry<interval)continue
    const tick=unit.carry;unit.carry=0
    if(unit.stage==='parked'&&unit.hasPose){unit.retry=Math.max(0,unit.retry-tick);continue}
    simulate(unit,tick,player,target,law)
    const signal=law.level>=2&&unit.stage!=='parked'?(Math.floor(signalClock*5)%2)+1:0
    unit.rig.updatePose({...unit.car,dt:tick,signal});unit.hasPose=true
    moving ||= !!unit.car.travel||unit.stage==='board'||unit.stage==='exit'
    unit.car.travel=0;unit.car.impact=0
   }
   return {observed:!!target&&units.some(unit=>unit.observed),moving}
  }
 }
}
