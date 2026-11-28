import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {streamDistrict} from './district-stream.js'
import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {foundryFountain,foundryGardenPlots,foundryPicnicTerrace,foundryPlayCourt,foundryWalks} from './foundry-garden-plan.js'
import {foundryParkFixtures} from './foundry-park-fixtures.js'

const trees=[[-175.9,40.3,5.3,.83],[-168.65,41.5,4.2,1.1],[-159.45,54.5,5.15,.84],[-172.0,51.52,4.7,1],
 [-164.4,56.3,3.5,.76],[-179.3,41.9,4.95,1],[-179.6,48.75,3.5,.89],[-159.8,40.18,4.2,.84],[-169.12,37.58,3.2,.72]]

function repeatUV(geometry,metres=3.8){
 const {uv,position}=geometry.attributes
 for(let i=0;i<position.count;i++)uv.setXY(i,position.getX(i)/metres,-position.getZ(i)/metres)
 return geometry
}

function flat([a,b,n,s],height){
 return repeatUV(new T.PlaneGeometry(b-a,s-n).rotateX(-Math.PI/2).translate((a+b)/2,height,(n+s)/2))
}

export function foundryGarden(district,maps,addCollider){
 const group=new T.Group();group.name='Foundry Garden';district.add(group)
 const fixtures=foundryParkFixtures(group,addCollider,maps)
 const turfParts=foundryGardenPlots.map(rect=>flat(rect,.100))
 const turf=mergeGeometries(turfParts);turfParts.forEach(geometry=>geometry.dispose())
 const grass=new T.MeshStandardMaterial({color:0xabb497,roughness:.93})
 new T.TextureLoader().load('/assets/estuary/lawn.webp',tex=>{
  tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;grass.map=tex;grass.needsUpdate=true
 })
 const loader=new T.TextureLoader()
 for(const [slot,file] of [['normalMap','grass-normal'],['roughnessMap','grass-rough']])loader.load('/assets/estuary/'+file+'.webp',tex=>{
  tex.wrapS=tex.wrapT=T.RepeatWrapping;grass[slot]=tex;grass.needsUpdate=true
 })
 grass.normalScale.set(.24,.24)
 const lawn=new T.Mesh(turf,grass);lawn.name='Foundry Garden lawns';lawn.receiveShadow=true;group.add(lawn)
 const paths=[]
 function ribbon({points,width},height){
  const verts=[],tex=[],idx=[]
  for(const [k,[cx,cz]] of points.entries()){
   const next=points[Math.min(k+1,points.length-1)],prev=points[Math.max(k-1,0)]
   const dx=next[0]-prev[0],dz=next[1]-prev[1],length=Math.hypot(dx,dz)
   for(const s of [-1,1]){
    const x=cx+s*dz/length*width/2,z=cz-s*dx/length*width/2
    verts.push(x,height,z);tex.push(x/3.8,-z/3.8)
   }
   if(k){const a=k*2-2;idx.push(a,a+2,a+1,a+1,a+2,a+3)}
  }
  const g=new T.BufferGeometry();g.setIndex(idx);g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));g.computeVertexNormals();paths.push(g)
 }
 foundryWalks.forEach((walk,i)=>ribbon(walk,.117+i*.00065))
 paths.push(flat(foundryPicnicTerrace,.125))
 const {x:fx,z:fz,radius}=foundryFountain
 paths.push(repeatUV(new T.CircleGeometry(radius,56).rotateX(-Math.PI/2).translate(fx,.127,fz)))
 const pathMat=new T.MeshStandardMaterial({color:0xd6c4a9,map:maps.street[2],normalMap:maps.street[3],normalScale:new T.Vector2(.42,.42),roughness:.82})
 const pathMesh=new T.Mesh(mergeGeometries(paths),pathMat);pathMesh.name='Foundry Garden paths and plazas';pathMesh.receiveShadow=true;group.add(pathMesh);paths.forEach(g=>g.dispose())
 const border=new T.Mesh(new T.RingGeometry(radius-.11,radius,56).rotateX(-Math.PI/2).translate(fx,.129,fz),new T.MeshStandardMaterial({color:0x988a76,roughness:.86}))
 border.receiveShadow=true;group.add(border)
 const playMat=new T.MeshStandardMaterial({color:0xa37259,normalMap:maps.street[3],normalScale:new T.Vector2(.16,.16),roughness:.96})
 const court=new T.Mesh(flat(foundryPlayCourt,.123),playMat);court.name='Foundry playground surface';court.receiveShadow=true;group.add(court)

 const bedStamp=new T.Object3D(),unit=new T.BoxGeometry()
 const beds=new T.InstancedMesh(unit,new T.MeshStandardMaterial({color:0xa99c88,roughness:.92}),trees.length)
 const mulch=new T.InstancedMesh(unit,new T.MeshStandardMaterial({color:0x514b38,roughness:.98}),trees.length)
 for(const [i,[x,z]] of trees.entries()){
  bedStamp.position.set(x,.252,z);bedStamp.scale.set(2.18,.296,1.40);bedStamp.updateMatrix();beds.setMatrixAt(i,bedStamp.matrix)
  bedStamp.position.y=.409;bedStamp.scale.set(1.93,.029,1.15);bedStamp.updateMatrix();mulch.setMatrixAt(i,bedStamp.matrix)
  addCollider(x-1.09,x+1.09,z-.70,z+.70,.40,true)
  addCollider(x-.17,x+.17,z-.17,z+.17,trees[i][2]*.43)
 }
 beds.receiveShadow=mulch.receiveShadow=true;group.add(beds,mulch)
 const crowns=[],outerLeaves=[],wood=[],up=new T.Vector3(0,1,0)
 function branch(a,b,r){
  const delta=b.clone().sub(a),g=new T.CylinderGeometry(r*.56,r,delta.length(),7)
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,delta.normalize())).translate(...a.clone().lerp(b,.5).toArray());wood.push(g)
 }
 trees.forEach(([x,z,h,spread],j)=>{
  const trunk=new T.Vector3(x,.28,z),fork=new T.Vector3(x+.11,h*.43,z)
  branch(trunk,fork,.14)
  for(let k=0;k<4;k++){
   const a=k*1.62+j,b=new T.Vector3(x+Math.sin(a)*h*.24,h*(.62+k*.045),z+Math.cos(a)*h*.24)
   branch(fork,b,.075)
  }
  for(let axis=0;axis<2;axis++)for(let i=0;i<4;i++){
   const g=new T.PlaneGeometry(h*1.07*spread,h*1.04),uv=g.attributes.uv
   for(let k=0;k<4;k++)uv.setXY(k,(i+uv.getX(k))/4,(1-axis+uv.getY(k))/2)
   const offset=(i-1.5)*h*.19*spread
   g.translate(0,h*.52+.22,offset).rotateY(axis*Math.PI/2+j*.67).translate(x,0,z)
   if(i===1||i===2)crowns.push(g);else outerLeaves.push(g)
  }
 })
 const bark=new T.Mesh(mergeGeometries(wood),new T.MeshStandardMaterial({color:0x605145,roughness:.92}))
 bark.castShadow=true
 group.add(bark);wood.forEach(g=>g.dispose())
 const trunks=streamDistrict({enterDistance:42,leaveDistance:55,
  async load(){
   const asset=await new GLTFLoader().loadAsync('/assets/estuary/garden-trunk.glb')
   let source;asset.scene.traverse(node=>{if(node.isMesh)source=node})
   source.updateWorldMatrix(true,false)
   const geo=source.geometry.applyMatrix4(source.matrixWorld)
   geo.computeBoundingBox()
   const size=geo.boundingBox.getSize(new T.Vector3()),mid=geo.boundingBox.getCenter(new T.Vector3())
   geo.translate(-mid.x,-geo.boundingBox.min.y,-mid.z)
   const mesh=new T.InstancedMesh(geo,bark.material,trees.length),stamp=new T.Object3D()
   trees.forEach(([x,z,h,spread],i)=>{
    stamp.position.set(x,.24,z);stamp.rotation.y=i*.67;stamp.scale.set(h*spread/size.y,h/size.y,h*spread/size.y)
    stamp.updateMatrix();mesh.setMatrixAt(i,stamp.matrix)
   })
   mesh.castShadow=true
   return {mesh,dispose(){mesh.dispose();geo.dispose();source.material.dispose()}}
  },
  attach({mesh}){group.add(mesh);bark.visible=false},
  detach({mesh}){mesh.removeFromParent();bark.visible=true}})
 const leaves=new T.MeshLambertMaterial({map:maps.street[4],alphaTest:.39,side:T.DoubleSide,color:0xb8c28d})
 const wind={value:0}
 leaves.onBeforeCompile=shader=>{
  shader.uniforms.harborTime=wind
  shader.vertexShader='uniform float harborTime;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x+=max(0.,position.y-1.1)*.019*sin(harborTime*1.4+position.z*.65+position.x*.2);')
 }
 const coreIndices=crowns.reduce((sum,g)=>sum+g.index.count,0)
 const layers=crowns.concat(outerLeaves),canopy=new T.Mesh(mergeGeometries(layers),leaves)
 group.add(canopy);layers.forEach(g=>g.dispose())
 // A single instanced bed for sea thrift, flowering salvia and trailing foliage.
 const flower=new T.IcosahedronGeometry(1,0),blossoms=new T.InstancedMesh(flower,new T.MeshStandardMaterial({roughness:.9}),trees.length*44)
 const stamp=new T.Object3D(),color=new T.Color()
 trees.forEach(([x,z],j)=>{
  for(let i=0;i<44;i++){
   const t=i*2.4+j,r=Math.sqrt((i+.5)/44)
   stamp.position.set(x+Math.cos(t)*r*.9,.54+.10*Math.sin(i*3),z+Math.sin(t)*r*.46)
   const bloom=i%3===0
   stamp.scale.set(bloom?.08:.20,bloom?.14:.21,bloom?.08:.15);stamp.rotation.y=t;stamp.updateMatrix()
   const id=j*44+i;blossoms.setMatrixAt(id,stamp.matrix);blossoms.setColorAt(id,color.setHex(bloom?[0xc78892,0xe0caa2,0x9c90b7][j%3]:[0x667951,0x81935c,0x566746][i%3]))
  }
 })
 group.add(blossoms)
 return {
  operate:fixtures.operate,
  update(dt,time,pos,low){
   const range=Math.hypot(pos.x+167,(pos.z??43)-43)
   wind.value=time;blossoms.visible=range<(low?30:51)
   canopy.geometry.setDrawRange(0,range<(low?23:42)?Infinity:coreIndices)
   const treesChanged=trunks(range),fixturesChanged=fixtures.update(dt,time,range)
   return treesChanged||fixturesChanged
  }
 }
}
