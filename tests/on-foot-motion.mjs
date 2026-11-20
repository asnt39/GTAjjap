import assert from 'node:assert/strict'
import {Vector2} from 'three'
import {accelerateOnFoot} from '../src/on-foot-motion.js'

for(const rate of [30,60,120]){
 const dt=1/rate,velocity=new Vector2()
 for(let i=0;i<rate*.1;i++)accelerateOnFoot(velocity,0,6.8,dt)
 assert(velocity.y>1&&velocity.y<1.6)
 for(let i=0;i<rate*.4;i++)accelerateOnFoot(velocity,0,6.8,dt)
 assert.equal(velocity.y,6.8)

 accelerateOnFoot(velocity,0,-6.8,dt)
 assert(velocity.y>0)
 for(let i=1;i<rate*.35;i++)accelerateOnFoot(velocity,0,-6.8,dt)
 assert(velocity.y<-1&&velocity.y>-2)

 velocity.set(0,6.8)
 let distance=0
 for(let i=0;i<rate*.26;i++){
  accelerateOnFoot(velocity,0,0,dt)
  distance+=velocity.length()*dt
 }
 assert.equal(velocity.length(),0)
 assert(distance>.68&&distance<.83)

 velocity.set(0,6.8)
 for(let i=0;i<rate*.16;i++)accelerateOnFoot(velocity,6.8,0,dt)
 assert(velocity.x>1&&velocity.y>4&&velocity.length()<6.8)
}
