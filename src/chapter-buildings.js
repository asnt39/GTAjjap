import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {parking,parkingFloors,parkingRamps,rampHeight,workshop} from './chapter-sites.js'

export function buildChapterBuildings(scene,addCollider,maps){
 const group=new T.Group(),batches=new Map()
 group.name='Chapter 1 waterfront facilities'
 scene.add(group)
 const material=(color,map)=>new T.MeshStandardMaterial({color,map:map??null,roughness:.82})
 const concrete=material(0xb6b2a3,maps.street[2]),steel=material(0x4c5b5e),brick=material(0xaf8973,maps.architecture[0])
 const stripe=material(0xc8a96a),white=material(0xe5ddbd),rubber=material(0x282d2f),wood=material(0x8c694c)
 const lamp=new T.MeshStandardMaterial({color:0xffe9bc,emissive:0xf6d39f,emissiveIntensity:.72})
 function batch(geometry,mat){
  const list=batches.get(mat)??[];list.push(geometry);batches.set(mat,list)
 }
 function box(x,y,z,w,h,d,mat=concrete){
  const g=new T.BoxGeometry(w,h,d),uv=g.attributes.uv
  if(mat.map)for(let i=0;i<uv.count;i++){
   const face=Math.floor(i/4)
   uv.setXY(i,uv.getX(i)*(face<2?d:w)/2.7,uv.getY(i)*(face===2||face===3?d:h)/2.7)
  }
  batch(g.translate(x,y,z),mat)
 }
 function wall(w,e,n,s,low,high,mat=concrete){
  box((w+e)/2,(low+high)/2,(n+s)/2,e-w,high-low,s-n,mat)
  addCollider(w,e,n,s,high,false,low)
 }
 function slab(w,e,n,s,y){
  box((w+e)/2,y-.12,(n+s)/2,e-w,.24,s-n)
  if(y>.2)addCollider(w,e,n,s,y,true,y-.24)
 }
 function sign(label,x,y,z,width){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=86
  const ctx=canvas.getContext('2d')
  ctx.fillStyle='#344149';ctx.fillRect(0,0,512,86);ctx.fillStyle='#f6e3b4';ctx.fillRect(0,0,7,86)
  ctx.font='bold 35px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,45,480)
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace
  const mesh=new T.Mesh(new T.PlaneGeometry(width,width*.168),new T.MeshBasicMaterial({map}))
  mesh.position.set(x,y,z);group.add(mesh);return mesh
 }
 const [west,east,north,south]=parking.bounds
 for(const y of parkingFloors){
  slab(-131.2,-117.2,north,south,y)
  for(const z of [156.5,161,165.5,170]){
   box(-123.9,y+.013,z,4.3,.025,.09,white)
   if(y<7)box(-125.3,y+2.64,z,1.25,.09,.20,lamp)
  }
  for(const x of [-130.6,-117.85])for(const z of [156.4,163.5,169.7])wall(x-.22,x+.22,z-.22,z+.22,y,y+2.86)
  for(const z of [north+.11,south-.11])wall(-131.2,-117.2,z-.10,z+.10,y,y+.94)
 }
 for(const ramp of parkingRamps){
  const [a,b,n,s]=ramp.bounds,top=rampHeight(ramp,n),bottom=rampHeight(ramp,s)
  const rise=bottom-top
  const length=Math.hypot(s-n,rise)
  const geometry=new T.BoxGeometry(b-a,.26,length).rotateX(-Math.atan2(rise,s-n)).translate((a+b)/2,(top+bottom)/2-.13,(n+s)/2)
  batch(geometry,concrete)
  const boundary=ramp.northHigh?a:b
  for(let i=0;i<13;i++){
   const z=n+(i+.5)*(s-n)/13,y=rampHeight(ramp,z)
   wall(boundary-.10,boundary+.10,z-.77,z+.77,y-.14,y+.98,steel)
  }
  const bottomZ=ramp.northHigh?s:n,topZ=ramp.northHigh?n:s
  slab(a,b,ramp.northHigh?bottomZ: north,ramp.northHigh?south:bottomZ,parkingFloors[ramp.bottom])
  slab(a,b,ramp.northHigh?north:topZ,ramp.northHigh?topZ:south,parkingFloors[ramp.bottom+1])
 }
 for(const x of [west,east])for(const z of [153,161,170])wall(x-.17,x+.17,z-.32,z+.32,.083,7.42)
 for(const z of [north,south]){
  for(const y of [3.12,6.32])box((west+east)/2,y,z,east-west,.26,.38,steel)
  for(const x of [-136.7,-118.3])box(x,4.6,z,.20,3,.44,stripe)
 }
 box(-124,7.28,173.8,9,.31,.36,steel)
 sign('SPIRE PARKING',-124,7.32,174.08,8.3)
 sign('P1  /  RAMP',-126,2.30,174.07,3.7)
 sign('ROOF  /  P3',-124,7.1,171.4,3.4)

 const [a,b,n,s]=workshop.bounds
 wall(a,a+.28,n,s,.083,5.25,brick);wall(b-.28,b,n,s,.083,5.25,brick)
 wall(a,b,s-.27,s,.083,5.25,brick)
 wall(a,a+1.65,n,n+.28,.083,4.2,brick);wall(b-1.65,b,n,n+.28,.083,4.2,brick)
 wall(a,b,n,n+.30,3.98,5.25,brick)
 slab(a,b,n,s,5.25)
 for(const z of [153,157,160.8]){
  box(-105.5,3.9,z,5.4,.14,.28,steel);box(-105.5,3.80,z,2.8,.07,.18,lamp)
 }
 for(const x of [-108.25,-102.65]){
  wall(x-.14,x+.14,155.7,156.0,.083,2.90,steel)
  box(x-.12,.35,156.05,.3,.14,1.3,stripe)
  box(x,.109,154.3,.07,.05,3.6,stripe)
 }
 wall(-109.64,-108.35,158.5,161.4,.083,.99,steel)
 wall(-103.96,-102.52,163,164.6,.083,1.02,wood)
 for(let z=159;z<161.5;z+=.47){
  const tire=new T.TorusGeometry(.27,.09,9,16).rotateX(Math.PI/2).translate(-109.3,.55,z)
  batch(tire,rubber)
 }
 sign('KEEL MOTOR WORKS',-105.5,4.61,149.98,7.4).rotation.y=Math.PI
 function flush(){
  for(const [mat,parts] of batches){
   const mesh=new T.Mesh(mergeGeometries(parts),mat)
   mesh.receiveShadow=true;group.add(mesh);parts.forEach(g=>g.dispose())
  }
 }
 flush()
 return group
}
