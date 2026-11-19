import * as THREE from 'three'
import './style.css'
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
let yaw=.05,pitch=.13,distance=4.65,isPaused=false,runTouch=false
const clamp=THREE.MathUtils.clamp, damp=THREE.MathUtils.damp
const addCollider=(a,b,c,d,h=3)=>{if(h>.15)boxes.push([Math.min(a,b),Math.max(a,b),Math.min(c,d),Math.max(c,d),h])}
const resetInput=()=>{keys.clear();joystick.set(0,0);runTouch=false;velocity.set(0,0);document.querySelector('#stick i').style.transform=''}
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
 const [char,portUpdate]=await Promise.all([createCharacter(),buildPort(scene,addCollider),buildStreet(scene,addCollider),buildArchitecture(scene,addCollider),sky(scene,renderer)])
 const actor=new THREE.Group();actor.add(char.root);scene.add(actor);footShadow(actor)
 if(!canWalk(pos.x,pos.z,boxes))for(let x=-3;x<=3;x+=.5){if(canWalk(x,spawn.z,boxes)){pos.x=x;break}}
 actor.position.copy(pos);actor.rotation.y=Math.PI-yaw
 let recentFrameMs=0
 const ui=createUI({stats:()=>({ms:recentFrameMs,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,width:canvas.width,height:canvas.height}),pos,yaw:()=>yaw,setPaused:value=>{isPaused=value;resetInput()},quality:()=>({auto:'자동',high:'높음',low:'낮음'}[quality]),cycleQuality:()=>{quality=({auto:'high',high:'low',low:'auto'})[quality];renderer.setPixelRatio(resolution());sunlight.castShadow=quality!=='low';renderer.shadowMap.needsUpdate=true}})
 const pressed=code=>keys.has(code)?1:0
 window.addEventListener('keydown',e=>{if(!isPaused&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code)}})
 window.addEventListener('keyup',e=>keys.delete(e.code))
 window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{resetInput();last=performance.now()})
 let drag=null
 canvas.onpointerdown=e=>{if(isPaused||drag)return;canvas.focus();canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY}}
 canvas.onpointermove=e=>{if(!drag||e.pointerId!==drag.id||isPaused)return;yaw+=(e.clientX-drag.x)*.0045;pitch=clamp(pitch+(e.clientY-drag.y)*.004,-.19,.93);drag.x=e.clientX;drag.y=e.clientY}
 canvas.onlostpointercapture=()=>drag=null;canvas.onpointerup=()=>drag=null;canvas.oncontextmenu=e=>e.preventDefault()
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance+e.deltaY*.006,2.3,7.4)},{passive:false})
 const stick=document.querySelector('#stick'),knob=stick.firstElementChild,run=document.querySelector('#run')
 const adjust=e=>{const b=stick.getBoundingClientRect();joystick.set((e.clientX-b.left-b.width/2)/30,(e.clientY-b.top-b.height/2)/30).clampLength(0,1);knob.style.transform='translate('+joystick.x*24+'px,'+joystick.y*24+'px)'}
 stick.onpointerdown=e=>{stick.setPointerCapture(e.pointerId);adjust(e)};stick.onpointermove=e=>{if(stick.hasPointerCapture(e.pointerId))adjust(e)};stick.onlostpointercapture=()=>{joystick.set(0,0);knob.style.transform=''}
 run.onpointerdown=e=>{run.setPointerCapture(e.pointerId);runTouch=true};run.onlostpointercapture=()=>runTouch=false
 window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)})
 const anchor=new THREE.Vector3(),eye=new THREE.Vector3(),aim=new THREE.Vector3(),reach=new THREE.Vector3()
 let actualArm=distance,face=actor.rotation.y,elapsed=0,last=performance.now(),frameSum=0,frameCount=0,trackedZ=spawn.z,shadowTick=0
 function positionCamera(dt,initial=false){
  const sn=Math.sin(yaw),cs=Math.cos(yaw),lift=Math.sin(pitch),flat=Math.cos(pitch)
  anchor.set(pos.x+.26*cs,actor.position.y+1.54,pos.z+.26*sn)
  eye.set(anchor.x-sn*distance*flat,anchor.y+lift*distance,anchor.z+cs*distance*flat)
  const room=distance*cameraFraction(anchor,eye,boxes)
  actualArm=initial?room:room<actualArm?room:damp(actualArm,room,8,dt)
  reach.copy(eye).sub(anchor).multiplyScalar(actualArm/distance)
  camera.position.copy(anchor).add(reach);camera.position.y=Math.max(.24,camera.position.y)
  aim.set(anchor.x+sn*2.2,anchor.y+.12-lift*2.2,anchor.z-cs*2.2)
  camera.lookAt(aim)
 }
 positionCamera(0,true)
 const draw=now=>{
  const realDt=(now-last)/1000;last=now;const dt=Math.min(realDt,.07)
  if(!document.hidden&&!isPaused){
   elapsed+=dt
   yaw+=(pressed('ArrowRight')-pressed('ArrowLeft'))*1.65*dt
   const ax=pressed('KeyD')-pressed('KeyA')+joystick.x,az=pressed('KeyW')+pressed('ArrowUp')-pressed('KeyS')-pressed('ArrowDown')-joystick.y
   const length=Math.max(1,Math.hypot(ax,az)),sn=Math.sin(yaw),cs=Math.cos(yaw)
   const rate=pressed('ShiftLeft')||pressed('ShiftRight')||runTouch?4.8:1.85
   velocity.x=damp(velocity.x,(ax*cs+az*sn)*rate/length,10,dt)
   velocity.y=damp(velocity.y,(ax*sn-az*cs)*rate/length,10,dt)
   const ox=pos.x,oz=pos.z;movePlayer(pos,velocity.x*dt,velocity.y*dt,boxes)
   const dx=pos.x-ox,dz=pos.z-oz,speed=Math.hypot(dx,dz)/Math.max(.001,dt)
   if(speed>.07){const desired=Math.atan2(dx,dz);face+=Math.atan2(Math.sin(desired-face),Math.cos(desired-face))*(1-Math.exp(-14*dt))}
   actor.rotation.y=face;actor.position.set(pos.x,damp(actor.position.y,Math.abs(pos.x)>6.1&&Math.abs(pos.x)<10.9?.09:.008,18,dt),pos.z)
   char.update(dt,speed);if(typeof portUpdate==='function')portUpdate(dt,elapsed)
   if(Math.abs(pos.z-trackedZ)>10){trackedZ=pos.z;sunlight.position.z=trackedZ-49;sunlight.target.position.z=trackedZ-9}
   if(speed>.06&&elapsed-shadowTick>.09){renderer.shadowMap.needsUpdate=true;shadowTick=elapsed}
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
 renderer.render(scene,camera);ui.update(1);status.hidden=true;requestAnimationFrame(draw)
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();status.hidden=false;status.textContent='그래픽 연결이 중단됐어. 페이지를 새로고침해.'})
}
start().catch(err=>{console.error(err);status.hidden=false;status.textContent='게임을 열 수 없어. WebGL 2를 지원하는 브라우저에서 새로고침해.'})
