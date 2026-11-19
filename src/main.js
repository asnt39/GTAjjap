import * as THREE from 'three'
import './style.css'
import {availableDoor,safeExit,nearBody,newDrive,stepDrive,localPoint} from './driving.js'
import {createEpisode} from './episode.js'
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
import {spawn,canWalk,movePlayer,cameraFraction} from './navigation.js'

// The downloadable preview resolves the same site assets from its embedded manifest.
if(window.harborPreviewAssets)THREE.DefaultLoadingManager.setURLModifier(url=>window.harborPreviewAssets[url]||url)

const canvas=document.querySelector('#world'),status=document.querySelector('#status')
const pos=new THREE.Vector3(spawn.x,0,spawn.z),velocity=new THREE.Vector2()
const keys=new Set(),boxes=[],joystick=new THREE.Vector2()
let yaw=.05,pitch=.13,distance=4.65,isPaused=false
const clamp=THREE.MathUtils.clamp, damp=THREE.MathUtils.damp
const addCollider=(a,b,c,d,h=3)=>{if(h>.15)boxes.push([Math.min(a,b),Math.max(a,b),Math.min(c,d),Math.max(c,d),h])}
const resetInput=()=>{keys.clear();joystick.set(0,0);velocity.set(0,0);document.querySelector('#stick i').style.transform=''}
const coarse=matchMedia('(pointer:coarse)').matches
let quality='auto',autoDpr=Math.min(devicePixelRatio,coarse?1:1.5)
const resolution=()=>quality==='low'?.8:quality==='high'?Math.min(devicePixelRatio,1.75):autoDpr
async function start(){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:!coarse,powerPreference:'high-performance',alpha:false})
 renderer.setPixelRatio(resolution());renderer.setSize(innerWidth,innerHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x8b94a3);const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.08,420)
 const sunlight=illumination(scene);beacons(scene,addCollider);districtGates(scene,addCollider)
 const [char,portUpdate,rig]=await Promise.all([createCharacter(),buildPort(scene,addCollider),buildStreet(scene,addCollider),buildArchitecture(scene,addCollider),sky(scene,renderer)])
 const actor=new THREE.Group();actor.add(char.root);scene.add(actor);footShadow(actor)
 if(!canWalk(pos.x,pos.z,boxes))for(let x=-3;x<=3;x+=.5){if(canWalk(x,spawn.z,boxes)){pos.x=x;break}}
 actor.position.copy(pos);actor.rotation.y=Math.PI-yaw
 const car=newDrive(rig),mission=firstDrive(car),pedals=new Set()
 let mode='walk',transition=null,lastSide=-1,cameraBlend=0,lookHold=0,recentFrameMs=0
 const foot=createFootwork(),crowd=await createResidents(scene,boxes,car)
 const player={pos,f:fighter(100),height:1.8,available:true}
 const episode=createEpisode()
 let coffee=0
 function useItem(id){
  const result=episode.use(id,player.f)
  if(result.effect?.heal)player.f.hp+=result.effect.heal
  if(result.effect?.sprintSeconds)coffee=result.effect.sprintSeconds
  return result
 }
 let focus=null,feedbackTime=0,knockX=0,knockZ=0
 const occupied=(x,z)=>nearBody(car,x,z)||crowd.blockedBy(null,x,z)
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
  if(mode!=='walk'||isPaused||foot.air||foot.land>.25||player.f.hp<=0)return
  crowd.endTalk()
  if(swing(player.f)){focus=closestTarget();foot.sprint=false}
 }
 function hitPlayer(n,zone,point){
  const dx=pos.x-n.pos.x,dz=pos.z-n.pos.z,d=Math.hypot(dx,dz)||1
  const side=(point.x-pos.x)*Math.cos(face)-(point.z-pos.z)*Math.sin(face)>0?1:-1
  if(!injure(player.f,16,side,zone))return false
  crowd.endTalk();knockX=dx/d;knockZ=dz/d;focus=n;feedbackTime=4;foot.sprint=false;ui.impact(true);return true
 }
 function respawn(arrested=false){
  for(let r=0;r<7;r+=.7)for(let i=0;i<8;i++){
   const x=spawn.x+r*Math.cos(i*Math.PI/4),z=spawn.z+r*Math.sin(i*Math.PI/4)
   if(canWalk(x,z,boxes)&&!occupied(x,z)){pos.set(x,0,z);revive(player.f);clearControls();crowd.endTalk();crowd.wanted.clear();const failed=episode.fail(arrested?'체포로 의뢰 중단':'다운으로 의뢰 중단');focus=null;ui.toast((arrested?'체포 · 부두 정문에서 석방':'부두 정문에서 정신을 차렸어')+(failed?' · 수첩에서 재시도':''));return}
  }
 }
 function talkCandidate(){return canAct()?crowd.candidate(pos):null}
 function converse(){
  if(crowd.talking){crowd.endTalk();return true}
  const n=talkCandidate();if(!n)return false
  crowd.beginTalk(n);foot.sprint=false;player.f.queued=false;return true
 }
 const driving=()=>mode==='drive'
 const canAct=()=>mode==='walk'&&!isPaused&&!foot.air&&foot.land<.25&&!player.f.action
 function jump(){if(canAct()&&!crowd.talking)foot.jump()}
 const clearControls=()=>{resetInput();foot.sprint=false;player.f.queued=false;pedals.clear();for(const b of document.querySelectorAll('[data-pedal]'))b.classList.remove('held')}
 function prompt(){
  if(driving())return Math.abs(car.speed)>.45?'정차 후 하차':'하차'
  if(crowd.talking)return '대화 마치기'
  if(canAct()&&availableDoor(car,pos,boxes))return 'Touring 탑승'
  const resident=talkCandidate();return resident?resident.name+' · 대화':''
 }
 function interactCar(){
  let destination
  if(mode==='walk'){
   if(crowd.talking){crowd.endTalk();return true}
   if(!canAct())return true
   destination=availableDoor(car,pos,boxes);if(!destination)return false
   mode='enter'
  }else if(driving()){
   if(Math.abs(car.speed)>.45){ui.toast('브레이크로 정차한 뒤 하차해');return true}
   destination=safeExit(car,boxes.concat(crowd.all.map(n=>[n.pos.x-.33,n.pos.x+.33,n.pos.z-.33,n.pos.z+.33,1.8])),lastSide)
   if(!destination){ui.toast('차 양옆에 공간이 없어. 조금 옮겨서 정차해');return true}
   mode='exit';car.speed=0
  }else return true
  clearControls();lastSide=destination.side
  transition={time:0,from:{x:pos.x,z:pos.z},door:destination.door}
  renderer.shadowMap.needsUpdate=true
  return true
 }
 function updateTransition(dt){
  transition.time+=dt
  const t=Math.min(1,transition.time/.52),smooth=t*t*(3-2*t),joining=mode==='enter'
  const door=transition.door,from=joining?transition.from:car,to=joining?car:door
  pos.x=THREE.MathUtils.lerp(from.x,to.x,smooth);pos.z=THREE.MathUtils.lerp(from.z,to.z,smooth)
  const phase=joining?Math.min(t/.54,1):Math.max((t-.46)/.54,0)
  actor.visible=joining?t<.56:t>.44
  const edge=localPoint(car,door.x,door.z)
  const inset=lastSide*.30,cs=Math.cos(car.heading),sn=Math.sin(car.heading)
  actor.position.set(joining?THREE.MathUtils.lerp(transition.from.x,door.x-inset*cs,phase):door.x-inset*cs*(1-phase),.035,joining?THREE.MathUtils.lerp(transition.from.z,door.z-inset*sn,phase):door.z-inset*sn*(1-phase))
  face=Math.atan2(-Math.sign(edge.x)*cs,-Math.sign(edge.x)*sn)+(joining?0:Math.PI);actor.rotation.y=face
  char.update(dt,1.0)
  if(t<1)return
  if(joining){mode='drive';mission.board()}else{mode='walk';actor.visible=true;actor.position.set(pos.x,.035,pos.z);if(mission.exit())ui.toast('FIRST DRIVE 완료 · 주행 기록 저장')}
  transition=null;clearControls();renderer.shadowMap.needsUpdate=true
 }
 const ui=createUI({episode,useItem,foot,canAct,converse,crowd,player,feedback:()=>feedbackTime>0?focus:null,car,mission,driving,prompt,interactCar,mode:()=>mode,stats:()=>({ms:recentFrameMs,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,width:canvas.width,height:canvas.height}),pos,yaw:()=>yaw,setPaused:value=>{isPaused=value;clearControls()},quality:()=>({auto:'자동',high:'높음',low:'낮음'}[quality]),cycleQuality:()=>{quality=({auto:'high',high:'low',low:'auto'})[quality];renderer.setPixelRatio(resolution());sunlight.castShadow=quality!=='low';renderer.shadowMap.needsUpdate=true}})
 const pressed=code=>keys.has(code)?1:0
 window.addEventListener('keydown',e=>{if(e.code==='KeyF'&&!e.repeat){attack();return}if(!isPaused&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code)
  if(mode==='walk'&&!e.repeat){
   if(e.code.startsWith('Shift'))foot.shift()
   if(e.code==='Space')jump()
  }}})
 window.addEventListener('keyup',e=>keys.delete(e.code))
 window.addEventListener('blur',clearControls);document.addEventListener('visibilitychange',()=>{clearControls();last=performance.now()})
 let drag=null
 canvas.onpointerdown=e=>{if(isPaused||drag)return;canvas.focus();canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY}}
 canvas.onpointermove=e=>{if(!drag||e.pointerId!==drag.id||isPaused)return;lookHold=2.2;yaw+=(e.clientX-drag.x)*.0045;pitch=clamp(pitch+(e.clientY-drag.y)*.004,-.19,.93);drag.x=e.clientX;drag.y=e.clientY}
 canvas.onlostpointercapture=e=>{if(drag?.id===e.pointerId)drag=null};canvas.onpointerup=e=>{if(drag?.id===e.pointerId)drag=null};canvas.oncontextmenu=e=>e.preventDefault()
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance+e.deltaY*.006,2.3,7.4)},{passive:false})
 const stick=document.querySelector('#stick'),knob=stick.firstElementChild,jumpButton=document.querySelector('#jump')
 const adjust=e=>{const b=stick.getBoundingClientRect();joystick.set((e.clientX-b.left-b.width/2)/30,(e.clientY-b.top-b.height/2)/30).clampLength(0,1);knob.style.transform='translate('+joystick.x*24+'px,'+joystick.y*24+'px)'}
 for(const b of document.querySelectorAll('[data-pedal]')){
  const ids=new Set();b.onpointerdown=e=>{if(!driving()||isPaused)return;b.setPointerCapture(e.pointerId);ids.add(e.pointerId);pedals.add(b.dataset.pedal);b.classList.add('held')}
  b.onlostpointercapture=e=>{ids.delete(e.pointerId);if(!ids.size){pedals.delete(b.dataset.pedal);b.classList.remove('held')}}
 }
 let stickId=null
 stick.onpointerdown=e=>{if(stickId!==null)return;stickId=e.pointerId;stick.setPointerCapture(e.pointerId);adjust(e)};stick.onpointermove=e=>{if(stick.hasPointerCapture(e.pointerId))adjust(e)};stick.onlostpointercapture=()=>{stickId=null;joystick.set(0,0);knob.style.transform=''}
 const punchButton=document.querySelector('#punch');punchButton.onpointerdown=e=>{e.preventDefault();punchButton.setPointerCapture(e.pointerId);attack()}
 jumpButton.onpointerdown=e=>{e.preventDefault();jumpButton.setPointerCapture(e.pointerId);jump()}
 window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)})
 const anchor=new THREE.Vector3(),eye=new THREE.Vector3(),aim=new THREE.Vector3(),reach=new THREE.Vector3()
 let actualArm=distance,face=actor.rotation.y,elapsed=0,last=performance.now(),frameSum=0,frameCount=0,trackedZ=spawn.z,shadowTick=0
 function positionCamera(dt,initial=false){
  cameraBlend=damp(cameraBlend,mode==='drive'||mode==='enter'?1:0,5,dt)
  const arm=distance+cameraBlend*2.2,tilt=pitch+cameraBlend*.115
  const sn=Math.sin(yaw),cs=Math.cos(yaw),lift=Math.sin(tilt),flat=Math.cos(tilt)
  anchor.set(pos.x+.26*cs*(1-cameraBlend),(actor.position.y+1.54)*(1-cameraBlend)+1.22*cameraBlend,pos.z+.26*sn*(1-cameraBlend))
  eye.set(anchor.x-sn*arm*flat,anchor.y+lift*arm,anchor.z+cs*arm*flat)
  let fraction=cameraFraction(anchor,eye,boxes)
  if(mode==='walk'){
   const a=localPoint(car,anchor.x,anchor.z),b=localPoint(car,eye.x,eye.z)
   fraction=Math.min(fraction,cameraFraction({...a,y:anchor.y},{...b,y:eye.y},[[-car.width/2,car.width/2,-car.length/2,car.length/2,car.height]]))
  }
  const room=arm*fraction
  actualArm=initial?room:room<actualArm?room:damp(actualArm,room,8,dt)
  reach.copy(eye).sub(anchor).multiplyScalar(actualArm/arm)
  camera.position.copy(anchor).add(reach);camera.position.y=Math.max(.24,camera.position.y)
  aim.set(anchor.x+sn*2.2,anchor.y+.12-lift*2.2,anchor.z-cs*2.2)
  camera.lookAt(aim)
 }
 positionCamera(0,true)
 const draw=now=>{
  const realDt=(now-last)/1000;last=now;const dt=Math.min(realDt,.07)
  if(!document.hidden&&!isPaused){
   elapsed+=dt
   if(pressed('ArrowRight')||pressed('ArrowLeft'))lookHold=2.2
   yaw+=(pressed('ArrowRight')-pressed('ArrowLeft'))*1.65*dt
   coffee=Math.max(0,coffee-dt)
   advance(player.f,dt);feedbackTime=Math.max(0,feedbackTime-dt)
   if(player.f.action==='down'&&player.f.downTime>3.2)respawn()
   let speed=0
   if(transition){updateTransition(dt)}
   else if(driving()){
    const input={forward:Math.max(pressed('KeyW'),pressed('ArrowUp'),Number(pedals.has('gas'))),back:Math.max(pressed('KeyS'),pressed('ArrowDown'),Number(pedals.has('brake'))),steer:clamp(pressed('KeyD')-pressed('KeyA')+joystick.x,-1,1),handbrake:pressed('Space')||pedals.has('hold')}
    stepDrive(car,input,boxes,realDt);rig.updatePose({...car,dt});speed=Math.abs(car.speed)
    pos.x=car.x;pos.z=car.z;actor.visible=false;mission.tick(true)
    lookHold=Math.max(0,lookHold-dt)
    if(!drag&&!lookHold){const error=car.heading-yaw;yaw+=Math.atan2(Math.sin(error),Math.cos(error))*(1-Math.exp(-(speed>.6?3.4:1.5)*dt))}
   }else{
   const ax=pressed('KeyD')-pressed('KeyA')+joystick.x,az=pressed('KeyW')+pressed('ArrowUp')-pressed('KeyS')-pressed('ArrowDown')-joystick.y
   const length=Math.max(1,Math.hypot(ax,az)),sn=Math.sin(yaw),cs=Math.cos(yaw)
   const pace=foot.rate(pressed('ShiftLeft')||pressed('ShiftRight'),joystick.length())*(player.f.action==='punch'?.36:player.f.action?0:1)
   const rate=pace*(coffee>0&&pace>1.85?1.15:1)
   const response=foot.air?1.15:(ax||az?9:16)
   foot.advance(dt)
   velocity.x=damp(velocity.x,(ax*cs+az*sn)*rate/length,response,dt)
   velocity.y=damp(velocity.y,(ax*sn-az*cs)*rate/length,response,dt)
   const ox=pos.x,oz=pos.z
   const stagger=player.f.action==='hit'?.55:0
   movePlayer(pos,(velocity.x+stagger*knockX)*dt,(velocity.y+stagger*knockZ)*dt,boxes,occupied)
   const dx=pos.x-ox,dz=pos.z-oz;speed=Math.hypot(dx,dz)/Math.max(.001,dt)
   const facing=player.f.action==='punch'?focus:crowd.talking
   if(facing||speed>.07){const desired=facing?Math.atan2(facing.pos.x-pos.x,facing.pos.z-pos.z):Math.atan2(dx,dz);face+=clamp(Math.atan2(Math.sin(desired-face),Math.cos(desired-face))*(1-Math.exp(-14*dt)),-9*dt,9*dt)}
   actor.rotation.y=face;actor.position.set(pos.x,Math.abs(pos.x)>6.1&&Math.abs(pos.x)<10.9?.09:.008,pos.z);char.root.position.y=foot.height
   char.update(dt,speed,{...combatPose(player.f),jump:foot.phase,land:foot.land})
   if(player.f.action==='punch')contact(player.f,char,pos,crowd.all,crowd.lineClear,(n,zone,point)=>{
    if(crowd.receive(n,pos,zone,point)){focus=n;feedbackTime=4;ui.impact(false)}
   })
   }
   player.available=mode==='walk'&&player.f.hp>0&&!foot.air
   const progress=episode.update(dt,{x:pos.x,z:pos.z,driving:driving()})
   if(progress)ui.toast(progress.message)
   player.inVehicle=driving()
   crowd.update(dt,camera,player,hitPlayer,outcome=>{
    if(outcome==='arrest')respawn(true)
    else ui.toast(outcome==='warning'?'항만 경찰 · 경고 후 조사 종료':'수배 해제')
   })
   if(typeof portUpdate==='function')portUpdate(dt,elapsed)
   if(Math.abs(pos.z-trackedZ)>10){trackedZ=pos.z;sunlight.position.z=trackedZ-49;sunlight.target.position.z=trackedZ-9}
   const playerShadow=speed>.06||foot.air||foot.land>0||!!player.f.action
   if((playerShadow&&elapsed-shadowTick>.09)||(crowd.shadowDirty&&elapsed-shadowTick>.32)){renderer.shadowMap.needsUpdate=true;shadowTick=elapsed}
   positionCamera(dt);ui.update(elapsed);renderer.render(scene,camera)
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
 renderer.render(scene,camera);ui.update(0);status.hidden=true;requestAnimationFrame(draw)
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();status.hidden=false;status.textContent='그래픽 연결이 중단됐어. 페이지를 새로고침해.'})
}
start().catch(err=>{console.error(err);status.hidden=false;status.textContent='게임을 열 수 없어. WebGL 2를 지원하는 브라우저에서 새로고침해.'})
