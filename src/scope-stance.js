const proneSeconds=2,eyeSeconds=.24

export function scopeStance(){
 let prone=0,eye=0
 return {
  get prone(){return prone},get eye(){return eye},
  update(dt,aiming){
   if(!aiming){prone=Math.max(0,prone-dt/.44);eye=0;return}
   const lowering=Math.min(dt,(1-prone)*proneSeconds)
   prone=Math.min(1,prone+lowering/proneSeconds)
   eye=Math.min(1,eye+(dt-lowering)/eyeSeconds)
  }
 }
}
