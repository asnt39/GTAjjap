import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {cargoLadder} from './coast-plan.js'
import {parking,parkingFloors,parkingRamps,rampHeight,workshop,hotel,cargoPier,cargoPlatform} from './chapter-sites.js'

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
 flush()
 buildHotel()
 flush()
 buildCargoQuay()
 flush()
 function buildHotel(){
  const [w,e,n,s]=hotel.bounds,base=.083,top=hotel.floor,roof=6.38
  const plaster=material(0xbdb39a,maps.architecture[1])
  const window=new T.MeshStandardMaterial({color:0x566f77,metalness:.28,roughness:.27})
  const rug=material(0x756358),brass=material(0xad8e56),linen=material(0xd9d0b7)
  slab(w,e,n,s,base)
  for(const [left,right] of [[w,-139.7],[-136.3,-122.5],[-119.1,e]])slab(left,right,n,s,top)
  for(const stair of hotel.stairs){
   const [a,b,c,d]=stair.bounds
   slab(a,b,n,c,top);slab(a,b,d,s,top)
   for(let i=0;i<17;i++)box((a+b)/2,base+(i+.5)*3/17*.5,c+(i+.5)*(d-c)/17,b-a,3*(i+.5)/17,(d-c)/17,wood)
   box(a+.08,top+.12,(c+d)/2,.12,.055,d-c,brass)
  }
  slab(w,e,n,s,roof)
  wall(w,w+.24,n,s,base,roof,brick)
  wall(w,e,s-.24,s,base,roof,brick)
  for(const [a,b] of [[w,-132.2],[-128.7,e]])wall(a,b,n,n+.24,base,roof,brick)
  wall(-132.2,-128.7,n,n+.24,2.56,roof,brick)
  wall(e-.23,e,n,190.15,base,roof,brick)
  wall(e-.23,e,191.86,s,base,roof,brick)
  wall(e-.23,e,190.15,191.86,2.52,roof,brick)
  for(const x of [-137.7,-134.1,-126.3,-122])for(const y of [1.58,4.65]){
   box(x,y,n-.03,2.42,1.62,.11,steel);box(x,y,n-.095,2.15,1.36,.07,window)
   box(x,y,n-.15,.055,1.4,.05,brass);box(x,y-.88,n-.10,2.59,.12,.45,plaster)
   box(x,y,s+.05,2.26,1.65,.11,window)
  }
  for(const y of [2.92,6.05])box((w+e)/2,y,n-.18,e-w+.33,.18,.44,plaster)
  box(-130.5,2.39,187.12,4.55,.19,1.74,brass)
  sign('BRINE HOTEL',-130.5,3.25,187.72,4.75).rotation.y=Math.PI
  sign('RECEPTION',-132.3,2.1,192.34,1.6).rotation.y=Math.PI
  const counter=[-135.52,-132.55,191.95,192.63]
  wall(...counter,base,1.09,wood)
  box(-134.035,1.13,192.29,3.04,.09,.75,brass)
  box(-130.5,.103,191.2,2.5,.04,4.4,rug)
  wall(-134.2,-132.3,198.1,198.74,base,.85,rug)
  wall(-130.8,-129.9,195.6,196.36,base,.73,wood)
  for(const z of [195.35,203.2]){
   wall(-136.3,-131.1,z,z+.20,top,roof-.21,plaster)
   wall(-129.6,-128.6,z,z+.20,top,roof-.21,plaster)
   wall(-127.05,-122.5,z,z+.20,top,roof-.21,plaster)
   for(const x of [-130.2,-127.82])box(x,top+2.12,z+.1,1.5,.12,.25,wood)
  }
  for(const x of [-132.65,-125.05]){
   wall(x-.10,x+.10,n,195.4,top,roof-.21,plaster)
   for(const z of [190.25,204.78]){
    wall(x-1,x+1,z-.58,z+.58,top,top+.50,wood)
    box(x,top+.55,z,2.05,.18,1.3,linen)
    box(x-.63,top+.69,z, .38,.12,.8,white)
    box(x+.34,top+.65,z,.67,.12,1.27,rug)
   }
  }
  box(-127.73,top+2.22,195.57,.56,.18,.11,brass)
  sign('205',-127.73,top+2.23,195.64,.49)
  for(const x of [-137.7,-133.7,-129.5,-125.4,-120.7]){
   box(x,5.96,199.9,.82,.08,.43,lamp)
  }
  wall(-116.9,-116.05,195.3,196.6,base,1.12,steel)
  wall(-114.1,-113.13,197.45,198.2,base,.96,brick)
  wall(-112.0,-110.95,202.0,203.45,base,1.07,steel)
 }
 function buildCargoQuay(){
  const painted=material(0x729087,maps.architecture[3])
  for(const [w,e,n,s] of [cargoPier,cargoPlatform]){
   for(let x=w+.16;x<e;x+=.33)box(x,.041,(n+s)/2,Math.min(.319,2*(e-x)),.158,s-n,wood)
   for(const z of [n+.28,s-.28]){
    box((w+e)/2,-.092,z,e-w,.26,.24,steel)
    for(let x=w+.42;x<e;x+=2.92){
     batch(new T.CylinderGeometry(.125,.145,5.8,8).translate(x,-2.6,z),steel)
     box(x,.295,z,.23,.30,.23,rubber)
    }
   }
  }
  for(const dx of [-.29,.29])box(cargoLadder.x+dx,-.81,189.015,.082,2.37,.083,stripe)
  for(let i=0;i<8;i++)box(cargoLadder.x,.33-i*.27,189.015,.64,.061,.061,stripe)
  const [w,e,n,s]=[127.9,138.25,189.2,198.84]
  wall(w,e,n,n+.22,.12,4.44,painted);wall(w,e,s-.22,s,.12,4.1,painted)
  wall(e-.22,e,n,s,.12,4.30,painted)
  wall(w,w+.22,n,192.35,.12,4.20,painted)
  wall(w,w+.22,195.68,s,.12,4.20,painted)
  wall(w,w+.22,192.35,195.68,2.84,4.20,painted)
  batch(new T.BoxGeometry(e-w+.55,.24,s-n+.75).rotateX(.036).translate((w+e)/2,4.29,(n+s)/2),steel)
  for(let z=n+.2;z<s;z+=.54)box(w-.032,3.50,z,.088,1.25,.08,steel)
  sign('SALT QUAY',127.75,3.49,194.02,3.1).rotation.y=-Math.PI/2
  for(const z of [190.1,197.4]){
   wall(131.6,134.1,z-.51,z+.51,.12,1.19,wood)
   box(132.85,.74,z-.518,2.48,.10,.035,steel)
   box(132.85,.90,z+.518,2.48,.09,.035,steel)
   box(134.9,3.80,z,1.45,.07,.20,lamp)
  }
  wall(130.65,131.57,194.60,195.53,.12,.94,painted)
  box(131.11,.96,195.06,.96,.091,.92,wood)
  box(131.05,1.24,195.16,.054,.44,.053,steel)
  box(131.23,1.41,195.16,.312,.20,.052,stripe)
  wall(124.18,125.07,195.3,196.4,.12,1.12,painted)
  for(const x of [92.1,100.2]){
   for(const z of [145,147.96])box(x,.48,z,.21,.60,.22,steel)
   box(x,2.67,146.5,2.30,.17,2.95,painted)
   box(x,2.55,146.5,.91,.08,.32,lamp)
  }
  for(const x of [91,93.19,99.12,101.28])box(x,1.38,145,.10,2.61,.11,steel)
  sign('MERIDIAN MARINA',100.2,2.85,148.04,3.5)
  wall(97.7,99.15,145.16,145.66,.12,.91,wood)
 }
 function flush(){
  for(const [mat,parts] of batches){
   const mesh=new T.Mesh(mergeGeometries(parts),mat)
   mesh.receiveShadow=true;group.add(mesh);parts.forEach(g=>g.dispose())
  }
  batches.clear()
 }
 return group
}
