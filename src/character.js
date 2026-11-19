import {AnimationMixer,Group,MathUtils} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'

export async function createCharacter(){
 const {scene,animations}=await new GLTFLoader().loadAsync('/assets/character/harbor-resident.glb')
 const root=new Group()
 root.add(scene)
 scene.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false}})
 const mixer=new AnimationMixer(scene)
 const actions=Object.fromEntries(animations.map(clip=>[clip.name,mixer.clipAction(clip)]))
 for(const [name,action] of Object.entries(actions)){action.play();action.setEffectiveWeight(name==='Idle'?1:0)}
 return {root,update(dt,speed){
  const walkAmount=MathUtils.smoothstep(speed,.03,.95),run=MathUtils.smoothstep(speed,2.15,4.55)
  actions.Idle.setEffectiveWeight(1-walkAmount);actions.Walk.setEffectiveWeight(walkAmount*(1-run));actions.Run.setEffectiveWeight(run)
  actions.Walk.timeScale=MathUtils.clamp(speed/1.65,.65,1.45);actions.Run.timeScale=MathUtils.clamp(speed/4.65,.8,1.12)
  mixer.update(dt)
 }}
}
