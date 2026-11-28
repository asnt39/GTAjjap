import * as T from 'three'
import {bunker, bunkerWalls, skylineTowers} from './basin-skyline-plan.js'

const solid = new T.BoxGeometry()
const material = (color, roughness=.78, metalness=0) => new T.MeshStandardMaterial({color,roughness,metalness})

function box(group, mat, x,y,z,w,h,d) {
 const mesh = new T.Mesh(solid,mat)
 mesh.position.set(x,y,z)
 mesh.scale.set(w,h,d)
 mesh.receiveShadow=true
 group.add(mesh)
 return mesh
}

function label(group, words, x,y,z,w,h) {
 const plate = document.createElement('canvas')
 plate.width=384;plate.height=96
 const context=plate.getContext('2d')
 context.fillStyle='#243236';context.fillRect(0,0,384,96)
 context.fillStyle='#b9ab83';context.fillRect(0,0,384,8)
 context.font='bold 28px sans-serif';context.textAlign='center';context.textBaseline='middle'
 context.fillStyle='#f4e7c8';context.fillText(words,192,52,358)
 const texture=new T.CanvasTexture(plate);texture.colorSpace=T.SRGBColorSpace
 const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture}))
 panel.position.set(x,y,z);group.add(panel)
}

function windows(group, tower, levels) {
 const glazing = new T.PlaneGeometry(1,1)
 const glass=material(0xffffff,.26,.32)
 glass.emissive.setHex(0xffc98b);glass.emissiveIntensity=.055
 const frontBays=Math.floor(tower.width/2.05),sideBays=Math.floor(tower.depth/2.05)
 const panes=new T.InstancedMesh(glazing,glass,tower.floors*2*(frontBays+sideBays))
 const stamp=new T.Object3D(),lit=new T.Color(0xd4ad77),dark=new T.Color(),tinted=new T.Color(tower.color)
 let count=0,floor=0
 for(const {bottom,top,width,depth,floors} of levels) {
  const rise=(top-bottom)/floors
  for(let k=0;k<floors;k++,floor++)for(let side=0;side<4;side++) {
   const front=side%2===0, span=front?width:depth, face=front?depth:width
   const n=Math.floor(span/2.02), pitch=(span-.72)/n
   stamp.rotation.y=side*Math.PI/2
   for(let j=0;j<n;j++) {
    const along=-span/2+.36+(j+.5)*pitch, y=bottom+rise*(k+.51)
    stamp.position.set(along,y,face/2+.018).applyAxisAngle(T.Object3D.DEFAULT_UP,stamp.rotation.y)
    stamp.scale.set(pitch*.87,rise*.72,1);stamp.updateMatrix()
    const pattern=(j*13+floor*29+side*19+j*floor*3)%31
    panes.setMatrixAt(count,stamp.matrix)
    panes.setColorAt(count++,pattern<4?lit:dark.copy(tinted).multiplyScalar(.56+pattern*.016))
   }
  }
 }
 panes.count=count;panes.receiveShadow=true
 group.add(panes)
}

function buildTower(parent,tower,addCollider) {
 const {x,z,width,depth,height,floors,name}=tower
 const towerGroup=new T.Group();towerGroup.name=name;towerGroup.position.set(x,.083,z);parent.add(towerGroup)
 const stone=material(0x9a9381),pier=material(0xb7b4a3,.59,.16),spandrel=material(0x506269,.55,.21)
 const base=material(0x374952,.25,.24),cap=material(0x4c5759,.49,.35)
 const beacon=new T.MeshBasicMaterial({color:0xff5b44})
 const emit=(mat,x,y,z,w,h,d)=>box(towerGroup,mat,x,y,z,w,h,d)
 const podium=6.8,spire=height>100,crown=spire?6.9:3.1, setback=spire?12:6
 const levels=[
  {bottom:podium,top:(height-crown)*.68,width:width-1.3,depth:depth-1.2,floors:floors-setback},
  {bottom:(height-crown)*.68,top:height-crown,width:width-4.6,depth:depth-3.3,floors:setback}
 ]
 emit(stone,0,podium/2,0,width,podium,depth).castShadow=true
 emit(base,0,3,depth/2+.035,width-2,5.4,.082)
 for(let j=-3;j<=3;j++)emit(pier,j*(width-2)/7,3.0,depth/2+.07,.18,5.46,.32)
 emit(cap,0,3.45,depth/2+.75,6.1,.22,1.9)
 emit(pier,0,podium-.14,0,width+.16,.27,depth+.16)
 for(const {bottom,top,width:w,depth:d} of levels) {
  const h=top-bottom
  emit(spandrel,0,bottom+h/2,0,w,h,d)
  for(const side of [-1,1])for(const end of [-1,1]) {
   emit(pier,side*(w/2-.16),bottom+h/2,end*d/2,.32,h,.16)
   emit(pier,side*w/2,bottom+h/2,end*(d/2-.26),.17,h,.48)
  }
  emit(cap,0,top-.25,0,w+.18,.50,d+.16)
 }
 windows(towerGroup,tower,levels)
 const roof=height-crown
 emit(cap,0,roof+.84,0,width*.72,1.68,depth*.69)
 emit(pier,0,roof+1.75,0,width*.73,.16,depth*.70)
 if(spire){
  emit(base,0,roof+2.55,0,width*.37,1.84,depth*.48)
  emit(pier,0,roof+4.87,0,.16,2.80,.16)
  emit(beacon,0,height-.32,0,.26,.64,.26)
 }else emit(beacon,0,height-.23,0,.22,.46,.22)
 label(towerGroup,name.toUpperCase(),0,4.72,depth/2+.13,5.5,1.23)
 addCollider(x-width/2,x+width/2,z-depth/2,z+depth/2,height+.083)
}

export function buildBasinSkyline(scene, addCollider, maps) {
 const district=new T.Group(), interior=new T.Group()
 district.name='South Basin skyline';interior.name='South Basin shelter · B1'
 scene.add(district,interior)
 for(const tower of skylineTowers)buildTower(district,tower,addCollider)
 const concrete=material(0xa99b85),steel=material(0x485354,.63,.30),trim=material(0x777668)
 const timber=material(0x746451),rubber=material(0x3d4946),caution=material(0xc69b51)
 const painted=material(0x6f816b),white=new T.MeshBasicMaterial({color:0xffd6a2})
 const green=new T.MeshBasicMaterial({color:0x8dd6aa})
 const [west,east,north,south]=bunker.shelter, x=(west+east)/2,z=(north+south)/2
 box(district,concrete,x,1.49,z,east-west,2.82,south-north).castShadow=true
 box(district,trim,x,2.96,z,east-west+.20,.16,south-north+.20)
 box(district,steel,bunker.entry.x,1.20,south+.045,2.12,2.24,.091)
 box(district,trim,bunker.entry.x,1.20,south+.102,.045,2.14,.032)
 box(district,green,bunker.entry.x+.77,2.47,south+.092,.19,.11,.04)
 label(district,'SOUTH BASIN SHELTER / B1',x,2.67,south+.093,3.50,.70)
 addCollider(west,east,north,south,3.04)

 for(const [lx,lz] of [[-80,149.8],[-80,175.2],[-45.7,175],[-84,188.5],[-64,186.3],[-43,187.7]]) {
  box(district,steel,lx,2.22,lz,.13,4.27,.13)
  box(district,white,lx,4.37,lz,.48,.12,.31)
  addCollider(lx-.07,lx+.07,lz-.07,lz+.07,4.43)
 }

 const [left,right,near,far]=bunker.bounds
 interior.position.y=bunker.floor;interior.visible=false
 const floor=material(0x959183,.86)
 floor.map=maps.street[2];floor.normalMap=maps.street[3];floor.normalScale.set(.27,.27)
 const floorGeo=new T.PlaneGeometry(right-left,far-near).rotateX(-Math.PI/2).translate((right+left)/2,0,(near+far)/2)
 for(let i=0;i<floorGeo.attributes.uv.count;i++)floorGeo.attributes.uv.setXY(i,
  floorGeo.attributes.position.getX(i)/4.5,-floorGeo.attributes.position.getZ(i)/4.5)
 interior.add(new T.Mesh(floorGeo,floor))
 const bottom=(mat,px,h,pz,w,d)=>box(interior,mat,px,h/2,pz,w,h,d)
 box(interior,trim,(left+right)/2,bunker.headroom+.12,(near+far)/2,right-left,.24,far-near)
 for(const [a,b,c,d,h] of bunkerWalls) {
  bottom(h<2?steel:concrete,(a+b)/2,h,(c+d)/2,b-a,d-c)
  if(h>=2)box(interior,painted,(a+b)/2,.39,(c+d)/2,b-a+.018,.68,d-c+.018)
 }
 box(interior,steel,bunker.exit.x,1.27,far-.016,2.16,2.52,.058)
 box(interior,green,bunker.exit.x+.84,2.68,far-.058,.20,.13,.04)
 box(interior,steel,left+.19,2.72,(near+far)/2,.13,.17,far-near-.7)
 box(interior,trim,left+.24,2.54,(near+far)/2,.067,.078,far-near-.7)
 for(let pz=near+1.1;pz<far;pz+=3.6)box(interior,steel,left+.14,2.68,pz,.29,.32,.11)
 for(const px of [bunker.exit.x-1.1,bunker.exit.x+1.1])box(interior,caution,px,.007,far-.8,.091,.014,1.46)
 box(interior,caution,bunker.exit.x,.007,far-1.53,2.27,.014,.091)
 label(interior,'EMERGENCY SUPPLIES',-73.5,2.58,near+.025,4.0,.78)
 label(interior,'UTILITY / VENTILATION',-59.5,2.58,near+.025,4.0,.78)
 label(interior,'ASSEMBLY ROOM',-64.9,2.55,161.027,3.6,.72)
 for(const [px,pz] of [[-81.2,155.8],[-80.7,168.5],[-74.4,155.3],[-61,155.3],[-69,166.8],[-57,167.4]]) {
  box(interior,steel,px,3.03,pz,1.46,.14,.24)
  box(interior,white,px,2.94,pz,1.31,.05,.16)
 }
 for(const [px,pz] of [[-81,168],[-73,155],[-60,155],[-66,168]]) {
  const light=new T.PointLight(0xffdbad,43,15,2);light.position.set(px,2.73,pz);interior.add(light)
 }
 for(const z of [163.3,164.2,165.1,166]) {
  box(interior,timber,-53.32,.55,z,.60,.10,.80)
  box(interior,steel,-53.10,.27,z,.16,.54,.60)
 }
 for(const [px,pz] of [[-71.8,152.8],[-71.0,153.8],[-71.5,155.3]]) {
  box(interior,painted,px,1.20,pz,.68,.48,.75)
  box(interior,caution,px,1.20,pz+.381,.36,.10,.016)
 }
 for(const [px,pz] of [[-56.9,170],[-55.55,170],[-54.66,170]]) {
  box(interior,rubber,px,1.02,pz,.75,.47,1.10)
  box(interior,green,px,1.05,pz+.56,.14,.09,.025)
 }
 return below=>{interior.visible=below}
}
