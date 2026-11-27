import assert from 'node:assert/strict'
import {test} from 'node:test'
import {Group,Scene} from 'three'
import {interactionSelection} from '../src/interaction-list.js'
import {civilianTraffic} from '../src/civilian-traffic.js'
import {marketSignal,trafficPreference} from '../src/city-traffic-plan.js'
import {vehicles} from '../src/vehicles.js'
import {newDrive} from '../src/driving.js'

test('all nearby interactions remain available and their selection follows the identity',()=>{
 const picker=interactionSelection()
 const npc={id:'npc',priority:1,distance:1},door={id:'door',priority:2,distance:1.3},car={id:'car',priority:2,distance:.8}
 const initial=picker.update([npc,door,car])
 assert.deepEqual(initial.map(item=>item.id),['car','door','npc'])
 picker.cycle(initial);assert.equal(picker.id,'door')
 picker.update([npc,door,{...car,distance:.2}]);assert.equal(picker.id,'door')
 picker.update([npc,car]);assert.equal(picker.id,'car')
 picker.cycle([car,npc],-1);assert.equal(picker.id,'npc')
 picker.reset();assert.equal(picker.id,null)
})

const rig=()=>({...vehicles.sport,setup:vehicles.sport,root:new Group(),driver:new Group(),updatePose(){}})
test('ambient cars spawn with a driver, transfer once, and never resume AI after handoff',()=>{
 const model=rig(),traffic=[],scene=new Scene(),player={x:5,z:22}
 model.root.add(model.driver)
 const ai=civilianTraffic(scene,[],traffic,[model])
 for(let i=0;i<300&&!traffic.length;i++)ai.update(1/60,player,{enabled:true,walkers:[]})
 assert.equal(traffic.length,1)
 const vehicle=traffic[0],prior=ai.driverFor(vehicle)
 assert.equal(prior.driver,model.driver)
 assert(model.driver.visible)
 const other=ai.claim(vehicle)
 assert.equal(other,prior);assert.equal(ai.claim(vehicle),null)
 assert(model.root.visible&&!model.driver.visible)
 const after={x:vehicle.x,z:vehicle.z}
 for(let i=0;i<600;i++)ai.update(1/60,player,{enabled:true,walkers:[]})
 assert.deepEqual(traffic,[vehicle])
 assert.deepEqual({x:vehicle.x,z:vehicle.z},after)
})

test('existing parked car gains a driver and keeps the original car and rig after handoff',()=>{
 const scene=new Scene(),model=rig(),car={...newDrive(model,model.setup),id:'authored',x:2.2,z:22.3}
 const traffic=[car],policies={seeded:[{rig:model,car}]}
 const ai=civilianTraffic(scene,[],traffic,[],policies)
 const player={x:5,z:24}
 for(let i=0;i<200;i++)ai.update(1/60,player,{enabled:true,walkers:[]})
 assert(ai.driverFor(car));assert.equal(traffic.length,1)
 assert(car.z<22.3)
 ai.claim(car)
 assert.equal(ai.driverFor(car),null)
 assert.deepEqual(traffic,[car])
 assert(model.root.visible&&!model.driver.visible)
})

test('traffic settings persist and scale density, including subsequent touch performance throttling',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}
 const options=trafficPreference(storage)
 assert.equal(options.label,'보통')
 const normal=options.limit(6,false,16)
 options.cycle();const high=options.limit(6,false,16)
 assert.equal(trafficPreference(storage).label,'높음')
 options.cycle();const low=options.limit(6,false,16)
 assert(low<normal&&normal<high)
 assert(options.limit(6,true,46)<options.limit(6,true,16))
 assert.deepEqual([0,12,17,23,24].map(marketSignal),['northSouth','allRed','eastWest','allRed','northSouth'])
})

test('recovery selects nearby dry ground and clears motion without rewriting the journal or health',async()=>{
 const {recoveryPosition,clearStuckMotion}=await import('../src/play-recovery.js')
 const snapshot={cash:1950,items:{coffee:1},mission:'first-work',traffic:'high'}
 const before=structuredClone(snapshot)
 const p=recoveryPosition({x:10,y:0,z:0},null,[{x:0,z:0}],()=>.08,(x,z)=>x>10.9&&z>=0)
 assert(p.x>10.9&&p.x<11.4)
 const saved={x:3,y:2.6,z:4}
 assert.deepEqual(recoveryPosition({x:NaN,y:0,z:0},saved,[],()=>2.6,()=>true),saved)
 const fighter={action:'knockdown',hp:27,armor:5,motion:{x:40},queued:true}
 clearStuckMotion(fighter)
 assert.equal(fighter.action,'');assert.equal(fighter.motion,null);assert.equal(fighter.hp,27);assert.equal(fighter.armor,5)
 assert.deepEqual(snapshot,before)
})

test('requires a linked driver when spawning ordinary game traffic',()=>{
 const missing=rig();delete missing.driver
 const traffic=[],ai=civilianTraffic(new Scene(),[],traffic,[missing],{requireDriver:true})
 for(let i=0;i<400;i++)ai.update(1/60,{x:3,z:22},{enabled:true,walkers:[]})
 assert.deepEqual(traffic,[])
 assert.equal(missing.root.visible,false)
})

test('a saved civilian vehicle is restored as a parked vehicle without reviving its driver',async()=>{
 const {restoreTrafficVehicle}=await import('../src/vehicle-checkpoint.js')
 const traffic=[],model=rig(),ai=civilianTraffic(new Scene(),[],traffic,[model],{requireDriver:true,idPrefix:'demo'})
 model.driver.visible=false
 const unit=ai.savedUnit('demo-0')
 assert(restoreTrafficVehicle(unit.car,{x:1.4,z:19,heading:0},[],traffic))
 ai.reserve(unit);traffic.push(unit.car)
 for(let i=0;i<300;i++)ai.update(1/60,{x:1,z:21},{enabled:true,walkers:[]})
 assert.deepEqual(traffic,[unit.car]);assert.equal(unit.car.z,19)
 assert(model.root.visible&&!model.driver.visible&&!ai.driverFor(unit.car))
})

test('a closed junction signal queues civilian traffic until the phase opens',()=>{
 const traffic=[],scene=new Scene(),player={x:4,z:-36}
 let green=false
 const ai=civilianTraffic(scene,[],traffic,[rig(),rig()],{canEnter:()=>green})
 for(let i=0;i<1800;i++){
  ai.update(1/60,player,{enabled:true,walkers:[]})
  assert(!traffic.some(car=>Math.hypot(car.x,car.z+37)<8))
 }
 assert.equal(traffic.length,2)
 assert(traffic.every(car=>Math.abs(car.speed)<.5))
 green=true
 let crossed=false
 for(let i=0;i<900;i++){
  ai.update(1/60,player,{enabled:true,walkers:[]})
  crossed ||=traffic.some(car=>Math.hypot(car.x,car.z+37)<7)
 }
 assert(crossed)
})
