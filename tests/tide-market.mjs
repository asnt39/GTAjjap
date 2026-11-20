import test from 'node:test'
import assert from 'node:assert/strict'
import {premises,marketCollision,marketSights,insidePremises} from '../src/market-plan.js'
import {movePlayer,canWalk,cameraFraction} from '../src/navigation.js'
import {streamDistrict} from '../src/district-stream.js'
import {createEpisode} from '../src/episode.js'

test('three walk-in premises connect to the old intersection and block walls and furniture',()=>{
 const boxes=[]
 marketCollision((...bounds)=>boxes.push(bounds))
 const player={x:-9,z:-37}
 for(const room of premises){
  movePlayer(player,room.x-player.x,0,boxes)
  movePlayer(player,0,-14,boxes)
  assert.equal(insidePremises(player.x,player.z)?.id,room.id)
  assert(Math.abs(marketSights.find(s=>s.tag===room.tag).z-player.z)<1e-6)
  for(const [x,z] of room.furnishings)assert.equal(canWalk(room.x+x,-51+z,boxes),false)
  assert(cameraFraction({...player,y:1.6},{x:player.x,y:2,z:-60},boxes)<1)
  movePlayer(player,0,14,boxes)
  assert(Math.abs(player.z+37)<1e-6)
  assert(!insidePremises(player.x,player.z))
 }
})
test('district detail is not attached after departure, uses hysteresis, and is disposed once',async()=>{
 let accept,loads=0,attached=0,disposed=0
 const stream=streamDistrict({enterDistance:10,leaveDistance:20,load:()=>{loads++;return new Promise(r=>{accept=r})},attach:()=>attached++,detach:()=>attached--})
 const finish=async()=>{accept({dispose:()=>disposed++});await new Promise(setImmediate)}
 stream(30);stream(5);stream(16);stream(24);await finish()
 assert.deepEqual([loads,attached,disposed],[1,0,1])
 stream(5);await finish();stream(15);assert.equal(attached,1)
 stream(21);stream(25);assert.deepEqual([loads,attached,disposed],[2,0,2])
})
test('mission choices use resident identity independently of rendered names',()=>{
 const story=createEpisode({storage:null}),speaker={id:'courier',name:'changed'}
 assert.equal(story.choices(speaker)[0].id,'accept')
 assert(!story.interact({resident:{id:'merchant',name:'도현'},choice:'accept'}))
 assert(story.interact({resident:speaker,choice:'accept'}).ok)
 assert.equal(story.snapshot().goal.residentId,'merchant')
})
