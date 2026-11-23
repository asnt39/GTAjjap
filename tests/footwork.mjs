import assert from 'node:assert/strict'
import {test} from 'node:test'
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

// An indoor jump from furniture contacts the ceiling and falls back to the same surface.
const indoor=createFootwork()
indoor.reset(.96)
assert(indoor.jump())
let indoorPeak=0
for(let frame=0;frame<70;frame++){
 indoor.advance(1/60,.96,1.64)
 indoorPeak=Math.max(indoorPeak,indoor.height)
}
assert.equal(indoorPeak,1.64)
assert.equal(indoor.height,.96)
assert(!indoor.air)

test('diagonal movement follows the intended line around a clear exterior corner',()=>{
 const feet={x:.35,z:.12}
 movePlayer(feet,-.09,.08,[[-1,0,-1,0,3]])
 assert(Math.abs(feet.x-.26)<1e-9)
 assert(Math.abs(feet.z-.20)<1e-9)
})

test('landing reports impact and allows another jump after a short recovery',()=>{
 const foot=createFootwork()
 foot.jump()
 let landed
 for(let i=0;i<60&&!landed;i++)landed=foot.advance(1/60)
 assert(landed>4)
 assert(!foot.jump())
 foot.advance(.06)
 assert(foot.land>.25,'landing animation can continue')
 assert(foot.jump())
 assert(!foot.jump())
})
