import assert from 'node:assert/strict'
import {createFootwork} from '../src/footwork.js'
import {movePlayer,supportHeight} from '../src/navigation.js'
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

for (const fps of [20,60,120]){
 const feet=createFootwork(), player={x:0,z:0}
 const platform=[-.8,.8,1.0,2.0,.84,true]
 const wall=[-2,2,4,5,3.2,false]
 const boxes=[platform,wall]
 const tick=(dz)=>{
  movePlayer(player,0,dz,boxes,null,feet.height)
  feet.advance(1/fps,supportHeight(player.x,player.z,feet.height,0,[platform]))
 }
 for(let i=0;i<Math.ceil(fps*1.35);i++)tick(1.8/fps)
 assert(player.z<.7)
 assert(feet.jump())
 for(let i=0;i<fps;i++)tick(i<fps*.43?1.5/fps:0)
 assert.equal(feet.height,.84);assert(!feet.air)
 for(let i=0;i<Math.ceil(fps*1.35);i++)tick(1.8/fps)
 assert(player.z>2.32);assert.equal(feet.height,0);assert(!feet.air)
 for(let i=0;i<fps;i++)tick(2/fps)
 assert(player.z<3.69)
}
