import {MathUtils, Quaternion, Vector3} from 'three'

// Add offsets about the resident's standing body axes. The imported FBX rig
// has different local axes on each limb, including the two mirrored arms.
export function characterPose(scene){
 const byName=new Map(), touched=[],rotation=new Quaternion()
 scene.updateMatrixWorld(true)
 scene.traverse(bone=>{
  if(!bone.isBone)return
  const inverse=bone.getWorldQuaternion(new Quaternion()).invert()
  byName.set(bone.name.replace(/^Bip01_/,'').replaceAll('_',' '),{
   bone,base:new Quaternion(),active:false,
   x:new Vector3(1,0,0).applyQuaternion(inverse),
   y:new Vector3(0,1,0).applyQuaternion(inverse),
   z:new Vector3(0,0,1).applyQuaternion(inverse)
  })
 })
 function remember(joint){
  if(!joint.active){joint.base.copy(joint.bone.quaternion);joint.active=true;touched.push(joint)}
 }
 function offset(name,axis,angle){
  const joint=byName.get(name)
  if(!joint||Math.abs(angle)<1e-6)return
  remember(joint)
  joint.bone.quaternion.multiply(rotation.setFromAxisAngle(joint[axis],angle))
 }
 function reset(){
  for(const joint of touched){joint.bone.quaternion.copy(joint.base);joint.active=false}
  touched.length=0
 }
 function jump(phase,landing){
  const lift=phase==null?0:Math.sin(Math.PI*phase)
  const launch=phase==null?0:Math.sin(Math.PI*Math.min(1,phase/.26))
  const brace=landing*landing
  if(!lift&&!landing)return
  offset('Spine1','x',.12*lift+.095*launch+.20*brace)
  offset('Spine2','x',.045*lift+.08*brace)
  offset('Neck','x',-.10*lift-.10*landing)
  for(const [side,lead] of [['L',true],['R',false]]){
   offset(side+' Thigh','x',-(lead?.94:.56)*lift-.42*landing)
   offset(side+' Calf','x',(lead?1.40:1.25)*lift+.85*landing)
   offset(side+' Foot','x',-.31*lift-.44*landing)
   offset(side+' UpperArm','x',-(lead?.42:.84)*lift-.19*launch-.16*landing)
   offset(side+' UpperArm','z',(lead?1:-1)*(.25*lift+.23*landing))
   offset(side+' Forearm','x',-.42*lift)
  }
 }
 // Aim two linked bones at a game-space wrist target. Each quaternion is
 // solved against the current mixer pose; the next update restores that pose.
 const from=new Vector3(),to=new Vector3(),start=new Vector3(),middle=new Vector3()
 const end=new Vector3(),direction=new Vector3(),pole=new Vector3(),bend=new Vector3()
 const custodyTarget=new Vector3()
 const target=new Vector3(),hint=new Vector3(),delta=new Quaternion(),parentQ=new Quaternion(),inverseParent=new Quaternion()
 const legs=['R','L'].map(short=>({
  upper:byName.get(short+' Thigh'),lower:byName.get(short+' Calf'),end:byName.get(short+' Foot')
 }))
 const arms=['R','L'].map(short=>({
  upper:byName.get(short+' UpperArm'), lower:byName.get(short+' Forearm'),
  hand:byName.get(short+' Hand'), knuckle:byName.get(short+' Finger2')
 }))
 function aim(joint,child,destination,weight){
  joint.bone.getWorldPosition(start)
  child.bone.getWorldPosition(from).sub(start).normalize()
  to.copy(destination).sub(start).normalize()
  delta.setFromUnitVectors(from,to)
  joint.bone.parent.getWorldQuaternion(parentQ)
  delta.premultiply(inverseParent.copy(parentQ).invert()).multiply(parentQ).multiply(joint.bone.quaternion)
  remember(joint)
  joint.bone.quaternion.slerp(delta,weight)
 }
 function placeLimb(upper,lower,tip,weight){
  upper.bone.getWorldPosition(start)
  lower.bone.getWorldPosition(middle)
  tip.bone.getWorldPosition(end)
  const a=start.distanceTo(middle),b=middle.distanceTo(end)
  direction.subVectors(target,start)
  const d=Math.max(Math.abs(a-b)+.001,Math.min(a+b-.003,direction.length()))
  direction.normalize()
  pole.subVectors(hint,start).addScaledVector(direction,-pole.dot(direction)).normalize()
  const along=(a*a-b*b+d*d)/(2*d)
  bend.copy(start).addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,a*a-along*along)))
  target.copy(start).addScaledVector(direction,d)
  aim(upper,lower,bend,weight)
  aim(lower,tip,target,weight)
 }
 function placeArm(sign,x,y,z,weight){
  const arm=arms[sign>0?1:0]
  scene.localToWorld(target.set(x,y,z))
  scene.localToWorld(hint.set(sign*.60,1.04,-.14))
  placeLimb(arm.upper,arm.lower,arm.hand,weight)
 }
 function curl(sign,weight){
  const prefix=sign>0?'L Finger':'R Finger'
  for(let digit=1;digit<=4;digit++){
   offset(prefix+digit,'z',-sign*.70*weight)
   offset(prefix+digit+'1','z',-sign*.86*weight)
   offset(prefix+digit+'2','z',-sign*.52*weight)
  }
 }
 function handPosition(side,out){return arms[side>0?1:0].knuckle.bone.getWorldPosition(out)}
 function orientHand(sign,worldRotation,weight=1){
  const joint=arms[sign>0?1:0].hand
  remember(joint)
  joint.bone.parent.getWorldQuaternion(parentQ)
  joint.bone.quaternion.slerp(parentQ.invert().multiply(worldRotation),weight)
 }
 function vehicle({side,crouch,reach}){
  offset('Spine','x',.38*crouch)
  offset('Spine1','x',.22*crouch)
  offset('Spine1','z',side*.19*crouch)
  offset('Neck','x',-.24*crouch)
  for(const [leg,amount] of [['L',side===1?1:.67],['R',side===-1?1:.67]]){
   offset(leg+' Thigh','x',-.91*crouch*amount)
   offset(leg+' Calf','x',1.53*crouch*amount)
   offset(leg+' Foot','x',-.38*crouch*amount)
  }
  if(reach>.001){placeArm(side,side*.20,.98,.61,reach);curl(side,reach*.7)}
 }
 function motorcycle({seated,rig}){
  offset('Spine','x',.25*seated)
  offset('Spine1','x',.16*seated)
  offset('Neck','x',-.16*seated)
  for(const side of [-1,1]){
   const i=side>0?1:0
   const arm=arms[i],leg=legs[i]
   rig.gripPosition(side,target)
   scene.localToWorld(hint.set(side*.60,1.04,-.14))
   placeLimb(arm.upper,arm.lower,arm.hand,seated)
   curl(side,.82*seated)
   rig.pegPosition(side,target)
   // Move the ankle above the footrest; the knee bends ahead of the peg.
   target.y+=.065
   scene.localToWorld(hint.set(side*.37,.62,.82))
   placeLimb(leg.upper,leg.lower,leg.end,seated)
  }
 }
 function custody({progress,wrist}){
  const turn=MathUtils.smoothstep(progress,.13,.55)
  if(wrist){
   const hands=scene.worldToLocal(custodyTarget.copy(wrist))
   offset('Spine1','x',.15*turn)
   const press=MathUtils.smoothstep(progress,.38,.72)
   placeArm(1,hands.x-.055,hands.y+.085,hands.z-.045,press)
   placeArm(-1,hands.x+.08,hands.y+.04,hands.z-.10,turn)
   return
  }
  offset('Spine','x',.12*turn);offset('Spine1','x',.09*turn)
  offset('Neck','x',.12*turn)
  const settle=MathUtils.smoothstep(progress,.38,.80)
  for(const sign of [-1,1]){
   const x=sign*MathUtils.lerp(.36,.117,settle)
   placeArm(sign,x,1.10-.07*settle,-.26-.085*(1-settle),turn)
   curl(sign,turn*.32)
  }
 }
 function gesture(action,p,side,zone,ready=0,run=0){
  if(!action)return
  if(action==='hit'){
   const recoil=Math.sin(Math.PI*Math.pow(p,.66))
   offset('Spine','z',-side*.20*recoil);offset('Spine1','x',-.33*recoil)
   offset('Neck','y',side*.25*recoil);offset('Head','x',(zone==='upper'?-.34:-.11)*recoil)
   for(const [limb,s] of [['L',1],['R',-1]]){
    offset(limb+' UpperArm','z',s*.39*recoil);offset(limb+' Forearm','x',-.48*recoil)
   }
   return
  }
  if(action==='down'){
   const fall=Math.min(1,p*1.35)
   offset('Spine1','x',.30*fall);offset('Neck','x',.18*fall)
   offset('L Thigh','x',-.47*fall);offset('L Calf','x',1.05*fall)
   offset('R Calf','x',.26*fall);offset('L UpperArm','z',.74*fall)
   offset('R UpperArm','z',-.39*fall);offset('R Forearm','x',-.54*fall)
   return
  }
  if(action!=='guard'&&action!=='punch')return
  const punch=action==='punch'
  const ramp=(a,b,value)=>{const f=Math.max(0,Math.min(1,(value-a)/(b-a)));return f*f*(3-2*f)}
  // The existing wrist trajectory and weight are intact through the contact window.
  const blendEdge=punch?1-ramp(.02,.20,p)+ramp(.79,1,p):0
  const guard=punch?Math.max(ready*blendEdge,ramp(0,.19,p)*(1-ramp(.76,1,p))):ramp(0,.20,p)
  const reach=punch?ramp(.17,.48,p)*(1-ramp(.51,.81,p)):0
  const draw=punch?Math.sin(Math.PI*Math.min(1,p/.30)):0
  offset('Pelvis','y',punch?side*.11*blendEdge*Math.sin(Math.PI*p):0)
  offset('Spine','y',side*(.17*draw-.36*reach))
  offset(side>0?'L Clavicle':'R Clavicle','y',punch?side*.16*blendEdge*Math.sin(Math.PI*p):0)
  offset('Spine1','y',-side*.16*reach);offset('Spine2','x',.17*reach+.06*guard)
  offset('Neck','y',side*.21*reach)
  const knees=guard*(1-.85*run)
  offset('L Thigh','x',-.11*knees);offset('L Calf','x',.22*knees)
  offset('R Thigh','x',-.09*knees);offset('R Calf','x',.18*knees)
  for(const sign of [-1,1]){
   const thrust=sign===side?reach:0,windup=sign===side?draw:0
   const x=sign*(.19-.09*thrust+.06*windup)
   placeArm(sign,x+sign*.055*run,1.36+.075*thrust+.035*windup-.19*run,.24+.72*thrust-.11*windup-.12*run,guard)
   curl(sign,guard)
  }
 }
 return {reset,jump,offset,gesture,vehicle,motorcycle,custody,handPosition,
  equipment:{placeArm,curl,orientHand,offset,hand:arms[0].hand?.bone,knuckle:arms[0].knuckle?.bone,
   supportHand:arms[1].hand?.bone,supportKnuckle:arms[1].knuckle?.bone}}
}
