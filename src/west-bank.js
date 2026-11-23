import * as T from 'three'
import {garage} from './west-bank-plan.js'

export function buildWestBank(scene,addCollider,maps) {
 const district=new T.Group()
 district.name='West Bank landmarks';scene.add(district)
 const solid=new T.BoxGeometry()
 const stone=new T.MeshStandardMaterial({color:0x9a9383,map:maps.architecture[1],roughness:.86})
 const brick=new T.MeshStandardMaterial({color:0xa07863,map:maps.architecture[0],roughness:.86})
 const steel=new T.MeshStandardMaterial({color:0x4e5c55,metalness:.35,roughness:.65})
 const wood=new T.MeshStandardMaterial({color:0x7e5b43,roughness:.86})
 const paint=new T.MeshStandardMaterial({color:0xc6bb9c,roughness:.8})
 const fabric=new T.MeshStandardMaterial({color:0x56706e,roughness:1})
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
 function sign(text,x,y,z,width=4){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=108
  const ctx=canvas.getContext('2d');ctx.fillStyle='#273830';ctx.fillRect(0,0,512,108)
  ctx.strokeStyle='#bd9964';ctx.lineWidth=4;ctx.strokeRect(10,10,492,88)
  ctx.fillStyle='#e9dfc6';ctx.font='bold 45px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,70,460)
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace
  const mesh=new T.Mesh(new T.PlaneGeometry(width,width*.21),new T.MeshStandardMaterial({map,side:T.DoubleSide}))
  mesh.position.set(x,y,z);district.add(mesh)
 }
 for(const [a,b,n,s,h] of garage.walls){
  addCollider(a,b,n,s,h)
  const mat=h>3?brick:h<.8?wood:steel
  box(mat,(a+b)/2,h*.5,(n+s)/2,b-a,h,s-n)
 }
 box(stone,-129,.043,39,19.4,.086,19.2)
 box(steel,-129,3.86,39,20.6,.19,20.6)
 box(stone,-129,3.51,29.15,6.4,.39,.35)
 box(warm,-129,3.53,35,3,.06,.15)
 box(warm,-134.5,3.53,44,2.8,.06,.15)
 box(fabric,-136.75,.71,45.15,2.3,.17,2.9)
 box(paint,-136.75,.83,46.09,1.65,.11,.62)
 box(wood,-135.65,1.17,48.1,4.05,.12,1.12)
 box(steel,-135.3,1.39,48.1,1.21,.39,.58)
 box(paint,-120.4,.98,47.6,1.78,1.96,1.38)
 box(steel,-121.25,1.29,47.51,.05,.33,.06)
 for(const x of [-130,-127.9])box(paint,x,.09,42,.095,.01,5.2)
 sign('WEST BANK GARAGE',-129,3.38,28.94,5)
 sign('REST  /  SERVICE',-136,2.42,48.6,3)

 // A garden with a diagonal walk, planted beds and the reclaimed pump.
 box(plants,-167,.10,47,14,.036,15)
 box(stone,-168,.137,47,18,.046,2.3,-.52)
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
 column(steel,-167.8,48.5,.48,1.32,.94)
 addCollider(-168.26,-167.34,48.01,48.99,1.61)
 sign('FOUNDRY GARDEN',-166.1,1.3,51.1,2.8)
 const water=new T.Mesh(new T.CylinderGeometry(.065,.18,.82,10),new T.MeshStandardMaterial({color:0x9aced5,roughness:.24,transparent:true,opacity:.72}))
 water.position.set(-167.8,1.84,48.5);water.visible=false;district.add(water)

 // Former ferry shed and gantry frame, with a walk-in viewing platform.
 for(const [a,b,n,s,h] of [[-221,-220.7,100,111,4.7],[-220.7,-204,110.72,111,4.7],[-204.25,-204,105,111,4.7]]){
  addCollider(a,b,n,s,h);box(brick,(a+b)/2,h/2,(n+s)/2,b-a,h,s-n)
 }
 box(steel,-212.5,4.76,105.5,17.8,.17,11.7)
 for(const x of [-218.4,-207.1]){
  box(steel,x,2.39,100.4,.29,4.78,.36);addCollider(x-.15,x+.15,100.2,100.6,4.78)
 }
 for(const x of [-219,-206.4]){
  box(steel,x,3.35,98,.38,6.7,.38)
  addCollider(x-.20,x+.20,97.78,98.22,6.7)
 }
 box(steel,-212.7,6.72,98,13.4,.53,.45)
 sign('WEST FERRY YARD',-212.5,3.45,108.68,5.2)
 const beacon=new T.Mesh(new T.SphereGeometry(.19,12,9),new T.MeshStandardMaterial({color:0xe68d41,emissive:0x9a3c14,emissiveIntensity:.4}))
 beacon.position.set(-207.1,2.6,100.14);district.add(beacon)

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
 return {
  operate(tag){if(tag==='PARK')pump=8;if(tag==='WEST')signal=8},
  update(dt,elapsed,pos){
   pump=Math.max(0,pump-dt);signal=Math.max(0,signal-dt)
   water.visible=pump>0;water.scale.y=.72+.26*Math.sin(elapsed*9)
   beacon.material.emissiveIntensity=signal?(Math.sin(elapsed*10)>.1?2.6:.15):.4
   const near=pos.x<-92
   if(near===shadows)return false
   shadows=near;for(const mesh of batches)mesh.castShadow=near
   return true
  }
 }
}
