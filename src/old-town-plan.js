// Rectangles use [west, east, north, south] in Docklands metres.
export const marketEntrance=[-73.5,-62.5]
export const oldTownRoads=[
 [...marketEntrance,-31,114.5], // Market Street and the western leg
 [-40.5,-29.5,26.5,114.5],     // Clock Street
 [-73.5,-29.5,26.5,37.5],      // North Row
 [-73.5,-29.5,103.5,114.5],    // South Row
 [-35,6,78.5,89.5],           // Breakwater link
 [-6,6,63,89.5]
]
export const oldTownLand=[
 [-86,-23,17,126],[-29,-19,65,126],
 [-76.5,-59.5,-28,21],[-39,9,75.5,92.5],[-9,9,56,91]
]
export const clockCourt={x:-51.5,z:51}
const contains=([a,b,c,d],x,z,r=0)=>x>=a+r&&x<=b-r&&z>=c+r&&z<=d-r
export const inOldTown=(x,z,r=0)=>oldTownLand.some(rect=>contains(rect,x,z,r))
const approachRoads=[...oldTownRoads,[-6,6,52,63],[...marketEntrance,-34,-31]]
export function oldTownHeight(x,z){
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
const pavedLand=[...oldTownLand.slice(0,2),[-76.5,-59.5,-27,21],oldTownLand[3],[-9,9,63,92.5]]
export const townPavement=townTiles([...pavedLand,...oldTownRoads],(x,z)=>
 pavedLand.some(r=>contains(r,x,z))&&!oldTownRoads.some(r=>contains(r,x,z)))
const roadBlend=[...oldTownRoads,[-6.05,6.05,-43,63],[-97,25.3,-43,-31]]
export const townDriveBounds=[-97,25.3,-43,114.5]
export const townCurbBlocks=townTiles(roadBlend,(x,z)=>!roadBlend.some(r=>contains(r,x,z)))

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
