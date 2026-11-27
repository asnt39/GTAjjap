import {impulse,moveImpact} from './impact-motion.js'
import {Vector3,Frustum,Matrix4,Sphere,MathUtils} from 'three'
import {createWanted} from './wanted.js'
import {ARREST_REACH} from './custody.js'
import {policeFire} from './police-fire.js'
import {createCharacter} from './character.js'
import {canWalk,movePlayer} from './navigation.js'
import {nearBody,localPoint,worldPoint} from './driving.js'
import {fighter,swing,injure,revive,advance,combatPose,contact} from './melee.js'

import {residentLife} from './resident-life.js'
import {people,residentHealth} from './resident-profiles.js'
const cell=.92,clamp=MathUtils.clamp
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]
function turn(n,angle,dt){
 const d=Math.atan2(Math.sin(angle-n.face),Math.cos(angle-n.face))
 n.face+=clamp(d*(1-Math.exp(-8*dt)),-4.8*dt,4.8*dt)
}
function ground(p){return Math.abs(p.x)>6.1&&Math.abs(p.x)<10.9&&Math.abs(p.z+37)>6?.087:.008}
export async function createResidents(scene,boxes,car,fleet=[car],surfaceHeight=ground){
 const carAt=(x,z,r)=>fleet.find(vehicle=>nearBody(vehicle,x,z,r))
 const all=await Promise.all(people.map(async(profile,i)=>{
  const rig=await createCharacter({variant:profile.variant??i,model:profile.model}),pos=new Vector3(profile.x,0,profile.z)
  pos.y=surfaceHeight(pos)
  const health=residentHealth[profile.officer?(profile.station?'guard':'officer'):'civilian']
  const shadowMeshes=[]
  rig.root.traverse(mesh=>{if(mesh.isMesh&&mesh.castShadow)shadowMeshes.push(mesh)})
  const n={...profile,rig,pos,shadowMeshes,castsShadow:true,patrolStop:1,height:profile.height??1.8,state:'idle',face:profile.face??i*.97,path:[],speed:0,wait:profile.spawnWait??3+i*1.7,age:0,
   f:fighter(health),alert:0,talk:0,line:0,accum:0,stagger:(i%7)/7,look:0,blocked:0,stepping:0,replan:0}
  rig.root.position.copy(pos);rig.root.rotation.y=n.face;scene.add(rig.root)
  return n
 }))
 const officers=all.filter(n=>n.officer),wanted=createWanted()
 const firearms=policeFire(boxes,fleet,all)
 const responders=new Set()
 let sensing=0,observed=false
 const responding=n=>responders.has(n)&&n.f.hp>0&&!n.policeOrder
 function dispatch(point){
  const count=wanted.level===3?2:1
  for(const n of responders)if(!n.f.hp||n.policeOrder)responders.delete(n)
  if(responders.size>=count)return
  const nearby=officers.filter(n=>n.f.hp>0&&!n.policeOrder&&!responders.has(n))
   .sort((a,b)=>distance(a.pos,point)-distance(b.pos,point))
  for(const n of nearby.slice(0,count-responders.size)){responders.add(n);n.replan=0}
 }
 const playerList=[],visibleSphere=new Sphere(new Vector3(),1.3),frustum=new Frustum(),viewProjection=new Matrix4()
 let talking=null,lastTalk='',shadowDirty=false
 const free=(p)=>canWalk(p.x,p.z,boxes,.31)&&!carAt(p.x,p.z,.32)
 function lineClear(a,b,pass=free){
  const count=Math.ceil(distance(a,b)/.25)
  for(let k=1;k<count;k++){const t=k/count;if(!pass({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}))return false}
  return true
 }
 const staticFree=p=>canWalk(p.x,p.z,boxes,.35)
 const life=residentLife(all,(a,b)=>staticFree(a)&&staticFree(b)&&lineClear(a,b,staticFree),lineClear)
 const pedestrianBins=new Map(),tile=value=>Math.floor(value/3.5),binKey=(x,z)=>x*65536+z
 function indexPedestrians(){
  pedestrianBins.clear()
  for(const n of all){
   const key=binKey(tile(n.pos.x),tile(n.pos.z))
   const bin=pedestrianBins.get(key)
   if(bin)bin.push(n)
   else pedestrianBins.set(key,[n])
  }
 }
 indexPedestrians()
 function blockedBy(n,x,z){
  const tx=tile(x),tz=tile(z)
  for(let i=tx-1;i<=tx+1;i++)for(let j=tz-1;j<=tz+1;j++){
   const bin=pedestrianBins.get(binKey(i,j))
   if(bin?.some(other=>other!==n&&other.f.hp>0&&other.f.action!=='knockdown'&&!other.policeOrder?.aboard&&
      (other.pos.x-x)**2+(other.pos.z-z)**2<.59**2))return true
  }
  return false
 }
 // Small, local eight-neighbour flood search. Choose the reachable cell closest to the goal.
 function plan(n,goal,lane,avoidPeople=false){
  const pass=avoidPeople?p=>free(p)&&!blockedBy(n,p.x,p.z):free
  const gap=distance(n.pos,goal)
  if(gap<12&&(!lane||n.pos.x>=lane[0]&&n.pos.x<=lane[1]&&goal.x>=lane[0]&&goal.x<=lane[1])&&pass(goal)&&lineClear(n.pos,goal,pass)){
   n.path=gap>.23?[goal]:[]
   return
  }
  const origin=n.pos,start={x:origin.x,z:origin.z,prev:null,i:0,j:0}
  const queue=[start],seen=new Set(['0,0']);let best=start,bestDistance=distance(start,goal)
  for(let head=0;head<queue.length&&head<440&&bestDistance>.65;head++){
   const at=queue[head]
   for(const [di,dj] of dirs){
    const i=at.i+di,j=at.j+dj,key=i+','+j
    if(seen.has(key)||Math.abs(i)>11||Math.abs(j)>20)continue
    const p={i,j,x:origin.x+i*cell,z:origin.z+j*cell,prev:at}
    if(lane&&(p.x<lane[0]||p.x>lane[1]))continue
    if(!pass(p)){seen.add(key);continue}
    if(!lineClear(at,p,pass))continue
    seen.add(key);queue.push(p)
    const d=distance(p,goal);if(d<bestDistance){best=p;bestDistance=d}
   }
  }
  const path=[];while(best.prev){path.push({x:best.x,z:best.z});best=best.prev}
  n.path=path.reverse()
 }
 function lane(n){return n.x<0?[-10,-6.65]:n.x>10.8?[11.2,15.6]:[6.7,10.25]}
 function wander(n){
  if(n.officer&&n.station){
   plan(n,{x:n.x,z:n.z},null)
   n.state=n.path.length?'walk':'idle';n.wait=3
   return
  }
  if(n.patrol){
   const stops=[{x:n.x,z:n.z},...n.patrol]
   const goal=stops[n.patrolStop]
   plan(n,goal,null)
   if(distance(n.pos,goal)<.8||!n.path.length)n.patrolStop=(n.patrolStop+1)%stops.length
   n.state=n.path.length?'walk':'idle';n.wait=2
   return
  }
  if(n.station){plan(n,{x:n.x+(Math.random()-.5)*2,z:n.z+(Math.random()-.5)*2},null);n.state=n.path.length?"walk":"idle";n.wait=5;return}
  const band=lane(n),range=n.role==='배송 기사'?11:9
  plan(n,{x:band[0]+Math.random()*(band[1]-band[0]),z:n.z+(Math.random()-.5)*range*2},n.pos.x>=band[0]&&n.pos.x<=band[1]?band:null)
  n.state='walk';n.wait=0
 }
 function escape(n,from){
  const dx=n.pos.x-from.x,dz=n.pos.z-from.z,len=Math.hypot(dx,dz)||1
  plan(n,{x:n.pos.x+5*dx/len,z:n.pos.z+11*(Math.abs(dz)>.3?Math.sign(dz):1)},null)
  n.state='flee';n.replan=1.3
 }
 function walkPath(n,dt,pace,player){
  if(!n.path.length){n.speed=0;return}
  const to=n.path[0],p=n.pos,d=distance(p,to)
  if(d<.23){n.path.shift();if(!n.path.length)n.speed=0;return}
  const angle=Math.atan2(to.x-p.x,to.z-p.z)
  turn(n,angle,dt)
  const aligned=Math.max(0,Math.cos(n.face-angle))
  const brake=13
  const target=Math.min(pace*aligned,n.path.length===1?Math.sqrt(2*brake*Math.max(.035,d-.19)):pace)
  n.speed+=clamp(target-n.speed,-brake*dt,6.8*dt)
  const step=Math.min(d,n.speed*dt),oldX=p.x,oldZ=p.z
  const occupied=(x,z)=>carAt(x,z,.32)||blockedBy(n,x,z)||Math.hypot(x-player.x,z-player.z)<.64
  movePlayer(p,Math.sin(n.face)*step,Math.cos(n.face)*step,boxes,occupied)
  const actual=Math.hypot(oldX-p.x,oldZ-p.z)
  n.stepping=actual/dt
  if(actual<step*.25){n.blocked+=dt;if(n.blocked>.55){if(n.state==='routine')n.avoidUntil=n.age+1.1;n.path=[];n.wait=.4+Math.random();n.replan=0;n.blocked=0}}
  else n.blocked=0
 }
 function candidates(p){
  return all.filter(n=>!(n.officer&&wanted.level)&&!n.policeOrder?.aboard&&n.alert<=0&&!n.f.action&&n.f.hp&&
   distance(p,n.pos)<2.1&&Math.abs((p.y??0)-n.pos.y)<.9&&lineClear(p,n.pos))
 }
 function candidate(p){
  return candidates(p).sort((a,b)=>distance(p,a.pos)-distance(p,b.pos))[0]??null
 }
 function endTalk(){if(talking){talking.talk=0;talking.state='idle';talking.wait=1;talking=null}lastTalk=''}
 function beginTalk(n){
  endTalk();life.cancelGreeting(n);talking=n;n.state='talk';n.talk=Infinity;n.path=[];lastTalk=n.lines[n.line++%n.lines.length]
 }
 function hearShot(source,reported=false){
  // React once per game sound. Reuse the normal flee and patrol states.
  for(const n of all){
   if(!n.f.hp||distance(n.pos,source)>16)continue
   if(!n.officer){n.state='flee';n.alert=Math.max(n.alert,4);n.replan=0}
  }
  if(!reported&&officers.some(n=>n.f.hp>0&&distance(n.pos,source)<22)){
   wanted.report(source,1);dispatch(source);sensing=0
  }
 }
 function receive(n,source,zone,point,damage,kind=damage==null?'melee':'shot'){
  const angle=Math.atan2(source.x-n.pos.x,source.z-n.pos.z)
  const side=Math.cos(n.face)*(point.x-n.pos.x)-Math.sin(n.face)*(point.z-n.pos.z)>0?1:-1
  if(!injure(n.f,damage??24,side,zone,{weaponHit:damage!=null}))return false
  life.cancelGreeting(n);endTalk()
  if(n.officer&&!n.f.hp){firearms.escalate();wanted.report(source,3)}
  if(n.officer||n.f.hp>0||all.some(w=>w!==n&&w.f.hp>0&&distance(w.pos,source)<12&&lineClear(w.pos,source))){
   wanted.report(source,n.officer||!n.f.hp?2:1)
   dispatch(source);sensing=0
  }
  impulse(n.f,kind,-Math.sin(angle),-Math.cos(angle),damage??24,{vx:Math.sin(n.face)*n.speed,vz:Math.cos(n.face)*n.speed,face:n.face})
  n.state='react';n.alert=n.temper==='defend'?7:5;n.path=[];n.replan=0
  for(const other of all)if(other!==n&&distance(other.pos,n.pos)<5&&!other.f.action){other.alert=Math.max(other.alert,2);other.state='watch'}
  return true
 }
 function vehicleHit(n,source,damage,impact){
  if(!receive(n,source,'body',n.pos,damage,'vehicle'))return false
  if(impact.speed>=5.4){
   impulse(n.f,'vehicle',impact.x,impact.z,impact.speed*5,{face:n.face,lift:impact.knockout?.62:.17})
   n.f.side=impact.x*Math.cos(n.face)-impact.z*Math.sin(n.face)<0?1:-1
   Object.assign(n.f,{action:'knockdown',elapsed:0,duration:impact.knockout?5.5:1.9})
  }
  return true
 }
 function blastHit(n,source,strength){
  if(!receive(n,source,'body',n.pos,Math.round(22+strength*90),'blast'))return false
  if(n.f.hp>0){
   const dx=n.pos.x-source.x,dz=n.pos.z-source.z,d=Math.hypot(dx,dz)||1
   impulse(n.f,'blast',dx/d,dz/d,strength*65,{face:n.face,lift:.20+strength*.36})
   Object.assign(n.f,{action:'knockdown',elapsed:0,duration:1.8+strength*2})
  }
  return true
 }
 function takePursuit(n){
  const count=wanted.level===3?2:1
  if(responders.has(n))return
  if(responders.size>=count){
   const far=[...responders].sort((a,b)=>distance(b.pos,n.pos)-distance(a.pos,n.pos))[0]
   far.path=[];far.replan=0;responders.delete(far)
  }
  responders.add(n);n.replan=0
 }
 function update(dt,camera,player,hitPlayer,onOutcome,onPoliceShot){
  if(dt<=0)return
  indexPedestrians()
  firearms.update(dt,wanted.level)
  if(wanted.level){
   dispatch(wanted.lastKnown)
   sensing-=dt
   if(sensing<=0){
    sensing=.2
    observed=officers.some(n=>{
     if(onPoliceShot&&firearms.aim(n,player,distance(n.pos,player.pos)))return true
     const d=distance(n.pos,player.pos),angle=Math.atan2(player.pos.x-n.pos.x,player.pos.z-n.pos.z)
     if(!responding(n)||d>20||(d>3&&Math.cos(n.face-angle)<-.15))return false
     // The occupied vehicle itself must not occlude its driver's position.
     const end=player.inVehicle?worldPoint(player.inVehicle,0,player.inVehicle.length/2+.5):player.pos
     return lineClear(n.pos,end)
    })
   }
   const reach=wanted.level===1||player.legacyArrest?1.65:ARREST_REACH
   const contact=!firearms.active&&player.available&&!player.inVehicle&&officers.find(n=>
    responding(n)&&!n.f.action&&distance(n.pos,player.pos)<reach&&lineClear(n.pos,player.pos))
   const outcome=wanted.tick(dt,player.pos,observed||player.squadObserver||!!contact,contact?.id,player.legacyArrest)
   if(outcome){firearms.update(0,wanted.level);onOutcome?.(outcome,contact)}
  }
  if(!wanted.level&&responders.size){
   for(const n of responders){n.alert=0;n.path=[];n.speed=0}
   responders.clear();observed=false;sensing=0
  }
  viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(viewProjection)
  shadowDirty=false
  life.social(dt,player.pos,n=>fleet.some(vehicle=>Math.abs(vehicle.speed)>1&&distance(n.pos,vehicle)<5))
  for(const n of all){
   if(n===player.custodyOfficer||n.policeOrder?.aboard)continue
   const p=n.pos,d=distance(p,player.pos),priorFace=n.face
   visibleSphere.center.set(p.x,p.y+1,p.z)
   const visible=d<95&&frustum.intersectsSphere(visibleSphere)
   n.rig.root.visible=visible
   // Remote patrols stay posted, and never add distant dynamic shadow passes.
   const castsShadow=visible&&d<22
   if(n.castsShadow!==castsShadow){
    n.castsShadow=castsShadow
    for(const mesh of n.shadowMeshes)mesh.castShadow=castsShadow
    shadowDirty=true
   }
   if(n.officer&&d>44&&!responding(n)&&!n.policeOrder&&!n.f.action){
    if(n.stepping){n.rig.update(.12,0);n.stepping=n.speed=0}
    continue
   }
   n.accum+=dt
   const civilianRound=life.has(n)
   const interval=d<7?0:visible?(civilianRound?(d<25?1/35:.065):d<25?1/30:.125):.45
   if(n.accum<interval*(n.age===0?.55+.45*n.stagger:1))continue
   // Do not fast-forward a walking resident when a camera turn brings them into view.
   const visibleRound=visible&&civilianRound&&!n.f.action&&!n.alert
   const tick=Math.min(n.accum,visibleRound?.085:.45)
   n.accum=0;n.age+=tick;n.replan-=tick;n.stepping=0;n.alert=Math.max(0,n.alert-tick)
   if(n.f.action==='knockdown'&&carAt(p.x,p.z,.26)&&n.f.elapsed>=n.f.duration-.68){
    n.f.elapsed=n.f.duration-.68
   }else advance(n.f,tick)
   const traffic=fleet.find(vehicle=>Math.abs(vehicle.speed)>1&&distance(p,vehicle)<5)
   const blockingCar=carAt(p.x,p.z,.30)
   if(blockingCar&&n.f.hp>0&&n.f.action!=='knockdown'){
    const car=blockingCar
    const local=localPoint(car,p.x,p.z)
    const exits=[worldPoint(car,-car.width/2-.4,local.z),worldPoint(car,car.width/2+.4,local.z),
     worldPoint(car,local.x,-car.length/2-.4),worldPoint(car,local.x,car.length/2+.4)]
    const clear=exits.filter(q=>free(q)&&!blockedBy(n,q.x,q.z)).sort((a,b)=>distance(a,p)-distance(b,p))[0]
    if(clear){p.x=clear.x;p.z=clear.z;n.path=[];n.replan=0}
   }
   const toward=Math.atan2(player.pos.x-p.x,player.pos.z-p.z)
   let nod=0
   const aiming=!!onPoliceShot&&firearms.aim(n,player,d)
   const lift=moveImpact(n.f,p,tick,boxes,(x,z)=>carAt(x,z)||blockedBy(n,x,z))
   if(n.f.action==='knockdown'){
    n.state='react';n.path=[];n.speed=0
   }else if(n.f.action==='down'){
    if(n.f.downTime>16&&!visible&&d>9){revive(n.f);n.state='idle';n.alert=0;n.wait=2}
   }else if(n.f.action==='hit'){
    n.speed=0
   }else if(n.f.action==='punch'){turn(n,toward,tick)}
   else if(aiming){
    if(talking===n)endTalk()
    n.state='guard'
    if(d>10||firearms.reloading(n)&&d>5){
     if(n.replan<=0){
      const step=Math.min(6,d-4)
      plan(n,{x:p.x+Math.sin(toward)*step,z:p.z+Math.cos(toward)*step},null,true)
      n.replan=.65
     }
     walkPath(n,tick,firearms.reloading(n)?1.75:1.22,player.pos)
    }else {n.speed=0;n.path=[];n.replan=0}
    turn(n,toward,tick)
   }else if(n.policeOrder){
    if(talking===n)endTalk()
    n.state='guard'
    if(n.replan<=0){plan(n,n.policeOrder.target,null);n.replan=.6}
    walkPath(n,tick,2.7,player.pos)
   }else if(wanted.level&&responding(n)){
    if(talking===n)endTalk()
    n.state='guard'
    if(n.replan<=0){
     const goal=wanted.lastKnown
     if(distance(p,goal)>1.1)plan(n,goal,null)
     else {n.path=[];turn(n,n.face+.7,tick)}
     n.replan=.75
    }
    walkPath(n,tick,[0,1.55,4.4,5.2][wanted.level],player.pos)
   }else if(talking===n){
    n.talk-=tick;turn(n,toward,tick);if(n.alert>0||n.talk<=0||d>2.8||!player.available||!lineClear(n.pos,player.pos))endTalk()
   }else if(n.alert>0&&player.available&&(!n.officer||!wanted.level)){
    if(n.temper==='defend'&&n.state!=='watch'&&n.state!=='flee'){
     n.state='guard'
     if(d<1.07&&lineClear(p,player.pos)){turn(n,toward,tick);if(n.f.recovery<=0&&Math.cos(n.face-toward)>.86){swing(n.f);n.replan=.65}}
     else if(d<6){if(n.replan<=0){plan(n,player.pos,null);n.replan=.55}if(d<1.55&&lineClear(p,player.pos))n.path=[{x:player.pos.x,z:player.pos.z}];walkPath(n,tick,1.65,player.pos)}
     else turn(n,toward,tick)
    }else if(n.temper==='flee'||d<1.9||n.state==='flee'){if(!n.path.length||n.replan<=0)escape(n,player.pos);walkPath(n,tick,3.7,player.pos)}
    else{n.state='watch';turn(n,toward,tick)}
   }else if(traffic){
    if(n.replan<=0||!n.path.length)escape(n,traffic);walkPath(n,tick,3.9,player.pos)
   }else if(d<2.25&&player.available){
    n.state='look';turn(n,toward,tick);n.wait=1
   }else if(civilianRound){
    const greeting=life.greeting(n)
    if(greeting){
     n.state='greet';n.activity=greeting.kind;n.path=[]
     turn(n,Math.atan2(greeting.partner.pos.x-p.x,greeting.partner.pos.z-p.z),tick)
     nod=greeting.nod
    }else{
     const next=life.next(n,tick)
     if(next?.target){
      if(n.state!=='routine'||n.routeTarget!==next.target.id||!n.path.length&&n.replan<=0){
       plan(n,next.target,null,n.avoidUntil>n.age)
       n.replan=.65;n.routeTarget=next.target.id
      }
      n.state='routine';n.activity=next.activity
      walkPath(n,tick,n.id==='regular'?1.24:n.pace,player.pos)
     }else{
      n.state='dwell';n.activity=next?.activity??'idle';n.path=[]
      const look=next?.look??n.face
      turn(n,look+Math.sin(n.age*1.3)*.16,tick)
      if(next&&['work','check','inspect','shop'].includes(next.activity))nod=.32*(.5+.5*Math.sin(n.age*1.8))
     }
    }
   }else{
    if(n.state!=='idle'&&n.state!=='walk'){n.state='idle';n.path=[];n.wait=.8}
    if(n.state==='walk'&&n.path.length)walkPath(n,tick,n.pace,player.pos)
    else{if(n.state==='walk'){n.state='idle';n.wait=1.6+Math.random()*4}
     n.wait-=tick;turn(n,n.face+Math.sin(n.age*.85)*.13,tick);if(n.wait<=0)wander(n)}
   }
   if(civilianRound&&!['routine','dwell','greet'].includes(n.state)){
    life.suspend(n);n.activity=n.state
   }
   if(!n.stepping&&n.state!=='walk'&&n.state!=='flee')n.speed=0
   p.y=surfaceHeight(p)+lift;n.rig.root.position.copy(p);n.rig.root.rotation.y=n.face
   if(visible||d<5||aiming){
    n.rig.update(tick,n.stepping,{...combatPose(n.f,n.state==='guard'||n.state==='watch'),
     guard:n.state==='guard'||n.state==='watch',turn:(n.face-priorFace)/tick,nod})
    if(n.f.action==='punch'&&player.available){
     playerList[0]=player
     contact(n.f,n.rig,p,playerList,lineClear,(_,zone,point)=>hitPlayer(n,zone,point))
    }
    if(d<18&&(n.stepping>.05||n.f.action))shadowDirty=true
   }
   if(onPoliceShot&&n.officer)firearms.pose(n,player,tick,aiming,onPoliceShot)
  }
 }
 return {all,officers,wanted,takePursuit,candidate,candidates,beginTalk,endTalk,receive,vehicleHit,blastHit,hearShot,lineClear,update,blockedBy, get talking(){return talking},
  get dialogue(){return talking?{name:talking.name,role:talking.role,text:lastTalk}:null},get shadowDirty(){return shadowDirty}}
}
