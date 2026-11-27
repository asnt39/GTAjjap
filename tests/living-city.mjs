// Exercise real skinned hand positions in Node. The only substitutes are image decoding and file transport.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {Box3,PerspectiveCamera,Scene,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {createCharacter} from '../src/character.js'
import {createResidents} from '../src/residents.js'
import {fighter,swing,advance,revive,injure,combatPose,contact} from '../src/melee.js'
globalThis.self=globalThis
TextureLoader.prototype.load=function(url,onLoad){const t=new Texture();queueMicrotask(()=>onLoad(t));return t}
const requests=[]
GLTFLoader.prototype.loadAsync=async function(url){
 requests.push(url);const b=await readFile(new URL('../public'+url,import.meta.url))
 return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')
}
const scene=new Scene(),camera=new PerspectiveCamera(65,1,.1,200)
camera.position.set(-7,2,30);camera.lookAt(-7,1,21);camera.updateMatrixWorld()
const car={x:4.92,z:12,width:2.02,length:4.15,heading:0,speed:0}
const rig=await createCharacter(),crowd=await createResidents(scene,[],car)
assert.equal(new Set(requests).size,4);assert.equal(requests.length,4);assert.equal(crowd.all.filter(n=>!n.officer).length,32);assert.equal(crowd.officers.length,9)
assert.equal(crowd.officers.filter(n=>n.model==='patrol').length,3)
for(const npc of crowd.all){
 const hand=new Vector3()
 for(const speed of [0,1.85,5.2]){
  npc.rig.update(.25,speed)
  npc.rig.handPosition(1,hand)
  assert(Number.isFinite(hand.y)&&hand.y>.4&&hand.y<2)
  const bounds=new Box3().setFromObject(npc.rig.root,true)
  assert(bounds.min.y>-.15&&bounds.max.y>1.48&&bounds.max.y<2.15,npc.name)
 }
}
assert.equal(new Set(crowd.all.map(n=>n.name)).size,41)
assert(crowd.all.every(n=>/^[A-Za-z]+( [A-Za-z]+)*$/.test(n.name)))
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
strike(foreman,2.5);assert.equal(foreman.f.hp,108)
strike(foreman,.86);assert.equal(foreman.f.hp,84)
const hp=foreman.f.hp;assert(!crowd.receive(foreman,player.pos,'body',player.pos));assert.equal(hp,foreman.f.hp)
tick(120);assert(player.f.hp<100,'counter should connect')
const clerk=crowd.all[1],before=clerk.pos.clone();strike(clerk,.86);tick(120)
assert.equal(clerk.state,'flee');assert(clerk.pos.distanceTo(before)>.4)
for(let i=0;i<4;i++){advance(foreman.f,.55);foreman.f.immune=0;crowd.receive(foreman,player.pos,'upper',player.pos)}
assert.equal(foreman.f.action,'down');assert(!swing(foreman.f))
camera.position.set(20,2,20);camera.lookAt(25,2,25);camera.updateMatrixWorld();player.pos.set(18,0,20);tick(1200)
assert(foreman.f.hp>0);assert.notEqual(foreman.f.action,'down')
console.log('Forty-one resident rigs, four shared assets, dialogue, hand reach, immunity, counter, escape and offscreen recovery passed.')

// All eight officers use compatible Rocketbox rigs and have independent health.
const officer=crowd.officers[0]
assert.equal(officer.f.maxHealth,132)
assert.equal(crowd.officers.find(n=>n.station).f.maxHealth,144)
for(let i=0;i<6;i++){
 advance(officer.f,.55)
 const before=officer.f.hp
 assert(crowd.receive(officer,player.pos,'body',officer.pos))
 assert.equal(officer.f.hp,Math.max(0,before-24))
}
assert.equal(officer.f.action,'down')
crowd.wanted.clear()
// The existing pursuit caps the chase team even with several officers nearby.
const pursuit=await createResidents(new Scene(),[],car)
const chasePlayer={pos:new Vector3(7,0,25),f:fighter(100),available:true}
pursuit.wanted.report(chasePlayer.pos,3)
for(let i=0;i<36;i++)pursuit.update(1/60,camera,chasePlayer,()=>false)
assert.equal(pursuit.officers.filter(n=>n.state==='guard').length,2)
for(let i=0;i<60;i++){
 pursuit.update(1/60,camera,chasePlayer,()=>false)
 assert(pursuit.officers.filter(n=>n.state==='guard').length<=2)
}
pursuit.wanted.clear()
pursuit.update(1/60,camera,chasePlayer,()=>false)
assert.equal(pursuit.wanted.level,0)

const recovering=fighter(100)
assert(swing(recovering))
assert(injure(recovering,16,1,'body',{responseWindow:.65}))
advance(recovering,.31)
assert(!swing(recovering,undefined,{bufferHit:true}))
assert(recovering.queued)
for(let i=0;i<35;i++){
 advance(recovering,.02)
 assert(!injure(recovering,16,1,'body',{responseWindow:.65}))
 if(i===8)assert.equal(recovering.action,'punch')
}
assert.equal(recovering.hp,84)
assert.equal(recovering.action,'')

// Same skinned punch contact, distance and damage for the old and new health values.
function stationaryFight(maxHealth){
 const attacker=fighter(100)
 const target={pos:new Vector3(0,0,.86),f:fighter(maxHealth),height:1.8}
 let landed=0
 rig.root.position.set(0,0,0)
 for(let frame=1;frame<=480;frame++){
  advance(attacker,1/60);advance(target.f,1/60)
  if(!attacker.action)swing(attacker)
  rig.update(1/60,0,combatPose(attacker))
  contact(attacker,rig,rig.root.position,[target],()=>true,(_target,zone)=>{
   if(injure(target.f,24,1,zone))landed++
  })
  if(!target.f.hp)return {landed,seconds:frame/60}
 }
 assert.fail('The skinned punches must finish the stationary fight')
}
const oldCivilian=stationaryFight(64),newCivilian=stationaryFight(108)
const oldOfficer=stationaryFight(84),newOfficer=stationaryFight(132)
assert.deepEqual([oldCivilian.landed,newCivilian.landed,oldOfficer.landed,newOfficer.landed],[3,5,4,6])
assert(newCivilian.seconds<4&&newOfficer.seconds<5)
console.log('Stationary combat at 60 Hz:',{oldCivilian,newCivilian,oldOfficer,newOfficer})
