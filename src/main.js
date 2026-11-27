import {insideBasin,basinGreen,basinLots} from './south-basin-plan.js'
import {buildSouthBasin} from './south-basin.js'
import {beachGround,coastFloor,inCoast,inPier,seaLevel,swimLadder} from './coast-plan.js'
import {buildCoast} from './coast-scene.js'
import {boatArt} from './boat-art.js'
import {boatExit,canStartSwimming,createBoats,driveBoat,boardableBoats,steerTo,swimmer} from './coastal-motion.js'
import {grenadeGuide} from './grenade-guide.js'
import {crashEvents,crashExit,impulse,moveImpact} from './impact-motion.js'
import {onQuay} from './quay-plan.js'
import {citySpots} from './city-life-plan.js'
import {cityFixtures} from './city-fixtures.js'
import {cityAction,nearbyActions} from './city-actions.js'
import {within,loadingCourt,pocketGarden} from './street-plan.js'
import {worldColliders} from './world-colliders.js'
import {createTerraceDoors} from './terrace-doors.js'
import {insideTerrace,terraceRoomAt,terraceFloorAt,terraceCeilingAt} from './terrace-plan.js'
import {streamTerraceRooms} from './terrace-interior.js'
import {buildEstuary,landscapeMaterial} from './estuary.js'
import {grenadeModel} from './grenade-art.js'
import {grenadeFlight,grenadeBlast,kickVehicle} from './grenade-flight.js'
import {insideWeaponShop,shopSite} from './weapon-shop-plan.js'
import {buildWeaponShop} from './weapon-shop.js'
import * as THREE from 'three'
import {createLoadout,gear} from './equipment.js'
import {scopeStance} from './scope-stance.js'
import {equipmentPlay} from './equipment-play.js'
import {worldEffects} from './world-effects.js'
import {readQuality,writeQuality,nextQuality,graphicsProfile} from './graphics-quality.js'
import {cityTrafficCircuits,trafficPreference,marketSignal} from './city-traffic-plan.js'
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
import {breakwaterGradeAt} from './breakwater-approach.js'
import {buildMarket} from './market.js'
import {insidePremises} from './market-plan.js'
import {archiveVisibility} from './archive-visibility.js'
import {archive,archiveAccess} from './chart-room.js'
import {createEpisode} from './episode.js'
import {buildTransferYard} from './transfer-yard.js'
import {detention,worksDoor,worksLoft,worksRoof,worksUpper} from './prologue-plan.js'
import {prologueWorld} from './prologue-world.js'
import {firstWorkRoadblock} from './first-work-roadblock.js'
import {availableDoor,safeExit,nearBody,newDrive,stepDrive,localPoint,doorPoint,clearPath} from './driving.js'
import {createRoomClient,blendPose} from './room-client.js'
import {roomPresence} from './room-presence.js'
import {packPlayer,packVehicle,wrapAngle} from './room-protocol.js'
import {recoveryPosition,clearStuckMotion} from './play-recovery.js'
import {parkedPoses,restoreParkedPoses,restoreTrafficVehicle} from './vehicle-checkpoint.js'
import {createCheckpoint,resolveCheckpoint} from './play-checkpoint.js'
import {uprightRider} from './rider-pose.js'
import {entryPose,entryTime,exitProfile,movingExitPose} from './vehicle-entry.js'
import {soloRoadTuning,vehicles} from './vehicles.js'
import {createResidents} from './residents.js'
import {fighter,swing,advance,contact,injure,revive,combatPose} from './melee.js'
import {createDeathScreen} from './death-screen.js'
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
import {spawn,canWalk,inDocklands,movePlayer,supportHeight,cameraFraction} from './navigation.js'
import {inOldTown} from './old-town-plan.js'

// The downloadable preview resolves the same site assets from its embedded manifest.
if(window.harborPreviewAssets)THREE.DefaultLoadingManager.setURLModifier(url=>window.harborPreviewAssets[url]||url)

const canvas=document.querySelector('#world')
const pos=new THREE.Vector3(garage.x,0,garage.z),velocity=new THREE.Vector2()
const keys=new Set(),boxes=worldColliders(),joystick=new THREE.Vector2()
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
 const headlight=new THREE.SpotLight(0xffdeb0,0,31,Math.PI/5,.72,1.28)
 headlight.visible=false;scene.add(headlight,headlight.target)
 let radio=false,lastHorn=-Infinity
 const lamps=new Set()
 const mealProp=new THREE.Mesh(new THREE.CylinderGeometry(.040,.032,.102,10),new THREE.MeshStandardMaterial({color:0xc2a785,roughness:.72}))
 mealProp.visible=false;scene.add(mealProp)
 const surfaceMaps={meadow:landscapeMaterial()}
 buildEstuary(scene,surfaceMaps.meadow,addCollider)
 const coastUpdate=buildCoast(scene,addCollider)
 const landFog=scene.fog.color.clone(),landDensity=scene.fog.density,waterColor=new THREE.Color(0x5b9286),waterDeep=new THREE.Color(0x214858)
 const [char,portUpdate,rigs]=await Promise.all([createCharacter(),buildPort(scene,addCollider),buildStreet(scene,addCollider,surfaceMaps),buildArchitecture(scene,addCollider,surfaceMaps),sky(scene,renderer)])
 portUpdate.optics(scene,sunlight)
 const landBackground=scene.background
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
 const updateBasin=buildSouthBasin(scene,addCollider,surfaceMaps)
 const updateTown=buildOldTown(scene,addCollider,boxes,surfaceMaps)
 const updateRow=buildRowDetail(scene,boxes,storeFloor,rowBoards,surfaceMaps.street)
 updateRow(pos,0)
 const westBank=buildWestBank(scene,addCollider,surfaceMaps,boxes)
 buildTransferYard(scene,addCollider,surfaceMaps)
 const updateStation=buildPoliceStation(scene,addCollider)
 const custodyView=custodyPresentation(scene,char,boxes)
 const updateGuide=missionGuide(scene,camera,groundHeight)
 const fixtures=cityFixtures(scene,addCollider),activity=cityAction()
 const surfaces=boxes.filter(box=>box[5])
 const updateVisibility=archiveVisibility(scene,camera)
 const actor=new THREE.Group();actor.name='Harborline player';actor.add(char.root);scene.add(actor);const shadow=footShadow(actor)
 const dockSpawnPoints=[spawn,...Array.from({length:13},(_,i)=>({x:-3+i*.5,z:spawn.z}))]
 const safeSpawn=dockSpawnPoints.find(point=>canWalk(point.x,point.z,boxes))??spawn
 if(!canWalk(pos.x,pos.z,boxes))pos.set(safeSpawn.x,0,safeSpawn.z)
 actor.position.copy(pos);actor.rotation.y=Math.PI-yaw
 // The contact decal follows every footstep. Reserve moving sun shadows for High.
 const playerMeshes=[]
 char.root.traverse(mesh=>{if(mesh.isMesh){playerMeshes.push(mesh);mesh.castShadow=profile().playerShadows}})
 const cars=Object.fromEntries(Object.entries(rigs).map(([id,rig])=>[id,{...newDrive(rig,rig.setup??vehicles[id]),id,localOnly:!!rig.localOnly,door:0}]))
 const fleet=Object.values(cars),traffic=[...fleet],mission=firstDrive(cars.touring),pedals=new Set()
 const soloTunings=new Map(fleet.map(v=>[v.id,soloRoadTuning(v.setup)]))
 const parkedSpawns=new Map(fleet.map(vehicle=>[vehicle.id,{...vehicle}]))
 let car=cars.touring,offline=null,pendingSeat=null,localSeat=null,walkSpeed=0,vehiclePose=null,remoteShadow=false
 let mode='walk',transition=null,lastSide=-1,cameraBlend=0,lookHold=0,recentFrameMs=0
 const swimming=swimmer(),boats=createBoats(),boatRigs=boatArt(scene,boats),pilotPoint=new THREE.Vector3(),pilotRotation=new THREE.Quaternion()
 let boat=null,seaTransition=null,wetView=0,splashAt=0
 const foot=createFootwork();foot.reset(groundHeight(pos.x,pos.z));pos.y=actor.position.y=foot.height
 const crowd=await createResidents(scene,boxes,cars.touring,traffic,p=>groundHeight(p.x,p.z))
 const doors=createTerraceDoors(scene,boxes,(kind,point)=>ui.sound(kind,point),[shopSite,worksDoor]),updateFittings=streamTerraceRooms(scene)
 const pedestrianImpacts=createPedestrianImpacts(),previousCar={},crashes=crashEvents()
 const squads=policeChase(scene,boxes,traffic,fleet.length,crowd,groundHeight)
 let trafficStorage
 try{trafficStorage=window.localStorage}catch{}
 const trafficDensity=trafficPreference(trafficStorage)
 const dockCapacity=6
 const layouts=cityTrafficCircuits()
 const capacity=4
 const regular=['sport','van','riverside-quay','sprint-north','van-north','riverside-south','fairheaven-south']
 const seeded=regular.map(id=>({rig:rigs[id],car:cars[id]}))
 const trafficRigs=Array.from({length:dockCapacity+capacity*layouts.length},(_,i)=>rigs.civilianRig(i))
 const driverRigs=new Map()
 await Promise.all([...seeded.map(unit=>unit.rig),...trafficRigs].map(async(rig,index)=>{
  const variant=[1,4,7,2,5,9,11,3][index%8]
  const driver=await createCharacter({variant,model:index%4===3?'crew':'resident'})
   .catch(()=>createCharacter({variant}))
  const van=rig.setup.height>1.7
  driver.update(0,0,{vehicle:{side:-1,crouch:.53,reach:.65}})
  driver.root.scale.setScalar(.76)
  driver.root.position.set(-.39,van?.14:-.18,van?-.75:-.11)
  driver.root.rotation.y=Math.PI
  driver.root.visible=false
  driver.root.traverse(node=>{if(node.isMesh)node.castShadow=false})
  rig.cabin.add(driver.root)
  rig.driver=driver.root;driverRigs.set(rig,driver)
 }))
 let signal='northSouth'
 rigs.trafficSignal(signal)
 const greenFor=(v,point)=>point.curve||(Math.abs(Math.cos(v.heading))>.7?signal==='northSouth':signal==='eastWest')
 const civilians=civilianTraffic(scene,boxes,traffic,trafficRigs.slice(0,dockCapacity),{seeded,idPrefix:'district-traffic',canEnter:greenFor,requireDriver:true})
 const regionalTraffic=layouts.map((layout,i)=>{
  const from=dockCapacity+i*capacity
  return civilianTraffic(scene,boxes,traffic,trafficRigs.slice(from,from+capacity),
   {entries:layout.entries,nextNode:layout.next,junction:i===0?{x:0,z:-37}:null,turnarounds:[],canEnter:greenFor,requireDriver:true,idPrefix:'borough-'+i})
 })
 const trafficSystems=[civilians,...regionalTraffic],claimedTraffic=[],departed=[],playerParked=new Set()
 const trafficDriver=car=>{
  for(const system of trafficSystems){const unit=system.driverFor(car);if(unit)return {system,unit}}
 }
 function registerTakenCar(unit){
  const {car,rig}=unit
  playerParked.add(car)
  if(unit.external)return
  claimedTraffic.push(car);cars[car.id]=car;rigs[car.id]=rig
  soloTunings.set(car.id,soloRoadTuning(car.setup))
 }
 function clearCivilians(){
  trafficSystems.forEach(system=>system.clear())
  for(const vehicle of claimedTraffic){
   const index=traffic.indexOf(vehicle)
   if(index!==-1)traffic.splice(index,1)
   rigs[vehicle.id].root.visible=false
  }
  for(const resident of departed){resident.rig.root.removeFromParent();resident.rig.dispose()}
  departed.length=0
 }
 const trafficView=new THREE.Frustum(),trafficProjection=new THREE.Matrix4(),trafficPoint=new THREE.Vector3()
 const trafficInView=point=>trafficView.containsPoint(trafficPoint.set(point.x,1,point.z))
 const walkers=[]
 const presence=roomPresence(scene)
 const player={pos,f:fighter(100),height:1.8,available:true}
 const deathScreen=createDeathScreen(canvas,document.querySelector('#death-screen'))
 const episode=createEpisode({mainStory:true,canStartOpening:()=>room.phase==='offline'&&!custody.active&&!mission.active})
 let storyStatus=''
 const storyWorld=prologueWorld({scene,boxes,crowd,traffic,rigs,height:groundHeight,inView:trafficInView,
  notify(message,failed){if(failed)episode.fail(message);ui.toast(message)},
  combat(n,from,to,hit){
   effects.trace(from,to);effects.muzzle(from,2);ui.shot('pistol',from)
   if(hit)hitPlayer(n,'body',to,9,'shot')
  }})
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
  activity.stop()
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
 let focus=null,feedbackTime=0
 let storage
 try{storage=window.localStorage}catch{}
 const loadout=createLoadout(storage,episode)
 const stance=scopeStance()
 let aiming=false,shoulder=0,scopeVisible=false,hideScopeBody=false
 const guide=grenadeGuide(scene,boxes)
 const cancelAim=()=>{aiming=false;stance.update(0,false);scopeVisible=false;guide.hide()}
 const armed=()=>loadout.selected!=='fists'
 const grenades=[],blastTarget=new THREE.Vector3(),grenadeStrength=grenadeBlast(boxes)
 let grenadeShape,shake=0,throwPlan=null
 function currentThrow(){
  const chest=new THREE.Vector3(pos.x,pos.y+1.32,pos.z)
  const hand=chest.clone().add(new THREE.Vector3(Math.sin(yaw)*.46,.22,-Math.cos(yaw)*.46))
  const feet=pos.y
  return {origin:cameraFraction(chest,hand,boxes)<.98?chest:hand,heading:yaw,pitch,boxes,
   floor:(x,z)=>floorAt(x,z,feet),ceiling:ceilingHeight,vehicles:traffic}
 }
 function launchGrenade(){
  const options=throwPlan??currentThrow(),flight=grenadeFlight(options)
  throwPlan=null
  grenadeShape??=grenadeModel()
  const prop=grenadeShape.clone(true)
  prop.position.copy(flight.position);scene.add(prop)
  grenades.push({prop,flight})
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
   ui.sound('blast',point)
   effects.emit('burst',point.x,point.y+.24,point.z,12)
   effects.emit('dust',point.x,point.y+.08,point.z,8)
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
  onHit(n){focus=n;feedbackTime=4;ui.impact(false)},onShot:id=>ui.shot(id,pos),toast:message=>ui.toast(message)})
 function selectEquipment(id){
  if(mode!=='walk'||crowd.talking||player.f.action||custody.active)return false
  const previous=loadout.selected
  if(!loadout.select(id))return false
  if(previous!==id){cancelAim();equipment.interrupt();ui.sound('switch')}
  return true
 }
 function reloadEquipment(){
  if(mode==='walk'&&!isPaused&&!crowd.talking&&!player.f.action&&!custody.active&&!activity.current&&loadout.reload())ui.sound('reload',pos)
 }
 const checkpoint=createCheckpoint(storage)
 restoreParkedPoses(fleet,checkpoint.vehicles,boxes)
 for(const [id,pose] of Object.entries(checkpoint.vehicles)){
  for(const system of trafficSystems){
   const unit=system.savedUnit(id)
   if(!unit||!restoreTrafficVehicle(unit.car,pose,boxes,traffic))continue
   system.reserve(unit);registerTakenCar(unit);traffic.push(unit.car);unit.rig.updatePose(unit.car)
   break
  }
 }
 for(const vehicle of fleet){
  rigs[vehicle.id].updatePose(vehicle)
  if(Object.hasOwn(checkpoint.vehicles,vehicle.id)){civilians.retire(vehicle);playerParked.add(vehicle)}
 }
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
 const canAttack=()=>!custody.locked&&mode==='walk'&&!isPaused&&!crowd.talking&&!foot.air&&foot.land<=.25&&!activity.current&&player.f.action!=='knockdown'&&player.f.hp>0
 function attack(){
  if(!canAttack())return
  if(custody.canPunch){swing(player.f);return}
  crowd.endTalk()
  if(armed()){
   if(player.f.action||pendingSeat||room.phase==='reconnecting')return
   if(loadout.def.capacity||loadout.def.consumable)face=Math.PI-yaw
   if(loadout.def.consumable&&!equipment.throwing&&!loadout.coolingDown&&loadout.item.reserve){
    throwPlan=currentThrow();cancelAim()
   }
   equipment.attack(loadout.def.lethal?sniperAiming()&&scopeVisible:aiming);return
  }
  if(swing(player.f,undefined,{bufferHit:true})){focus=closestTarget()}
 }
 function hitPlayer(n,zone,point,amount=16,kind='melee'){
  const dx=pos.x-n.pos.x,dz=pos.z-n.pos.z,d=Math.hypot(dx,dz)||1
  const side=(point.x-pos.x)*Math.cos(face)-(point.z-pos.z)*Math.sin(face)>0?1:-1
  if(custody.active||!injure(player.f,amount,side,zone,{responseWindow:.65}))return false
  impulse(player.f,kind,dx/d,dz/d,amount,{vx:velocity.x,vz:velocity.y,face})
  activity.stop();equipment.interrupt();cancelAim();crowd.endTalk();focus=n;feedbackTime=4;ui.impact(true)
  if(!player.f.hp)beginPlayerDeath()
  return true
 }
 function returnToHome(){
  activity.stop()
  const base=room.phase==='offline'?garage:safeSpawn
  const candidates=[base,{x:base.x,z:base.z+2},{x:base.x+1.1,z:base.z-1.1}]
  const safe=candidates.find(point=>canWalk(point.x,point.z,boxes)&&!occupied(point.x,point.z))??base
  yaw=room.phase==='offline'?garage.yaw:.05
  resetWalk(safe.x,safe.z,Math.PI-yaw)
 }
 function reviveAtHome(){
  releaseSeat();returnToHome()
  revive(player.f);crowd.wanted.clear();focus=null;feedbackTime=0
 }
 function respawn(arrested=false){
  reviveAtHome();mission.cancel()
  const failed=episode.fail(arrested?'체포로 의뢰 중단':'다운으로 의뢰 중단')
  const place=room.phase==='offline'?'차고지':'부두 정문'
  ui.toast((arrested?'체포 후 '+place+'에서 복귀':place+'에서 정신을 차렸어')+(failed?' · 수첩에서 재시도':''))
 }
 function beginPlayerDeath(){
  if(deathScreen.active)return
  const practice=mission.active,journal=!!episode.tracking()
  const auto=!practice&&!journal
  const fallback=room.phase==='offline'&&episode.prologue?.active?checkpoint.current:null
  if(journal)episode.fail('다운으로 의뢰 중단')
  mission.cancel()
  activity.stop();clearControls();crowd.endTalk();walkSpeed=0
  if(transition)cancelTransition()
  player.available=player.exposed=false
  deathScreen.begin(()=>{
   if(auto)respawn()
   else reviveAtHome()
   if(journal){
    const retry=episode.retry()
    if(retry.ok||episode.prologue?.active)restartPrologue(fallback)
    ui.toast(retry.message)
   }
   if(practice)mission.start(false)
   cameraBlend=wetView=shoulder=shake=0
   setZoom(1);positionCamera(0,true);saveCheckpoint()
  },{auto})
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
 function converse(n=talkCandidate()){
  if(crowd.talking){crowd.endTalk();return true}
  if(!n)return false
  clearControls();crowd.beginTalk(n);player.f.queued=false;return true
 }
 const driving=()=>mode==='drive'
 const boating=()=>mode==='boat'
 const inWater=()=>mode==='swim'
 const operating=()=>driving()||boating()
 const pierLadder=()=>inWater()&&Math.hypot(pos.x-swimLadder.x,pos.z-swimLadder.z)<1.45&&!swimming.diving
 const boatsNearby=()=>room.phase==='offline'&&(inWater()&&!swimming.diving||canAct())?boardableBoats(pos,boats,inWater()):[]
 function enterWater(){
  mode='swim';swimming.start(pos);foot.reset(pos.y)
  activity.stop();crowd.endTalk();cancelAim();equipment.interrupt()
  ui.sound('splash',pos,.85)
 }
 function toggleDive(){
  if(inWater()&&!swimming.toggle(pos))ui.toast('수심이 더 깊은 곳에서 잠수할 수 있어')
 }
 function waterInteraction(selectedBoat){
  if(seaTransition)return true
  const next=selectedBoat??boatsNearby()[0]
  if(next){
   saveCheckpoint();boat=next
   seaTransition={to:'boat',time:0,from:actor.position.clone(),turn:face}
  }else if(boating()){
   const exit=boatExit(boat,(x,z)=>inPier(x,z)&&canWalk(x,z,boxes,.32,beachGround(x,z)),boats)
   if(!exit){ui.toast('하선할 공간이 없어. 다른 곳에 멈춰 줘');return true}
   seaTransition={to:exit.dry?'walk':'swim',time:0,from:actor.position.clone(),exit,turn:face,drift:true,pace:Math.abs(boat.speed)}
  }else if(pierLadder()){
   seaTransition={to:'walk',time:0,from:actor.position.clone(),exit:{x:swimLadder.x,z:swimLadder.deckZ},turn:face}
  }else return inWater()
  clearControls();mode='transfer';return true
 }
 const sniperAiming=()=>loadout.selected==='sniper'&&aiming&&mode==='walk'&&!isPaused&&!custody.active&&!foot.air&&!player.f.action
 function vehicleAction(action){
  if(!driving()||isPaused)return
  if(action==='horn'&&performance.now()-lastHorn>650){
   lastHorn=performance.now();ui.sound('horn',car)
  }else if(action==='lights'){
   if(lamps.has(car.id))lamps.delete(car.id);else lamps.add(car.id)
   ui.toast(lamps.has(car.id)?'전조등 켜짐':'전조등 꺼짐');ui.sound('click')
  }else if(action==='radio'){radio=!radio;ui.toast(radio?'Harbor FM · 라디오 켜짐':'라디오 꺼짐');ui.sound('click')}
 }
 const canAct=()=>!sniperAiming()&&!custody.active&&!pendingSeat&&mode==='walk'&&!isPaused&&!foot.air&&foot.land<.25&&!player.f.action
 const canJump=()=>!sniperAiming()&&!custody.active&&!pendingSeat&&mode==='walk'&&!isPaused&&!crowd.talking&&!player.f.action&&foot.canJump
 function jump(){if(activity.current){activity.leave();return}if(canJump()&&foot.jump())ui.sound('jump',pos)}
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
  cancelAim();throwPlan=null;equipment.interrupt();resetInput();player.f.queued=false;pedals.clear()
 }
 function interactions(){
  const list=[]
  const add=(id,label,action,point=pos,priority=0)=>list.push({id,label,action,priority,
   distance:Math.hypot(pos.x-point.x,pos.z-point.z)})
  if(pendingSeat||seaTransition||transition||isPaused)return list
  if(crowd.talking){add('talk-end','대화 마치기',()=>crowd.endTalk());return list}
  if(activity.current){add('activity-end',activity.current.spot.pose==='sit'?'일어서기':'취소',()=>activity.leave());return list}
  if(operating()){
   add('exit',boating()?'보트에서 내리기':Math.abs(car.speed)<=.45?'하차':room.phase==='offline'?'주행 중 하차':'정차 후 하차',interactCar,pos,2)
  }else{
   for(const boarding of boatsNearby())add('boat-'+boarding.id,boarding.name+' 탑승',()=>waterInteraction(boarding),boarding,2)
   if(pierLadder())add('ladder','사다리로 올라가기',()=>waterInteraction(false),swimLadder,3)
   if(canAct()){
    if(episode.prologue?.stage?.kind==='free'&&Math.hypot(pos.x-detention.x,pos.z-detention.z)<detention.radius&&pos.y<1.2&&
     cameraFraction({...pos,y:pos.y+1.22},{...detention,y:1.22},boxes)>.92){
     add('rescue-theo','Theo Mercer 구출',()=>{
      const result=episode.prologue?.rescue(pos)
      if(result)ui.toast(result.message)
     },detention,4)
    }
    const storyAction=storyWorld.interaction(episode.prologue?.stage,pos)
    if(storyAction)add(storyAction.id,storyAction.label,()=>{
     const result=storyAction.activate()
     if(result?.message)ui.toast(result.message)
    },storyAction,4)
    for(const dest of doorCandidates())add('car-'+dest.car.id,dest.car.setup.name+(dest.occupied?' · 운전자에게서 차량 가져오기':' 탑승'),()=>interactCar(dest),dest.door,2)
    for(const d of doors.candidates(pos))add('door-'+d.first,d.r.title+' · '+(d.target?'문 닫기':'문 열기'),()=>doors.toggle(pos,d),d.at,2)
    for(const n of crowd.candidates(pos))add('resident-'+n.id,n.name+' · 대화',()=>converse(n),n.pos,1)
   }
  }
  for(const site of cityCandidates()){
   add('site-'+site.id,site.label+(site.price?' · ₩'+site.price:''),null,site,1)
   list.at(-1).site=site
  }
  return list
 }
 function cityCandidates(){
  if(!canAct()&&!driving())return []
  if(driving()&&(room.phase!=='offline'||Math.abs(car.speed)>.45||!car.dents))return []
  return nearbyActions(driving()?repairSpots:walkSpots,pos,yaw,spot=>
   driving()||(spot.type!=='discovery'||room.phase==='offline'&&!episode.discovered(spot.id))&&
   cameraFraction({x:pos.x,y:pos.y+1.36,z:pos.z},{x:spot.x,y:spot.targetY??1.38,z:spot.z},boxes)>.84)
 }
 function useCity(spot){
  if(spot.type==='discovery'){
   if(room.phase!=='offline')return
   const result=episode.discover(spot.id);ui.toast(result.message)
   if(result.ok)ui.sound('mission',pos)
   return
  }
  if(spot.type==='repair'){
   const result=episode.spend(spot.price)
   if(result.ok){car.dents=undefined;car.collision=null;ui.sound('repair',pos)}
   ui.toast(result.ok?'정비 완료 · ₩'+spot.price:result.message);return
  }
  if(spot.type==='light'){
   ui.toast(fixtures.toggleLamp()?'조명을 켰어':'조명을 껐어');ui.sound('click',pos);return
  }
  if(spot.goods){const result=episode.buy(spot.goods);ui.toast(result.message);if(result.ok)ui.sound('buy');return}
  if(spot.pose==='rest'&&crowd.wanted.level){ui.toast('추격이 끝난 뒤에 쉴 수 있어');return}
  if(spot.price&&episode.snapshot().money<spot.price){ui.toast('현금이 부족해');return}
  if(spot.pose){
   clearControls()
   if(spot.pose==='sit')face=Math.PI
   if(spot.pose==='rest')face=Math.atan2(spot.x-pos.x,spot.z-pos.z)
   activity.begin(spot,()=>{
    if(spot.price){
     const paid=episode.spend(spot.price)
     if(!paid.ok){ui.toast(paid.message);return}
    }
    const hp=Math.min(player.f.maxHealth,player.f.hp+(spot.heal??0))-player.f.hp
    player.f.hp+=hp
    if(spot.energy)coffee=Math.max(coffee,spot.energy)
    ui.sound(spot.pose==='rest'?'ui':spot.pose,pos)
    const details=[spot.price?'₩'+spot.price:'',hp?'체력 +'+hp:'',spot.energy?'달리기 강화 '+spot.energy+'초':''].filter(Boolean)
    ui.toast([spot.title,...details].join(' · '))
   })
  }
 }
 const repairSpots=citySpots.filter(s=>s.type==='repair'),walkSpots=citySpots.filter(s=>s.type!=='repair')
 const blockedByCar=(vehicle,x,z)=>traffic.some(other=>vehicle!==other&&nearBody(other,x,z))
 const blockedAtDoor=(vehicle,x,z)=>blockedByCar(vehicle,x,z)||crowd.blockedBy(null,x,z)
 function doorCandidates(qualifies){
  if(pos.y-groundHeight(pos.x,pos.z)>.16)return []
  const nearby=[]
  for(const vehicle of traffic){
   if(vehicle.localOnly&&room.phase!=='offline'||vehicle.owner!=null)continue
   if(Math.abs(vehicle.x-pos.x)>5||Math.abs(vehicle.z-pos.z)>5)continue
   const driver=room.phase==='offline'?trafficDriver(vehicle):null
   if((!driver&&!cars[vehicle.id])||Math.abs(vehicle.speed)>(driver?2.25:.45))continue
   if(qualifies&&(driver||!qualifies(vehicle)))continue
   const access=availableDoor(vehicle,pos,boxes,(x,z)=>blockedAtDoor(vehicle,x,z))
   if(access)nearby.push({...access,car:vehicle,occupied:driver})
  }
  return nearby
 }
 const nearestDoor=qualifies=>doorCandidates(qualifies).sort((a,b)=>
  Math.hypot(pos.x-a.door.x,pos.z-a.door.z)-Math.hypot(pos.x-b.door.x,pos.z-b.door.z))[0]??null
 const unattended=new Map(),coastInput={forward:0,back:0,steer:0,handbrake:false}
 function coastVehicle(vehicle,dt,brake=false){
  stepDrive(vehicle,brake?{...coastInput,handbrake:true}:coastInput,boxes,dt,traffic,true,
   pose=>(vehicle!==car||!transition)&&nearBody(pose,pos.x,pos.z,.38)||crowd.all.some(n=>n.pos.y<1.4&&!n.policeOrder?.aboard&&nearBody(pose,n.pos.x,n.pos.z,.39)),
   soloTunings.get(vehicle.id))
 }
 function startTransition(destination,next){
  if(next==='enter'){saveCheckpoint();ui.prepareDriveAudio()}
  const exit=next==='exit'&&room.phase==='offline'?exitProfile(car.speed):null
  mode=next;clearControls();unattended.delete(car)
  if(!exit)car.speed=car.travel=car.accel=car.slip=0
  car.throttle=car.shiftDelay=car.remainder=0;car.braking=false
  lastSide=destination.side
  transition={time:0,from:{x:pos.x,z:pos.z},door:destination.door,side:lastSide,
   x:car.x,z:car.z,heading:car.heading,face,exit}
  renderer.shadowMap.needsUpdate=true
  ui.sound('doorOpen',pos)
 }
 function transferDriver(destination){
  const {car:vehicle,occupied,side}=destination
  const exit=safeExit(vehicle,boxes,-side,(x,z)=>blockedAtDoor(vehicle,x,z)||Math.hypot(x-pos.x,z-pos.z)<1)
  if(!exit){ui.toast('운전자가 내릴 공간이 없어');return false}
  const {system,unit}=occupied
  if(!system.claim(vehicle))return false
  registerTakenCar(unit)
  const driver=driverRigs.get(unit.rig)
  driver.root.removeFromParent();driver.root.scale.setScalar(1);driver.root.visible=false;scene.add(driver.root)
  const from={x:vehicle.x,z:vehicle.z}
  car=vehicle;startTransition(destination,'enter')
  transition.npc={rig:driver,exit,from,time:0}
  crowd.wanted.report(vehicle,1)
  ui.toast('운전자가 놀라 차에서 내리고 있어')
  return true
 }
 function driverLeaving(dt){
  const npc=transition.npc
  npc.time+=dt
  const pose=entryPose(car,{...npc.exit,from:npc.from,time:Math.min(entryTime,npc.time*2)},false)
  const root=npc.rig.root
  car.door=pose.opening;root.visible=pose.visible
  root.position.set(pose.x,groundHeight(pose.x,pose.z)+pose.y,pose.z);root.rotation.y=pose.face
  npc.rig.update(dt,0,{vehicle:{side:npc.exit.side,crouch:pose.crouch,reach:pose.reach}})
  if(npc.time*2>=entryTime)finishDriverDeparture(npc,car)
 }
 function finishDriverDeparture(npc,vehicle){
  const {x,z}=npc.exit.door,root=npc.rig.root
  const dx=x-vehicle.x,dz=z-vehicle.z,d=Math.hypot(dx,dz)||1
  root.position.set(x,groundHeight(x,z),z);root.visible=true
  departed.push({rig:npc.rig,dx:dx/d,dz:dz/d,time:0})
  vehicle.door=0
  if(transition)transition.npc=null
 }
 function interactCar(selected){
  if(!selected&&boating())return waterInteraction()
  if(activity.current){activity.leave();return true}
  if(mode==='walk'){
   if(crowd.talking){crowd.endTalk();return true}
   if(!canAct())return true
   const destination=selected??nearestDoor();if(!destination)return false
   if(room.phase==='connected'){
    const id=destination.car.id
    if(!room.send({t:'move',p:playerPacket()})||!room.send({t:'seat',car:id,side:destination.side})){
     ui.toast('서버와 통신 중이야. 다시 시도해');return true
    }
    pendingSeat={id,deadline:performance.now()+2500};clearControls()
   }else if(room.phase==='offline'){
    if(destination.occupied)return transferDriver(destination)
    car=destination.car;startTransition(destination,'enter')
   }
  }else if(driving()){
   if(room.phase!=='offline'&&Math.abs(car.speed)>.45){ui.toast('온라인에서는 정차한 뒤 하차할 수 있어');return true}
   const destination=safeExit(car,boxes,lastSide,(x,z)=>blockedAtDoor(car,x,z))
   if(!destination){ui.toast('차 양옆에 공간이 없어. 조금 옮겨서 정차해');return true}
   startTransition(destination,'exit')
  }
  return true
 }
 function cancelTransition(){
  const joining=mode==='enter',prior=transition
  if(prior.npc)finishDriverDeparture(prior.npc,car)
  car.door=0;transition=vehiclePose=null;clearControls()
  mode=joining?'walk':'drive'
  if(joining){face=prior.face;plantFeet(prior.from.x,prior.from.z)}
  else pos.set(car.x,0,car.z)
  actor.visible=joining
  if(joining)releaseSeat()
  renderer.shadowMap.needsUpdate=true
 }
 function updateTransition(dt){
  if(transition.npc){driverLeaving(dt);return}
  const joining=mode==='enter'
  const {exit}=transition
  if(exit){
   coastVehicle(car,dt)
   const next=safeExit(car,boxes,lastSide,(x,z)=>blockedAtDoor(car,x,z))
   if(next?.side!==lastSide){cancelTransition();ui.toast('하차 경로가 막혔어');return}
   transition.door=next.door
  }
  const changed=!exit&&(Math.hypot(car.x-transition.x,car.z-transition.z)>.09||Math.abs(car.heading-transition.heading)>.09)
  const origin=joining?transition.from:doorPoint(car,lastSide,.05)
  if(changed||player.f.action||!clearPath(origin,transition.door,boxes,.32,(x,z)=>blockedAtDoor(car,x,z))){
   cancelTransition();ui.toast('차량 주변이 막혀 승하차가 중단됐어');return
  }
  transition.time+=dt
  const pose=exit?movingExitPose(car,lastSide,transition.door,transition.time,exit):entryPose(car,transition,joining)
  car.door=rigs[car.id].hinged?pose.opening:0
  vehiclePose=pose;walkSpeed=pose.speed
  pos.set(pose.x,0,pose.z);actor.position.set(pose.x,pose.y,pose.z)
  face=pose.face;actor.rotation.set(0,face,pose.bank??0);actor.visible=pose.visible;char.root.position.y=0
  if(!car.setup.bike||!pose.ride)char.update(dt,pose.speed,car.setup.bike?{}:{vehicle:{side:lastSide,crouch:pose.crouch,reach:pose.reach}})
  renderer.shadowMap.needsUpdate=true
  if(transition.time<(exit?.duration??entryTime))return
  car.door=0
  ui.sound('doorClose',pos)
  if(joining){
   ui.sound(car.setup.bike?'bikeStart':'engineStart',pos)
   mode='drive';pos.set(car.x,0,car.z);actor.visible=!!car.setup.bike
   if(!offline&&car===cars.touring)mission.board()
   if(room.phase==='offline')playerParked.add(car)
  }else{
   mode='walk';actor.visible=true;plantFeet(pos.x,pos.z)
   if(exit)unattended.set(car,1.4)
   releaseSeat()
   if(!offline&&car===cars.touring&&mission.exit())ui.toast('FIRST DRIVE 완료 · 주행 기록 저장')
  }
  transition=vehiclePose=null;clearControls()
 }
 function handleCrash(struck,collision){
  if(!collision)return
  const {speed,x,z,damage,eject,vehicle}=collision
  if(speed>3.5){
   ui.sound(vehicle?'crash':'wallHit',struck,Math.min(1.6,.45+speed*.065))
   shake=Math.max(shake,Math.min(1,speed*.061))
  }
  if(!damage||!injure(player.f,damage,x*Math.cos(face)-z*Math.sin(face)>0?1:-1,'body',{weaponHit:true}))return
  ui.impact(true);activity.stop()
  const exit=(eject||!player.f.hp)&&crashExit(struck,collision,boxes,(px,pz)=>blockedAtDoor(struck,px,pz))
  if(exit){
   mode='walk';transition=vehiclePose=null
   face=Math.atan2(x,z);plantFeet(exit.door.x,exit.door.z);actor.visible=true
   releaseSeat();clearControls()
   if(player.f.hp)Object.assign(player.f,{action:'knockdown',elapsed:0,duration:1.65+Math.min(2,speed*.062)})
   impulse(player.f,'vehicle',x,z,speed*4,{face,lift:.25})
   if(struck.setup.bike)struck.speed=-Math.sign(previousCar.speed)*Math.min(2.4,speed*.13)
   ui.toast(player.f.hp?'충돌 · 오토바이에서 떨어졌어':'강한 충돌로 쓰러졌어')
  }else if(player.f.hp)ui.toast('충돌 · 체력 '+player.f.hp+'/'+player.f.maxHealth)
  if(!player.f.hp)beginPlayerDeath()
 }
 function playerPacket(){
  return packPlayer({x:pos.x,z:pos.z,y:actor.position.y+char.root.position.y,face:wrapAngle(face),
   speed:isPaused||player.f.hp<=0?0:walkSpeed,jump:foot.phase,land:foot.land,visible:actor.visible,
   crouch:vehiclePose?.crouch??0,reach:vehiclePose?.reach??0,side:vehiclePose?lastSide:0})
 }
 function releaseSeat(){
  if(!localSeat)return
  localSeat=null
  if(!room.send({t:'release',p:playerPacket()}))room.interrupt()
 }
 function resetWalk(x,z,direction,floor){
  pendingSeat=localSeat=transition=vehiclePose=seaTransition=boat=null;mode='walk';car=cars.touring
  face=direction;plantFeet(x,z,floor)
  actor.visible=true
  crowd.endTalk();clearControls();walkSpeed=0
  renderer.shadowMap.needsUpdate=true
 }
 function recover(kind){
  if(kind==='input'||kind==='all')clearControls()
  if(kind==='position'||kind==='all'){
   if(custody.active){ui.toast('현재 구금 중이야. 석방 절차가 이어져.');return}
   const safe=recoveryPosition(pos,room.phase==='offline'?checkpoint.current:null,
    room.phase==='offline'?[garage,safeSpawn]:[safeSpawn],floorAt,canRestore)
   if(!safe){ui.toast('안전한 복귀 지점을 찾지 못했어.');return}
   activity.stop()
   if(transition?.npc)finishDriverDeparture(transition.npc,car)
   if(transition||driving())car.door=0
   if(boat){boat.throttle=0;boat.stepTime=0}
   const seat=localSeat
   resetWalk(safe.x,safe.z,Number.isFinite(face)?face:0,safe.y)
   localSeat=seat;releaseSeat()
   shadow.visible=true
   clearStuckMotion(player.f)
  }
  if(kind==='camera'||kind==='all'){
   yaw=operating()?(boating()?boat.heading:car.heading):Math.PI-face
   if(!Number.isFinite(yaw))yaw=garage.yaw
   pitch=.13;distance=4.65;lookHold=0;shake=0;cameraBlend=wetView=0
   cancelAim();setZoom(1);positionCamera(0,true)
   if(isPaused)renderer.render(scene,camera)
  }
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
   clearCivilians()
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
  saveCheckpoint();unattended.clear();clearCivilians();room.start(endpoint,request)
 }
 const ui=createUI({interactions,recover,restartPrologue,storyStatus:()=>storyStatus,storyMarkers:storyWorld.markers,trafficLabel:()=>trafficDensity.label,cycleTraffic:()=>trafficDensity.cycle(),useCity,activity,vehicleAction,loadout,selectEquipment,reloadEquipment,aiming:()=>aiming,scoped:()=>scopeVisible,inCell:()=>custody.canPunch,canAttack,useWestBank,testSignal:market.testSignal,episode,useItem,foot,canAct,canJump,converse,crowd,player,feedback:()=>feedbackTime>0?focus:null,get car(){return boating()?boat:driving()?car:cars.touring},get cars(){return room.phase==='offline'&&claimedTraffic.length?fleet.concat(claimedTraffic):fleet},room,startRoom,missionEnabled:()=>!offline&&!custody.active&&!episode.openingActive,mission,driving,boating,swimming:()=>inWater()?swimming:null,mode:()=>mode,stats:()=>({ms:recentFrameMs,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,width:canvas.width,height:canvas.height}),pos,yaw:()=>yaw,setPaused:value=>{isPaused=value;if(value)activity.stop();clearControls()},quality:()=>({auto:'자동',high:'높음',low:'낮음'}[quality]),cycleQuality:()=>{quality=nextQuality(quality);writeQuality(quality)
  const settings=profile()
  renderer.setPixelRatio(settings.pixelRatio)
  sunlight.castShadow=renderer.shadowMap.enabled=settings.worldShadows
  for(const mesh of playerMeshes)mesh.castShadow=settings.playerShadows
  renderer.shadowMap.needsUpdate=true}})
 const pressed=code=>keys.has(code)?1:0
 window.addEventListener('keydown',e=>{if(crowd.talking||custody.locked||isPaused||player.f.hp<=0||document.querySelector('#game').inert)return;
  const cabinKey={KeyH:'horn',KeyL:'lights',KeyB:'radio'}[e.code]
  if(driving()&&cabinKey&&!e.repeat){e.preventDefault();vehicleAction(cabinKey);return}
  if(inWater()&&e.code==='Space'&&!e.repeat){e.preventDefault();toggleDive();return}
  if(!e.repeat&&mode==='walk'){
   const slot={Digit1:'fists',Digit2:'pistol',Digit3:'shotgun',Digit4:'bat',Digit5:'sniper',Digit6:'grenade'}[e.code]
   if(slot){selectEquipment(slot);return}
   if(e.code==='KeyR'){reloadEquipment();return}
   if(e.code==='KeyQ'){ui.show('equipment');return}
  }
  if(activity.current&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','Space'].includes(e.code)&&!e.repeat)activity.leave()
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
  if(e.button===2)aiming=!custody.active&&(!!loadout.def.capacity||loadout.def.consumable)&&!equipment.throwing&&!foot.air&&!player.f.action
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
  const ids=new Set();pedalPointers.set(b,ids);b.onpointerdown=e=>{if(!operating()||isPaused)return;b.setPointerCapture(e.pointerId);ids.add(e.pointerId);pedals.add(b.dataset.pedal);b.classList.add('held')}
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
 document.querySelector('#gear-aim').onclick=()=>{if(aiming)cancelAim();else if(!custody.active&&!isPaused&&mode==='walk'&&!crowd.talking&&(loadout.def.capacity||loadout.def.consumable)&&!equipment.throwing&&!foot.air&&!player.f.action)aiming=true}
 jumpButton.onpointerdown=e=>{e.preventDefault();jumpButton.setPointerCapture(e.pointerId);if(inWater())toggleDive();else jump()}
 document.querySelector('#dive-toggle').onclick=toggleDive
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
  wetView=damp(wetView,inWater()?swimming.wet:0,5,dt)
  const arm=viewDistance+cameraBlend*car.setup.camera+(boating()?2.1:0)-wetView
  const tilt=pitch+cameraBlend*.115-loadout.recoil*(loadout.selected==='sniper'?.038:.021)
  const sn=Math.sin(yaw),cs=Math.cos(yaw),lift=Math.sin(tilt),flat=Math.cos(tilt)
  followHeight=initial?actor.position.y:damp(followHeight,actor.position.y,12,dt)
  const vehicleHeight=car.setup.cameraHeight+(room.phase==='offline'?car.lift:0)
  const sideOffset=(.26+.43*shoulder)*(1-cameraBlend)
  const height=(inWater()?1.13-.82*wetView:1.54)-.08*shoulder
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
  if(insideWorks(pos.x,pos.z)&&eye.y>anchor.y){
   const ceiling=ceilingHeight(pos.x,pos.z,pos.y)-.18
   if(eye.y>ceiling)fraction=Math.min(fraction,Math.max(.04,(ceiling-anchor.y)/(eye.y-anchor.y)))
  }
  if(localRoom&&eye.y>anchor.y){
   const ceiling=rowCeiling(localRoom,pos.x,pos.y)-.14
   if(eye.y>ceiling)fraction=Math.min(fraction,Math.max(.04,(ceiling-anchor.y)/(eye.y-anchor.y)))
  }
  const availableArm=arm*fraction
  actualArm=initial?availableArm:availableArm<actualArm?availableArm:damp(actualArm,availableArm,8,dt)
  reach.copy(eye).sub(anchor).multiplyScalar(actualArm/arm)
  camera.position.copy(anchor).add(reach)
  if(coastFloor(pos.x,pos.z)&&!inOldTown(pos.x,pos.z)){
   camera.position.y=wetView>.53?Math.min(seaLevel-.18,camera.position.y):Math.max(seaLevel+.20,camera.position.y)
  }else camera.position.y=Math.max(.24,camera.position.y)
  const submerged=camera.position.y<seaLevel-.06
  const depth=Math.max(0,seaLevel-camera.position.y)
  if(submerged){
   waterColor.setHex(0x5b9286).lerp(waterDeep,1-Math.exp(-depth*.31))
   scene.fog.color.copy(waterColor)
  }else scene.fog.color.copy(landFog)
  scene.fog.density=submerged?.064+depth*.012:landDensity
  scene.background=submerged?waterColor:landBackground
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
 if(episode.prologue?.checkpoint){
  const {x,z}=episode.prologue.checkpoint
  if(canWalk(x,z,boxes,.32,groundHeight(x,z))&&!occupied(x,z))plantFeet(x,z)
 }
 updateFittings(pos);updateBasin(pos);coastUpdate(pos);boatRigs.update(0,0,pos,null);updateTown(true,pos);updateRow(pos,0);market.update(pos);westBank.update(0,0,pos)
 trackedX=pos.x;trackedZ=pos.z
 sunlight.position.x=trackedX+34;sunlight.target.position.x=trackedX
 sunlight.position.z=trackedZ-49;sunlight.target.position.z=trackedZ-9
 positionCamera(0,true)
 function footSurface(){
  const {x,z,y}=pos
  if(coastFloor(x,z)&&!inOldTown(x,z))return inPier(x,z)?'wood':y<seaLevel+.10?'splash':'sand'
  if(insideBasin(x,z)&&basinGreen.some(g=>within(g.bounds,x,z)))return 'grass'
  if(within(pocketGarden,x,z)||x>-174.4&&x<-159.6&&z>39.6&&z<54.8)return 'grass'
  if(insideTerrace(x,z)||rowRoomAt(x,z))return y>1.8?'stairs':'wood'
  if(x>15&&onQuay(x,z))return 'metal'
  return groundHeight(x,z)-breakwaterGradeAt(x,z)<.04?'asphalt':'concrete'
 }
 function groundHeight(x,z){
  if(coastFloor(x,z)&&!inOldTown(x,z)&&!inDocklands(x,z))return beachGround(x,z)
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
  const room=rowRoomAt(x,z),terrace=terraceRoomAt(x,z)
  return room?rowCeiling(room,x,feet):x<archive.front&&archiveAccess(x,z,0)?archive.ceiling:
   terrace?terraceCeilingAt(terrace,x,z,feet):atStation(x,z)?station.ceiling:atGarage(x,z)?garage.ceiling:insideWorks(x,z)?
   (feet<.48&&x<worksLoft.east&&z<worksLoft.south&&z>worksLoft.north?worksLoft.height-.20:worksRoof):
   (insidePremises(x,z)||insideWeaponShop(x,z))?3.44:Infinity
 }
 function floorAt(x,z,feet,airborne=false){
  const localRoom=rowRoomAt(x,z),terrace=terraceRoomAt(x,z)
  const base=localRoom?rowFloor(localRoom,x,z,feet,airborne):
   terrace?.loft?terraceFloorAt(terrace,x,z,feet,airborne):insideWorks(x,z)?worksUpper(x,z,feet,airborne):groundHeight(x,z)
  return supportHeight(x,z,feet,base,surfaces)
 }
 function plantFeet(x,z,floor=groundHeight(x,z)){
  foot.reset(floor)
  pos.set(x,foot.height,z);actor.position.copy(pos);shadow.position.y=.014;shadow.visible=true
  uprightRider(actor,char,face)
 }
 function restartPrologue(fallback){
  const story=episode.prologue
  if(!story?.active)return
  storyWorld.enter(story.stage);loadout.missionLoan(false)
  const point=story.checkpoint
  if(point&&canWalk(point.x,point.z,boxes,.32,groundHeight(point.x,point.z))&&!occupied(point.x,point.z)){
   releaseSeat();revive(player.f)
   resetWalk(point.x,point.z,face)
  }else if(!point&&fallback&&room.phase==='offline'){
   const safe=resolveCheckpoint(fallback,[],floorAt,(x,z,y)=>canRestore(x,z,y)&&!canStartSwimming(x,z))
   if(!safe)return
   yaw=fallback.yaw;pitch=fallback.pitch;distance=fallback.distance
   resetWalk(safe.x,safe.z,fallback.face,safe.y)
  }
 }
 let saveClock=0,sampleClock=0,checkpointEnabled=false
 function rememberCheckpoint(){
  if(!checkpointEnabled||room.phase!=='offline'||offline||custody.active||transition||mode!=='walk'&&!driving()||player.f.hp<=0)return
  const point=driving()?safeExit(car,boxes,lastSide,(x,z)=>blockedAtDoor(car,x,z))?.door:pos
  if(!point||(!driving()&&foot.air)||canStartSwimming(point.x,point.z))return
  const {x,z}=point,y=floorAt(x,z,driving()?groundHeight(x,z):foot.height)
  checkpoint.sample({x,y,z,face:driving()?Math.PI-car.heading:face,yaw,pitch,distance},{
   offline:true,grounded:driving()||Math.abs(y-foot.height)<.08,safe:canRestore(x,z,y)
  })
 }
 function saveCheckpoint(){
  rememberCheckpoint()
  if(checkpointEnabled&&room.phase==='offline'&&!offline){
   const poses=parkedPoses(fleet.filter(vehicle=>!trafficDriver(vehicle)),parkedSpawns)
   for(const {id,x,z,heading} of playerParked)poses[id]={x,z,heading:wrapAngle(heading)}
   checkpoint.sampleVehicles(poses,true)
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
 function poseAshore(dt){
  const transfer=seaTransition
  const weight=clamp((transfer.time+=dt)/(transfer.pace>.65?.55:.66),0,1),blend=weight*weight*(3-2*weight)
  if(transfer.to==='boat')boatRigs.pilot(boat).getWorldPosition(pilotPoint)
  else{
   const {x,z}=transfer.exit
   pilotPoint.set(x,transfer.to==='walk'?groundHeight(x,z):seaLevel-.73,z)
  }
  actor.position.copy(transfer.from).lerp(pilotPoint,blend)
  actor.position.y+=Math.sin(weight*Math.PI)*(transfer.pace>4.2?.62:.46)
  const turn=transfer.to==='boat'?Math.PI-boat.heading:transfer.turn
  face=transfer.turn+steerTo(transfer.turn,turn)*blend
  actor.rotation.set(0,face,0);pos.copy(actor.position)
  char.update(dt,0,{marineSeat:transfer.to==='boat'?blend:1-blend})
  shadow.visible=false
  if(weight<1)return
  seaTransition=null;mode=transfer.to
  if(boating()){yaw=boat.heading;ui.sound('boatStart',pos);ui.toast(boat.name+' · W 가속 · E 하선')}
  else{
   if(boat?.speed){boat.speed=boat.throttle=boat.stepTime=0}
   boat=null
   if(inWater())enterWater()
   else {plantFeet(pos.x,pos.z);shadow.visible=true}
  }
 }
 function poseBoat(dt){
  const pilot=boatRigs.pilot(boat)
  pilot.getWorldPosition(pilotPoint);pilot.getWorldQuaternion(pilotRotation)
  actor.position.copy(pilotPoint);actor.quaternion.copy(pilotRotation)
  actor.visible=true;shadow.visible=false;face=Math.PI-boat.heading
  char.update(dt,0,{marineSeat:1})
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
   if(updateTown(room.phase==='offline',pos,quality==='low'))renderer.shadowMap.needsUpdate=true
   if(pressed('ArrowRight')||pressed('ArrowLeft'))lookHold=2.2
   yaw+=(pressed('ArrowRight')-pressed('ArrowLeft'))*1.65*dt
   coffee=Math.max(0,coffee-dt)
   activity.update(dt);fixtures.update(pos)
   advance(player.f,dt);feedbackTime=Math.max(0,feedbackTime-dt)
   let speed=0
   custody.update(dt);custodyView.update(custody)
   mealProp.visible=false
   if(custody.officer){
    custodyView.pose(dt,custody,actor,custody.officer);walkSpeed=0
    renderer.shadowMap.needsUpdate=true
   }else if(custody.locked||deathScreen.active&&inWater()){walkSpeed=0}
   else if(transition){updateTransition(dt)}
   else if(seaTransition){
    if(seaTransition.drift){boat.throttle=0;driveBoat(boat,{forward:0,back:0,steer:0,brake:true},dt,boats)}
    boatRigs.update(dt,elapsed,pos,null);poseAshore(dt)
   }else if(boating()){
    const steer=clamp(pressed('KeyD')-pressed('KeyA')+joystick.x,-1,1)
    const forward=Math.max(pressed('KeyW'),pressed('ArrowUp'),Number(pedals.has('gas')))
    const back=Math.max(pressed('KeyS'),pressed('ArrowDown'),Number(pedals.has('brake')))
    boat.throttle=forward-back
    const hit=driveBoat(boat,{forward,back,steer,brake:pressed('Space')||pedals.has('hold')},dt,boats)
    pos.set(boat.x,seaLevel,boat.z);speed=Math.abs(boat.speed)
    boatRigs.update(dt,elapsed,pos,boat);poseBoat(dt)
    lookHold=Math.max(0,lookHold-dt)
    if(!drag&&!lookHold)yaw+=steerTo(yaw,boat.heading)*(1-Math.exp(-2.4*dt))
    if(hit>2.4){ui.sound('wallHit',pos,Math.min(1.4,hit/5));shake=Math.min(.8,hit*.07)}
   }else if(inWater()){
    const ax=pressed('KeyD')-pressed('KeyA')+joystick.x,az=pressed('KeyW')+pressed('ArrowUp')-pressed('KeyS')-pressed('ArrowDown')-joystick.y
    const length=Math.max(1,Math.hypot(ax,az)),sn=Math.sin(yaw),cs=Math.cos(yaw)
    const matchLand=(x,z)=>canWalk(x,z,boxes,.32,beachGround(x,z))
    const wet=swimming.step(pos,dt,(ax*cs+az*sn)/length,(ax*sn-az*cs)/length,elapsed,matchLand,
     (x,z)=>boats.some(b=>Math.hypot(x-b.x,z-b.z)<.67&&pos.y>seaLevel-1.7))
    speed=wet.speed
    if(wet.land){
     mode='walk';plantFeet(pos.x,pos.z);shadow.visible=true
    }else{
     if(speed>.06)face+=steerTo(face,wet.face)*(1-Math.exp(-9*dt))
     actor.position.copy(pos);actor.rotation.set(0,face,0);shadow.visible=false
     char.update(dt,0,{swim:{motion:Math.min(1,speed/2.35),phase:swimming.stroke,dive:swimming.wet}})
     if(speed>.75&&swimming.wet<.5&&elapsed>splashAt){
      splashAt=elapsed+.68;ui.sound('splash',pos,.30)
     }
     if(wet.damage){
      ui.impact(true)
      if(wet.damage<player.f.hp)player.f.hp-=wet.damage
      else{
       injure(player.f,player.f.hp+player.f.armor,1,'body',{weaponHit:true})
       beginPlayerDeath()
      }
     }
    }
   }else if(driving()){
    const input={forward:Math.max(pressed('KeyW'),pressed('ArrowUp'),Number(pedals.has('gas'))),back:Math.max(pressed('KeyS'),pressed('ArrowDown'),Number(pedals.has('brake'))),steer:clamp(pressed('KeyD')-pressed('KeyA')+joystick.x,-1,1),handbrake:pressed('Space')||pedals.has('hold')}
    Object.assign(previousCar,{x:car.x,z:car.z,heading:car.heading,speed:car.speed,width:car.width,length:car.length})
    const solo=room.phase==='offline'
    stepDrive(car,input,boxes,dt,traffic,solo,undefined,solo?soloTunings.get(car.id):null)
    handleCrash(car,crashes(car,elapsed))
    const strikes=pedestrianImpacts(dt,previousCar,car,crowd.all,(resident,damage,impact)=>{
     if(!crowd.vehicleHit(resident,car,damage,impact))return false
     effects.emit('dust',resident.pos.x,resident.pos.y+.1,resident.pos.z,impact.knockout?7:4,impact.x,impact.z)
     focus=resident;feedbackTime=2.5
     return true
    })
    if(strikes)car.speed*=Math.pow(.85,strikes)
    speed=Math.abs(car.speed)
    if(driving()){pos.x=car.x;pos.z=car.z;actor.visible=!!car.setup.bike;mission.tick(!offline&&car===cars.touring)}
    lookHold=Math.max(0,lookHold-dt)
    if(!drag&&!lookHold){const error=car.heading-yaw;yaw+=Math.atan2(Math.sin(error),Math.cos(error))*(1-Math.exp(-(speed>.6?3.4:1.5)*dt))}
   }else{
   const ax=pressed('KeyD')-pressed('KeyA')+joystick.x,az=pressed('KeyW')+pressed('ArrowUp')-pressed('KeyS')-pressed('ArrowDown')-joystick.y
   const length=Math.max(1,Math.hypot(ax,az)),sn=Math.sin(yaw),cs=Math.cos(yaw)
   const pace=foot.rate(pressed('ShiftLeft')||pressed('ShiftRight'),joystick.length(),stickId!==null)*(player.f.action==='punch'?.36:player.f.action?0:1)
   if(activity.current&&(Math.abs(joystick.x)>.5||Math.abs(joystick.y)>.5))activity.leave()
   const rate=sniperAiming()||activity.current||player.f.action==='hit'||player.f.action==='knockdown'||player.f.action==='down'?0:
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
   const liftImpact=moveImpact(player.f,pos,dt,boxes,occupied)
   if(!player.f.motion)movePlayer(pos,velocity.x*dt,velocity.y*dt,boxes,occupied,foot.height)
   const floor=floorAt(pos.x,pos.z,foot.height,foot.air)
   const landing=foot.advance(dt,floor,ceilingHeight(pos.x,pos.z,foot.height)-player.height)
   if(landing){effects.land(pos.x,floor,pos.z,landing);ui.sound(footSurface(),pos,.7)}
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
   actor.rotation.set(0,face,0);actor.position.copy(pos);actor.position.y+=liftImpact
   const action=activity.current
   if(action?.spot.pose==='sit'){
    actor.position.z+=(action.spot.seatZ-pos.z)*action.weight
    actor.position.x+=(action.spot.x-pos.x)*action.weight
   }
   if(action&&speed<.08)renderer.shadowMap.needsUpdate=true
   char.update(dt,speed,{...combatPose(player.f),jump:foot.phase,land:foot.land,city:action,
    step:foot.air?null:()=>{
     const surface=footSurface()
     ui.sound(surface,pos,.49)
     if(surface==='sand'&&pos.x>46)coastUpdate.footstep(pos.x,pos.z,face,elapsed)
    },
    guard:feedbackTime>0&&focus?.f.hp>0&&Math.hypot(focus.pos.x-pos.x,focus.pos.z-pos.z)<8,
    turn:dt>0?(face-previousFace)/dt:0})
   if(action?.spot.pose==='eat'||action?.spot.pose==='drink'){
    actor.updateMatrixWorld(true)
    char.handPosition(-1,mealProp.position)
    mealProp.scale.setScalar(action.spot.pose==='eat'?.68:1)
    mealProp.visible=action.weight>.25
   }
   if(!custody.active&&player.f.action==='punch')contact(player.f,char,pos,crowd.all,crowd.lineClear,(n,zone,point)=>{
    if(crowd.receive(n,pos,zone,point)){focus=n;feedbackTime=4;ui.impact(false)}
   })
   if(room.phase==='offline'&&!custody.active&&player.f.hp>0&&pos.y<seaLevel+.05&&canStartSwimming(pos.x,pos.z))enterWater()
   }
   if(!boating()&&!seaTransition)boatRigs.update(dt,elapsed,pos,null)
   boatRigs.swimTrail(pos.x,pos.z,Math.PI-face,inWater()&&swimming.wet<.55?speed:0,elapsed,.55)
   updateGrenades(dt)
   for(const [vehicle,time] of unattended){
    coastVehicle(vehicle,dt,time<.7)
    if(time<=dt||Math.abs(vehicle.speed)<.15){vehicle.speed=0;unattended.delete(vehicle)}
    else unattended.set(vehicle,time-dt)
   }
   for(const vehicle of (claimedTraffic.length&&room.phase==='offline'?fleet.concat(claimedTraffic):fleet)){
    const mounted=vehicle===car&&(driving()||(vehiclePose?.ride??0)>.6)
    rigs[vehicle.id].updatePose({...vehicle,dt,mounted,lift:room.phase==='offline'?vehicle.lift:0})
    effects.vehicle(vehicle,dt,Math.hypot(vehicle.x-pos.x,vehicle.z-pos.z))
    vehicle.travel=0;vehicle.impact=0;vehicle.collision=null
   }
   headlight.visible=(driving()||mode==='exit')&&lamps.has(car.id)
   if(headlight.visible){
    const fx=Math.sin(car.heading),fz=-Math.cos(car.heading),nose=car.length/2
    headlight.position.set(car.x+fx*nose,.73+car.lift,car.z+fz*nose)
    headlight.target.position.set(car.x+fx*23,.18,car.z+fz*23)
    headlight.intensity=23
   }
   for(let i=departed.length-1;i>=0;i--){
    const resident=departed[i],root=resident.rig.root
    resident.time+=dt
    if(resident.time>5&&!trafficInView(root.position)){
     root.removeFromParent();resident.rig.dispose();departed.splice(i,1);continue
    }
    if(resident.time>.45&&resident.time<5){
     const beforeX=root.position.x,beforeZ=root.position.z
     movePlayer(root.position,resident.dx*dt*2.2,resident.dz*dt*2.2,boxes,occupied)
     root.position.y=groundHeight(root.position.x,root.position.z)
     root.rotation.y=Math.atan2(resident.dx,resident.dz)
     resident.rig.update(dt,Math.hypot(root.position.x-beforeX,root.position.z-beforeZ)/Math.max(dt,.001))
    }else resident.rig.update(dt,0)
   }
   if(car.setup.bike&&(driving()||vehiclePose?.ride))poseMotorcycle(dt)
   if(!transition&&mode==='walk')walkSpeed=speed
   else walkSpeed=0
   remoteShadow=presence.update(frame,room.session?.id,dt)||remoteShadow
   player.available=!custody.active&&mode==='walk'&&player.f.hp>0&&!foot.air
   const progress=player.f.hp>0?episode.update(dt,{x:pos.x,z:pos.z,speed,inVehicle:operating(),driving:driving()&&car===cars.touring,onFoot:player.available}):null
   if(progress)ui.toast(progress.message)
   player.inVehicle=driving()?car:null
   player.exposed=!custody.active&&player.f.hp>0&&(mode==='walk'||driving())
   const prologue=room.phase==='offline'?episode.prologue:null
   const stage=player.f.hp>0?prologue?.stage:null
   const missionWeapon=!!(stage?.set||stage?.carry)&&stage?.set!=='pursuit'
   if(loadout.missionLoan(missionWeapon)){cancelAim();equipment.interrupt()}
   const roadDriving=!!player.inVehicle
   const beats=storyWorld.step(stage,dt,player,player.available,roadDriving)
   storyStatus=beats.objectiveStatus||(stage?.kind==='escort'&&Number.isFinite(beats.escortHealth)?'Theo '+beats.escortHealth+'/130':
    stage?.kind==='evade'&&beats.threats?'추격 차량 '+beats.threats+'대':
    stage?.kind==='fight'&&beats.threats?'조직원 '+beats.threats+'명':'')
   const update=player.f.hp<=0?null:beats.failed?prologue?.fail('Theo를 구출하지 못했습니다.'):
    prologue?.update({x:pos.x,z:pos.z,speed,onFoot:player.available,driving:roadDriving,...beats})
   if(update?.message)ui.toast(update.message)
   player.legacyArrest=room.phase!=='offline'
   const police=squads.update(dt,pos,player.inVehicle,crowd.wanted,!player.legacyArrest)
   trafficProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)
   trafficView.setFromProjectionMatrix(trafficProjection)
   walkers.length=0
   if(!driving()&&pos.y<1.35&&!foot.air)walkers.push(pos)
   for(const resident of crowd.all)if(resident.pos.y<1.35&&!resident.policeOrder?.aboard)walkers.push(resident.pos)
   for(const resident of departed)walkers.push(resident.rig.root.position)
   const trafficLocal=room.phase==='offline'&&!custody.active
   const nextSignal=marketSignal(elapsed)
   if(nextSignal!==signal){signal=nextSignal;rigs.trafficSignal(signal)}
   for(const vehicle of claimedTraffic)if(trafficLocal&&!traffic.includes(vehicle)){
    traffic.push(vehicle);rigs[vehicle.id].root.visible=true
   }
   remoteShadow=civilians.update(dt,pos,{enabled:trafficLocal,limit:trafficDensity.limit(coarse?3:dockCapacity,coarse,recentFrameMs),
    walkers,inView:trafficInView})||remoteShadow
   for(const system of regionalTraffic)remoteShadow=system.update(dt,pos,{enabled:trafficLocal,
    limit:trafficDensity.limit(coarse?2:capacity,coarse,recentFrameMs),walkers,inView:trafficInView})||remoteShadow
   for(let i=fleet.length;i<traffic.length;i++){
    const vehicle=traffic[i]
    if(claimedTraffic.includes(vehicle))continue
    effects.vehicle(vehicle,dt,Math.hypot(vehicle.x-pos.x,vehicle.z-pos.z))
    vehicle.collision=null
   }
   player.squadObserver=police.observed
   remoteShadow ||= police.moving
   crowd.update(dt,camera,player,hitPlayer,(outcome,officer)=>{
    if(outcome==='arrest')beginCustody(officer)
    else ui.toast(outcome==='warning'?'항만 경찰 · 경고 후 조사 종료':'수배 해제')
   },(officer,from,to,vehicle)=>{
    effects.muzzle(from,2);effects.trace(from,to);ui.shot('pistol',from)
    if(vehicle)effects.emit('sparks',to.x,to.y,to.z,4)
    else if(player.exposed)hitPlayer(officer,'body',to,18,'shot')
   })
   portUpdate(dt,elapsed,quality==='low')
   if(Math.abs(pos.x-trackedX)>10||Math.abs(pos.z-trackedZ)>10){trackedX=pos.x;trackedZ=pos.z;sunlight.position.x=trackedX+34;sunlight.target.position.x=trackedX;renderer.shadowMap.needsUpdate=true;sunlight.position.z=trackedZ-49;sunlight.target.position.z=trackedZ-9}
   const playerShadow=driving()?speed>.06:quality==='high'&&(speed>.06||foot.air||foot.land>0||!!player.f.action)
   if(((playerShadow||remoteShadow)&&elapsed-shadowTick>.09)||(crowd.shadowDirty&&elapsed-shadowTick>.32)){renderer.shadowMap.needsUpdate=true;shadowTick=elapsed;remoteShadow=false}
   if(custody.officer)custodyView.camera(camera,actor,custody.officer,dt)
   else positionCamera(dt)
   const shopChanged=updateWeaponShop(pos),districtChanged=market.update(pos),stationChanged=updateStation(pos),westChanged=westBank.update(dt,elapsed,pos,quality==='low'),rowChanged=updateRow(pos,dt)
   const basinChanged=updateBasin(pos,driving()?car.speed:walkSpeed,driving()?car.heading:yaw),coastChanged=coastUpdate(pos,elapsed,camera.position.y)
   const doorsChanged=doors.update(dt,pos,crowd.all),fittingsChanged=updateFittings(pos)
   const roadChanged=setFirstWorkRoadblock(episode.roadClosed)
   if(updateVisibility()||shopChanged||districtChanged||stationChanged||westChanged||rowChanged||roadChanged||basinChanged||coastChanged||doorsChanged||fittingsChanged)renderer.shadowMap.needsUpdate=true
   scopeVisible=hideScopeBody=false
   camera.updateMatrixWorld()
   equipment.update(dt,{active:mode==='walk'&&!custody.active&&!pendingSeat&&!crowd.talking&&!player.f.action&&!activity.current,aiming,
    speed,raise:stance.raise,ready:sniperAiming()&&stance.eye===1,alignScope,pitch:sniperAiming()?-pitch:Math.asin(clamp(camera.getWorldDirection(cameraDirection).y,-1,1))})
   if(!scopeVisible)setZoom(1)
   if(aiming&&loadout.def.consumable&&loadout.item.reserve&&!equipment.throwing&&canAttack())guide.show(now,currentThrow())
   else guide.hide()
   if((sampleClock+=dt)>=.5){sampleClock=0;rememberCheckpoint()}
   if((saveClock+=dt)>=4){saveClock=0;saveCheckpoint()}
   effects.update(dt,canvas.height)
   ui.update(elapsed);updateGuide(deathScreen.active?null:ui.missionGoal(),pos)
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
  ui.updateAudio(now,()=>{
   const {x,z}=pos
   const coastal=inCoast(x,z)&&x>30
   const harbor=x>10&&z<43||x<-200&&z>96||insideBasin(x,z)&&x>20||coastal
   const park=x<-156&&x>-177&&z>37&&z<58||insideBasin(x,z)&&z>187&&x>7
   const indoor=insideTerrace(x,z)||rowRoomAt(x,z)||insidePremises(x,z)||insideWeaponShop(x,z)||atGarage(x,z)||atStation(x,z)||insideWorks(x,z)
   let policeDistance=Infinity,passing=null,passingDistance=32
   for(const unit of squads.units)if(['approach','chase','stopping'].includes(unit.stage)){
    policeDistance=Math.min(policeDistance,Math.hypot(unit.car.x-x,unit.car.z-z))
   }
   for(let i=fleet.length;i<traffic.length;i++){
    const v=traffic[i],distance=Math.hypot(v.x-x,v.z-z)
    if(Math.abs(v.speed)>1&&distance<passingDistance){passingDistance=distance;passing=v}
   }
   return {x,z,t:elapsed,yaw,car,boat:boating()?boat:null,underwater:inWater()&&swimming.wet>.55,coastal,radio,harbor,park,indoor,policeDistance,passing,passingDistance,driving:driving(),
    dialogue:!!crowd.talking,combat:feedbackTime>2.4,wanted:crowd.wanted.level,
    story:episode.openingActive,night:x<-82||elapsed>120}
  })
  requestAnimationFrame(draw)
 }
 if(contextLost)return
 renderer.render(scene,camera);ui.update(0)
 return ()=>{
  checkpointEnabled=true;saveCheckpoint();last=performance.now();requestAnimationFrame(draw)
 }
}
