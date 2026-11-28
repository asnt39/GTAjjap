import assert from 'node:assert/strict'
import {test} from 'node:test'
import {Scene,Vector3} from 'three'
import {buildChapterBuildings} from '../src/chapter-buildings.js'
import {chapterRoadRoute} from '../src/chapter-route.js'
import {parking,parkingLevel,workshop} from '../src/chapter-sites.js'
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

test('the first and second garage ramps can be walked without crossing solid floors',()=>{
 const walker=new Vector3(-134.5,.083,174.8)
 for(const [x,z] of [[-134.5,152.5],[-114.55,152.5],[-114.55,171.7],[-121,171.7]]){
  for(let i=0;i<500;i++){
   const dx=x-walker.x,dz=z-walker.z,dist=Math.hypot(dx,dz)
   if(dist<.07)break
   const step=Math.min(.12,dist)/dist
   movePlayer(walker,dx*step,dz*step,boxes,undefined,walker.y)
   walker.y=parkingLevel(walker.x,walker.z,walker.y)??.083
  }
  assert.ok(Math.hypot(walker.x-x,walker.z-z)<.2,`blocked near ${x}, ${z}: ${walker.toArray()}`)
 }
 assert.ok(walker.y>6.3)
 assert.ok(canWalk(workshop.desk.x,workshop.desk.z,boxes,.32,workshop.desk.y))
})
