import {archive} from './chart-room.js'
import {front,premises} from './market-plan.js'

// Walking links follow existing pavements, marked crossings and open entrances.
const points={
 gate:{x:-7.45,z:21.4}, westSouth:{x:-7.4,z:30.5}, archiveApron:{x:-9.15,z:archive.door},
 archiveDoor:{x:-11.65,z:archive.door}, charts:{x:-13.55,z:30.7,look:-2.6},
 westGateMeet:{x:-7.35,z:29.5}, eastGateMeet:{x:7.25,z:30.5},
 courierHome:{x:7.6,z:16.2}, eastSouth:{x:7.22,z:23.0},
 counter:{x:-8.9,z:5.4,look:1.52}, shopFront:{x:-7.35,z:5.1}, news:{x:-9.1,z:-.5}, rest:{x:-8.8,z:10.6},
 westWalk:{x:-7.35,z:-18}, westCorner:{x:-7.35,z:-31.8},
 regularHome:{x:-8.3,z:-47}, marketCrossing:{x:-9.5,z:-33.5},
 pierCross:{x:-7.08,z:-37.9}, pierTurn:{x:-7.75,z:-42.6}, marketLane:{x:-12.7,z:-33.5},
 marketEast:{x:-34.5,z:-33.5}, marketWalk:{x:-39.6,z:-44.1},
 promenade:{x:-43.7,z:-44.05}, marketMiddle:{x:-55.9,z:-44.1},
 marketStand:{x:-70.1,z:-44.1}, quayHome:{x:12.1,z:-13},
 quayTurn:{x:11.6,z:-17.5}, quayLookout:{x:12.8,z:-20.6,look:1.18}, quayWalk:{x:8.9,z:-20.1},
 quaySupplies:{x:8.9,z:-9.8}
}
const links=[
 ['gate','westSouth','archiveApron','archiveDoor','charts'],['westSouth','westGateMeet','eastGateMeet','eastSouth','courierHome'],
 ['gate','shopFront','westWalk','westCorner','marketCrossing','marketLane','marketEast','marketWalk','promenade','marketMiddle','marketStand'],
 ['shopFront','counter','news','shopFront','rest','counter'],
 ['marketCrossing','pierCross','pierTurn','regularHome'],['quayHome','quayTurn','quayLookout','quayWalk','quaySupplies','quayHome']
]
for(const [id,interior,west,east] of [
 ['tide-office','tideDesk','promenade','marketMiddle'],
 ['provisions','supplyShelf','marketMiddle','marketStand']
]){
 const {x}=premises.find(p=>p.id===id)
 points[id+'Apron']={x,z:front+1.9}
 points[id+'Door']={x,z:front-.9}
 points[interior]={x,z:-50.65,look:id==='provisions'?-1.4:1.82}
 links.push([west,id+'Apron',east],[id+'Apron',id+'Door',interior])
}

Object.assign(points,{
 clockBench:{x:-50.2,z:56.9},clockSouth:{x:-46.7,z:54.8},clockFront:{x:-47.2,z:49.8,look:-1.38},
 westMail:{x:-116.55,z:46.8,look:1.6},westLane:{x:-116.55,z:53},westSteps:{x:-116.55,z:68.8},
 gardenGate:{x:-163.3,z:49.5},gardenWalk:{x:-163.3,z:45.4},gardenNorth:{x:-167.2,z:43.8,look:-.4},
 ferryDesk:{x:-212,z:106,look:3.1},ferryDoor:{x:-212,z:99},ferrySignal:{x:-208.4,z:99.4,look:.8}
})
links.push(['clockBench','clockSouth','clockFront'],['westMail','westLane','westSteps'],
 ['gardenGate','gardenWalk','gardenNorth'],['ferryDesk','ferryDoor','ferrySignal'])

// A stop includes a reason to pause and a dwell time. The four quest givers
// have local rounds so they stay easy to locate and remain with the same quests.
export const residentRounds={
 foreman:[['charts',6,'check'],['gate',8,'watch'],['westGateMeet',5,'watch']],
 merchant:[['rest',4,'break'],['counter',11,'serve'],['news',4,'check']],
 courier:[['eastGateMeet',3,'check'],['westGateMeet',4,'deliver'],['courierHome',6,'wait']],
 engineer:[['quayLookout',6,'inspect'],['quaySupplies',5,'check'],['quayHome',7,'wait']],
 regular:[['promenade',7,'break'],['tideDesk',5,'visit'],['regularHome',9,'watch']],
 'tide-clerk':[['supplyShelf',6,'shop'],['marketMiddle',4,'check'],['tideDesk',10,'work']],
 'clock-keeper':[['clockBench',5,'break'],['clockFront',8,'check']],
 'west-courier':[['westMail',3,'deliver'],['westSteps',4,'wait']],
 'foundry-gardener':[['gardenNorth',6,'inspect'],['gardenGate',5,'work']],
 'ferry-keeper':[['ferryDesk',8,'work'],['ferrySignal',6,'check']]
}

const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
export function walkingGraph(canLink){
 const edges=new Map(Object.keys(points).map(id=>[id,[]]))
 for(const line of links)for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i]
  if(!canLink(points[a],points[b]))continue
  edges.get(a).push(b);edges.get(b).push(a)
 }
 function path(from,to){
  if(!from||!to)return []
  const ordered=[from], previous=new Map(), costs=new Map([[from,0]])
  while(ordered.length){
   ordered.sort((a,b)=>costs.get(b)-costs.get(a))
   const at=ordered.pop()
   if(at===to){
    const route=[to]
    while(previous.has(route.at(-1)))route.push(previous.get(route.at(-1)))
    return route.reverse().map(id=>({...points[id],id}))
   }
   for(const next of edges.get(at)){
    const cost=costs.get(at)+gap(points[at],points[next])
    if(cost>=(costs.get(next)??Infinity))continue
    costs.set(next,cost);previous.set(next,at)
    if(!ordered.includes(next))ordered.push(next)
   }
  }
  return []
 }
 return {points,path}
}
