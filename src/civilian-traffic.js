import {civilianEntries,civilianNext} from './police-road.js'
import {clearPose,localPoint,nearBody,newDrive,overlapsCar,stepDrive} from './driving.js'

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b))
const heading=node=>Math.atan2(node.dx,-node.dz)
const dockJunction={x:0,z:-37}
const spawnNear=25,spawnFar=92,despawnAt=108

export function civilianTraffic(scene,boxes,traffic,rigs,{entries=civilianEntries,nextNode=civilianNext,junction=dockJunction}={}){
 const units=rigs.map((rig,index)=>{
  const setup={...rig.setup,top:7.8+index*.25,power:3.25,steer:.86,steerRate:3}
  const car=newDrive(rig,setup)
  rig.root.visible=false
  scene.add(rig.root)
  return {rig,car,active:false,path:[],turn:index,index,stopped:0,waiting:0,recover:0,retry:0}
 })
 let spawnClock=0,junctionOwner=null,spawnCursor=0
 function remove(unit){
  if(!unit.active)return
  traffic.splice(traffic.indexOf(unit.car),1)
  unit.active=false;unit.rig.root.visible=false
  if(junctionOwner===unit)junctionOwner=null
 }
 function spawn(unit,player,walkers,inView){
  for(let i=0;i<entries.length;i++){
   const node=entries[(spawnCursor+i)%entries.length]
   const range=distance(node,player)
   if(range<spawnNear||range>spawnFar||inView(node)&&range<72)continue
   const pose={...newDrive(unit.rig,unit.car.setup),x:node.x,z:node.z,heading:heading(node)}
   if(!clearPose(pose,boxes)||traffic.some(other=>distance(other,pose)<9)||walkers.some(p=>nearBody(pose,p.x,p.z,.9)))continue
   Object.assign(unit.car,pose)
   Object.assign(unit,{path:[node],stopped:0,waiting:0,recover:0,retry:0,active:true})
   unit.rig.updatePose(unit.car)
   unit.rig.root.visible=true;traffic.push(unit.car)
   spawnCursor=(spawnCursor+i+1)%entries.length
   return true
  }
  return false
 }
 function ahead(car,point,width){
  const local=localPoint(car,point.x,point.z)
  return -local.z>0&&Math.abs(local.x)<width?-local.z:Infinity
 }
 function downstream(unit){
  let curve=unit.path.find(node=>node.curve&&distance(node,junction)<9)
  if(!curve)return null
  while(curve.curve)curve=curve.edges[0]
  return curve.edges[0]??curve
 }
 function reserved(unit){
  if(!junction)return false
  const gap=distance(unit.car,junction)
  return gap<14&&unit.path.some(node=>node.curve&&distance(node,junction)<7.5)
 }
 function blockedExit(unit){
  const exit=downstream(unit)
  return exit&&traffic.some(v=>v!==unit.car&&Math.abs(v.speed)<1.05&&distance(v,exit)<4.0)
 }
 function updateJunction(){
  if(!junction)return
  if(junctionOwner){
   const inside=distance(junctionOwner.car,junction)<10.25
   if((inside&&junctionOwner.stopped<4.2)||(!inside&&reserved(junctionOwner)&&junctionOwner.stopped<2.0))return
   junctionOwner=null
  }
  const inside=units.find(u=>u.active&&distance(u.car,junction)<8.95)
  if(inside){junctionOwner=inside;return}
  junctionOwner=units.filter(u=>u.active&&reserved(u)&&!u.recover&&!blockedExit(u))
   .sort((a,b)=>b.waiting-a.waiting||distance(a.car,junction)-distance(b.car,junction)||a.index-b.index)[0]??null
 }
 function canReverse(car,obstacles,people){
  const x=Math.sin(car.heading),z=-Math.cos(car.heading)
  for(const d of [.35,.85,1.4]){
   const pose={...car,x:car.x-x*d,z:car.z-z*d}
   if(!clearPose(pose,boxes)||obstacles.some(other=>overlapsCar(pose,other))||people.some(p=>nearBody(pose,p.x,p.z,.47)))return false
  }
  return true
 }
 function drive(unit,dt,walkers){
  const {car,path}=unit
  while(path.length<10){
   const current=path.at(-1)
   const next=nextNode(current,unit.turn)
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
  const vicinity=junction?distance(car,junction):Infinity
  const wait=reserved(unit)&&junctionOwner!==unit
  unit.waiting=wait?unit.waiting+dt:0
  const obstacles=traffic.filter(other=>other!==car&&distance(car,other)<21)
  const nearby=walkers.filter(p=>distance(car,p)<18)
  const blocked=pose=>nearby.some(p=>nearBody(pose,p.x,p.z,.36))
  let gap=wait?Math.max(0,vicinity-10.65):Infinity
  let leading=Infinity
  for(const other of obstacles){
   const lateral=(car.width+other.width)*.5+.19
   const headway=ahead(car,other,lateral)-car.length*.5-other.length*.5-1.35
   if(headway<gap){
    gap=headway
    leading=Math.max(0,other.speed*Math.cos(angle(other.heading,car.heading)))
   }
  }
  for(const person of nearby){
   const clearance=ahead(car,person,car.width*.5+.62)-car.length*.5-1.08
   if(clearance<gap){gap=clearance;leading=0}
  }
  const limit=Math.min(turning?3.75:car.setup.top,Math.sqrt((Number.isFinite(leading)?leading**2:0)+6*Math.max(0,gap-car.speed*.63)))
  const brake=car.speed>limit+.24||limit<.24
  unit.retry=Math.max(0,unit.retry-dt)
  if(!wait&&unit.stopped>3.1&&!unit.recover&&!unit.retry&&canReverse(car,obstacles,nearby)){
   unit.recover=1.5;unit.retry=5;unit.stopped=0
  }
  if(unit.recover>0){
   unit.recover=Math.max(0,unit.recover-dt)
   stepDrive(car,{forward:0,back:car.speed>-1.65?.68:0,steer:0,handbrake:!unit.recover},boxes,dt,obstacles,false,blocked)
   if(!unit.recover){
    const resume=path.findIndex(node=>!node.curve&&ahead(car,node,3.9)<8)
    if(resume>0)path.splice(0,resume)
   }
  }else stepDrive(car,{forward:brake?0:clamp((limit-car.speed)*.64,0,1),back:0,steer:clamp(error*2.25,-1,1),handbrake:brake},
   boxes,dt,obstacles,false,blocked)
  unit.stopped=Math.abs(car.speed)<.18?unit.stopped+dt:0
  unit.rig.updatePose({...car,dt})
  return Math.abs(car.travel)>.002
 }
 return {
  update(dt,player,{enabled,limit=units.length,walkers,inView=()=>false}){
   if(!enabled){units.forEach(remove);spawnClock=0;return false}
   spawnClock-=dt
   updateJunction()
   let active=0,moving=false
   for(const unit of units){
    if(!unit.active)continue
    const range=distance(player,unit.car)
    if(!inView(unit.car)&&(range>despawnAt||range>32&&(unit.stopped>15||active>=limit))){
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
