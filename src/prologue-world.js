import {Vector3} from 'three'
import {createCharacter} from './character.js'
import {clearPose,newDrive,overlapsCar} from './driving.js'
import {advance,combatPose,fighter,injure} from './melee.js'
import {moveImpact} from './impact-motion.js'
import {cameraFraction,canWalk,movePlayer} from './navigation.js'
import {policeFire} from './police-fire.js'
import {pursuitRoadNetwork,roadDriver} from './police-road.js'
import {detention,extraction,worksRear} from './prologue-plan.js'

const encounters={
 quay:[
  {x:14.1,z:-26.85},{x:14.6,z:-43.8},{x:11.0,z:-40.7}
 ],
 hall:[
  {x:-126.9,z:33.7},{x:-132.9,z:39.95},{x:-122.3,z:46.3}
 ],
 prisoner:[detention],
 extraction:[detention,{x:-116.8,z:36.3},{x:-121.2,z:33.1}]
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
export function escortLeg(from,to,clear){
 if(clear(from,to))return to
 const points=[from,...waypoints,to],last=points.length-1,queue=[0],previous=new Map([[0,-1]])
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
 return waypoints.filter(point=>clear(from,point)).sort((a,b)=>range(a,to)-range(b,to))[0]??null
}

export function prologueWorld({scene,boxes,crowd,traffic,rigs,height,combat,notify}){
 const gunfire=policeFire(boxes,traffic,crowd.all,n=>n.missionRole==='hostile')
 const origin=new Vector3(),destination=new Vector3()
 let current=null,actors=[],loaded=false,engagement=0,pursuitCars=[],run=0,unseen=0,traveled=0,position=null
 let network
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
  actors=[];pursuitCars=[];engagement=0;position=null;traveled=unseen=0;loaded=false;run++
 }
 function enter(stage){
  current=stage?.set??null
  clean()
  if(!current||current==='pursuit'){loaded=true;return}
  const token=run
  const setting=current
  const spawns=encounters[setting]
  Promise.allSettled(spawns.map((point,i)=>createCharacter({model:i===0&&point===detention?'mariner':'resident',variant:[6,7,4][i]})))
   .then(results=>{
    if(token!==run){for(const r of results)if(r.status==='fulfilled')r.value.dispose();return}
    if(results.some(r=>r.status==='rejected')){
     for(const r of results)if(r.status==='fulfilled')r.value.dispose()
     notify('임무 인물을 불러오지 못했습니다. 수첩에서 다시 시도하십시오.',true)
     return
    }
    actors=results.map(({value:rig},i)=>{
     const point=spawns[i],friendly=point===detention
     const pos=new Vector3(point.x,height(point.x,point.z),point.z)
     const actor={id:friendly?'wrong-deal-theo':setting+'-'+i,name:friendly?'Theo Mercer':'추격 조직원',
      height:1.77,stagger:.20+i*.10,missionRole:friendly?'escort':'hostile',pos,rig,f:fighter(friendly?130:58),
      face:i===0?Math.PI:0,stepping:0,speed:0,replan:0,leg:null}
     rig.root.name='Wrong Deal · '+actor.id
     rig.root.position.copy(pos);rig.root.rotation.y=actor.face;scene.add(rig.root);crowd.all.push(actor)
     return actor
    })
    gunfire.escalate()
    loaded=true
   })
 }
 function line(a,b,slack=0){
  const samples=Math.ceil(range(a,b)/.35)
  for(let i=1;i<samples;i++){
   const t=i/samples,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t
   if(!canWalk(x,z,boxes,.30,(a.y??.083)+slack))return false
  }
  return true
 }
 function stepActors(dt,player,onFoot){
  gunfire.update(dt,1)
  engagement+=dt
  const escort=actors.find(n=>n.missionRole==='escort')
  const pace=2.77
  for(const n of actors){
   const friendly=n.missionRole==='escort'
   advance(n.f,dt)
   const lift=moveImpact(n.f,n.pos,dt,boxes,(x,z)=>crowd.blockedBy(n,x,z))
   const d=range(n.pos,player.pos)
   const target=friendly||!escort||!escort.f.hp||d<8?player:{pos:escort.pos,exposed:true,inVehicle:null}
   const lineOfSight=!friendly&&engagement>.65&&gunfire.aim(n,target,range(n.pos,target.pos))
   n.replan-=dt
   if(!n.f.action&&n.f.hp&&friendly&&current==='extraction'&&d>1.75&&onFoot){
    if(n.replan<=0){n.leg=escortLeg(n.pos,player.pos,line);n.replan=.23}
   }else if(!n.f.action&&n.f.hp&&!friendly&&engagement>1.2&&d<20&&!lineOfSight&&d>4&&line(n.pos,player.pos)){
    n.leg=player.pos
   }else n.leg=null
   const at=n.leg,len=at?range(n.pos,at):0
   const point=at&&len>.38?at:target.pos
   const turn=Math.atan2(point.x-n.pos.x,point.z-n.pos.z)
   n.face+=angle(n.face,turn)*(1-Math.exp(-dt*9))
   const x=n.pos.x,z=n.pos.z
   if(at&&len>.38){
    const step=Math.min(dt*(friendly?pace:1.75),len-.25)
    movePlayer(n.pos,(at.x-x)*step/len,(at.z-z)*step/len,boxes,
     (a,b)=>range({x:a,z:b},player.pos)<.62||crowd.blockedBy(n,a,b),n.pos.y)
   }
   n.pos.y=height(n.pos.x,n.pos.z)
   n.speed=n.stepping=range(n.pos,{x,z})/Math.max(dt,.001)
   n.rig.root.position.copy(n.pos);n.rig.root.position.y+=lift;n.rig.root.rotation.y=n.face
   n.rig.update(dt,n.stepping,combatPose(n.f))
   if(!friendly)gunfire.pose(n,target,dt,lineOfSight,(shooter,from,to)=>{
    if(target===player)combat(shooter,from,to,true)
    else{combat(shooter,from,to,false);injure(escort.f,8,1,'body',{weaponHit:true})}
   })
  }
  const guards=actors.filter(n=>n.missionRole==='hostile')
  const threats=guards.filter(n=>n.f.hp>0).length
  return {cleared:loaded&&guards.length>0&&!threats,rescued:!!escort&&escort.f.hp>0&&range(escort.pos,extraction)<extraction.radius+1,
   failed:!!escort&&!escort.f.hp,escortHealth:escort?.f.hp,threats}
 }
 function stepPursuit(dt,player,driving){
  if(!pursuitCars.length){
   network??=pursuitRoadNetwork()
   pursuitCars=[-63,-76].map((z,i)=>{
    const rig=rigs.civilianRig(i?2:0),setup={...rig.setup,top:19.8,power:4.8,brake:10.1}
    const car=Object.assign(newDrive(rig,setup),{x:-1.47,z,heading:Math.PI,localOnly:true})
    return {rig,car,active:false,joined:false,driver:roadDriver(car,{network,top:15.2})}
   })
  }
  for(const item of pursuitCars){
   const {car,rig}=item
   if(!item.joined&&driving&&range(player.pos,car)>19&&clearPose(car,boxes)&&!traffic.some(other=>overlapsCar(car,other))){
    item.joined=item.active=true;traffic.push(car);scene.add(rig.root)
   }
   if(!item.active)continue
   if(!disabled(car))item.driver.step(dt,boxes,traffic,player.inVehicle??player.pos,{follow:true})
   else car.speed=0
   rig.updatePose({...car,dt})
  }
  if(position&&driving)traveled+=Math.min(2,range(position,player.pos))
  position={x:player.pos.x,z:player.pos.z}
  const following=pursuitCars.filter(item=>item.active&&!disabled(item.car))
  const seen=following.some(({car})=>{
   const distance=range(car,player.pos)
   origin.set(car.x,1.2,car.z);destination.copy(player.pos);destination.y+=1.15
   return distance<19||distance<43&&cameraFraction(origin,destination,boxes)>.91
  })
  unseen=driving&&!seen&&traveled>80&&pursuitCars.some(item=>item.joined)?unseen+dt:0
  return {evaded:unseen>=5.4,threats:following.length}
 }
 return {
  enter,clean,
  step(stage,dt,player,onFoot,driving){
   if((stage?.set??null)!==current)enter(stage)
   if(!current)return {}
   if(current==='pursuit')return stepPursuit(dt,player,driving)
   return stepActors(dt,player,onFoot)
  }
 }
}
