import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createWanted} from '../src/wanted.js'

test('civilian fatalities are counted once and escalate at multiples of three',()=>{
 const wanted=createWanted(),point={x:1,z:2}
 for(let i=1;i<=12;i++){
  const person={}
  wanted.civilianDeath(person,point)
  assert.equal(wanted.civilianDeath(person,point),false)
  assert.equal(wanted.level,Math.min(3,Math.floor(i/3)))
 }
 wanted.clear()
 assert.equal(wanted.level,0)
 wanted.report(point,2)
 assert.equal(wanted.level,2)
})
