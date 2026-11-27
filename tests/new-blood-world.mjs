import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import {Group,Scene,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {fighter} from '../src/melee.js'
import {movePlayer} from '../src/navigation.js'
import {clubFire} from '../src/new-blood-fire.js'
import {newBloodWorld} from '../src/new-blood-world.js'
import {clubDoors,clubFloorAt,clubPlan,insideClub} from '../src/new-blood-club-plan.js'
import {buildNewBloodClub} from '../src/new-blood-club.js'
import {buildOldTown} from '../src/old-town.js'
import {createTerraceDoors} from '../src/terrace-doors.js'
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
function fixture(start){
 const scene=new Scene(),boxes=worldColliders(),shots=[],errors=[]
 const crowd={all:[],talking:null,blockedBy:(actor,x,z)=>crowd.all.some(n=>n!==actor&&n.f.hp>0&&gap(n.pos,{x,z})<.59)}
 const add=(...bounds)=>boxes.push(bounds)
 const maps={architecture:Array.from({length:5},()=>new Texture()),street:Array.from({length:5},()=>new Texture())}
 buildOldTown(scene,add,boxes,maps)
 buildNewBloodClub(scene,add,maps)
 const doors=createTerraceDoors(scene,boxes,undefined,clubDoors)
 const height=(x,z)=>insideClub(x,z)?clubFloorAt(x,z):.083
 const player={pos:new Vector3(start.x,height(start.x,start.z),start.z),f:fighter(100),exposed:true}
 const world=newBloodWorld({scene,boxes,crowd,traffic:[],height,
  combat(shooter,from,to,hit,weapon){shots.push({shooter:shooter.id,hit,weapon})},notify(message){errors.push(message)}})
 function step(stage,seconds=dt){
  let result
  for(let frame=0;frame<Math.round(60*seconds);frame++){
   doors.update(dt,player.pos,crowd.all)
   result=world.step(stage,dt,player,true,false)
  }
  return result
 }
 function walk(stage,points){
  for(const target of points){
   for(let i=0;i<450;i++){
    const p=player.pos,d=gap(p,target)
    if(d<.055)break
    const ratio=Math.min(.062,d)/d
    movePlayer(p,(target.x-p.x)*ratio,(target.z-p.z)*ratio,boxes,(x,z)=>crowd.blockedBy(null,x,z),p.y)
    p.y=height(p.x,p.z)
    step(stage)
   }
   assert(gap(player.pos,target)<.055,`could not walk to ${target.x}, ${target.z} from ${player.pos.x}, ${player.pos.z}`)
  }
 }
 async function wait(stage,until){
  for(let i=0;i<500;i++){
   const result=step(stage)
   if(until(result))return result
   await new Promise(resolve=>setTimeout(resolve,4))
  }
  assert.fail(`Encounter did not reach the expected state: ${errors.join(', ')}`)
 }
 return {world,player,crowd,shots,step,walk,wait,errors,doors,boxes}
}

test('Jack waits for a join command and has to reach the reception with the player',async()=>{
 const start=clubPlan.actors.jack,goal=clubPlan.actors.reception
 const stage={set:'entry',goal},game=fixture({...start,x:start.x+.8})
 const {world,player,crowd,step,walk,wait,doors}=game
 await wait(stage,()=>world.interactions(stage,player.pos).length>0)
 const jack=crowd.all.find(n=>n.name==='Jack Bennett')
 assert(jack)
 player.pos.set(goal.x,.083,goal.z)
 assert(!step(stage,2).arrived)
 assert(gap(jack.pos,start)<.01)
 player.pos.set(start.x+.8,.083,start.z)
 walk(stage,[clubPlan.entry])
 const join=world.interactions(stage,player.pos).find(action=>action.id==='new-blood-jack-join')
 assert(join?.activate().message,'the command is available at the marked front entrance')
 const front=doors.doors.find(d=>d.r===clubDoors[0])
 if(!front.target)assert(doors.toggle(player.pos,front))
 step(stage,.9)
 walk(stage,[clubPlan.routes.vip[0],goal])
 assert(step(stage,8).arrived)
 assert(gap(jack.pos,goal)<2)
 world.clean()
 assert.equal(crowd.all.length,0)
})

test('Victor can be met, and Jack returns real fire against the ambush attackers',async()=>{
 const meet={set:'meeting',goal:clubPlan.vip},attack={set:'ambush',goal:clubPlan.vip}
 const {world,player,crowd,shots,step,wait}=fixture(clubPlan.vip)
 await wait(meet,()=>world.interactions(meet,player.pos).some(action=>action.id==='new-blood-victor-talk'))
 const talk=world.interactions(meet,player.pos).find(action=>action.id==='new-blood-victor-talk')
 assert.equal(talk.activate().met,true)
 assert.equal(step(meet).met,true)
 const jack=crowd.all.find(n=>n.name==='Jack Bennett')
 await wait(attack,()=>world.markers().length===1)
 assert(crowd.all.includes(jack),'Jack stays physically present between scenes')
 assert(!step(attack).cleared)
 await wait(attack,()=>shots.some(shot=>shot.shooter===jack.id))
 assert(crowd.all.some(n=>n.missionRole==='hostile'&&n.f.hp<n.f.maxHealth))
 assert(crowd.all.some(n=>n.missionRole==='hostile'))
 world.clean()
 assert.equal(world.markers().length,0)
})

test('evacuation waits for Victor and the player to both reach the outside exit',async()=>{
 const stage={set:'evacuation',goal:clubPlan.exit}
 const {world,player,crowd,step,walk,wait,doors}=fixture(clubPlan.vip)
 await wait(stage,()=>crowd.all.some(n=>n.name==='Victor Hale'))
 assert(!step(stage,4).escaped)
 walk(stage,clubPlan.routes.rear.map(point=>({...point,x:point.x-.36})))
 assert(step(stage,9).escaped)
 assert(doors.doors.find(d=>d.r===clubDoors[1]).progress>.9)
 assert(!insideClub(player.pos.x,player.pos.z))
 world.clean()
})

test('ordinary Jack stays in a conversation and returns to free roam on cleanup',async()=>{
 const stage={set:'entry',goal:clubPlan.entry}
 const {world,crowd,step,wait}=fixture(clubPlan.entry)
 const courier={id:'courier',pos:new Vector3(7.6,.083,16.2),f:fighter(110),rig:{root:new Group()}}
 crowd.all.push(courier);crowd.talking=courier
 await wait(stage,result=>result.status==='Jack에게 이동 지시')
 assert.deepEqual(crowd.all,[courier]);assert(courier.rig.root.visible)
 crowd.talking=null
 step(stage)
 assert(crowd.all.some(n=>n.id==='new-blood-jack'));assert(!courier.rig.root.visible)
 world.clean()
 assert.deepEqual(crowd.all,[courier]);assert(courier.rig.root.visible)
})

test('saved street fights give the player space at the checkpoint and attackers use both exterior routes',async()=>{
 const stage={set:'street',goal:clubPlan.street}
 const {world,player,crowd,step,wait}=fixture(clubPlan.exit)
 await wait(stage,()=>world.markers().length===1)
 const jack=crowd.all.find(n=>n.id==='new-blood-jack')
 assert(gap(jack.pos,player.pos)>.64,'Jack leaves room for the player to move after restoring the checkpoint')
 const initial=world.markers()[0]
 assert(gap(initial,player.pos)>14)
 step(stage,14)
 assert(world.markers().some(marker=>gap(marker,initial)>12))
 assert(crowd.all.filter(n=>n.missionRole==='hostile'&&gap(n.pos,clubPlan.exit)<12).length>=2)
 world.clean()
})

test('a solid club wall obstructs hostile aim while the same distance outside stays visible',()=>{
 const {boxes,player}=fixture({x:-162,z:91.4})
 const fire=clubFire(boxes,[],[])
 const shooter={pos:new Vector3(-162,.083,93.45),height:1.77}
 assert(!fire.visible(shooter,player))
 player.pos.set(-160,.083,93.45)
 assert(fire.visible(shooter,player))
})
