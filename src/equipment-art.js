import {
 ConeGeometry, Euler, Group, MathUtils, Mesh, MeshBasicMaterial, Quaternion, Vector3
} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'

const equipment = new Set(['pistol','shotgun','bat'])
const loader = new GLTFLoader()
// The Rocketbox hand's local X points along the fingers and Z toward the thumb.
const rightGrip = new Quaternion(.5,.5,.5,-.5).normalize()
const leftGrip = rightGrip.clone().multiply(new Quaternion().setFromEuler(new Euler(Math.PI,0,0)))
leftGrip.premultiply(new Quaternion().setFromEuler(new Euler(0,-.79,0)))
const batGrip = rightGrip.clone().premultiply(new Quaternion().setFromEuler(new Euler(0,.76,-.24)))

function release(scene) {
 const textures=new Set(), materials=new Set(), geometry=new Set()
 scene.traverse(node=>{
  if(!node.isMesh)return
  geometry.add(node.geometry)
  for(const mat of Array.isArray(node.material)?node.material:[node.material])materials.add(mat)
 })
 for(const mat of materials){
  for(const value of Object.values(mat))if(value?.isTexture)textures.add(value)
  mat.dispose()
 }
 for(const tex of textures){tex.dispose();tex.source?.data?.close?.()}
 for(const geo of geometry)geo.dispose()
}

export function createEquipmentArt(character) {
 const rig=character.equipmentRig
 const socket=new Group(), scale=new Vector3()
 rig.hand.add(socket)
 // Position the grip slightly inside the curled fingers, in native skeleton units.
 socket.position.copy(rig.knuckle.position).multiplyScalar(.84)
 rig.hand.getWorldScale(scale)
 socket.scale.set(1/scale.x,1/scale.y,1/scale.z)
 const shapes=new Map(), errors=new Set(), loading=new Set()
 const rotation=new Euler(0,0,0,'YXZ'), equipmentQ=new Quaternion(), handQ=new Quaternion()
 const rootQ=new Quaternion(), leftTarget=new Vector3()
 let selected='fists', active=null, disposed=false, flashTime=0, stride=0, lift=0
 const flashGeometry=new ConeGeometry(.025,.085,5)
 flashGeometry.rotateX(Math.PI/2)
 flashGeometry.translate(0,0,.045)
 const flash=new Mesh(flashGeometry,new MeshBasicMaterial({color:0xffdd91,toneMapped:false}))
 flash.visible=false

 function ensure(weapon){
  if(loading.has(weapon)||shapes.has(weapon)||errors.has(weapon))return
  loading.add(weapon)
  loader.loadAsync('/assets/equipment/'+weapon+'.glb').then(({scene})=>{
   if(disposed){release(scene);return}
   scene.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true}})
   const end=scene.getObjectByName('End')
   if(!end){release(scene);errors.add(weapon);return}
   scene.visible=false
   socket.add(scene)
   shapes.set(weapon,{scene,end})
  }).catch(()=>errors.add(weapon)).finally(()=>loading.delete(weapon))
 }

 function update({weapon='fists',aiming=false,recoil=0,swing=0,speed=0,
                  hidden=false,reload=0,pitch=0,dt=1/60}={}){
  if(disposed)return
  if(weapon!==selected){
   errors.delete(weapon) // Re-selecting a failed model retries its request.
   selected=weapon
   lift=0
   flashTime=0
  }
  if(!hidden&&equipment.has(weapon))ensure(weapon)
  const next=hidden?null:shapes.get(weapon)
  if(active!==next){
   if(active)active.scene.visible=false
   active=next
   if(active){active.scene.visible=true;active.end.add(flash)}
  }
  if(!active){flash.visible=false;return}
  flashTime=Math.max(0,flashTime-dt)
  flash.visible=flashTime>0
  const bat=weapon==='bat', long=weapon==='shotgun'
  const run=MathUtils.smoothstep(speed,1.2,5.4)
  stride=(stride+dt*Math.min(speed,7)*3.7)%(2*Math.PI)
  const bob=Math.sin(stride)*(.009+.014*run)
  lift=MathUtils.damp(lift,aiming||recoil>0?1:0,22,dt)
  const support=long?1:bat?0:lift
  const reloadArc=Math.sin(Math.PI*MathUtils.clamp(reload,0,1))
  let x,y,z,tilt,yaw,roll
  if(bat){
   const pull=MathUtils.smoothstep(swing,0,.28)
   const sweep=MathUtils.smootherstep(swing,.28,.75)
   const settle=1-MathUtils.smootherstep(swing,.75,1)
   const draw=pull*(1-sweep)
   const travel=sweep*settle
   yaw=-.68-1.02*draw+2.13*travel
   tilt=-.94+.56*draw+.91*travel
   roll=-.22
   x=-.25-.11*draw+.42*travel
   y=1.02+bob+.23*draw+.18*travel
   z=.18+.04*draw+.32*Math.sin(Math.PI*sweep)*settle
   rig.offset('Spine1','y',-.24*draw+.37*travel)
  }else{
   yaw=.06*(1-lift)
   tilt=(long?.27:.50)*(1-lift)-MathUtils.clamp(pitch,-.77,.77)*lift-.08*recoil-.44*reloadArc
   roll=(long?-.04:-.09)*(1-lift)-.34*reloadArc
   x=long?-.13:-.18+.11*lift
   y=(long?1.21:1.10)+(long?.12:.25)*lift+bob*(1-.7*lift)-.045*run*(1-lift)+.035*recoil
   z=(long?.17:.23)+(long?.08:.25)*lift-.035*recoil-.10*reloadArc
   y+=.19*Math.sin(-tilt)*lift
   rig.offset('Spine1','x',-.035*recoil)
  }
  rig.placeArm(-1,x,y,z,1)
  character.root.getWorldQuaternion(rootQ)
  equipmentQ.setFromEuler(rotation.set(tilt,yaw,roll,'YXZ'))
  if(support>.001){
   // Support point is derived from the same transform as the visible prop.
   leftTarget.set(long?.075:.065,long?-.010:-.038,long?.19:-.012)
   leftTarget.applyQuaternion(equipmentQ)
   rig.placeArm(1,x+leftTarget.x,y+leftTarget.y-.10*reloadArc,z+leftTarget.z+.02,support)
  }
  equipmentQ.premultiply(rootQ)
  const grip=bat?batGrip:rightGrip
  rig.orientHand(-1,handQ.copy(equipmentQ).multiply(grip))
  rig.curl(-1,.82)
  if(support>.001){
   rig.orientHand(1,handQ.copy(equipmentQ).multiply(leftGrip),support)
   rig.curl(1,.65*support)
  }
  socket.quaternion.copy(grip).invert()
 }
 function endPosition(out){
  return active?active.end.getWorldPosition(out):character.handPosition(-1,out)
 }
 return {
  update,muzzlePosition:endPosition,tipPosition:endPosition,
  ready:weapon=>weapon==='fists'||shapes.has(weapon),
  failed:weapon=>errors.has(weapon),
  flash(){if(!active||selected==='bat')return;flash.rotation.z+=2.13;flashTime=.064;flash.visible=true},
  dispose(){
   disposed=true
   flash.removeFromParent();flash.geometry.dispose();flash.material.dispose()
   socket.removeFromParent()
   for(const item of shapes.values())release(item.scene)
   shapes.clear()
  }
 }
}
