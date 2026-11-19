import assert from 'node:assert/strict'
import {createFootwork} from '../src/footwork.js'
import {movePlayer} from '../src/navigation.js'
const f=createFootwork()
assert.equal(f.rate(false,0),1.85);f.shift();assert(Math.abs(f.rate(false,0)-6.8)<1e-8);f.shift()
assert(Math.abs(f.rate(false,1)-6.8)<1e-8);assert(f.rate(false,.8)>1.85)
f.changePreference();assert(Math.abs(f.rate(true,0)-6.8)<1e-8)
for(const fps of [20,60,120]){
 const feet=createFootwork(),p={x:0,z:0};assert(feet.jump());let peak=0
 for(let i=0;i<fps;i++){feet.advance(1/fps);peak=Math.max(peak,feet.height);if(feet.air)assert(!feet.jump());movePlayer(p,0,4/fps,[[-1,1,1,2,3]])}
 assert(peak>.98&&peak<1.01);assert.equal(feet.height,0);assert(!feet.air);assert(p.z<.69)
}
console.log('Sprint preferences, stick intensity, jump trajectory, lockout, landing and airborne wall collision passed.')
