import assert from 'node:assert/strict'
import {test} from 'node:test'
import {Raycaster, Scene, Texture, Vector3} from 'three'
import {buildNewBloodClub} from '../src/new-blood-club.js'
import {clubCeilingAt,clubDoors,clubFloorAt,clubGround,clubPlan,insideClub} from '../src/new-blood-club-plan.js'
import {canWalk,movePlayer} from '../src/navigation.js'
import {buildOldTown} from '../src/old-town.js'
import {createTerraceDoors} from '../src/terrace-doors.js'
import {worldColliders} from '../src/world-colliders.js'

const canvasContext=new Proxy({}, {get:()=>()=>canvasContext})
globalThis.document={createElement:()=>({getContext:()=>canvasContext})}

function clubWorld(){
 const scene=new Scene(),boxes=worldColliders()
 const add=(...bounds)=>boxes.push(bounds)
 const maps={architecture:Array.from({length:5},()=>new Texture()),street:Array.from({length:5},()=>new Texture())}
 buildOldTown(scene,add,boxes,maps)
 const update=buildNewBloodClub(scene,add,maps)
 const doors=createTerraceDoors(scene,boxes,undefined,clubDoors)
 return {scene,boxes,doors,update}
}

function walkRoute(player,route,world){
 for(const target of route){
  for(let i=0;i<600;i++){
   const dx=target.x-player.x,dz=target.z-player.z,length=Math.hypot(dx,dz)
   if(length<.025)break
   const step=Math.min(.055,length)/length
   world.doors.update(1/60,player,[])
   movePlayer(player,dx*step,dz*step,world.boxes,undefined,player.y)
   player.y=insideClub(player.x,player.z)?clubFloorAt(player.x,player.z):.083
  }
  assert(Math.hypot(target.x-player.x,target.z-player.z)<.031,`blocked at ${player.x}, ${player.z} going to ${target.x}, ${target.z}`)
 }
}

test('Lantern Room connects the public entrance to the VIP room and automatic rear exit',()=>{
 const world=clubWorld(),player={...clubPlan.entry,y:.083}
 assert(!canWalk(-168,92.6,world.boxes,.32,.083),'closed entrance blocks the street')
 const [front]=world.doors.candidates(player)
 assert.equal(front.r.title,clubPlan.title)
 assert(world.doors.toggle(player,front))
 walkRoute(player,clubPlan.routes.vip,world)
 assert(insideClub(player.x,player.z))
 assert.equal(player.y,clubGround)
 walkRoute(player,clubPlan.routes.rear,world)
 assert(!insideClub(player.x,player.z))
 assert(world.doors.doors.find(d=>d.r===clubDoors[1]).progress>.95)
})

test('the bar, stage, restroom, and mission approach points are on connected walkable surfaces',()=>{
 const world=clubWorld()
 const player={...clubPlan.dance,y:clubGround}
 walkRoute(player,[clubPlan.bar,{x:-171.31,z:88.3},{x:-171.31,z:85.62},{x:-176.69,z:85.62},clubPlan.utility],world)
 walkRoute(player,[{x:-176.69,z:85.62},{x:-171.31,z:85.62},{x:-168.2,z:85.62},{x:-168.2,z:83.9}],world)
 assert(player.y>.3,'stairs reach the stage')
 walkRoute(player,[{x:-168.2,z:87.2},{x:-164.15,z:87.1},{x:-160.2,z:86.85},{x:-160.2,z:84.75},clubPlan.toilets],world)
 assert.equal(player.y,clubGround)
 assert(clubCeilingAt(player.x,player.z)<clubCeilingAt(clubPlan.dance.x,clubPlan.dance.z))
 for(const [i,from] of clubPlan.actors.streetAmbush.entries()){
  const outside={...from,y:.008}
  walkRoute(outside,clubPlan.routes.street[i],world)
  assert(!insideClub(outside.x,outside.z)&&Math.hypot(outside.x-clubPlan.exit.x,outside.z-clubPlan.exit.z)<6,
   `street path ${i+1} reaches the rear apron from outside`)
 }
 for(const point of [clubPlan.actors.jack,clubPlan.actors.reception,clubPlan.actors.victor,clubPlan.recovery,...clubPlan.actors.ambushCover]){
  assert(canWalk(point.x,point.z,world.boxes,.32,clubGround),`${point.x}, ${point.z}`)
 }
})

test('the stage and main club floor agree with scene geometry',()=>{
 const {scene,update}=clubWorld()
 update(clubPlan.dance,1.5)
 const club=scene.getObjectByName(clubPlan.title)
 assert(club)
 club.updateMatrixWorld(true)
 const ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0)
 for(const z of [83.9,84.65,84.89,85.12,85.5,87.5,90.5]){
  ray.set(origin.set(-167.6,1.5,z),down)
  const [hit]=ray.intersectObject(club,true)
  assert(hit&&Math.abs(hit.point.y-clubFloorAt(-167.6,z))<.015,`surface height at z=${z}`)
 }
})
