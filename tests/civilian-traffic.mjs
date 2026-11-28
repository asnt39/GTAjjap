import assert from 'node:assert/strict'
import {Group,Scene} from 'three'
import {test} from 'node:test'
import {civilianTraffic} from '../src/civilian-traffic.js'
import {cityTrafficCircuits} from '../src/city-traffic-plan.js'
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

test('four active cars clear an obstructed junction after its exit opens without despawning in view',()=>{
 const traffic=[],ai=civilianTraffic(new Scene(),[],traffic,Array.from({length:4},rig))
 const player={x:9,z:-35},block={...vehicles.van,x:-12,z: -39.74,heading:-Math.PI/2,speed:0}
 traffic.push(block)
 const options={enabled:true,limit:4,walkers:[player]}
 for(let i=0;i<680;i++)ai.update(1/60,player,options)
 assert.equal(traffic.length,5)
 const present=new Set(traffic.filter(v=>v!==block))
 traffic.splice(traffic.indexOf(block),1)
 const traveled=new Map(),prior=new Map([...present].map(v=>[v,{x:v.x,z:v.z}]))
 for(let i=0;i<1600;i++){
  ai.update(1/60,player,{...options,inView:()=>true})
  for(const [j,v] of traffic.entries()){
   assert(present.has(v))
   assert(!traffic.slice(j+1).some(other=>overlapsCar(v,other)))
   const old=prior.get(v),step=Math.hypot(v.x-old.x,v.z-old.z)
   assert(step<.23)
   traveled.set(v,(traveled.get(v)??0)+step);old.x=v.x;old.z=v.z
  }
 }
 assert.equal(traffic.length,4)
 assert([...traveled.values()].every(metres=>metres>23),JSON.stringify([...traveled.values()]))
})

test('mixed civilian traffic clears dock turns without a stuck queue or visible replacement',()=>{
 for(const [count,parked] of [[4,true],[8,false],[8,true]]){
  const traffic=[],rigs=Array.from({length:count},(_,i)=>{
   const setup=[vehicles.sport,vehicles.van,vehicles.touring][i%3]
   return {...setup,setup,root:new Group(),updatePose(){}}
  })
  const obstruction={...vehicles.van,x:-12,z:-39.74,heading:-Math.PI/2,speed:0}
  if(parked)traffic.push(obstruction)
  const ai=civilianTraffic(new Scene(),[],traffic,rigs)
  const player={x:9,z:-35},lastMovement=new Map(),seen=new Set()
  for(let n=0;n<8100;n++){
   if(parked&&n===28*60)traffic.splice(traffic.indexOf(obstruction),1)
   ai.update(1/60,player,{enabled:true,walkers:[],inView:()=>n>=24*60})
   const live=traffic.filter(car=>car!==obstruction)
   assert(live.filter(car=>car.speed<-.16).length<=1)
   if(n>=33*60){
    for(const [i,car] of live.entries()){
     assert(clearPose(car,[]))
     assert(!live.slice(i+1).some(other=>overlapsCar(car,other)))
     if(!lastMovement.has(car)||Math.abs(car.travel)>.0033)lastMovement.set(car,n)
     assert(n-lastMovement.get(car)<20*60,`stuck at ${car.x},${car.z}, count=${count}`)
     seen.add(car)
    }
    assert.equal(live.length,count)
    assert.equal(seen.size,count)
   }
  }
 }
})

const crossing={x:0,z:-37},observer={x:8,z:-23}
function crossingLane(dx,dz,{curves=true}={}){
 const nodes=Array.from({length:35},(_,i)=>({x:crossing.x+(i-13)*3*dx,z:crossing.z+(i-13)*3*dz,
  dx,dz,curve:curves&&i>=11&&i<=15,edges:[]}))
 for(const [i,node] of nodes.entries())node.edges=[nodes[(i+1)%nodes.length]]
 return {entries:[nodes[3]],nextNode:node=>node.edges[0],junction:{...crossing},turnarounds:[]}
}

test('separate traffic controllers take turns at a shared intersection',()=>{
 const traffic=[],scene=new Scene()
 const systems=[crossingLane(1,0),crossingLane(0,1)].map((options,i)=>civilianTraffic(scene,[],traffic,[rig()],{...options,idPrefix:'crossing-'+i}))
 const approached=new Set(),cleared=new Set()
 for(let frame=0;frame<1200;frame++){
  for(const system of systems)system.update(1/60,observer,{enabled:true,walkers:[]})
  const entered=traffic.filter(car=>Math.hypot(car.x-crossing.x,car.z-crossing.z)<9)
  assert(entered.length<=1,`Both controllers entered at frame ${frame}`)
  for(const car of traffic){
   if(entered.includes(car))approached.add(car)
   if(approached.has(car)&&Math.max(car.x-crossing.x,car.z-crossing.z)>14)cleared.add(car)
  }
  if(cleared.size===2)break
 }
 assert.equal(cleared.size,2,JSON.stringify(traffic.map(({id,x,z,speed})=>({id,x,z,speed}))))
})

test('a car whose light turns red before the stop line waits for green',()=>{
 const traffic=[],options={enabled:true,walkers:[]}
 let green=true
 const ai=civilianTraffic(new Scene(),[],traffic,[rig()],{...crossingLane(0,1),canEnter:()=>green})
 for(let frame=0;frame<450&&(traffic[0]?.z??-Infinity)<-50.75;frame++)ai.update(1/60,observer,options)
 const car=traffic[0]
 assert(car.z>=-50.75&&car.z< -50.55)
 green=false
 for(let frame=0;frame<180;frame++){
  ai.update(1/60,observer,options)
  assert(car.z< -47,`Entered on red at ${car.z}`)
 }
 assert(car.speed<.1)
 green=true
 for(let frame=0;frame<450&&car.z< -23;frame++)ai.update(1/60,observer,options)
 assert(car.z>=-23)
})

test('a through lane waits outside a junction while its downstream lane is full',()=>{
 const blocker={...vehicles.van,x:0,z:-21,heading:Math.PI,speed:0}
 const traffic=[blocker],options={enabled:true,walkers:[],inView:car=>car!==blocker&&traffic.includes(car)}
 const ai=civilianTraffic(new Scene(),[],traffic,[rig()],{
  ...crossingLane(0,1,{curves:false}),junction:null,junctions:[{...crossing,priority:true}]
 })
 for(let frame=0;frame<480;frame++)ai.update(1/60,observer,options)
 const car=traffic[1]
 assert(car.z< -47&&car.speed<.1,`Queued at ${car.z}, speed ${car.speed}`)
 traffic.shift()
 for(let frame=0;frame<450&&car.z< -21;frame++)ai.update(1/60,observer,options)
 assert(car.z>=-21)
})

test('South Basin traffic can drive both collector links through the Spire Street circuit',()=>{
 const layouts=cityTrafficCircuits(),traffic=[],scene=new Scene(),player={x:-74,z:165}
 const systems=layouts.map((layout,i)=>civilianTraffic(scene,[],traffic,Array.from({length:4},rig),{
  entries:layout.entries,nextNode:layout.next,junction:null,junctions:layout.junctions,idPrefix:'spire-'+i
 }))
 const links=new Set()
 for(let frame=0;frame<3600&&links.size<3;frame++){
  for(const system of systems)system.update(1/60,player,{enabled:true,walkers:[]})
  for(const [index,car] of traffic.entries()){
   assert(clearPose(car,[]))
   assert(!traffic.slice(index+1).some(other=>overlapsCar(car,other)))
   if(car.speed<1)continue
   if(car.x< -87&&car.z>151&&car.z<176)links.add('Spire Street')
   if(car.x> -82&&car.x< -44&&car.z>140&&car.z<149)links.add('Basin Crossing')
   if(car.x> -82&&car.x< -44&&car.z>176&&car.z<185)links.add('Garden Crossing')
  }
 }
 assert.equal(links.size,3,[...links].join(', '))
})
