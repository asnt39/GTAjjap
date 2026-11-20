// Exercise real skinned hand positions in Node. The only substitutes are image decoding and file transport.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PerspectiveCamera,Scene,Texture,TextureLoader} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {createCharacter} from '../src/character.js'
import {createResidents} from '../src/residents.js'
import {fighter,swing,advance,revive,injure,combatPose,contact} from '../src/melee.js'
globalThis.self=globalThis
TextureLoader.prototype.load=function(url,onLoad){const t=new Texture();queueMicrotask(()=>onLoad(t));return t}
let requests=0
GLTFLoader.prototype.loadAsync=async function(){
 requests++;const b=await readFile(new URL('../public/assets/character/harbor-resident.glb',import.meta.url))
 return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')
}
const scene=new Scene(),camera=new PerspectiveCamera(65,1,.1,200)
camera.position.set(-7,2,30);camera.lookAt(-7,1,21);camera.updateMatrixWorld()
const car={x:4.92,z:12,width:2.02,length:4.15,heading:0,speed:0}
const rig=await createCharacter(),crowd=await createResidents(scene,[],car)
assert.equal(requests,1);assert.equal(crowd.all.filter(n=>!n.officer).length,6);assert.equal(crowd.officers.length,2)
scene.add(rig.root)
const player={pos:rig.root.position,f:fighter(100),height:1.8,available:true}
function tick(n){
 for(let i=0;i<n;i++){advance(player.f,1/60);crowd.update(1/60,camera,player,(_n,zone)=>injure(player.f,16,1,zone))}
}
function strike(n,range){
 player.pos.set(n.pos.x,0,n.pos.z-range);revive(player.f);player.f.immune=0;swing(player.f)
 for(let i=0;i<36;i++){
  advance(player.f,1/60);rig.update(1/60,0,combatPose(player.f))
  contact(player.f,rig,player.pos,[n],crowd.lineClear,(v,zone,point)=>crowd.receive(v,player.pos,zone,point))
 }
}
const foreman=crowd.all[0];player.pos.set(foreman.x,0,foreman.z-.9)
crowd.beginTalk(crowd.candidate(player.pos));assert(crowd.dialogue.text);crowd.endTalk()
strike(foreman,2.5);assert.equal(foreman.f.hp,64)
strike(foreman,.86);assert.equal(foreman.f.hp,40)
const hp=foreman.f.hp;assert(!crowd.receive(foreman,player.pos,'body',player.pos));assert.equal(hp,foreman.f.hp)
tick(120);assert(player.f.hp<100,'counter should connect')
const clerk=crowd.all[1],before=clerk.pos.clone();strike(clerk,.86);tick(120)
assert.equal(clerk.state,'flee');assert(clerk.pos.distanceTo(before)>.4)
for(let i=0;i<4;i++){foreman.f.immune=0;crowd.receive(foreman,player.pos,'upper',player.pos)}
assert.equal(foreman.f.action,'down');assert(!swing(foreman.f))
camera.position.set(20,2,20);camera.lookAt(25,2,25);camera.updateMatrixWorld();player.pos.set(18,0,20);tick(1200)
assert(foreman.f.hp>0);assert.notEqual(foreman.f.action,'down')
console.log('Eight resident rigs, one asset load, dialogue, hand reach, immunity, counter, escape and offscreen recovery passed.')
