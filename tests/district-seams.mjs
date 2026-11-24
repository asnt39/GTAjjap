import assert from 'node:assert/strict'
import {test} from 'node:test'
import {canWalk,movePlayer} from '../src/navigation.js'

test('paved West Bank and Old Town meet between the two connecting roads',()=>{
 const p={x:-85,z:50}
 movePlayer(p,-2,0,[])
 assert(p.x<-86.5,`stopped on the seam at ${p.x}`)
})

test('the land seam fix does not open the edge into unbuilt land or harbor water',()=>{
 assert.equal(canWalk(-86,13.9,[]),false)
 assert.equal(canWalk(24,-65,[]),false)
 assert.equal(canWalk(-226,50,[]),false)
})
