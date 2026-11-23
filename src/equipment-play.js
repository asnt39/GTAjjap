import {Mesh,MeshBasicMaterial,OctahedronGeometry,Vector3} from 'three'
import {createEquipmentArt} from './equipment-art.js'
import {equipmentTrace} from './equipment-contact.js'

export function pelletDamage(distance,base){
 const falloff=Math.max(0,1-Math.max(0,distance-1.5)/11)
 return base*Math.max(.035,falloff**3)
}

// Center the player's sight on the camera, then check the actual hand-to-world path.
// Both passes use the same world volumes, including near cover and occupied cars.
export function equipmentPlay({scene,camera,char,boxes,fleet,crowd,player,loadout,effects,onHit,onShot,toast}){
 const art=createEquipmentArt(char),trace=equipmentTrace(boxes,fleet,crowd.all)
 const chest=new Vector3(),muzzle=new Vector3(),direction=new Vector3(),aimPoint=new Vector3()
 const contact=new Vector3(),grip=new Vector3(),tip=new Vector3(),previousTip=new Vector3()
 const right=new Vector3(),up=new Vector3(),shotDirection=new Vector3()
 const meshGeometry=new OctahedronGeometry(1)
 const impact=new Mesh(meshGeometry,new MeshBasicMaterial({color:0xffbf83,toneMapped:false}))
 impact.scale.setScalar(.055);scene.add(impact)
 impact.visible=false
 let impactTime=0,batConnected=false,hasPrevious=false,queued=false,lastFailure=''
 const origin=()=>chest.copy(player.pos).addScaledVector(worldUp,1.25)
 function mark(point){impact.position.copy(point);impact.visible=true;impactTime=.10}
 function hit(n,point,amount){
  const zone=point.y>n.pos.y+n.height*.77?'upper':'body'
  if(crowd.receive(n,player.pos,zone,point,amount))onHit(n)
 }
 function segment(from,to){
  direction.subVectors(to,from);const length=direction.length()
  if(length<.00001)return {distance:0}
  return trace(from,direction.multiplyScalar(1/length),length)
 }
 function fire(){
  const priorLevel=crowd.wanted.level
  const shotgun=loadout.selected==='shotgun'
  camera.getWorldDirection(direction)
  const focus=trace(camera.position,direction,loadout.def.range+camera.position.distanceTo(player.pos))
  aimPoint.copy(camera.position).addScaledVector(direction,focus.distance)
  // A third-person camera can be behind a corner that is behind the avatar.
  if(contact.subVectors(aimPoint,player.pos).dot(direction)<0)aimPoint.copy(player.pos).addScaledVector(worldUp,1.25).addScaledVector(direction,loadout.def.range)
  art.muzzlePosition(muzzle)
  const occlusion=segment(origin(),muzzle)
  if(occlusion.blocked||occlusion.target){
   contact.copy(chest).addScaledVector(direction,occlusion.distance);mark(contact)
   if(occlusion.target)hit(occlusion.target,contact,shotgun?occlusion.target.f.hp:loadout.def.damage)
  }else{
   direction.subVectors(aimPoint,muzzle).normalize()
   right.crossVectors(direction,worldUp).normalize();up.crossVectors(right,direction)
   const pattern=shotgun?scatter:single
   const hits=new Map()
   for(const [x,y] of pattern){
    shotDirection.copy(direction).addScaledVector(right,x).addScaledVector(up,y).normalize()
    const result=trace(muzzle,shotDirection,loadout.def.range)
    contact.copy(muzzle).addScaledVector(shotDirection,result.distance)
    if(!shotgun||!x||!y)effects?.trace(muzzle,contact)
    if(result.target||result.blocked){
     if(!x&&!y){
      mark(contact)
      if(result.blocked)effects?.emit('sparks',contact.x,contact.y,contact.z,3)
     }
     if(result.target){
      const amount=shotgun?pelletDamage(result.distance,loadout.def.damage):loadout.def.damage
      const earlier=hits.get(result.target)
      if(earlier)earlier.amount+=amount
      else hits.set(result.target,{point:contact.clone(),amount})
     }
    }
   }
   for(const [n,event] of hits){
    const close=shotgun&&Math.hypot(n.pos.x-player.pos.x,n.pos.z-player.pos.z)<=2.4
    hit(n,event.point,close?n.f.hp:Math.max(1,Math.round(event.amount)))
   }
  }
  effects?.muzzle(muzzle,shotgun?5:2)
  art.flash()
  onShot(loadout.selected);crowd.hearShot(player.pos,crowd.wanted.level>priorLevel)
 }
 function sweep(from,to){
  const result=segment(from,to)
  if(!result.target)return false
  contact.copy(from).addScaledVector(direction,result.distance)
  const cover=segment(origin(),contact)
  if(cover.blocked)return false
  hit(result.target,contact,loadout.def.damage);mark(contact);return true
 }
 function interrupt(){
  queued=hasPrevious=batConnected=false;loadout.interrupt();impact.visible=false
 }
 return {
  interrupt,
  attack(){
   if(!art.ready(loadout.selected)){toast(art.failed(loadout.selected)?'장비 모델을 불러오지 못했어':'장비를 준비하는 중');return}
   if(loadout.def.capacity&&!loadout.item.mag){
    toast(loadout.item.reserve?'탄창이 비었어 · 재장전':'탄약 없음 · 부두 정문 안내에서 보급');return
   }
   if(loadout.selected==='bat'){
    if(loadout.use()){batConnected=false;hasPrevious=false}
   }else queued=loadout.selected
  },
  update(dt,{active,aiming,speed,pitch}){
   if(!active)interrupt()
   loadout.tick(dt)
   const firing=queued===loadout.selected&&active&&loadout.use()
   queued=false
   art.update({dt,weapon:loadout.selected,hidden:!active,aiming:aiming||firing||loadout.recoil>.15,speed,
    pitch,recoil:loadout.recoil,swing:loadout.swing,reload:loadout.reloadProgress})
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
