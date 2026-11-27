import {basinLand,basinRoadBounds,basinLots} from './south-basin-plan.js'
import {shopApron} from './weapon-shop-plan.js'
import {crossingRamp,loadingCourt,serviceApron,within} from './street-plan.js'
import {quayApron} from './quay-plan.js'
import {westBankLand,westBankRoads} from './west-bank-plan.js'
import {garage} from './garage.js'
// Rectangles use [west, east, north, south] in Docklands metres.
export const marketEntrance=[-73.5,-62.5]
export const oldTownRoads=[
 [...marketEntrance,-31,114.5], // Market Street and the western leg
 [-40.5,-29.5,26.5,114.5],     // Clock Street
 [-73.5,-29.5,26.5,37.5],      // North Row
 [-73.5,-29.5,103.5,114.5],    // South Row
 [-35,6,78.5,89.5],           // Breakwater link
 [-6,6,63,89.5],
 ...westBankRoads,...basinRoadBounds
]
export const oldTownLand=[
 [-86,-23,17,126],[-29,-19,65,126],
 [-76.5,-59.5,-28,21],[-39,9,75.5,92.5],[-9,9,56,91],
 ...westBankLand,...basinLand
]
export const clockCourt={x:-51.5,z:51}
const contains=([a,b,c,d],x,z,r=0)=>x>=a+r&&x<=b-r&&z>=c+r&&z<=d-r
const walkableLand=[...oldTownLand,...westBankRoads,...basinRoadBounds]
// Adjacent land tiles share a surface. Check the combined footprint when
// its centre lies on a tile seam, including gaps in concave outer edges.
const landBreaks=[...new Set(walkableLand.flatMap(([left,right])=>[left,right]))].sort((a,b)=>a-b)
const landSlices=landBreaks.slice(1).map((right,i)=>{
 const left=landBreaks[i]
 const spans=walkableLand.filter(([a,b])=>a<=left&&b>=right)
  .map(([, , north,south])=>[north,south]).sort((a,b)=>a[0]-b[0])
 const joined=[]
 for(const span of spans){
  const last=joined.at(-1)
  if(last&&last[1]>=span[0])last[1]=Math.max(last[1],span[1])
  else joined.push(span)
 }
 return {left,right,joined}
})
export function inOldTown(x,z,r=0){
 if(walkableLand.some(rect=>contains(rect,x,z,r)))return true
 if(!r||x-r<landBreaks[0]||x+r>landBreaks.at(-1))return false
 return landSlices.every(({left,right,joined})=>x+r<=left||x-r>=right||
  joined.some(([north,south])=>z-r>=north&&z+r<=south))
}
const approachRoads=[...oldTownRoads,[-6,6,52,63],[...marketEntrance,-34,-31]]
export function oldTownHeight(x,z){
 if(basinLots.some(r=>within(r,x,z)))return .008
 if(within(loadingCourt,x,z)||within(serviceApron,x,z))return .008
 const rampHeight=crossingRamp(x,z)
 if(rampHeight<1)return .008+.075*rampHeight
 // Blend the 7.5 cm curb over the same short run as the Docklands curbs.
 const ramp=.18
 let closest=ramp*ramp
 for(const [west,east,north,south] of approachRoads){
  const dx=Math.max(0,west-x,x-east),dz=Math.max(0,north-z,z-south)
  const distance2=dx*dx+dz*dz
  if(distance2===0)return .008
  closest=Math.min(closest,distance2)
 }
 return closest===ramp*ramp?.083:.008+.075*Math.sqrt(closest)/ramp
}

// Partition overlapping road strips into disjoint tiles so render surfaces
// have one top face. The same partition supplies hard vehicle curb boundaries.
export function townTiles(rects,filter){
 const xs=[...new Set(rects.flatMap(r=>r.slice(0,2)))].sort((a,b)=>a-b)
 const zs=[...new Set(rects.flatMap(r=>r.slice(2,4)))].sort((a,b)=>a-b)
 const tiles=[]
 for(let j=1;j<zs.length;j++){
  const z0=zs[j-1],z1=zs[j],z=(z0+z1)/2
  let start=null
  for(let i=1;i<=xs.length;i++){
   const inside=i<xs.length&&filter((xs[i-1]+xs[i])/2,z)
   if(inside)start??=xs[i-1]
   else if(start!==null){tiles.push([start,xs[i-1],z0,z1]);start=null}
  }
 }
 return tiles
}

export const townRoadSurface=townTiles(oldTownRoads,(x,z)=>oldTownRoads.some(r=>contains(r,x,z)))
const pavedLand=[...oldTownLand.slice(0,2),[-76.5,-59.5,-27,21],oldTownLand[3],[-9,9,63,92.5],...westBankLand,...basinLand]
export const townPavement=townTiles([...pavedLand,...oldTownRoads],(x,z)=>
 pavedLand.some(r=>contains(r,x,z))&&!oldTownRoads.some(r=>contains(r,x,z)))
const roadBlend=[...oldTownRoads,[-6.05,6.05,-43,63],[-97,25.3,-43,-31]]
export const townDriveBounds=[-225,29,-43,209]
export const townCurbBlocks=townTiles(roadBlend,(x,z)=>!roadBlend.some(r=>contains(r,x,z)))

const dockPavement=[
 quayApron,garage.forecourt,shopApron,
 [-10.8,-6,-101,-43],[6,10.8,-101,-43],[-10.8,-6,-31,58],[6,10.8,-31,58],
 [-40,-6,-46.1,-43],[6,25.3,-46.1,-43],[-40,-6,-31,-27.9],[6,25.3,-31,-27.9],
 [-96,-40,-46,-43],[-96,marketEntrance[0],-31,-27],[marketEntrance[1],-40,-31,-27],
 [-9,-6,56,63],[6,9,56,63]
]
const drivePavement=[...dockPavement,...townPavement]
const driveRoads=[[-6,6,-101,63],[-97,25.3,-43,-31],...oldTownRoads]
const driveSurfaces=[...driveRoads,...drivePavement]
export const pavedDriveBounds=[-225,29,-101,209]
export const unpavedDriveBlocks=townTiles([...driveSurfaces,pavedDriveBounds],
 (x,z)=>!driveSurfaces.some(rect=>contains(rect,x,z)))
export function drivePavementHeight(x,z){
 if(within(loadingCourt,x,z)||within(serviceApron,x,z)||basinLots.some(r=>within(r,x,z)))return 0
 return drivePavement.some(rect=>contains(rect,x,z))?.083*crossingRamp(x,z):0
}

// Use the extended road mask only where the two networks meet or in the
// expansion. The original Docklands mask still handles the rest of the map.
export const useTownDriveMask=(x,z)=>inOldTown(x,z)||(z>=52&&z<56&&Math.abs(x)<=6.05)||
 (z>=-34&&z<=-27.5&&x>=marketEntrance[0]&&x<=marketEntrance[1])

// A legacy room server only accepts positions in Docklands.
export const townRoomBarriers=[
 [-5.95,5.95,56.66,57.34,.84],
 [-10.8,-5.95,56.66,57.34,.84],[5.95,10.8,56.66,57.34,.84],
 [marketEntrance[0],marketEntrance[1],-28.07,-27.39,.84],
 [-76.5,marketEntrance[0],-28.07,-27.39,.84],[marketEntrance[1],-59.5,-28.07,-27.39,.84]
]
