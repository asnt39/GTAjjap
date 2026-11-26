import {buildEstuary,landscapeMaterial} from './estuary.js'
import {grenadeModel} from './grenade-art.js'
import {grenadeFlight,grenadeBlast,kickVehicle} from './grenade-flight.js'
import {insideWeaponShop} from './weapon-shop-plan.js'
import {buildWeaponShop} from './weapon-shop.js'
import * as THREE from 'three'
import {createLoadout,gear} from './equipment.js'
import {scopeStance} from './scope-stance.js'
import {equipmentPlay} from './equipment-play.js'
import {worldEffects} from './world-effects.js'
import {readQuality,writeQuality,nextQuality,graphicsProfile} from './graphics-quality.js'
import {civilianTraffic} from './civilian-traffic.js'
import {policeChase} from './police-chase.js'
import {buildPoliceStation} from './police-station.js'
import {createCustody,station,atStation} from './custody.js'
import {custodyPresentation} from './custody-presentation.js'
import {buildOldTown} from './old-town.js'
import {rowCeiling,rowFloor,rowRoomAt} from './market-row-plan.js'
import {buildRowDetail} from './market-row-detail.js'
import {buildWestBank} from './west-bank.js'
import {insideWorks} from './west-bank-plan.js'
import {atGarage,garage} from './garage.js'
import {createPedestrianImpacts} from './vehicle-pedestrians.js'
import {useTownDriveMask,oldTownHeight} from './old-town-plan.js'
import {buildMarket} from './market.js'
import {insidePremises} from './market-plan.js'
import {archiveVisibility} from './archive-visibility.js'
import {archive,archiveAccess} from './chart-room.js'
import {createEpisode} from './episode.js'
import {firstWorkRoadblock} from './first-work-roadblock.js'
import {availableDoor,safeExit,nearBody,newDrive,stepDrive,localPoint,doorPoint,clearPath} from './driving.js'
import {createRoomClient,blendPose} from './room-client.js'
import {roomPresence} from './room-presence.js'
import {packPlayer,packVehicle,wrapAngle} from './room-protocol.js'
import {parkedPoses,restoreParkedPoses} from './vehicle-checkpoint.js'
import {createCheckpoint,resolveCheckpoint} from './play-checkpoint.js'
import {uprightRider} from './rider-pose.js'
import {entryPose,entryTime} from './vehicle-entry.js'
import {vehicles} from './vehicles.js'
import {createResidents} from './residents.js'
import {fighter,swing,advance,contact,injure,revive,combatPose} from './melee.js'
import {createFootwork} from './footwork.js'
import {firstDrive} from './first-drive.js'
import {createCharacter} from './character.js'
import {buildStreet} from './street.js'
import {buildArchitecture} from './architecture.js'
import {buildPort} from './port.js'
import {illumination,sky,beacons,footShadow,districtGates} from './atmosphere.js'
import {createUI} from './interface.js'
import {missionGuide} from './mission-guide.js'
import {accelerateOnFoot} from './on-foot-motion.js'
import {spawn,canWalk,movePlayer,supportHeight,cameraFraction} from './navigation.js'

// The downloadable preview resolves the same site assets from its embedded manifest.
if(window.harborPreviewAssets)THREE.DefaultLoadingManager.setURLModifier(url=>window.harborPreviewAssets[url]||url)

const canvas=document.querySelector('#world')
const pos=new THREE.Vector3(garage.x,0,garage.z),velocity=new THREE.Vector2()
const keys=new Set(),boxes=[],joystick=new THREE.Vector2()
let yaw=garage.yaw,pitch=.13,distance=4.65,isPaused=false
const clamp=THREE.MathUtils.clamp, damp=THREE.MathUtils.damp
const addCollider=(a,b,c,d,h=3,standable=false,bottom)=>{if(h>.15)boxes.push([Math.min(a,b),Math.max(a,b),Math.min(c,d),Math.max(c,d),h,standable,bottom])}
const resetInput=()=>{keys.clear();joystick.set(0,0);velocity.set(0,0);document.querySelector('#stick i').style.transform=''}
const coarse=matchMedia('(pointer:coarse)').matches
let quality=readQuality(),autoDpr=Math.min(devicePixelRatio,coarse?1:1.5)
const profile=()=>graphicsProfile(quality,devicePixelRatio,autoDpr)
export async function start(onContextLost){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:!coarse,powerPreference:'high-performance',alpha:false})
 let contextLost=false
 canvas.addEventListener('webglcontextlost',e=>{
  e.preventDefault();contextLost=true;onContextLost()
 })
 renderer.setPixelRatio(profile().pixelRatio);renderer.setSize(innerWidth,innerHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12
 renderer.shadowMap.enabled=profile().worldShadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x8b94a3);const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.08,420)
 const effects=worldEffects(scene,{capacity:coarse?72:120})
 const sunlight=illumination(scene);sunlight.castShadow=profile().worldShadows;beacons(scene,addCollider);districtGates(scene,addCollider)
 const surfaceMaps={meadow:landscapeMaterial()}
 buildEstuary(scene,surfaceMaps.meadow)
 const [char,portUpdate,rigs]=await Promise.all([createCharacter(),buildPort(scene,addCollider),buildStreet(scene,addCollider,surfaceMaps),buildArchitecture(scene,addCollider,surfaceMaps),sky(scene,renderer)])
 document.querySelector('#status').querySelector('b').textContent='주민과 거리를 준비하는 중'
 if(import.meta.env.DEV && new URLSearchParams(location.search).has('colliders')){
  const lines=[],point=(x,y,z)=>new THREE.Vector3(x,y,z)
  for(const [l,r,n,s,h] of boxes){
   const corners=[[l,n],[r,n],[r,s],[l,s]]
   corners.forEach(([x,z],i)=>{
    const [nx,nz]=corners[(i+1)%4]
    lines.push(point(x,0,z),point(x,h,z),point(x,h,z),point(nx,h,nz),point(x,0,z),point(nx,0,nz))
   })
  }
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines),new THREE.LineBasicMaterial({color:0x79ffbc})))
 }
 const market=buildMarket(scene,addCollider)
 const updateWeaponShop=buildWeaponShop(scene,addCollider)
 const storeFloor=new THREE.MeshStandardMaterial({color:0xa99c85,roughness:.86,map:surfaceMaps.street[2],normalMap:surfaceMaps.street[3]})
 const rowBoards=new THREE.MeshStandardMaterial({color:0x877665,roughness:.82})
 surfaceMaps.storeFloor=storeFloor;surfaceMaps.rowBoards=rowBoards
 const updateTown=buildOldTown(scene,addCollider,boxes,surfaceMaps)
 const updateRow=buildRowDetail(scene,boxes,storeFloor,rowBoards,surfaceMaps.street)
 updateRow(pos,0)
 const westBank=buildWestBank(scene,addCollider,surfaceMaps,boxes)
 const updateStation=buildPoliceStation(scene,addCollider)
 const custodyView=custodyPresentation(scene,char,boxes)
 const updateGuide=missionGuide(scene,camera,groundHeight)
 const surfaces=boxes.filter(box=>box[5])
 const updateVisibility=archiveVisibility(scene,camera)
 const actor=new THREE.Group();actor.add(char.root);scene.add(actor);const shadow=footShadow(actor)
 const dockSpawnPoints=[spawn,...Array.from({length:13},(_,i)=>({x:-3+i*.5,z:spawn.z}))]
 const safeSpawn=dockSpawnPoints.find(point=>canWalk(point.x,point.z,boxes))??spawn
 if(!canWalk(pos.x,pos.z,boxes))pos.set(safeSpawn.x,0,safeSpawn.z)
 actor.position.copy(pos);actor.rotation.y=Math.PI-yaw
 // The contact decal follows every footstep. Reserve moving sun shadows for High.
 const playerMeshes=[]
 char.root.traverse(mesh=>{if(mesh.isMesh){playerMeshes.push(mesh);mesh.castShadow=profile().playerShadows}})
 const cars=Object.fromEntries(Object.entries(rigs).map(([id,rig])=>[id,{...newDrive(rig,rig.setup??vehicles[id]),id,localOnly:!!rig.localOnly,door:0}]))
 const fleet=Object.values(cars),traffic=[...fleet],mission=firstDrive(cars.touring),pedals=new Set()
 const parkedSpawns=new Map(fleet.map(vehicle=>[vehicle.id,{...vehicle}]))
 let car=cars.touring,offline=null,pendingSeat=null,localSeat=null,walkSpeed=0,vehiclePose=null,remoteShadow=false
 let mode='walk',transition=null,lastSide=-1,cameraBlend=0,lookHold=0,recentFrameMs=0
 const foot=createFootwork();foot.reset(groundHeight(pos.x,pos.z));pos.y=actor.position.y=foot.height
 const crowd=await createResidents(scene,boxes,cars.touring,traffic,p=>groundHeight(p.x,p.z))
 const pedestrianImpacts=createPedestrianImpacts(),previousCar={}
 const squads=policeChase(scene,boxes,traffic,fleet.length,crowd,groundHeight)
 const trafficRigs=Array.from({length:coarse?2:4},()=>rigs.civilianRig())
 await Promise.all(trafficRigs.map(async(rig,index)=>{
  const driver=await createCharacter({variant:[1,4,7,2][index]})
  driver.update(0,0)
  driver.root.scale.setScalar(.76)
  driver.root.position.set(-.39,-.18,-.11)
  driver.root.rotation.y=Math.PI
  driver.root.traverse(node=>{if(node.isMesh)node.castShadow=false})
  rig.cabin.add(driver.root)
  rig.driver=driver.root
 }))
 const civilians=civilianTraffic(scene,boxes,traffic,trafficRigs)
 const trafficView=new THREE.Frustum(),trafficProjection=new THREE.Matrix4(),trafficPoint=new THREE.Vector3()
 const trafficInView=point=>trafficView.containsPoint(trafficPoint.set(point.x,1,point.z))
 const walkers=[]
 const presence=roomPresence(scene)
 const player={pos,f:fighter(100),height:1.8,available:true}
 const episode=createEpisode({canStartOpening:()=>room.phase==='offline'&&!custody.active&&!mission.active})
 const setFirstWorkRoadblock=firstWorkRoadblock(scene,boxes)
 setFirstWorkRoadblock(episode.roadClosed)
 const custody=createCustody({
  admit(){
   const officer=custody.officer
   officer.rig.root.rotation.y=officer.face
   officer.rig.update(0,0)
   player.custodyOfficer=null
   revive(player.f)
   resetWalk(station.cell.x,station.cell.z,0);yaw=Math.PI
  },
  release(){
   returnToHome()
   revive(player.f)
   crowd.wanted.clear();ui.toast(room.phase==='offline'?'석방 · 차고지로 돌아왔어':'석방 · 부두 정문')
  }
 })
 function beginCustody(officer){
  if(room.phase!=='offline'||!officer){respawn(true);return}
  if(!custody.begin(officer))return
  custodyView.begin(officer,pos)
  player.custodyOfficer=officer
  officer.path=[];officer.speed=0;officer.rig.root.visible=true
  clearControls();crowd.endTalk()
  player.f.action='';player.f.elapsed=0;focus=null;feedbackTime=0
  const failed=episode.fail('체포로 의뢰 중단')
  if(mission.active||failed)ui.toast('의뢰 중단 · 석방 후 다시 시작할 수 있어')
  mission.cancel()
  mode='custody'
 }
 let coffee=0
 function useItem(id){
  if(custody.active||player.f.hp<=0)return {ok:false,message:'지금은 소지품을 사용할 수 없어.'}
  const vehicle=id==='repair-kit'&&room.phase==='offline'?
   driving()?car:mode==='walk'?nearestDoor(candidate=>!!candidate.dents)?.car:null:null
  const repairable=!!vehicle?.dents&&Math.abs(vehicle.speed)<=.45
  const result=episode.use(id,{...player.f,repairable,reserveSpace:loadout.reserveSpace})
  const effect=result.effect
  if(effect?.heal)player.f.hp+=effect.heal
  if(effect?.armor)player.f.armor=effect.armor
  if(effect?.sprintSeconds)coffee=effect.sprintSeconds
  if(effect?.ammo)loadout.addReserve(effect.ammo.weapon,effect.ammo.amount)
  if(effect?.repair){
   vehicle.dents=undefined;vehicle.collision=null
   renderer.shadowMap.needsUpdate=true
  }
  return result
 }
 let focus=null,feedbackTime=0,knockX=0,knockZ=0
 let storage
 try{storage=window.localStorage}catch{}
 const loadout=createLoadout(storage,episode)
 const stance=scopeStance()
 let aiming=false,shoulder=0,scopeVisible=false,hideScopeBody=false
 const cancelAim=()=>{aiming=false;stance.update(0,false);scopeVisible=false}
 const armed=()=>loadout.selected!=='fists'
 const grenades=[],blastTarget=new THREE.Vector3(),grenadeStrength=grenadeBlast(boxes)
 let grenadeShape,shake=0
 function launchGrenade(hand){
  const from=blastTarget.set(pos.x,pos.y+1.32,pos.z)
  const origin=cameraFraction(from,hand,boxes)<.98?from:hand
  grenadeShape??=grenadeModel()
  const prop=grenadeShape.clone(true)
  prop.position.copy(origin);scene.add(prop)
  grenades.push({prop,flight:grenadeFlight({origin,heading:yaw,pitch,boxes,floor:groundHeight,ceiling:ceilingHeight,vehicles:traffic})})
 }
 function updateGrenades(dt){
  shake=Math.max(0,shake-dt*3.4)
  for(let i=grenades.length-1;i>=0;i--){
   const {prop,flight}=grenades[i]
   const exploded=flight.update(dt)
   prop.position.copy(flight.position)
   prop.rotation.x+=flight.velocity.length()*.62*dt
   if(!exploded)continue
   scene.remove(prop);grenades.splice(i,1)
   const point=flight.position
   effects.emit('burst',point.x,point.y+.24,point.z,8)
   effects.emit('smoke',point.x,point.y+.26,point.z,16)
   effects.emit('sparks',point.x,point.y+.1,point.z,13)
   shake=Math.max(shake,Math.max(0,1-Math.hypot(point.x-pos.x,point.z-pos.z)/17))
   const wantedBefore=crowd.wanted.level
   for(const n of crowd.all){
    if(n.f.hp<=0||n.policeOrder?.aboard)continue
    const strength=grenadeStrength(point,blastTarget.copy(n.pos).addScaledVector(THREE.Object3D.DEFAULT_UP,.90))
    if(strength>0)crowd.blastHit(n,point,strength)
   }
   for(const vehicle of traffic){
    const strength=grenadeStrength(point,blastTarget.set(vehicle.x,.53+(vehicle.lift??0),vehicle.z))
    kickVehicle(vehicle,point,strength,boxes,traffic,room.phase==='offline')
   }
   crowd.hearShot(point,crowd.wanted.level!==wantedBefore)
   renderer.shadowMap.needsUpdate=true
  }
 }
 const equipment=equipmentPlay({scene,camera,char,boxes,fleet:traffic,crowd,player,loadout,effects,throwGrenade:launchGrenade,
  onHit(n){focus=n;feedbackTime=4;ui.impact(false)},onShot:id=>ui.shot(id),toast:message=>ui.toast(message)})
 function selectEquipment(id){
  if(mode!=='walk'||crowd.talking||player.f.action||custody.active)return false
  const previous=loadout.selected
  if(!loadout.select(id))return false
  if(previous!==id){cancelAim();equipment.interrupt()}
  return true
 }
 function reloadEquipment(){
  if(mode==='walk'&&!isPaused&&!crowd.talking&&!player.f.action&&!custody.active)loadout.reload()
 }
 const checkpoint=createCheckpoint(storage)
 restoreParkedPoses(fleet,checkpoint.vehicles,boxes)
 for(const vehicle of fleet)rigs[vehicle.id].updatePose(vehicle)
 const canRestore=(x,z,y)=>canWalk(x,z,boxes,.32,y)&&y+player.height<=ceilingHeight(x,z,y)+.002&&
  (y>2.4||!occupied(x,z))
 const occupied=(x,z)=>traffic.some(vehicle=>nearBody(vehicle,x,z))||crowd.blockedBy(null,x,z)
 function closestTarget(){
  let nearest=null,score=2.05
  for(const n of crowd.all){
   const dx=n.pos.x-pos.x,dz=n.pos.z-pos.z,d=Math.hypot(dx,dz)
   if(!n.f.hp||d>1.85||!crowd.lineClear(pos,n.pos))continue
   const front=(Math.sin(face)*dx+Math.cos(face)*dz)/Math.max(d,.01)
   const cost=d+.32*(1-front)
   if(front>-.25&&cost<score){nearest=n;score=cost}
  }
  return nearest
 }
 const canAttack=()=>!custody.locked&&mode==='walk'&&!isPaused&&!crowd.talking&&!foot.air&&foot.land<=.25&&player.f.hp>0
 function attack(){
  if(!canAttack())return
  if(custody.canPunch){swing(player.f);return}
  crowd.endTalk()
  if(armed()){
   if(player.f.action||pendingSeat||room.phase==='reconnecting')return
   if(loadout.def.capacity||loadout.def.consumable)face=Math.PI-yaw
   equipment.attack(loadout.def.lethal?sniperAiming()&&scopeVisible:aiming);return
  }
  if(swing(player.f,undefined,{bufferHit:true})){focus=closestTarget()}
 }
 function hitPlayer(n,zone,point,amount=16){
  const dx=pos.x-n.pos.x,dz=pos.z-n.pos.z,d=Math.hypot(dx,dz)||1
  const side=(point.x-pos.x)*Math.cos(face)-(point.z-pos.z)*Math.sin(face)>0?1:-1
  if(custody.active||!injure(player.f,amount,side,zone,{responseWindow:.65}))return false
  equipment.interrupt();cancelAim();crowd.endTalk();knockX=dx/d;knockZ=dz/d;focus=n;feedbackTime=4;ui.impact(true);return true
 }
 function returnToHome(){
  const base=room.phase==='offline'?garage:safeSpawn
  const candidates=[base,{x:base.x,z:base.z+2},{x:base.x+1.1,z:base.z-1.1}]
  const safe=candidates.find(point=>canWalk(point.x,point.z,boxes)&&!occupied(point.x,point.z))??base
  yaw=room.phase==='offline'?garage.yaw:.05
  resetWalk(safe.x,safe.z,Math.PI-yaw)
 }
 function respawn(arrested=false){
  returnToHome()
  revive(player.f);crowd.wanted.clear();mission.cancel()
  const failed=episode.fail(arrested?'체포로 의뢰 중단':'다운으로 의뢰 중단')
  focus=null
  const place=room.phase==='offline'?'차고지':'부두 정문'
  ui.toast((arrested?'체포 후 '+place+'에서 복귀':place+'에서 정신을 차렸어')+(failed?' · 수첩에서 재시도':''))
 }
 function useWestBank(tag){
  if(tag!=='HOME'){westBank.operate(tag);return tag==='PARK'?'분수 펌프 시험 · 8초':'선착장 신호 시험 · 8초'}
  if(crowd.wanted.level)return '추격이 끝난 뒤 차고지에서 쉴 수 있어.'
  player.f.hp=player.f.maxHealth
  const personal=cars['garage-touring']
  if(personal.x<garage.front-.35&&atGarage(personal.x,personal.z)){
   personal.dents=undefined;personal.collision=null;renderer.shadowMap.needsUpdate=true
   return '체력 회복 · 개인 차량 수리 완료'
  }
  return '체력 회복 · 개인 차량을 차고에 세우면 수리할 수 있어'
 }
 function talkCandidate(){return canAct()?crowd.candidate(pos):null}
 function converse(){
  if(crowd.talking){crowd.endTalk();return true}
  const n=talkCandidate();if(!n)return false
  clearControls();crowd.beginTalk(n);player.f.queued=false;return true
 }
 const driving=()=>mode==='drive'
 const sniperAiming=()=>loadout.selected==='sniper'&&aiming&&mode==='walk'&&!isPaused&&!custody.active&&!foot.air&&!player.f.action
 const canAct=()=>!sniperAiming()&&!custody.active&&!pendingSeat&&mode==='walk'&&!isPaused&&!foot.air&&foot.land<.25&&!player.f.action
 const canJump=()=>!sniperAiming()&&!custody.active&&!pendingSeat&&mode==='walk'&&!isPaused&&!crowd.talking&&!player.f.action&&foot.canJump
 function jump(){if(canJump())foot.jump()}
 let drag=null,clickOrigin=null,stickId=null
 const pedalPointers=new Map()
 const releasePointer=(element,id)=>{if(id!=null&&element.hasPointerCapture(id))element.releasePointerCapture(id)}
 function clearControls(){
  if(drag)releasePointer(canvas,drag.id)
  releasePointer(document.querySelector('#stick'),stickId)
  drag=clickOrigin=stickId=null
  for(const [button,ids] of pedalPointers){
   for(const id of ids)releasePointer(button,id)
   ids.clear();button.classList.remove('held')
  }
  cancelAim();equipment.interrupt();resetInput();player.f.queued=false;pedals.clear()
 }
 function prompt(){
  if(pendingSeat)return '운전석 확인 중…'
  if(driving())return Math.abs(car.speed)>.45?'정차 후 하차':'하차'
  if(crowd.talking)return '대화 마치기'
  const candidate=canAct()&&nearestDoor()
  if(candidate)return candidate.car.setup.name+' 탑승'
  const resident=talkCandidate();return resident?resident.name+' · 대화':''
 }
 const blockedByCar=(vehicle,x,z)=>traffic.some(other=>vehicle!==other&&nearBody(other,x,z))
 const blockedAtDoor=(vehicle,x,z)=>blockedByCar(vehicle,x,z)||crowd.blockedBy(null,x,z)
 function nearestDoor(qualifies){
  if(pos.y-groundHeight(pos.x,pos.z)>.16)return null
  let nearest=null,distance=Infinity
  for(const vehicle of fleet){
   if(vehicle.localOnly&&room.phase!=='offline')continue
   if(qualifies&&!qualifies(vehicle))continue
   const access=availableDoor(vehicle,pos,boxes,(x,z)=>blockedAtDoor(vehicle,x,z))
   if(!access||vehicle.owner!=null||Math.abs(vehicle.speed)>.45)continue
   const d=Math.hypot(pos.x-access.door.x,pos.z-access.door.z)
   if(d<distance){distance=d;nearest={...access,car:vehicle}}
  }
  return nearest
 }
 function startTransition(destination,next){
  if(next==='enter')saveCheckpoint()
  mode=next;clearControls()
  car.speed=car.travel=car.accel=car.throttle=car.shiftDelay=car.remainder=0;car.braking=false
  lastSide=destination.side
  transition={time:0,from:{x:pos.x,z:pos.z},door:destination.door,side:lastSide,
   x:car.x,z:car.z,heading:car.heading,face}
  renderer.shadowMap.needsUpdate=true
 }
 function interactCar(){
  if(mode==='walk'){
   if(crowd.talking){crowd.endTalk();return true}
   if(!canAct())return true
   const destination=nearestDoor();if(!destination)return false
   if(room.phase==='connected'){
    const id=destination.car.id
    if(!room.send({t:'move',p:playerPacket()})||!room.send({t:'seat',car:id,side:destination.side})){
     ui.toast('서버와 통신 중이야. 다시 시도해');return true
    }
    pendingSeat={id,deadline:performance.now()+2500};clearControls()
   }else if(room.phase==='offline'){
    car=destination.car;startTransition(destination,'enter')
   }
  }else if(driving()){
   if(Math.abs(car.speed)>.45){ui.toast('브레이크로 정차한 뒤 하차해');return true}
   const destination=safeExit(car,boxes,lastSide,(x,z)=>blockedAtDoor(car,x,z))
   if(!destination){ui.toast('차 양옆에 공간이 없어. 조금 옮겨서 정차해');return true}
   startTransition(destination,'exit')
  }
  return true
 }
 function cancelTransition(){
  const joining=mode==='enter',prior=transition
  car.door=0;transition=vehiclePose=null;clearControls()
  mode=joining?'walk':'drive'
  if(joining){face=prior.face;plantFeet(prior.from.x,prior.from.z)}
  else pos.set(car.x,0,car.z)
  actor.visible=joining
  if(joining)releaseSeat()
  renderer.shadowMap.needsUpdate=true
 }
 function updateTransition(dt){
  const joining=mode==='enter'
  const changed=Math.hypot(car.x-transition.x,car.z-transition.z)>.09||Math.abs(car.heading-transition.heading)>.09
  const origin=joining?transition.from:doorPoint(car,lastSide,.05)
  if(changed||player.f.action||!clearPath(origin,transition.door,boxes,.32,(x,z)=>blockedAtDoor(car,x,z))){
   cancelTransition();ui.toast('차량 주변이 막혀 승하차가 중단됐어');return
  }
  transition.time+=dt
  const pose=entryPose(car,transition,joining)
  car.door=rigs[car.id].hinged?pose.opening:0
  vehiclePose=pose;walkSpeed=pose.speed
  pos.set(pose.x,0,pose.z);actor.position.set(pose.x,pose.y,pose.z)
  face=pose.face;actor.rotation.set(0,face,0);actor.visible=pose.visible;char.root.position.y=0
  if(!car.setup.bike||!pose.ride)char.update(dt,pose.speed,car.setup.bike?{}:{vehicle:{side:lastSide,crouch:pose.crouch,reach:pose.reach}})
  renderer.shadowMap.needsUpdate=true
  if(transition.time<entryTime)return
  car.door=0
  if(joining){
   mode='drive';pos.set(car.x,0,car.z);actor.visible=!!car.setup.bike
   if(!offline&&car===cars.touring)mission.board()
  }else{
   mode='walk';actor.visible=true;plantFeet(pos.x,pos.z)
   releaseSeat()
   if(!offline&&car===cars.touring&&mission.exit())ui.toast('FIRST DRIVE 완료 · 주행 기록 저장')
  }
  transition=vehiclePose=null;clearControls()
 }
 function playerPacket(){
  return packPlayer({x:pos.x,z:pos.z,y:actor.position.y+char.root.position.y,face:wrapAngle(face),
   speed:isPaused?0:walkSpeed,jump:foot.phase,land:foot.land,visible:actor.visible,
   crouch:vehiclePose?.crouch??0,reach:vehiclePose?.reach??0,side:vehiclePose?lastSide:0})
 }
 function releaseSeat(){
  if(!localSeat)return
  localSeat=null
  if(!room.send({t:'release',p:playerPacket()}))room.interrupt()
 }
 function resetWalk(x,z,direction,floor){
  pendingSeat=localSeat=transition=vehiclePose=null;mode='walk';car=cars.touring
  face=direction;plantFeet(x,z,floor)
  actor.visible=true
  crowd.endTalk();clearControls();walkSpeed=0
  renderer.shadowMap.needsUpdate=true
 }
 function sampleFleet(frame){
  if(!frame)return
  const {latest,a,b,fraction}=frame
  for(const vehicle of fleet){
   const next=latest.cars.get(vehicle.id)
   if(!next)continue
   vehicle.owner=next.owner
   if(localSeat===vehicle.id)continue
   const first=a.cars.get(vehicle.id),last=b.cars.get(vehicle.id)??next
   const pose=first?.owner===last.owner?
    blendPose(first,last,fraction,'heading',['x','z','speed','steer','accel','door']):last
   if(Math.hypot(pose.x-vehicle.x,pose.z-vehicle.z)>.006||Math.abs(vehicle.door-pose.door)>.005)remoteShadow=true
   vehicle.travel=Math.hypot(pose.x-vehicle.x,pose.z-vehicle.z)*Math.sign(pose.speed)
   Object.assign(vehicle,pose,{owner:next.owner})
  }
 }
 const room=createRoomClient({
  change(){ui.updateRoom();if(room.phase==='offline'&&room.message&&!ui.isOpen())ui.toast(room.message)},
  join(p,resumed){
   civilians.clear()
   if(!resumed)offline={x:pos.x,y:pos.y,z:pos.z,face,yaw,pitch,distance,cars:fleet.map(vehicle=>({...vehicle,collision:null}))}
   localSeat=null
   const frame=room.sample(performance.now())
   for(const vehicle of fleet){
    if(vehicle.localOnly)Object.assign(vehicle,parkedSpawns.get(vehicle.id),{dents:undefined,collision:null})
    else Object.assign(vehicle,frame.latest.cars.get(vehicle.id))
   }
   // The server may return a former driver near a blocked side. Recheck
   // against the live client world before restoring their walk position.
   const safe=canWalk(p.x,p.z,boxes)&&!occupied(p.x,p.z)
   resetWalk(safe?p.x:safeSpawn.x,safe?p.z:safeSpawn.z,p.face)
   ui.toast(resumed?'방에 다시 연결됐어':'비공개 방에 연결됐어')
  },
  leave(){
   for(const [index,vehicle] of fleet.entries())Object.assign(vehicle,offline.cars[index],{owner:null,dents:offline.cars[index].dents,collision:null})
   yaw=offline.yaw;pitch=offline.pitch;distance=offline.distance
   resetWalk(offline.x,offline.z,offline.face,floorAt(offline.x,offline.z,offline.y));presence.clear();offline=null
  },
  suspend(){
   pendingSeat=localSeat=null;presence.clear();clearControls()
   if(transition||driving())resetWalk(pos.x,pos.z,face)
   ui.toast('연결이 끊겼어. 다시 연결하는 중…')
  },
  seat(id,pose){
   const request=pendingSeat
   pendingSeat=null
   if(!pose){ui.toast('다른 플레이어가 먼저 탔거나 차량에서 멀어졌어');return}
   localSeat=id
   const vehicle=cars[id]
   Object.assign(vehicle,pose)
   const destination=availableDoor(vehicle,pos,boxes,(x,z)=>blockedAtDoor(vehicle,x,z))
   if(request?.id!==id||!destination||!canAct()){
    releaseSeat();ui.toast('차량에 접근할 수 없어');return
   }
   car=vehicle;startTransition(destination,'enter')
  },
  correction(id,pose){
   if(localSeat!==id)return
   Object.assign(cars[id],pose,{remainder:0,travel:0,throttle:0,shiftDelay:0})
  }
 })
 function startRoom(endpoint,request){
  if(custody.active){ui.toast('석방 후에 방에 입장할 수 있어');return}
  if(mode!=='walk'){ui.toast('차량에서 내린 뒤 방에 입장해');return}
  if(episode.openingActive){ui.toast('스토리 의뢰를 마치거나 수첩에서 중단한 뒤 방에 입장해');return}
  saveCheckpoint();civilians.clear();room.start(endpoint,request)
 }
 const ui=createUI({loadout,selectEquipment,reloadEquipment,aiming:()=>aiming,scoped:()=>scopeVisible,inCell:()=>custody.canPunch,canAttack,useWestBank,testSignal:market.testSignal,episode,useItem,foot,canAct,canJump,converse,crowd,player,feedback:()=>feedbackTime>0?focus:null,get car(){return driving()?car:cars.touring},get cars(){return fleet},room,startRoom,missionEnabled:()=>!offline&&!custody.active&&!episode.openingActive,mission,driving,prompt,interactCar,mode:()=>mode,stats:()=>({ms:recentFrameMs,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,width:canvas.width,height:canvas.height}),pos,yaw:()=>yaw,setPaused:value=>{isPaused=value;clearControls()},quality:()=>({auto:'자동',high:'높음',low:'낮음'}[quality]),cycleQuality:()=>{quality=nextQuality(quality);writeQuality(quality)
  const settings=profile()
  renderer.setPixelRatio(settings.pixelRatio)
  sunlight.castShadow=renderer.shadowMap.enabled=settings.worldShadows
  for(const mesh of playerMeshes)mesh.castShadow=settings.playerShadows
  renderer.shadowMap.needsUpdate=true}})
 const pressed=code=>keys.has(code)?1:0
 window.addEventListener('keydown',e=>{if(crowd.talking||custody.locked||isPaused||document.querySelector('#game').inert)return;
  if(!e.repeat&&mode==='walk'){
   const slot={Digit1:'fists',Digit2:'pistol',Digit3:'shotgun',Digit4:'bat',Digit5:'sniper',Digit6:'grenade'}[e.code]
   if(slot){selectEquipment(slot);return}
   if(e.code==='KeyR'){reloadEquipment();return}
   if(e.code==='KeyQ'){ui.show('equipment');return}
  }
  if(e.code==='KeyF'&&!e.repeat){attack();return}if(!isPaused&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code)
  if(mode==='walk'&&!e.repeat){
   if(e.code.startsWith('Shift'))foot.shift()
   if(e.code==='Space')jump()
  }}})
 window.addEventListener('keyup',e=>keys.delete(e.code))
 window.addEventListener('blur',clearControls);document.addEventListener('visibilitychange',()=>{
  if(document.hidden)saveCheckpoint()
  clearControls();last=performance.now()
 })
 window.addEventListener('pagehide',saveCheckpoint)
 canvas.addEventListener('mousedown',e=>{
  if(isPaused||crowd.talking||mode!=='walk'||!armed()&&!custody.canPunch)return
  if(e.button===2)aiming=!custody.active&&!!loadout.def.capacity&&!foot.air&&!player.f.action
  if(e.button===0)clickOrigin={x:e.clientX,y:e.clientY}
 })
 canvas.addEventListener('mouseup',e=>{
  if(e.button===2)cancelAim()
  if(e.button===0&&clickOrigin){
   if(Math.hypot(e.clientX-clickOrigin.x,e.clientY-clickOrigin.y)<7)attack()
   clickOrigin=null
  }
 })
 canvas.onpointerdown=e=>{if(isPaused||crowd.talking||custody.locked)return;
  if(drag)return;canvas.focus();canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY}}
 canvas.onpointermove=e=>{if(!drag||e.pointerId!==drag.id||isPaused||custody.locked)return;lookHold=2.2;yaw+=(e.clientX-drag.x)*.0045;pitch=clamp(pitch+(e.clientY-drag.y)*.004,-.19,.93);drag.x=e.clientX;drag.y=e.clientY}
 window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&e.button===2)cancelAim()});
 canvas.onlostpointercapture=e=>{if(drag?.id===e.pointerId)drag=null};canvas.onpointerup=e=>{if(drag?.id===e.pointerId)drag=null};canvas.oncontextmenu=e=>e.preventDefault()
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance+e.deltaY*.006,2.3,7.4)},{passive:false})
 const stick=document.querySelector('#stick'),knob=stick.firstElementChild,jumpButton=document.querySelector('#jump')
 const adjust=e=>{const b=stick.getBoundingClientRect();joystick.set((e.clientX-b.left-b.width/2)/30,(e.clientY-b.top-b.height/2)/30).clampLength(0,1);knob.style.transform='translate('+joystick.x*24+'px,'+joystick.y*24+'px)'}
 for(const b of document.querySelectorAll('[data-pedal]')){
  const ids=new Set();pedalPointers.set(b,ids);b.onpointerdown=e=>{if(!driving()||isPaused)return;b.setPointerCapture(e.pointerId);ids.add(e.pointerId);pedals.add(b.dataset.pedal);b.classList.add('held')}
  b.onlostpointercapture=e=>{ids.delete(e.pointerId);if(!ids.size){pedals.delete(b.dataset.pedal);b.classList.remove('held')}}
 }
 stick.onpointerdown=e=>{if(stickId!==null||crowd.talking||custody.locked)return;stickId=e.pointerId;stick.setPointerCapture(e.pointerId);adjust(e)};stick.onpointermove=e=>{if(!custody.locked&&!crowd.talking&&stick.hasPointerCapture(e.pointerId))adjust(e)};stick.onlostpointercapture=e=>{if(stickId!==e.pointerId)return;stickId=null;joystick.set(0,0);knob.style.transform=''}
 const punchButton=document.querySelector('#punch');punchButton.onpointerdown=e=>{e.preventDefault();punchButton.setPointerCapture(e.pointerId);attack()}
 document.querySelector('#gear-menu').onclick=()=>{if(!isPaused&&mode==='walk'&&!crowd.talking)ui.show('equipment')}
 document.querySelector('#gear-reload').onclick=reloadEquipment
 document.querySelector('#gear-next').onclick=()=>{
  const ids=Object.keys(gear).filter(id=>loadout.items[id])
  selectEquipment(ids[(ids.indexOf(loadout.selected)+1)%ids.length])
 }
 document.querySelector('#gear-aim').onclick=()=>{if(aiming)cancelAim();else if(!custody.active&&!isPaused&&mode==='walk'&&!crowd.talking&&loadout.def.capacity&&!foot.air&&!player.f.action)aiming=true}
 jumpButton.onpointerdown=e=>{e.preventDefault();jumpButton.setPointerCapture(e.pointerId);jump()}
 window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)})
 const cameraDirection=new THREE.Vector3(),anchor=new THREE.Vector3(),eye=new THREE.Vector3(),aim=new THREE.Vector3(),reach=new THREE.Vector3()
 const lens=new THREE.Vector3(),scopeStart=new THREE.Vector3()
 function setZoom(zoom){
  if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix()}
 }
 function alignScope(position){
  if(!stance.eye||!sniperAiming()||!position(lens))return false
  scopeStart.set(pos.x,pos.y+1.46,pos.z)
  if(cameraFraction(scopeStart,lens,boxes)<.98)return false
  const blend=THREE.MathUtils.smootherstep(stance.eye,0,1)
  camera.position.lerp(lens,blend)
  camera.position.y=Math.max(pos.y+1.04,camera.position.y)
  const flat=Math.cos(pitch)
  aim.set(Math.sin(yaw)*flat,-Math.sin(pitch),-Math.cos(yaw)*flat).add(camera.position)
  camera.lookAt(aim)
  scopeVisible=stance.eye===1
  hideScopeBody=blend>.50
  if(scopeVisible)setZoom(4)
  camera.updateMatrixWorld()
  return scopeVisible
 }
 let actualArm=distance,face=actor.rotation.y,elapsed=0,last=performance.now(),frameSum=0,frameCount=0,trackedX=0,trackedZ=spawn.z,shadowTick=0,followHeight=actor.position.y
 function positionCamera(dt,initial=false){
  cameraBlend=damp(cameraBlend,driving()?1:0,5,dt)
  shoulder=damp(shoulder,aiming&&!driving()?1:0,12,dt)
  const localRoom=rowRoomAt(pos.x,pos.z)
  const roomDistance=localRoom?Math.min(distance,2.65):distance
  const viewDistance=THREE.MathUtils.lerp(roomDistance,Math.min(roomDistance,2.45),shoulder)
  const arm=viewDistance+cameraBlend*car.setup.camera
  const tilt=pitch+cameraBlend*.115-loadout.recoil*(loadout.selected==='sniper'?.038:.021)
  const sn=Math.sin(yaw),cs=Math.cos(yaw),lift=Math.sin(tilt),flat=Math.cos(tilt)
  followHeight=initial?actor.position.y:damp(followHeight,actor.position.y,12,dt)
  const vehicleHeight=car.setup.cameraHeight+(room.phase==='offline'?car.lift:0)
  const sideOffset=(.26+.43*shoulder)*(1-cameraBlend)
  const height=1.54-.08*shoulder
  anchor.set(pos.x+sideOffset*cs,
   (followHeight+height)*(1-cameraBlend)+vehicleHeight*cameraBlend,pos.z+sideOffset*sn)
  eye.set(anchor.x-sn*arm*flat,anchor.y+lift*arm,anchor.z+cs*arm*flat)
  let fraction=cameraFraction(anchor,eye,boxes)
  for(const vehicle of traffic){
   if(vehicle===car&&mode!=='walk')continue
   const a=localPoint(vehicle,anchor.x,anchor.z),b=localPoint(vehicle,eye.x,eye.z)
   fraction=Math.min(fraction,cameraFraction({...a,y:anchor.y},{...b,y:eye.y},[[-vehicle.width/2,vehicle.width/2,-vehicle.length/2,vehicle.length/2,vehicle.height]]))
  }
  if(anchor.x<archive.front && archiveAccess(pos.x,pos.z,0) && eye.y>archive.ceiling-.16){
   fraction=Math.min(fraction,(archive.ceiling-.16-anchor.y)/(eye.y-anchor.y))
  }
  if((atStation(pos.x,pos.z)||insidePremises(pos.x,pos.z)||insideWeaponShop(pos.x,pos.z))&&eye.y>3.19&&eye.y>anchor.y)fraction=Math.min(fraction,Math.max(.04,((atStation(pos.x,pos.z)?3.19:3.36)-anchor.y)/(eye.y-anchor.y)))
  if(atGarage(pos.x,pos.z)&&eye.y>garage.ceiling-.16&&eye.y>anchor.y){
   fraction=Math.min(fraction,Math.max(.04,(garage.ceiling-.16-anchor.y)/(eye.y-anchor.y)))
  }
  if(insideWorks(pos.x,pos.z)&&eye.y>3.58&&eye.y>anchor.y)fraction=Math.min(fraction,Math.max(.04,(3.58-anchor.y)/(eye.y-anchor.y)))
  if(localRoom&&eye.y>anchor.y){
   const ceiling=rowCeiling(localRoom,pos.x,pos.y)-.14
   if(eye.y>ceiling)fraction=Math.min(fraction,Math.max(.04,(ceiling-anchor.y)/(eye.y-anchor.y)))
  }
  const availableArm=arm*fraction
  actualArm=initial?availableArm:availableArm<actualArm?availableArm:damp(actualArm,availableArm,8,dt)
  reach.copy(eye).sub(anchor).multiplyScalar(actualArm/arm)
  camera.position.copy(anchor).add(reach);camera.position.y=Math.max(.24,camera.position.y)
  aim.set(anchor.x+sn*2.2,anchor.y+.12-lift*2.2,anchor.z-cs*2.2)
  if(shake){camera.position.x+=Math.sin(elapsed*63)*.1*shake;camera.position.y+=Math.cos(elapsed*80)*.075*shake}
  camera.lookAt(aim)
 }
 const saved=checkpoint.current
 const restored=resolveCheckpoint(saved,[garage,...dockSpawnPoints],floorAt,canRestore)
 if(restored){
  if(saved){yaw=saved.yaw;pitch=saved.pitch;distance=saved.distance;face=saved.face}
  plantFeet(restored.x,restored.z,restored.y)
 }
 updateTown(true,pos);updateRow(pos,0);market.update(pos);westBank.update(0,0,pos)
 trackedX=pos.x;trackedZ=pos.z
 sunlight.position.x=trackedX+34;sunlight.target.position.x=trackedX
 sunlight.position.z=trackedZ-49;sunlight.target.position.z=trackedZ-9
 positionCamera(0,true)
 function groundHeight(x,z){
  if(useTownDriveMask(x,z))return oldTownHeight(x,z)
  if(atStation(x,z))return .092
  if(atGarage(x,z))return .083
  if(insidePremises(x,z)||insideWeaponShop(x,z))return .052
  if((x< -40 && z< -43 && z> -46)||(x< -40 && z> -31 && z< -27))return .082
  if(archiveAccess(x,z,0)&&x<archive.front+.7)return .07
  const lane=Math.abs(x)
  const edge=Math.min(lane-6,10.9-lane,Math.max(-43-z,z+31))
  return .008+.083*clamp(edge/.18,0,1)
 }
 function ceilingHeight(x,z,feet){
  const room=rowRoomAt(x,z)
  return room?rowCeiling(room,x,feet):x<archive.front&&archiveAccess(x,z,0)?archive.ceiling:
   atStation(x,z)?station.ceiling:atGarage(x,z)?garage.ceiling:insideWorks(x,z)?3.75:
   (insidePremises(x,z)||insideWeaponShop(x,z))?3.44:Infinity
 }
 function floorAt(x,z,feet,airborne=false){
  const localRoom=rowRoomAt(x,z)
  const base=localRoom?rowFloor(localRoom,x,z,feet,airborne):groundHeight(x,z)
  return supportHeight(x,z,feet,base,surfaces)
 }
 function plantFeet(x,z,floor=groundHeight(x,z)){
  foot.reset(floor)
  pos.set(x,foot.height,z);actor.position.copy(pos);shadow.position.y=.014
  uprightRider(actor,char,face)
 }
 let saveClock=0,sampleClock=0,checkpointEnabled=false
 function rememberCheckpoint(){
  if(!checkpointEnabled||room.phase!=='offline'||offline||custody.active||transition||player.f.hp<=0)return
  const point=driving()?safeExit(car,boxes,lastSide,(x,z)=>blockedAtDoor(car,x,z))?.door:pos
  if(!point||(!driving()&&foot.air))return
  const {x,z}=point,y=floorAt(x,z,driving()?groundHeight(x,z):foot.height)
  checkpoint.sample({x,y,z,face:driving()?Math.PI-car.heading:face,yaw,pitch,distance},{
   offline:true,grounded:driving()||Math.abs(y-foot.height)<.08,safe:canRestore(x,z,y)
  })
 }
 function saveCheckpoint(){
  rememberCheckpoint()
  if(checkpointEnabled&&room.phase==='offline'&&!offline){
   checkpoint.sampleVehicles(parkedPoses(fleet,parkedSpawns),true)
  }
  checkpoint.flush()
 }
 const bikeSeat=new THREE.Vector3(),bikeRotation=new THREE.Quaternion()
 function poseMotorcycle(dt){
  const rig=rigs[car.id],seated=driving()?1:vehiclePose.ride
  rig.riderPosition(bikeSeat)
  rig.riderRotation(bikeRotation)
  if(driving()){
   actor.position.copy(bikeSeat)
   actor.quaternion.copy(bikeRotation)
  }else{
   const step=mode==='enter'?transition.from:transition.door
   actor.position.set(step.x,groundHeight(step.x,step.z),step.z).lerp(bikeSeat,seated)
   actor.position.y+=Math.sin(seated*Math.PI)*.13
   actor.quaternion.slerp(bikeRotation,seated)
  }
  char.update(dt,driving()?0:vehiclePose.speed,{motorcycle:{seated,rig}})
 }
 let slowSamples=0,performanceHint=false
 const draw=now=>{
  if(contextLost)return
  // After a long initialization or tab resume, rAF can carry an earlier frame timestamp.
  const realDt=Math.max(0,(now-last)/1000);last=now;const dt=Math.min(realDt,.07)
  if(pendingSeat&&now>=pendingSeat.deadline){pendingSeat=null;ui.toast('운전석 응답이 늦어. 다시 시도해')}
  const frame=room.sample(now)
  if(!document.hidden)sampleFleet(frame)
  room.tick(now,()=>{
   const move={p:playerPacket()}
   if(localSeat)move.v=packVehicle({...cars[localSeat],heading:wrapAngle(cars[localSeat].heading)})
   return move
  })
  if(!document.hidden&&!isPaused&&room.phase!=='reconnecting'){
   elapsed+=dt
   stance.update(Math.min(realDt,.25),sniperAiming())
   if(updateTown(room.phase==='offline',pos))renderer.shadowMap.needsUpdate=true
   if(pressed('ArrowRight')||pressed('ArrowLeft'))lookHold=2.2
   yaw+=(pressed('ArrowRight')-pressed('ArrowLeft'))*1.65*dt
   coffee=Math.max(0,coffee-dt)
   advance(player.f,dt);feedbackTime=Math.max(0,feedbackTime-dt)
   if(player.f.action==='down'&&player.f.downTime>3.2)respawn()
   let speed=0
   custody.update(dt);custodyView.update(custody)
   if(custody.officer){
    custodyView.pose(dt,custody,actor,custody.officer);walkSpeed=0
    renderer.shadowMap.needsUpdate=true
   }else if(custody.locked){walkSpeed=0}
   else if(transition){updateTransition(dt)}
   else if(driving()){
    const input={forward:Math.max(pressed('KeyW'),pressed('ArrowUp'),Number(pedals.has('gas'))),back:Math.max(pressed('KeyS'),pressed('ArrowDown'),Number(pedals.has('brake'))),steer:clamp(pressed('KeyD')-pressed('KeyA')+joystick.x,-1,1),handbrake:pressed('Space')||pedals.has('hold')}
    Object.assign(previousCar,{x:car.x,z:car.z,heading:car.heading,speed:car.speed,width:car.width,length:car.length})
    stepDrive(car,input,boxes,dt,traffic,room.phase==='offline')
    const strikes=pedestrianImpacts(dt,previousCar,car,crowd.all,(resident,damage,impact)=>{
     if(!crowd.vehicleHit(resident,car,damage,impact))return false
     effects.emit('dust',resident.pos.x,resident.pos.y+.1,resident.pos.z,impact.knockout?7:4,impact.x,impact.z)
     focus=resident;feedbackTime=2.5
     return true
    })
    if(strikes)car.speed*=Math.pow(.85,strikes)
    speed=Math.abs(car.speed)
    pos.x=car.x;pos.z=car.z;actor.visible=!!car.setup.bike;mission.tick(!offline&&car===cars.touring)
    lookHold=Math.max(0,lookHold-dt)
    if(!drag&&!lookHold){const error=car.heading-yaw;yaw+=Math.atan2(Math.sin(error),Math.cos(error))*(1-Math.exp(-(speed>.6?3.4:1.5)*dt))}
   }else{
   const ax=pressed('KeyD')-pressed('KeyA')+joystick.x,az=pressed('KeyW')+pressed('ArrowUp')-pressed('KeyS')-pressed('ArrowDown')-joystick.y
   const length=Math.max(1,Math.hypot(ax,az)),sn=Math.sin(yaw),cs=Math.cos(yaw)
   const pace=foot.rate(pressed('ShiftLeft')||pressed('ShiftRight'),joystick.length(),stickId!==null)*(player.f.action==='punch'?.36:player.f.action?0:1)
   const rate=sniperAiming()?0:
    (custody.active?Math.min(pace,1.85):pace)*(coffee>0&&pace>1.85?1.15:1)
   const targetX=(ax*cs+az*sn)*rate/length,targetZ=(ax*sn-az*cs)*rate/length
   const accelerate=!foot.air&&!player.f.action
   if(accelerate)accelerateOnFoot(velocity,targetX,targetZ,dt)
   else{
    const response=foot.air?1.15:(ax||az?9:16)
    velocity.x=damp(velocity.x,targetX,response,dt)
    velocity.y=damp(velocity.y,targetZ,response,dt)
   }
   const ox=pos.x,oz=pos.z
   const stagger=player.f.action==='hit'?.55:0
   movePlayer(pos,(velocity.x+stagger*knockX)*dt,(velocity.y+stagger*knockZ)*dt,boxes,occupied,foot.height)
   const floor=floorAt(pos.x,pos.z,foot.height,foot.air)
   const landing=foot.advance(dt,floor,ceilingHeight(pos.x,pos.z,foot.height)-player.height)
   if(landing)effects.land(pos.x,floor,pos.z,landing)
   pos.y=foot.height
   shadow.position.y=floor-pos.y+.014
   shadow.material.opacity=1-.65*clamp(pos.y-floor,0,1)
   const dx=pos.x-ox,dz=pos.z-oz
   speed=dt>0?Math.hypot(dx,dz)/dt:walkSpeed
   // Lose momentum along blocked axes without affecting air control or knockback.
   if(accelerate&&dt>0)velocity.set(dx/dt,dz/dt)
   const previousFace=face
   const facing=player.f.action==='punch'?focus:crowd.talking
   if((armed()&&(aiming||loadout.recoil>.1||equipment.throwing))||facing||speed>.07){const desired=armed()&&(aiming||loadout.recoil>.1||equipment.throwing)?Math.PI-yaw:facing?Math.atan2(facing.pos.x-pos.x,facing.pos.z-pos.z):Math.atan2(dx,dz);face+=clamp(Math.atan2(Math.sin(desired-face),Math.cos(desired-face))*(1-Math.exp(-14*dt)),-9*dt,9*dt)}
   actor.rotation.set(0,face,0);actor.position.copy(pos)
   char.update(dt,speed,{...combatPose(player.f),jump:foot.phase,land:foot.land,
    guard:feedbackTime>0&&focus?.f.hp>0&&Math.hypot(focus.pos.x-pos.x,focus.pos.z-pos.z)<8,
    turn:dt>0?(face-previousFace)/dt:0})
   if(!custody.active&&player.f.action==='punch')contact(player.f,char,pos,crowd.all,crowd.lineClear,(n,zone,point)=>{
    if(crowd.receive(n,pos,zone,point)){focus=n;feedbackTime=4;ui.impact(false)}
   })
   }
   updateGrenades(dt)
   for(const vehicle of fleet){
    const mounted=vehicle===car&&(driving()||(vehiclePose?.ride??0)>.6)
    rigs[vehicle.id].updatePose({...vehicle,dt,mounted,lift:room.phase==='offline'?vehicle.lift:0})
    effects.vehicle(vehicle,dt,Math.hypot(vehicle.x-pos.x,vehicle.z-pos.z))
    vehicle.travel=0;vehicle.impact=0;vehicle.collision=null
   }
   if(car.setup.bike&&(driving()||vehiclePose?.ride))poseMotorcycle(dt)
   if(!transition&&mode==='walk')walkSpeed=speed
   else if(driving())walkSpeed=0
   remoteShadow=presence.update(frame,room.session?.id,dt)||remoteShadow
   player.available=!custody.active&&mode==='walk'&&player.f.hp>0&&!foot.air
   const progress=episode.update(dt,{x:pos.x,z:pos.z,speed,inVehicle:driving(),driving:driving()&&car===cars.touring,onFoot:player.available})
   if(progress)ui.toast(progress.message)
   player.inVehicle=driving()?car:null
   player.exposed=!custody.active&&player.f.hp>0&&(mode==='walk'||driving())
   player.legacyArrest=room.phase!=='offline'
   const police=squads.update(dt,pos,player.inVehicle,crowd.wanted,!player.legacyArrest)
   trafficProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)
   trafficView.setFromProjectionMatrix(trafficProjection)
   walkers.length=0
   if(!driving()&&pos.y<1.35&&!foot.air)walkers.push(pos)
   for(const resident of crowd.all)if(resident.pos.y<1.35&&!resident.policeOrder?.aboard)walkers.push(resident.pos)
   remoteShadow=civilians.update(dt,pos,{enabled:room.phase==='offline'&&!custody.active,
    limit:coarse&&recentFrameMs>34?1:trafficRigs.length,walkers,inView:trafficInView})||remoteShadow
   for(let i=fleet.length;i<traffic.length;i++){
    const vehicle=traffic[i]
    effects.vehicle(vehicle,dt,Math.hypot(vehicle.x-pos.x,vehicle.z-pos.z))
    vehicle.collision=null
   }
   player.squadObserver=police.observed
   remoteShadow ||= police.moving
   crowd.update(dt,camera,player,hitPlayer,(outcome,officer)=>{
    if(outcome==='arrest')beginCustody(officer)
    else ui.toast(outcome==='warning'?'항만 경찰 · 경고 후 조사 종료':'수배 해제')
   },(officer,from,to,vehicle)=>{
    effects.muzzle(from,2);effects.trace(from,to);ui.shot('pistol')
    if(vehicle)effects.emit('sparks',to.x,to.y,to.z,4)
    else if(player.exposed)hitPlayer(officer,'body',to,18)
   })
   if(typeof portUpdate==='function')portUpdate(dt,elapsed)
   if(Math.abs(pos.x-trackedX)>10||Math.abs(pos.z-trackedZ)>10){trackedX=pos.x;trackedZ=pos.z;sunlight.position.x=trackedX+34;sunlight.target.position.x=trackedX;renderer.shadowMap.needsUpdate=true;sunlight.position.z=trackedZ-49;sunlight.target.position.z=trackedZ-9}
   const playerShadow=driving()?speed>.06:quality==='high'&&(speed>.06||foot.air||foot.land>0||!!player.f.action)
   if(((playerShadow||remoteShadow)&&elapsed-shadowTick>.09)||(crowd.shadowDirty&&elapsed-shadowTick>.32)){renderer.shadowMap.needsUpdate=true;shadowTick=elapsed;remoteShadow=false}
   if(custody.officer)custodyView.camera(camera,actor,custody.officer,dt)
   else positionCamera(dt)
   const shopChanged=updateWeaponShop(pos),districtChanged=market.update(pos),stationChanged=updateStation(pos),westChanged=westBank.update(dt,elapsed,pos),rowChanged=updateRow(pos,dt)
   const roadChanged=setFirstWorkRoadblock(episode.roadClosed)
   if(updateVisibility()||shopChanged||districtChanged||stationChanged||westChanged||rowChanged||roadChanged)renderer.shadowMap.needsUpdate=true
   scopeVisible=hideScopeBody=false
   camera.updateMatrixWorld()
   equipment.update(dt,{active:mode==='walk'&&!custody.active&&!pendingSeat&&!crowd.talking&&!player.f.action,aiming,
    speed,raise:stance.raise,ready:sniperAiming()&&stance.eye===1,alignScope,pitch:sniperAiming()?-pitch:Math.asin(clamp(camera.getWorldDirection(cameraDirection).y,-1,1))})
   if(!scopeVisible)setZoom(1)
   if((sampleClock+=dt)>=.5){sampleClock=0;rememberCheckpoint()}
   if((saveClock+=dt)>=4){saveClock=0;saveCheckpoint()}
   effects.update(dt,canvas.height)
   ui.update(elapsed);updateGuide(ui.missionGoal(),pos)
   const actorVisible=actor.visible
   if(hideScopeBody)actor.visible=false
   renderer.render(scene,camera)
   actor.visible=actorVisible
   if(elapsed>1){
    frameSum+=realDt;frameCount++
    if(frameCount>=30||frameSum>3){const mean=frameSum/frameCount;recentFrameMs=mean*1000
     if(quality==='auto'&&mean>.032&&autoDpr>.75){autoDpr=Math.max(.75,autoDpr-.15);renderer.setPixelRatio(autoDpr)}
     slowSamples=mean>.05?slowSamples+1:0
     if(!performanceHint&&quality!=='low'&&slowSamples>=3){
      performanceHint=true;ui.toast('화면이 느리면 일시 정지 → 그래픽 품질 → 낮음으로 변경해')
     }
     frameSum=frameCount=0
    }
   }
  }
  requestAnimationFrame(draw)
 }
 if(contextLost)return
 renderer.render(scene,camera);ui.update(0)
 return ()=>{
  checkpointEnabled=true;saveCheckpoint();last=performance.now();requestAnimationFrame(draw)
 }
}
