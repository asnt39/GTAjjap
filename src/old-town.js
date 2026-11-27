import {asphaltScale,pavingScale,roadSurface,pavingSurface} from './street-materials.js'
import {basinLand,distanceToBasin,insideBasin} from './south-basin-plan.js'
import {streetDetails,reservedSurfaces} from './town-streets.js'
import {within,crossings} from './street-plan.js'
import {buildClockLane} from './clock-lane.js'
import {terraceSigns,detailTerrace} from './terrace-fronts.js'
import {rows,terraceRooms} from './terrace-plan.js'
import {buildTerraceShell} from './terrace-interior.js'
import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {inWestBank} from './west-bank-plan.js'
import {clockCourt,townTiles,townPavement,townRoadSurface,townRoomBarriers} from './old-town-plan.js'
import {rowRooms} from './market-row-plan.js'
import {buildRowShell} from './market-row-shell.js'

export function buildOldTown(scene,addCollider,boxes,{street,architecture,storeFloor,rowBoards,meadow,citySurfaces}){
 const town=new T.Group(),structures=new T.Group(),westStructures=new T.Group(),barriers=new T.Group()
 const basinGround=new T.Group(),basinStructures=new T.Group()
 town.name='Old Town';structures.name='Clock Court and terraces'
 basinGround.name='South Basin road and pavement';basinStructures.name='South Basin buildings'
 town.add(structures,westStructures,basinGround,basinStructures,barriers);scene.add(town)
 const standard=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.81,...extra})
 const surface=citySurfaces?.asphalt??roadSurface(street[0],street[1])
 const pavement=citySurfaces?.paving??pavingSurface(street[2],street[3])
 const stone=standard(0xb4aa91),iron=standard(0x343a35,{metalness:.38})
 const roof=standard(0x494c45),wood=standard(0x6b4e3c),fabric=standard(0x58655a)
 const trim=standard(0xa1937a),paint=standard(0xd9c392),lamp=standard(0xe5c49a,{emissive:0xdca060,emissiveIntensity:.48})
 const trafficPaint=standard(0xbfb9a1,{roughness:.89})
 const storeMaterial=storeFloor??standard(0xa29580,{map:street[2],normalMap:street[3]})
 const lining=standard(0xc0baa2,{map:architecture[1]})
 const boards=rowBoards??standard(0x675140,{roughness:.76})
 const glass=standard(0x8ba1a0,{opacity:.22,transparent:true,roughness:.32,metalness:.15,depthWrite:false,side:T.DoubleSide})
 glass.forceSinglePass=true
 const walls=[0xc6aba1,0xd4c5a6,0xc0c5bc].map((color,i)=>standard(color,{map:architecture[i]}))
 const atlas=standard(0xeddbc0,{map:architecture[4],emissiveMap:architecture[4],emissive:0xd9ad7e,emissiveIntensity:.24})
 const batches=new Map(),solidBox=new T.BoxGeometry()
 const colored=new Set([stone,trim,roof,wood,paint,fabric]),masonry=standard(0xffffff,{vertexColors:true})
 const detailMetal=standard(0xffffff,{vertexColors:true,metalness:.22,roughness:.72})
 const blocks=new Map()
 function detailBlock(x,z){
  const bx=Math.floor(x/62),bz=Math.floor(z/62),key=bx+','+bz
  if(!blocks.has(key)){
   const group=new T.Group();group.userData.facadeDetail=true;town.add(group)
   blocks.set(key,{group,x:(bx+.5)*62,z:(bz+.5)*62})
  }
  return blocks.get(key).group
 }
 function batch(geometry,material,group=structures){
  const detail=group.userData.facadeDetail
  if(colored.has(material)||(detail&&material===iron)){
   const rgb=new Uint8Array(geometry.attributes.position.count*3),t=material.color
   for(let i=0;i<rgb.length;i+=3){rgb[i]=Math.round(t.r*255);rgb[i+1]=Math.round(t.g*255);rgb[i+2]=Math.round(t.b*255)}
   geometry.setAttribute('color',new T.Uint8BufferAttribute(rgb,3,true));material=detail?detailMetal:masonry
  }
  const mats=batches.get(group)??new Map(),parts=mats.get(material)??[]
  const piece=geometry.index?geometry.toNonIndexed():geometry
  parts.push(piece);mats.set(material,parts);batches.set(group,mats)
  if(piece!==geometry)geometry.dispose()
 }
 function box(x,y,z,w,h,d,material,group=structures){
  batch(solidBox.clone().scale(w,h,d).translate(x,y,z),material,group)
 }
 function floor([x0,x1,z0,z1],height,material,group=town){
  const g=new T.PlaneGeometry(x1-x0,z1-z0).rotateX(-Math.PI/2)
  const uv=g.attributes.uv
  const scale=material===surface?asphaltScale:material===pavement?pavingScale:4.5
  for(let i=0;i<uv.count;i++)uv.setXY(i,(x0+(x1-x0)*uv.getX(i))/scale,(-z1+(z1-z0)*uv.getY(i))/scale)
  batch(g.translate((x0+x1)/2,height,(z0+z1)/2),material,group)
 }
 const basinNorth=basinLand[0][2]
 function districtFloor(rect,height,material){
  const [a,b,n,s]=rect
  // The older West Bank quay shares the latitude, but sits far to the west.
  if(a<basinLand[1][0]||s<=basinNorth){floor(rect,height,material);return}
  if(n<basinNorth)floor([a,b,n,basinNorth],height,material)
  floor([a,b,Math.max(n,basinNorth),s],height,material,basinGround)
 }
 for(const rect of townRoadSurface)districtFloor(rect,0,surface)
 const pavementTiles=townTiles([...townPavement,...reservedSurfaces],(x,z)=>
  townPavement.some(r=>within(r,x,z))&&!reservedSurfaces.some(r=>within(r,x,z)))
 for(const rect of pavementTiles)districtFloor(rect,.082,pavement)
 streetDetails({floor,addCollider,box:(...args)=>box(...args,town),batch:(g,m)=>batch(g,m,town),
  materials:{stone,paint:trafficPaint,asphalt:surface,paving:pavement,planted:meadow??standard(0x626b49),iron}})
 for(const [x,z,angle] of [[-73.29,57,0],[-62.73,73,0],[-40.31,89,0],[-114,96.17,Math.PI/2],[-145,69.84,Math.PI/2]]){
  batch(new T.BoxGeometry(.33,.026,.66).rotateY(angle).translate(x,.016,z),iron,town)
  for(let i=-2;i<=2;i++)batch(new T.BoxGeometry(.24,.004,.028).translate(0,.033,i*.10).rotateY(angle).translate(x,0,z),roof,town)
 }

 // Painted dashes stop before corners and junctions.
 for(const [axis,mid,from,to] of [
  ['z',0,64,78],['z',-68,-28,23],['z',-68,40,102],['z',-35,40,75],['z',-35,93,101],
  ['x',32,-60,-43],['x',109,-60,-43],['x',84,-27,-9],
  ['x',23,-183,-152],['x',23,-140,-117],['x',64.5,-212,-149],['x',100.5,-181,-155],['x',100.5,-141,-112],
  ['z',-187,29,39],['z',-187,72,83],['z',-146,28,57],['z',-146,72,96],['z',-110,30,92],['z',-216,50,82],
  ['x',23,-210,-193],['z',-216,29,37]
 ])for(let p=from+1.5;p<to-1;p+=5.1){
  const z=axis==='z',x= z?mid:p,depth=z?p:mid
  if(crossings.some(c=>c.axis===axis&&Math.hypot(x-c.x,depth-c.z)<c.width/2+1.2))continue
  box(x,.004,depth,z?.10:2.05,.006,z?2.05:.10,paint,town)
 }
 const rotate=(x,z,angle,geometry)=>geometry.rotateY(angle).translate(x,0,z)
 function panels(w,h,x,y,z,tile,angle,originX,originZ,turn=0,group=structures){
  const g=new T.PlaneGeometry(w,h),uv=g.attributes.uv
  for(let i=0;i<uv.count;i++)uv.setXY(i,((tile%4)+.012+.976*uv.getX(i))/4,(7-Math.floor(tile/4)+.014+.972*uv.getY(i))/8)
  batch(rotate(originX,originZ,angle,g.rotateY(turn).translate(x,y,z)),atlas,group)
 }
 const signs=terraceSigns()
 for(const [i,[x,z,width,height,depth,skin,angle]] of rows.entries()){
  const room=rowRooms.find(r=>r.x===x&&r.z===z)
  const terrace=terraceRooms.find(r=>r.index===i)
  const sideways=Math.abs(Math.sin(angle))>.5
  const w=sideways?depth:width,d=sideways?width:depth
  if(!room&&!terrace)addCollider(x-w/2,x+w/2,z-d/2,z+d/2,height+.36)
  const basin=insideBasin(x,z)
  let group=basin?basinStructures:inWestBank(x,z)?westStructures:structures
  const facade=walls[skin],face=depth/2
  function part(px,y,pz,pw,ph,pd,mat,tileSurface=false,tilt=0,target=group){
   const g=solidBox.clone().scale(pw,ph,pd)
   if(tileSurface){
    const uv=g.attributes.uv
    for(let j=0;j<uv.count;j++){
     const faceId=Math.floor(j/4),span=faceId<2?pd:pw,rise=faceId===2||faceId===3?pd:ph
     uv.setXY(j,uv.getX(j)*span/3.3,uv.getY(j)*rise/3.3)
    }
   }
   g.rotateX(tilt).translate(px,y,pz)
   batch(rotate(x,z,angle,g),mat,target)
  }

  if(room){
   const roomGroup=new T.Group();roomGroup.name=room.title+' interior';town.add(roomGroup)
   const decorate=(mesh,px,y,pz)=>{mesh.position.set(px,y,pz).applyAxisAngle(T.Object3D.DEFAULT_UP,angle).add(new T.Vector3(x,0,z));mesh.rotation.y=angle;roomGroup.add(mesh)}
   buildRowShell(room,height,part,decorate,addCollider,roomGroup,{facade,trim,iron,wood,lamp,stone,lining,boards,storeFloor:storeMaterial,glass})
  }else if(terrace){
   buildTerraceShell(terrace,part,addCollider,{facade,stone,lining,wood,iron,glass})
  }else part(0,height/2+.082,0,width,height,depth,facade,true)
  part(0,height+.22,0,width+.36,.32,depth+.40,stone)
  part(0,height+.42,0,width+.14,.17,depth+.12,roof)
  part(i%2?width*.24:-width*.27,height+.72,-depth*.21,.72,.64,.58,facade,true)
  if(i%3===1){
   // Pitched slate roof behind its masonry cornice.
   const peak=new T.Shape()
   peak.moveTo(-width/2,0);peak.lineTo(0,1.23);peak.lineTo(width/2,0);peak.closePath()
   batch(rotate(x,z,angle,new T.ExtrudeGeometry(peak,{depth:depth+.18,bevelEnabled:false}).translate(0,height+.40,-depth/2-.09)),roof,group)
  }
  group=detailBlock(x,z)
  detailTerrace({i,width,height,depth,part,panels,terrace,group,x,z,angle,rotate,batch,signs,materials:{iron,stone,trim,wood,roof,facade,lamp}})
  for(const side of [-1,1])part(side*(width/2-.21),height/2+.09,face+.07,.36,height,.18,trim)
  const shop=i%3!==1
  const door=shop?width*.25:0
  if(!room&&!terrace){
   part(door,1.20,face+.117,1.36,2.40,.12,wood)
   panels(1.21,2.20,door,1.27,face+.187,25,angle,x,z,0,group)
   part(door+.41,1.10,face+.211,.066,.21,.07,stone)
  }
  if(terrace){
   part(0,2.87,face+.36,width-.34,.11,.82,terrace.use==='home'?stone:fabric,false,.10)
  }else if(room?.id==='chandlery'){
   part(0,2.47,face+.62,width-.62,.071,1.12,fabric,false,.14)
   part(0,2.39,face+1.16,width-.62,.12,.062,trim)
  }else if(room?.id==='lodging'){
   part(0,2.35,face+.32,2.32,.15,.64,stone)
   for(const side of [-1,1])part(side*.97,1.87,face+.09,.20,.72,.21,trim)
  }else if(shop){
   part(-.76,1.48,face+.106,width*.49,1.91,.12,iron)
   panels(width*.45,1.72,-.76,1.48,face+.18,16+i%4,angle,x,z,0,group)
   part(-.76,1.46,face+.20,width*.46,.075,.06,wood)
   part(0,3.16,face+.14,width-.81,.60,.17,iron)
   panels(width-.97,.48,0,3.16,face+.24,i%12,angle,x,z,0,group)
   part(0,2.76,face+.47,width-.50,.095,1.01,i%2?fabric:wood,false,.14)
   part(0,2.665,face+.95,width-.50,.127,.052,trim)
  }else{
   for(const a of [-1,1]){
    part(a*width*.282,1.55,face+.12,1.21,1.49,.14,trim)
    panels(1.03,1.30,a*width*.282,1.55,face+.194,21,angle,x,z,0,group)
   }
   part(0,2.63,face+.41,1.92,.145,.83,stone)
  }
  const top=basin?Math.max(1,Math.floor((height-2.8)/2.55)):height>8.35?2:1
  for(let level=0;level<top;level++)for(const side of [-1,1]){
   const y=4.45+2.42*level,xWall=width/2
   for(const bay of [-.23,.22]){
    part(side*(xWall+.067),y,depth*bay,.13,1.52,1.28,trim)
    panels(1.09,1.32,side*(xWall+.139),y,depth*bay,20+(i+level)%4,angle,x,z,side*Math.PI/2,group)
    part(side*(xWall+.13),y-.78,depth*bay,.28,.13,1.38,stone)
   }
  }
  for(let floor=0;floor<top;floor++)for(const side of [-1,1]){
   const px=side*width*.24,py=4.44+floor*2.42
   part(px,py,face+.09,1.58,1.75,.15,trim)
   panels(1.36,1.53,px,py,face+.175,20+(i+floor)%4,angle,x,z,0,group)
   part(px,py-.89,face+.18,1.69,.145,.37,stone)
   if((i+floor)%2===1)for(const shutter of [-1,1])part(px+shutter*.72,py,face+.215,.21,1.48,.055,wood)
  }
 }

 buildClockLane({batch,box,materials:{iron,roof,stone,lamp,trim}})
 const {x,z}=clockCourt
 addCollider(x-1.65,x+1.65,z-1.43,z+1.43,10.5)
 box(x,.22,z,3.6,.275,3.16,stone)
 box(x,4.02,z,2.89,7.67,2.56,walls[1])
 box(x,6.98,z,3.16,.21,2.86,trim)
 box(x,7.83,z,3.28,.22,2.95,stone)
 for(const side of [-1,1])for(const dz of [-.95,.95])box(x+side*1.18,8.49,z+dz,.31,1.24,.29,stone)
 batch(new T.ConeGeometry(2.18,1.23,4).rotateY(Math.PI/4).translate(x,9.65,z),roof)
 box(x,10.49,z,.095,.47,.095,iron)
 const dial=document.createElement('canvas');dial.width=dial.height=256
 const ctx=dial.getContext('2d')
 ctx.fillStyle='#eee0b6';ctx.fillRect(0,0,256,256)
 ctx.strokeStyle='#3e453b';ctx.lineWidth=9;ctx.beginPath();ctx.arc(128,128,116,0,Math.PI*2);ctx.stroke()
 ctx.lineWidth=5
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,cs=Math.cos(a),sn=Math.sin(a)
  ctx.beginPath();ctx.moveTo(128+cs*83,128+sn*83);ctx.lineTo(128+cs*103,128+sn*103);ctx.stroke()
 }
 ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(94,90);ctx.lineTo(128,128);ctx.lineTo(168,66);ctx.stroke()
 const clockMap=new T.CanvasTexture(dial);clockMap.colorSpace=T.SRGBColorSpace
 const clockFace=standard(0xffedc0,{map:clockMap,emissive:0x9c743e,emissiveIntensity:.35})
 for(const side of [-1,1]){
  const plate=new T.CircleGeometry(.81,32).rotateY(side===1?0:Math.PI)
  batch(plate.translate(x,6.1,z+side*1.293),clockFace)
 }
 for(const [a,b] of [[-74.8,-18],[-61.3,18],[-61,44],[-42,42],[-76,80],[-43,101],[-63,117],[-6.9,72]]){
  batch(new T.CylinderGeometry(.058,.11,3.93,8).translate(a,2.047,b),iron)
  box(a,3.94,b,.47,.14,.46,iron)
  box(a,3.78,b,.28,.25,.28,lamp)
  addCollider(a-.15,a+.15,b-.15,b+.15,3.93)
 }
 for(const [a,b] of [[-54.3,48.2],[-48.6,53.9],[-52.8,55.5]]){
  box(a,.27,b,1.65,.374,.73,stone)
  box(a,.48,b,1.59,.088,.67,wood)
  addCollider(a-.83,a+.83,b-.38,b+.38,.53,true)
 }
 for(const name of [[-51.5,4.14,z+1.29],[-37.05,3.5,89.8]]){
  const card=document.createElement('canvas');card.width=512;card.height=100
  const p=card.getContext('2d');p.fillStyle='#3d4640';p.fillRect(0,0,512,100)
  p.fillStyle='#dec8a0';p.fillRect(12,10,488,3);p.fillRect(12,87,488,3)
  p.font='600 54px Georgia,serif';p.textAlign='center';p.fillText('CLOCK COURT',256,70)
  const map=new T.CanvasTexture(card);map.colorSpace=T.SRGBColorSpace
  batch(new T.PlaneGeometry(2.78,.54).translate(...name),standard(0xffffff,{map}))
 }

 for(const [a,b,c,d,h] of townRoomBarriers){
  box((a+b)/2,h*.5,(c+d)/2,b-a,h,d-c,stone,barriers)
  box((a+b)/2,.60,d+.025,b-a,.085,.04,paint,barriers)
 }
 solidBox.dispose()
 for(const [group,materials] of batches)for(const [material,parts] of materials){
  const geometry=mergeGeometries(parts)
  const mesh=new T.Mesh(geometry,material)
  mesh.receiveShadow=true;mesh.castShadow=group===structures||group===westStructures
  group.add(mesh);parts.forEach(g=>g.dispose())
 }
 barriers.visible=false
 return (open,position,low=false)=>{
  // Far buildings keep their silhouettes. Distant shadow batches stay out
  // of the shadow map until the player approaches either side of the loop.
  const shadows=Math.hypot(Math.max(0,position.x+23,-86-position.x),Math.max(0,17-position.z,position.z-126))<38
  const westShadows=position.x<-69
  const basinDistance=distanceToBasin(position.x,position.z),basinVisible=basinDistance<156
  let changed=structures.children[0].castShadow!==shadows||westStructures.children[0].castShadow!==westShadows
  if(changed){
   for(const mesh of structures.children)mesh.castShadow=shadows
   for(const mesh of westStructures.children)mesh.castShadow=westShadows
  }
  const basinShadows=basinDistance<(low?23:39)
  if(basinStructures.children[0].castShadow!==basinShadows||basinStructures.visible!==basinVisible){
   basinGround.visible=basinStructures.visible=basinVisible
   for(const mesh of basinStructures.children)mesh.castShadow=basinShadows
   changed=true
  }
  for(const block of blocks.values()){
   const d=Math.max(0,Math.abs(position.x-block.x)-31)**2+Math.max(0,Math.abs(position.z-block.z)-31)**2
   const visible=d<((low?40:59)+(block.group.visible?5:0))**2
   if(block.group.visible!==visible){block.group.visible=visible;changed=true}

  }
  if(barriers.visible===!open)return changed
  barriers.visible=!open
  for(const barrier of townRoomBarriers){
   if(!open)boxes.push(barrier)
   else {
    const index=boxes.indexOf(barrier)
    if(index>=0)boxes.splice(index,1)
   }
  }
  return true
 }
}
