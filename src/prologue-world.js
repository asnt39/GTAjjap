import {BoxGeometry,ConeGeometry,Group,Mesh,MeshBasicMaterial,MeshStandardMaterial,Vector3} from 'three'
import {createCharacter} from './character.js'
import {clearPose,nearBody,newDrive,overlapsCar,resetVehicleGround} from './driving.js'
import {advance,combatPose,fighter,injure} from './melee.js'
import {moveImpact} from './impact-motion.js'
import {cameraFraction,canWalk,movePlayer} from './navigation.js'
import {policeFire} from './police-fire.js'
import {pursuitEntry,pursuitRoadNetwork,roadDriver} from './police-road.js'
import {cargoManifest,detention,extraction,worksRear} from './prologue-plan.js'

const encounters={
 quay:[
  {start:{x:15.8,z:-54.7},delay:1.45,role:'press',approach:[{x:15.8,z:-47.9},{x:14.2,z:-41.4}]},
  {start:{x:16.1,z:-14.1},delay:4.1,role:'flank',approach:[{x:15,z:-19.7},{x:13.8,z:-25.6}]},
  {start:{x:11.25,z:-53.8},delay:6.5,role:'hold',approach:[{x:11.2,z:-47.5},{x:11.3,z:-38.0}]}
 ],
 hall:[
  {start:{x:-126.9,z:33.7},delay:.25,role:'press'},
  {start:{x:-132.9,z:39.95},delay:1.6,role:'hold'},
  {start:{x:-122.3,z:46.3},delay:3.2,role:'flank',approach:[{x:-124.5,z:40.9}]}
 ],
 prisoner:[{start:detention}],
 extraction:[{start:detention},
  {start:{x:-116.8,z:36.3},delay:1.65,role:'press'},
  {start:{x:-121.2,z:33.1},delay:3.6,role:'flank'}]
}
const waypoints=[
 {x:-126.8,z:46.33},{x:-127.5,z:42.25},{x:-127.7,z:39.6},{x:-124.5,z:40.9},
 {x:-121.3,z:worksRear.z},{x:-120.55,z:worksRear.z},{x:-117.1,z:worksRear.z},
 {x:-129.05,z:31.0},{x:-129.05,z:28.0},{x:-121.2,z:27.9},{x:-117.2,z:30.3},
 {x:-116.0,z:47.6},extraction
]
const range=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a))
const disabled=car=>Object.values(car.dents??{}).reduce((sum,dent)=>sum+dent.depth,0)>=.60
const quayLegs=[{x:12.2,z:-44.7},{x:12.1,z:-38.5},{x:13.7,z:-36},{x:15.4,z:-30.1},{x:12.1,z:-28.6}]
const manifestTime=2.2
const hostilePin=new ConeGeometry(.107,.17,4).rotateZ(Math.PI)
const hostileRed=new MeshBasicMaterial({color:0xda3e49,toneMapped:false})
function nextLeg(from,to,clear,paths){
 if(clear(from,to))return to
 const points=[from,...paths,to],last=points.length-1,queue=[0],previous=new Map([[0,-1]])
 for(let at=0;at<queue.length;at++){
  const current=queue[at]
  for(let i=1;i<points.length;i++){
   if(previous.has(i)||!clear(points[current],points[i]))continue
   previous.set(i,current)
   if(i===last){
    let next=i
    while(previous.get(next)!==0)next=previous.get(next)
    return points[next]
   }
   queue.push(i)
  }
 }
 // Closed doors open for the approaching resident via the existing animated door system.
 return paths.filter(point=>clear(from,point)).sort((a,b)=>range(a,to)-range(b,to))[0]??null
}
export const escortLeg=(from,to,clear)=>nextLeg(from,to,clear,waypoints)

function manifestProp(){
 const folder=new Group(),box=new BoxGeometry()
 folder.name='Quay Transfer cargo manifest'
 folder.position.set(cargoManifest.x,cargoManifest.y,cargoManifest.z)
 folder.rotation.y=-.20
 function part(color,x,y,z,w,h,d){
  const mesh=new Mesh(box,new MeshStandardMaterial({color,roughness:.86}))
  mesh.position.set(x,y,z);mesh.scale.set(w,h,d);folder.add(mesh)
 }
 part(0x8d5c32,0,0,0,.33,.035,.43)
 part(0xffe6bc,.012,.024,.008,.253,.019,.364)
 part(0x475a65,0,.038,-.13,.12,.024,.046)
 return folder
}

export function prologueWorld({scene,boxes,crowd,traffic,rigs,height,combat,notify,inView=()=>false}){
 const gunfire=policeFire(boxes,traffic,crowd.all,n=>n.missionRole==='hostile')
 const origin=new Vector3(),destination=new Vector3()
 let current=null,actors=[],loaded=false,engagement=0,pursuitCars=[],run=0,unseen=0,traveled=0,position=null
 let network,lastSeen,manifest,manifestSearch=null,manifestTaken=false
 function clean(){
  for(const n of actors){
   const i=crowd.all.indexOf(n);if(i>=0)crowd.all.splice(i,1)
   n.rig.root.removeFromParent();n.rig.dispose()
  }
  for(const item of pursuitCars){
   const i=traffic.indexOf(item.car);if(i>=0)traffic.splice(i,1)
   item.rig.root.removeFromParent()
   item.rig.updatePose({...item.car,dents:null,dt:0})
  }
  manifest?.removeFromParent()
  manifestSearch=lastSeen=position=current=null
  actors=[];pursuitCars=[];engagement=traveled=unseen=0;loaded=manifestTaken=false;run++
 }
 function enter(stage){
  clean()
  current=stage?.set??null
  if(!current||current==='pursuit'){loaded=true;return}
  if(current==='quay'){
   manifest??=manifestProp()
   scene.add(manifest)
  }
  const token=run
  const setting=current
  const spawns=encounters[setting]
  Promise.allSettled(spawns.map(({start},i)=>createCharacter({model:start===detention?'mariner':'resident',variant:[6,7,4][i]})))
   .then(results=>{
    if(token!==run){for(const r of results)if(r.status==='fulfilled')r.value.dispose();return}
    if(results.some(r=>r.status==='rejected')){
     for(const r of results)if(r.status==='fulfilled')r.value.dispose()
     notify('임무 인물을 불러오지 못했습니다. 수첩에서 다시 시도하십시오.',true)
     return
    }
    actors=results.map(({value:rig},i)=>{
     const {start:point,delay=0,role,approach=[]}=spawns[i],friendly=point===detention
     const pos=new Vector3(point.x,height(point.x,point.z),point.z)
     const actor={id:friendly?'wrong-deal-theo':setting+'-'+i,name:friendly?'Theo Mercer':'조직원',
      height:1.77,stagger:.20+i*.10,missionRole:friendly?'escort':'hostile',pos,rig,f:fighter(friendly?130:58),
      face:i===0?Math.PI:0,stepping:0,speed:0,replan:0,leg:null,delay,role,approach,waypoint:0,joined:false}
     if(!friendly){
      actor.pin=new Mesh(hostilePin,hostileRed)
      actor.pin.position.y=2.10;actor.pin.visible=false;rig.root.add(actor.pin)
     }
     rig.root.name='Wrong Deal · '+actor.id
     return actor
    })
    gunfire.escalate()
    loaded=true
   })
 }
 function line(a,b){
  const samples=Math.ceil(range(a,b)/.35)
  for(let i=1;i<=samples;i++){
   const t=i/samples,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t
   if(!canWalk(x,z,boxes,.32,a.y??.083)||traffic.some(car=>nearBody(car,x,z)))return false
  }
  return true
 }
 function nearManifest(pos){
  if((pos.y??0)>1.2||range(pos,cargoManifest)>cargoManifest.radius)return false
  origin.set(pos.x,(pos.y??0)+1.31,pos.z)
  destination.set(cargoManifest.x,cargoManifest.y+.19,cargoManifest.z)
  return cameraFraction(origin,destination,boxes)>.91
 }
 function hostileLeg(n,target,aiming,distance){
  const paths=current==='quay'?quayLegs:waypoints
  const entry=n.approach[n.waypoint]
  if(entry&&range(n.pos,entry)<.85)n.waypoint++
  if(n.approach[n.waypoint])return nextLeg(n.pos,n.approach[n.waypoint],line,paths)
  if(n.role==='hold'||aiming||distance<5.8||distance>35)return null
  if(n.role==='flank'){
   const dx=(target.x-n.pos.x)/distance,dz=(target.z-n.pos.z)/distance
   for(const side of [1,-1]){
    const flank={x:target.x-dx*6-dz*4*side,z:target.z-dz*6+dx*4*side}
    if(range(n.pos,flank)>1.4&&canWalk(flank.x,flank.z,boxes,.32,n.pos.y)&&line(n.pos,flank))return flank
   }
  }
  return nextLeg(n.pos,target,line,paths)
 }
 function stepActors(dt,player,onFoot){
  gunfire.update(dt,1)
  if(loaded)engagement+=dt
  if(manifestSearch!==null){
   if(!onFoot||!nearManifest(player.pos)||player.f.action)manifestSearch=null
   else if((manifestSearch+=dt)>=manifestTime){
    manifestTaken=true;manifestSearch=null;manifest.removeFromParent()
   }
  }
  const escort=actors.find(n=>n.missionRole==='escort')
  for(const n of actors){
   const friendly=n.missionRole==='escort'
   if(!n.joined){
    if(engagement<n.delay)continue
    n.joined=true
    n.rig.root.position.copy(n.pos);n.rig.root.rotation.y=n.face
    scene.add(n.rig.root);crowd.all.push(n)
   }
   advance(n.f,dt)
   const lift=moveImpact(n.f,n.pos,dt,boxes,(x,z)=>crowd.blockedBy(n,x,z))
   const d=range(n.pos,player.pos)
   const target=friendly||!escort||!escort.f.hp||d<8?player:{pos:escort.pos,exposed:true,inVehicle:null}
   const targetGap=range(n.pos,target.pos)
   const lineOfSight=!friendly&&n.f.hp>0&&engagement>n.delay+.55&&gunfire.aim(n,target,targetGap)
   n.replan-=dt
   if(n.f.action||!n.f.hp||friendly&&(current!=='extraction'||d<1.75||!onFoot))n.leg=null
   else if(n.replan<=0){
    n.leg=friendly?escortLeg(n.pos,player.pos,line):hostileLeg(n,target.pos,lineOfSight,targetGap)
    n.replan=.25+n.stagger*.27
   }
   const at=n.leg,len=at?range(n.pos,at):0
   const point=at&&len>.38?at:target.pos
   const turn=Math.atan2(point.x-n.pos.x,point.z-n.pos.z)
   n.face+=angle(n.face,turn)*(1-Math.exp(-dt*9))
   const x=n.pos.x,z=n.pos.z
   if(at&&len>.38){
    const pace=friendly?2.77:n.role==='press'?3.35:n.role==='flank'?2.64:1.9
    const step=Math.min(dt*pace,len-.25)
    movePlayer(n.pos,(at.x-x)*step/len,(at.z-z)*step/len,boxes,
     (a,b)=>range({x:a,z:b},player.pos)<.62||crowd.blockedBy(n,a,b)||traffic.some(car=>nearBody(car,a,b)),n.pos.y)
   }
   n.pos.y=height(n.pos.x,n.pos.z)
   n.speed=n.stepping=range(n.pos,{x,z})/Math.max(dt,.001)
   n.rig.root.position.copy(n.pos);n.rig.root.position.y+=lift;n.rig.root.rotation.y=n.face
   n.rig.update(dt,n.stepping,combatPose(n.f))
   if(n.pin)n.pin.visible=!!n.f.hp&&(lineOfSight||n.waypoint===n.approach.length&&d<13)
   if(!friendly)gunfire.pose(n,target,dt,lineOfSight&&n.speed<2.7,(shooter,from,to)=>{
    if(target===player)combat(shooter,from,to,true)
    else{combat(shooter,from,to,false);injure(escort.f,8,1,'body',{weaponHit:true})}
   })
  }
  const guards=actors.filter(n=>n.missionRole==='hostile')
  const threats=guards.filter(n=>n.joined&&n.f.hp>0).length
  return {cleared:current==='quay'?manifestTaken:loaded&&guards.length>0&&guards.every(n=>!n.f.hp),
   rescued:!!escort&&escort.f.hp>0&&range(escort.pos,extraction)<extraction.radius+1,
   failed:!!escort&&!escort.f.hp,escortHealth:escort?.f.hp,threats,
   objectiveStatus:manifestSearch===null?'':'명세서 확인 중'}
 }
 function stepPursuit(dt,player,driving){
  if(!pursuitCars.length){
   network??=pursuitRoadNetwork()
   pursuitCars=[{wait:1.8,offset:32,top:19.2},{wait:5.8,offset:43,top:17.8}].map(({wait,offset,top},i)=>{
    const rig=rigs.civilianRig(i?2:0),setup={...rig.setup,top:24,power:7,brake:10.1}
    const car=Object.assign(newDrive(rig,setup),{localOnly:true})
    return {rig,car,wait,offset,joinedAt:null,driver:roadDriver(car,{network,top})}
   })
  }
  if(driving){
   engagement+=dt
   const target=player.inVehicle
   for(const [index,item] of pursuitCars.entries()){
    const lead=pursuitCars[0].joinedAt
    if(item.joinedAt!==null||engagement<item.wait||index&&(lead===null||engagement-lead<3.8))continue
    const {car,rig}=item
    item.wait=engagement+.45
    const entry=pursuitEntry(network,target,item.offset,pose=>{
     const placed={...car,...pose}
     if(!clearPose(placed,boxes)||overlapsCar(placed,target)||traffic.some(other=>overlapsCar(placed,other)))return false
     if(!inView(pose))return true
     origin.set(player.pos.x,player.pos.y+1.35,player.pos.z);destination.set(pose.x,1.18,pose.z)
     return cameraFraction(origin,destination,boxes)<.86
    })
    if(!entry)continue
    Object.assign(car,entry,{speed:6.2});resetVehicleGround(car)
    item.joinedAt=engagement
    traffic.push(car);scene.add(rig.root)
    lastSeen={x:target.x,z:target.z,heading:target.heading}
   }
  }
  const following=pursuitCars.filter(item=>item.joinedAt!==null&&!disabled(item.car))
  const seen=following.some(({car})=>{
   const distance=range(car,player.pos)
   origin.set(car.x,(car.lift??0)+1.25,car.z);destination.copy(player.pos);destination.y+=1.17
   return distance<46&&cameraFraction(origin,destination,boxes)>.91
  })
  if(seen)lastSeen={x:player.pos.x,z:player.pos.z,heading:player.inVehicle?.heading??lastSeen?.heading??0}
  for(const {car,rig,driver,joinedAt} of pursuitCars){
   if(joinedAt===null)continue
   if(!disabled(car))driver.step(dt,boxes,traffic,lastSeen,{follow:true})
   else car.speed=0
   rig.updatePose({...car,dt})
  }
  if(position&&driving&&lastSeen)traveled+=Math.min(2,range(position,player.pos))
  position={x:player.pos.x,z:player.pos.z}
  const wrecked=pursuitCars.every(item=>item.joinedAt!==null&&disabled(item.car))
  unseen=driving&&!seen&&(traveled>65||wrecked)&&lastSeen?unseen+dt:0
  return {evaded:unseen>=5.4,threats:following.length,objectiveStatus:unseen>0?'시야를 벗어나는 중':''}
 }
 return {
  enter,clean,
  interaction(stage,pos){
   if(stage?.set!=='quay'||current!=='quay'||!loaded||manifestTaken||manifestSearch!==null||!nearManifest(pos))return null
   return {id:'cargo-manifest',label:'화물 명세서 확인',x:cargoManifest.x,z:cargoManifest.z,activate(){
    manifestSearch=0
    return {message:'명세서를 확인하는 동안 상자 곁에 머무르세요.'}
   }}
  },
  markers(){
   const markers=[]
   for(const n of actors)if(n.joined&&n.missionRole==='hostile'&&n.f.hp>0)markers.push({x:n.pos.x,z:n.pos.z})
   for(const item of pursuitCars)if(item.joinedAt!==null&&!disabled(item.car))markers.push({x:item.car.x,z:item.car.z})
   return markers
  },
  step(stage,dt,player,onFoot,driving){
   if((stage?.set??null)!==current&&(!current||stage?.carry!==current))enter(stage)
   if(!current)return {}
   if(current==='pursuit')return stepPursuit(dt,player,driving)
   return stepActors(dt,player,onFoot)
  }
 }
}
