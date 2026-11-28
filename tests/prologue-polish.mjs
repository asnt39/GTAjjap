import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import {Group,Scene,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {buildPort} from '../src/port.js'
import {fighter} from '../src/melee.js'
import {wrongDeal} from '../src/prologue.js'
import {prologueWorld} from '../src/prologue-world.js'
import {buildTransferYard} from '../src/transfer-yard.js'
import {vehicles} from '../src/vehicles.js'
import {worldColliders} from '../src/world-colliders.js'

globalThis.self=globalThis
const paint=new Proxy({},{get:()=>()=>paint})
globalThis.document={createElement:()=>({getContext:()=>paint})}
TextureLoader.prototype.load=function(url,callback){
 const texture=new Texture();queueMicrotask(()=>callback?.(texture));return texture
}
GLTFLoader.prototype.loadAsync=async function(url){
 const asset=await readFile(new URL('../public'+url,import.meta.url))
 return this.parseAsync(asset.buffer.slice(asset.byteOffset,asset.byteOffset+asset.byteLength),'')
}

const dt=1/60
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
function fixture(scene=new Scene(),boxes=worldColliders()){
 const crowd={all:[],blockedBy:(actor,x,z)=>crowd.all.some(other=>other!==actor&&other.f.hp>0&&gap(other.pos,{x,z})<.59)}
 const traffic=[]
 const rigs={civilianRig:()=>({...vehicles.touring,setup:vehicles.touring,root:new Group(),updatePose(){}})}
 const errors=[]
 const world=prologueWorld({scene,boxes,crowd,traffic,rigs,height:()=>.083,combat(){},notify:message=>errors.push(message)})
 return {crowd,traffic,world,errors}
}

test('the quay ambush arrives from outside the yard and stays active when the manifest is recovered',async()=>{
 const scene=new Scene(),boxes=worldColliders(),add=(...box)=>boxes.push(box)
 await buildPort(scene,add)
 buildTransferYard(scene,add,{architecture:[null,new Texture()]})
 const {world,crowd,errors}=fixture(scene,boxes)
 const fight=wrongDeal[0].stages[2],escape=wrongDeal[0].stages[3]
 const player={pos:new Vector3(14.4,.083,-31.6),f:fighter(100),exposed:false}
 const step=(seconds,stage=fight)=>{
  let beats
  for(let frame=0;frame<Math.round(60*seconds);frame++)beats=world.step(stage,dt,player,true,false)
  return beats
 }
 world.enter(fight)
 assert.equal(crowd.all.length,0)
 // Character decoding uses the real local GLB; it runs asynchronously in the game.
 let first
 for(let frame=0;frame<500&&!first;frame++){
  step(dt);first=crowd.all[0]?.pos
  if(!first)await new Promise(resolve=>setTimeout(resolve,5))
 }
 assert.deepEqual(errors,[])
 assert(first,'the first attacker joined the encounter')
 assert.equal(crowd.all.length,1,'hostiles join on staggered beats')
 assert(gap(first,player.pos)>15,'the first attacker approaches from a distance')
 const firstAttacker=crowd.all[0]
 const outline=()=>firstAttacker.rig.root.getObjectsByProperty('name','Mission enemy outline')
 assert(outline().length>=2)
 assert(outline().every(pass=>!pass.visible),'a distant attacker keeps the outline hidden')
 const initialGap=gap(first,player.pos)
 step(4)
 assert(gap(world.markers()[0],player.pos)<initialGap-3,'the first attacker closes on the yard')
 assert(world.markers().length>=2)

 const manifest=world.interaction(fight,player.pos)
 assert.equal(manifest,null,'searching requires reaching the cargo desk')
 player.pos.set(15.55,.083,-33.1)
 assert(world.interaction(fight,player.pos)?.activate().message)
 player.pos.set(14.4,.083,-31.6)
 assert(!step(3).cleared,'walking away interrupts the search')
 player.pos.set(15.55,.083,-33.1)
 assert(world.interaction(fight,player.pos)?.activate().message)
 const beats=step(3)
 assert(beats.cleared,'finding the manifest advances the goal')
 assert(beats.threats>0,'the objective can be completed while attackers survive')

 const downed=crowd.all[0]
 downed.f.hp=0
 assert(world.markers().every(marker=>gap(marker,downed.pos)>.01),'downed hostiles lose their map marker')
 const remaining=world.markers().length
 step(.1,escape)
 assert.equal(world.markers().length,remaining,'the surviving attackers remain during the drive out')
 world.clean()
 assert.equal(outline().length,0)
})

test('the tail joins in separate cars and follows the player away from the market junction',()=>{
 const {world,traffic}=fixture()
 const stage=wrongDeal[1].stages[0]
 const car={x:-1.47,z:-19,heading:Math.PI,speed:3,height:1.4}
 const player={pos:new Vector3(car.x,.083,car.z),inVehicle:car}
 const tick=()=>world.step(stage,dt,player,false,true)
 tick()
 assert.equal(traffic.length,0,'squad cars do not pop into the first frame')
 let joinedAt=-1,secondAt=-1,firstStart
 for(let frame=0;frame<60*16;frame++){
  if(car.z<25){car.z+=3*dt;player.pos.z=car.z}
  const beats=tick()
  if(traffic.length&&joinedAt<0){
   joinedAt=frame;firstStart={x:traffic[0].x,z:traffic[0].z}
   assert(gap(firstStart,player.pos)>=22,'the first car joins at a believable distance')
  }
  if(traffic.length>1&&secondAt<0)secondAt=frame
  assert(!beats.evaded,'a slow player on the same road remains in pursuit')
 }
 assert(joinedAt>=0&&secondAt-joinedAt>60,'reinforcements join independently')
 assert.equal(world.markers().length,2)
 assert(traffic[0].z>10&&gap(traffic[0],firstStart)>25,'the tail travels toward the player')
})
