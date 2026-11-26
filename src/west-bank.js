import {foundryGarden} from './foundry-garden.js'
import * as T from 'three'
import {streamDistrict} from './district-stream.js'
import {loadWorksDetail} from './works-detail.js'

export function buildWestBank(scene,addCollider,maps,colliders) {
 const district=new T.Group()
 district.name='West Bank landmarks';scene.add(district)
 const solid=new T.BoxGeometry()
 const stone=new T.MeshStandardMaterial({color:0x9a9383,map:maps.architecture[1],roughness:.86})
 const brick=new T.MeshStandardMaterial({color:0xa07863,map:maps.architecture[0],roughness:.86})
 const steel=new T.MeshStandardMaterial({color:0x4e5c55,metalness:.35,roughness:.65})
 const wood=new T.MeshStandardMaterial({color:0x7e5b43,roughness:.86})
 const paint=new T.MeshStandardMaterial({color:0xc6bb9c,roughness:.8})
 const plants=new T.MeshStandardMaterial({color:0x566340,roughness:.95})
 const warm=new T.MeshStandardMaterial({color:0xffdf9e,emissive:0xc88641,emissiveIntensity:.65})
 const pieces=new Map()
 function box(mat,x,y,z,width,height,depth,rotation=0){
  const batch=pieces.get(mat)??[]
  batch.push([x,y,z,width,height,depth,rotation]);pieces.set(mat,batch)
 }
 function column(mat,x,z,r,height,y=height/2){
  const mesh=new T.Mesh(new T.CylinderGeometry(r*.82,r,height,10),mat)
  mesh.position.set(x,y,z);mesh.receiveShadow=true;district.add(mesh)
 }
 function sign(text,x,y,z,width=4,angle=0){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=108
  const ctx=canvas.getContext('2d');ctx.fillStyle='#273830';ctx.fillRect(0,0,512,108)
  ctx.strokeStyle='#bd9964';ctx.lineWidth=4;ctx.strokeRect(10,10,492,88)
  ctx.fillStyle='#e9dfc6';ctx.font='bold 45px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,70,460)
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace
  const mesh=new T.Mesh(new T.PlaneGeometry(width,width*.21),new T.MeshStandardMaterial({map,side:T.DoubleSide}))
  mesh.position.set(x,y,z);mesh.rotation.y=angle;district.add(mesh)
 }
 for(const [a,b,n,s,h] of [
  [-139,-138.7,29,49,3.8],[-119.3,-119,29,49,3.8],[-139,-119,48.7,49,3.8],
  [-139,-132.2,29,29.32,3.8],[-125.8,-119,29,29.32,3.8],
  [-137.5,-133.7,47.6,48.65,1.12],[-121.4,-119.32,45.4,48.65,1.8]
 ]){
  addCollider(a,b,n,s,h)
  const mat=h>3?brick:h<.8?wood:steel
  box(mat,(a+b)/2,h*.5,(n+s)/2,b-a,h,s-n)
 }
 box(stone,-129,.043,39,19.4,.086,19.2)
 box(steel,-129,3.86,39,20.6,.19,20.6)
 box(stone,-129,3.51,29.15,6.4,.39,.35)
 for(const x of [-132.32,-125.68])box(steel,x,1.67,29.08,.18,3.34,.22)
 for(let i=0;i<5;i++)box(steel,-129,3.15+i*.081,29.18,6.3,.059,.20)
 box(warm,-129,3.53,35,3,.06,.15)
 box(warm,-134.5,3.53,44,2.8,.06,.15)
 box(wood,-135.65,1.17,48.1,4.05,.12,1.12)
 box(steel,-135.3,1.39,48.1,1.21,.39,.58)
 box(paint,-120.4,.98,47.6,1.78,1.96,1.38)
 box(steel,-121.25,1.29,47.51,.05,.33,.06)
 for(const x of [-130,-127.9])box(paint,x,.09,42,.095,.01,5.2)
 sign('WEST BANK WORKS',-129,3.38,28.94,5)
 sign('NIGHT SERVICE LOG',-135.7,1.88,48.52,2.65)
 for(const x of [-140.8,-117.4])box(paint,x,.091,31,.07,.012,3.3)

 // A garden with a diagonal walk, planted beds and the reclaimed pump.
 const garden=foundryGarden(district,maps)
 for(const [x,z] of [[-173,52],[-174,41],[-166,41],[-161,53],[-164,55]]){
  box(stone,x,.23,z,2.35,.36,1.4)
  box(plants,x,.44,z,2.07,.15,1.15)
  addCollider(x-1.175,x+1.175,z-.7,z+.7,.40,true)
 }
 for(const [x,z] of [[-169,53],[-160.4,46.7]]){
  for(const side of [-1,1])box(steel,x+side*.77,.29,z,.12,.53,.55)
  box(wood,x,.58,z,1.88,.10,.50)
  box(wood,x,.86,z+.21,1.88,.27,.09)
  addCollider(x-.95,x+.95,z-.26,z+.28,.59,true)
 }
 column(stone,-167.8,48.5,1.54,.32)
 const coping=new T.Mesh(new T.TorusGeometry(1.37,.115,7,36),stone)
 coping.rotation.x=Math.PI/2;coping.position.set(-167.8,.42,48.5);district.add(coping)
 const basin=new T.Mesh(new T.CircleGeometry(1.38,36),new T.MeshStandardMaterial({color:0x658d89,roughness:.21,metalness:.42}))
 basin.rotation.x=-Math.PI/2;basin.position.set(-167.8,.40,48.5);district.add(basin)
 column(steel,-167.8,48.5,.38,1.09,.91)
 column(stone,-167.8,48.5,.67,.16,1.42)
 column(steel,-167.8,48.5,.17,.28,1.56)
 // Approximate the circular plinth with short chords so the corners stay walkable.
 for(let k=0;k<8;k++){
  const offset=(k-3.5)*.36,half=Math.sqrt(1.45**2-offset**2)
  addCollider(-167.8-half,-167.8+half,48.5+offset-.18,48.5+offset+.18,.48,true)
 }
 addCollider(-168.18,-167.42,48.12,48.88,1.70)
 sign('FOUNDRY GARDEN',-166.1,1.3,51.1,2.8,Math.PI*.20)
 const water=new T.Mesh(new T.CylinderGeometry(.065,.18,.82,10),new T.MeshStandardMaterial({color:0x9aced5,roughness:.24,transparent:true,opacity:.72}))
 water.position.set(-167.8,1.84,48.5);water.visible=false;district.add(water)

 // Former ferry shed and gantry frame, with a walk-in viewing platform.
 for(const [a,b,n,s,h] of [[-221,-220.7,100,111,4.7],[-220.7,-204,110.72,111,4.7],[-204.25,-204,105,111,4.7]]){
  addCollider(a,b,n,s,h);box(brick,(a+b)/2,h/2,(n+s)/2,b-a,h,s-n)
 }
 // Ferry hall roof lantern and riveted cross-braced steel frame.
 const truss=[]
 function girder(ax,ay,az,bx,by,bz,w,d){
  const start=new T.Vector3(ax,ay,az),end=new T.Vector3(bx,by,bz),v=end.clone().sub(start)
  const m=new T.Matrix4().compose(start.lerp(end,.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize()),new T.Vector3(w,v.length(),d))
  truss.push(m)
 }
 for(const side of [-1,1]){
  girder(-212.5,6.74,105.5,-212.5,4.80,105.5+side*6,17.95,.15)
  for(const x of [-220.6,-216.5,-212.5,-208.5,-204.4]){
   girder(x,4.82,105.5+side*5.86,x,6.64,105.5,.13,.17)
   girder(x,4.71,105.5+side*5.8,x,4.71,105.5,.11,.16)
   girder(x,4.75,105.5+side*3,x,6.48,105.5,.09,.1)
  }
 }
 const beams=new T.InstancedMesh(solid,steel,truss.length);truss.forEach((m,i)=>beams.setMatrixAt(i,m))
 beams.receiveShadow=true;district.add(beams)
 for(const x of [-220.6,-216.55,-212.5,-208.45,-204.4]){
  box(paint,x,4.34,99.63,.11,.65,.15)
  box(wood,x,.62,110.19,2.64,.15,.59);addCollider(x-1.32,x+1.32,109.89,110.49,.71,true)
 }
 box(steel,-212.5,4.72,99.63,17.8,.28,.21)
 for(let i=0;i<12;i++){
  const ax=-220.2+i*1.39
  girder(ax,6.75,98,ax+.68,7.13,98,.072,.10)
  girder(ax+.68,7.13,98,ax+1.37,6.75,98,.072,.10)
 }
 const lattice=new T.InstancedMesh(solid,steel,24);truss.slice(-24).forEach((m,i)=>lattice.setMatrixAt(i,m));district.add(lattice)
 box(steel,-212.6,7.16,98,17.0,.12,.20)
 for(const x of [-217.5,-212.5,-207.5]){
  box(steel,x,4.32,101.1,.045,.74,.045)
  box(warm,x,3.92,101.1,.58,.15,.42)
 }
 for(const x of [-218.4,-207.1]){
  box(steel,x,2.39,100.4,.29,4.78,.36);addCollider(x-.15,x+.15,100.2,100.6,4.78)
 }
 for(const x of [-219,-206.4]){
  box(steel,x,3.35,98,.38,6.7,.38)
  addCollider(x-.20,x+.20,97.78,98.22,6.7)
 }
 box(steel,-212.7,6.72,98,13.4,.53,.45)
 sign('WEST FERRY YARD',-212.5,3.45,99.45,6.1,Math.PI)
 const beacon=new T.Mesh(new T.SphereGeometry(.19,12,9),new T.MeshStandardMaterial({color:0xe68d41,emissive:0x9a3c14,emissiveIntensity:.4}))
 beacon.position.set(-207.1,2.6,100.14);district.add(beacon)
 sign('NORTH SERVICE YARD',-208.0,1.53,32.1,3.3)
 for(const [x,z] of [[-204.7,34.25],[-210.3,34.25]]){
  box(steel,x,.52,z,.19,1,.19);addCollider(x-.095,x+.095,z-.095,z+.095,1.02)
 }

 // Street lighting and masonry perimeter along the irregular edge.
 for(const [x,z] of [[-118,31],[-102.8,68],[-180,54],[-197,71],[-209,51],[-209,79],[-177,119],[-140,112],[-135,6]]){
  column(steel,x,z,.11,3.7);box(steel,x+.28,3.55,z,.66,.18,.20);box(warm,x+.49,3.48,z,.29,.08,.2)
  addCollider(x-.125,x+.125,z-.125,z+.125,3.73)
 }
 const stamp=new T.Object3D(),batches=[]
 for(const [mat,parts] of pieces){
  const mesh=new T.InstancedMesh(solid,mat,parts.length)
  mesh.receiveShadow=true;mesh.castShadow=false
  parts.forEach(([x,y,z,w,h,d,ry],i)=>{
   stamp.position.set(x,y,z);stamp.rotation.y=ry;stamp.scale.set(w,h,d);stamp.updateMatrix();mesh.setMatrixAt(i,stamp.matrix)
  })
  district.add(mesh);batches.push(mesh)
 }
 let pump=0,signal=0,shadows=false
 const stream=streamDistrict({load:loadWorksDetail,enterDistance:62,leaveDistance:88,
  attach(detail){district.add(detail.group);colliders?.push(...detail.footprints)},
  detach(detail){
   detail.group.removeFromParent()
   if(colliders)for(const bounds of detail.footprints){const i=colliders.indexOf(bounds);if(i>=0)colliders.splice(i,1)}
  }})
 return {
  operate(tag){if(tag==='PARK')pump=8;if(tag==='WEST')signal=8},
  update(dt,elapsed,pos){
   garden(elapsed,Math.hypot(pos.x+167,(pos.z??47)-47)<55)
   const changed=stream(Math.hypot(pos.x+166,(pos.z??44)-58))
   pump=Math.max(0,pump-dt);signal=Math.max(0,signal-dt)
   water.visible=pump>0;water.scale.y=.72+.26*Math.sin(elapsed*9)
   beacon.material.emissiveIntensity=signal?(Math.sin(elapsed*10)>.1?2.6:.15):.4
   const near=pos.x<-92
   if(near===shadows)return changed
   shadows=near;for(const mesh of batches)mesh.castShadow=near
   return true
  }
 }
}
