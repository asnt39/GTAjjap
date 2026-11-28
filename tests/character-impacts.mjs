import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import {Group,Scene,ShaderLib,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {createCharacter} from '../src/character.js'
import {combatPose,fighter,injure} from '../src/melee.js'
import {impulse} from '../src/impact-motion.js'
import {worldEffects} from '../src/world-effects.js'

globalThis.self=globalThis
TextureLoader.prototype.load=function(_,done){
 const texture=new Texture()
 queueMicrotask(()=>done(texture))
 return texture
}
GLTFLoader.prototype.loadAsync=async function(url){
 const bytes=await readFile(new URL('../public'+url,import.meta.url))
 return this.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')
}

const surfaceMesh=(root,name)=>root.getObjectsByProperty('isSkinnedMesh',true).find(mesh=>mesh.material.name===name)
const compile=material=>{
 const shader={...ShaderLib.standard,uniforms:{}}
 material.onBeforeCompile(shader)
 return shader
}

test('impacts accumulate on the rig surface with no extra draw and clear independently of a shared outfit',async()=>{
 const avatar=await createCharacter({variant:2}),bystander=await createCharacter({variant:2})
 const parent=new Group()
 parent.add(avatar.root)
 parent.position.set(11,3,17)
 parent.rotation.y=Math.PI/2
 const coat=surfaceMesh(avatar.root,'Canvas jacket, shirt and denim')
 const neighborCoat=surfaceMesh(bystander.root,'Canvas jacket, shirt and denim')
 const face=surfaceMesh(avatar.root,'Skin')
 const originalCoat=coat.material,originalFace=face.material,partCount=avatar.root.getObjectsByProperty('isMesh',true).length
 assert.equal(coat.material,neighborCoat.material)
 const front={point:new Vector3(11,4.25,17),source:new Vector3(13,4.25,17),kind:'shot',strength:24}
 const surface=avatar.markImpact(front)
 assert(surface.point.x>11.05&&surface.direction.x>.75,'contact is on the source-facing garment surface')
 assert.notEqual(coat.material,originalCoat)
 assert.equal(neighborCoat.material,originalCoat)
 assert.equal(face.material,originalFace)
 const shader=compile(coat.material)
 assert(shader.uniforms.jacketTint,'the wardrobe shader still runs')
 assert(shader.vertexShader.includes('harborStainPosition = position'))
 assert.equal(shader.uniforms.harborStainCount.value,1)
 const first=shader.uniforms.harborStains.value[0].clone()
 const back=avatar.markImpact({...front,source:new Vector3(9,4.25,17)})
 assert(back.point.x<10.95&&back.direction.x<-.75)
 assert.equal(shader.uniforms.harborStainCount.value,2)
 assert(shader.uniforms.harborStains.value[1].clone().sub(first).length()>.16)
 avatar.update(.2,4,{jump:.45})
 assert.deepEqual(shader.uniforms.harborStains.value[0],first)
 assert.equal(avatar.root.getObjectsByProperty('isMesh',true).length,partCount)
 avatar.update(0,0)
 const upper=avatar.markImpact({source:new Vector3(13,4.63,17),zone:'upper',strength:16})
 assert(upper.point.y>4.53,'a missing head hit point falls back to the posed head')
 assert.notEqual(face.material,originalFace)
 for(let i=0;i<22;i++)avatar.markImpact({...front,strength:20+i%8})
 assert.equal(shader.uniforms.harborStainCount.value,6)
 assert.equal(face.material,originalFace,'the oldest mark is released across materials')
 let disposed=0
 coat.material.addEventListener('dispose',()=>disposed++)
 avatar.clearImpacts()
 assert.equal(disposed,1)
 assert.equal(coat.material,originalCoat)
 assert.equal(avatar.markImpact({...front,strength:0}),null)
 assert.equal(coat.material,originalCoat)
 avatar.markImpact(front)
 coat.material.addEventListener('dispose',()=>disposed++)
 avatar.dispose()
 assert.equal(disposed,2)
 assert.equal(coat.material,originalCoat)
 bystander.dispose()
})

test('character hit particles share the existing mobile budget and expire',()=>{
 const scene=new Scene(),effects=worldEffects(scene,{capacity:20})
 const effectPoints=scene.getObjectsByProperty('isPoints',true)[0]
 const surface={point:new Vector3(4,1.2,3),direction:new Vector3(1,0,0)}
 const strike=()=>effects.characterImpact(surface,'shot',30)
 strike()
 effects.update(.016,700)
 const standard=effectPoints.geometry.drawRange.count
 assert(standard>1&&standard<=12)
 effects.update(.5,700);effects.update(.016,700)
 assert(!effectPoints.visible)
 effects.setLowDetail(true)
 strike()
 effects.update(.016,700)
 assert(effectPoints.geometry.drawRange.count<standard)
 for(let i=0;i<20;i++)strike()
 effects.update(.016,700)
 assert(effectPoints.geometry.drawRange.count<=8)
 effects.update(.5,700);effects.update(.016,700)
 assert(!effectPoints.visible)
 effects.characterImpact(null,'shot',30)
 effects.characterImpact(surface,'shot',0)
 effects.update(.016,700)
 assert(!effectPoints.visible)
})

test('shot and melee recoil use the hit direction and different amounts of upper-body motion',async()=>{
 const avatar=await createCharacter()
 const spine=avatar.root.getObjectByName('Bip01_Spine1')
 const sample=(kind,direction)=>{
  const state=fighter(100)
  injure(state,20,1,'body')
  impulse(state,kind,0,direction,20)
  state.elapsed=state.duration*.38
  avatar.update(0,0,combatPose(state))
  return spine.quaternion.clone()
 }
 const idle=spine.quaternion.clone()
 const front=sample('melee',-1),back=sample('melee',1),shot=sample('shot',-1)
 assert(front.angleTo(back)>front.angleTo(idle)*1.7)
 assert(shot.angleTo(idle)<front.angleTo(idle)*.65)
 avatar.dispose()
})
