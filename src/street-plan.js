// The transverse span is the roadway. Width is measured along the direction of traffic.
export const crossings=[
 {x:-68,z:39,span:11,width:2.5,axis:'z'},
 {x:-68,z:99,span:11,width:2.5,axis:'z'},
 {x:-146,z:31,span:10,width:2.4,axis:'z'},
 {x:-187,z:74.4,span:10,width:2.4,axis:'z'},
 {x:-117.65,z:23,span:9,width:1.8,axis:'x'},
 {x:-178.3,z:100.5,span:9,width:2.4,axis:'x'}
]
export const loadingCourt=[-139,-115.95,49.25,57.3]
export const serviceApron=[-136.6,-121.4,48.82,50.72]
export const pocketGarden=[-165.2,-155.4,107,113]
export const pierStreetEast=[6,17.46,-43,-31]
export const marketStreetbed=[-97,-40,-43,-31]
export const marketWalks=[[-97,-40,-46,-43],[-97,-73.5,-31,-27],[-62.5,-40,-31,-27]]
export const within=([a,b,n,s],x,z)=>x>=a&&x<=b&&z>=n&&z<=s

// At a marked crossing the sidewalk blends down over a metre, with
// tapered wings that meet the full-height curb on either side.
export function crossingRamp(x,z){
 for(const c of crossings){
  const transverse=Math.abs(c.axis==='z'?x-c.x:z-c.z)-c.span/2
  if(transverse<0||transverse>=1.08)continue
  const along=Math.abs(c.axis==='z'?z-c.z:x-c.x)
  if(along>c.width/2+.7)continue
  return Math.max(transverse/1.08,Math.max(0,along-c.width/2)/.7)
 }
 return 1
}
