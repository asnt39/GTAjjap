import {civilianEntries,civilianNext,civilianTurnarounds} from './police-road.js'
import {clearPose,localPoint,nearBody,newDrive,overlapsCar,stepDrive} from './driving.js'

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b))
const heading=node=>Math.atan2(node.dx,-node.dz)
const dockJunction={x:0,z:-37}
const spawnNear=25,spawnFar=92,despawnAt=108
// District controllers share a fleet and can meet on the same approach.
const flowByFleet=new WeakMap()

export function civilianTraffic(scene,boxes,traffic,rigs,{entries=civilianEntries,nextNode=civilianNext,junction=dockJunction,junctions=[],seeded=[],idPrefix='traffic',turnarounds=civilianTurnarounds,requireDriver=false,canEnter=()=>true}={}){
 const units=[...rigs.map(rig=>({rig})),...seeded].map(({rig,car:externalCar},index)=>{
  const setup={...rig.setup,top:8+(index%4)*.55,power:3.25,steer:.88,steerRate:3}
  const car=externalCar??Object.assign(newDrive(rig,setup),{id:idPrefix+'-'+index,localOnly:true})
  if(!externalCar){rig.root.visible=false;scene.add(rig.root)}
  return {rig,car,setup,external:!!externalCar,driver:rig.driver,active:false,path:[],turn:index,
   stopped:0,waiting:0,blocked:0,dependency:null,recover:0,retry:0,released:false}
 })
 const byVehicle=new Map(units.map(unit=>[unit.car,unit]))
 let flow=flowByFleet.get(traffic)
 if(!flow){flow={units:new Map(),zones:[],owner:null};flowByFleet.set(traffic,flow)}
 const {zones}=flow
 for(const unit of units){
  unit.canEnter=(point,approach)=>point.priority||canEnter(unit.car,point,approach)
  unit.tryAlternateExit=zone=>tryAlternateExit(unit,zone)
  flow.units.set(unit.car,unit)
 }
 function registerZone(point,entry,stop,inside,release){
  if(zones.some(zone=>zone.point.x===point.x&&zone.point.z===point.z))return
  zones.push({point,entry,stop,inside,release,owner:null,entered:false})
 }
 if(junction){
  registerZone(junction,17,13.2,9.8,10.9)
  for(const point of turnarounds)registerZone(point,15,10,6.8,8)
 }
 for(const point of junctions)registerZone(point,point.entry??16,point.stop??11.3,point.inside??8,point.release??9.5)
 let spawnClock=0,spawnCursor=0
 function remove(unit,claimed=false){
  if(!unit.active)return
  const at=traffic.indexOf(unit.car)
  if(at!==-1&&!claimed&&!unit.external)traffic.splice(at,1)
  unit.active=false
  if(!claimed&&!unit.external)unit.rig.root.visible=false
  if(unit.driver)unit.driver.visible=false
  if(unit.external)unit.car.speed=unit.car.throttle=unit.car.slip=unit.car.remainder=0
  for(const zone of zones)if(zone.owner===unit)reserveZone(zone,null)
  if(unit.passing||unit.yielding)endPass(unit.passing??unit.yielding)
  if(flow.owner===unit)flow.owner=null
 }
 function routeUnit(unit,node){
  Object.assign(unit,{path:[node],stopped:0,waiting:0,blocked:0,dependency:null,recover:0,retry:0,
   passing:null,yielding:null,plan:null,intentClock:0,active:true})
  if(unit.driver)unit.driver.visible=true
 }
 function seed(unit){
  if(requireDriver&&!unit.driver)return false
  const {car}=unit
  let best=null,bestCost=Infinity
  let nodeSet=entries
  // Include the next few lane nodes so parked vehicles can pull forward from
  // blocks whose nearest spawn marker happens to be behind them.
  nodeSet=nodeSet.flatMap(start=>{
   const route=[start]
   for(let i=0;i<4;i++)route.push(nextNode(route.at(-1),0))
   return route
  })
  for(const node of nodeSet){
   const p=localPoint(car,node.x,node.z),align=Math.cos(heading(node)-car.heading)
   if(p.z>-.9||Math.abs(p.x)>5||align<.84||distance(node,car)>58)continue
   const cost=-p.z+Math.abs(p.x)*2
   if(cost<bestCost){bestCost=cost;best=node}
  }
  if(!best)return false
  routeUnit(unit,best)
  return true
 }
 function spawn(unit,player,walkers,inView){
  if(requireDriver&&!unit.driver)return false
  for(let i=0;i<entries.length;i++){
   const node=entries[(spawnCursor+i)%entries.length]
   const range=distance(node,player)
   if(range<spawnNear||range>spawnFar||inView(node)&&range<72||zones.some(zone=>distance(node,zone.point)<zone.stop+1))continue
   const pose={...newDrive(unit.rig,unit.car.setup),travel:0,x:node.x,z:node.z,heading:heading(node)}
   if(!clearPose(pose,boxes)||traffic.some(other=>distance(other,pose)<9)||walkers.some(p=>nearBody(pose,p.x,p.z,.9)))continue
   Object.assign(unit.car,pose)
   routeUnit(unit,node)
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
 function zoneApproach(unit,zone){
  return unit.path.find(node=>zone.point.priority
   ?distance(node,zone.point)<zone.inside
   :node.curve&&distance(node,zone.point)<(zone.point.curve?5.5:7.5))
 }
 function reserved(unit,zone){
  return distance(unit.car,zone.point)<zone.entry&&zoneApproach(unit,zone)
 }
 function blockedExit(unit,approach,zone){
  let exit
  if(zone?.point.priority){
   const at=unit.path.indexOf(approach)
   exit=unit.path.slice(at+1).find(node=>distance(node,zone.point)>=zone.release)
  }else exit=exitFrom(approach)
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
 function tryAlternateExit(unit,zone){
  const at=unit.path.findIndex(node=>node.edges.length>1&&distance(node,zone.point)<10)
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
 function reserveZone(zone,owner,entered=false){
  if(zone.owner)zone.owner.intentClock=0
  if(owner)owner.intentClock=0
  zone.owner=owner;zone.entered=entered
 }
 function updateZone(zone){
  const {owner,point}=zone
  if(owner){
   const radius=distance(owner.car,point)
   zone.entered||=radius<zone.inside
   const approach=reserved(owner,zone)
   const permitted=owner.canEnter(point,approach)||radius<zone.stop-.45
   if(zone.entered?radius<zone.release+owner.car.length*.5:approach&&permitted&&!blockedExit(owner,approach,zone))return
   reserveZone(zone,null)
  }
  const queue=[]
  for(const unit of flow.units.values()){
   if(!unit.active)continue
   const radius=distance(unit.car,point)
   if(radius<zone.inside){reserveZone(zone,unit,true);return}
   if(radius>=zone.entry||unit.recover)continue
   const approach=zoneApproach(unit,zone)
   if(approach&&unit.canEnter(point,approach))queue.push({unit,radius,approach})
  }
  queue.sort((a,b)=>b.unit.waiting-a.unit.waiting||a.radius-b.radius||String(a.unit.car.id).localeCompare(String(b.unit.car.id)))
  const next=queue.find(({unit,approach})=>!blockedExit(unit,approach,zone)||
   !point.curve&&!point.priority&&unit.waiting>2&&unit.tryAlternateExit(zone))
  if(next)reserveZone(zone,next.unit)
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
 function passAround(passer,yielder){
  const {car,plan}=passer,other=yielder.car
  if(Math.cos(car.heading-other.heading)>-.78)return null
  const dx=Math.sin(car.heading),dz=-Math.cos(car.heading)
  const lateral=(car.width+other.width)*.5+1.23
  for(const side of [1,-1]){
   const x=other.x-dz*side*lateral,z=other.z+dx*side*lateral
   const free=[-4,-2,0,2,4].every(distance=>{
    const probe={...car,x:x+dx*distance,z:z+dz*distance}
    return clearPose(probe,boxes)&&!plan.obstacles.some(v=>overlapsCar(probe,v))&&
     !plan.nearby.some(p=>nearBody(probe,p.x,p.z,.48))
   })
   if(free)return {x,z,dx,dz,passer,yielder,time:9}
  }
  return null
 }
 function endPass(pass){pass.passer.passing=pass.yielder.yielding=null}
 function intent(unit,dt,walkers){
  const {car,path}=unit
  let look=path.find(node=>distance(car,node)>2.2+car.speed*.22)??path.at(-1)
  const pass=unit.passing
  if(pass){
   const other=pass.yielder.car
   const ahead=(car.x-other.x)*pass.dx+(car.z-other.z)*pass.dz
   pass.time-=dt
   if(pass.time<=0||ahead>(car.length+other.length)*.5+.65)endPass(pass)
   else{
    const along=(car.x-pass.x)*pass.dx+(car.z-pass.z)*pass.dz+3.2
    look={x:pass.x+pass.dx*along,z:pass.z+pass.dz*along}
   }
  }
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
  const probes=(turning||owned||unit.passing)&&obstacles.length?routeProbes(car,unit.passing?[look]:path):null
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
  const limit=Math.min(turning||unit.passing?3.75:unit.setup.top,Math.sqrt((Number.isFinite(leading)?leading**2:0)+6*Math.max(0,gap-car.speed*.63)))
  const brake=car.speed>limit+.24||limit<.24
  unit.retry=Math.max(0,unit.retry-dt)
  // Only a nearer vehicle sets blocker. A red signal alone cannot create a cycle.
  unit.dependency=limit<.65?blocker:null
  return {error,wait,owned,obstacles,nearby,blocked,brake,limit}
 }
 function cycleFrom(unit){
  const visited=[]
  for(let current=unit;current?.active&&current.dependency&&current.stopped>2;current=flow.units.get(current.dependency)){
   const index=visited.indexOf(current)
   if(index!==-1)return visited.slice(index)
   visited.push(current)
  }
  return []
 }
 function selectRecovery(active){
  if(flow.owner?.active&&(flow.owner.recover>0||flow.owner.car.speed<-.05))return
  flow.owner=null
  const cycle=new Set(active.flatMap(cycleFrom))
  const candidates=[...new Set([...cycle,...active.filter(unit=>unit.blocked>2.1&&!unit.plan.wait)])]
   .filter(unit=>!unit.retry&&unit.plan&&!unit.passing&&!unit.yielding)
   .sort((a,b)=>Number(b.plan.owned)-Number(a.plan.owned)||b.stopped-a.stopped||String(a.car.id).localeCompare(String(b.car.id)))
  for(const unit of candidates){
   const {obstacles,nearby,error}=unit.plan
   const other=unit.dependency,offset=other?localPoint(unit.car,other.x,other.z).x:0
   const turn=(Math.sign(offset)||Math.sign(error)||1)*-.7
   const steer=[turn,-turn,0].find(value=>canReverse(unit.car,obstacles,nearby,value))
   if(steer===undefined)continue
   flow.owner=unit;unit.recoverySteer=steer;unit.recover=cycle.has(unit)?2.25:1.15;unit.retry=5;unit.blocked=0
   const passer=flow.units.get(unit.dependency)
   if(cycle.has(unit)&&passer?.plan&&!passer.passing&&!passer.yielding){
    const pass=passAround(passer,unit)
    if(pass){unit.yielding=pass;passer.passing=pass;passer.intentClock=0}
   }
   break
  }
 }
 function drive(unit,dt,plan){
  const {car,path}=unit
  const {error,obstacles,nearby,blocked,limit}=plan
  const brake=plan.brake||!!unit.yielding
  if(unit.recover>0){
   unit.recover=Math.max(0,unit.recover-dt)
   const rearClear=canReverse(car,obstacles,nearby,unit.recoverySteer)
   if(!rearClear)unit.recover=0
   stepDrive(car,{forward:0,back:rearClear&&unit.recover&&car.speed>-1.65?.72:0,steer:unit.recoverySteer,handbrake:!unit.recover},boxes,dt,traffic,false,blocked)
   if(!unit.recover){
    const resume=path.findIndex(node=>!node.curve&&ahead(car,node,3.9)<8)
    if(resume>0)path.splice(0,resume)
   }
  }else stepDrive(car,{forward:brake?0:clamp((limit-car.speed)*.64,0,1),back:0,steer:clamp(error*2.25,-1,1),handbrake:brake||car.speed<-.05},
   boxes,dt,traffic,false,blocked)
  unit.stopped=Math.abs(car.speed)<.18?unit.stopped+dt:0
  unit.blocked=!brake&&!unit.recover&&limit>1&&Math.abs(car.travel)<dt*.15?unit.blocked+dt:0
  if(!unit.external)unit.rig.updatePose({...car,dt})
  return Math.abs(car.travel)>.002
 }
 return {
  savedUnit(id){return units.find(unit=>!unit.external&&unit.car.id===id)},
  reserve(unit){if(unit&&!unit.active&&!unit.external){unit.released=true;unit.rig.root.visible=true}},
  driverFor(car){const unit=byVehicle.get(car);return unit&&(unit.active||unit.parkedDriver)?unit:null},
  retire(car){const unit=byVehicle.get(car);if(unit){remove(unit);unit.released=true}},
  claim(car){
   const unit=byVehicle.get(car)
   if(!unit||!unit.active&&!unit.parkedDriver)return null
   remove(unit,true);unit.released=true;unit.parkedDriver=false
   if(unit.driver)unit.driver.visible=false
   return unit
  },
  update(dt,player,{enabled,limit=units.length,walkers,inView=()=>false}){
   if(!enabled){this.clear();return false}
   spawnClock-=dt
   let moving=false
   const active=[]
   for(const unit of units){
    const range=distance(player,unit.car)
    if(!unit.active){
     unit.parkedDriver=unit.external&&!unit.released&&(!requireDriver||!!unit.driver)
     if(unit.parkedDriver&&unit.driver)unit.driver.visible=range<26
     continue
    }
    if(!unit.external&&!inView(unit.car)&&(range>despawnAt||range>32&&active.length>=limit)){
     remove(unit);moving=true;continue
    }
    if(unit.driver)unit.driver.visible=range<26
    prepare(unit)
    active.push(unit)
   }
   if(active.length<limit&&spawnClock<=0){
    const unit=units.find(unit=>!unit.active&&!unit.released&&unit.external&&distance(unit.car,player)<75)
    if(unit&&seed(unit)){spawnClock=1;prepare(unit);active.push(unit)}
   }
   zones.forEach(updateZone)
   const intents=new Map(active.map(unit=>{
    const interval=distance(unit.car,player)<38?0:.095
    unit.intentClock=(unit.intentClock??0)-dt
    if(!unit.plan||unit.intentClock<=0){unit.plan=intent(unit,Math.max(dt,interval),walkers);unit.intentClock=interval}
    return [unit,unit.plan]
   }))
   selectRecovery(active)
   for(const unit of active)moving=drive(unit,dt,intents.get(unit))||moving
   if(active.length<limit&&spawnClock<=0){
    spawnClock=2.3
    const unit=units.find(unit=>!unit.active&&!unit.external&&!unit.released)
    if(unit)moving=spawn(unit,player,walkers,inView)||moving
   }
   return moving
  },
  clear(){
   spawnClock=0
   for(const unit of units){
    remove(unit)
    if(unit.parkedDriver&&unit.driver)unit.driver.visible=false
    unit.parkedDriver=false
   }
  }
 }
}
