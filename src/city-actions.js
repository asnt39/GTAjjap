// Candidates expose an approach point. Nearby panels and actions share the same
// reach checks, whether activated from the keyboard or HUD.
export function nearbyActions(spots,pos,yaw,visible){
 const nearby=[]
 const fx=Math.sin(yaw),fz=-Math.cos(yaw)
 for(const spot of spots){
  const dx=spot.x-pos.x,dz=spot.z-pos.z,dist=Math.hypot(dx,dz)
  if(dist>(spot.range??1.58)||Math.abs(pos.y-(spot.floor??.083))>.62)continue
  if(spot.fromZ&&(pos.z-spot.z)*spot.fromZ<-.13)continue
  const alignment=(dx*fx+dz*fz)/Math.max(.01,dist)
  if(dist>.45&&alignment<-.28)continue
  const cost=dist+(1-alignment)*.35
  if(visible(spot))nearby.push({spot,cost})
 }
 return nearby.sort((a,b)=>a.cost-b.cost).map(({spot})=>spot)
}

export const nearbyAction=(...args)=>nearbyActions(...args)[0]??null

export function cityAction(){
 let current=null
 return {
  get current(){return current},
  begin(spot,commit){
   if(current)return false
   const duration={drink:1.25,eat:1.48,rest:2.7,sit:Infinity}[spot.pose]
   current={spot,commit,duration,time:0,standing:false,weight:0}
   return true
  },
  stop(){current=null},
  leave(){
   if(!current)return
   if(current.spot.pose==='sit'){current.standing=true;return}
   current=null
  },
  update(dt){
   if(!current)return
   const a=current
   a.time+=dt
   if(a.spot.pose==='sit'){
    a.weight=Math.max(0,Math.min(1,a.weight+(a.standing?-1:1)*dt*2.6))
    if(a.standing&&!a.weight)current=null
   }else if(a.time>=a.duration){
    current=null
    a.commit()
   }else a.weight=Math.min(1,a.time*4,(a.duration-a.time)*4)
  }
 }
}
