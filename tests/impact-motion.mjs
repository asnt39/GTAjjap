import assert from 'node:assert/strict'
import {test} from 'node:test'
import {crashEvents,crashExit,crashInjury,impulse,moveImpact} from '../src/impact-motion.js'
import {clearPose,nearBody,newDrive,stepDrive} from '../src/driving.js'
import {motorcycleSetup} from '../src/motorcycle.js'
import {vehicles,soloRoadTuning} from '../src/vehicles.js'
import {fighter,combatPose} from '../src/melee.js'
import {canWalk} from '../src/navigation.js'

test('a car crash produces a single hit and a motorcycle ejects into clear space',()=>{
 const walls=[[-6,6,-17,-16,3]]
 for(const setup of [vehicles.touring,motorcycleSetup]){
  const ride=Object.assign(newDrive(setup,setup),{x:0,z:-8,heading:0,speed:15})
  const events=crashEvents()
  let damage
  for(let i=0;i<100&&!damage;i++){
   stepDrive(ride,{forward:1,back:0,steer:0},walls,1/120)
   damage=events(ride,i/120)
   if(damage)assert.equal(events(ride,i/120+.01),null)
  }
  assert(damage&&damage.damage>20&&damage.z>0&&damage.speed>12)
  assert(clearPose(ride,walls))
  assert.equal(damage.eject,!!setup.bike)
  if(setup.bike){
   const exit=crashExit(ride,damage,walls)
   assert(exit&&canWalk(exit.door.x,exit.door.z,walls))
   assert(!nearBody(ride,exit.door.x,exit.door.z))
  }
 }
 assert.deepEqual(crashInjury(2.5),{damage:0,eject:false})
 assert(crashInjury(11,true).damage>crashInjury(11).damage)
})

test('wall contacts cancel the normal impulse and preserve the direction of the fall',()=>{
 const wall=[[-1,.82,2,8,3]]
 const pos={x:1.18,y:.008,z:5}
 const f=fighter(100)
 f.action='knockdown';f.duration=2.5;f.elapsed=.45
 impulse(f,'vehicle',-1,1,55,{face:0,lift:.3})
 for(let i=0;i<80;i++)moveImpact(f,pos,1/60,wall)
 assert(pos.x>=1.14&&pos.z>5.35)
 assert(canWalk(pos.x,pos.z,wall))
 assert.equal(f.motion,null)
 assert(combatPose(f).reaction.lateral<0)
 const punch=fighter(100),shot=fighter(100)
 impulse(punch,'melee',1,0,30);impulse(shot,'shot',1,0,30)
 assert(punch.motion.x>shot.motion.x)
})

test('full-speed offline stopping and driving use the swept vehicle footprint',()=>{
 for(const setup of Object.values(vehicles)){
  const tuning=soloRoadTuning(setup)
  const car=Object.assign(newDrive(setup,setup),{x:0,z:15,heading:0,speed:tuning.top})
  const walls=[[-6,6,-5.02,-5,3]]
  for(let i=0;i<190;i++){
   stepDrive(car,{forward:1,back:0,steer:0},walls,1/120,[],true,undefined,tuning)
   assert(clearPose(car,walls,true,true))
  }
  assert(car.z> -5+car.length/2)
 }
})
