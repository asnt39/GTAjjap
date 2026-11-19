import {AnimationMixer,Group,MathUtils} from 'three'
import {characterPose} from './character-motion.js'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'

export async function createCharacter(){
 const {scene,animations}=await new GLTFLoader().loadAsync('/assets/character/harbor-resident.glb')
 const root=new Group()
 root.add(scene)
 scene.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false}})
 const mixer=new AnimationMixer(scene)
 const actions=Object.fromEntries(animations.map(clip=>[clip.name,mixer.clipAction(clip)]))
 for(const [name,action] of Object.entries(actions)){action.play();action.setEffectiveWeight(name==='Idle'?1:0)}
 mixer.update(0)
 const layer=characterPose(scene)
 return {root,update(dt,speed,pose={}){
  layer.reset()
  const phase=pose.jump==null?null:MathUtils.clamp(pose.jump,0,1)
  const landing=MathUtils.clamp(pose.land||0,0,1)
  const ground=phase==null?1:1-Math.sin(Math.PI*phase)
  const walkAmount=ground*MathUtils.smoothstep(speed,.03,.95),run=MathUtils.smoothstep(speed,2.15,4.55)
  actions.Idle.setEffectiveWeight(1-walkAmount);actions.Walk.setEffectiveWeight(walkAmount*(1-run));actions.Run.setEffectiveWeight(run)
  actions.Walk.timeScale=MathUtils.clamp(speed/1.65,.65,1.45);actions.Run.timeScale=MathUtils.clamp(speed/4.65,.8,1.48)
  mixer.update(dt)
  layer.jump(phase,landing)
  scene.position.y=-.082*landing*landing
 }}
}
