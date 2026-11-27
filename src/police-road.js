import {clearPose,overlapsCar,stepDrive} from './driving.js'
import {cityTrafficCircuits} from './city-traffic-plan.js'

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n))
const angleError=(target,current)=>Math.atan2(Math.sin(target-current),Math.cos(target-current))
const range=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const junction={x:0,z:-37},approach=8
const roads=[
 {x:0,z:-1,end:54,lane:d=>1.46+1.12*clamp((d-44)/7,0,1)},
 {x:0,z:1,end:76,lane:d=>1.46+1.12*clamp((d-66)/8,0,1)},
 {x:-1,z:0,end:87,lane:()=>2.74},{x:1,z:0,end:16,lane:()=>2.44}
]
const nodes=[]
function point(x,z,dx,dz){
 const node={id:nodes.length,x,z,dx,dz,edges:[]}
 nodes.push(node)
 return node
}
function link(a,b){a.edges.push(b)}
for(const road of roads){
 const count=Math.ceil((road.end-approach)/3.8)
 const lanePoint=(d,sign)=>point(
  junction.x+road.x*d-road.z*road.lane(d)*sign,
  junction.z+road.z*d+road.x*road.lane(d)*sign,road.x*sign,road.z*sign)
 road.out=[];road.in=[]
 for(let i=0;i<=count;i++){
  const d=approach+(road.end-approach)*i/count
  const a=lanePoint(d,1),b=lanePoint(d,-1)
  if(i){link(road.out.at(-1),a);link(b,road.in.at(-1))}
  road.out.push(a);road.in.push(b)
 }
}
function arc(a,b,handle){
 let previous=a
 const steps=Math.ceil(range(a,b)/1.4)+3
 const c={x:a.x+a.dx*handle,z:a.z+a.dz*handle}
 const d={x:b.x-b.dx*handle,z:b.z-b.dz*handle}
 for(let i=1;i<steps;i++){
  const t=i/steps,u=1-t
  const blend=(a,b,c,d)=>u**3*a+3*u*u*t*b+3*u*t*t*c+t**3*d
  const tangent=(a,b,c,d)=>3*(u*u*(b-a)+2*u*t*(c-b)+t*t*(d-c))
  const dx=tangent(a.x,c.x,d.x,b.x),dz=tangent(a.z,c.z,d.z,b.z),length=Math.hypot(dx,dz)||1
  const node=point(blend(a.x,c.x,d.x,b.x),blend(a.z,c.z,d.z,b.z),dx/length,dz/length)
  node.curve=true;link(previous,node);previous=node
 }
 link(previous,b)
}
for(const road of roads){
 arc(road.out.at(-1),road.in.at(-1),3.55)
 for(const exit of roads)if(exit!==road)arc(road.in[0],exit.out[0],6)
}

function nearest(position,headingWeight,preferAhead=false,network=nodes){
 const dx=Math.sin(position.heading??0),dz=-Math.cos(position.heading??0)
 let winner,score=Infinity
 for(const node of network){
  const angle=1-node.dx*dx-node.dz*dz
  const behind=preferAhead&&((node.x-position.x)*dx+(node.z-position.z)*dz<-.25)
  const cost=range(position,node)+headingWeight*angle+(behind?1.8:0)
  if(cost<score){winner=node;score=cost}
 }
 return winner
}
function route(start,goal){
 // With two squads and a small graph, a simple priority queue suffices.
 const open=[{node:start,cost:0,priority:range(start,goal)}]
 const came=new Map(),costs=new Map([[start,0]])
 while(open.length){
  open.sort((a,b)=>b.priority-a.priority)
  const {node,cost}=open.pop()
  if(node===goal){
   const path=[node]
   while(came.has(path.at(-1)))path.push(came.get(path.at(-1)))
   return path.reverse()
  }
  if(cost!==costs.get(node))continue
  for(const next of node.edges){
   const nextCost=cost+range(node,next)
   if(nextCost>=(costs.get(next)??Infinity))continue
   came.set(next,node);costs.set(next,nextCost)
   open.push({node:next,cost:nextCost,priority:nextCost+range(next,goal)})
  }
 }
 return []
}

// The civilian routes use the same lane geometry and junction turns.
export const civilianTurnarounds=roads.slice(0,3).map(road=>({
 x:junction.x+road.x*road.end,z:junction.z+road.z*road.end,
 curve:road.out.at(-1).edges[0]
}))
export const civilianEntries=roads.slice(0,3).flatMap(road=>road.in.filter((node,index)=>index>=3&&index%3===0))
export function civilianNext(node,turn){
 if(node.edges.length===1)return node.edges[0]
 const allowed=node.edges.filter(next=>{
  // The eastern arm serves the cargo yard and remains patrol-only.
  let end=next
  while(end.curve)end=end.edges[0]
  return end!==roads[3].out[0]
 })
 return allowed[turn%allowed.length]
}

export function policeRoute(start,target,network=nodes){
 return route(nearest(start,5,true,network),nearest(target,2.6,false,network))
}

export function pursuitRoadNetwork(){
 const main=nodes.map(node=>({...node,edges:[]}))
 for(const node of nodes)main[node.id].edges=node.edges.map(edge=>main[edge.id])
 const circuits=cityTrafficCircuits().flatMap(layout=>layout.nodes)
 // The municipal graph and the district loops share the westbound Market lane.
 // Connect at several matching positions so retargeting never requires a jump.
 for(const a of main){
  if(a.curve||a.x>-22||a.x<-60||Math.abs(a.z+39.74)>.2||a.dx>-.96)continue
  const b=circuits.find(n=>!n.curve&&n.dx<-.96&&Math.abs(n.z-a.z)<.35&&n.x<a.x-.36&&a.x-n.x<3.1)
  if(b)a.edges.push(b)
 }
 for(const a of circuits){
  if(a.curve||Math.abs(a.x-1.67)>.15||a.z<19||a.z>38||a.dz>-.96)continue
  const b=main.find(n=>!n.curve&&n.dz<-.96&&Math.abs(n.x-a.x)<.36&&n.z<a.z-.4&&a.z-n.z<4.5)
  if(b)a.edges.push(b)
 }
 return [...main,...circuits]
}

export function roadDriver(car,{network=nodes,top=11.5}={}){
 let wait=0,path=[],cursor=0,goal=null,stalled=0,recover=0,pass=null
 return {
  reset(){wait=0;path=[];cursor=0;goal=null;pass=null;stalled=recover=0},
  step(dt,boxes,traffic,target,{follow=false,park=false}={}){
   wait-=dt
   const next=wait<=0?nearest(target,2.6,false,network):goal
   if(wait<=0){
    wait=.35
    if(next!==goal||!path.length||stalled>1.05){
     goal=next;path=route(nearest(car,5,true,network),goal);cursor=0
    }
   }
   const gap=range(car,target)
   while(cursor<path.length-1){
    const here=path[cursor],along=(here.x-car.x)*here.dx+(here.z-car.z)*here.dz
    if(range(car,here)>.95&&along>-.25)break
    cursor++
   }
   const node=path[cursor]
   let look=node??target
   const lookDistance=Math.min(3.75,1.75+Math.abs(car.speed)*.20)
   for(let i=cursor+1;i<path.length&&range(car,look)<lookDistance;i++)look=path[i]
   // From the staging lane, take the final small offset into the parking bay.
   if(park&&cursor>=path.length-1&&gap<7)look=target
   // A stopped car can occupy a whole lane. Ease around it only when the
   // alternate lane has space for the complete body; normal collision still runs.
   if(pass){
    const remaining=(pass.obstacle.x-car.x)*pass.dx+(pass.obstacle.z-car.z)*pass.dz
    if(remaining<-(car.length+pass.obstacle.length)*.54)pass=null
   }
   if(!pass&&node&&!node.curve&&(!follow||gap>9)&&node.dx*Math.sin(car.heading)-node.dz*Math.cos(car.heading)>.96){
    const {dx,dz}=node
    const obstacle=traffic.find(other=>{
     const x=other.x-car.x,z=other.z-car.z,ahead=x*dx+z*dz
     return other!==car&&Math.abs(other.speed)<.38&&ahead>2.8&&ahead<14&&
      Math.abs(x*dz-z*dx)<(car.width+other.width)*.5+.36
    })
    if(obstacle)for(const side of [-1,1]){
     const x=obstacle.x-dz*side*2.64,z=obstacle.z+dx*side*2.64
     const heading=Math.atan2(dx,-dz)
     const space=[-3.0,0,3.6].every(d=>{
      const pose={...car,x:x+d*dx,z:z+d*dz,heading}
      return clearPose(pose,boxes)&&!traffic.some(other=>other!==car&&overlapsCar(pose,other))
     })
     if(space){pass={obstacle,x,z,dx,dz,retreat:(obstacle.x-car.x)*dx+(obstacle.z-car.z)*dz<6.5};recover=0;break}
    }
   }
   if(pass?.retreat){
    const gap=(pass.obstacle.x-car.x)*pass.dx+(pass.obstacle.z-car.z)*pass.dz
    if(gap>7.4)pass.retreat=false
   }
   if(pass){
    const ahead=(car.x-pass.x)*pass.dx+(car.z-pass.z)*pass.dz+3.25
    look={x:pass.x+pass.dx*ahead,z:pass.z+pass.dz*ahead}
   }
   const error=angleError(Math.atan2(look.x-car.x,car.z-look.z),car.heading)
   const turn=Math.abs(error)
   const bend=node?Math.abs(angleError(Math.atan2(node.dx,-node.dz),car.heading)):0
   const stop=follow?4.8:park?1.6:3
   const limit=Math.min(turn>.53||bend>.62?3.15:pass?4.5:turn>.27||bend>.28?5.5:top,
    Math.sqrt(2*5.5*Math.max(0,gap-stop)))
   // If the last seen position is beyond a drivable terminus, hold the lane
   // and wait for a fresh destination instead of circling or climbing the curb.
   const endOfRoad=follow&&node&&cursor===path.length-1&&range(car,node)<1.65
   const near=gap<stop+.25||endOfRoad
   if(!near&&limit>1.1&&Math.abs(car.speed)<.35)stalled+=dt
   else stalled=0
   if(stalled>1.12){recover=.62;stalled=0;wait=0}
   if(recover>0)recover-=dt
   const reversing=(!!pass?.retreat||recover>0)&&!near
   const steer=clamp(error*1.9,-1,1)
   const brake=near||(!reversing&&car.speed>limit+.7)
   stepDrive(car,{forward:brake||reversing?0:clamp((limit-car.speed)*.42,.09,1),
    back:reversing?.7:0,handbrake:brake,steer:pass?.retreat?0:reversing?-Math.sign(error)*.55:steer},boxes,dt,traffic)
   return near&&Math.abs(car.speed)<.18
  }
 }
}
