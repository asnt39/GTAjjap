import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createCompanion} from '../src/companion.js'
import {canWalk,movePlayer} from '../src/navigation.js'

const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)

function encounter(position,boxes=[],waypoints=[],settings={}){
 let traces=0
 const canStand=(x,z)=>canWalk(x,z,boxes,.32,0)
 const companion=createCompanion({position,waypoints,canStand,...settings,
  move:(p,dx,dz)=>movePlayer(p,dx,dz,boxes,undefined,0),
  canTraverse(from,to){
   traces++
   const segments=Math.ceil(gap(from,to)/.18)
   for(let i=1;i<=segments;i++){
    const t=i/segments
    if(!canStand(from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t))return false
   }
   return true
  }
 })
 return {companion,traces:()=>traces,canStand}
}

test('join closes the gap on foot and settles at formation distance',()=>{
 const position={x:-4,z:0},target={x:4,z:0}
 const {companion}=encounter(position)
 assert.equal(companion.update(.05,{target}).moving,false)
 assert.equal(companion.command('join'),true)
 let furthestStep=0
 for(let i=0;i<130;i++){
  const before={...position}
  const response=companion.update(.05,{target})
  furthestStep=Math.max(furthestStep,gap(before,position))
  assert.ok(Math.abs(response.progress-gap(before,position))<1e-9)
 }
 assert.ok(furthestStep>0&&furthestStep<.25)
 assert.ok(gap(position,target)>=2.1&&gap(position,target)<=2.25)
 assert.equal(companion.update(.05,{target}).speed,0)
})

test('hold and unavailable targets suspend movement until it is possible to follow again',()=>{
 const position={x:-3,z:0},target={x:7,z:0}
 const {companion}=encounter(position)
 companion.command('follow')
 assert.ok(companion.update(.05,{target}).moving)
 companion.command('hold')
 const held={...position}
 assert.equal(companion.command('board'),false)
 assert.equal(companion.update(.05,{target}).mode,'hold')
 companion.command('follow')
 assert.equal(companion.update(.05,{target,enabled:false}).moving,false)
 assert.equal(companion.update(.05,{target:null}).moving,false)
 assert.deepEqual(position,held)
 assert.ok(companion.update(.05,{target}).moving)
})

test('an obstructed follower routes around the wall without crossing its collision boundary',()=>{
 const position={x:-4,z:0},target={x:4,z:0},wall=[-.45,.45,-3.5,1.25,2.3]
 const {companion,canStand}=encounter(position,[wall],[{x:0,z:0},{x:-1.3,z:2},{x:1.3,z:2}])
 companion.command('follow')
 let usedDetour=false
 for(let i=0;i<210;i++){
  const before={...position}
  companion.update(.05,{target})
  usedDetour||=position.z>1.6
  assert.ok(canStand(position.x,position.z))
  assert.ok(gap(before,position)<.25)
 }
 assert.ok(usedDetour)
 assert.ok(position.x>1.6&&gap(position,target)<2.23)
})

test('an unreachable target leaves the follower at safety and is rechecked on a bounded cadence',()=>{
 const position={x:-3,z:0},target={x:3,z:0},boxes=[[-.45,.45,-5,5,2.3]]
 const {companion,traces}=encounter(position,boxes)
 companion.command('follow')
 for(let i=0;i<120;i++)companion.update(1/60,{target})
 assert.deepEqual(position,{x:-3,z:0})
 assert.ok(traces()>1&&traces()<12)
 boxes.pop()
 for(let i=0;i<40;i++)companion.update(1/60,{target})
 assert.ok(position.x>-3)
})

test('a long browser frame cannot move the companion farther than a single collision step',()=>{
 const position={x:-5,z:0},target={x:14,z:0}
 const {companion}=encounter(position)
 companion.command('join')
 const first=companion.update(3,{target})
 assert.ok(first.moving)
 assert.ok(position.x>-5&&position.x<-4.4)
})

test('a route approaches a closed automatic door and resumes when it opens',()=>{
 const position={x:-4,z:0},target={x:4,z:0},boxes=[[-.45,.45,-5,5,2.3]]
 const {companion}=encounter(position,boxes,[{x:-.9,z:0}])
 companion.command('follow')
 for(let i=0;i<60;i++)companion.update(.05,{target})
 assert.ok(position.x>-1.12&&position.x<-.75)
 boxes.pop()
 for(let i=0;i<60;i++)companion.update(.05,{target})
 assert.ok(position.x>1.7)
})

test('configured approach speed and distance work for other encounter roles',()=>{
 const position={x:-4,z:0},target={x:4,z:0}
 const {companion}=encounter(position,[],[],{walkSpeed:1.5,runSpeed:1.5,stopDistance:.5})
 companion.command('follow')
 assert.ok(Math.abs(companion.update(.05,{target}).speed-1.5)<1e-6)
 for(let i=0;i<110;i++)companion.update(.05,{target})
 assert.ok(Math.abs(position.x-3.5)<.03)
})
