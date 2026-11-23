import * as THREE from 'three'
import {createLoadout} from './equipment.js'
import {equipmentPlay} from './equipment-play.js'
import {policeChase} from './police-chase.js'
import {buildPoliceStation} from './police-station.js'
import {createCustody,station,atStation} from './custody.js'
import {custodyPresentation} from './custody-presentation.js'
import {buildOldTown} from './old-town.js'
import {useTownDriveMask,oldTownHeight} from './old-town-plan.js'
import {buildMarket} from './market.js'
import {insidePremises} from './market-plan.js'
import {archiveVisibility} from './archive-visibility.js'
import {archive,archiveAccess} from './chart-room.js'
import {createEpisode} from './episode.js'
import {availableDoor,safeExit,nearBody,newDrive,stepDrive,localPoint,doorPoint,clearPath} from './driving.js'
import {createRoomClient,blendPose} from './room-client.js'
import {roomPresence} from './room-presence.js'
import {packPlayer,packVehicle,wrapAngle} from './room-protocol.js'
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
const pos=new THREE.Vector3(spawn.x,0,spawn.z),velocity=new THREE.Vector2()
const keys=new Set(),boxes=[],joystick=new THREE.Vector2()
let yaw=.05,pitch=.13,distance=4.65,isPaused=false
const clamp=THREE.MathUtils.clamp, damp=THREE.MathUtils.damp
const addCollider=(a,b,c,d,h=3,standable=false)=>{if(h>.15)boxes.push([Math.min(a,b),Math.max(a,b),Math.min(c,d),Math.max(c,d),h,standable])}
const resetInput=()=>{keys.clear();joystick.set(0,0);velocity.set(0,0);document.querySelector('#stick i').style.transform=''}
const coarse=matchMedia('(pointer:coarse)').matches
let quality='auto',autoDpr=Math.min(devicePixelRatio,coarse?1:1.5)
const resolution=()=>quality==='low'?.8:quality==='high'?Math.min(devicePixelRatio,1.75):autoDpr
export async function start(onContextLost){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:!coarse,powerPreference:'high-performance',alpha:false})
 let contextLost=false
 canvas.addEventListener('webglcontextlost',e=>{
  e.preventDefault();contextLost=true;onContextLost()
 })
 renderer.setPixelRatio(resolution());renderer.setSize(innerWidth,innerHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x8b94a3);const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.08,420)
 const sunlight=illumination(scene);beacons(scene,addCollider);districtGates(scene,addCollider)
 const surfaceMaps={}
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
 const updateTown=buildOldTown(scene,addCollider,boxes,surfaceMaps)
 const updateStation=buildPoliceStation(scene,addCollider)
 const custodyView=custodyPresentation(scene,char,boxes)
 const updateGuide=missionGuide(scene,camera,groundHeight)
 const surfaces=boxes.filter(box=>box[5])
 const updateVisibility=archiveVisibility(scene,camera)
 const actor=new THREE.Group();actor.add(char.root);scene.add(actor);const shadow=footShadow(actor)
 if(!canWalk(pos.x,pos.z,boxes))for(let x=-3;x<=3;x+=.5){if(canWalk(x,spawn.z,boxes)){pos.x=x;break}}
 const safeSpawn={x:pos.x,z:pos.z}
 actor.position.copy(pos);actor.rotation.y=Math.PI-yaw
 // The contact decal follows every footstep. Reserve moving sun shadows for High.
 const playerMeshes=[]
 char.root.traverse(mesh=>{if(mesh.isMesh){playerMeshes.push(mesh);mesh.castShadow=false}})
 const cars=Object.fromEntries(Object.entries(rigs).map(([id,rig])=>[id,{...newDrive(rig,vehicles[id]),id,door:0}]))
 const fleet=Object.values(cars),traffic=[...fleet],mission=firstDrive(cars.touring),pedals=new Set()
 let car=cars.touring,offline=null,pendingSeat=null,localSeat=null,walkSpeed=0,vehiclePose=null,remoteShadow=false
 for(const vehicle of fleet)rigs[vehicle.id].updatePose(vehicle)
 let mode='walk',transition=null,lastSide=-1,cameraBlend=0,lookHold=0,recentFrameMs=0
 const foot=createFootwork();foot.reset(groundHeight(pos.x,pos.z));pos.y=actor.position.y=foot.height
 const crowd=await createResidents(scene,boxes,cars.touring,traffic,p=>groundHeight(p.x,p.z))
 const squads=policeChase(scene,boxes,traffic,fleet.length,crowd,groundHeight)
 const presence=roomPresence(scene)
 const player={pos,f:fighter(100),height:1.8,available:true}
 const episode=createEpisode()
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
   const safe=[station.release,{x:-94.7,z:-43.5},{x:-91.7,z:-43.5},safeSpawn]
    .find(point=>canWalk(point.x,point.z,boxes)&&!occupied(point.x,point.z))??safeSpawn
   resetWalk(safe.x,safe.z,0);yaw=Math.PI
   crowd.wanted.clear();ui.toast('석방 · 타이드 마켓 경찰서')
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
  const result=episode.use(id,player.f)
  if(result.effect?.heal)player.f.hp+=result.effect.heal
  if(result.effect?.sprintSeconds)coffee=result.effect.sprintSeconds
  return result
 }
 let focus=null,feedbackTime=0,knockX=0,knockZ=0
 let storage
 try{storage=window.localStorage}catch{}
 const loadout=createLoadout(storage)
 let aiming=false
 const armed=()=>loadout.selected!=='fists'
 const equipment=equipmentPlay({scene,camera,char,boxes,fleet:traffic,crowd,player,loadout,
  onHit(n){focus=n;feedbackTime=4;ui.impact(false)},onShot:id=>ui.shot(id),toast:message=>ui.toast(message)})
 function selectEquipment(id){
  if(mode!=='walk'||crowd.talking||player.f.action||!loadout.select(id))return false
  aiming=false;return true
 }
 function reloadEquipment(){
  if(mode==='walk'&&!isPaused&&!crowd.talking&&!player.f.action)loadout.reload()
 }
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
 function attack(){
  if(custody.active||mode!=='walk'||isPaused||crowd.talking||foot.air||foot.land>.25||player.f.hp<=0)return
  crowd.endTalk()
  if(armed()){
   if(player.f.action||pendingSeat||room.phase==='reconnecting')return
   if(loadout.def.capacity)face=Math.PI-yaw
   equipment.attack();foot.sprint=false;return
  }
  if(swing(player.f,undefined,{bufferHit:true})){focus=closestTarget();foot.sprint=false}
 }
 function hitPlayer(n,zone,point){
  const dx=pos.x-n.pos.x,dz=pos.z-n.pos.z,d=Math.hypot(dx,dz)||1
  const side=(point.x-pos.x)*Math.cos(face)-(point.z-pos.z)*Math.sin(face)>0?1:-1
  if(custody.active||!injure(player.f,16,side,zone,{responseWindow:.65}))return false
  equipment.interrupt();aiming=false;crowd.endTalk();knockX=dx/d;knockZ=dz/d;focus=n;feedbackTime=4;foot.sprint=false;ui.impact(true);return true
 }
 function respawn(arrested=false){
  for(let r=0;r<7;r+=.7)for(let i=0;i<8;i++){
   const x=spawn.x+r*Math.cos(i*Math.PI/4),z=spawn.z+r*Math.sin(i*Math.PI/4)
   if(canWalk(x,z,boxes)&&!occupied(x,z)){plantFeet(x,z);revive(player.f);clearControls();crowd.endTalk();crowd.wanted.clear();const failed=episode.fail(arrested?'체포로 의뢰 중단':'다운으로 의뢰 중단');focus=null;ui.toast((arrested?'체포 · 부두 정문에서 석방':'부두 정문에서 정신을 차렸어')+(failed?' · 수첩에서 재시도':''));return}
  }
 }
 function talkCandidate(){return canAct()?crowd.candidate(pos):null}
 function converse(){
  if(crowd.talking){crowd.endTalk();return true}
  const n=talkCandidate();if(!n)return false
  clearControls();crowd.beginTalk(n);foot.sprint=false;player.f.queued=false;return true
 }
 const driving=()=>mode==='drive'
 const canAct=()=>!custody.active&&!pendingSeat&&mode==='walk'&&!isPaused&&!foot.air&&foot.land<.25&&!player.f.action
 function jump(){if(canAct()&&!crowd.talking)foot.jump()}
 const clearControls=()=>{aiming=false;equipment.interrupt();resetInput();foot.sprint=false;player.f.queued=false;pedals.clear();for(const b of document.querySelectorAll('[data-pedal]'))b.classList.remove('held')}
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
 function nearestDoor(){
  if(pos.y-groundHeight(pos.x,pos.z)>.16)return null
  let nearest=null,distance=Infinity
  for(const vehicle of fleet){
   const access=availableDoor(vehicle,pos,boxes,(x,z)=>blockedAtDoor(vehicle,x,z))
   if(!access||vehicle.owner!=null||Math.abs(vehicle.speed)>.45)continue
   const d=Math.hypot(pos.x-access.door.x,pos.z-access.door.z)
   if(d<distance){distance=d;nearest={...access,car:vehicle}}
  }
  return nearest
 }
 function startTransition(destination,next){
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
  if(joining){plantFeet(prior.from.x,prior.from.z);face=prior.face}
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
  face=pose.face;actor.rotation.y=face;actor.visible=pose.visible;char.root.position.y=0
  char.update(dt,pose.speed,{vehicle:{side:lastSide,crouch:pose.crouch,reach:pose.reach}})
  renderer.shadowMap.needsUpdate=true
  if(transition.time<entryTime)return
  car.door=0
  if(joining){
   mode='drive';pos.set(car.x,0,car.z);actor.visible=false
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
 function resetWalk(x,z,direction){
  pendingSeat=localSeat=transition=vehiclePose=null;mode='walk';car=cars.touring
  plantFeet(x,z);face=direction
  actor.rotation.y=face;actor.visible=true
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
   if(!resumed)offline={x:pos.x,z:pos.z,face,yaw,pitch,distance,cars:fleet.map(vehicle=>({...vehicle}))}
   localSeat=null
   const frame=room.sample(performance.now())
   for(const vehicle of fleet)Object.assign(vehicle,frame.latest.cars.get(vehicle.id))
   // The server may return a former driver near a blocked side. Recheck
   // against the live client world before restoring their walk position.
   const safe=canWalk(p.x,p.z,boxes)&&!occupied(p.x,p.z)
   resetWalk(safe?p.x:safeSpawn.x,safe?p.z:safeSpawn.z,p.face)
   ui.toast(resumed?'방에 다시 연결됐어':'비공개 방에 연결됐어')
  },
  leave(){
   for(const [index,vehicle] of fleet.entries())Object.assign(vehicle,offline.cars[index],{owner:null})
   yaw=offline.yaw;pitch=offline.pitch;distance=offline.distance
   resetWalk(offline.x,offline.z,offline.face);presence.clear();offline=null
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
  room.start(endpoint,request)
 }
 const ui=createUI({loadout,selectEquipment,reloadEquipment,aiming:()=>aiming,testSignal:market.testSignal,episode,useItem,foot,canAct,converse,crowd,player,feedback:()=>feedbackTime>0?focus:null,get car(){return driving()?car:cars.touring},get cars(){return fleet},room,startRoom,missionEnabled:()=>!offline&&!custody.active,mission,driving,prompt,interactCar,mode:()=>mode,stats:()=>({ms:recentFrameMs,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,width:canvas.width,height:canvas.height}),pos,yaw:()=>yaw,setPaused:value=>{isPaused=value;clearControls()},quality:()=>({auto:'자동',high:'높음',low:'낮음'}[quality]),cycleQuality:()=>{quality=({auto:'high',high:'low',low:'auto'})[quality];renderer.setPixelRatio(resolution());sunlight.castShadow=quality!=='low';for(const mesh of playerMeshes)mesh.castShadow=quality==='high';renderer.shadowMap.needsUpdate=true}})
 const pressed=code=>keys.has(code)?1:0
 window.addEventListener('keydown',e=>{if(crowd.talking||custody.locked||isPaused||document.querySelector('#game').inert)return;
  if(!e.repeat&&mode==='walk'){
   const slot={Digit1:'fists',Digit2:'pistol',Digit3:'shotgun',Digit4:'bat'}[e.code]
   if(slot){if(loadout.items[slot])selectEquipment(slot);else ui.show('equipment');return}
   if(e.code==='KeyR'){reloadEquipment();return}
   if(e.code==='KeyQ'){ui.show('equipment');return}
  }
  if(e.code==='KeyF'&&!e.repeat){attack();return}if(!isPaused&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code)
  if(mode==='walk'&&!e.repeat){
   if(e.code.startsWith('Shift'))foot.shift()
   if(e.code==='Space')jump()
  }}})
 window.addEventListener('keyup',e=>keys.delete(e.code))
 window.addEventListener('blur',clearControls);document.addEventListener('visibilitychange',()=>{clearControls();last=performance.now()})
 let drag=null,clickOrigin=null
 canvas.addEventListener('mousedown',e=>{
  if(isPaused||crowd.talking||mode!=='walk'||!armed())return
  if(e.button===2)aiming=!!loadout.def.capacity
  if(e.button===0)clickOrigin={x:e.clientX,y:e.clientY}
 })
 canvas.addEventListener('mouseup',e=>{
  if(e.button===2)aiming=false
  if(e.button===0&&clickOrigin){
   if(Math.hypot(e.clientX-clickOrigin.x,e.clientY-clickOrigin.y)<7)attack()
   clickOrigin=null
  }
 })
 canvas.onpointerdown=e=>{if(isPaused||crowd.talking||custody.locked)return;
  if(drag)return;canvas.focus();canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY}}
 canvas.onpointermove=e=>{if(!drag||e.pointerId!==drag.id||isPaused||custody.locked)return;lookHold=2.2;yaw+=(e.clientX-drag.x)*.0045;pitch=clamp(pitch+(e.clientY-drag.y)*.004,-.19,.93);drag.x=e.clientX;drag.y=e.clientY}
 window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&e.button===2)aiming=false});
 canvas.onlostpointercapture=e=>{if(drag?.id===e.pointerId)drag=null};canvas.onpointerup=e=>{if(drag?.id===e.pointerId)drag=null};canvas.oncontextmenu=e=>e.preventDefault()
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance+e.deltaY*.006,2.3,7.4)},{passive:false})
 const stick=document.querySelector('#stick'),knob=stick.firstElementChild,jumpButton=document.querySelector('#jump')
 const adjust=e=>{const b=stick.getBoundingClientRect();joystick.set((e.clientX-b.left-b.width/2)/30,(e.clientY-b.top-b.height/2)/30).clampLength(0,1);knob.style.transform='translate('+joystick.x*24+'px,'+joystick.y*24+'px)'}
 for(const b of document.querySelectorAll('[data-pedal]')){
  const ids=new Set();b.onpointerdown=e=>{if(!driving()||isPaused)return;b.setPointerCapture(e.pointerId);ids.add(e.pointerId);pedals.add(b.dataset.pedal);b.classList.add('held')}
  b.onlostpointercapture=e=>{ids.delete(e.pointerId);if(!ids.size){pedals.delete(b.dataset.pedal);b.classList.remove('held')}}
 }
 let stickId=null
 stick.onpointerdown=e=>{if(stickId!==null||crowd.talking||custody.locked)return;stickId=e.pointerId;stick.setPointerCapture(e.pointerId);adjust(e)};stick.onpointermove=e=>{if(!custody.locked&&!crowd.talking&&stick.hasPointerCapture(e.pointerId))adjust(e)};stick.onlostpointercapture=()=>{stickId=null;joystick.set(0,0);knob.style.transform=''}
 const punchButton=document.querySelector('#punch');punchButton.onpointerdown=e=>{e.preventDefault();punchButton.setPointerCapture(e.pointerId);attack()}
 document.querySelector('#gear-menu').onclick=()=>{if(!isPaused&&mode==='walk'&&!crowd.talking)ui.show('equipment')}
 document.querySelector('#gear-reload').onclick=reloadEquipment
 document.querySelector('#gear-aim').onclick=()=>{if(!isPaused&&mode==='walk'&&!crowd.talking&&loadout.def.capacity)aiming=!aiming}
 jumpButton.onpointerdown=e=>{e.preventDefault();jumpButton.setPointerCapture(e.pointerId);jump()}
 window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)})
 const cameraDirection=new THREE.Vector3(),anchor=new THREE.Vector3(),eye=new THREE.Vector3(),aim=new THREE.Vector3(),reach=new THREE.Vector3()
 let actualArm=distance,face=actor.rotation.y,elapsed=0,last=performance.now(),frameSum=0,frameCount=0,trackedX=0,trackedZ=spawn.z,shadowTick=0,followHeight=actor.position.y
 function positionCamera(dt,initial=false){
  cameraBlend=damp(cameraBlend,driving()?1:0,5,dt)
  const arm=(aiming?Math.min(distance,2.7):distance)+cameraBlend*car.setup.camera,tilt=pitch+cameraBlend*.115-loadout.recoil*.012
  const sn=Math.sin(yaw),cs=Math.cos(yaw),lift=Math.sin(tilt),flat=Math.cos(tilt)
  followHeight=initial?actor.position.y:damp(followHeight,actor.position.y,12,dt)
  const vehicleHeight=car.setup.cameraHeight+(room.phase==='offline'?car.lift:0)
  anchor.set(pos.x+.26*cs*(1-cameraBlend),(followHeight+1.54)*(1-cameraBlend)+vehicleHeight*cameraBlend,pos.z+.26*sn*(1-cameraBlend))
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
  if((atStation(pos.x,pos.z)||insidePremises(pos.x,pos.z))&&eye.y>3.19&&eye.y>anchor.y)fraction=Math.min(fraction,Math.max(.04,((atStation(pos.x,pos.z)?3.19:3.36)-anchor.y)/(eye.y-anchor.y)))
  const availableArm=arm*fraction
  actualArm=initial?availableArm:availableArm<actualArm?availableArm:damp(actualArm,availableArm,8,dt)
  reach.copy(eye).sub(anchor).multiplyScalar(actualArm/arm)
  camera.position.copy(anchor).add(reach);camera.position.y=Math.max(.24,camera.position.y)
  aim.set(anchor.x+sn*2.2,anchor.y+.12-lift*2.2,anchor.z-cs*2.2)
  camera.lookAt(aim)
 }
 positionCamera(0,true)
 function groundHeight(x,z){
  if(useTownDriveMask(x,z))return oldTownHeight(x,z)
  if(atStation(x,z))return .092
  if(insidePremises(x,z))return .052
  if((x< -40 && z< -43 && z> -46)||(x< -40 && z> -31 && z< -27))return .082
  if(archiveAccess(x,z,0)&&x<archive.front+.7)return .07
  const lane=Math.abs(x)
  const edge=Math.min(lane-6,10.9-lane,Math.max(-43-z,z+31))
  return .008+.083*clamp(edge/.18,0,1)
 }
 function plantFeet(x,z){
  foot.reset(groundHeight(x,z))
  pos.set(x,foot.height,z);actor.position.copy(pos);char.root.position.y=0;shadow.position.y=.014
 }
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
    stepDrive(car,input,boxes,dt,traffic,room.phase==='offline');speed=Math.abs(car.speed)
    pos.x=car.x;pos.z=car.z;actor.visible=false;mission.tick(!offline&&car===cars.touring)
    lookHold=Math.max(0,lookHold-dt)
    if(!drag&&!lookHold){const error=car.heading-yaw;yaw+=Math.atan2(Math.sin(error),Math.cos(error))*(1-Math.exp(-(speed>.6?3.4:1.5)*dt))}
   }else{
   const ax=pressed('KeyD')-pressed('KeyA')+joystick.x,az=pressed('KeyW')+pressed('ArrowUp')-pressed('KeyS')-pressed('ArrowDown')-joystick.y
   const length=Math.max(1,Math.hypot(ax,az)),sn=Math.sin(yaw),cs=Math.cos(yaw)
   const pace=foot.rate(pressed('ShiftLeft')||pressed('ShiftRight'),joystick.length())*(player.f.action==='punch'?.36:player.f.action?0:1)
   const rate=(custody.active?Math.min(pace,1.85):pace)*(coffee>0&&pace>1.85?1.15:1)
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
   const floor=supportHeight(pos.x,pos.z,foot.height,groundHeight(pos.x,pos.z),surfaces)
   const roomCeiling=pos.x<archive.front&&archiveAccess(pos.x,pos.z,0)?archive.ceiling:
     atStation(pos.x,pos.z)?station.ceiling:insidePremises(pos.x,pos.z)?3.44:Infinity
   foot.advance(dt,floor,roomCeiling-player.height)
   pos.y=foot.height
   shadow.position.y=floor-pos.y+.014
   shadow.material.opacity=1-.65*clamp(pos.y-floor,0,1)
   const dx=pos.x-ox,dz=pos.z-oz
   speed=dt>0?Math.hypot(dx,dz)/dt:walkSpeed
   // Lose momentum along blocked axes without affecting air control or knockback.
   if(accelerate&&dt>0)velocity.set(dx/dt,dz/dt)
   const previousFace=face
   const facing=player.f.action==='punch'?focus:crowd.talking
   if((armed()&&(aiming||loadout.recoil>.1))||facing||speed>.07){const desired=armed()&&(aiming||loadout.recoil>.1)?Math.PI-yaw:facing?Math.atan2(facing.pos.x-pos.x,facing.pos.z-pos.z):Math.atan2(dx,dz);face+=clamp(Math.atan2(Math.sin(desired-face),Math.cos(desired-face))*(1-Math.exp(-14*dt)),-9*dt,9*dt)}
   actor.rotation.y=face;actor.position.copy(pos)
   char.update(dt,speed,{...combatPose(player.f),jump:foot.phase,land:foot.land,
    guard:feedbackTime>0&&focus?.f.hp>0&&Math.hypot(focus.pos.x-pos.x,focus.pos.z-pos.z)<8,
    turn:dt>0?(face-previousFace)/dt:0})
   if(player.f.action==='punch')contact(player.f,char,pos,crowd.all,crowd.lineClear,(n,zone,point)=>{
    if(crowd.receive(n,pos,zone,point)){focus=n;feedbackTime=4;ui.impact(false)}
   })
   }
   for(const vehicle of fleet){
    rigs[vehicle.id].updatePose({...vehicle,dt,lift:room.phase==='offline'?vehicle.lift:0})
    vehicle.travel=0;vehicle.impact=0
   }
   if(!transition&&mode==='walk')walkSpeed=speed
   else if(driving())walkSpeed=0
   remoteShadow=presence.update(frame,room.session?.id,dt)||remoteShadow
   player.available=!custody.active&&mode==='walk'&&player.f.hp>0&&!foot.air
   const progress=episode.update(dt,{x:pos.x,z:pos.z,driving:driving()&&car===cars.touring})
   if(progress)ui.toast(progress.message)
   player.inVehicle=driving()?car:null
   player.legacyArrest=room.phase!=='offline'
   const police=squads.update(dt,pos,player.inVehicle,crowd.wanted,!player.legacyArrest)
   player.squadObserver=police.observed
   remoteShadow ||= police.moving
   crowd.update(dt,camera,player,hitPlayer,(outcome,officer)=>{
    if(outcome==='arrest')beginCustody(officer)
    else ui.toast(outcome==='warning'?'항만 경찰 · 경고 후 조사 종료':'수배 해제')
   })
   if(typeof portUpdate==='function')portUpdate(dt,elapsed)
   if(Math.abs(pos.x-trackedX)>10||Math.abs(pos.z-trackedZ)>10){trackedX=pos.x;trackedZ=pos.z;sunlight.position.x=trackedX+34;sunlight.target.position.x=trackedX;renderer.shadowMap.needsUpdate=true;sunlight.position.z=trackedZ-49;sunlight.target.position.z=trackedZ-9}
   const playerShadow=driving()?speed>.06:quality==='high'&&(speed>.06||foot.air||foot.land>0||!!player.f.action)
   if(((playerShadow||remoteShadow)&&elapsed-shadowTick>.09)||(crowd.shadowDirty&&elapsed-shadowTick>.32)){renderer.shadowMap.needsUpdate=true;shadowTick=elapsed;remoteShadow=false}
   if(custody.officer)custodyView.camera(camera,actor,custody.officer,dt)
   else positionCamera(dt)
   const districtChanged=market.update(pos),stationChanged=updateStation(pos)
   if(updateVisibility()||districtChanged||stationChanged)renderer.shadowMap.needsUpdate=true
   camera.updateMatrixWorld()
   equipment.update(dt,{active:mode==='walk'&&!custody.active&&!pendingSeat&&!crowd.talking&&!player.f.action,aiming,
    speed,pitch:Math.asin(clamp(camera.getWorldDirection(cameraDirection).y,-1,1))})
   ui.update(elapsed);updateGuide(ui.missionGoal(),pos);renderer.render(scene,camera)
   if(elapsed>1){
    frameSum+=realDt;frameCount++
    if(frameCount>=30||frameSum>3){const mean=frameSum/frameCount;recentFrameMs=mean*1000
     if(quality==='auto'&&mean>.032&&autoDpr>.75){autoDpr=Math.max(.75,autoDpr-.15);renderer.setPixelRatio(autoDpr)}
     frameSum=frameCount=0
    }
   }
  }
  requestAnimationFrame(draw)
 }
 if(contextLost)return
 renderer.render(scene,camera);ui.update(0)
 return ()=>{
  last=performance.now();requestAnimationFrame(draw)
 }
}
