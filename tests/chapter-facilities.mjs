import assert from 'node:assert/strict'
import {test} from 'node:test'
import {Scene,Vector3} from 'three'
import {buildChapterBuildings} from '../src/chapter-buildings.js'
import {chapterRoadRoute} from '../src/chapter-route.js'
import {facilityFloor,factory,hideout,hotel,marina,parking,workshop} from '../src/chapter-sites.js'
import {cargoLaunch,cargoRoute,pursueCargoBoat,quaySkiff} from '../src/chapter-sea.js'
import {boatExit,boatPoseClear,boardableBoats,createBoats} from '../src/coastal-motion.js'
import {cargoLadder,inPier} from '../src/coast-plan.js'
import {clearPose} from '../src/driving.js'
import {canWalk,movePlayer} from '../src/navigation.js'

globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})}
const boxes=[]
buildChapterBuildings(new Scene(),(...bounds)=>boxes.push(bounds),{street:[],architecture:[]})
const cruiser={width:1.82,length:4.35,height:1.45}

test('the getaway car has a continuous surfaced route from the roof to Basin Crossing',()=>{
 const route=chapterRoadRoute(parking.getaway)
 const target={...cruiser,...route.sample(0)}
 assert.ok(target.lift>6)
 let distance=0
 for(let i=0;i<Math.ceil(route.length/.15)+1;i++){
  const next=route.drive(target,distance,.15,boxes,[target])
  assert.ok(next>distance||distance===route.length,'vehicle stopped at route distance '+distance)
  distance=next
 }
 assert.equal(distance,route.length)
 assert.ok(target.lift<.2)
 assert.ok(clearPose({...cruiser,x:workshop.bay.x,z:workshop.bay.z,heading:Math.PI,lift:0},boxes,true,true))
})

function follow(walker,route){
 for(const [x,z] of route){
  for(let i=0;i<500;i++){
   const dx=x-walker.x,dz=z-walker.z,dist=Math.hypot(dx,dz)
   if(dist<.07)break
   const step=Math.min(.12,dist)/dist
   movePlayer(walker,dx*step,dz*step,boxes,undefined,walker.y)
   walker.y=facilityFloor(walker.x,walker.z,walker.y)??.083
  }
  assert.ok(Math.hypot(walker.x-x,walker.z-z)<.2,`blocked near ${x}, ${z}: ${walker.toArray()}`)
 }
}

test('the first and second garage ramps can be walked without crossing solid floors',()=>{
 const walker=new Vector3(-134.5,.083,174.8)
 follow(walker,[[-134.5,152.5],[-114.55,152.5],[-114.55,171.7],[-121,171.7]])
 assert.ok(walker.y>6.3)
 assert.ok(canWalk(workshop.desk.x,workshop.desk.z,boxes,.32,workshop.desk.y))
 const stairs=new Vector3(-140.06,.083,171.8)
 follow(stairs,[[-140.06,151.7],[-134.2,151.7],[-134.2,152.36]])
 assert.ok(stairs.y>3.2)
})

test('both hotel floors connect through real stairs and a separate service exit',()=>{
 const walker=new Vector3(hotel.entry.x,.083,hotel.entry.z)
 follow(walker,[[-130.3,191.2],[-138,191.2],[-138,201.45],[-134.6,200.15],[-127.75,197],[-127.75,193.7]])
 assert.ok(Math.abs(walker.y-hotel.floor)<.05)
 follow(walker,hotel.route.map(p=>[p.x,p.z]))
 assert.ok(walker.y<.15)
 follow(walker,[[-115.65,196.9],[-115.25,199.3],[hotel.shelter.x,hotel.shelter.z]])
 assert.ok(walker.distanceTo(new Vector3(hotel.shelter.x,.083,hotel.shelter.z))<.2)
})

test('the reactive cargo launch berths with a usable exit at low and high pursuit pressure',()=>{
 for(const close of [false,true]){
  const boats=createBoats([cargoLaunch,quaySkiff]),target=boats[2]
  target.disabled=false
  let next=0
  for(let frame=0;frame<2400&&next<cargoRoute.length;frame++){
   next=pursueCargoBoat(target,next,close?{x:target.x-9,z:target.z}:null,boats,1/60)
   assert.ok(boatPoseClear(target,boats))
  }
  assert.equal(next,cargoRoute.length)
  assert.equal(boatExit(target,inPier,boats)?.dry,true)
 }
})
test('the platform connects to cargo storage and provides a backup skiff and swim ladder',()=>{
 const boats=createBoats([cargoLaunch,quaySkiff]),backup=boats[3]
 const walker=new Vector3(marina.berth.x,.12,marina.berth.z)
 follow(walker,[[125.7,191.2],[127.48,193.94],[marina.storage.x,marina.storage.z]])
 backup.disabled=false
 assert.ok(boatPoseClear(backup,boats))
 assert.equal(boardableBoats({x:backup.x,z:192.3},boats,false)[0],backup)
 assert.equal(boatExit(backup,inPier,boats)?.dry,true)
 assert.ok(inPier(cargoLadder.x,cargoLadder.deckZ,.32))
})

test('the foundry has three playable entrances, a second-floor office, and a drivable getaway',()=>{
 for(const [start,entry,next] of [
  [[-169.4,148.75],factory.front,[-169.4,155.1]],
  [[-186,163.2],factory.flank,[-179.8,163.2]],
  [[-155.75,177.3],factory.rear,[-155.75,169.6]]
 ]){
  const walker=new Vector3(start[0],.083,start[1])
  follow(walker,[[entry.x,entry.z],next])
 }
 const upstairs=new Vector3(-161.4,.083,159.65)
 follow(upstairs,[[-161.4,172.7],[-155.05,172.7],[-154.1,156.44],[-154.75,154.38],[-153.25,154.32]])
 assert.ok(upstairs.y>3.2)
 const route=chapterRoadRoute(factory.getaway),car={...cruiser,...route.sample(0)}
 let at=0
 for(let i=0;i<Math.ceil(route.length/.15);i++){
  const next=route.drive(car,at,.15,boxes,[car])
  assert.ok(next>at,'blocked at '+Object.values(car).slice(0,7).join(', '))
  at=next
 }
 assert.equal(at,route.length)
})
test('Breakwater Yard parking and mission interactions are physically reachable',()=>{
 const walker=new Vector3(hideout.entry.x,.083,hideout.entry.z)
 follow(walker,[[-166.5,191],[-169.3,195],[-169.0,194.7],[-170.5,194.0],[-172.3,193.75],
  [hideout.rest.x,hideout.rest.z]])
 for(const point of [hideout.meeting,hideout.armory,hideout.desk])assert.ok(canWalk(point.x,point.z,boxes,.32,point.y),point.label)
 assert.ok(clearPose({...cruiser,x:hideout.parking.x,z:hideout.parking.z,lift:0,heading:Math.PI},boxes,true,true))
})
