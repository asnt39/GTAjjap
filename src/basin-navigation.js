import {basinCrossings,basinRoads,basinRoadBounds,insideBasin} from './south-basin-plan.js'
import {within} from './street-plan.js'

export const basinStops={
 'basin.cafe':{x:-12.3,z:100},'basin.terrace':{x:-7.75,z:100,look:.8},
 'basin.registry':{x:9.6,z:101.5},'basin.registry-square':{x:6.21,z:107.1,look:1.2},'basin.registry-door':{x:6.1,z:101.5},
 'basin.cooper':{x:-21.2,z:157},'basin.cooper-gate':{x:-25.4,z:157},
 'basin.coastal-rest':{x:24.8,z:168,look:1.3},'basin.wharf':{x:24.4,z:152.1},
 'basin.garden':{x:15.0,z:195.4},'basin.garden-turn':{x:15,z:187},'basin.south-approach':{x:23.54,z:185},
 'basin.south-walk':{x:23.54,z:187},'basin.south-path':{x:19.5,z:187}
}
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const nearRoad=(x,z)=>basinRoadBounds.some(rect=>within(rect,x,z))
const fromRoad=(r,at,offset)=>r.axis==='z'?{x:r.mid+offset,z:at}:{x:at,z:r.mid+offset}
function walkSegment(a,b){
 const steps=Math.ceil(gap(a,b)/.4)
 for(let i=1;i<steps;i++){
  const t=i/steps
  if(nearRoad(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false
 }
 return true
}
export function basinWalkLayout(){
 const points={...basinStops},links=[]
 const walks=[]
 for(const r of basinRoads)for(const side of [-1,1]){
  const crossings=basinCrossings.filter(c=>c.axis===r.axis&&c.mid===r.mid)
  const axis=new Set([r.from+.70,r.to-.70,...crossings.map(c=>c.at)])
  for(let t=r.from+1.8;t<r.to-1;t+=2.9)axis.add(t)
  let prior
  for(const at of [...axis].sort((a,b)=>a-b)){
   const point=fromRoad(r,at,side*(r.width/2+(r.id==='bridge-approach'?.70:1.03)))
   if(!insideBasin(point.x,point.z)||nearRoad(point.x,point.z)){prior=null;continue}
   const id='basin.'+r.id+':'+side+':'+at.toFixed(3)
   points[id]=point;walks.push(id)
   if(prior&&walkSegment(points[prior],point))links.push([prior,id])
   prior=id
  }
 }
 for(const c of basinCrossings){
  const road=basinRoads.find(r=>r.axis===c.axis&&r.mid===c.mid)
  if(road){
   const ends=[-1,1].map(side=>'basin.'+road.id+':'+side+':'+c.at.toFixed(3))
   if(ends.every(id=>points[id]))links.push(ends)
  }
 }
 for(const i of ['basin.coastal-rest','basin.wharf']){
  const point=points[i]
  const road=basinRoads.find(r=>r.id==='mariner-street')
  const axis=road.axis==='z'?point.z:point.x
  const target=walks.filter(id=>id.startsWith('basin.mariner-street:1:')).sort((a,b)=>Math.abs(points[a].z-axis)-Math.abs(points[b].z-axis))[0]
  if(target)links.push([i,target])
 }
 const amendments=[...walks,...Object.keys(basinStops)]
 for(const [i,id] of amendments.entries())for(const other of amendments.slice(i+1)){
  const a=points[id],b=points[other]
  if(gap(a,b)<5.2&&walkSegment(a,b))links.push([id,other])
 }
 links.push(['basin.garden','basin.garden-turn'],['basin.south-approach','basin.south-walk','basin.south-path','basin.garden-turn'],
  ['basin.registry','basin.registry-door','basin.registry-square'])
 return {points,links}
}

// The four legs describe a directed loop using the same lanes as the render and collision data.
export function basinCarLayout(){
 const get=id=>basinRoads.find(r=>r.id===id).mid
 const lane=1.15
 const corners=[
  {x:get('bridge-approach')-lane,z:get('basin-crossing')+lane},
  {x:get('bridge-approach')-lane,z:get('south-turn')-lane},
  {x:get('switchyard-road')+lane,z:get('south-turn')-lane},
  {x:get('switchyard-road')+lane,z:get('basin-crossing')+lane}
 ]
 return roadCircuit(corners,4.8)
}

export function roadCircuit(corners,bend=4.8){
 const nodes=[]
 const directions=corners.map((p,i)=>{
  const q=corners[(i+1)%corners.length],d=gap(p,q)
  return {x:(q.x-p.x)/d,z:(q.z-p.z)/d}
 })
 function add(x,z,dx,dz,curve=false){
  const length=Math.hypot(dx,dz)
  nodes.push({x,z,dx:dx/length,dz:dz/length,edges:[],curve})
 }
 for(const [i,p] of corners.entries()){
  const prev=directions[(i+corners.length-1)%corners.length],next=directions[i],q=corners[(i+1)%corners.length]
  const a={x:p.x-bend*prev.x,z:p.z-bend*prev.z},b={x:p.x+bend*next.x,z:p.z+bend*next.z}
  for(let j=0;j<9;j++){
   const t=j/8,u=1-t
   add(u*u*a.x+2*u*t*p.x+t*t*b.x,u*u*a.z+2*u*t*p.z+t*t*b.z,
    u*prev.x+t*next.x,u*prev.z+t*next.z,true)
  }
  const length=gap(p,q)-2*bend,parts=Math.max(1,Math.ceil(length/2.8))
  for(let j=1;j<parts;j++){
   const d=bend+length*j/parts
   add(p.x+d*next.x,p.z+d*next.z,next.x,next.z)
  }
 }
 for(const [i,node] of nodes.entries())node.edges.push(nodes[(i+1)%nodes.length])
 return {nodes,entries:nodes.filter((n,i)=>!n.curve&&i%4===0),next:node=>node.edges[0]}
}
