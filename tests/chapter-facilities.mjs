import assert from 'node:assert/strict'
import {test} from 'node:test'
import {Scene,Vector3} from 'three'
import {buildChapterBuildings} from '../src/chapter-buildings.js'
import {chapterRoadRoute} from '../src/chapter-route.js'
import {facilityFloor,hotel,parking,parkingLevel,workshop} from '../src/chapter-sites.js'
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
