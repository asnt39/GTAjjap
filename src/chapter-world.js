import {Vector3} from 'three'
import {createCharacter} from './character.js'
import {createCompanion} from './companion.js'
import {combatPose,fighter} from './melee.js'
import {cameraFraction,canWalk,movePlayer} from './navigation.js'
import {missionActorSnapshot,restoreMissionActor,missionVehicleSnapshot,restoreMissionVehicle} from './mission-checkpoint.js'
import {parking,parkingLevel,workshop} from './chapter-sites.js'
import {chapterRoadRoute} from './chapter-route.js'
import {newDrive,resetVehicleGround,worldPoint} from './driving.js'
import {clubFire} from './new-blood-fire.js'
import {missionEnemyOutline} from './mission-enemy-outline.js'

const range=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const mainNames={
 Maya:{model:'crew',variant:6,role:'차량 전문가',line:'길은 내가 봐 둘게. 네가 할 일에 집중해.'},
 Jack:{model:'mariner',variant:2,role:'현장 연락책',line:'괜찮아. 오늘은 기왕이면 조용히 끝내자.'},
 Theo:{model:'mariner',variant:4,role:'항만 배선 담당',line:'조류 표를 봤어. 안쪽 물길이 비는 때를 알려 줄게.'},
 Leon:{model:'patrol',variant:8,role:'현장 지원',line:'뒤는 내가 본다. 사람부터 챙겨.'},
 Adrian:{model:'mariner',variant:5,role:'운송권 책임자',line:'운송 계약은 사라지지 않습니다. 서명하는 사람이 바뀔 뿐이지.'},
 Victor:{model:'resident',variant:3,role:'항만 사업 책임자',line:'일은 끝까지 처리해. 약속한 몫은 내가 책임진다.'}
}

export function chapterWorld({scene,boxes,crowd,traffic,rigs,floorAt,combat,notify,registerVehicle,unregisterVehicle}){
 const actors=[],fire=clubFire(boxes,traffic,crowd.all)
 const getaway=chapterRoadRoute(parking.getaway)
 let stage=null,generation=0,ready=true,elapsed=0,interacted=false,signals={},currentPlayer=null
 let target=null,targetRig=null,recoveryCar=null,recoveryRig=null,chaseDistance=0,pressure=0,chaseWait=0,secured=false

 function removeVehicle(){
  if(!target)return
  unregisterVehicle(target);targetRig.dispose?.();targetRig.root.removeFromParent()
  target=targetRig=null
 }
 function releaseRecoveryCar(){
  if(!recoveryCar)return
  unregisterVehicle(recoveryCar);recoveryRig.root.removeFromParent()
  recoveryRig.dispose?.()
  recoveryRig=recoveryCar=null
 }
 function releaseActors(){
  generation++
  fire.reset()
  for(const npc of actors){
   const index=crowd.all.indexOf(npc)
   if(index>=0)crowd.all.splice(index,1)
   npc.outline?.dispose();npc.rig.root.removeFromParent();npc.rig.dispose()
  }
  actors.length=0;ready=true
 }
 function addActor(spec,token,index){
  const {name,point,side='ally',health=110}=spec
  const person=mainNames[name]??{model:'patrol',variant:spec.variant??2,role:side==='hostile'?'Adrian의 조직원':'운송업자',line:''}
  return createCharacter({model:person.model,variant:person.variant}).then(rig=>{
   if(token!==generation){rig.dispose();return}
   const pos=new Vector3(point.x,point.y??.083,point.z)
   const npc={id:spec.id??'chapter-'+name.toLowerCase(),name,role:person.role,lines:[person.line],height:1.77,pos,rig,
    f:fighter(health),missionRole:side,face:0,joined:true,speed:0,stepping:0,stagger:index,
    path:spec.path??[],routeIndex:0,follow:false,passenger:false,
    combat:spec.armed?{weapon:'pistol',mag:8,damage:side==='hostile'?9:22,range:23,aim:.42+(index%3)*.19,cadence:1.03+index*.13}:null}
   npc.outline=side==='hostile'?missionEnemyOutline(rig.root):null
   npc.companion=createCompanion({position:pos,waypoints:spec.waypoints??[],stopDistance:1.55,
    canStand:(x,z)=>canWalk(x,z,boxes,.32,pos.y),
    canTraverse:(a,b)=>Math.abs((a.y??pos.y)-(b.y??pos.y))<.46&&cameraFraction({x:a.x,y:pos.y+.84,z:a.z},
     {x:b.x,y:pos.y+.84,z:b.z},boxes)>.96,
    move:(p,dx,dz)=>movePlayer(p,dx,dz,boxes,undefined,p.y)})
   rig.root.position.copy(pos);scene.add(rig.root);actors.push(npc);crowd.all.push(npc)
  })
 }
 function setupActors(specs){
  if(!specs.length)return
  ready=false
  const token=generation
  Promise.all(specs.map((spec,index)=>addActor(spec,token,index))).then(()=>{
   if(token===generation){actors.sort((a,b)=>a.stagger-b.stagger);ready=true}
  }).catch(()=>{
   if(token===generation)notify('임무 인물을 불러오지 못했습니다. 다시 시작하십시오.',true)
  })
 }
 function spawnTarget(stolen,layout='roof'){
  if(target)return
  targetRig=rigs.civilianRig(stolen?2:0)
  const pose=layout==='roof'?getaway.sample(0):{x:-105.4,z:146.6,heading:Math.PI,lift:0}
  const setup={...targetRig.setup,top:15,power:6.2}
  target={...newDrive(targetRig,setup),...pose,id:'chapter-recovery-car',localOnly:true,storyLocked:stolen,storyVehicle:true,setup}
  resetVehicleGround(target)
  scene.add(targetRig.root);registerVehicle(target,targetRig);targetRig.updatePose(target)
 }
 function deployRecoveryCar(){
  recoveryRig=rigs.civilianRig(3)
  recoveryCar={...newDrive(recoveryRig,recoveryRig.setup),x:-128.3,z:178.8,heading:-Math.PI/2,
   id:'chapter-maya-car',localOnly:true,storyVehicle:true}
  resetVehicleGround(recoveryCar);scene.add(recoveryRig.root);registerVehicle(recoveryCar,recoveryRig);recoveryRig.updatePose(recoveryCar)
 }
 function clear(){
  stage=null;releaseActors();removeVehicle();releaseRecoveryCar();signals={};elapsed=0
 }
 function enter(next){
  const was=stage,carSuccess=was?.set==='chapter-chase'&&next?.set==='chapter-delivery'
  releaseActors()
  if(!carSuccess)removeVehicle()
  if(!['chapter-scan','chapter-chase','chapter-delivery','chapter-invoice'].includes(next?.set))releaseRecoveryCar()
  stage=next??null;elapsed=0;interacted=false;signals={};chaseDistance=pressure=chaseWait=0;secured=false
  if(!stage)return
  const first=[{name:'Maya',point:stage.goal}]
  switch(stage.set){
   case 'chapter-maya':setupActors(first);break
   case 'chapter-scan':
    if(!recoveryCar)deployRecoveryCar()
    spawnTarget(true);setupActors([{name:'Maya',point:parking.recovery}]);break
   case 'chapter-chase':
    if(!recoveryCar)deployRecoveryCar()
    spawnTarget(true);setupActors([{name:'Maya',point:parking.recovery}]);break
   case 'chapter-delivery':
    if(!target)spawnTarget(false,'street')
    target.storyLocked=false
    setupActors([{name:'Maya',point:{x:target.x-2.5,y:target.lift,z:target.z}}]);break
   case 'chapter-invoice':setupActors(first);break
   default:setupActors(stage.actors??[])
  }
 }
 function prepare(next){if(next!==stage)enter(next)}
 function near(pos,point,limit=2.5){
  return range(pos,point)<=limit&&Math.abs(pos.y-(point.y??.083))<1.25&&cameraFraction(
   {x:pos.x,y:pos.y+1.3,z:pos.z},{x:point.x,y:(point.y??.083)+1.3,z:point.z},boxes)>.92
 }
 function interactions(next,pos){
  if(!next||next!==stage||!ready||interacted||!stage.action||!near(pos,stage.goal))return []
  return [{...stage.goal,id:stage.set,label:stage.action,activate(){
   if(!near(pos,stage.goal)||interacted)return
   interacted=true;signals[stage.event]=true
  }}]
 }
 function seat(npc,vehicle){
  const spot=worldPoint(vehicle,vehicle.width*.22,.16)
  npc.pos.set(spot.x,(vehicle.lift??0)+.23,spot.z)
  npc.face=Math.PI-vehicle.heading
  npc.rig.root.position.copy(npc.pos);npc.rig.root.rotation.y=npc.face
  npc.rig.update(0,0,{vehicle:{side:1,crouch:.75,reach:.12}})
 }
 function move(npc,point,dt,pace=3.4){
  const before=npc.pos.clone(),dist=range(npc.pos,point)
  if(dist>.08){
   const step=Math.min(1,dt*pace/dist)
   movePlayer(npc.pos,(point.x-npc.pos.x)*step,(point.z-npc.pos.z)*step,boxes,undefined,npc.pos.y)
   npc.pos.y=floorAt(npc.pos.x,npc.pos.z,npc.pos.y)
  }
  const movement=range(before,npc.pos)
  if(movement>.003)npc.face=Math.atan2(npc.pos.x-before.x,npc.pos.z-before.z)
  return movement/Math.max(.001,dt)
 }
 function vehicleObjective(dt,player,car){
  if(!target)return
  const maya=actors.find(npc=>npc.name==='Maya'),gap=range(player.pos,target)
  if(maya){
   if(car&&Math.abs(car.lift-maya.pos.y)<1.7&&(maya.passenger||range(car,maya.pos)<5)){
    maya.passenger=true;seat(maya,car)
   }else if(!car){
    maya.passenger=false
    maya.speed=range(maya.pos,player.pos)<15?move(maya,player.pos,dt):0
   }
  }
  if(stage.set==='chapter-delivery'){
   if(car===target&&range(target,workshop.bay)<2.1&&Math.abs(target.speed)<.65)signals.delivered=true
   return
  }
  if(stage.set!=='chapter-chase')return
  const damage=Object.values(target.dents??{}).reduce((n,dent)=>n+dent.depth,0)
  if(damage>2.75){signals.failed='회수할 차량이 심하게 파손되었습니다.';return}
  if(!secured){
   const speed=chaseDistance<66?3.8:car&&gap<24?10.8:car?8.2:2.7
   const next=getaway.drive(target,chaseDistance,speed*dt,boxes,traffic)
   target.speed=(next-chaseDistance)/Math.max(dt,.001)
   chaseDistance=next
   const sameLevel=Math.abs((car?.lift??player.pos.y)-target.lift)<1.45
   if(car&&sameLevel&&gap<14&&target.lift<1)pressure+=dt
   else pressure=Math.max(0,pressure-dt*.35)
   if(target.speed<.2&&car&&gap<10&&sameLevel&&target.lift<1)chaseWait+=dt
   else chaseWait=0
   secured=pressure>3.4||chaseWait>1.1||chaseDistance>=getaway.length-.05
   if(secured){target.speed=0;target.storyLocked=false;signals.secured=true}
  }
 }
 function step(next,dt,player,onFoot,roadDriving,boat){
  prepare(next)
  currentPlayer=player
  if(!stage||!ready)return {status:stage?'합류 준비 중':''}
  elapsed+=dt
  vehicleObjective(dt,player,roadDriving?player.inVehicle:null)
  for(const npc of actors){
   if(npc.passenger)continue
   if(npc.speed<.01)npc.face=Math.atan2(player.pos.x-npc.pos.x,player.pos.z-npc.pos.z)
   npc.rig.root.position.copy(npc.pos);npc.rig.root.rotation.y=npc.face
   npc.rig.update(dt,npc.speed,combatPose(npc.f))
  }
  fire.update(dt)
  return {...signals,moving:!!target||actors.some(npc=>npc.speed>.05),
   status:stage.set==='chapter-chase'&&pressure>0?'압박 '+Math.min(100,Math.floor(pressure/3.4*100))+'%':elapsed>25?stage.hint??'지도 표식과 목표 설명을 확인하십시오.':''}
 }
 return {
  enter,prepare,step,interactions,clean:clear,
  focus(){return stage?.set==='chapter-chase'&&target?{x:target.x,z:target.z,y:target.lift,label:'도주 차량'}:null},
  snapshot(){
   if(!ready)return null
   return {generation,stage:stage?.set,elapsed,interacted,signals,actors:actors.map(missionActorSnapshot),
    fire:fire.snapshot(actors),target:target?missionVehicleSnapshot(target):null,recoveryCar:recoveryCar?missionVehicleSnapshot(recoveryCar):null,chaseDistance,pressure,chaseWait,secured}
  },
  planRestore(snapshot){
   if(!snapshot||snapshot.generation!==generation||snapshot.stage!==stage?.set||!ready||
    snapshot.actors.length!==actors.length||!!target!==!!snapshot.target||!!recoveryCar!==!!snapshot.recoveryCar)return null
   return ()=>{
    ({elapsed,interacted,signals,chaseDistance,pressure,chaseWait,secured}=snapshot)
    actors.forEach((npc,index)=>{npc.passenger=false;restoreMissionActor(npc,snapshot.actors[index],scene,crowd.all,combatPose)})
    fire.restore(actors,snapshot.fire)
    if(recoveryCar)restoreMissionVehicle(recoveryCar,snapshot.recoveryCar)
    if(target){restoreMissionVehicle(target,snapshot.target);target.storyLocked=stage.set!=='chapter-delivery'&&!secured}
   }
  },
  markers:()=>actors.filter(npc=>npc.missionRole==='hostile'&&npc.f.hp>0).map(npc=>({x:npc.pos.x,z:npc.pos.z}))
 }
}
