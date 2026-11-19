import {AnimationMixer,Group,MathUtils} from 'three'
import {clone} from 'three/addons/utils/SkeletonUtils.js'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {characterPose} from './character-motion.js'
import {applyWardrobe} from './resident-wardrobe.js'

let resident
export async function createCharacter({variant}={}){
 resident??=new GLTFLoader().loadAsync('/assets/character/harbor-resident.glb')
 const {scene:source,animations}=await resident
 const scene=clone(source),root=new Group(),posture=new Group()
 root.add(posture);posture.add(scene)
 if(variant!=null)applyWardrobe(scene,variant)
 scene.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false}})
 const mixer=new AnimationMixer(scene)
 const actions=Object.fromEntries(animations.map(clip=>[clip.name,mixer.clipAction(clip)]))
 for(const [name,action] of Object.entries(actions)){action.play();action.setEffectiveWeight(name==='Idle'?1:0)}
 mixer.update(0)
 let guard=0
 const layer=characterPose(scene)
 return {root,dispose(){mixer.stopAllAction();mixer.uncacheRoot(scene);scene.traverse(m=>m.isSkinnedMesh&&m.skeleton.dispose())},handPosition:layer.handPosition,update(dt,speed,pose={}){
  layer.reset()
  const phase=pose.jump==null?null:MathUtils.clamp(pose.jump,0,1)
  const landing=MathUtils.clamp(pose.land||0,0,1)
  const ground=phase==null?1:1-Math.sin(Math.PI*phase)
  const walkAmount=ground*MathUtils.smoothstep(speed,.03,.95),run=MathUtils.smoothstep(speed,2.15,4.55)
  actions.Idle.setEffectiveWeight(1-walkAmount);actions.Walk.setEffectiveWeight(walkAmount*(1-run));actions.Run.setEffectiveWeight(run)
  actions.Walk.timeScale=MathUtils.clamp(speed/1.65,.65,1.45);actions.Run.timeScale=MathUtils.clamp(speed/4.65,.8,1.48)
  mixer.update(dt)
  const progress=MathUtils.clamp(pose.phase||0,0,1),side=pose.side<0?-1:1
  const fall=pose.action==='down'?MathUtils.smootherstep(progress,0,.93):0
  posture.rotation.set(-1.49*fall,0,side*.085*fall)
  posture.position.set(0,-.082*landing*landing+.21*fall,.51*fall)
  layer.jump(phase,landing)
  guard=MathUtils.damp(guard,pose.action==='guard'?1:0,9,dt)
  if(pose.action==='guard'||(!pose.action&&guard>.015))layer.gesture('guard',guard*.2,side)
  else layer.gesture(pose.action,progress,side,pose.zone)
  if(pose.vehicle)layer.vehicle(pose.vehicle)
  if(pose.look)layer.offset('Neck','y',MathUtils.clamp(pose.look,-.53,.53))
 }}
}
