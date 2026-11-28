import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {cargoLadder} from './coast-plan.js'
import {parking,parkingFloors,parkingRamps,parkingStair,parkingLanding,rampHeight,workshop,hotel,cargoPier,cargoPlatform,factory,hideout} from './chapter-sites.js'

export function buildChapterBuildings(scene,addCollider,maps){
 const group=new T.Group(),batches=new Map(),interiors=[]
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
 function decorate(bounds,build){interiors.push({bounds,build,root:null})}
 function slab(w,e,n,s,y){
  box((w+e)/2,y-.12+(y<.2?.004:0),(n+s)/2,e-w,.24,s-n)
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
 const [sw,se,sn,ss]=parkingStair.bounds
 slab(...parkingLanding,parkingFloors[1])
 for(let i=0;i<19;i++){
  const z=sn+(i+.5)*(ss-sn)/19,y=rampHeight(parkingStair,z)
  box((sw+se)/2,y-.102,z,se-sw,.204,(ss-sn)/19,steel)
  wall(sw-.10,sw+.10,z-.492,z+.492,y-.17,y+.93,steel)
 }
 for(const x of [-141.1,-139.05,-137.9])wall(x-.075,x+.075,171.16,171.34,.083,.82,stripe)
 sign('STAIR  /  P2',-139.6,1.95,171.4,2.58)
 for(const [x,y,z,color] of [[-125.6,.083,163.4,0x566b7c],[-122.9,3.283,164.62,0x6e503e],
  [-125.6,6.483,163.4,0x54716c]]){
  const paint=material(color)
  wall(x-.91,x+.91,z-2.06,z+2.06,y+.10,y+.85,paint)
  box(x,y+1.02,z+.18,1.61,.51,2.04,steel)
  box(x,y+1.29,z+.26,1.64,.095,1.64,paint)
  for(const d of [-1,1])for(const axle of [-1.19,1.24])
   batch(new T.CylinderGeometry(.33,.33,.17,12).rotateZ(Math.PI/2).translate(x+d*.855,y+.36,z+axle),rubber)
 }

 const [a,b,n,s]=workshop.bounds
 wall(a,a+.28,n,s,.083,5.25,brick);wall(b-.28,b,n,s,.083,5.25,brick)
 wall(a,b,s-.27,s,.083,5.25,brick)
 wall(a,a+1.65,n,n+.28,.083,4.2,brick);wall(b-1.65,b,n,n+.28,.083,4.2,brick)
 wall(a,b,n,n+.30,3.98,5.25,brick)
 slab(a,b,n,s,5.25)
 decorate(workshop.bounds,()=>{
  for(const z of [153,157,160.8]){
   box(-105.5,3.9,z,5.4,.14,.28,steel);box(-105.5,3.80,z,2.8,.07,.18,lamp)
  }
  for(let z=159;z<161.5;z+=.47)batch(new T.TorusGeometry(.27,.09,9,16).rotateX(Math.PI/2).translate(-109.3,.55,z),rubber)
 })
 for(const x of [-108.25,-102.65]){
  wall(x-.14,x+.14,155.7,156.0,.083,2.90,steel)
  box(x-.12,.35,156.05,.3,.14,1.3,stripe)
  box(x,.109,154.3,.07,.05,3.6,stripe)
 }
 wall(-109.64,-108.35,158.5,161.4,.083,.99,steel)
 wall(-103.96,-102.52,163,164.6,.083,1.02,wood)
 sign('KEEL MOTOR WORKS',-105.5,4.61,149.98,7.4).rotation.y=Math.PI
 flush()
 buildHotel()
 flush()
 buildCargoQuay()
 flush()
 buildFoundry()
 flush()
 buildHideout()
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
  decorate(hotel.bounds,()=>{
   for(const x of [-137.7,-133.7,-129.5,-125.4,-120.7]){
    box(x,5.96,199.9,.82,.08,.43,lamp)
   }
   for(const x of [-133.25,-125.7])for(const z of [190.25,204.78]){
    box(x,top+.80,z+.91,.43,.08,.43,brass)
    box(x,top+1.05,z+.91,.12,.42,.12,steel)
    box(x,top+1.27,z+.91,.33,.18,.33,lamp)
   }
  })
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
 function buildFoundry(){
  const [w,e,n,s]=factory.bounds,base=.083,deck=factory.floor,beam=7.4
  const iron=material(0x657572,maps.architecture[3]),dark=material(0x3e494c),safety=material(0xa98048)
  const skylight=material(0x76979c),glass=new T.MeshStandardMaterial({color:0x66797a,metalness:.49,roughness:.32})
  slab(w,e,n,s,base)
  for(const [a,b,c,d] of factory.decks)slab(a,b,c,d,deck)
  const [[a,b,c,d]]=factory.stairs.map(stair=>stair.bounds)
  for(let i=0;i<19;i++)box((a+b)/2,base+(i+.5)*3.2/38,c+(i+.5)*(d-c)/19,b-a,3.2*(i+.5)/19,(d-c)/19,steel)
  const openings=[
   [n,[[-173.2,-165.7,4.28]]],[s,[[-159.2,-152.3,4.10]]]
  ]
  for(const [z,doors] of openings){
   const [[left,right,high]]=doors,north=z===n?n:s-.24,south=north+.24
   wall(w,left,north,south,base,beam,brick);wall(right,e,north,south,base,beam,brick)
   wall(left,right,north,south,high,beam,brick)
   for(const x of [left-.075,right+.075])box(x,high/2,z,.20,high,.24,iron)
   box((left+right)/2,high+.13,z,right-left,.25,.25,steel)
  }
  wall(w,w+.24,n,161.48,base,beam,brick);wall(w,w+.24,164.9,s,base,beam,brick)
  wall(w,w+.24,161.48,164.9,2.79,beam,brick)
  wall(e-.24,e,n,s,base,beam,brick)
  const roofWidth=(e-w)/2
  for(const side of [-1,1]){
   const roof=new T.BoxGeometry(Math.hypot(roofWidth,2.05)+.55,.20,s-n+.41)
    .rotateZ(-side*Math.atan2(2.05,roofWidth)).translate((w+e)/2+side*roofWidth/2,beam+1.0,(n+s)/2)
   batch(roof,iron)
   for(const z of [155.25,162.85,170.25]){
    batch(new T.BoxGeometry(4.65,.08,1.45).rotateZ(-side*Math.atan2(2.05,roofWidth))
     .translate((w+e)/2+side*roofWidth*.41,beam+1.29,z),skylight)
   }
  }
  for(const z of [153.3,160.1,166.9,173.5]){
   for(const x of [w+.62,e-.72])wall(x-.15,x+.15,z-.16,z+.16,base,beam+.22,dark)
   box((w+e)/2,6.78,z,e-w-1,.24,.24,dark)
   box((w+e)/2,7.29,z,e-w-1,.17,.145,steel)
   for(let x=w+2.8;x<e-1.9;x+=2.8){
    const angle=(Math.round(x)%2?.35:-.35)
    batch(new T.BoxGeometry(.11,1.28,.12).rotateZ(angle).translate(x,7.03,z),dark)
   }
   box(-171.3,6.52,z,1.75,.11,.26,lamp);box(-158.2,6.52,z,1.6,.11,.26,lamp)
  }
  for(const y of [3.3,5.84])box((w+e)/2,y,n-.07,e-w+.25,.12,.41,iron)
  for(const x of [-181,-176.6,-161.2,-156.1])for(const z of [n-.04,s+.04]){
   box(x,5.05,z,3.42,1.50,.105,dark);box(x,5.05,z+(z<n?-.059:.059),3.18,1.28,.09,glass)
   for(const offset of [-.9,0,.9])box(x+offset,5.05,z+(z<n?-.115:.115),.09,1.31,.04,dark)
  }
  sign('RIVET FOUNDRY',-169.1,5.41,n-.12,5.95).rotation.y=Math.PI
  const scrap=[[-179.9,-176.4,156.35,157.85],[-175.8,-174.4,164.8,167.65],
   [-170,-168.55,160.5,163.3],[-168.05,-167.36,166.35,167.45],[-166.4,-165,169.7,172.1],
   [-181,-177.7,169.9,172.75]]
  for(const [i,[l,r,f,k]] of scrap.entries()){
   const height=i===3?1.18:1.35
   wall(l,r,f,k,base,height,i%2?iron:wood)
   for(const z of [f+.13,k-.13])box((l+r)/2,height+.07,z,r-l,.10,.092,safety)
   box((l+r)/2,(height+base)*.5,k+.025,r-l,.15,.05,steel)
  }
  decorate(factory.bounds,()=>{
   for(const x of [-177.1,-170.5,-165.4]){
    batch(new T.CylinderGeometry(.15,.15,15.2,10).rotateX(Math.PI/2).translate(x,5.1,163.45),iron)
    for(const z of [156.6,161.1,165.6,170.2])batch(new T.TorusGeometry(.15,.035,8,12).translate(x,5.1,z),steel)
   }
   for(const z of [154.7,158.2,162.1,165.4,169.2,172.25]){
    box(-175,6.22,z,.04,.55,.04,steel)
    box(-175,5.89,z,1.26,.10,.20,lamp)
   }
  })
  for(const [l,r,f,k] of [[-159.4,-159.25,152.2,170.7],[-163.4,-159.4,174.36,174.48]]){
   wall(l,r,f,k,deck,deck+.96,steel)
   box((l+r)/2,deck+.93,(f+k)/2,r-l+.10,.09,k-f+.10,safety)
  }
  wall(-159.42,-155.6,155.01,155.22,deck,6.12,iron)
  wall(-153.86,-150.25,155.01,155.22,deck,6.12,iron)
  wall(-155.6,-153.86,155.01,155.22,5.66,6.12,iron)
  wall(-153.32,-151.05,152.24,152.42,deck,6.12,steel)
  wall(-153.32,-153.12,152.39,153.78,deck,6.12,iron)
  wall(-151.23,-151.04,152.39,153.78,deck,6.12,iron)
  box(-152.22,deck+1.14,152.46,1.09,2.28,.09,steel)
  box(-152.23,deck+2.36,152.505,.47,.10,.06,lamp)
  wall(-153.12,-151.23,153.67,153.79,deck,deck+1.03,iron)
  const pane=new T.Mesh(new T.BoxGeometry(1.89,1.13,.075),new T.MeshStandardMaterial({
   color:0x789398,roughness:.25,metalness:.08,transparent:true,opacity:.31}))
  pane.position.set(-152.175,deck+1.58,153.733);group.add(pane)
  addCollider(-153.12,-151.23,153.67,153.79,deck+2.16,false,deck+1.03)
  for(const x of [-153.06,-152.56,-152.09,-151.59,-151.28])box(x,deck+1.58,153.735,.035,1.18,.055,steel)
  wall(-156.5,-154.4,153.10,153.91,deck,deck+.84,wood)
  wall(-158.72,-157.9,162.10,163.8,deck,deck+1.0,iron)
  box(-153.25,deck+1.15,153.74,.18,.24,.12,safety)
  sign('DISPATCH',-153.8,deck+2.12,155.24,1.65)
  for(const [x,z] of [[-178.8,149.42],[-160,178.62],[-181.2,165.98]]){
   wall(x-.51,x+.51,z-.69,z+.69,base,.94,wood)
   box(x,.96,z,1.17,.088,1.51,steel)
  }
 }
 function buildHideout(){
  const [w,e,n,s]=hideout.bounds,base=.083,roof=4.78
  const painted=material(0x829177,maps.architecture[2]),fabric=material(0x60796e),ceramic=material(0xad9c72)
  slab(w,e,n,s,base);slab(w,e,n,s,roof)
  wall(w,w+.26,n,s,base,roof,brick);wall(e-.26,e,n,s,base,roof,brick)
  wall(w,e,s-.26,s,base,roof,brick)
  for(const [a,b] of [[w,-168.1],[-165.1,-163],[-157.4,e]])wall(a,b,n,n+.26,base,roof,brick)
  wall(-168.1,-165.1,n,n+.26,2.55,roof,brick)
  wall(-163,-157.4,n,n+.26,3.48,roof,brick)
  wall(-171.7,-171.47,194.3,197.45,base,roof-.2,painted)
  wall(-171.7,-171.47,200.2,s,base,roof-.2,painted)
  wall(-163.7,-163.47,188.45,193.32,base,roof-.2,painted)
  wall(-163.7,-163.47,196.75,s,base,roof-.2,painted)
  wall(-169.75,-167.2,196.92,198.10,base,.87,wood)
  box(-168.48,.92,197.51,2.66,.105,1.35,ceramic)
  wall(-178.4,-176.57,198.63,200.25,base,.61,fabric)
  wall(-178.4,-177.96,198.63,200.25,.61,1.31,fabric)
  wall(-171,-169.1,201.25,203.68,base,.82,wood)
  for(const x of [-168.1,-166.9,-165.7]){
   wall(x-.46,x+.46,202.0,202.46,base,2.21,painted)
   box(x,1.53,201.96,.24,.099,.07,stripe)
  }
  for(const z of [189.2,193.8])for(const x of [-161.5,-158.9])box(x,.101,z,.081,.032,2.7,stripe)
  decorate(hideout.bounds,()=>{
   for(const [x,z] of [[-175.5,198.9],[-167.1,195.7],[-160.5,191.5],[-167.2,201.7]]){
    box(x,4.5,z,1.45,.112,.24,lamp)
   }
   for(const z of [196.45,197.3,198.1]){
    box(-166.55,.57,z,.73,.15,.44,fabric)
    for(const dz of [-.16,.16])box(-166.55,.32,z+dz,.66,.48,.046,steel)
   }
  })
  for(const x of [-175.7,-172.6,-155.4])box(x,3.12,n-.057,1.87,1.01,.12,painted)
  box(-166.6,2.67,186.5,3.75,.18,1.71,steel)
  sign('BREAKWATER YARD',-165.9,3.95,186.84,5.4).rotation.y=Math.PI
 }
 function flush(parent=group){
  for(const [mat,parts] of batches){
   const mesh=new T.Mesh(mergeGeometries(parts),mat)
   mesh.receiveShadow=true;mesh.castShadow=mat===concrete||mat===brick||mat===steel
   parent.add(mesh);parts.forEach(g=>g.dispose())
  }
  batches.clear()
 }
 function updateDetails(pos){
  let changed=false
  for(const detail of interiors){
   const [w,e,n,s]=detail.bounds
   const distance=Math.hypot(pos.x-Math.max(w,Math.min(e,pos.x)),pos.z-Math.max(n,Math.min(s,pos.z)))
   if(detail.root&&distance>91){
    detail.root.traverse(mesh=>mesh.geometry?.dispose())
    detail.root.removeFromParent();detail.root=null;changed=true
   }else if(!detail.root&&distance<64){
    detail.root=new T.Group();detail.root.name='Facility interior detail'
    detail.build();flush(detail.root);group.add(detail.root);changed=true
   }
  }
  return changed
 }
 return {group,updateDetails}
}
