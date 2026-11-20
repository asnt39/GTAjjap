import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PerspectiveCamera,Scene,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {createLoadout,gear} from '../src/equipment.js'
import {equipmentTrace} from '../src/equipment-contact.js'
import {equipmentPlay} from '../src/equipment-play.js'
import {createCharacter} from '../src/character.js'
import {createResidents} from '../src/residents.js'
import {fighter,advance} from '../src/melee.js'

const values=new Map([['harborline.runMode.v3','hold']])
const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}
const bag=createLoadout(storage)
assert.equal(bag.selected,'fists')
assert(bag.select('pistol'))
assert(bag.use());assert(!bag.use())
bag.tick(.35);assert(bag.use());assert(bag.reload());assert(!bag.use())
bag.tick(.4);bag.select('bat');bag.tick(2)
assert.equal(bag.items.pistol.mag,6,'switch cancels reload')
bag.select('pistol');bag.reload();bag.tick(2)
assert.deepEqual(bag.item,{mag:8,reserve:30})
assert.deepEqual(createLoadout(storage).item,bag.item)
assert.equal(values.get('harborline.runMode.v3'),'hold')
assert(!bag.select('__proto__'));bag.resupply();assert.equal(bag.item.reserve,32)

const origin=new Vector3(0,1.25,0),forward=new Vector3(0,0,1)
const npc={pos:new Vector3(0,0,5),height:1.8,f:fighter(100)}
assert.equal(equipmentTrace([],[],[npc])(origin,forward,10).target,npc)
assert.equal(equipmentTrace([[-1,1,2,2.2,2]],[],[npc])(origin,forward,10).target,null)
assert.equal(equipmentTrace([[-1,1,2,2.2,.7]],[],[npc])(origin,forward,10).target,npc)
const car={x:0,z:2,heading:.6,width:2,length:4,height:1.8}
assert(equipmentTrace([],[car],[npc])(origin,forward,10).blocked)
assert(equipmentTrace([],[],[])(new Vector3(-47,2,-51),new Vector3(0,1,0),5).blocked)

// Exercise the actual GLBs, skeleton, game contact integrator and resident HP.
// Node substitutes only file transport and image decoding.
globalThis.self=globalThis
TextureLoader.prototype.load=function(url,onLoad){const t=new Texture();queueMicrotask(()=>onLoad(t));return t}
GLTFLoader.prototype.loadAsync=async function(url){
 const b=await readFile(new URL('../public'+url,import.meta.url))
 return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')
}
const scene=new Scene(),camera=new PerspectiveCamera(58,1,.08,100)
const char=await createCharacter();scene.add(char.root)
const crowd=await createResidents(scene,[],{x:90,z:90,width:2,length:4,heading:0})
for(const [i,n] of crowd.all.entries())n.pos.set(22+i*2,0,25)
const target=crowd.all[0],officer=crowd.officers[0],witness=crowd.all[1]
officer.pos.set(4,0,2);witness.pos.set(-3,0,4)
const player={pos:char.root.position,f:fighter(100)}
const loadout=createLoadout(),shots=[],hits=[],messages=[]
const sim=equipmentPlay({scene,camera,char,boxes:[],fleet:[],crowd,player,loadout,onHit:n=>hits.push(n),onShot:id=>shots.push(id),toast:m=>messages.push(m)})
function frame(){
 char.update(1/60,0);advance(target.f,1/60)
 sim.update(1/60,{active:true,aiming:true,speed:0,pitch:0})
}
async function prepare(id){
 loadout.select(id);frame()
 for(let i=0;i<15;i++){await new Promise(r=>setTimeout(r,10));frame()}
}
camera.position.set(.2,1.55,-3);camera.lookAt(0,1.3,4);camera.updateMatrixWorld()
target.pos.set(0,0,4)
await prepare('pistol');sim.attack();frame()
assert.equal(shots[0],'pistol',messages.join(' '))
assert.equal(target.f.hp,target.f.maxHealth-gear.pistol.damage);assert.equal(witness.state,'flee');assert.equal(crowd.wanted.level,1)
for(let i=0;i<60;i++)frame()
await prepare('shotgun');sim.attack();frame()
assert.equal(shots[1],'shotgun');assert(target.f.hp<target.f.maxHealth-gear.pistol.damage)
for(let i=0;i<65;i++)frame()
target.pos.set(0,0,.86)
await prepare('bat');const before=target.f.hp;sim.attack()
for(let i=0;i<55;i++)frame()
assert.equal(target.f.hp,Math.max(0,before-gear.bat.damage),'one contact on the rendered bat swing')
assert.equal(hits.length,3)
console.log('Inventory, ammo, interruption, persistence, cover, car, ceiling, real character poses and all three weapons, resident reactions and wanted response passed.')

// An input interrupted before its simulation frame cannot consume a round.
loadout.select('pistol')
frame()
const remaining=loadout.item.mag
sim.attack();loadout.select('fists');frame()
assert.equal(loadout.items.pistol.mag,remaining)
assert.equal(shots.length,2)
