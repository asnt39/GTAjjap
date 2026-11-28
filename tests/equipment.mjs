import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PerspectiveCamera,Scene,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {createLoadout,gear} from '../src/equipment.js'
import {scopeStance} from '../src/scope-stance.js'
import {policeFire} from '../src/police-fire.js'
import {equipmentTrace} from '../src/equipment-contact.js'
import {equipmentPlay} from '../src/equipment-play.js'
import {createCharacter} from '../src/character.js'
import {createResidents} from '../src/residents.js'
import {fighter,advance,injure} from '../src/melee.js'

const stock=Object.fromEntries(Object.entries(gear).map(([id,def])=>[id,{mag:def.capacity??0,reserve:def.stock??0}]))
const weaponSave=JSON.stringify({selected:'fists',items:stock})
const equippedFixture={getItem:()=>weaponSave}
const values=new Map([['harborline.runMode.v3','hold'],['harborline.equipment.v1',weaponSave]])
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
assert(!bag.select('__proto__'))

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
const loadout=createLoadout(equippedFixture),shots=[],hits=[],messages=[],traces=[]
const sim=equipmentPlay({scene,camera,char,boxes:[],fleet:[],crowd,player,loadout,effects:{trace:(a,b)=>traces.push(a.distanceTo(b)),muzzle(){},emit(){}},onHit:n=>hits.push(n),onShot:id=>shots.push(id),toast:m=>messages.push(m)})
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
assert(traces[0]>2&&traces[0]<5)
assert.equal(target.f.hp,target.f.maxHealth-gear.pistol.damage);assert.equal(witness.state,'flee');assert.equal(crowd.wanted.level,0)
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

// One clean close shot downs even a patrol officer; a distant hit barely hurts.
const nearOfficer=crowd.officers[1]
target.pos.set(40,0,40)
officer.pos.set(35,0,38)
witness.pos.set(-12,0,12)
nearOfficer.pos.set(0,0,1.9)
camera.lookAt(0,1.30,1.9);camera.updateMatrixWorld()
await prepare('shotgun')
sim.attack();frame()
assert.equal(nearOfficer.f.hp,0)
assert.equal(crowd.wanted.level,3)
for(let i=0;i<62;i++)frame()
target.pos.set(0,0,16)
target.f=fighter(target.f.maxHealth)
camera.lookAt(0,1.30,16);camera.updateMatrixWorld()
const farHealth=target.f.hp
sim.attack();frame()
assert(farHealth-target.f.hp>0&&farHealth-target.f.hp<8)
console.log('Close shotgun one-shot, distant falloff and immediate hits with cosmetic tracers passed.')

const cover=[[-28,28,2.4,2.8,4]]
const patrolCrowd=await createResidents(scene,cover,{x:90,z:90,width:2,length:4,heading:0})
for(const [i,n] of patrolCrowd.all.entries())n.pos.set(39+i,0,52)
const [casualty,shooter]=patrolCrowd.officers
casualty.pos.set(-1,0,7)
shooter.pos.set(0,0,5);shooter.face=Math.PI
player.available=player.exposed=true
const fired=[]
const updatePolice=()=>patrolCrowd.update(1/30,camera,player,()=>{},()=>{},(npc,from,to)=>fired.push({npc,from:from.clone(),to:to.clone()}))
patrolCrowd.receive(casualty,player.pos,'body',casualty.pos,20)
for(let i=0;i<25;i++)updatePolice()
assert.equal(fired.length,0)
patrolCrowd.receive(casualty,player.pos,'body',casualty.pos,200)
assert.equal(patrolCrowd.wanted.level,3)
for(let i=0;i<30;i++)updatePolice()
assert.equal(fired.length,0,'cover blocks retaliation')
cover.pop()
for(let i=0;i<85&&!fired.length;i++){updatePolice();await new Promise(resolve=>setTimeout(resolve,4))}
assert.equal(fired[0]?.npc,shooter)
assert(fired[0].to.distanceTo(new Vector3(0,1.28,0))<.01)
patrolCrowd.wanted.clear()
const count=fired.length
for(let i=0;i<60;i++)updatePolice()
assert.equal(fired.length,count)
console.log('A surviving officer returns fire after a casualty, respects live cover and stops when wanted clears.')

assert.equal(bag.addReserve('shotgun',4),0)
bag.select('shotgun')
assert.equal(bag.reserveSpace('shotgun'),0)
bag.items.shotgun.reserve=14
assert.equal(bag.addReserve('shotgun',4),2)
assert.equal(createLoadout(storage).items.shotgun.reserve,16)
const shielded=fighter(100)
shielded.armor=35
assert(injure(shielded,18,1,'body'))
assert.equal(shielded.hp,100)
assert.equal(shielded.armor,17)
assert(!injure(shielded,18,1,'body'))
assert.equal(shielded.armor,17)
advance(shielded,1)
assert(injure(shielded,18,1,'body'))
assert.equal(shielded.hp,99)
assert.equal(shielded.armor,0)

const rifle=createLoadout(equippedFixture)
assert(rifle.select('sniper'))
assert.equal(rifle.def.range,Infinity)
assert(rifle.use())
rifle.tick(.1)
assert(rifle.boltProgress>0)
rifle.tick(1.88)
assert(!rifle.use())
rifle.tick(.021)
assert(rifle.use())
rifle.tick(2)
assert(rifle.use())
assert(rifle.reloading)
assert.equal(rifle.item.mag,0)
assert(rifle.select('sniper'))
assert(rifle.reloading)
rifle.tick(1.99)
assert(!rifle.use())
rifle.tick(.011)
assert.equal(rifle.item.mag,3)
assert.equal(rifle.item.reserve,6)
assert(rifle.use())
assert.equal(gear.pistol.range,24)
assert.equal(gear.shotgun.range,17)

const stance=scopeStance()
stance.update(.39,true)
assert.equal(stance.eye,0,'the rifle must be lifted before the camera moves')
stance.update(.10,true)
assert(stance.eye>0&&stance.eye<1)
stance.update(.01,true)
assert.equal(stance.eye,1)
stance.update(.016,false)
assert.equal(stance.eye,0)
stance.update(.12,true)
assert.equal(stance.eye,0,'re-aim must not inherit elapsed time')

for(const n of crowd.all)n.pos.set(-35,0,10)
target.pos.set(0,0,100)
target.f=fighter(100)
camera.position.set(0,1.34,-1);camera.lookAt(0,1.34,100);camera.updateMatrixWorld()
loadout.tick(2)
assert(loadout.select('sniper'))
const sniperFrame=()=>{char.update(1/60,0);sim.update(1/60,{active:true,aiming:true,speed:0,pitch:0,ready:true})}
const sniperRounds=loadout.item.mag
sim.attack(false)
assert.equal(loadout.item.mag,sniperRounds)
sim.attack(true);sniperFrame()
assert.equal(loadout.item.mag,sniperRounds-1)
assert.equal(target.f.hp,0)
const optic=new Vector3()
char.update(1/60,0)
sim.update(1/60,{active:true,aiming:true,speed:0,pitch:0,ready:true,raise:1,alignScope:position=>assert(position(optic))})
assert(optic.z>.3&&optic.y>1.35&&optic.y<1.72,'the lens is in front of the standing avatar at shoulder height')
console.log('Sniper fires on the first aiming frame, has no hit range cap, cycles rounds and waits two seconds between shots.')

shooter.pos.set(0,0,5);shooter.face=Math.PI;shooter.stagger=0;shooter.f=fighter(130)
shooter.rig.root.position.copy(shooter.pos);shooter.rig.root.rotation.y=shooter.face
player.pos.set(0,0,0);player.exposed=true;player.inVehicle=null
const volley=policeFire([],[],[]),times=[]
volley.escalate();let sawReload=false
for(let i=0;i<255;i++){
 const dt=.05
 volley.update(dt,3);shooter.rig.update(dt,1.5)
 volley.pose(shooter,player,dt,true,()=>times.push(i*dt))
 if(volley.reloading(shooter)){assert.equal(times.length%8,0);sawReload=true}
 if(!times.length)await new Promise(resolve=>setTimeout(resolve,1))
}
assert(sawReload&&times.length>=9,JSON.stringify(times))
assert(times[8]-times[7]>=1.14&&times[7]-times[6]<.90)

const throwLoadout=createLoadout(equippedFixture),projectiles=[]
const throwTest=equipmentPlay({scene,camera,char,boxes:[],fleet:[],crowd,player,loadout:throwLoadout,
 onHit(){},onShot(){},throwGrenade:point=>projectiles.push(point.clone()),toast(){}})
assert(throwLoadout.select('grenade'))
const frameThrow=(dt,active=true)=>{char.update(dt,0);throwTest.update(dt,{active,aiming:false,speed:0,pitch:0})}
throwTest.attack()
frameThrow(.09)
assert.equal(projectiles.length,0)
frameThrow(.09,false)
assert.equal(throwLoadout.item.reserve,4,'an interrupted windup does not remove a grenade')
throwTest.attack()
for(let i=0;i<25;i++)frameThrow(1/60)
assert.equal(projectiles.length,1)
assert.equal(throwLoadout.item.reserve,3)
assert(projectiles[0].y>1&&projectiles[0].y<1.8)
for(let i=0;i<90;i++)frameThrow(1/60)
assert.equal(projectiles.length,1,'one input spawns one projectile')

target.f=fighter(108)
target.pos.set(0,0,2)
officer.pos.set(4,0,1)
witness.pos.set(0,0,4)
crowd.wanted.clear()
assert(crowd.blastHit(target,new Vector3(0,.1,0),.7))
assert.equal(target.f.action,'knockdown')
assert(target.f.hp<50&&target.f.motion.z>0)
assert.equal(crowd.wanted.level,0)

const freeRecords=new Map()
const freeStorage={getItem:key=>freeRecords.get(key),setItem:(key,value)=>freeRecords.set(key,value)}
const sandboxLoadout=createLoadout(freeStorage)
assert(sandboxLoadout.enterFreeMode())
assert(sandboxLoadout.select('sniper'))
for(let i=0;i<12;i++){assert(sandboxLoadout.use());sandboxLoadout.tick(3)}
assert.equal(sandboxLoadout.item.mag,gear.sniper.capacity)
assert.equal(freeRecords.size,0)
assert.equal(createLoadout(freeStorage).selected,'fists')
