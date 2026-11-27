import {loadPortProp} from './port-props.js'
import {archive,buildArchive,archivePrint} from './chart-room.js'
import {garage,buildGarage} from './garage.js'
import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

export async function buildArchitecture(scene,addCollider,surfaceMaps){
 const loader=new T.TextureLoader(),root='/assets/architecture/'
 const files=['factory_brick','grey_plaster','blue_plaster_weathered','worn_corrugated_iron','district_graphics']
 const [bench,maps]=await Promise.all([
  loadPortProp('archive-bench'),
  Promise.all(files.map(n=>loader.loadAsync(root+n+'.webp')))
 ])
 for(const m of maps){m.colorSpace=T.SRGBColorSpace;m.anisotropy=4}
 for(const m of maps.slice(0,4))m.wrapS=m.wrapT=T.RepeatWrapping
 if(surfaceMaps)surfaceMaps.architecture=maps
 const walls=maps.slice(0,4).map(map=>new T.MeshStandardMaterial({map,roughness:.89}))
 const mat=(color,roughness=.72,metalness=.16)=>new T.MeshStandardMaterial({color,roughness,metalness})
 const trim=mat(0x65615b),iron=mat(0x343c3e,.63,.53),ledge=mat(0xa49d8c),roof=mat(0x424742),brick=mat(0x956952)
 const sign=new T.MeshStandardMaterial({map:maps[4],emissiveMap:maps[4],emissive:0xffffff,emissiveIntensity:.4,roughness:.51})
 const lit=new T.MeshStandardMaterial({map:maps[4],emissiveMap:maps[4],emissive:0xffecd6,emissiveIntensity:.7,roughness:.34,metalness:.12})
 const tinted=mat(0x3e565c,.24,.35)
 const awnings=[0x2f6564,0xa25239,0x506d70,0xad9070].map(v=>mat(v))
 const batches=new Map(),archiveBatches=new Map()
 let activeBatch=batches
 const boxGeo=new T.BoxGeometry(),v=(x,y,z)=>new T.Vector3(x,y,z)
 const cube=(x,y,z,w,h,d,material,rot=0)=>{
  const g=boxGeo.clone();const uv=g.attributes.uv
  if(walls.includes(material)){for(let i=0;i<24;i++){const face=Math.floor(i/4);const sx=face<2?d:w,sy=face===2||face===3?d:h;uv.setXY(i,uv.getX(i)*sx/3.3,uv.getY(i)*sy/3.3)}}
  g.scale(w,h,d).rotateZ(rot).translate(x,y,z);add(g,material)
 }
 function add(g,m){const arr=activeBatch.get(m)||[];arr.push(g.index?g.toNonIndexed():g);activeBatch.set(m,arr)}
 function panel(x,y,z,w,h,tile,dir,material=sign,front=false){
  const g=new T.PlaneGeometry(w,h),uv=g.attributes.uv
  for(let i=0;i<uv.count;i++)uv.setXY(i,((tile%4)+.007+.986*uv.getX(i))/4,(7-Math.floor(tile/4)+.012+.976*uv.getY(i))/8)
  if(!front)g.rotateY(dir*Math.PI/2);else if(dir<0)g.rotateY(Math.PI)
  add(g.translate(x,y,z),material)
 }
 function rail(a,b,r,m=iron){const start=v(...a),end=v(...b),delta=end.clone().sub(start);const g=new T.CylinderGeometry(r,r,delta.length(),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(v(0,1,0),delta.normalize()));g.translate(...start.lerp(end,.5).toArray());add(g,m)}
 const buildings=[
  [-11.1,42,14,14,1,5],[-11.25,26.2,15.5,9,0,8],[-11.05,10.6,14.9,13,0,0],[-11.5,-4.1,13.6,10,2,2],[-11.2,-17.5,12.4,14.8,1,1],[-11.1,-27.4,6.4,8,3,4],
  [-11.4,-51,13.6,12,0,6],[-11,-65.1,13.3,17,1,5],[-11.2,-80.3,15.9,9.3,3,3],[-11.2,-97,15,12,2,7],[-11,57,12.4,8.8,2,10],
  [11.1,48,18.5,10.8,0,4],[11.4,-72.7,16.7,9,3,3],[11,-90.2,17.6,15,1,9],[11.5,-104,9,11.4,0,11]]
 for(const [idx,[x,z,w,h,skin,shop]] of buildings.entries()){
  if(x===-11&&z===57)continue // Breakwater Arms occupies this street frontage.
  const dir=x<0?1:-1,depth=10+idx%4,tx=(offset)=>x+dir*offset
  const home=x===garage.front&&z===garage.car.z
  if(x===archive.front && z===26.2){
   activeBatch=archiveBatches
   const chart=new T.CanvasTexture(archivePrint());chart.colorSpace=T.SRGBColorSpace
   const paper=new T.MeshStandardMaterial({map:chart,roughness:.86,emissiveMap:chart,emissive:0xffffff,emissiveIntensity:.18})
   const lamp=new T.MeshBasicMaterial({color:0xffe2a0})
   add(new T.PlaneGeometry(2.10,1.05).rotateX(-Math.PI/2).translate((x+archive.back)/2,1.125,25.5),paper)
   add(new T.PlaneGeometry(2.1,1.05).rotateY(Math.PI/2).translate(x+.3,1.62,archive.door-2.43),paper)
   buildArchive({cube,rail,panel,addCollider,walls:walls[skin],iron,trim,ledge,lit,lamp,roof,benchModel:bench},h)
   activeBatch=batches
  }else if(home){
   buildGarage({cube,panel,addCollider,wall:walls[skin],iron,trim,ledge,lit},h)
  }else if(x>0&&(z===48||z===-72.7)){
   // The ends of the older terminal apron overlap these two street buildings.
   // Keep their upper floors, with a genuine clearance bay below the deck.
   const head=3.58,left=12.16,right=16.84
   for(const [a,b] of [[x,left],[right,x+depth]]){
    cube((a+b)/2,head/2,z,b-a,head,w,walls[skin])
    addCollider(a,b,z-w/2,z+w/2,head)
   }
   cube(x+depth/2,(h+head)/2,z,depth,h-head,w,walls[skin])
   addCollider(x,x+depth,z-w/2,z+w/2,h,false,head)
   for(const end of [-1,1]){
    const zz=z+end*(w/2-.20)
    cube((left+right)/2,head+.16,zz,right-left+.3,.32,.4,iron)
    for(const xx of [left-.04,right+.04]){
     cube(xx,1.62,zz,.19,3.22,.38,ledge)
     for(let band=0;band<3;band++)cube(xx+Math.sign(14.5-xx)*.10,.45+band*.40,zz,.04,.15,.36,iron)
    }
   }
   for(const off of [-.3,.2])cube(14.5,head-.06,z+w*off,1.08,.075,.28,lit)
  }else{
   cube(tx(-depth/2),h/2,z,depth,h,w,walls[skin])
   addCollider(Math.min(x,tx(-depth)),Math.max(x,tx(-depth)),z-w/2,z+w/2,h)
  }
  // Masonry piers, roof cornices and a recessed parapet.
  for(const e of [-1,1])cube(tx(.065),h/2,z+e*(w/2-.21),.21,h,.44,skin===0?brick:trim)
  cube(tx(-depth/2),h+.08,z,depth+.28,.20,w+.35,ledge)
  cube(tx(-depth/2),h+.24,z,depth-.24,.12,w-.23,roof)
  cube(tx(.05),h+.40,z,.25,.46,w+.16,walls[skin])
  cube(tx(.12),3.82,z,.34,.21,w+.24,ledge)
  const bays=Math.max(2,Math.floor(w/3.0)),span=(w-.9)/bays
  for(let j=0;j<bays;j++){
   const zz=z-w/2+.45+span*(j+.5),door=j===bays-1
   if(x===archive.front && door)continue
   if(home&&Math.abs(zz-z)<4.1)continue
   cube(tx(.13),1.48,zz,.18,2.77,span-.12,iron)
   panel(tx(.23),1.52,zz,span-.34,2.53,door&&idx%3===0?25:16+(idx+j)%4,dir,lit)
   cube(tx(.255),1.46,zz,.07,.08,span-.26,iron)
   cube(tx(.255),1.46,zz+.2,.07,2.58,.065,iron)
   if(door)cube(tx(.33),1.17,zz+.26,.09,.26,.038,ledge)
  }
  cube(tx(.21),3.39,z,.32,.78,w-.62,iron)
  panel(tx(.385),3.39,z,w-.78,.72,shop,dir)
  const canopy=awnings[idx%awnings.length]
  cube(tx(.68),2.88,z,1.29,.1,w-.48,canopy,-dir*.13)
  cube(tx(1.30),2.70,z,.055,.22,w-.48,canopy)
  const levels=Math.max(1,Math.floor((h-4.1)/2.7)),floor=(h-4.1)/levels
  for(let k=0;k<levels;k++)for(let j=0;j<bays;j++){
   const zz=z-w/2+.45+span*(j+.5),yy=4.15+floor*(k+.47),ww=Math.min(2.05,span-.6),wh=Math.min(1.88,floor-.54)
   cube(tx(.055),yy,zz,.11,wh+.2,ww+.24,trim)
   panel(tx(.117),yy,zz,ww,wh,20+((k*3+idx+j)%4),dir,sign)
   cube(tx(.14),yy,zz,.075,wh,.073,iron);cube(tx(.14),yy+.3,zz,.075,.06,ww,iron)
   cube(tx(.15),yy-wh/2-.10,zz,.36,.15,ww+.38,ledge)
   if((idx+k+j)%5===0){cube(tx(.31),yy-wh*.46,zz+.47,.47,.43,.82,ledge);panel(tx(.556),yy-wh*.46,zz+.47,.8,.40,24,dir)}
  }
  if(w>12&&idx%3!==0){
   const zz=z-w*.38,hh=h*.49,xx=tx(1.09)
   cube(tx(.54),hh+1.4,zz,1.1,.10,.11,iron);cube(xx,hh,zz,.78,2.86,.24,iron)
   panel(xx,hh,zz+.126,.75,2.79,idx===2?12:12+idx%4,1,lit,true)
   panel(xx,hh,zz-.126,.75,2.79,idx===2?12:12+idx%4,-1,lit,true)
  }
  // External stairs and roof service fittings break up the silhouettes.
  if(idx%3===1){
   for(let j=0;j<levels;j++){const yy=4.15+j*floor,zz=z+w*.34
    cube(tx(.67),yy,zz,1.31,.11,2.0,iron);cube(tx(1.27),yy+.52,zz,.047,.058,2,iron)
    for(let n=0;n<5;n++)cube(tx(1.27),yy+.27,zz-.92+n*.46,.034,.5,.034,iron)
    if(j<levels-1)for(let n=0;n<10;n++)cube(tx(.76),yy+n*floor/10,zz-1.7+n*.28,.76,.055,.30,iron)
   }
  }
  const zz=z-w*.43;rail([tx(.21),.20,zz],[tx(.21),h-.15,zz],.052)
  cube(tx(-2.7),h+.62,z+w*.2,2.1,1.03,2.56,trim);cube(tx(-2.7),h+1.17,z+w*.2,2.24,.12,2.66,ledge)
  cube(tx(-depth*.64),h+1.15,z-w*.23,2.7,2.22,2.76,walls[skin]);cube(tx(-depth*.64),h+2.32,z-w*.23,2.96,.16,3.01,roof)
  panel(tx(.125),1.60,z-w/2+.24,.39,.57,26+idx%6,dir)
 }
 // Glazing is baked into a repeating window texture for distant buildings.
 const c=document.createElement('canvas');c.width=256;c.height=512;const p=c.getContext('2d');p.fillStyle='#686b6a';p.fillRect(0,0,256,512)
 for(let j=0;j<16;j++)for(let i=0;i<8;i++){p.fillStyle=['#495357','#536064','#7d8584','#817766','#a5997c'][(i*13+j*23+i*j)%5];p.fillRect(i*32+3,j*32+4,26,22);p.fillStyle='#566068';p.fillRect(i*32+15,j*32+4,2,22)}
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace
 const highrise=new T.MeshStandardMaterial({map:texture,color:0xaba6a0,roughness:.68})
 for(let i=0;i<34;i++){
  const across=i>20,x=across?72+((i*13)%45):-102+((i*27)%194),z=across?-112+(i-21)*18:-125-((i*19)%61),height=13+((i*37)%49),w=8+((i*7)%12),d=9+((i*11)%11)
  cube(x,height/2,z,w,height,d,highrise);cube(x,height+.65,z,w*.77,1.3,d*.79,trim)
 }
 const group=new T.Group();group.name='Portside architecture'
 const room=new T.Group();room.name=archive.id
 for(const [collection,target] of [[batches,group],[archiveBatches,room]])for(const [m,parts] of collection){const mesh=new T.Mesh(mergeGeometries(parts),m);mesh.castShadow=mesh.receiveShadow=true;target.add(mesh);for(const g of parts)g.dispose()}
 if(bench){
  const seats=new T.InstancedMesh(bench.geometry,bench.material,2)
  const placement=new T.Object3D()
  placement.scale.setScalar(1.23)
  placement.rotation.y=Math.PI
  for(const [index,offset] of [-.82,.82].entries()){
   placement.position.set((archive.front+archive.back)/2+offset,.066,archive.south-.57)
   placement.updateMatrix();seats.setMatrixAt(index,placement.matrix)
  }
  seats.name='Archive waiting benches';seats.castShadow=seats.receiveShadow=true
  room.add(seats)
 }
 group.add(room);scene.add(group)
}
