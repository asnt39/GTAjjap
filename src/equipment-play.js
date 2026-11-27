import {Mesh,MeshBasicMaterial,OctahedronGeometry,Vector3} from 'three'
import {createEquipmentArt} from './equipment-art.js'
import {equipmentTrace} from './equipment-contact.js'

export function pelletDamage(distance,base){
 const falloff=Math.max(0,1-Math.max(0,distance-1.5)/11)
 return base*Math.max(.035,falloff**3)
}

// Center the player's sight on the camera, then check the actual hand-to-world path.
// Both passes use the same world volumes, including near cover and occupied cars.
export function equipmentPlay({scene,camera,char,boxes,fleet,crowd,player,loadout,effects,onHit,onShot,throwGrenade,toast}){
 const art=createEquipmentArt(char),trace=equipmentTrace(boxes,fleet,crowd.all)
 const chest=new Vector3(),muzzle=new Vector3(),direction=new Vector3(),aimPoint=new Vector3()
 const contact=new Vector3(),grip=new Vector3(),tip=new Vector3(),previousTip=new Vector3()
 const right=new Vector3(),up=new Vector3(),shotDirection=new Vector3()
 const meshGeometry=new OctahedronGeometry(1)
 const impact=new Mesh(meshGeometry,new MeshBasicMaterial({color:0xffbf83,toneMapped:false}))
 impact.scale.setScalar(.055);scene.add(impact)
 impact.visible=false
 let impactTime=0,batConnected=false,hasPrevious=false,queued=false,lastFailure='',throwTime=null
 const throwRelease=.28,throwLength=.53
 const origin=()=>chest.copy(player.pos).addScaledVector(worldUp,1.25)
 function mark(point){impact.position.copy(point);impact.visible=true;impactTime=.10}
 function hit(n,point,amount,kind='shot'){
  const zone=point.y>n.pos.y+n.height*.77?'upper':'body'
  if(crowd.receive(n,player.pos,zone,point,amount,kind))onHit(n)
 }
 function segment(from,to){
  direction.subVectors(to,from);const length=direction.length()
  if(length<.00001)return {distance:0}
  return trace(from,direction.multiplyScalar(1/length),length)
 }
 function fire(){
  const priorLevel=crowd.wanted.level
  const shotgun=loadout.selected==='shotgun', sniper=loadout.def.lethal===true
  const range=loadout.def.range, visualRange=Number.isFinite(range)?range:camera.far
  camera.getWorldDirection(direction)
  const focus=trace(camera.position,direction,range+camera.position.distanceTo(player.pos))
  aimPoint.copy(camera.position).addScaledVector(direction,Number.isFinite(focus.distance)?focus.distance:visualRange)
  // A third-person camera can be behind a corner that is behind the avatar.
  if(contact.subVectors(aimPoint,player.pos).dot(direction)<0)aimPoint.copy(player.pos).addScaledVector(worldUp,1.25).addScaledVector(direction,visualRange)
  art.muzzlePosition(muzzle)
  const occlusion=segment(origin(),muzzle)
  if(occlusion.blocked||occlusion.target){
   contact.copy(chest).addScaledVector(direction,occlusion.distance);mark(contact)
   if(occlusion.target)hit(occlusion.target,contact,shotgun||sniper?occlusion.target.f.hp:loadout.def.damage)
  }else{
   direction.subVectors(aimPoint,muzzle).normalize()
   right.crossVectors(direction,worldUp).normalize();up.crossVectors(right,direction)
   const pattern=shotgun?scatter:single
   const hits=new Map()
   for(const [x,y] of pattern){
    shotDirection.copy(direction).addScaledVector(right,x).addScaledVector(up,y).normalize()
    const result=trace(muzzle,shotDirection,range)
    contact.copy(muzzle).addScaledVector(shotDirection,Number.isFinite(result.distance)?result.distance:visualRange)
    if(!shotgun||!x||!y)effects?.trace(muzzle,contact)
    if(result.target||result.blocked){
     if(!x&&!y){
      mark(contact)
      if(result.blocked)effects?.emit('sparks',contact.x,contact.y,contact.z,3)
     }
     if(result.target){
      const amount=sniper?result.target.f.hp:shotgun?pelletDamage(result.distance,loadout.def.damage):loadout.def.damage
      const earlier=hits.get(result.target)
      if(earlier)earlier.amount+=amount
      else hits.set(result.target,{point:contact.clone(),amount})
     }
    }
   }
   for(const [n,event] of hits){
    const close=shotgun&&Math.hypot(n.pos.x-player.pos.x,n.pos.z-player.pos.z)<=2.4
    hit(n,event.point,close||sniper?n.f.hp:Math.max(1,Math.round(event.amount)))
   }
  }
  effects?.muzzle(muzzle,sniper?8:shotgun?5:2)
  art.flash()
  onShot(loadout.selected);crowd.hearShot(player.pos,crowd.wanted.level>priorLevel)
 }
 function sweep(from,to){
  const result=segment(from,to)
  if(!result.target)return false
  contact.copy(from).addScaledVector(direction,result.distance)
  const cover=segment(origin(),contact)
  if(cover.blocked)return false
  hit(result.target,contact,loadout.def.damage,'melee');mark(contact);return true
 }
 function interrupt(){
  queued=hasPrevious=batConnected=false;throwTime=null;loadout.interrupt();impact.visible=false
 }
 return {
  interrupt,
  get throwing(){return throwTime!==null},
  attack(ready=false){
   if(loadout.def.consumable){
    if(!loadout.item.reserve){toast('수류탄 없음 · 무기 상점에서 구매');return}
    if(throwTime===null&&!loadout.coolingDown)throwTime=0
    return
   }
   if(loadout.def.lethal&&!ready){toast('조준을 누른 상태에서 발사해.');return}
   if(!loadout.def.lethal&&!art.ready(loadout.selected)){toast(art.failed(loadout.selected)?'장비 모델을 불러오지 못했어':'장비를 준비하는 중');return}
   if(loadout.def.capacity&&!loadout.item.mag){
    toast(loadout.reloading?'재장전 중':loadout.item.reserve?'탄창이 비었어 · 재장전':'탄약 없음 · 무기 상점에서 구매');return
   }
   if(loadout.selected==='bat'){
    if(loadout.use()){batConnected=false;hasPrevious=false}
   }else queued=loadout.selected
  },
  update(dt,{active,aiming,speed,pitch,raise,ready=false,alignScope}){
   if(!active)interrupt()
   loadout.tick(dt)
   if(loadout.selected!=='grenade')throwTime=null
   const oldThrow=throwTime
   if(throwTime!==null)throwTime+=dt
   const release=oldThrow!==null&&oldThrow<throwRelease&&throwTime>=throwRelease
   if(throwTime!==null&&throwTime>=throwLength)throwTime=null
   const wantsShot=queued===loadout.selected&&active&&(!loadout.def.lethal||ready)
   queued=false
   art.update({dt,weapon:loadout.selected,hidden:!active,aiming:aiming||wantsShot||loadout.recoil>.15,speed,
    pitch,raise,throwing:(throwTime??0)/throwLength,
    held:loadout.item.reserve>0&&(throwTime===null||throwTime<=throwRelease)||release,recoil:loadout.recoil,swing:loadout.swing,reload:loadout.reloadProgress,bolt:loadout.boltProgress})
   if(release&&loadout.use()){
    art.muzzlePosition(muzzle)
    throwGrenade?.(muzzle)
   }
   const scoped=alignScope?.(art.scopePosition)
   const firing=wantsShot&&(!loadout.def.lethal||!alignScope||scoped===true)&&loadout.use()
   if(art.failed(loadout.selected)&&lastFailure!==loadout.selected){lastFailure=loadout.selected;toast('장비 모델을 불러오지 못했어 · 맨손으로 전환');loadout.select('fists')}
   impactTime-=dt
   if(impactTime<=0)impact.visible=false
   if(firing)fire()
   if(active&&loadout.swing>0){
    art.tipPosition(tip);char.handPosition(-1,grip)
    if(!batConnected&&loadout.swing>=.28&&loadout.swing<=.78){
     batConnected=sweep(grip,tip)||(hasPrevious&&sweep(previousTip,tip))
    }
    previousTip.copy(tip);hasPrevious=true
   }else hasPrevious=false
  }
 }
}
const worldUp=new Vector3(0,1,0)
const single=[[0,0]],scatter=[[0,0],[-.058,.012],[.054,.023],[-.025,-.041],[.024,-.033],[.006,.049]]
