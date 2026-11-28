import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createCheckpoint,resolveCheckpoint} from '../src/play-checkpoint.js'
import {nearBody,newDrive,overlapsCar,safeExit,stepDrive} from '../src/driving.js'
import {canWalk} from '../src/navigation.js'
import {motorcycleSetup} from '../src/motorcycle.js'
import {parkedPoses,restoreParkedPoses} from '../src/vehicle-checkpoint.js'
import {vehicles} from '../src/vehicles.js'

const fresh=(id,setup)=>({...newDrive(setup,setup),id})
const origins=fleet=>new Map(fleet.map(car=>[car.id,{...car}]))
const walk=(x,z)=>({x,z,y:.008,face:0,yaw:0,pitch:.13,distance:4.65})
const safe={offline:true,grounded:true,safe:true}

test('driven car and bike survive reload alongside the pedestrian exit point',()=>{
 const data=new Map()
 const storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)}
 const car=fresh('touring',vehicles.touring),bike=fresh('breakwater-650',motorcycleSetup)
 const fleet=[car,bike],spawns=origins(fleet)
 for(let i=0;i<75;i++)stepDrive(car,{forward:1,back:0,steer:-.65,handbrake:false},[],1/60,fleet,true)
 assert(Math.hypot(car.x-vehicles.touring.x,car.z-vehicles.touring.z)>1)
 Object.assign(bike,{x:2,z:29,heading:.12})
 const player=safeExit(bike,[],-1).door
 const save=createCheckpoint(storage)
 save.sample(walk(player.x,player.z),safe)
 const saved=parkedPoses(fleet,spawns)
 save.sampleVehicles(saved,true)
 // An online room is free to move the same vehicle IDs.
 car.z=20
 save.sampleVehicles(parkedPoses(fleet,spawns),false)
 save.sample(walk(12,12),{...safe,offline:false})
 save.flush()
 const reopen=createCheckpoint(storage)
 const restored=[fresh('touring',vehicles.touring),fresh('breakwater-650',motorcycleSetup)]
 restoreParkedPoses(restored,reopen.vehicles,[])
 for(const v of restored){
  assert.deepEqual({x:v.x,z:v.z,heading:v.heading},saved[v.id])
  assert.equal(v.speed,0)
 }
 const p=resolveCheckpoint(reopen.current,[],()=>.008,(x,z)=>canWalk(x,z,[])&&!restored.some(v=>nearBody(v,x,z)))
 assert.deepEqual(p,{...player,y:.008})
})

test('rejects stale and blocked poses, but supports two vehicles exchanging parking spots',()=>{
 const first={...fresh('first',vehicles.touring),x:0,z:8}
 const other={...fresh('second',vehicles.touring),x:0,z:-12}
 restoreParkedPoses([first,other],{first:{x:0,z:-12,heading:0},second:{x:0,z:8,heading:0}},[])
 assert.equal(first.z,-12)
 assert.equal(other.z,8)
 const wall=[[-2,2,-26,-21,4]]
 restoreParkedPoses([first,other],{first:{x:0,z:8,heading:0},second:{x:0,z:-24,heading:0}},wall)
 assert.equal(first.z,-12)
 assert.equal(other.z,8)
 assert(!overlapsCar(first,other))
 restoreParkedPoses([first,other],{first:{x:86,z:-65,heading:0},second:{x:0,z:2,heading:'0'},__proto__:null},[])
 assert.equal(first.z,-12)
 assert.equal(other.z,8)
})

test('a parked car restores its height and pitch on the Breakwater grade',()=>{
 const car=fresh('touring',vehicles.touring)
 restoreParkedPoses([car],{touring:{x:-24,z:85.65,heading:Math.PI/2}},[])
 assert(car.lift>.25&&car.lift<.40)
 assert(car.roadPitch>.065)
 assert(Math.abs(car.roadRoll)<.002)
})

test('old records restore the player before any vehicle history exists',()=>{
 const old=walk(2,24)
 const local=createCheckpoint({getItem:()=>JSON.stringify(old)})
 assert.deepEqual(local.current,old)
 assert.deepEqual(local.vehicles,{})
})

test('a parked car retains its Spire Parking deck and rejects impossible floor data',()=>{
 const car=fresh('touring',vehicles.touring),spawns=origins([car])
 Object.assign(car,{x:-124,z:158,heading:0,lift:6.483})
 const saved=parkedPoses([car],spawns)
 assert.equal(saved.touring.lift,6.483)
 const restored=fresh('touring',vehicles.touring)
 restoreParkedPoses([restored],saved,[])
 assert.equal(restored.x,car.x)
 assert.ok(Math.abs(restored.lift-car.lift)<1e-8)
 restoreParkedPoses([restored],{touring:{x:1,z:29,heading:0,lift:6.483}},[])
 assert.equal(restored.x,car.x)
})
