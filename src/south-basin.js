import {pavingScale,pavingSurface} from './street-materials.js'
import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {basinRoads,basinGreen,basinLots,basinPlate,basinPromenade,basinCrossings,basinSights,distanceToBasin} from './south-basin-plan.js'
import {streamDistrict} from './district-stream.js'

const gardenLife=[
 [9.1,190.6,3.5],[18.5,190.6,4.7],[9.6,200.7,4.0],[19.8,200.7,4.5],
 [-45,132,5.1],[-41,135,4.0],[-45.5,137,3.7],
 [-16.1,152.2,3.9],[-11.1,162,4.3],[-14.3,171.2,3.7],
 [25.3,132,3.3],[25.3,158.6,3.8],[25.2,185.7,3.1]
]
export function buildSouthBasin(scene,addCollider,maps){
 const shell=new T.Group(),batches=new Map(),box=new T.BoxGeometry()
 shell.name='South Basin streets'
 const wood=new T.MeshStandardMaterial({color:0x80624a,roughness:.87})
 const stone=new T.MeshStandardMaterial({color:0xb8aa91,roughness:.86})
 const paint=new T.MeshStandardMaterial({color:0xd9d2b4,roughness:.86,polygonOffset:true,polygonOffsetFactor:-1})
 const iron=new T.MeshStandardMaterial({color:0x424b4b,metalness:.27,roughness:.77})
 const pavement=maps.citySurfaces?.paving??pavingSurface(maps.street[2],maps.street[3])
 const lawn=new T.MeshStandardMaterial({color:0x879368,roughness:.94,map:maps.meadow?.map??null})
 const emissive=new T.MeshStandardMaterial({color:0xffe5b9,emissive:0xffba70,emissiveIntensity:.53})
 function batch(g,m){const parts=batches.get(m)??[];parts.push(g);batches.set(m,parts)}
 function cube(x,y,z,w,h,d,m){batch(box.clone().scale(w,h,d).translate(x,y,z),m)}
 function top([w,e,n,s],y,m){
  const g=new T.PlaneGeometry(e-w,s-n).rotateX(-Math.PI/2).translate((w+e)/2,y,(n+s)/2),uv=g.attributes.uv
  const p=g.attributes.position
  const scale=m===pavement?pavingScale:4.5
  for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)/scale,-p.getZ(i)/scale)
  batch(g,m)
 }
 for(const rect of basinPromenade)top(rect,.091,pavement)
 for(const {bounds} of basinGreen)top(bounds,.091,lawn)
 const gardenWalks=[[13.9,16.1,187.2,205.3],[7.2,22.4,196.9,201.6],[13.9,20.3,201.2,203.2]]
 for(const rect of gardenWalks)top(rect,.095,pavement)
 function pavingStrip(x,z,w,d){cube(x,.087,z,w,.018,d,stone)}
 for(const r of basinRoads){
  const runs=basinRoads.filter(other=>other.axis!==r.axis&&r.mid>=other.from&&r.mid<=other.to)
  for(let along=r.from+2;along<r.to-1;along+=6){
   if(runs.some(other=>Math.abs(along-other.mid)<other.width/2+3)||
      basinCrossings.some(c=>c.axis===r.axis&&c.mid===r.mid&&Math.abs(along-c.at)<2.4))continue
   const vertical=r.axis==='z'
   cube(vertical?r.mid:along,.009,vertical?along:r.mid,vertical?.105:2.75,.009,vertical?2.75:.105,paint)
  }
  for(const side of [-1,1]){
   const x=r.mid+side*(r.width/2+.11)
   // Leave enough opening for turns, walk crossings and the parking lot entrances.
   const breaks=runs.map(p=>[p.mid-p.width/2-.22,p.mid+p.width/2+.22])
   for(const c of basinCrossings.filter(c=>c.axis===r.axis&&c.mid===r.mid))breaks.push([c.at-1.62,c.at+1.62])
   for(const [w,e,n,s] of basinLots){
    if(r.axis==='z'&&x>w-.85&&x<e+.85)breaks.push([n,s])
    if(r.axis==='x'&&x>n-.85&&x<s+.85)breaks.push([w,e])
   }
   let previous=r.from+.04
   for(const [a,b] of [...breaks,[r.to-.04,r.to]].sort(([a],[b])=>a-b)){
    const end=Math.min(a,r.to),length=end-previous
    if(length>.15){
     const mid=(previous+end)/2
     if(r.axis==='z')pavingStrip(x,mid,.18,length)
     else pavingStrip(mid,x,length,.18)
    }
    previous=Math.max(previous,b)
    if(previous>=r.to)break
   }
  }
 }
 for(const {axis,mid,at,span} of basinCrossings){
  const vertical=axis==='z'
  for(let o=-span/2+.48;o<span/2-.2;o+=.79)
   cube(vertical?mid+o:at,.011,vertical?at:mid+o,vertical?.43:2.2,.012,vertical?2.2:.43,paint)
  for(const s of [-1,1]){
   const side=mid+s*(span/2+.39)
   cube(vertical?side:at,.100,vertical?at:side,vertical?.29:2.15,.012,vertical?2.15:.29,stone)
   const stop=mid+s*(span/4),before=at+s*1.85
   cube(vertical?stop:before,.011,vertical?before:stop,vertical?span*.45:.12,.012,vertical?.12:span*.45,paint)
  }
 }
 for(const [w,e,n,s] of basinLots)for(let x=w+.2;x<e;x+=2.36)cube(x,.009,(n+s)/2,.052,.008,s-n-.21,paint)
 for(const [x,z,rotation] of [[5.84,113.4,0],[18.04,152.2,0],[-27.2,159,0],[-12.6,140.22,Math.PI/2],[10.5,191.8,Math.PI/2]]){
  batch(new T.BoxGeometry(.34,.009,.66).rotateY(rotation).translate(x,.009,z),iron)
  for(let slot=-2;slot<=2;slot++)batch(new T.BoxGeometry(.24,.005,.027)
   .translate(0,.014,slot*.10).rotateY(rotation).translate(x,0,z),stone)
 }
 // The customs signal tower marks the avenue. Its roof repeats the harbour's
 // stepped industrial profile, while the lower shell remains a regular parcel.
 cube(-14.2,16.64,133,4.32,1.90,5.4,stone)
 cube(-14.2,17.77,133,4.70,.34,5.79,iron)
 cube(-14.2,18.59,133,.16,1.31,.18,iron)
 for(let z=131;z<=135;z+=.80)cube(-12.019,16.86,z,.042,.53,.36,emissive)
 // The promenade's lookout shelter leaves its path open on the seaward side.
 const deck=[11.6,18.9,201.3,205.3]
 top(deck,.112,pavement)
 for(const x of [12.08,18.44])for(const z of [201.74,204.84]){
  cube(x,1.64,z,.145,3.09,.145,iron)
  addCollider(x-.08,x+.08,z-.08,z+.08,3.19)
 }
 cube(15.25,3.23,203.3,7.1,.18,3.68,wood)
 for(let i=0;i<9;i++)cube(12.20+i*.76,3.40,203.3,.09,.19,3.72,iron)
 const plate=basinPlate
 cube(plate.x,.49,plate.z,.63,.80,.47,stone)
 cube(plate.x,.928,plate.z,.50,.022,.32,iron)
 cube(plate.x,.943,plate.z,.38,.012,.20,wood)
 for(let i=-1;i<=1;i++)cube(plate.x+i*.104,.954,plate.z,.046,.011,.075,paint)
 addCollider(plate.x-.32,plate.x+.32,plate.z-.24,plate.z+.24,.95)
 const bins=[[-45,147],[-43.5,147],[-42,147]]
 for(const [x,z] of bins){
  cube(x,.66,z,1.17,1.18,1.18,iron);cube(x,1.30,z,1.24,.12,1.24,stone)
  addCollider(x-.6,x+.6,z-.6,z+.6,1.36)
 }
 for(const [x,z] of [[-6.9,106.4],[6.95,136.1],[23.9,151.2],[-26.6,171.8],[23.8,190],[6.75,193.4]]){
  cube(x,1.81,z,.105,3.62,.105,iron)
  cube(x+.18,3.62,z,.47,.10,.15,iron);cube(x+.33,3.53,z,.22,.09,.13,emissive)
  addCollider(x-.065,x+.065,z-.065,z+.065,3.65)
 }
 for(const [x,z] of [[12.0,198.8],[20.7,199],[17.85,204.3],[24.7,164.8]]){
  cube(x,.49,z,1.63,.105,.52,wood);cube(x,.69,z+.23,1.63,.31,.09,wood)
  for(const s of [-1,1])cube(x+s*.65,.264,z,.115,.46,.46,iron)
  addCollider(x-.84,x+.84,z-.26,z+.28,.79)
 }
 for(const s of basinSights){
  cube(s.x,1.05,s.z-.95,.10,1.98,.10,iron)
  cube(s.x,1.73,s.z-.91,.94,.50,.13,wood)
  cube(s.x,1.75,s.z-.835,.84,.41,.036,stone)
  addCollider(s.x-.07,s.x+.07,s.z-1.02,s.z-.88,2.02)
 }
 for(const [x,z] of gardenLife){
  addCollider(x-.14,x+.14,z-.14,z+.14,2.4)
  cube(x,.23,z,.37,.28,.37,wood)
 }
 for(const [m,parts] of batches){
  const g=mergeGeometries(parts)
  const mesh=new T.Mesh(g,m);mesh.receiveShadow=true;shell.add(mesh)
  parts.forEach(p=>p.dispose())
 }
 box.dispose()
 scene.add(shell)
 const stream=streamDistrict({
  enterDistance:55,leaveDistance:88,
  load:()=>import('./south-basin-detail.js').then(mod=>mod.southBasinDetail(maps,gardenLife)),
  attach:detail=>scene.add(detail.group),
  detach:detail=>detail.group.removeFromParent()
 })
 return (p,speed=0,heading=0)=>{
  const lookahead=Math.max(0,speed)*1.2
  const near=Math.min(distanceToBasin(p.x,p.z),distanceToBasin(p.x+Math.sin(heading)*lookahead,p.z-Math.cos(heading)*lookahead))
  shell.visible=near<156
  if(!lawn.map&&maps.meadow?.map){lawn.map=maps.meadow.map;lawn.needsUpdate=true}
  return stream(near)
 }
}
