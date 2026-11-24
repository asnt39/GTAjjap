import {civilianEntries,civilianNext} from './police-road.js'
import {clearPose,localPoint,nearBody,newDrive,overlapsCar,stepDrive} from './driving.js'

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b))
const heading=node=>Math.atan2(node.dx,-node.dz)
const junction={x:0,z:-37}
const spawnNear=25,spawnFar=92,despawnAt=108

export function civilianTraffic(scene,boxes,traffic,rigs){
 const units=rigs.map((rig,index)=>{
  const setup={...rig.setup,top:7.8+index*.25,power:3.25,steer:.86,steerRate:3}
  const car=newDrive(rig,setup)
  rig.root.visible=false
  scene.add(rig.root)
  return {rig,car,active:false,path:[],turn:index}
 })
 let spawnClock=0,junctionOwner=null,spawnCursor=0
 function remove(unit){
  if(!unit.active)return
  traffic.splice(traffic.indexOf(unit.car),1)
  unit.active=false;unit.rig.root.visible=false
  if(junctionOwner===unit)junctionOwner=null
 }
 function spawn(unit,player,walkers,inView){
  for(let i=0;i<civilianEntries.length;i++){
   const node=civilianEntries[(spawnCursor+i)%civilianEntries.length]
   const range=distance(node,player)
   if(range<spawnNear||range>spawnFar||inView(node)&&range<72)continue
   const pose={...newDrive(unit.rig,unit.car.setup),x:node.x,z:node.z,heading:heading(node)}
   if(!clearPose(pose,boxes)||traffic.some(other=>distance(other,pose)<9)||walkers.some(p=>nearBody(pose,p.x,p.z,.9)))continue
   Object.assign(unit.car,pose)
   unit.path=[node];unit.stopped=0;unit.active=true
   unit.rig.updatePose(unit.car)
   unit.rig.root.visible=true;traffic.push(unit.car)
   spawnCursor=(spawnCursor+i+1)%civilianEntries.length
   return true
  }
  return false
 }
 function ahead(car,point,width){
  const local=localPoint(car,point.x,point.z)
  return -local.z>0&&Math.abs(local.x)<width?-local.z:Infinity
 }
 function drive(unit,dt,walkers){
  const {car,path}=unit
  while(path.length<10){
   const current=path.at(-1)
   const next=civilianNext(current,unit.turn)
   if(current.edges.length>1)unit.turn++
   path.push(next)
  }
  while(path.length>2){
   const node=path[0]
   if(distance(car,node)>1.4&&(node.x-car.x)*node.dx+(node.z-car.z)*node.dz>0)break
   path.shift()
  }
  const look=path.find(node=>distance(car,node)>2.2+car.speed*.22)??path.at(-1)
  const error=angle(Math.atan2(look.x-car.x,car.z-look.z),car.heading)
  const turning=look.curve||Math.abs(error)>.25
  const vicinity=distance(car,junction)
  const enters=path.some(node=>distance(node,junction)<6)
  if(junctionOwner===unit&&vicinity>12&&!enters)junctionOwner=null
  const wait=enters&&vicinity<13&&junctionOwner&&junctionOwner!==unit
  if(enters&&vicinity<13&&!junctionOwner)junctionOwner=unit
  let gap=wait?Math.max(0,vicinity-9):Infinity
  const obstacles=traffic.filter(other=>other!==car&&distance(car,other)<19)
  for(const other of obstacles){
   const reach=other.length*.5
   gap=Math.min(gap,ahead(car,other,(car.width+other.width)*.5+.33)-car.length*.5-reach-1.6)
  }
  const nearby=walkers.filter(p=>distance(car,p)<18)
  for(const person of nearby)gap=Math.min(gap,ahead(car,person,car.width*.5+.72)-car.length*.5-1.1)
  const limit=Math.min(turning?3.75:car.setup.top,Math.sqrt(6*Math.max(0,gap-car.speed*.48)))
  const brake=car.speed>limit+.25||limit<.25
  stepDrive(car,{forward:brake?0:clamp((limit-car.speed)*.6,0,1),back:0,steer:clamp(error*2.2,-1,1),handbrake:brake},
   boxes,dt,obstacles,false,pose=>nearby.some(p=>nearBody(pose,p.x,p.z,.36)))
  unit.stopped=car.speed<.18?unit.stopped+dt:0
  unit.rig.updatePose({...car,dt})
  return Math.abs(car.travel)>.002
 }
 return {
  update(dt,player,{enabled,limit=units.length,walkers,inView=()=>false}){
   if(!enabled){units.forEach(remove);spawnClock=0;return false}
   spawnClock-=dt
   let active=0,moving=false
   for(const unit of units){
    if(!unit.active)continue
    const range=distance(player,unit.car)
    if(range>despawnAt||range>32&&!inView(unit.car)&&(unit.stopped>8||active>=limit)){
     remove(unit);moving=true;continue
    }
    if(unit.rig.driver)unit.rig.driver.visible=range<23
    moving=drive(unit,dt,walkers)||moving
    active++
   }
   if(active<limit&&spawnClock<=0){
    spawnClock=2.3
    const unit=units.find(unit=>!unit.active)
    if(unit)moving=spawn(unit,player,walkers,inView)||moving
   }
   return moving
  },
  clear(){units.forEach(remove)}
 }
}
