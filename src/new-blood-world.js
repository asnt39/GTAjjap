import {ConeGeometry,Mesh,MeshBasicMaterial,Vector3} from 'three'
import {createCharacter} from './character.js'
import {createCompanion} from './companion.js'
import {nearBody} from './driving.js'
import {moveImpact} from './impact-motion.js'
import {advance,combatPose,fighter,injure} from './melee.js'
import {cameraFraction,canWalk,movePlayer} from './navigation.js'
import {clubPlan} from './new-blood-club-plan.js'
import {clubFire} from './new-blood-fire.js'

const phases=new Set(['entry','meeting','ambush','evacuation','street'])
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const angular=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a))
const combatRoles={
 support:{weapon:'pistol',mag:6,damage:20,range:18,aim:.5,cadence:.85,pace:2.4,run:3.8},
 cover:{weapon:'pistol',mag:5,damage:8,range:18,aim:.68,cadence:1.10,pace:1.75,run:2.35},
 flank:{weapon:'pistol',mag:5,damage:8,range:17,aim:.64,cadence:.94,pace:2.35,run:3.35},
 rush:{weapon:'shotgun',mag:3,damage:13,range:10,aim:.78,cadence:1.33,pace:2.7,run:3.95}
}
const pinGeometry=new ConeGeometry(.107,.17,4).rotateZ(Math.PI)
const pinMaterial=new MeshBasicMaterial({color:0xda3e49,toneMapped:false})
const phaseOf=stage=>phases.has(stage?.set)?stage.set:phases.has(stage?.kind)?stage.kind:null
const isFight=phase=>phase==='ambush'||phase==='street'

const {actors:places,routes}=clubPlan
const victimExit={x:clubPlan.exit.x+.96,z:clubPlan.exit.z-.15}
const rearRoute=[...routes.rear,victimExit]
const lobby=[clubPlan.entry,places.reception,...routes.vip]
const indoors=[...lobby,...rearRoute,...places.ambushCover]
const outdoors=[clubPlan.entry,clubPlan.exit,...routes.street.flat()]
const positions=[...places.ambushCover,...routes.vip,...routes.rear,...routes.street.flat()]
const corners=[[-1,0],[1,0],[0,-1],[0,1]]
const spawnOffsets=[...corners,[-.707,-.707],[-.707,.707],[.707,-.707],[.707,.707]]

export function newBloodWorld({scene,boxes,crowd,traffic,height,combat,notify}){
 const firearms=clubFire(boxes,traffic,crowd.all)
 const actors=[]
 const from=new Vector3(),to=new Vector3(),wide=new Vector3()
 let current=null,ready=false,elapsed=0,run=0,met=false,evacLeg=0,failed='',suspendedJack=null
 let playerPos=null

 function restoreJack(){
  if(!suspendedJack)return
  const {actor,index,visible}=suspendedJack
  actor.rig.root.visible=visible
  crowd.all.splice(Math.min(index,crowd.all.length),0,actor)
  suspendedJack=null
 }
 function suspendJack(){
  const index=crowd.all.findIndex(n=>n.id==='courier')
  if(index<0)return true
  const actor=crowd.all[index]
  if(crowd.talking===actor)return false
  suspendedJack={actor,index,visible:actor.rig.root.visible}
  actor.rig.root.visible=false
  crowd.all.splice(index,1)
  return true
 }
 function clean(){
  run++;firearms.reset()
  for(const n of actors){
   const index=crowd.all.indexOf(n)
   if(index>=0)crowd.all.splice(index,1)
   n.rig.root.removeFromParent();n.rig.dispose()
  }
  restoreJack()
  actors.length=0;current=null;playerPos=null;ready=met=false;elapsed=evacLeg=0;failed=''
 }
 function blocked(n,x,z){
  return crowd.blockedBy(n,x,z)||!!playerPos&&distance(playerPos,{x,z})<.64||
   actors.some(other=>other!==n&&other.joined&&other.f.hp>0&&distance(other.pos,{x,z})<.59)||
   traffic.some(car=>nearBody(car,x,z))
 }
 function stand(x,z){
  return canWalk(x,z,boxes,.32,height(x,z))&&!traffic.some(car=>nearBody(car,x,z))
 }
 function traverse(a,b){
  const count=Math.ceil(distance(a,b)/.42)
  for(let i=1;i<=count;i++){
   const t=i/count
   if(!stand(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false
  }
  return true
 }
 function specs(phase){
  const jackAt={entry:places.jack,meeting:places.reception,ambush:routes.vip.at(-2),evacuation:routes.vip.at(-2),street:clubPlan.exit}[phase]
  const list=[{id:'jack',name:'Jack Bennett',model:'mariner',point:jackAt,hp:126,role:'support',paths:[...indoors,...outdoors]}]
  if(phase!=='entry')list.push({id:'victor',name:'Victor Hale',model:'resident',variant:2,
   point:phase==='street'?victimExit:places.victor,hp:122,paths:indoors})
  if(isFight(phase)){
   const outside=phase==='street'
   const points=outside?places.streetAmbush:places.ambushCover
   const order=outside?['rush','cover','flank']:['cover','flank','rush']
   const delays=outside?[1.35,3.5,5.6]:[.75,2.1,3.8]
   points.forEach((point,index)=>list.push({id:phase+'-'+index,name:outside?'골목 습격범':'클럽 습격범',model:'resident',variant:[7,6,4][index],
    point,hp:54,role:order[index],delay:delays[index],missionRole:'hostile',paths:outside?outdoors:indoors,
    approach:outside?routes.street[index]:index===1?[clubPlan.dance,routes.vip[1]]:[]}))
  }
  return list.filter(spec=>!actors.some(n=>n.localId===spec.id))
 }
 function makeActor(spec,rig,phase,index){
  const {id,name,point,role,hp,delay=0,missionRole='ally',paths,approach=[]}=spec
  const pos=new Vector3(point.x,height(point.x,point.z),point.z)
  const n={id:'new-blood-'+id,localId:id,name,pos,rig,phase,role,combat:combatRoles[role],missionRole,delay,approach,
   height:1.77,f:fighter(hp),face:0,speed:0,stepping:0,stagger:index,joined:false,nextLeg:0,rethink:0,focus:null,spot:null}
  n.route=createCompanion({position:pos,waypoints:paths,canStand:stand,canTraverse:traverse,
   move:(p,dx,dz)=>movePlayer(p,dx,dz,boxes,(x,z)=>blocked(n,x,z),p.y),
   stopDistance:id==='jack'?1.0:.53,walkSpeed:n.combat?.pace??2.24,runSpeed:n.combat?.run??3.15})
  if(id!=='jack'||phase!=='entry')n.route.command('join')
  if(missionRole==='hostile'){
   n.pin=new Mesh(pinGeometry,pinMaterial)
   n.pin.visible=false;n.pin.position.y=2.10;rig.root.add(n.pin)
  }
  rig.root.name=name+' · The Lantern Room'
  return n
 }
 function start(phase){
  if(!phase){clean();return}
  current=phase;elapsed=evacLeg=0;ready=false
  const incoming=specs(phase),token=++run
  if(!incoming.length){ready=true;return}
  Promise.allSettled(incoming.map(({model,variant})=>createCharacter({model,variant}))).then(results=>{
   if(token!==run||results.some(r=>r.status==='rejected')){
    for(const r of results)if(r.status==='fulfilled')r.value.dispose()
    if(token===run){failed='Lantern Room 인물을 불러오지 못했습니다.';notify?.(failed,true)}
    return
   }
   for(const [index,{value}] of results.entries())actors.push(makeActor(incoming[index],value,phase,index))
   ready=true
  })
 }
 function enter(stage){
  clean()
  const phase=phaseOf(stage)
  if(phase)start(phase)
 }
 function join(n){
  if(elapsed<n.delay)return false
  const clear=(x,z)=>stand(x,z)&&!blocked(n,x,z)
  let point=n.pos
  if(!clear(point.x,point.z)){
   const candidates=[.85,1.28,1.72].flatMap(radius=>spawnOffsets.map(([x,z])=>({x:n.pos.x+x*radius,z:n.pos.z+z*radius})))
   point=candidates.find(p=>clear(p.x,p.z))
   if(!point)return false
  }
  if(n.localId==='jack'&&!suspendJack())return false
  n.pos.set(point.x,height(point.x,point.z),point.z)
  n.joined=true
  n.rig.root.position.copy(n.pos);n.rig.root.rotation.y=n.face
  scene.add(n.rig.root);crowd.all.push(n)
  return true
 }
 function actionNear(pos,n,range=2.18){
  if(!n?.joined||!n.f.hp||n.f.action||distance(pos,n.pos)>range||Math.abs((pos.y??0)-n.pos.y)>.85)return false
  from.set(pos.x,(pos.y??0)+1.24,pos.z);to.copy(n.pos);to.y+=1.24
  return cameraFraction(from,to,boxes)>.91
 }
 function interactions(stage,pos){
  if(!ready||phaseOf(stage)!==current||!current)return []
  const actions=[]
  const jack=actors.find(n=>n.localId==='jack'),victor=actors.find(n=>n.localId==='victor')
  if(current==='meeting'&&!met&&actionNear(pos,victor))actions.push({id:'new-blood-victor-talk',label:'Victor · 대화',x:victor.pos.x,z:victor.pos.z,activate(){
   met=true
   return {message:'Victor · 뒷문은 잠그라고 했는데… Jack, 방금 소리 들었나?',met:true}
  }})
  if(actionNear(pos,jack,current==='entry'&&jack?.route.mode==='hold'?3.2:2.18)){
   const follow=jack.route.mode==='hold',first=follow&&current==='entry'&&!jack.joinedCommand
   const command=first?'join':follow?'follow':'hold'
   actions.push({id:'new-blood-jack-'+command,label:follow?'Jack · 따라와':'Jack · 여기서 대기',x:jack.pos.x,z:jack.pos.z,activate(){
    jack.route.command(command);jack.joinedCommand=true
    return {message:follow?'Jack · 바로 뒤에 있을게.':'Jack · 여기서 엄호할게.'}
   }})
  }
  return actions
 }
 function bestTarget(n,choices){
  let best=null,score=Infinity
  for(const target of choices){
   if(!target?.f.hp||target.exposed===false)continue
   const gap=distance(n.pos,target.pos)
   const cost=gap+(firearms.visible(n,target)?0:8)+(target.localId==='victor'?4:0)
   if(cost<score){score=cost;best=target}
  }
  return best
 }
 function firingPosition(n,target,covered){
  const gap=distance(n.pos,target.pos),dx=(target.pos.x-n.pos.x)/(gap||1),dz=(target.pos.z-n.pos.z)/(gap||1)
  const adjacent=corners.map(([x,z])=>({x:n.pos.x+x*2.1,z:n.pos.z+z*2.1}))
  const flank=Math.min(5.2,n.combat.range*.6)
  const lateral=[1,-1].map(side=>({x:target.pos.x-dx*4-dz*flank*side,z:target.pos.z-dz*4+dx*flank*side}))
  const candidates=n.role==='flank'&&!covered?[...lateral,...adjacent,...positions]:[...adjacent,...positions]
  let best=null,score=Infinity
  for(const point of candidates){
   const cost=distance(n.pos,point),reach=covered?5.3:9
   if(cost<.85||cost>reach||distance(point,target.pos)>n.combat.range||!stand(point.x,point.z))continue
   wide.set(point.x,height(point.x,point.z),point.z)
   if(firearms.visible(n,target,wide)===covered)continue
   const bias=n.role==='flank'&&!covered&&lateral.includes(point)?-2.2:0
   if(cost+bias<score){score=cost+bias;best=point}
  }
  return best
 }
 function hostileGoal(n,target,visible,gap){
  const leg=n.approach[n.nextLeg]
  if(leg&&distance(n.pos,leg)<1)n.nextLeg++
  if(n.approach[n.nextLeg])return n.approach[n.nextLeg]
  if(!target||gap>38)return null
  if(firearms.reloading(n))return firingPosition(n,target,true)
  if(n.role==='rush')return !visible||gap>5.9?target.pos:null
  if(n.flankPoint){
   if(elapsed<n.flankUntil&&distance(n.pos,n.flankPoint)>1)return n.flankPoint
   n.flanked=true;n.flankPoint=null
  }
  if(n.role==='flank'&&!n.flanked){
   const plan=firingPosition(n,target,false)
   if(plan){n.flankUntil=elapsed+4.5;n.flankPoint=plan;return plan}
  }
  if(!visible||gap>n.combat.range)return firingPosition(n,target,false)??(n.role==='flank'||current==='street'?target.pos:null)
  return null
 }
 function victorGoal(n,onFoot){
  if(current!=='evacuation'||!onFoot||distance(n.pos,playerPos)>12.5)return null
  const point=rearRoute[evacLeg]
  if(point&&distance(n.pos,point)<.84)evacLeg++
  return rearRoute[evacLeg]??null
 }
 function makeRoom(n,player,onFoot,dt){
  if(n.missionRole!=='ally'||!onFoot||n.f.action||!n.f.hp){n.sideStep=null;return false}
  if(!n.sideStep){
   const intent=player.walkIntent,pace=intent?Math.hypot(intent.x,intent.z):0
   if(pace<.4||distance(n.pos,player.pos)>1.55)return false
   const dx=intent.x/pace,dz=intent.z/pace
   const x=n.pos.x-player.pos.x,z=n.pos.z-player.pos.z
   const offset=x*dz-z*dx
   if(dx*x+dz*z<.12||Math.abs(offset)>.77)return false
   const side=Math.sign(offset)||1
   const options=[side,-side].map(sign=>({x:n.pos.x+dz*sign*1.12,z:n.pos.z-dx*sign*1.12}))
   options.push({x:n.pos.x+dx*1.16,z:n.pos.z+dz*1.16})
   n.sideStep=options.find(p=>!blocked(n,p.x,p.z)&&traverse(n.pos,p))??null
  }
  if(!n.sideStep)return false
  const x=n.pos.x,z=n.pos.z,gap=distance(n.pos,n.sideStep)
  if(gap<.08){n.sideStep=null;return false}
  const ratio=Math.min(1,dt*2.35/gap)
  movePlayer(n.pos,(n.sideStep.x-x)*ratio,(n.sideStep.z-z)*ratio,boxes,(a,b)=>blocked(n,a,b),n.pos.y)
  if(distance(n.pos,{x,z})<.003)n.sideStep=null
  return true
 }
 function shot(shooter,target,start,end,hit,weapon,damage){
  const playerHit=target.missionRole!==undefined?false:hit
  combat?.(shooter,start,end,playerHit,weapon,damage)
  if(target.missionRole&&hit)injure(target.f,damage,1,'body',{weaponHit:true})
 }
 function step(stage,dt,player,onFoot){
  const phase=phaseOf(stage)
  if(phase!==current)start(phase)
  if(!current)return {}
  if(!ready)return {failed,status:failed?'':'장소 확인 중'}
  elapsed+=dt;playerPos=player.pos
  firearms.update(dt)
  for(const n of actors)if(!n.joined)join(n)
  const jack=actors.find(n=>n.localId==='jack'),victor=actors.find(n=>n.localId==='victor')
  const allies=[jack,victor].filter(n=>n?.joined&&n.f.hp>0)
  const foes=actors.filter(n=>n.missionRole==='hostile'&&n.phase===phase)
  const alive=foes.filter(n=>n.joined&&n.f.hp>0)

  for(const n of actors){
   if(!n.joined)continue
   advance(n.f,dt)
   const lift=moveImpact(n.f,n.pos,dt,boxes,(x,z)=>blocked(n,x,z))
   const playerGap=distance(n.pos,player.pos)
   const armed=isFight(phase)&&n.f.hp>0&&!!n.combat&&(n.missionRole==='ally'?playerGap<15:n.phase===phase)
   n.rethink-=dt
   if(n.rethink<=0){
    n.focus=armed?bestTarget(n,n.missionRole==='hostile'?[player,...allies]:alive):null
    const seen=n.focus&&firearms.visible(n,n.focus)
    const gap=n.focus?distance(n.pos,n.focus.pos):0
    if(n.missionRole==='hostile')n.spot=armed?hostileGoal(n,n.focus,seen,gap):null
    if(n.localId==='jack'){
     const nearPlayer=playerGap<6
     n.spot=armed&&nearPlayer&&n.focus&&firearms.reloading(n)?firingPosition(n,n.focus,true):null
     if(!n.spot&&onFoot&&playerGap<26&&(!seen||gap>n.combat.range||!nearPlayer))n.spot=player.pos
    }
    if(n.localId==='victor')n.spot=victorGoal(n,onFoot)
    n.rethink=.26+n.stagger*.02
   }
   const x=n.pos.x,z=n.pos.z
   if(!makeRoom(n,player,onFoot,dt))n.route.update(dt,{target:n.spot,enabled:!n.f.action&&n.f.hp>0})
   n.speed=n.stepping=dt>0?Math.hypot(n.pos.x-x,n.pos.z-z)/dt:0
   const face=n.speed>.2?Math.atan2(n.pos.x-x,n.pos.z-z):n.focus?.f.hp?Math.atan2(n.focus.pos.x-x,n.focus.pos.z-z):Math.atan2(player.pos.x-x,player.pos.z-z)
   n.face+=angular(n.face,face)*(1-Math.exp(-9*dt))
   n.pos.y=height(n.pos.x,n.pos.z)
   n.rig.root.position.copy(n.pos);n.rig.root.position.y+=lift;n.rig.root.rotation.y=n.face
   n.rig.update(dt,n.speed,combatPose(n.f))
   const aiming=armed&&n.focus&&n.speed<1.65&&distance(n.pos,n.focus.pos)<n.combat.range&&firearms.visible(n,n.focus)
   firearms.tick(n,n.focus,dt,!!aiming,armed,shot)
   if(n.pin)n.pin.visible=!!n.f.hp&&(!!aiming||playerGap<11)
  }
  failed=jack&&!jack.f.hp?'Jack을 보호하지 못했습니다.':victor&&!victor.f.hp?'Victor를 보호하지 못했습니다.':failed
  const arrived=phase==='entry'&&onFoot&&jack?.joined&&jack.route.mode!=='hold'&&
   distance(player.pos,places.reception)<2&&distance(jack.pos,places.reception)<2&&jack.pos.z<clubPlan.bounds.south-.28
  const escaped=phase==='evacuation'&&onFoot&&victor?.joined&&distance(player.pos,clubPlan.exit)<3.2&&
   player.pos.z<clubPlan.bounds.north-.38&&distance(victor.pos,clubPlan.exit)<1.28&&victor.pos.z<clubPlan.bounds.north-.38
  const cleared=isFight(phase)&&foes.length>0&&foes.every(n=>!n.f.hp)
  const threats=alive.filter(n=>n.f.hp>0).length
  const status=phase==='entry'&&jack?.route.mode==='hold'?'Jack에게 이동 지시':phase==='evacuation'&&victor?'Victor '+victor.f.hp+'/'+victor.f.maxHealth:
   isFight(phase)&&threats?'위협 '+threats+'명':''
  return {arrived,met,cleared,escaped,failed,status,threats,moving:actors.some(n=>n.speed>.12||n.f.action)}
 }
 return {enter,clean,interactions,step,markers:()=>actors.filter(n=>n.joined&&n.f.hp>0&&n.missionRole==='hostile').map(n=>({x:n.pos.x,z:n.pos.z}))}
}
