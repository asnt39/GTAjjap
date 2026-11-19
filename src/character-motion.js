import {Quaternion, Vector3} from 'three'

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
 function offset(name,axis,angle){
  const joint=byName.get(name)
  if(!joint||Math.abs(angle)<1e-6)return
  if(!joint.active){joint.base.copy(joint.bone.quaternion);joint.active=true;touched.push(joint)}
  joint.bone.quaternion.multiply(rotation.setFromAxisAngle(joint[axis],angle))
 }
 function reset(){
  for(const joint of touched){joint.bone.quaternion.copy(joint.base);joint.active=false}
  touched.length=0
 }
 function jump(phase,landing){
  const lift=phase==null?0:Math.sin(Math.PI*phase)
  if(!lift&&!landing)return
  offset('Spine1','x',.12*lift+.16*landing)
  offset('Neck','x',-.10*lift-.10*landing)
  for(const [side,lead] of [['L',true],['R',false]]){
   offset(side+' Thigh','x',-(lead?.94:.56)*lift-.42*landing)
   offset(side+' Calf','x',(lead?1.40:1.25)*lift+.85*landing)
   offset(side+' Foot','x',-.31*lift-.44*landing)
   offset(side+' UpperArm','x',-(lead?.42:.84)*lift-.16*landing)
   offset(side+' UpperArm','z',(lead?1:-1)*(.25*lift+.23*landing))
   offset(side+' Forearm','x',-.42*lift)
  }
 }
 return {reset,jump,offset}
}
