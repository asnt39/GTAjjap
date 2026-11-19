import assert from 'node:assert/strict'
import {newDrive,stepDrive,clearPose,safeExit,availableDoor,doorPoint,nearBody} from '../src/driving.js'
const rig={x:0,z:25,width:2.02373,length:4.15,height:1.257,heading:0}
const control=(forward=0,back=0,steer=0,handbrake=false)=>({forward,back,steer,handbrake})
const advance=(c,time,input,hz=60,boxes=[])=>{for(let i=0;i<Math.round(time*hz);i++)stepDrive(c,input,boxes,1/hz)}
const compare=[20,30,60,120].map(hz=>{const c=newDrive(rig);advance(c,2,control(1),hz);advance(c,.3,control(1,0,.4),hz);return c})
for(const c of compare){assert(Math.abs(c.z-compare[0].z)<1e-8);assert(c.heading>0);assert(c.speed>6)}
const c=newDrive(rig);advance(c,1,control(1));advance(c,3,control(0,1));assert(c.speed<0)
advance(c,.4,control(0,1,1));assert(c.heading<0)
advance(c,1,control(0,0,0,true));assert.equal(c.speed,0)
advance(c,1,control(0,0,1));const angle=c.heading;advance(c,1,control(0,0,1));assert.equal(c.heading,angle)
const wall=[[-5,5,10,11,2]],hit=newDrive(rig);advance(hit,6,control(1),30,wall);assert(clearPose(hit,wall));assert(hit.z>=11+rig.length/2);const at=hit.z;advance(hit,1,control(0,1),30,wall);assert(hit.z>at+.5)
assert(!clearPose({...rig,x:24,z:0},[]));assert(!clearPose({...rig,x:-5.7},[]))
const door=doorPoint(c,-1);assert(availableDoor(c,door,[]));assert(!nearBody(c,door.x,door.z))
const d=newDrive(rig),blocks=[[-2.5,-1.1,23,27,2]];assert.equal(safeExit(d,blocks).side,1)
blocks.push([1.1,2.5,23,27,2]);assert.equal(safeExit(d,blocks),null)
console.log('Passed fixed-step consistency, forward/reverse steering, brake, rest turning, curb and wall contact, reverse recovery, entry and two-sided exit tests.')

const {firstDrive}=await import('../src/first-drive.js')
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)}
const tripCar=newDrive(rig),trip=firstDrive(tripCar)
trip.start(false);assert.equal(trip.goal(false).label,'Touring 탑승');trip.board()
for(const [x,z] of [[0,-37],[2.6,-87],[3.1,19.5]]){
 Object.assign(tripCar,{x,z,speed:4});const target=trip.goal(true);trip.tick(true);assert.deepEqual(trip.goal(true),target)
 tripCar.speed=0;trip.tick(true)
}
assert(trip.exit());assert(firstDrive(tripCar).completed);assert.equal(memory.size,1)
console.log('Passed mission stop detection, final exit, and isolated completion record.')
const parked=newDrive({...rig,x:4.92,z:12})
advance(parked,1.25,control(1,0,-1));assert(parked.speed>4&&parked.x<4&&parked.z<10)
console.log('Passed full-lock pull-out from the actual close-curb parking position.')
