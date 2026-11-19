import {BufferGeometry,Float32BufferAttribute} from 'three'

// Car-space measurements for the ToyCar's open side windows, A-pillars
// and rocker panels. Clipping the existing triangles keeps the atlas and
// silhouette intact in the closed position.
export const touringHingeZ=-.63

function clip(polygon,plane){
 const inside=[],outside=[]
 let previous=polygon.at(-1),a=plane(previous)
 for(const vertex of polygon){
  const b=plane(vertex)
  if((a>=0)!==(b>=0)){
   const t=a/(a-b)
   const edge=previous.map((value,i)=>value+(vertex[i]-value)*t)
   inside.push(edge);outside.push(edge)
  }
  const side=b>=0?inside:outside
  side.push(vertex)
  previous=vertex;a=b
 }
 return [inside,outside]
}

const emit=(target,polygon)=>{
 for(let i=2;i<polygon.length;i++)target.push(polygon[0],polygon[i-1],polygon[i])
}
function makeGeometry(vertices){
 const geometry=new BufferGeometry()
 for(const [name,width,start] of [['position',3,0],['normal',3,3],['uv',2,6]]){
  const buffer=new Float32Array(vertices.length*width)
  for(let i=0;i<vertices.length;i++)for(let c=0;c<width;c++)buffer[i*width+c]=vertices[i][start+c]
  geometry.setAttribute(name,new Float32BufferAttribute(buffer,width))
 }
 return geometry
}

export function cutTouringPanels(geometry,indices){
 const {position,normal,uv}=geometry.attributes
 const vertices=Array.from({length:position.count},(_,i)=>[
  position.getX(i),position.getY(i),position.getZ(i),
  normal.getX(i),normal.getY(i),normal.getZ(i),uv.getX(i),uv.getY(i)
 ])
 const shell=[],panels=[[],[]]
 for(let i=0;i<indices.length;i+=3){
  const triangle=indices.slice(i,i+3).map(index=>vertices[index])
  const side=triangle.every(v=>v[0]>.57)?1:triangle.every(v=>v[0]<-.57)?-1:0
  if(!side||triangle.every(v=>v[1]<.42)||triangle.every(v=>v[1]>.89)||triangle.every(v=>v[2]<touringHingeZ)||triangle.every(v=>v[2]>.53)){
   emit(shell,triangle);continue
  }
  const planes=[v=>v[1]-.42,v=>.89-v[1],v=>v[2]-touringHingeZ,v=>.53-v[2],v=>side*v[0]-.64]
  let remaining=triangle
  for(const plane of planes){
   if(remaining.length<3)break
   const [inside,outside]=clip(remaining,plane)
   emit(shell,outside);remaining=inside
  }
  emit(panels[side>0?1:0],remaining)
 }
 return {shell:makeGeometry(shell),panels:panels.map(makeGeometry)}
}
