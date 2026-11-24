import {MathUtils} from 'three'

const readyAt=.5, blendAt=.40

export function scopeStance(){
 let time=0
 return {
  get raise(){return MathUtils.smootherstep(time,0,blendAt)},
  get eye(){return MathUtils.clamp((time-blendAt)/(readyAt-blendAt),0,1)},
  update(dt,aiming){
   time=aiming?Math.min(readyAt,time+dt):0
  }
 }
}
