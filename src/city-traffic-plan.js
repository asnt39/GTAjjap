import {roadCircuit} from './basin-navigation.js'
import {basinRoads} from './south-basin-plan.js'

const basinCentre=id=>basinRoads.find(road=>road.id===id).mid
const basinAvenue=basinCentre('bridge-approach')
const switchyard=basinCentre('switchyard-road')
const basinCrossing=basinCentre('basin-crossing')
const gardenCrossing=basinCentre('garden-crossing')
const spireStreet=basinCentre('spire-street')
const southTurn=basinCentre('south-turn')
const lane=1.67

// Named crossings along the connected street grid. Routes stay on the
// inside lane of each turn and leave district boundaries on paved links.
const circuits=[
 [[1.67,-39.74],[-69.8,-39.74],[-69.8,110.65],[-33.3,110.65],[-33.3,85.65],[1.67,85.65]],
 [[-66.4,21.3],[-188.7,21.3],[-188.7,130.45],[-149.4,130.45],[-149.4,102.1],[-66.4,102.1]],
 [[basinAvenue-lane,113.3],[basinAvenue-lane,southTurn-lane],[switchyard+lane,southTurn-lane],
  [switchyard+lane,basinCrossing+lane],[19.67,basinCrossing+lane],[19.67,113.3]],
 [[switchyard+lane,basinCrossing-lane],[spireStreet-lane,basinCrossing-lane],
  [spireStreet-lane,gardenCrossing+lane],[switchyard+lane,gardenCrossing+lane]]
]

const priority=(x,z)=>({x,z,priority:true})
const junctions=[
 [priority(-68,23),priority(-68,100.5),priority(0,84)],
 [],
 [priority(basinAvenue,115),priority(basinAvenue,basinCrossing),
  priority(switchyard,basinCrossing),priority(switchyard,gardenCrossing)],
 []
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
 const [central,west,basin,spire]=layouts.map(layout=>layout.nodes)
 connect(nearest(central,-69.8,15,0,1),nearest(west,-78,21.3,-1,0),4.6,5.15)
 connect(nearest(west,-76,102.1,1,0),nearest(central,-69.8,104.5,0,1),3.7,1.9)
 connect(nearest(central,-9,85.65,1,0),nearest(basin,-1.67,124,0,1),8.5,29)
 connect(nearest(basin,9,113.3,-1,0),nearest(central,1.67,73,0,-1),7.5,31)
 // The two Basin routes share the existing northbound lane between the
 // collectors. The fork continues west, or keeps the established east turn.
 const fork=nearest(basin,switchyard+lane,154,0,-1)
 const merge=nearest(basin,switchyard+lane,175,0,-1)
 const lastBend=spire.findLastIndex(node=>node.curve)
 spire.splice(lastBend+1)
 spire.at(-1).edges=[merge]
 fork.edges.push(spire[0])
 layouts[3].entries=layouts[3].entries.filter(node=>spire.includes(node))
 for(const [i,layout] of layouts.entries()){
  layout.next=(node,turn)=>node.edges[turn%node.edges.length]
  layout.junctions=junctions[i]
 }
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
