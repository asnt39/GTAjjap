import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import {Group,Scene,Texture,TextureLoader,Vector3} from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {buildChapterBuildings} from '../src/chapter-buildings.js'
import {buildOldTown} from '../src/old-town.js'
import {chapterWorld} from '../src/chapter-world.js'
import {freeCrew} from '../src/chapter-eight.js'
import {chapterMissions} from '../src/chapter-missions.js'
import {facilityFloor,hideout,hotel,marina,parking,workshop} from '../src/chapter-sites.js'
import {cargoLaunch,quaySkiff} from '../src/chapter-sea.js'
import {createBoats} from '../src/coastal-motion.js'
import {stepDrive} from '../src/driving.js'
import {touringSetup} from '../src/vehicles.js'
import {fighter} from '../src/melee.js'

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
function fixture(){
 const dt=1/60,scene=new Scene(),boxes=[],traffic=[],crowd={all:[]},errors=[]
 const boats=createBoats([cargoLaunch,quaySkiff])
 const rig=()=>({root:new Group(),width:1.82,length:4.35,height:1.45,setup:touringSetup,updatePose(){}})
 const maps={architecture:Array.from({length:5},()=>new Texture()),street:Array.from({length:5},()=>new Texture())}
 buildOldTown(scene,(...b)=>boxes.push(b),boxes,maps)
 buildChapterBuildings(scene,(...b)=>boxes.push(b),maps)
 const player={pos:new Vector3(0,.083,0),f:fighter(100),height:1.8,exposed:true,inVehicle:null}
 const world=chapterWorld({scene,boxes,crowd,traffic,boats,rigs:{civilianRig:rig},
  floorAt:(x,z,y)=>facilityFloor(x,z,y)??.083,
  registerVehicle(vehicle){traffic.push(vehicle)},
  unregisterVehicle(vehicle){traffic.splice(traffic.indexOf(vehicle),1)},
  notify(message,failed){if(failed)errors.push(message)}})
 let frame=0
 function step(stage,boat=null){return world.step(stage,dt,player,!player.inVehicle&&!boat,!!player.inVehicle,boat,++frame*dt)}
 async function ready(stage){
  for(let i=0;i<700;i++){
   if(step(stage).status!=='합류 준비 중')return
   await new Promise(resolve=>setTimeout(resolve,3))
  }
  assert.fail('Crew rig load: '+errors.join(', '))
 }
 function place(point){player.pos.set(point.x,point.y??.083,point.z)}
 return {world,crowd,traffic,boats,player,step,ready,place,boxes}
}

test('active witness runs on both floors, exits the doorway, and can be restored mid-route',async()=>{
 const {world,crowd,step,ready,place}=fixture()
 const stage=chapterMissions[1].stages[2]
 place(hotel.witness)
 await ready(stage)
 const witness=crowd.all.find(npc=>npc.name==='Elliot'),start=witness.pos.y
 for(let i=0;i<110;i++)step(stage)
 const save=world.snapshot(),at=witness.pos.clone()
 let outside=false
 for(let i=0;i<2400&&!outside;i++){
  place(witness.pos)
  outside=step(stage).outside
 }
 assert.ok(outside,'witness did not cross service door: '+witness.pos.toArray().join(', '))
 assert.ok(witness.pos.y<start-2.9)
 assert.ok(world.planRestore(save))
 world.planRestore(save)()
 assert.ok(witness.pos.distanceTo(at)<.001)
 assert.equal(crowd.all.filter(npc=>npc.name==='Elliot').length,1)
 world.prepare(null)
 assert.equal(crowd.all.length,0)
})

test('cargo pursuit seats Maya on the active boat and clears the encounter on shore',async()=>{
 const {world,crowd,boats,step,ready,place}=fixture()
 const [,,stage]=chapterMissions[2].stages
 place(marina.meetup)
 await ready(stage)
 const skipper=boats[1]
 for(let i=0;i<2100;i++)step(stage,skipper)
 const maya=crowd.all.find(npc=>npc.name==='Maya')
 assert.ok(maya.passenger)
 assert.ok(maya.pos.distanceTo(new Vector3(skipper.x,-1.5,skipper.z))<1.25)
 place(marina.berth)
 assert.equal(step(stage).madeLandfall,true)
 world.prepare(null)
 assert.ok(boats[2].disabled)
 assert.equal(crowd.all.length,0)
})

test('the foundry can be entered from each flank without eliminating every guard',async()=>{
 const {world,crowd,step,ready,place}=fixture()
 const stage=chapterMissions[3].stages[1]
 for(const entry of stage.entries){
  world.enter(stage)
  place(entry)
  await ready(stage)
  assert.ok(crowd.all.some(npc=>npc.missionRole==='hostile'&&npc.f.hp>0))
  assert.ok(step(stage).enteredFoundry)
 }
 world.prepare(null)
})

test('Maya takes the wheel and manual input hands control back immediately',async()=>{
 const {world,crowd,traffic,player,step,ready,place,boxes}=fixture()
 const stage=chapterMissions[0].stages[2]
 place(parking.recovery)
 await ready(stage)
 const car=traffic.find(vehicle=>vehicle.id==='chapter-maya-car')
 const start={x:car.x,z:car.z}
 const quiet={forward:0,back:0,steer:0,handbrake:false}
 const driver={...quiet,forward:1}
 player.inVehicle=car
 place(car)
 step(stage)
 assert.ok(crowd.all.some(npc=>npc.name==='Maya'&&npc.passenger))
 assert.ok(world.changeDriver(car))
 assert.equal(world.driveInput(car,quiet).handbrake,true)
 assert.equal(world.driveInput(car,driver),driver)
 assert.equal(world.autoDriver,false)
 assert.ok(world.changeDriver(car))
 let result
 for(let frame=0;frame<3600&&!result?.secured;frame++){
  stepDrive(car,world.driveInput(car,quiet),boxes,1/60,traffic,true)
  place(car)
  result=step(stage)
 }
 assert.ok(result.secured,'escaped route stalled near '+car.x+', '+car.z)
 assert.ok(Math.hypot(car.x-start.x,car.z-start.z)>8)
 assert.ok(traffic.some(vehicle=>vehicle.id==='chapter-recovery-car'&&!vehicle.storyLocked))
 const delivery=chapterMissions[0].stages[3]
 await ready(delivery)
 const recovered=traffic.find(vehicle=>vehicle.id==='chapter-recovery-car')
 player.inVehicle=recovered
 Object.assign(recovered,{x:workshop.bay.x,z:workshop.bay.z,speed:0})
 place(workshop.bay)
 assert.equal(step(delivery).delivered,true)
 world.prepare(null)
 assert.equal(traffic.length,0)
})

test('the Rivet pursuit reports distinct outcomes for sustained pressure and escape',async()=>{
 const {world,traffic,player,step,ready,place}=fixture()
 const stage=chapterMissions[3].stages[5]
 for(const outcome of ['intercepted','escaped']){
  place(stage.goal)
  world.enter(stage)
  await ready(stage)
  const vehicle=traffic.find(item=>item.id==='chapter-adrian-car')
  let lead
  for(let i=0;i<6800&&!lead;i++){
   if(outcome==='intercepted'){
    player.inVehicle={x:vehicle.x-4,z:vehicle.z+2,lift:0,speed:7}
    place(player.inVehicle)
   }else player.inVehicle=null
   lead=step(stage).adrianLead
  }
  assert.equal(lead,outcome)
  world.prepare(null)
 }
 assert.equal(traffic.length,0)
})

test('free-roam allies can be found, recruited, and dismissed without a mission goal',async()=>{
 const {world,crowd,ready,place,player}=fixture()
 place({x:hideout.maya.x+1.25,y:hideout.maya.y,z:hideout.maya.z})
 await ready(freeCrew)
 const maya=crowd.all.find(npc=>npc.name==='Maya')
 const action=id=>world.interactions(freeCrew,player.pos).find(item=>item.id===id)
 assert.ok(action('chapter-talk-chapter-maya'))
 action('chapter-order-chapter-maya').activate()
 assert.ok(maya.follow)
 action('chapter-dismiss-chapter-maya').activate()
 assert.equal(maya.follow,false)
 world.prepare(null)
})
