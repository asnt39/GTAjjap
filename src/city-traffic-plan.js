import {roadCircuit} from './basin-navigation.js'

// Named crossings along the connected street grid. Routes stay on the
// inside lane of each turn and leave district boundaries on paved links.
const circuits=[
 [[1.67,-39.74],[-69.8,-39.74],[-69.8,110.65],[-33.3,110.65],[-33.3,85.65],[1.67,85.65]],
 [[-66.4,21.3],[-188.7,21.3],[-188.7,130.45],[-149.4,130.45],[-149.4,102.1],[-66.4,102.1]],
 [[-1.67,113.3],[-1.67,198.6],[-33.7,198.6],[-33.7,146.15],[19.67,146.15],[19.67,113.3]]
]

function nearest(nodes,x,z,dx,dz){
 return nodes.filter(node=>!node.curve&&node.dx*dx+node.dz*dz>.97)
  .sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0]
}

function connect(from,to,approach,departure){
 const a={x:from.x+from.dx*approach,z:from.z+from.dz*approach}
 const b={x:to.x-to.dx*departure,z:to.z-to.dz*departure}
 const count=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/1.2)+2
 let previous=from
 for(let i=1;i<count;i++){
  const t=i/count,u=1-t
  const blend=(s,a,b,e)=>u**3*s+3*u*u*t*a+3*u*t*t*b+t**3*e
  const derivative=(s,a,b,e)=>u*u*(a-s)+2*u*t*(b-a)+t*t*(e-b)
  const dx=derivative(from.x,a.x,b.x,to.x),dz=derivative(from.z,a.z,b.z,to.z),length=Math.hypot(dx,dz)
  const next={x:blend(from.x,a.x,b.x,to.x),z:blend(from.z,a.z,b.z,to.z),
   dx:dx/length,dz:dz/length,curve:i<8,edges:[]}
  previous.edges.push(next);previous=next
 }
 previous.edges.push(to)
}

export function cityTrafficCircuits(){
 const layouts=circuits.map(points=>roadCircuit(points.map(([x,z])=>({x,z})),5.25))
 const [central,west,basin]=layouts.map(layout=>layout.nodes)
 connect(nearest(central,-69.8,15,0,1),nearest(west,-78,21.3,-1,0),4.6,5.15)
 connect(nearest(west,-76,102.1,1,0),nearest(central,-69.8,104.5,0,1),3.7,1.9)
 connect(nearest(central,-9,85.65,1,0),nearest(basin,-1.67,124,0,1),8.5,29)
 connect(nearest(basin,9,113.3,-1,0),nearest(central,1.67,73,0,-1),7.5,31)
 for(const layout of layouts)layout.next=(node,turn)=>node.edges[turn%node.edges.length]
 return layouts
}

const levels=['low','normal','high']
export function trafficPreference(storage){
 let value='normal'
 try{const saved=storage?.getItem('harborline.traffic.v1');if(levels.includes(saved))value=saved}catch{}
 return {
  get label(){return {low:'낮음',normal:'보통',high:'높음'}[value]},
  cycle(){
   value=levels[(levels.indexOf(value)+1)%levels.length]
   try{storage?.setItem('harborline.traffic.v1',value)}catch{}
  },
  limit(capacity,coarse,ms){
   const ratio=value==='low'?.33:value==='normal'?.66:1
   const scaled=Math.max(1,Math.round(capacity*ratio))
   return coarse&&ms>40?Math.max(1,scaled-1):scaled
  }
 }
}

export const marketSignal=elapsed=>elapsed%24<11?'northSouth':elapsed%24>=13&&elapsed%24<22?'eastWest':'allRed'
