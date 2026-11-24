import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {Group,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {createCharacter} from '../src/character.js'
import {uprightRider} from '../src/rider-pose.js'

globalThis.self=globalThis
TextureLoader.prototype.load=function(_,done){const texture=new Texture();queueMicrotask(()=>done(texture));return texture}
GLTFLoader.prototype.loadAsync=async function(url){
 const bytes=await readFile(new URL('../public'+url,import.meta.url))
 return this.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')
}
const actor=new Group(),character=await createCharacter(),hand=new Vector3()
actor.add(character.root)
character.update(0,0)
const wrist=character.handPosition(-1,hand).clone()
const rig={gripPosition(side,out){return out.set(.4*side,1.2,.5)},pegPosition(side,out){return out.set(.3*side,.4,.12)}}
for(let i=0;i<8;i++){
 actor.rotation.set(.18,.58,-.34)
 character.root.position.y=-.28
 character.update(0,0,{motorcycle:{seated:1,rig}})
 assert.notEqual(actor.rotation.z,0)
 uprightRider(actor,character,0)
 assert.deepEqual(actor.rotation.toArray(),[0,0,0,'XYZ'])
 assert.equal(character.root.position.y,0)
 assert(character.handPosition(-1,hand).distanceTo(wrist)<.001)
}
