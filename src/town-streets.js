import * as T from 'three'
import {crossings,loadingCourt,serviceApron,pocketGarden,within} from './street-plan.js'

export const streetAprons=[loadingCourt,serviceApron]
const crossingBeds=crossings.flatMap(c=>[-1,1].map(side=>{
 const along=(c.axis==='z'?c.z:c.x),across=(c.axis==='z'?c.x:c.z)+side*c.span/2
 const wide=c.width/2+.7,edge=across+side*1.08
 const span=[Math.min(across,edge),Math.max(across,edge)]
 return {rect:c.axis==='z'?[...span,along-wide,along+wide]:[along-wide,along+wide,...span],crossing:c,side,across,along}
}))
export const reservedSurfaces=[...streetAprons,...crossingBeds.map(b=>b.rect),pocketGarden]
export function streetDetails({floor,box,batch,materials}){
 const {stone,paint,asphalt,paving,planted,iron}=materials
 for(const r of streetAprons)floor(r,.002,asphalt)
 floor(pocketGarden,.082,planted)
 // Four 2.55 m bays and an unobstructed manoeuvring lane on the former plaza.
 for(let i=0;i<=4;i++)box(-138.25+i*2.55,.009,54.94,.075,.008,4.35,paint)
 box(-133.18,.009,57.10,10.27,.008,.075,paint)
 for(let i=0;i<9;i++)box(-136+i*.68,.01,49.89,.31,.007,1.02,paint)
 for(const c of crossings){
  const n=Math.floor((c.span-.7)/.87),along=c.axis==='z'
  for(let j=0;j<n;j++){
   const off=(j-(n-1)/2)*.87
   box(c.x+(along?off:0),.009,c.z+(along?0:off),along?.43:c.width,.009,along?c.width:.43,paint)
  }
  for(const s of [-1,1])
   box(c.x+(along?-s*c.span*.24:s*(c.width/2+.67)),.009,c.z+(along?s*(c.width/2+.67):s*c.span*.24),along?c.span*.41:.14,.008,along?.14:c.span*.41,paint)
 }
 for(const {crossing:c,side,across,along} of crossingBeds){
  const w=c.width/2,verts=[],uv=[],indices=[]
  for(const [row,t] of [-w-.7,-w,-w+.40,w-.40,w,w+.7].entries()){
   for(const col of [0,1]){
    const a=across+col*side*1.08,b=along+t
    const x=c.axis==='z'?a:b,z=c.axis==='z'?b:a
    const h=col||Math.abs(t)>w?.082:.004
    verts.push(x,h,z);uv.push(x/4.5,-z/4.5)
   }
   if(!row)continue
   const i=row*2-2,flip=(c.axis==='z')=== (side>0)
   indices.push(...(flip?[i,i+2,i+1,i+1,i+2,i+3]:[i,i+1,i+2,i+1,i+3,i+2]))
  }
  const g=new T.BufferGeometry()
  g.setAttribute('position',new T.Float32BufferAttribute(verts,3))
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals()
  batch(g,paving)
  const orientation=c.axis==='z',x=orientation?across+side*.82:along,z=orientation?along:across+side*.82
  box(x,.078,z,orientation?.25:c.width-.2,.012,orientation?c.width-.2:.25,stone)
 }
 // A mesh kerb makes ordinary road edges read as steps. Marked ramps keep their open mouths.
 for(const [a,b,n,s] of [[-73.5,-62.5,37.8,102.8],[-40.5,-29.5,38,78],[-146-5,-146+5,32.9,58.5],[-192,-182,70.2,82.6]]){
  for(const x of [a,b])for(let z=n;z<s;z+=.72){
   const along=z+Math.min(.72,s-z)/2
   if(reservedSurfaces.some(r=>within(r,x,along)))continue
   box(x,.039,along,.12,.078,Math.min(.72,s-z),stone)
  }
 }
 for(const [x,z] of [[-164.85,107.35],[-155.75,107.35]]){
  box(x,.30,z,.13,.51,.13,iron)
 }
}
