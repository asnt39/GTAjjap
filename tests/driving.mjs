import assert from 'node:assert/strict'
import {test} from 'node:test'
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

const {vehicles}=await import('../src/vehicles.js')
const {entryPose,entryTime}=await import('../src/vehicle-entry.js')
const fleet=Object.entries(vehicles).map(([id,setup])=>({id,...newDrive({...setup,x:0,z:48},setup)}))
for(const vehicle of fleet){
 advance(vehicle,2,control(1))
 assert(clearPose(vehicle,[]))
 assert(vehicle.speed>0)
 const stopped={...vehicle,speed:0},door=doorPoint(stopped,-1)
 const access=availableDoor(stopped,door,[])
 assert.equal(access.side,-1)
 const transition={...access,from:door,time:.71}
 const mid=entryPose(stopped,transition,true)
 assert(mid.opening<-.95)
 assert(mid.crouch>0)
 const seated=entryPose(stopped,{...transition,time:entryTime},true)
 assert.equal(seated.opening,0)
 assert.equal(seated.visible,false)
 const exit=entryPose(stopped,{...transition,time:entryTime},false)
 assert.equal(exit.visible,true)
 assert(Math.abs(exit.x-door.x)<1e-9&&Math.abs(exit.z-door.z)<1e-9)
}
assert(fleet[1].speed>fleet[0].speed&&fleet[0].speed>fleet[2].speed)
const vanSetup=vehicles.van,van=newDrive({...vanSetup,x:0,z:23},vanSetup)
const blocker={...vehicles.sport,x:0,z:16}
for(let i=0;i<240;i++)stepDrive(van,control(1),[],1/60,[blocker])
assert(van.z>=blocker.z+(van.length+blocker.length)/2)
assert.equal(van.speed,0)
assert.equal(safeExit(van,[],-1,()=>true),null)
console.log('Passed three distinct acceleration profiles, fleet collision, blocked exit and staged boarding/exit poses.')

test('throttle builds smoothly, then reaches normal driving speed',()=>{
 const car=newDrive(rig)
 advance(car,.05,control(1),120)
 assert(car.speed>0&&car.speed<.09,'full engine torque must not arrive in the first few steps')
 advance(car,2,control(1))
 assert(car.speed>6)
})

test('a quick full-lock input at speed builds yaw progressively',()=>{
 const car=Object.assign(newDrive(rig),{speed:15})
 advance(car,.15,control(1,0,1),120)
 assert(car.heading>.04&&car.heading<.09)
 assert(car.speed>14)
})

test('a glancing wall contact preserves forward travel and prevents overlap',()=>{
 const car=Object.assign(newDrive({...rig,x:.06,heading:.1}),{speed:12})
 const wall=[[1.3,2,-30,60,3]]
 for(let i=0;i<30;i++){
  stepDrive(car,control(1),wall,1/120)
  assert(clearPose(car,wall))
 }
 assert(car.z<22.7)
 assert(car.speed>9)
})

test('head-on wall contact settles close to the wall and allows reversing out',()=>{
 const car=Object.assign(newDrive({...rig,z:13.165}),{speed:15})
 const wall=[[-5,5,10,11,2]]
 const hit=stepDrive(car,control(1),wall,1/120)
 assert(hit>14&&clearPose(car,wall))
 assert(car.z>=13.075&&car.z<13.095)
 assert.equal(car.speed,0)
 advance(car,1,control(0,1),60,wall)
 assert(car.z>13.8&&clearPose(car,wall))
})

test('a player car climbs paved curbs with a bump and retains speed',()=>{
 for(const [x,z] of [[3.5,25],[-32,64],[-60,-34.8]]){
  const acrossMarket=x===-60
  const car=Object.assign(newDrive({...rig,x,z,heading:acrossMarket?Math.PI:Math.PI/2}),{speed:8})
  let impact=0
  for(let i=0;i<39;i++)impact=Math.max(impact,stepDrive(car,control(1),[],1/120,[],true))
  assert((acrossMarket?car.z-z:car.x-x)>2.15,'the near wheels should climb the curb')
  assert(car.speed>5&&impact>.3&&impact<3)
 }
})

test('a player car on a sidewalk still stops at the edge of paved ground',()=>{
 const car=Object.assign(newDrive({...rig,x:7,z:25,heading:Math.PI/2}),{speed:8})
 for(let i=0;i<100;i++)stepDrive(car,control(1),[],1/120,[],true)
 assert(car.x>=8&&car.x+rig.length/2<=10.8)
 assert.equal(car.speed,0)
})

test('a hard collision dents the corresponding end and a low curb leaves the body intact',()=>{
 const car=Object.assign(newDrive(rig),{speed:15,z:13.165})
 stepDrive(car,control(1),[[-5,5,10,11,2]],1/120)
 assert(car.dents['end-1']?.depth>0)
 assert.equal(car.dents['end1'],undefined)
 assert(car.collision.z<car.z)
 const curb=Object.assign(newDrive({...rig,x:3.5,heading:Math.PI/2}),{speed:8})
 for(let i=0;i<50;i++)stepDrive(curb,control(1),[],1/120,[],true)
 assert(curb.lift>0)
 assert.equal(curb.dents,undefined)
})

test('both pedals stop a moving car and hold it at rest',()=>{
 const car=Object.assign(newDrive(rig),{speed:6})
 advance(car,1,control(1,1))
 assert.equal(car.speed,0)
 const stopped=car.z
 advance(car,1,control(1,1))
 assert.equal(car.z,stopped)
})
