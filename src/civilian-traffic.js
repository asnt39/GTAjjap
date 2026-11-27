import {civilianEntries,civilianNext,civilianTurnarounds} from './police-road.js'
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
  return {rig,car,active:false,path:[],turn:index,index,stopped:0,waiting:0,blocked:0,dependency:null,recover:0,retry:0}
 })
 const zones=junction?[{point:junction,entry:17,stop:13.2,inside:9.8,release:10.9},
  ...civilianTurnarounds.map(point=>({point,entry:15,stop:10,inside:6.8,release:8}))]:[]
 let spawnClock=0,recoveryOwner=null,spawnCursor=0
 function remove(unit){
  if(!unit.active)return
  const at=traffic.indexOf(unit.car)
  if(at!==-1)traffic.splice(at,1)
  unit.active=false;unit.rig.root.visible=false
  for(const zone of zones)if(zone.owner===unit){zone.owner=null;zone.entered=false}
  if(recoveryOwner===unit)recoveryOwner=null
 }
 function spawn(unit,player,walkers,inView){
  for(let i=0;i<entries.length;i++){
   const node=entries[(spawnCursor+i)%entries.length]
   const range=distance(node,player)
   if(range<spawnNear||range>spawnFar||inView(node)&&range<72)continue
   const pose={...newDrive(unit.rig,unit.car.setup),x:node.x,z:node.z,heading:heading(node)}
   if(!clearPose(pose,boxes)||traffic.some(other=>distance(other,pose)<9)||walkers.some(p=>nearBody(pose,p.x,p.z,.9)))continue
   Object.assign(unit.car,pose)
   Object.assign(unit,{path:[node],stopped:0,waiting:0,blocked:0,dependency:null,recover:0,retry:0,active:true})
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
 function exitFrom(curve){
  while(curve?.curve)curve=curve.edges[0]
  return curve
 }
 function zoneCurve(unit,zone){
  return unit.path.find(node=>node.curve&&distance(node,zone.point)<(zone.point.curve?5.5:7.5))
 }
 function reserved(unit,zone){
  return distance(unit.car,zone.point)<zone.entry&&zoneCurve(unit,zone)
 }
 function blockedExit(unit,curve){
  const exit=exitFrom(curve)
  if(!exit)return true
  const {car}=unit,angle=heading(exit)
  const outbound=traffic.filter(v=>v!==car&&distance(v,exit)<13)
  // Check the complete vehicle in its actual outbound lane. The other
  // direction's stop line can be within metres of this same path node.
  for(const metres of [0,1.7,3.4,5.1,6.8]){
   const pose={...car,x:exit.x+exit.dx*metres,z:exit.z+exit.dz*metres,heading:angle}
   if(outbound.some(v=>overlapsCar(pose,v)))return true
  }
  return false
 }
 function tryAlternateExit(unit){
  const at=unit.path.findIndex(node=>node.edges.length>1&&distance(node,junction)<10)
  if(at<0)return false
  const branch=unit.path[at],current=unit.path[at+1]
  for(let i=0;i<branch.edges.length;i++){
   const alternate=nextNode(branch,unit.turn+i)
   if(!alternate||alternate===current||blockedExit(unit,alternate))continue
   unit.path.splice(at+1,Infinity,alternate)
   unit.turn+=i+1
   return true
  }
  return false
 }
 function updateZone(zone){
  if(zone.owner){
   const radius=distance(zone.owner.car,zone.point)
   zone.entered||=radius<zone.inside
   const turn=reserved(zone.owner,zone)
   if(zone.entered?radius<zone.release+zone.owner.car.length*.5:turn&&!blockedExit(zone.owner,turn))return
   zone.owner=null;zone.entered=false
  }
  const inside=units.find(u=>u.active&&distance(u.car,zone.point)<zone.inside)
  if(inside){zone.owner=inside;zone.entered=true;return}
  const queue=units.filter(u=>u.active&&reserved(u,zone)&&!u.recover)
   .sort((a,b)=>b.waiting-a.waiting||distance(a.car,zone.point)-distance(b.car,zone.point)||a.index-b.index)
  zone.owner=queue.find(u=>!blockedExit(u,zoneCurve(u,zone))||
   !zone.point.curve&&u.waiting>2&&tryAlternateExit(u))??null
 }
 function canReverse(car,obstacles,people,steer){
  const curvature=Math.tan(steer*car.setup.steer)/(car.length*car.setup.wheelbase)
  for(const d of [.24,.50,.76,1.02,1.30,1.58]){
   const turn=-d*curvature,axle=car.length*.312,angle=car.heading+turn*.5,heading=car.heading+turn
   const pose={...car,
    x:car.x-Math.sin(angle)*d+axle*(Math.sin(heading)-Math.sin(car.heading)),
    z:car.z+Math.cos(angle)*d-axle*(Math.cos(heading)-Math.cos(car.heading)),heading}
   if(!clearPose(pose,boxes)||obstacles.some(other=>overlapsCar(pose,other))||people.some(p=>nearBody(pose,p.x,p.z,.47)))return false
  }
  return true
 }
 function prepare(unit){
  const {car,path}=unit
  while(path.length<24){
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
 }
 function routeProbes(car,path){
  const probes=[]
  let from=car,travel=0
  for(const to of path){
   const length=distance(from,to)
   if(length<.01){from=to;continue}
   const dx=(to.x-from.x)/length,dz=(to.z-from.z)/length
   const pieces=Math.ceil(length/.9),orientation=Math.atan2(dx,-dz)
   for(let i=1;i<=pieces;i++){
    const along=i*length/pieces
    if(travel+along>15)return probes
    probes.push({x:from.x+dx*along,z:from.z+dz*along,heading:orientation,
     width:car.width,length:car.length,gap:travel+along-1.2})
   }
   travel+=length;from=to
  }
  return probes
 }
 function intent(unit,dt,walkers){
  const {car,path}=unit
  const look=path.find(node=>distance(car,node)>2.2+car.speed*.22)??path.at(-1)
  const error=angle(Math.atan2(look.x-car.x,car.z-look.z),car.heading)
  const turning=look.curve||Math.abs(error)>.25
  const zone=zones.find(zone=>zone.owner!==unit&&reserved(unit,zone))
  const owned=zones.some(zone=>zone.owner===unit)
  const wait=!!zone
  unit.waiting=wait?unit.waiting+dt:0
  const obstacles=traffic.filter(other=>other!==car&&distance(car,other)<21)
  const nearby=walkers.filter(p=>distance(car,p)<18)
  const blocked=pose=>nearby.some(p=>nearBody(pose,p.x,p.z,.36))
  let gap=wait?Math.max(0,distance(car,zone.point)-zone.stop):Infinity
  const probes=(turning||owned)&&obstacles.length?routeProbes(car,path):null
  let leading=Infinity,blocker=null
  for(const other of obstacles){
   const offset=localPoint(car,other.x,other.z)
   const headingDelta=angle(other.heading,car.heading)
   const c=Math.cos(headingDelta),s=Math.abs(Math.sin(headingDelta))
   const halfLength=(other.length*Math.abs(c)+other.width*s)*.5
   const headway=probes
    ?(probes.find(pose=>overlapsCar(pose,other))?.gap??Infinity)
    :offset.z<0&&Math.abs(offset.x)<(car.width+other.width)*.5+.19
     ?-offset.z-car.length*.5-halfLength-1.25:Infinity
   if(headway<gap){gap=headway;leading=Math.max(0,other.speed*c);blocker=other}

  }
  for(const person of nearby){
   const clearance=ahead(car,person,car.width*.5+.62)-car.length*.5-1.08
   if(clearance<gap){gap=clearance;leading=0;blocker=null}
  }
  const limit=Math.min(turning?3.75:car.setup.top,Math.sqrt((Number.isFinite(leading)?leading**2:0)+6*Math.max(0,gap-car.speed*.63)))
  const brake=car.speed>limit+.24||limit<.24
  unit.retry=Math.max(0,unit.retry-dt)
  unit.dependency=!wait&&limit<.65?blocker:null
  // Waiting at a stop line or behind an obstacle is not a failed maneuver.
  return {error,wait,owned,obstacles,nearby,blocked,brake,limit}
 }
 function cycleFrom(unit,byCar){
  const visited=[]
  for(let current=unit;current?.blocked>1.5||current?.dependency&&current.stopped>2;current=byCar.get(current.dependency)){
   const index=visited.indexOf(current)
   if(index!==-1)return visited.slice(index)
   visited.push(current)
  }
  return []
 }
 function selectRecovery(active,intents){
  if(recoveryOwner?.active&&(recoveryOwner.recover>0||recoveryOwner.car.speed<-.05))return
  recoveryOwner=null
  const byCar=new Map(active.map(unit=>[unit.car,unit]))
  const stalled=active.flatMap(unit=>cycleFrom(unit,byCar))
  const candidates=[...new Set([...stalled,...active.filter(unit=>unit.blocked>2.1)])]
   .filter(unit=>!unit.retry&&!intents.get(unit).wait)
   .sort((a,b)=>Number(intents.get(b).owned)-Number(intents.get(a).owned)||b.stopped-a.stopped||a.index-b.index)
  for(const unit of candidates){
   const {obstacles,nearby,error}=intents.get(unit)
   const steer=[-Math.sign(error)*.7,0].find(value=>canReverse(unit.car,obstacles,nearby,value))
   if(steer===undefined)continue
   recoveryOwner=unit;unit.recoverySteer=steer;unit.recover=1.15;unit.retry=5;unit.blocked=0
   break
  }
 }
 function drive(unit,dt,plan){
  const {car,path}=unit
  const {error,obstacles,nearby,blocked,brake,limit}=plan
  if(unit.recover>0){
   unit.recover=Math.max(0,unit.recover-dt)
   const rearClear=canReverse(car,obstacles,nearby,unit.recoverySteer)
   if(!rearClear)unit.recover=0
   stepDrive(car,{forward:0,back:rearClear&&unit.recover&&car.speed>-1.65?.72:0,steer:unit.recoverySteer,handbrake:!unit.recover},boxes,dt,obstacles,false,blocked)
   if(!unit.recover){
    const resume=path.findIndex(node=>!node.curve&&ahead(car,node,3.9)<8)
    if(resume>0)path.splice(0,resume)
   }
  }else stepDrive(car,{forward:brake?0:clamp((limit-car.speed)*.64,0,1),back:0,steer:clamp(error*2.25,-1,1),handbrake:brake||car.speed<-.05},
   boxes,dt,obstacles,false,blocked)
  unit.stopped=Math.abs(car.speed)<.18?unit.stopped+dt:0
  unit.blocked=!brake&&!unit.recover&&limit>1&&Math.abs(car.travel)<dt*.15?unit.blocked+dt:0
  unit.rig.updatePose({...car,dt})
  return Math.abs(car.travel)>.002
 }
 return {
  update(dt,player,{enabled,limit=units.length,walkers,inView=()=>false}){
   if(!enabled){units.forEach(remove);spawnClock=0;return false}
   spawnClock-=dt
   let moving=false
   const active=[]
   for(const unit of units){
    if(!unit.active)continue
    const range=distance(player,unit.car)
    if(!inView(unit.car)&&(range>despawnAt||range>32&&active.length>=limit)){
     remove(unit);moving=true;continue
    }
    if(unit.rig.driver)unit.rig.driver.visible=range<23
    prepare(unit)
    active.push(unit)
   }
   zones.forEach(updateZone)
   const intents=new Map(active.map(unit=>[unit,intent(unit,dt,walkers)]))
   selectRecovery(active,intents)
   for(const unit of active)moving=drive(unit,dt,intents.get(unit))||moving
   if(active.length<limit&&spawnClock<=0){
    spawnClock=2.3
    const unit=units.find(unit=>!unit.active)
    if(unit)moving=spawn(unit,player,walkers,inView)||moving
   }
   return moving
  },
  clear(){units.forEach(remove)}
 }
}
