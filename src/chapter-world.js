import {Vector3} from 'three'
import {createCharacter} from './character.js'
import {createCompanion} from './companion.js'
import {advance,combatPose,fighter,injure,revive} from './melee.js'
import {cameraFraction,canWalk,movePlayer} from './navigation.js'
import {missionActorSnapshot,restoreMissionActor,missionVehicleSnapshot,restoreMissionVehicle} from './mission-checkpoint.js'
import {factory,marina,parking,workshop} from './chapter-sites.js'
import {cargoRoute,pursueCargoBoat} from './chapter-sea.js'
import {swellAt} from './coast-plan.js'
import {chapterRoadRoute} from './chapter-route.js'
import {newDrive,resetVehicleGround,worldPoint} from './driving.js'
import {clubFire} from './new-blood-fire.js'
import {missionEnemyOutline} from './mission-enemy-outline.js'

const range=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const mainNames={
 Maya:{model:'crew',variant:6,role:'차량 전문가',line:'길은 내가 봐 둘게. 네가 할 일에 집중해.'},
 Jack:{model:'mariner',variant:2,role:'현장 연락책',line:'괜찮아. 오늘은 기왕이면 조용히 끝내자.'},
 Theo:{model:'mariner',variant:4,role:'항만 배선 담당',line:'조류 표를 봤어. 안쪽 물길이 비는 때를 알려 줄게.'},
 Leon:{model:'resident',variant:20,role:'현장 지원',line:'뒤는 내가 본다. 사람부터 챙겨.'},
 Adrian:{model:'resident',variant:21,role:'운송권 책임자',line:'운송 계약은 사라지지 않습니다. 서명하는 사람이 바뀔 뿐이지.'},
 Elliot:{model:'resident',variant:7,role:'운송업자',line:'여기서는 이름을 묻지 마십시오.'},
 Victor:{model:'resident',variant:3,role:'항만 사업 책임자',line:'일은 끝까지 처리해. 약속한 몫은 내가 책임진다.'}
}

export function chapterWorld({scene,boxes,crowd,traffic,rigs,boats=[],floorAt,combat,notify,registerVehicle,unregisterVehicle}){
 const actors=[],fire=clubFire(boxes,traffic,crowd.all)
 const getaway=chapterRoadRoute(parking.getaway),adrianRoute=chapterRoadRoute(factory.getaway)
 const cargoBoat=boats.find(boat=>boat.id==='chapter-cargo-launch'),quayBoat=boats.find(boat=>boat.id==='chapter-quay-skiff')
 const seaFields=['x','z','heading','speed','rudder','slip','hit','damage','travel','stepTime','bob','heel','disabled']
 const boatState=boat=>Object.fromEntries(seaFields.map(key=>[key,boat[key]]))
 let seaIndex=0,sailed=false,autoDriver=false
 let stage=null,generation=0,ready=true,elapsed=0,interacted=false,signals={},currentPlayer=null,barkTime=0
 let target=null,targetRig=null,recoveryCar=null,recoveryRig=null,chaseDistance=0,pressure=0,chaseWait=0,secured=false,reinforced=false

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
  const person=mainNames[name]??{model:'resident',variant:22+(spec.variant??2)%3,role:side==='hostile'?'Adrian의 조직원':'운송업자',line:''}
  return createCharacter({model:person.model,variant:person.variant}).then(rig=>{
   if(token!==generation){rig.dispose();return}
   const pos=new Vector3(point.x,point.y??.083,point.z)
   const npc={id:spec.id??'chapter-'+name.toLowerCase(),name,role:person.role,lines:[person.line],height:1.77,pos,rig,
    f:fighter(health),missionRole:side,face:0,joined:true,speed:0,stepping:0,stagger:index,
    path:spec.path??[],routeIndex:0,follow:!!spec.follow,passenger:false,
    focus:null,hiding:null,rethink:index*.07,retreat:false,said:false,assisted:false,aidTime:0,
    combat:spec.armed?{weapon:'pistol',mag:8,damage:side==='hostile'?9:22,range:23,aim:.42+(index%3)*.19,cadence:1.03+index*.13}:null}
   npc.outline=side==='hostile'?missionEnemyOutline(rig.root):null
   npc.companion=createCompanion({position:pos,waypoints:spec.waypoints??[],stopDistance:1.55,
    canStand:(x,z,point)=>canWalk(x,z,boxes,.32,point?.y??pos.y),
    canTraverse:(a,b)=>Math.abs((a.y??pos.y)-(b.y??pos.y))<.65&&cameraFraction({x:a.x,y:(a.y??pos.y)+.84,z:a.z},
     {x:b.x,y:(b.y??pos.y)+.84,z:b.z},boxes)>.96,
    move:(p,dx,dz)=>{
     movePlayer(p,dx,dz,boxes,undefined,p.y)
     p.y=floorAt(p.x,p.z,p.y)
    }})
   npc.companion.command('follow')
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
 function roadRoute(){return stage?.set==='chapter-adrian-chase'?adrianRoute:getaway}
 function spawnTarget(stolen,layout='roof'){
  if(target)return
  targetRig=rigs.civilianRig(stolen?2:0)
  const pose=layout==='roof'?roadRoute().sample(0):{x:-105.4,z:146.6,heading:Math.PI,lift:0}
  const setup={...targetRig.setup,top:15,power:6.2}
  target={...newDrive(targetRig,setup),...pose,id:stage.set==='chapter-adrian-chase'?'chapter-adrian-car':'chapter-recovery-car',localOnly:true,storyLocked:stolen,storyVehicle:true,setup}
  resetVehicleGround(target)
  scene.add(targetRig.root);registerVehicle(target,targetRig);targetRig.updatePose(target)
 }
 function deployRecoveryCar(point={x:-127.3,z:177.1,heading:Math.PI/2}){
  recoveryRig=rigs.civilianRig(3)
  recoveryCar={...newDrive(recoveryRig,recoveryRig.setup),...point,
   id:'chapter-maya-car',localOnly:true,storyVehicle:true}
  resetVehicleGround(recoveryCar);scene.add(recoveryRig.root);registerVehicle(recoveryCar,recoveryRig);recoveryRig.updatePose(recoveryCar)
 }
 function resetBoat(boat,disabled){
  if(boat)Object.assign(boat,boat.setup,{speed:0,rudder:0,slip:0,hit:0,damage:0,travel:0,stepTime:0,heel:0,disabled})
 }
 function clear(){
  stage=null;releaseActors();removeVehicle();releaseRecoveryCar();resetBoat(cargoBoat,true);resetBoat(quayBoat,true);signals={};elapsed=0
 }
 function enter(next){
  const was=stage,carSuccess=was?.set==='chapter-chase'&&next?.set==='chapter-delivery'
  releaseActors()
  if(!carSuccess)removeVehicle()
  if(!['chapter-scan','chapter-chase','chapter-delivery','chapter-invoice','chapter-adrian-chase','chapter-factory-report'].includes(next?.set))releaseRecoveryCar()
  stage=next??null;elapsed=0;autoDriver=false;interacted=false;signals={};chaseDistance=pressure=chaseWait=0;secured=reinforced=false
  if(!stage){resetBoat(cargoBoat,true);resetBoat(quayBoat,true);return}
  if(stage.set==='chapter-sea-track'||stage.set==='chapter-sea-pursuit'){
   if(was?.set!=='chapter-sea-track'){resetBoat(cargoBoat,false);seaIndex=0;sailed=false}
  }else if(stage.set!=='chapter-sea-cargo')resetBoat(cargoBoat,true)
  if(stage.set==='chapter-sea-cargo'||stage.set==='chapter-sea-return'){
   if(was?.set!=='chapter-sea-cargo')resetBoat(quayBoat,false)
   if(stage.set==='chapter-sea-return')sailed=false
  }else if(stage.set!=='chapter-sea-check')resetBoat(quayBoat,true)
  const first=[{name:'Maya',point:{...stage.goal,x:stage.goal.x+1.12,z:stage.goal.z+.76}}]
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
   case 'chapter-adrian-chase':
    spawnTarget(true);deployRecoveryCar({x:-161.5,z:181.8,heading:Math.PI/2})
    setupActors(stage.actors??[])
    break
   default:setupActors(stage.actors??[])
  }
 }
 function prepare(next){if(next!==stage)enter(next)}
 function near(pos,point,limit=2.5){
  return range(pos,point)<=limit&&Math.abs(pos.y-(point.y??.083))<1.25&&cameraFraction(
   {x:pos.x,y:pos.y+1.3,z:pos.z},{x:point.x,y:(point.y??.083)+1.3,z:point.z},boxes)>.92
 }
 function interactions(next,pos){
  if(!next||next!==stage||!ready)return []
  const actions=[]
  if(!interacted&&stage.action&&near(pos,stage.goal)&&(!stage.secureFirst||!actors.some(npc=>npc.missionRole==='hostile'&&npc.f.hp&&!npc.retreat))){
   actions.push({...stage.goal,id:stage.set,label:stage.action,activate(){
    if(!near(pos,stage.goal)||interacted)return
    interacted=true;signals[stage.event]=true
   }})
  }
  const ally=actors.find(npc=>npc.name==='Leon')
  if(stage.set==='chapter-factory-upper'&&ally&&!ally.assisted&&near(pos,ally.pos,1.85)){
   actions.push({x:ally.pos.x,z:ally.pos.z,id:'chapter-assist-leon',label:'Leon을 엄폐물로 지원',activate(){
    ally.assisted=true;ally.follow=true;ally.companion.command('follow')
    if(!ally.f.hp)revive(ally.f)
    ally.f.hp=Math.min(ally.f.maxHealth,ally.f.hp+40)
    notify('Leon · 됐어. 다음은 내가 엄폐할게.')
   }})
  }
  if(stage.commands)for(const npc of actors){
   if(npc.missionRole!=='ally'||!npc.f.hp||npc.passenger||!near(pos,npc.pos))continue
   if(stage.set==='chapter-free'){
    actions.push({x:npc.pos.x,z:npc.pos.z,id:'chapter-talk-'+npc.id,label:npc.name+'와 대화',activate(){
     notify(npc.name+' · '+npc.lines[0])
    }})
    if(npc.follow)actions.push({x:npc.pos.x,z:npc.pos.z,id:'chapter-dismiss-'+npc.id,label:npc.name+'의 동행 종료',activate(){
     npc.follow=false;npc.companion.command('hold');npc.dispatched=false
     notify(npc.name+' · 여기서 대기하겠습니다.')
    }})
   }
   actions.push({x:npc.pos.x,z:npc.pos.z,id:'chapter-order-'+npc.id,
    label:npc.name+(npc.follow?'에게 대기 요청':'에게 동행 요청'),activate(){
     npc.follow=!npc.follow;npc.companion.command(npc.follow?'follow':'hold')
     return {message:npc.name+(npc.follow?' · 합류 중':' · 위치 유지')}
    }})
  }
  return actions
 }
 function seat(npc,vehicle,driver=false){
  const side=driver?-1:1
  const spot=worldPoint(vehicle,vehicle.width*.22*side,.16)
  npc.pos.set(spot.x,(vehicle.lift??0)+.23,spot.z)
  npc.face=Math.PI-vehicle.heading
  npc.rig.root.position.copy(npc.pos);npc.rig.root.rotation.y=npc.face
  npc.rig.update(0,0,{vehicle:{side,crouch:.75,reach:.12}})
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
   if(car&&(maya.passenger||Math.abs(car.lift-maya.pos.y)<1.7&&range(car,maya.pos)<5)){
    maya.passenger=true;seat(maya,car,autoDriver&&car===recoveryCar)
   }else if(!car){
    maya.passenger=false
    maya.speed=range(maya.pos,player.pos)<15?move(maya,player.pos,dt):0
   }
  }
  if(stage.set==='chapter-delivery'){
   if(car===target&&range(target,workshop.bay)<2.1&&Math.abs(target.speed)<.65)signals.delivered=true
   return
  }
  if(stage.set==='chapter-adrian-chase'){
   const adrian=actors.find(npc=>npc.name==='Adrian'),leon=actors.find(npc=>npc.name==='Leon')
   if(adrian?.f.hp){adrian.passenger=true;seat(adrian,target,true)}
   else if(adrian)adrian.passenger=false
   if(car&&leon&&(leon.passenger||range(car,leon.pos)<4.2)){leon.passenger=true;seat(leon,car)}
   else if(leon)leon.passenger=false
   if(!player.inVehicle&&!reinforced&&elapsed<14)return
   reinforced=true
   const launch=adrianRoute
   const speed=gap<18?11.5:gap>38?6.5:9.5
   const next=launch.drive(target,chaseDistance,speed*dt,boxes,traffic)
   target.speed=(next-chaseDistance)/Math.max(dt,.001);chaseDistance=next
   if(car&&gap<12&&next>8)pressure+=dt
   else pressure=Math.max(0,pressure-dt*.18)
   if(pressure>3.25||car&&gap<8&&next>8&&Math.abs(target.speed)<.3||Object.values(target.dents??{}).reduce((sum,dent)=>sum+dent.depth,0)>2.75){
    target.speed=0;signals.adrianLead='intercepted'
   }else if(chaseDistance>launch.length-.10||elapsed>105)signals.adrianLead='escaped'
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
   if(car&&sameLevel&&gap<14&&target.lift<1&&Math.abs(car.speed)>1.7&&target.speed>1.3)pressure+=dt
   else pressure=Math.max(0,pressure-dt*.35)
   if(target.speed<.2&&car&&gap<10&&sameLevel&&target.lift<1)chaseWait+=dt
   else chaseWait=0
   secured=pressure>3.4||chaseWait>1.1||chaseDistance>=getaway.length-.05
   if(secured){target.speed=0;target.storyLocked=false;signals.secured=true}
  }
 }
 function canAssignDriver(car){
  return stage?.set==='chapter-chase'&&car===recoveryCar&&
   actors.some(npc=>npc.name==='Maya'&&npc.passenger&&npc.f.hp)
 }
 function changeDriver(car){
  if(!canAssignDriver(car))return false
  autoDriver=!autoDriver
  notify(autoDriver?'Maya · 내가 운전할게. 직접 조작하면 바로 넘길게.':'Maya · 네가 운전해.')
  return true
 }
 function driveInput(car,manual){
  if(!autoDriver||!canAssignDriver(car))return manual
  if(manual.forward||manual.back||manual.steer||manual.handbrake){autoDriver=false;return manual}
  const brake={forward:0,back:0,steer:0,handbrake:true}
  if(!target||chaseDistance<69)return brake
  let nearest=69,gap=Infinity
  for(let d=69;d<=Math.min(chaseDistance+5,getaway.length);d+=2){
   const pose=getaway.sample(d),distance=range(pose,car)
   if(distance<gap){gap=distance;nearest=d}
  }
  const looking=getaway.sample(Math.min(chaseDistance,nearest+5))
  const desired=Math.atan2(looking.x-car.x,car.z-looking.z)
  const error=Math.atan2(Math.sin(desired-car.heading),Math.cos(desired-car.heading))
  const want=Math.min(10.7,Math.abs(error)>.68?3.5:range(car,target)<7.5?Math.max(1.8,target.speed):10.7)
  const reversing=gap>4&&Math.abs(error)>2.65&&Math.abs(car.speed)<1.7
  return {forward:!reversing&&car.speed<want?1:0,back:reversing?1:0,
   steer:Math.max(-1,Math.min(1,error*(reversing?-1.65:1.65))),handbrake:car.speed>want+1.1}
 }
 function freeVehicle(player,car,boat,dt,time){
  const driver=car??boat
  for(const npc of actors){
   if(!npc.follow&&!npc.passenger)continue
   if(driver&&(npc.passenger||range(npc.pos,driver)<3.5)){
    const occupant=actors.find(ally=>ally!==npc&&ally.passenger)
    if(occupant&&!npc.passenger)continue
    npc.passenger=true
    if(car)seat(npc,car)
    else{
     const spot=worldPoint(boat,boat.width*.21,.58)
     npc.pos.set(spot.x,swellAt(spot.x,spot.z,time)-.40,spot.z)
     npc.face=Math.PI-boat.heading;npc.rig.root.position.copy(npc.pos)
     npc.rig.root.rotation.y=npc.face;npc.rig.update(dt,0,{marineSeat:1})
    }
   }else if(npc.passenger){
    npc.passenger=false
    npc.pos.set(player.pos.x+.8,player.pos.y,player.pos.z+.55)
   }
  }
 }
 function seaObjective(dt,player,onFoot,boat,time){
  if(!stage.set.startsWith('chapter-sea-'))return
  const maya=actors.find(npc=>npc.name==='Maya')
  if(maya){
   if(boat&&(maya.passenger||range(boat,maya.pos)<7||stage.set==='chapter-sea-pursuit'&&sailed)){
    maya.passenger=true
    const spot=worldPoint(boat,boat.width*.21,.58)
    maya.pos.set(spot.x,swellAt(spot.x,spot.z,time)-.40,spot.z)
    maya.face=Math.PI-boat.heading
    maya.rig.root.position.copy(maya.pos);maya.rig.root.rotation.y=maya.face;maya.rig.update(dt,0,{marineSeat:1})
   }else if(maya.passenger&&!boat){
    maya.passenger=false
    const dock=range(player.pos,marina.meetup)<range(player.pos,marina.berth)?marina.meetup:marina.berth
    maya.pos.set(dock.x,dock.y,dock.z)
   }
  }
  if(stage.set==='chapter-sea-track'&&boat&&range(boat,cargoBoat)<24)signals.spottedBoat=true
  if(stage.set==='chapter-sea-pursuit'){
   sailed||=!!boat
   if(sailed)seaIndex=pursueCargoBoat(cargoBoat,seaIndex,boat,boats,dt)
   if(seaIndex>=cargoRoute.length&&onFoot&&range(player.pos,marina.berth)<12)signals.madeLandfall=true
  }
  if(stage.set==='chapter-sea-return'){
   sailed||=!!boat
   if(sailed&&onFoot&&range(player.pos,marina.meetup)<9)signals.deliveredCargo=true
  }
 }
 function reaction(shooter,target,from,to,hit,weapon,damage){
  combat?.(shooter,from,to,target===currentPlayer&&hit,weapon,damage)
  for(const npc of actors){
   if(npc.missionRole!==shooter.missionRole&&npc.combat&&!npc.focus&&range(npc.pos,from)<18){
    npc.lastContact={x:from.x,z:from.z,y:shooter.pos.y}
   }
  }
  if(target!==currentPlayer&&hit){
   const health=target.f.hp
   if(injure(target.f,damage,1,'body',{weaponHit:true}))crowd.markImpact?.(target,{point:to,source:from,kind:'shot',strength:health-target.f.hp})
  }
 }
 function combatDecision(npc,player,foes,allies){
  const hostile=npc.missionRole==='hostile'
  const candidates=hostile?[...allies,player]:foes
  const visible=candidates.filter(target=>target.f.hp&&range(npc.pos,target.pos)<npc.combat.range+6&&fire.visible(npc,target))
  npc.focus=visible.reduce((best,target)=>!best||range(npc.pos,target.pos)<range(npc.pos,best.pos)?target:best,null)
  if(npc.focus)npc.lastContact={...npc.focus.pos}
  const cover=stage.cover??[]
  const exposedTo=npc.focus??candidates.find(target=>target.f.hp)
  const threatPoint=exposedTo?.pos
  npc.retreat||=hostile&&npc.f.hp<npc.f.maxHealth*.20
  const seekCover=npc.retreat||fire.reloading(npc)||npc.f.hp<npc.f.maxHealth*.46
  npc.hiding=seekCover&&threatPoint?cover.filter(p=>Math.abs((p.y??.083)-npc.pos.y)<.6&&
   canWalk(p.x,p.z,boxes,.32,npc.pos.y)).reduce((best,p)=>{
    const exposed=cameraFraction({x:threatPoint.x,y:threatPoint.y+1.25,z:threatPoint.z},
     {x:p.x,y:(p.y??.083)+.95,z:p.z},boxes)>.92
    const occupied=actors.some(other=>other!==npc&&other.hiding===p)
    const score=range(npc.pos,p)+(exposed?8:0)+(occupied?10:0)
    return !best||score<best.score?{point:p,score}:best
   },null)?.point:null
 }
 function behave(npc,dt,player,onFoot,foes,allies){
  advance(npc.f,dt)
  if(npc.passenger){npc.rig.root.visible=true;npc.outline?.show(false);return}
  const viewDistance=range(npc.pos,player.pos)
  npc.rig.root.visible=viewDistance<78
  if(!target)npc.speed=0
  const canMove=npc.f.hp&&!npc.f.action
  if(canMove&&npc.routeIndex<npc.path.length&&(npc.missionRole!=='witness'||range(npc.pos,player.pos)<19)){
   const next=npc.path[npc.routeIndex]
   const retreat=npc.missionRole==='witness'&&stage.followActor
   const pace=retreat?(range(npc.pos,player.pos)<3.4?4.6:3.1):2.8
   npc.speed=move(npc,next,dt,pace)
   if(range(npc.pos,next)<.18)npc.routeIndex++
  }else if(stage.armed&&npc.combat){
   npc.rethink-=dt
   if(npc.rethink<=0){
    combatDecision(npc,player,foes,allies);npc.rethink=.21+npc.stagger*.055
   }
   const last=npc.lastContact&&range(npc.pos,npc.lastContact)>4?npc.lastContact:null
   const partner=npc.name==='Leon'&&!npc.focus?allies.find(ally=>ally!==npc&&ally.missionRole==='ally'&&
    ally.f.hp<ally.f.maxHealth*.35&&range(npc.pos,ally.pos)<11):null
   npc.aidTime=Math.max(0,npc.aidTime-dt)
   if(partner&&range(npc.pos,partner.pos)<2.4&&!npc.aidTime){
    partner.f.hp=Math.min(partner.f.maxHealth,partner.f.hp+22);npc.aidTime=12
   }
   const advanceTo=npc.hiding??partner?.pos??(npc.missionRole==='hostile'&&!npc.focus?last:null)
   const follow=onFoot&&npc.follow&&!npc.focus&&range(npc.pos,player.pos)<32?player.pos:null
   if(canMove&&(advanceTo||follow)){
    npc.speed=npc.companion.update(dt,{target:advanceTo??follow}).speed
   }
  }else if(canMove&&npc.follow&&onFoot&&range(npc.pos,player.pos)<26){
   npc.speed=npc.companion.update(dt,{target:player.pos}).speed
  }
  if(npc.speed<.12){
   const faceTarget=npc.focus?.pos??player.pos
   const angle=Math.atan2(faceTarget.x-npc.pos.x,faceTarget.z-npc.pos.z)
   npc.face+=Math.atan2(Math.sin(angle-npc.face),Math.cos(angle-npc.face))*(1-Math.exp(-11*dt))
  }
  npc.rig.root.position.copy(npc.pos);npc.rig.root.rotation.y=npc.face
  if(viewDistance<48||npc.focus)npc.rig.update(dt,npc.speed,combatPose(npc.f))
  if(stage.armed&&npc.combat){
   const aiming=!!(npc.focus&&npc.speed<1.3&&!npc.retreat&&range(npc.pos,npc.focus.pos)<npc.combat.range&&fire.visible(npc,npc.focus))
   fire.tick(npc,npc.focus,dt,aiming,!!npc.f.hp&&!npc.retreat,reaction)
  }
  npc.outline?.show(npc.f.hp>0&&!npc.retreat&&range(npc.pos,player.pos)<24)
 }
 function step(next,dt,player,onFoot,roadDriving,boat,time){
  prepare(next)
  currentPlayer=player
  if(!stage||!ready)return {status:stage?'합류 준비 중':''}
  elapsed+=dt
  vehicleObjective(dt,player,roadDriving?player.inVehicle:null)
  if(cargoBoat)seaObjective(dt,player,onFoot,boat,time)
  if(stage.set==='chapter-free')freeVehicle(player,roadDriving?player.inVehicle:null,boat,dt,time)
  if(stage.entries&&onFoot&&stage.entries.some(point=>near(player.pos,point,1.75)))signals[stage.event]=true
  const foes=actors.filter(npc=>npc.missionRole==='hostile'&&npc.f.hp&&!npc.retreat)
  const allies=actors.filter(npc=>npc.missionRole!=='hostile'&&npc.f.hp)
  fire.update(dt)
  for(const npc of actors)behave(npc,dt,player,onFoot,foes,allies)
  barkTime=Math.max(0,barkTime-dt)
  if(elapsed>6&&!barkTime){
   const talker=actors.find(npc=>npc.missionRole==='ally'&&!npc.said&&npc.f.hp&&range(npc.pos,player.pos)<7)
   const line=talker&&(
    stage.armed&&player.f.hp<42?(talker.name==='Leon'?'Jack! 대답해 봐. 서 있지 말고 뒤로 와.':'잠깐 빠져. 여기서는 내가 볼게.'):
    stage.set==='chapter-chase'&&talker.passenger&&pressure>.6?'그래, 이 거리야. 옆으로 치지 말고 붙어 있어.':
    stage.set==='chapter-free'&&!talker.follow?talker.lines[0]:null)
   if(line){talker.said=true;barkTime=9;notify(talker.name+' · '+line)}
  }
  const witness=actors.find(npc=>npc.missionRole==='witness')
  if(witness){
   const atExit=witness.routeIndex>=witness.path.length
   if(stage.set==='chapter-witness-run'&&atExit)signals.outside=true
   if(stage.set==='chapter-witness-protect'){
    if(!witness.f.hp)signals.failed='골목에서 Elliot을 보호하지 못했습니다.'
    else if(atExit&&!foes.length&&range(player.pos,witness.pos)<12)signals.protected=true
   }
  }
  return {...signals,moving:!!target||actors.some(npc=>npc.speed>.05),
   status:stage.set==='chapter-chase'&&pressure>0?'압박 '+Math.min(100,Math.floor(pressure/3.4*100))+'%':
    stage.set==='chapter-witness-protect'?'Elliot 체력 '+witness.f.hp+'/'+witness.f.maxHealth:
    elapsed>25?stage.hint??'지도 표식과 목표 설명을 확인하십시오.':''}
 }
 return {
  enter,prepare,step,interactions,clean:clear,canAssignDriver,changeDriver,driveInput,
  get autoDriver(){return autoDriver},
  focus(){
   if(currentPlayer&&stage?.entries)return stage.entries.reduce((closest,point)=>
    range(currentPlayer.pos,point)<range(currentPlayer.pos,closest)?point:closest,stage.entries[0])
   if(cargoBoat&&!cargoBoat.disabled&&(stage?.set==='chapter-sea-track'||stage?.set==='chapter-sea-pursuit'&&seaIndex<cargoRoute.length))
    return {x:cargoBoat.x,z:cargoBoat.z,y:-.5,label:'화물 운반선'}
   if(['chapter-chase','chapter-adrian-chase'].includes(stage?.set)&&target&&(stage.set!=='chapter-adrian-chase'||reinforced))return {x:target.x,z:target.z,y:target.lift,label:'도주 차량'}
   const npc=actors.find(actor=>actor.name===stage?.followActor)
   return npc?{x:npc.pos.x,z:npc.pos.z,y:npc.pos.y,label:npc.name}:null
  },
  snapshot(){
   if(!ready)return null
   return {generation,stage:stage?.set,elapsed,interacted,signals,actors:actors.map(npc=>({...missionActorSnapshot(npc),routeIndex:npc.routeIndex,follow:npc.follow,retreat:npc.retreat,assisted:npc.assisted,said:npc.said,aidTime:npc.aidTime})),
    fire:fire.snapshot(actors),seaIndex,sailed,autoDriver,boats:boats.map(boatState),target:target?missionVehicleSnapshot(target):null,recoveryCar:recoveryCar?missionVehicleSnapshot(recoveryCar):null,chaseDistance,pressure,chaseWait,secured,reinforced}
  },
  planRestore(snapshot){
   if(!snapshot||snapshot.generation!==generation||snapshot.stage!==stage?.set||!ready||
    snapshot.actors.length!==actors.length||!!target!==!!snapshot.target||!!recoveryCar!==!!snapshot.recoveryCar)return null
   return ()=>{
    ({elapsed,interacted,signals,chaseDistance,pressure,chaseWait,secured,reinforced,seaIndex,sailed,autoDriver}=snapshot)
    actors.forEach((npc,index)=>{
     const saved=snapshot.actors[index]
     Object.assign(npc,{passenger:false,routeIndex:saved.routeIndex,follow:saved.follow,retreat:saved.retreat,assisted:saved.assisted,said:saved.said,aidTime:saved.aidTime,
      focus:null,lastContact:null,hiding:null,rethink:0})
     npc.companion.restart(npc.follow?'follow':'hold')
     restoreMissionActor(npc,saved,scene,crowd.all,combatPose)
    })
    fire.restore(actors,snapshot.fire)
    boats.forEach((boat,index)=>Object.assign(boat,snapshot.boats[index]))
    if(recoveryCar)restoreMissionVehicle(recoveryCar,snapshot.recoveryCar)
    if(target){restoreMissionVehicle(target,snapshot.target);target.storyLocked=stage.set!=='chapter-delivery'&&!secured}
   }
  },
  markers:()=>actors.filter(npc=>npc.missionRole==='hostile'&&npc.f.hp>0).map(npc=>({x:npc.pos.x,z:npc.pos.z}))
 }
}
