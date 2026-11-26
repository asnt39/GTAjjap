import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {inOldTown,oldTownLand,oldTownRoads} from './old-town-plan.js'
import {inDocklands} from './navigation.js'

// Trace the union. Internal tile seams and both connections to Docklands stay open.
export function waterfrontEdges(){
 const rectangles=[...oldTownLand,...oldTownRoads]
 const axis=(offset,extra)=>[...new Set([...rectangles.flatMap(r=>r.slice(offset,offset+2)),...extra])].sort((a,b)=>a-b)
 const xs=axis(0,[-97,-36,-10.5,10.7]),zs=axis(2,[-58,-43,-31,-27,58])
 const edges=[]
 function scan(fixed,breaks,vertical){
  let start=null,side=0
  for(let i=0;i<breaks.length;i++){
   const p=(breaks[i]+breaks[i+1])/2,x=vertical?fixed:p,z=vertical?p:fixed
   const near=(sign,lookup)=>lookup(x+(vertical?sign*.025:0),z+(vertical?0:sign*.025))
   const inward=Number(near(1,inOldTown))-Number(near(-1,inOldTown))
   const next=Number.isFinite(p)&&inward&&!near(-inward,inDocklands)?inward:0
   if(side!==next){
    if(side)edges.push({vertical,fixed,start,end:breaks[i],inward:side})
    side=next;start=breaks[i]
   }
  }
 }
 for(const x of xs)scan(x,zs,true)
 for(const z of zs)scan(z,xs,false)
 return edges
}
export function landscapeMaterial(){
 const mat=new T.MeshStandardMaterial({color:0x939986,roughness:.95})
 const loader=new T.TextureLoader()
 for(const [slot,name] of [['map','color'],['normalMap','normal'],['roughnessMap','rough']]){
  loader.load('/assets/estuary/grass-'+name+'.webp',tex=>{
   if(slot==='map')tex.colorSpace=T.SRGBColorSpace
   tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=2
   mat[slot]=tex;mat.needsUpdate=true
  })
 }
 mat.normalScale.set(.42,.42)
 return mat
}
export function buildEstuary(scene,ground){
 // Undulating salt meadow below the paved quay level. Distant ridges remain outside play.
 const terrain=new T.PlaneGeometry(430,510,64,72).rotateX(-Math.PI/2).translate(-189,0,-8)
 const pos=terrain.attributes.position,uv=terrain.attributes.uv
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i)
  const distance=Math.max(0,-230-x,z-148,-110-z)
  const ridge=Math.min(distance*.15,8)*(.62+.25*Math.sin(x*.057)+.13*Math.sin(z*.11))
  pos.setY(i,-1.1+ridge+.28*Math.sin(x*.15+z*.10)*Math.cos(z*.12));uv.setXY(i,x/5,z/5)
 }
 terrain.computeVertexNormals()
 const meadow=new T.Mesh(terrain,ground);meadow.receiveShadow=true;scene.add(meadow)
 const pieces=[],t=new T.Color()
 function block(x,y,z,w,h,d,color){
  const g=new T.BoxGeometry(w,h,d).translate(x,y,z),colors=[]
  t.setHex(color);for(let j=0;j<24;j++)colors.push(t.r,t.g,t.b)
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));pieces.push(g)
 }
 for(const {fixed,vertical,start,end,inward} of waterfrontEdges()){
  const edge=fixed-inward*.07,mid=(start+end)/2,len=end-start
  function beam(y,height,width,color){block(vertical?edge:mid,y,vertical?mid:edge,vertical?width:len,height,vertical?len:width,color)}
  beam(-.66,1.48,.27,0x796f5c);beam(.17,.18,.29,0xb6a286)
  beam(.68,.078,.054,0x495348);beam(.42,.046,.054,0x697265)
  const count=Math.max(1,Math.ceil(len/3.4))
  for(let i=0;i<count;i++){
   const along=start+(i+.5)*len/count
   block(vertical?edge:along,.47,vertical?along:edge,.084,.89,.084,0x4b5348)
  }
 }
 const rails=new T.Mesh(mergeGeometries(pieces),new T.MeshStandardMaterial({vertexColors:true,roughness:.78}))
 rails.receiveShadow=true;scene.add(rails);pieces.forEach(g=>g.dispose())
}
