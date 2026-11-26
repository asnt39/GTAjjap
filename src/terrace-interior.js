import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {terraceBounds,terraceCeiling,terraceRooms} from './terrace-plan.js'

const palette={walnut:0x79553d,oak:0xb69469,steel:0x435352,linen:0xaca889,cloth:0x657c77,paper:0xd1ba93,red:0x9b654c,lamp:0xf4d09c}
const roomMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.74})
function fittings(r){
 const items=[],half=r.width/2,back=-r.depth/2
 function box(x,y,z,w,h,d,key){items.push([x,y,z,w,h,d,palette[key]])}
 function table(x,z,w,d,h=.81){
  box(x,h,z,w,.10,d,'oak')
  for(const a of [-1,1])for(const b of [-1,1])box(x+a*(w/2-.09),h/2,z+b*(d/2-.09),.10,h,.10,'steel')
 }
 function shelf(x,z,w){
  for(const side of [-1,1])box(x+side*w*.48,1.04,z,.085,1.94,.5,'walnut')
  for(let level=0;level<4;level++){
   const y=.22+level*.48;box(x,y,z,w,.08,.55,'oak')
   for(let k=0;k<5;k++){const h=.17+.047*((level+k)%4);box(x+w*(k-2)*.17,y+.045+h/2,z,.12+w*.06,h,.31,['cloth','red','paper'][(k+level)%3])}
  }
 }
 const side=-half+.87,far=back+.83
 if(r.use==='cafe'){
  table(side,.05,1.13,1.2);for(const z of [-.94,1.02]){table(side,z,.53,.52,.48);box(side,.79,z+Math.sign(z)*.22,.53,.48,.07,'cloth')}
  box(half-.85,.62,far,1.36,1.09,1.05,'cloth');box(half-.85,1.2,far,1.49,.09,1.14,'oak')
 }else if(r.use==='home'){
  box(side,.39,.1,1.12,.61,2.08,'cloth');box(side-.52,.72,.1,.15,.76,2.12,'cloth')
  for(const z of [-.49,.68])box(side,.73,z,.86,.13,.93,'linen')
  table(half-.88,far,1.25,.9);box(half-.86,1.11,far,.37,.48,.37,'paper')
 }else if(r.use==='workshop'){
  table(side+.36,far,2.28,1.14,.96);box(side+.57,1.22,far,.52,.40,.48,'steel')
  shelf(half-1.16,far,1.86)
 }else{
  shelf(side+.35,far,1.92)
  if(r.use==='shop')shelf(half-1.19,far,1.85)
  else{table(half-1.19,far,1.9,1.06);box(half-1.19,1.14,far,.59,.42,.10,'steel')}
 }
 box(0,3.09,-.24,1.2,.11,.37,'lamp')
 return items
}
export function buildTerraceShell(r,part,add,materials){
 const {width:w,height:h,depth:d}=r,face=d/2,ceil=terraceCeiling
 const {facade,stone,lining,wood,iron,glass}=materials
 function wall(x,y,z,width,height,depth,mat){
  part(x,y,z,width,height,depth,mat,true)
  add(...terraceBounds(r,x,z,width,depth,y-height/2,y+height/2))
 }
 wall(0,(ceil+h)/2,0,w,h-ceil,d,facade)
 wall(0,1.65,-face+.10,w,3.14,.20,facade)
 for(const s of [-1,1]){
  wall(s*(w/2-.1),1.65,0,.20,3.14,d,facade)
  const span=w/2-.9,mid=s*(.9+span/2)
  wall(mid,.33,face-.09,span,.50,.18,facade)
  wall(mid,1.65,face-.09,span-.22,2.14,.045,glass)
  for(const [dx,woodWidth] of [[-span/2+.065,.13],[span/2-.065,.13],[0,.052]])part(mid+dx,1.65,face-.09,woodWidth,2.14,.19,wood)
  part(mid,2.23,face-.09,span,.07,.17,wood)
  part(mid,.62,face,span+.04,.09,.32,stone)
 }
 wall(0,2.96,face-.1,w,.52,.2,facade)
 part(0,.086,0,w-.39,.008,d-.37,lining)
 part(0,ceil-.02,0,w-.32,.04,d-.31,lining)
 for(const s of [-1,1])part(s*.926,1.39,face,.09,2.64,.19,iron)
 // Persistent, simple furniture footprints match the visible furnishings on every quality.
 const items=fittings(r)
 for(const [x,y,z,w,h,d] of items){
  if(w<.40||d<.38||y>1.20)continue
  add(...terraceBounds(r,x,z,w,d,0,y+h/2))
 }
}
export function streamTerraceRooms(scene){
 const active=new Map()
 return position=>{
  let changed=false
  for(const r of terraceRooms){
   const gap=(position.x-r.x)**2+(position.z-r.z)**2
   if(active.has(r)){
    if(gap<40**2)continue
    const mesh=active.get(r);mesh.removeFromParent();mesh.geometry.dispose();active.delete(r)
   }else{
    if(gap>27**2)continue
    const parts=fittings(r).map(([x,y,z,w,h,d,color])=>{
     const g=new T.BoxGeometry(w,h,d).translate(x,y,z),t=new T.Color(color),rgb=[]
     for(let k=0;k<24;k++)rgb.push(t.r,t.g,t.b)
     g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));return g
    })
    const mesh=new T.Mesh(mergeGeometries(parts),roomMaterial);parts.forEach(g=>g.dispose())
    mesh.name=r.title+' fittings';mesh.position.set(r.x,0,r.z);mesh.rotation.y=r.angle;mesh.receiveShadow=true;scene.add(mesh);active.set(r,mesh)
   }
   changed=true
  }
  return changed
 }
}
