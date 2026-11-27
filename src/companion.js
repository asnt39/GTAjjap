const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const valid=point=>!!point&&Number.isFinite(point.x)&&Number.isFinite(point.z)
const routeInterval=.38

function findRoute(from,target,waypoints,canStand,canTraverse){
 const usable=waypoints.filter(point=>valid(point)&&canStand(point.x,point.z))
 const points=[from,...usable,target],goal=points.length-1
 const costs=points.map(()=>Infinity),previous=points.map(()=>-1),visited=new Set()
 costs[0]=0
 let closest=0,closestDistance=distance(from,target)

 while(visited.size<points.length){
  let current=-1
  for(let i=0;i<points.length;i++){
   if(!visited.has(i)&&costs[i]<Infinity&&(current===-1||costs[i]<costs[current]))current=i
  }
  if(current===-1||current===goal)break
  visited.add(current)
  const gap=distance(points[current],target)
  if(gap<closestDistance){closestDistance=gap;closest=current}
  const end=current===0?goal:points.length
  for(let i=1;i<end;i++){
   if(visited.has(i))continue
   const cost=costs[current]+distance(points[current],points[i])
   if(cost>=costs[i]||!canTraverse(points[current],points[i]))continue
   costs[i]=cost;previous[i]=current
  }
 }

 // A reachable approach waypoint lets nearby automatic doors open before the next attempt.
 let last=previous[goal]===-1?closest:previous[goal]
 const route=[]
 while(last>0){route.unshift(points[last]);last=previous[last]}
 return route
}

// The caller's move function owns all position changes and sweeps the actor against live colliders.
export function createCompanion({position,waypoints=[],canStand,move,canTraverse,stopDistance=2.15,walkSpeed=2.55,runSpeed=4.1}){
 let mode='hold',route=[],direct=false,replan=0
 const status=(progress=0,dt=1)=>({x:position.x,z:position.z,moving:progress>.001,mode,progress,speed:progress/dt})

 return {
  get mode(){return mode},
  command(next){
   if(next!=='hold'&&next!=='join'&&next!=='follow')return false
   if(next!==mode){mode=next;replan=0;route=[];direct=false}
   return true
  },
  update(dt,{target,enabled=true}={}){
   if(!enabled||!valid(target)||mode==='hold'){replan=0;return status()}
   if(!Number.isFinite(dt)||dt<=0)return status()
   const stepTime=Math.min(dt,.12)
   replan-=stepTime
   if(replan<=0){
    direct=canTraverse(position,target)
    route=direct?[]:findRoute(position,target,waypoints,canStand,canTraverse)
    replan=routeInterval
   }

   const gap=distance(position,target)
   while(route.length&&distance(position,route[0])<.15)route.shift()
   const next=direct?target:route[0]
   if(!next)return status()
   const dx=next.x-position.x,dz=next.z-position.z,toNext=Math.hypot(dx,dz)
   const remaining=direct?toNext-stopDistance:toNext
   if(remaining<=.015)return status()
   const pace=Math.min(runSpeed,walkSpeed+Math.max(0,gap-stopDistance)*.16)
   const ratio=Math.min(remaining,pace*stepTime)/toNext
   const x=position.x,z=position.z
   move(position,dx*ratio,dz*ratio)
   return status(Math.hypot(position.x-x,position.z-z),stepTime)
  }
 }
}
