export const breakwaterApproach={west:-29.5,east:-8,north:75.5,south:92.5,roadNorth:78.5,roadSouth:89.5}
const rise=.65,segments=32
const {west,east,north,south}=breakwaterApproach
const spacing=(east-west)/segments

// The same stations define the road mesh and the surface between its vertices.
export const approachStations=Array.from({length:segments+1},(_,i)=>({
 x:west+i*spacing,
 y:i===segments?0:rise*Math.sin(Math.PI*i/segments)**2
}))

export function breakwaterGradeAt(x,z){
 if(!(x>west&&x<east&&z>=north&&z<=south))return 0
 const i=Math.min(segments-1,Math.floor((x-west)/spacing))
 const a=approachStations[i],b=approachStations[i+1]
 return a.y+(b.y-a.y)*(x-a.x)/spacing
}
