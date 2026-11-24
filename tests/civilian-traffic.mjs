import assert from 'node:assert/strict'
import {Group,Scene} from 'three'
import {test} from 'node:test'
import {civilianTraffic} from '../src/civilian-traffic.js'
import {clearPose,nearBody,overlapsCar} from '../src/driving.js'
import {vehicles} from '../src/vehicles.js'

const rig=()=>({...vehicles.sport,setup:vehicles.sport,root:new Group(),driver:new Group(),
 updatePose(car){this.root.position.set(car.x,0,car.z)}})

test('civilian cars follow lanes, cross the junction and respect moving bodies',()=>{
 const rigs=Array.from({length:4},rig),traffic=[]
 const boxes=[[-6.95,-2.75,-59.11,-54.89,1.65]]
 const ai=civilianTraffic(new Scene(),boxes,traffic,rigs)
 let max=0,maxSpeed=0,crossed=false,turned=false
 const player={x:7,z:-29},walkers=[player,{x:1.46,z:-17}]
 for(let frame=0;frame<7200;frame++){
  ai.update(1/60,player,{enabled:true,limit:3,walkers})
  max=Math.max(max,traffic.length)
  for(const [i,car] of traffic.entries()){
   assert(clearPose(car,boxes))
   assert(!walkers.some(p=>nearBody(car,p.x,p.z,.355)))
   assert(traffic.slice(i+1).every(other=>!overlapsCar(car,other)))
   maxSpeed=Math.max(maxSpeed,car.speed)
   if(Math.hypot(car.x,car.z+37)<3)crossed=true
   if(car.x< -10&&Math.abs(Math.sin(car.heading))>.9)turned=true
  }
 }
 assert.equal(max,3)
 assert(maxSpeed>5&&crossed&&turned,{maxSpeed,crossed,turned})
 const regular={...vehicles.touring}
 traffic.unshift(regular)
 ai.update(1/60,player,{enabled:false,walkers})
 assert.deepEqual(traffic,[regular])
 assert(rigs.every(r=>!r.root.visible))
})

test('a civilian anticipates a crossing and a stationary car, then leaves distant streets',()=>{
 const traffic=[],scene=new Scene(),ai=civilianTraffic(scene,[],traffic,[rig()])
 const player={x:7,z:-30}
 const walkers=[]
 for(let i=0;i<100&&!traffic.length;i++)ai.update(1/60,player,{enabled:true,walkers})
 const car=traffic[0]
 const dx=Math.sin(car.heading),dz=-Math.cos(car.heading)
 const person={x:car.x+dx*14,z:car.z+dz*14}
 walkers.push(person)
 for(let i=0;i<360;i++)ai.update(1/60,player,{enabled:true,walkers})
 assert(car.speed<.3)
 assert(!nearBody(car,person.x,person.z,.42))
 walkers.length=0
 const obstacle={...vehicles.sport,x:person.x+dx*3,z:person.z+dz*3,heading:car.heading}
 traffic.unshift(obstacle)
 for(let i=0;i<270;i++)ai.update(1/60,player,{enabled:true,walkers})
 assert(car.speed<.3&&!overlapsCar(car,obstacle))
 traffic.shift()
 let fastest=0
 for(let i=0;i<240;i++){
  ai.update(1/60,player,{enabled:true,walkers})
  fastest=Math.max(fastest,car.speed)
 }
 assert(fastest>3)
 ai.update(1/60,{x:1000,z:1000},{enabled:true,walkers})
 assert.equal(traffic.length,0)
})
