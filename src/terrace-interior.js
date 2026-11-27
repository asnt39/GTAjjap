import {roomDetails} from './parlor-fittings.js'
import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {loftHome,terraceBounds,terraceCeiling,terraceRooms} from './terrace-plan.js'

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
 }else if(r.loft){
  const upper=loftHome.upper
  box(side,.37,.2,1.04,.57,2.09,'cloth')
  box(side-.41,.70,.2,.22,.68,2.07,'cloth')
  table(-1.7,.56,.72,1.08,.58)
  box(-1.75,.52,far,2.6,.87,.67,'walnut')
  box(-1.75,.985,far,2.7,.095,.73,'oak')
  box(-2.7,upper+.30,far+.35,1.29,.48,1.76,'walnut')
  box(-2.7,upper+.59,far+.35,1.24,.16,1.72,'linen')
  box(-2.7,upper+.69,far-.22,1.13,.11,.39,'cloth')
  box(-.9,upper+.68,far-.19,1.02,1.20,.49,'walnut')
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
 box(0,(r.loft?loftHome.ceiling:terraceCeiling)-.13,-.24,1.2,.11,.37,'lamp')
 return items
}
export function buildTerraceShell(r,part,add,materials){
 const {width:w,height:h,depth:d}=r,face=d/2,ceil=r.loft?loftHome.ceiling:terraceCeiling
 const {facade,stone,lining,wood,iron,glass}=materials
 function wall(x,y,z,width,height,depth,mat){
  part(x,y,z,width,height,depth,mat,true)
  add(...terraceBounds(r,x,z,width,depth,y-height/2,y+height/2))
 }
 wall(0,(ceil+h)/2,0,w,h-ceil,d,facade)
 wall(0,(ceil+.08)/2,-face+.10,w,ceil-.08,.20,facade)
 for(const s of [-1,1]){
  wall(s*(w/2-.1),(ceil+.08)/2,0,.20,ceil-.08,d,facade)
  const span=w/2-.9,mid=s*(.9+span/2)
  wall(mid,.33,face-.09,span,.50,.18,facade)
  wall(mid,1.65,face-.09,span-.22,2.14,.045,glass)
  for(const [dx,woodWidth] of [[-span/2+.065,.13],[span/2-.065,.13],[0,.052]])part(mid+dx,1.65,face-.09,woodWidth,2.14,.19,wood)
  part(mid,2.23,face-.09,span,.07,.17,wood)
  part(mid,.62,face,span+.04,.09,.32,stone)
 }
 if(r.loft){
  const upper=loftHome.upper,stairs=loftHome.stair
  wall(0,2.945,face-.1,w,.49,.20,facade)
  wall(0,5.12,face-.10,w,.72,.20,facade)
  const windows=[-w*.25,w*.25]
  let edge=-w*.5
  for(const x of windows){
   const left=x-.68
   wall((edge+left)*.5,4.19,face-.1,left-edge,1.18,.20,facade)
   wall(x,4.19,face-.09,1.36,1.18,.058,glass)
   part(x,3.585,face+.04,1.63,.12,.23,wood)
   edge=x+.68
  }
  wall((edge+w*.5)*.5,4.19,face-.1,w*.5-edge,1.18,.20,facade)
  wall(0,3.41,face-.1,w,.38,.20,facade)
  wall(0,4.87,face-.1,w,.18,.20,facade)
  const deckDepth=face+stairs.top-.15,deckCenter=stairs.top-deckDepth/2
  part(0,upper-.08,deckCenter,w-.38,.16,deckDepth,wood)
  // A short nose over the stair is supported by the top tread. Give the
  // swept shoulder capsule room to stand before it meets the real slab.
  for(const [left,right,setback] of [[-w*.5+.19,stairs.left,0],
   [stairs.left,stairs.right,.41],[stairs.right,w*.5-.19,0]])
   add(...terraceBounds(r,(left+right)/2,deckCenter-setback*.5,right-left,
    deckDepth-setback,upper-.16,upper))
  const depth=(stairs.bottom-stairs.top)/stairs.count,stepRise=(upper-loftHome.ground)/stairs.count
  const center=(stairs.left+stairs.right)/2,span=stairs.right-stairs.left
  for(let i=0;i<stairs.count;i++){
   const y=loftHome.ground+stepRise*(i+1),z=stairs.bottom-depth*(i+.5)
   part(center,y-stepRise/2,z,span,stepRise,depth+.01,wood)
   if(i%3===0)part(stairs.right+.04,y+.44,z,.063,.89,.063,iron)
  }
  const run=stairs.bottom-stairs.top,tilt=Math.atan2(upper-loftHome.ground,run)
  part(stairs.right+.04,(upper+loftHome.ground)*.5+.91,(stairs.bottom+stairs.top)*.5,
   .081,.073,Math.hypot(run,upper-loftHome.ground),wood,false,tilt)
  for(const [left,right] of [[-w/2+.19,stairs.left],[stairs.right,w/2-.19]]){
   const span=right-left,x=(left+right)/2
   part(x,upper+.92,stairs.top-.12,span,.075,.10,wood)
   for(let i=0;i<=Math.ceil(span/.36);i++)
    part(left+span*i/Math.ceil(span/.36),upper+.45,stairs.top-.12,.065,.90,.065,iron)
   add(...terraceBounds(r,x,stairs.top-.12,span,.115,upper,upper+.96))
  }
 }else wall(0,2.96,face-.1,w,.52,.2,facade)
 part(0,.086,0,w-.39,.008,d-.37,lining)
 part(0,ceil-.02,0,w-.32,.04,d-.31,lining)
 for(const s of [-1,1])part(s*.926,1.39,face,.09,2.64,.19,iron)
 // Persistent, simple furniture footprints match the visible furnishings on every quality.
 const items=fittings(r)
 for(const [x,y,z,w,h,d] of items){
  if(w<.40||d<.38||y>1.20&&(!r.loft||y<loftHome.upper))continue
  add(...terraceBounds(r,x,z,w,d,y>=loftHome.upper?loftHome.upper:0,y+h/2))
 }
}
export function streamTerraceRooms(scene){
 const active=new Map()
 return position=>{
  let changed=false
  for(const r of terraceRooms){
   const gap=(position.x-r.x)**2+(position.z-r.z)**2
   if(active.has(r)){
    if(gap<26**2)continue
    const mesh=active.get(r);mesh.removeFromParent();mesh.geometry.dispose();active.delete(r)
   }else{
    if(gap>19**2)continue
    const parts=[]
    function add(g,color){
     const t=new T.Color(color),rgb=new Uint8Array(g.attributes.position.count*3)
     for(let i=0;i<rgb.length;i+=3){rgb[i]=Math.round(t.r*255);rgb[i+1]=Math.round(t.g*255);rgb[i+2]=Math.round(t.b*255)}
     g.setAttribute('color',new T.Uint8BufferAttribute(rgb,3,true));parts.push(g)
    }
    for(const [x,y,z,w,h,d,color] of fittings(r))add(new T.BoxGeometry(w,h,d).translate(x,y,z),color)
    roomDetails(r,add)
    const mesh=new T.Mesh(mergeGeometries(parts),roomMaterial);parts.forEach(g=>g.dispose())
    mesh.name=r.title+' fittings';mesh.position.set(r.x,0,r.z);mesh.rotation.y=r.angle;mesh.receiveShadow=true;scene.add(mesh);active.set(r,mesh)
   }
   changed=true
  }
  return changed
 }
}
