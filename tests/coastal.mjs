import assert from 'node:assert/strict'
import {test} from 'node:test'
import {Scene,Texture,TextureLoader} from 'three'
import {buildCoast} from '../src/coast-scene.js'
import {beachGate,beachGround,coastalLand,coastalRocks,dock,inPier,rockSolid,seaLevel,seabed,shoreX,shoal} from '../src/coast-plan.js'
import {boatExit,boatPoseClear,canStartSwimming,createBoats,driveBoat,nearestBoat,swimmer} from '../src/coastal-motion.js'
import {canWalk,movePlayer} from '../src/navigation.js'
import {createCheckpoint} from '../src/play-checkpoint.js'

test('the coast renders with real bounds and the walking lane reaches the dock from South Basin',()=>{
 const paint=new Proxy({},{get:()=>()=>paint})
 globalThis.document={createElement:()=>({getContext:()=>paint})}
 const load=TextureLoader.prototype.load
 TextureLoader.prototype.load=()=>new Texture()
 try{
  const scene=new Scene(),boxes=[]
  const update=buildCoast(scene,(...box)=>boxes.push(box))
  assert(update({x:-100,z:0}))
  assert(update({x:70,z:146}))
  assert(scene.getObjectByName('Dry sand, intertidal shelf and seabed').geometry.attributes.position.count>6000)
  const p={x:24,z:beachGate.z}
  movePlayer(p,dock.east-25,0,boxes,undefined,.08)
  assert(inPier(p.x,p.z)&&p.x>dock.east-2)
 }finally{TextureLoader.prototype.load=load}
})

test('shore geometry is curved with gradual immersion and a separate landing beach on the shoal',()=>{
 assert(shoreX(190)-shoreX(110)>20)
 assert(coastalLand(shoal.x,shoal.z))
 assert(!coastalLand(125,shoal.z))
 const z=163,x=shoreX(z)
 assert(Math.abs(seabed(x,z)-seaLevel)<.01)
 assert(beachGround(x-10,z)>seaLevel+1)
 assert(beachGround(x+10,z)<seaLevel-1.2)
 assert(!canStartSwimming(x+2,z))
 assert(canStartSwimming(x+4,z))
 assert(canWalk(x-2,z,[],.32))
 assert(coastalRocks.every(r=>rockSolid(r.x,r.z)))
})

test('swimming enters after wading, descends, consumes oxygen, takes periodic damage and surfaces safely',()=>{
 const z=163,p={x:shoreX(z)+14,y:0,z},state=swimmer()
 state.start(p)
 assert(state.toggle(p))
 let damage=0
 for(let i=0;i<60*34;i++)damage+=state.step(p,1/60,0,0,i/60,coastalLand,()=>false).damage
 assert(state.air===0&&damage>=24&&damage<=72)
 assert(p.y<seaLevel-1.5&&p.y>seabed(p.x,p.z))
 assert(state.toggle(p))
 for(let i=0;i<210;i++)state.step(p,1/60,0,0,34+i/60,coastalLand,()=>false)
 assert(state.air>.98)
 let land=false
 for(let i=0;i<540&&!land;i++)land=state.step(p,1/60,-1,0,38+i/60,coastalLand,()=>false).land
 assert(land&&canWalk(p.x,p.z,[],.32))
})

test('both docked boats have valid hulls, boarding reach, and a safe exit',()=>{
 const boats=createBoats()
 for(const [i,b] of boats.entries()){
  assert(boatPoseClear(b,boats))
  assert.equal(nearestBoat({x:b.x,z:dock.z+(i?1.28:-1.28)},boats,false),b)
  assert(boatExit(b,inPier,boats)?.dry)
  b.speed=2
  assert.notEqual(nearestBoat({x:b.x,z:dock.z+(i?1.28:-1.28)},boats,false),b)
 }
})

test('marine drive has model-specific speed and steering and surfaces are separate from the road',()=>{
 const boats=createBoats()
 const times=[]
 for(const b of boats){
  Object.assign(b,{x:145,z:-67,heading:Math.PI})
  const accelerate={forward:1,back:0,steer:0,brake:false}
  for(let i=0;i<660;i++)driveBoat(b,accelerate,1/90,[])
  times.push(b.speed)
  assert(b.z> -30)
  assert(!b.damage)
  const heading=b.heading
  for(let i=0;i<120;i++)driveBoat(b,{...accelerate,steer:1},1/90,[])
  assert(b.heading>heading+.45)
 }
 assert(times[1]>times[0]*1.4)
})

test('the ocean route joins Portside and continuous boat hull sweeps stop at rocks and ground',()=>{
 const [b]=createBoats()
 b.x=120;b.heading=0
 for(let z=146;z>-42;z-=.5){
  b.z=z;assert(boatPoseClear(b),`harbor approach at ${z}`)
 }
 Object.assign(b,{x:128,z:121,heading:-Math.PI/2,speed:8})
 let hit=0
 for(let i=0;i<220&&!hit;i++)hit=driveBoat(b,{forward:1,back:0,steer:0},1/90,[])
 assert(hit>5&&b.damage>0&&b.x>110&&boatPoseClear(b))
 Object.assign(b,{x:90,z:171,heading:-Math.PI/2,speed:8,damage:0})
 hit=0
 for(let i=0;i<280&&!hit;i++)hit=driveBoat(b,{forward:1,back:0,steer:0},1/90,[])
 assert(hit>4&&b.x>shoreX(171)&&boatPoseClear(b))
})

test('water play leaves a valid saved land position intact',()=>{
 const saved={x:43,y:.083,z:146.5,face:1.56,yaw:1.56,pitch:.13,distance:4.65}
 let value=JSON.stringify(saved)
 const checkpoint=createCheckpoint({getItem:()=>value,setItem:(_,data)=>{value=data}})
 checkpoint.sample({...saved,x:102,y:-1.9},{offline:true,grounded:false,safe:false})
 checkpoint.flush()
 assert.equal(JSON.parse(value).x,saved.x)
})
