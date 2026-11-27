import {AnimationMixer,Group,MathUtils} from 'three'
import {clone} from 'three/addons/utils/SkeletonUtils.js'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {characterPose} from './character-motion.js'
import {applyWardrobe} from './resident-wardrobe.js'

const modelFiles = {resident:'harbor-resident.glb',crew:'harbor-crew.glb',mariner:'harbor-mariner.glb',patrol:'harbor-patrol.glb'}
const models = new Map()

function loadModel(model) {
 if (!models.has(model)) models.set(model,new GLTFLoader().loadAsync('/assets/character/'+modelFiles[model]))
 return models.get(model)
}
export async function createCharacter({variant,model='resident'}={}){
 let asset
 if(model==='patrol'){
  try{asset=await loadModel(model)}
  catch(error){console.warn('Patrol model unavailable',error);model='resident'}
 }
 asset??=await loadModel(model)
 // The patrol and resident share the Rocketbox adult male bind rig and bone names.
 const {animations}=model==='patrol'?await loadModel('resident'):asset
 const source=asset.scene
 const scene=clone(source),root=new Group(),posture=new Group()
 root.add(posture);posture.add(scene)
 if(model==='resident'&&variant!=null)applyWardrobe(scene,variant)
 scene.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false}})
 // The source GLBs split hair, body and clothes into separate draws. Reuse
 // one bone texture per equivalent bind pose within a resident, never across residents.
 const skeletons=[]
 scene.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return
  const skin=mesh.skeleton
  const shared=skeletons.find(active=>active.bones.length===skin.bones.length&&
   active.bones.every((bone,i)=>bone===skin.bones[i]&&active.boneInverses[i].equals(skin.boneInverses[i])))
  if(shared){mesh.skeleton=shared;skin.dispose()}
  else skeletons.push(skin)
 })
 const mixer=new AnimationMixer(scene)
 const actions=Object.fromEntries(animations.map(clip=>[clip.name,mixer.clipAction(clip)]))
 for(const [name,action] of Object.entries(actions)){action.play();action.setEffectiveWeight(name==='Idle'?1:0)}
 mixer.update(0)
 // Match the left-foot strike across the original walk and run clips.
 const runPhaseOffset=model==='crew'?.05:.14
 actions.Walk.paused=actions.Run.paused=true
 let guard=0,guardHold=0,gait=0,stride=0,lean=0,bank=0
 const layer=characterPose(scene)
 return {root,equipmentRig:layer.equipment,dispose(){mixer.stopAllAction();mixer.uncacheRoot(scene);skeletons.forEach(skin=>skin.dispose())},handPosition:layer.handPosition,update(dt,speed,pose={}){
  layer.reset()
  const phase=pose.jump==null?null:MathUtils.clamp(pose.jump,0,1)
  const landing=MathUtils.clamp(pose.land||0,0,1)
  const aimSpeed=Math.max(0,speed)
  stride=MathUtils.damp(stride,aimSpeed,22,dt)
  const airborne=phase==null?0:Math.sin(Math.PI*phase)
  const move=MathUtils.smoothstep(stride,.05,.9)*(1-.95*airborne)
  const run=MathUtils.smoothstep(stride,2,4.65)
  const cadence=Math.min(stride/MathUtils.lerp(1.42,2.55,run),2.68)
  const nextGait=gait+dt*cadence*(1-.85*airborne)
  if(aimSpeed>.5&&Math.floor(nextGait*2)>Math.floor(gait*2))pose.step?.()
  gait=nextGait%1
  actions.Walk.time=gait*actions.Walk.getClip().duration
  actions.Run.time=((gait+runPhaseOffset)%1)*actions.Run.getClip().duration
  actions.Idle.setEffectiveWeight(1-move)
  actions.Walk.setEffectiveWeight(move*(1-run))
  actions.Run.setEffectiveWeight(move*run)
  mixer.update(dt)
  const progress=MathUtils.clamp(pose.phase||0,0,1),side=pose.side<0?-1:1
  const reaction=pose.reaction
  const fall=pose.action==='down'?MathUtils.smootherstep(progress,0,.93):0
  const movingShape=pose.vehicle||pose.motorcycle||pose.action==='punch'||pose.action==='hit'||fall?0:1-airborne
  lean=MathUtils.damp(lean,movingShape*run*.14,11,dt)
  bank=MathUtils.damp(bank,movingShape*run*MathUtils.clamp((pose.turn||0)*.034,-.22,.22),12,dt)
  posture.rotation.set(-1.49*fall*(reaction?.front>.38?-1:1),0,(reaction?.lateral??side)*.27*fall)
  if(reaction&&pose.action==='hit'){
   const swing=Math.sin(Math.PI*Math.min(1,progress))
   layer.offset('Spine1','x',reaction.front*reaction.pitch*swing)
   layer.offset('Spine1','z',-reaction.lateral*reaction.pitch*swing)
  }
  // Apply travelling lean to the spine, keeping feet at their planted height.
  if(movingShape){
   layer.offset('Spine1','x',lean)
   layer.offset('Spine1','z',-bank)
   layer.offset('Neck','x',-lean*.52)
   layer.offset('Neck','z',bank*.46)
  }
  posture.position.set(0,-.082*landing*landing+.21*fall,.51*fall)
  layer.jump(phase,landing)
  if(pose.city){
   const {spot,weight}=pose.city
   if(spot.pose==='sit'){
    posture.position.y+=(spot.seatY-.96)*weight
    for(const leg of ['L','R']){
     layer.offset(leg+' Thigh','x',-1.50*weight)
     layer.offset(leg+' Calf','x',1.58*weight)
    }
    layer.offset('Spine1','x',.17*weight)
   }else if(spot.pose==='rest'){
    layer.offset('Spine1','x',.28*weight)
    layer.offset('Head','x',.26*weight)
   }else layer.consume(weight,spot.pose)
  }
  guardHold=pose.action==='punch'?.7:Math.max(0,guardHold-dt)
  const guarding=!pose.vehicle&&!pose.motorcycle&&(pose.guard||pose.action==='guard'||guardHold>0)
  guard=MathUtils.damp(guard,guarding?1:0,12,dt)
  if(pose.action==='punch')layer.gesture('punch',progress,side,pose.zone,guard)
  else if(pose.action&&pose.action!=='guard')layer.gesture(pose.action,progress,side,pose.zone)
  else if(!pose.vehicle&&!pose.motorcycle&&guard>.015)layer.gesture('guard',guard*.2*(1-.7*airborne),side,pose.zone,0,run)
  if(pose.vehicle)layer.vehicle(pose.vehicle)
  if(pose.motorcycle){
   const riderLean=.53*pose.motorcycle.seated
   posture.rotation.x+=riderLean
   // Rotate about the seated pelvis, so a forward reach does not slide on the seat.
   posture.position.y+=.88*(1-Math.cos(riderLean))
   posture.position.z-=.88*Math.sin(riderLean)
   layer.motorcycle(pose.motorcycle)
  }
  if(pose.marineSeat){
   const w=pose.marineSeat
   layer.offset('Spine1','x',.18*w)
   for(const leg of ['L','R']){
    layer.offset(leg+' Thigh','x',-1.39*w);layer.offset(leg+' Calf','x',1.51*w)
    layer.offset(leg+' UpperArm','x',-.73*w);layer.offset(leg+' Forearm','x',-.56*w)
   }
  }
  if(pose.swim){
   const {phase,dive,motion}=pose.swim
   posture.rotation.x=1.04+.41*Math.max(dive,motion)
   posture.position.y+=.88*(1-Math.cos(posture.rotation.x))-.20*(1-motion)
   posture.position.z-=.88*Math.sin(posture.rotation.x)
   layer.offset('Neck','x',-.43*(1-dive))
   for(const [i,limb] of ['L','R'].entries()){
    const stroke=Math.sin(phase*Math.PI+i*Math.PI)
    layer.offset(limb+' UpperArm','x',-.66-.95*stroke*motion)
    layer.offset(limb+' UpperArm','z',(i===0?-1:1)*(.19+.41*(1-Math.abs(stroke))))
    layer.offset(limb+' Forearm','x',-.23-.64*Math.max(0,stroke))
    layer.offset(limb+' Thigh','x',.27*Math.sin(phase*5+i*Math.PI))
    layer.offset(limb+' Calf','x',.23+.26*Math.max(0,-stroke))
   }
  }
  if(pose.custody)layer.custody(pose.custody)
  if(pose.nod){
   layer.offset('Head','x',.17*pose.nod)
   layer.offset('Spine1','x',.035*pose.nod)
  }
  if(pose.look)layer.offset('Neck','y',MathUtils.clamp(pose.look,-.53,.53))
 }}
}
