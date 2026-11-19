import {Vector3,Frustum,Matrix4,Sphere,MathUtils} from 'three'
import {createWanted} from './wanted.js'
import {createCharacter} from './character.js'
import {canWalk,movePlayer} from './navigation.js'
import {nearBody,localPoint,worldPoint} from './driving.js'
import {fighter,swing,injure,revive,advance,combatPose,contact} from './melee.js'

const people=[
 {name:'강 반장',role:'부두 반장',x:-7.4,z:21.4,pace:.94,temper:'defend',lines:['저 크레인 아래는 작업 중이야. 부두길로 가면 배가 잘 보여.','교대 시간이라 한숨 돌리는 중이야.']},
 {name:'윤서',role:'시장 점원',x:-8.9,z:5.4,pace:1.18,temper:'flee',lines:['오늘은 가게 문을 일찍 닫아. 해 질 때 시장 골목이 제일 예쁘거든.','내일 아침 첫 배 들어오면 다시 와.']},
 {name:'도현',role:'배송 기사',x:7.6,z:16.2,pace:1.43,temper:'avoid',lines:['정문에서 서부 부두까지 한 바퀴 돌면 내 배달 코스야.','도로로 나갈 땐 좌우를 한번 봐.']},
 {name:'미라',role:'설비 담당',x:12.1,z:-13,pace:1.02,temper:'defend',lines:['바람이 세지면 크레인부터 점검해야 해.','교차로 지나 안쪽이 하역장이야.']},
 {name:'선우',role:'부두 단골',x:-8.3,z:-47,pace:.78,temper:'flee',lines:['예전엔 저 창고 앞까지 배가 들어왔지.','이 시간에는 바다색이 금방 바뀌어.']}
]
for(const [name,x,z] of [['한 순경',8,24],['박 경장',-8,-30]])people.push({name,x,z,role:'항만 경찰',officer:true,pace:1.1,temper:'defend',lines:['정문은 비워 둬. 교대 차량이 곧 들어와.','야간 순찰 중이야.']})
const cell=.92,clamp=MathUtils.clamp
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]
function turn(n,angle,dt){
 const d=Math.atan2(Math.sin(angle-n.face),Math.cos(angle-n.face))
 n.face+=clamp(d*(1-Math.exp(-8*dt)),-4.8*dt,4.8*dt)
}
function ground(p){return Math.abs(p.x)>6.1&&Math.abs(p.x)<10.9&&Math.abs(p.z+37)>6?.087:.008}
export async function createResidents(scene,boxes,car,fleet=[car]){
 const carAt=(x,z,r)=>fleet.find(vehicle=>nearBody(vehicle,x,z,r))
 const all=await Promise.all(people.map(async(profile,i)=>{
  const rig=await createCharacter({variant:i}),pos=new Vector3(profile.x,0,profile.z)
  const n={...profile,rig,pos,height:1.8,state:'idle',face:i*.97,path:[],speed:0,wait:3+i*1.7,age:0,
   f:fighter(64+i*4),alert:0,talk:0,line:0,accum:0,look:0,blocked:0,stepping:0,stunX:0,stunZ:0,replan:0}
  rig.root.position.copy(pos);rig.root.rotation.y=n.face;scene.add(rig.root)
  return n
 }))
 const officers=all.filter(n=>n.officer),wanted=createWanted()
 let response=officers[0],sensing=0,observed=false
 const playerList=[],visibleSphere=new Sphere(new Vector3(),1.3),frustum=new Frustum(),viewProjection=new Matrix4()
 let talking=null,lastTalk='',shadowDirty=false
 const free=(p)=>canWalk(p.x,p.z,boxes,.31)&&!carAt(p.x,p.z,.32)
 function lineClear(a,b){
  const count=Math.ceil(distance(a,b)/.25)
  for(let k=1;k<count;k++){const t=k/count;if(!free({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}))return false}
  return true
 }
 const blockedBy=(n,x,z)=>all.some(other=>other!==n&&Math.hypot(other.pos.x-x,other.pos.z-z)<.59)
 // Small, local eight-neighbour flood search. Choose the reachable cell closest to the goal.
 function plan(n,goal,lane){
  const origin=n.pos,start={x:origin.x,z:origin.z,prev:null,i:0,j:0}
  const queue=[start],seen=new Set(['0,0']);let best=start,bestDistance=distance(start,goal)
  for(let head=0;head<queue.length&&head<440&&bestDistance>.65;head++){
   const at=queue[head]
   for(const [di,dj] of dirs){
    const i=at.i+di,j=at.j+dj,key=i+','+j
    if(seen.has(key)||Math.abs(i)>11||Math.abs(j)>20)continue
    const p={i,j,x:origin.x+i*cell,z:origin.z+j*cell,prev:at}
    if(lane&&(p.x<lane[0]||p.x>lane[1]))continue
    if(!free(p)){seen.add(key);continue}
    if(!lineClear(at,p))continue
    seen.add(key);queue.push(p)
    const d=distance(p,goal);if(d<bestDistance){best=p;bestDistance=d}
   }
  }
  const path=[];while(best.prev){path.push({x:best.x,z:best.z});best=best.prev}
  n.path=path.reverse()
 }
 function lane(n){return n.x<0?[-10,-6.65]:n.x>10.8?[11.2,15.6]:[6.7,10.25]}
 function wander(n){
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
  if(!n.path.length){n.speed=MathUtils.damp(n.speed,0,12,dt);return}
  const to=n.path[0],p=n.pos,d=distance(p,to)
  if(d<.23){n.path.shift();return}
  const angle=Math.atan2(to.x-p.x,to.z-p.z)
  turn(n,angle,dt)
  n.speed=MathUtils.damp(n.speed,pace*Math.max(.18,Math.cos(n.face-angle)),7,dt)
  const step=Math.min(d,n.speed*dt),oldX=p.x,oldZ=p.z
  const occupied=(x,z)=>carAt(x,z,.32)||blockedBy(n,x,z)||Math.hypot(x-player.x,z-player.z)<.64
  movePlayer(p,Math.sin(n.face)*step,Math.cos(n.face)*step,boxes,occupied)
  const actual=Math.hypot(oldX-p.x,oldZ-p.z)
  n.stepping=actual/dt
  if(actual<step*.25){n.blocked+=dt;if(n.blocked>.55){n.path=[];n.wait=.4+Math.random();n.replan=0;n.blocked=0}}
  else n.blocked=0
 }
 function candidate(p){
  let best=null,range=2.1
  for(const n of all){const d=distance(p,n.pos);if(!(n.officer&&wanted.level)&&n.alert<=0&&!n.f.action&&n.f.hp&&d<range&&lineClear(p,n.pos)){best=n;range=d}}
  return best
 }
 function endTalk(){if(talking){talking.talk=0;talking.state='idle';talking.wait=1;talking=null}lastTalk=''}
 function beginTalk(n){
  endTalk();talking=n;n.state='talk';n.talk=Infinity;n.path=[];lastTalk=n.lines[n.line++%n.lines.length]
 }
 function receive(n,source,zone,point){
  const angle=Math.atan2(source.x-n.pos.x,source.z-n.pos.z)
  const side=Math.cos(n.face)*(point.x-n.pos.x)-Math.sin(n.face)*(point.z-n.pos.z)>0?1:-1
  if(!injure(n.f,24,side,zone))return false
  endTalk()
  if(n.officer||n.f.hp>0||all.some(w=>w!==n&&w.f.hp>0&&distance(w.pos,source)<12&&lineClear(w.pos,source))){
   wanted.report(source,n.officer||!n.f.hp?2:1)
   response=officers.filter(o=>o.f.hp>0).sort((a,b)=>distance(a.pos,source)-distance(b.pos,source))[0]||officers[0];sensing=0
  }
  n.state='react';n.stunX=-Math.sin(angle);n.stunZ=-Math.cos(angle);n.alert=n.temper==='defend'?7:5;n.path=[];n.replan=0
  for(const other of all)if(other!==n&&distance(other.pos,n.pos)<5&&!other.f.action){other.alert=Math.max(other.alert,2);other.state='watch'}
  return true
 }
 function update(dt,camera,player,hitPlayer,onOutcome){
  const responding=n=>n.officer&&(wanted.level===3||response===n)&&n.f.hp>0
  if(wanted.level){
   sensing-=dt
   if(sensing<=0){
    sensing=.2
    observed=officers.some(n=>{
     const d=distance(n.pos,player.pos),angle=Math.atan2(player.pos.x-n.pos.x,player.pos.z-n.pos.z)
     if(!responding(n)||d>20||(d>3&&Math.cos(n.face-angle)<-.15))return false
     // The occupied vehicle itself must not occlude its driver's position.
     const end=player.inVehicle?worldPoint(player.inVehicle,0,player.inVehicle.length/2+.5):player.pos
     return lineClear(n.pos,end)
    })
   }
   const near=player.available&&officers.some(n=>responding(n)&&!n.f.action&&distance(n.pos,player.pos)<1.65&&lineClear(n.pos,player.pos))
   const outcome=wanted.tick(dt,player.pos,observed,near)
   if(outcome)onOutcome?.(outcome)
  }
  viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(viewProjection)
  shadowDirty=false
  for(const n of all){
   const p=n.pos,d=distance(p,player.pos);visibleSphere.center.set(p.x,1,p.z)
   const visible=frustum.intersectsSphere(visibleSphere)
   n.rig.root.visible=visible
   n.accum+=dt
   const interval=d<7?0:visible?(d<25?1/30:.10):.45
   if(n.accum<interval)continue
   const tick=Math.min(n.accum,.45);n.accum=0;n.age+=tick;n.replan-=tick;n.stepping=0;n.alert=Math.max(0,n.alert-tick)
   advance(n.f,tick)
   const traffic=fleet.find(vehicle=>Math.abs(vehicle.speed)>1&&distance(p,vehicle)<5)
   const blockingCar=carAt(p.x,p.z,.30)
   if(blockingCar){
    const car=blockingCar
    const local=localPoint(car,p.x,p.z)
    const exits=[worldPoint(car,-car.width/2-.4,local.z),worldPoint(car,car.width/2+.4,local.z),
     worldPoint(car,local.x,-car.length/2-.4),worldPoint(car,local.x,car.length/2+.4)]
    const clear=exits.filter(q=>free(q)&&!blockedBy(n,q.x,q.z)).sort((a,b)=>distance(a,p)-distance(b,p))[0]
    if(clear){p.x=clear.x;p.z=clear.z;n.path=[];n.replan=0}
   }
   const toward=Math.atan2(player.pos.x-p.x,player.pos.z-p.z)
   if(n.f.action==='down'){
    if(n.f.downTime>16&&!visible&&d>9){revive(n.f);n.state='idle';n.alert=0;n.wait=2}
   }else if(n.f.action==='hit'){
    movePlayer(p,n.stunX*tick*.55,n.stunZ*tick*.55,boxes,(x,z)=>carAt(x,z)||blockedBy(n,x,z));turn(n,toward,tick)
   }else if(n.f.action==='punch'){turn(n,toward,tick)}
   else if(wanted.level&&responding(n)){
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
   }else if(n.alert>0&&player.available){
    if(n.temper==='defend'&&n.state!=='watch'){
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
   }else{
    if(n.state!=='idle'&&n.state!=='walk'){n.state='idle';n.path=[];n.wait=.8}
    if(n.state==='walk'&&n.path.length)walkPath(n,tick,n.pace,player.pos)
    else{if(n.state==='walk'){n.state='idle';n.wait=1.6+Math.random()*4}
     n.wait-=tick;turn(n,n.face+Math.sin(n.age*.85)*.13,tick);if(n.wait<=0)wander(n)}
   }
   p.y=ground(p);n.rig.root.position.copy(p);n.rig.root.rotation.y=n.face
   if(visible||d<5){
    n.rig.update(tick,n.stepping,combatPose(n.f,n.state==='guard'||n.state==='watch'))
    if(n.f.action==='punch'&&player.available){
     playerList[0]=player
     contact(n.f,n.rig,p,playerList,lineClear,(_,zone,point)=>hitPlayer(n,zone,point))
    }
    if(d<18&&(n.stepping>.05||n.f.action))shadowDirty=true
   }
  }
 }
 return {all,officers,wanted,candidate,beginTalk,endTalk,receive,lineClear,update,blockedBy, get talking(){return talking},
  get dialogue(){return talking?{name:talking.name,role:talking.role,text:lastTalk}:null},get shadowDirty(){return shadowDirty}}
}
