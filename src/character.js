import {AnimationMixer,Group,MathUtils} from 'three'
import {clone} from 'three/addons/utils/SkeletonUtils.js'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {characterPose} from './character-motion.js'
import {applyWardrobe} from './resident-wardrobe.js'

const modelFiles = {resident:'harbor-resident.glb',crew:'harbor-crew.glb',mariner:'harbor-mariner.glb'}
const models = new Map()

function loadModel(model) {
 if (!models.has(model)) models.set(model,new GLTFLoader().loadAsync('/assets/character/'+modelFiles[model]))
 return models.get(model)
}
export async function createCharacter({variant,model='resident'}={}){
 const {scene:source,animations}=await loadModel(model)
 const scene=clone(source),root=new Group(),posture=new Group()
 root.add(posture);posture.add(scene)
 if(model==='resident'&&variant!=null)applyWardrobe(scene,variant)
 scene.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false}})
 const mixer=new AnimationMixer(scene)
 const actions=Object.fromEntries(animations.map(clip=>[clip.name,mixer.clipAction(clip)]))
 for(const [name,action] of Object.entries(actions)){action.play();action.setEffectiveWeight(name==='Idle'?1:0)}
 mixer.update(0)
 // Match the left-foot strike across the original walk and run clips.
 const runPhaseOffset=model==='crew'?.05:.14
 actions.Walk.paused=actions.Run.paused=true
 let guard=0,guardHold=0,gait=0,stride=0,lean=0,bank=0
 const layer=characterPose(scene)
 return {root,dispose(){mixer.stopAllAction();mixer.uncacheRoot(scene);scene.traverse(m=>m.isSkinnedMesh&&m.skeleton.dispose())},handPosition:layer.handPosition,update(dt,speed,pose={}){
  layer.reset()
  const phase=pose.jump==null?null:MathUtils.clamp(pose.jump,0,1)
  const landing=MathUtils.clamp(pose.land||0,0,1)
  const aimSpeed=Math.max(0,speed)
  stride=MathUtils.damp(stride,aimSpeed,22,dt)
  const airborne=phase==null?0:Math.sin(Math.PI*phase)
  const move=MathUtils.smoothstep(stride,.05,.9)*(1-.95*airborne)
  const run=MathUtils.smoothstep(stride,2,4.65)
  const cadence=Math.min(stride/MathUtils.lerp(1.42,2.55,run),2.68)
  gait=(gait+dt*cadence*(1-.85*airborne))%1
  actions.Walk.time=gait*actions.Walk.getClip().duration
  actions.Run.time=((gait+runPhaseOffset)%1)*actions.Run.getClip().duration
  actions.Idle.setEffectiveWeight(1-move)
  actions.Walk.setEffectiveWeight(move*(1-run))
  actions.Run.setEffectiveWeight(move*run)
  mixer.update(dt)
  const progress=MathUtils.clamp(pose.phase||0,0,1),side=pose.side<0?-1:1
  const fall=pose.action==='down'?MathUtils.smootherstep(progress,0,.93):0
  const movingShape=pose.vehicle||pose.action==='punch'||pose.action==='hit'||fall?0:1-airborne
  lean=MathUtils.damp(lean,movingShape*run*.14,11,dt)
  bank=MathUtils.damp(bank,movingShape*run*MathUtils.clamp((pose.turn||0)*.034,-.22,.22),12,dt)
  posture.rotation.set(-1.49*fall,0,side*.085*fall)
  // Apply travelling lean to the spine, keeping feet at their planted height.
  if(movingShape){
   layer.offset('Spine1','x',lean)
   layer.offset('Spine1','z',-bank)
   layer.offset('Neck','x',-lean*.52)
   layer.offset('Neck','z',bank*.46)
  }
  posture.position.set(0,-.082*landing*landing+.21*fall,.51*fall)
  layer.jump(phase,landing)
  guardHold=pose.action==='punch'?.7:Math.max(0,guardHold-dt)
  const guarding=!pose.vehicle&&(pose.guard||pose.action==='guard'||guardHold>0)
  guard=MathUtils.damp(guard,guarding?1:0,12,dt)
  if(pose.action==='punch')layer.gesture('punch',progress,side,pose.zone,guard)
  else if(pose.action&&pose.action!=='guard')layer.gesture(pose.action,progress,side,pose.zone)
  else if(!pose.vehicle&&guard>.015)layer.gesture('guard',guard*.2*(1-.7*airborne),side,pose.zone,0,run)
  if(pose.vehicle)layer.vehicle(pose.vehicle)
  if(pose.custody)layer.custody(pose.custody)
  if(pose.nod){
   layer.offset('Head','x',.17*pose.nod)
   layer.offset('Spine1','x',.035*pose.nod)
  }
  if(pose.look)layer.offset('Neck','y',MathUtils.clamp(pose.look,-.53,.53))
 }}
}
