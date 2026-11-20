import {Group,MathUtils,Mesh,MeshStandardMaterial,TorusGeometry,Vector3} from 'three'
import {cameraFraction} from './navigation.js'

export function custodyPresentation(scene,rig,boxes) {
 const overlay=document.createElement('div')
 overlay.id='custody-overlay'
 overlay.innerHTML='<div role="status" class="custody-status" hidden></div>'
 document.querySelector('#game').append(overlay)
 const status=overlay.firstElementChild
 const cuffs=new Group(), metal=new MeshStandardMaterial({color:0xb5c0c5,roughness:.27,metalness:.86})
 const rings=[-1,1].map(side=>{
  const hand=rig.root.getObjectByName('Bip01_'+(side<0?'R':'L')+'_Hand')
  const forearm=hand.parent
  const ring=new Mesh(new TorusGeometry(.041,.006,6,18),metal)
  cuffs.add(ring)
  return {hand,forearm,ring}
 })
 const link=new Mesh(new TorusGeometry(.023,.004,5,12),metal)
 cuffs.add(link);scene.add(cuffs);cuffs.visible=false
 const axis=new Vector3(0,0,1),elbow=new Vector3(),direction=new Vector3()
 const aim=new Vector3(),eye=new Vector3(),wrist=new Vector3(),reach=new Vector3()
 let facing=0,opacity=0
 return {
  begin(officer,pos){facing=Math.atan2(pos.x-officer.pos.x,pos.z-officer.pos.z)},
  pose(dt,hold,actor,officer){
   const error=Math.atan2(Math.sin(facing-actor.rotation.y),Math.cos(facing-actor.rotation.y))
   actor.rotation.y+=error*(1-Math.exp(-10*dt))
   const angle=Math.atan2(actor.position.x-officer.pos.x,actor.position.z-officer.pos.z)
   officer.rig.root.rotation.y=angle
   const p=hold.progress
   rig.update(dt,0,{custody:{progress:p}})
   rings.forEach(({hand,forearm,ring})=>{
    hand.getWorldPosition(ring.position);forearm.getWorldPosition(elbow)
    direction.copy(ring.position).sub(elbow).normalize()
    ring.position.addScaledVector(direction,-.023)
    ring.quaternion.setFromUnitVectors(axis,direction)
   })
   wrist.copy(rings[0].ring.position).lerp(rings[1].ring.position,.5)
   officer.rig.update(dt,0,{custody:{progress:p,wrist}})
   cuffs.visible=p>.69
   link.position.copy(wrist)
   direction.copy(rings[1].ring.position).sub(rings[0].ring.position)
   link.scale.x=MathUtils.clamp(direction.length()/.046,1,3)
   link.rotation.y=-Math.atan2(direction.z,direction.x)
  },
  camera(camera,actor,officer,dt){
   aim.copy(actor.position).lerp(officer.pos,.36);aim.y+=1.17
   const sin=Math.sin(facing),cos=Math.cos(facing)
   for(const side of [1,-1]){
    eye.set(aim.x+side*cos*2.65-sin*.65,aim.y+.65,aim.z-side*sin*2.65-cos*.65)
    const fraction=cameraFraction(aim,eye,boxes)
    if(fraction>.45||side<0){eye.sub(aim).multiplyScalar(fraction).add(aim);break}
   }
   reach.copy(camera.position).lerp(eye,1-Math.exp(-8*dt))
   // The incoming camera can be on the other side of a wall.
   camera.position.copy(cameraFraction(aim,reach,boxes)>.95?reach:eye)
   camera.lookAt(aim)
  },
  update(hold){
   if(!hold.officer)cuffs.visible=false
   if(opacity!==hold.opacity){opacity=hold.opacity;overlay.style.setProperty('--custody-fade',opacity)}
   const label=hold.stage==='sentence'?'유치장 · 석방까지 '+hold.remaining+'초':
    hold.stage==='arrest'||hold.stage==='transfer'?'항만 경찰 · 체포 중':''
   if(status.textContent!==label){status.textContent=label;status.hidden=!label}
  }
 }
}
