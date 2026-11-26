import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

const trees=[[-173.8,40.8,5.3,.83],[-166.1,40.9,4.2,1.1],[-160.95,53,5.15,.84],[-173,52,4.7,1],[-164,55,3.5,.76]]
export function foundryGarden(group,maps){

 const turf=new T.PlaneGeometry(14.8,15.5,6,6).rotateX(-Math.PI/2).translate(-167,.112,47.2)
 const uv=turf.attributes.uv,pos=turf.attributes.position
 for(let j=0;j<pos.count;j++)uv.setXY(j,pos.getX(j)/3.8,pos.getZ(j)/3.8)
 const lawn=new T.Mesh(turf,maps.meadow??new T.MeshStandardMaterial({color:0x798359,roughness:.96}));lawn.receiveShadow=true;group.add(lawn)
 const paths=[]
 function ribbon(points,width){
  const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,.137,z)))
  const verts=[],tex=[],idx=[]
  for(let k=0;k<=28;k++){
   const v=curve.getPoint(k/28),t=curve.getTangent(k/28)
   for(const s of [-1,1]){
    const x=v.x+s*t.z*width/2,z=v.z-s*t.x*width/2
    verts.push(x,v.y,z);tex.push(x/3.8,z/3.8)
   }
   if(k){const a=k*2-2;idx.push(a,a+2,a+1,a+1,a+2,a+3)}
  }
  const g=new T.BufferGeometry();g.setIndex(idx);g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));g.computeVertexNormals();paths.push(g)
 }
 ribbon([[-174.5,46.1],[-171,45.95],[-168.6,46.05],[-165.9,47],[-163.3,49.3],[-159.4,49.7]],1.5)
 ribbon([[-169.8,39.4],[-170.1,42.7],[-170.0,45.4],[-170.6,48.2],[-170.4,50.3],[-167.8,53.1],[-167.1,55.1]],1.22)
 const pathMat=new T.MeshStandardMaterial({color:0xc7bca6,map:maps.street[2],normalMap:maps.street[3],normalScale:new T.Vector2(.42,.42),roughness:.82,polygonOffset:true,polygonOffsetFactor:-1})
 const pathMesh=new T.Mesh(mergeGeometries(paths),pathMat);pathMesh.receiveShadow=true;group.add(pathMesh);paths.forEach(g=>g.dispose())
 const crowns=[],wood=[],up=new T.Vector3(0,1,0)
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
   crowns.push(g)
  }
 })
 const bark=new T.Mesh(mergeGeometries(wood),new T.MeshStandardMaterial({color:0x605145,roughness:.92}))
 group.add(bark);wood.forEach(g=>g.dispose())
 const leaves=new T.MeshStandardMaterial({map:maps.street[4],alphaTest:.39,side:T.DoubleSide,roughness:.95,color:0xb8c28d})
 const wind={value:0}
 leaves.onBeforeCompile=shader=>{
  shader.uniforms.harborTime=wind
  shader.vertexShader='uniform float harborTime;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x+=max(0.,position.y-1.1)*.019*sin(harborTime*1.4+position.z*.65+position.x*.2);')
 }
 const canopy=new T.Mesh(mergeGeometries(crowns),leaves);group.add(canopy);crowns.forEach(g=>g.dispose())
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
 return (t,near)=>{wind.value=t;blossoms.visible=near;canopy.castShadow=near}
}
