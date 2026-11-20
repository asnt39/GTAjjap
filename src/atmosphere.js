import * as T from 'three'
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js'
import {sights} from './navigation.js'
export async function sky(scene,renderer){
 const hdr=await new HDRLoader().loadAsync('/assets/sky/dusk.hdr');hdr.mapping=T.EquirectangularReflectionMapping
 const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromEquirectangular(hdr);pmrem.dispose()
 scene.environment=env.texture;scene.background=hdr
 scene.environmentRotation.y=2.1;scene.backgroundRotation.y=2.1;scene.environmentIntensity=.68;scene.backgroundIntensity=.65
}
export function illumination(scene){
 scene.fog=new T.FogExp2(0x8890a0,.0058)
 const foundation=new T.Mesh(new T.PlaneGeometry(346,510),new T.MeshStandardMaterial({color:0x595753,roughness:.97}))
 foundation.rotation.x=-Math.PI/2;foundation.position.set(-147.1,-.26,-8);foundation.receiveShadow=true;scene.add(foundation)
 scene.add(new T.HemisphereLight(0xfcdfd6,0x677888,1.05))
 const sun=new T.DirectionalLight(0xffc597,2.05);sun.position.set(34,37,-52);sun.target.position.set(0,0,-12)
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-48,right:48,top:52,bottom:-52,near:1,far:180});sun.shadow.normalBias=.035;sun.shadow.bias=-.0003
 scene.add(sun,sun.target)
 return sun
}
export function beacons(scene,addCollider){
 const group=new T.Group(),postMat=new T.MeshStandardMaterial({color:0x35444a,metalness:.58,roughness:.56}),faceMat=new T.MeshStandardMaterial({color:0x2b393a,metalness:.3,roughness:.55})
 for(const s of sights.filter(s=>Number(s.tag)<4)){
  const sign=new T.Group();sign.position.set(s.x,0,s.z);sign.rotation.y=s.x>0?-1.22:1.2
  const box=(w,h,d,y,mat,z=0)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(0,y,z);m.castShadow=true;sign.add(m)}
  box(.14,.97,.12,.53,postMat);box(.68,.8,.075,1.32,faceMat)
  const c=document.createElement('canvas');c.width=256;c.height=320;const p=c.getContext('2d');p.fillStyle='#263c40';p.fillRect(0,0,256,320);p.fillStyle='#ff8c4c';p.fillRect(0,0,256,12);p.font='bold 24px sans-serif';p.fillText('PORTSIDE',16,48);p.font='bold 105px sans-serif';p.fillText(s.tag,12,158);p.fillStyle='#d1dfd5';p.font='bold 18px sans-serif';p.fillText(s.title.toUpperCase(),15,202);p.fillRect(15,221,202,3);p.fillRect(15,235,137,3);p.fillRect(15,249,171,3);p.font='bold 14px sans-serif';p.fillText('HARBOR AUTHORITY',15,299)
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace
  const placard=new T.Mesh(new T.PlaneGeometry(.65,.77),new T.MeshStandardMaterial({map:tex,roughness:.7,emissiveMap:tex,emissive:0xffffff,emissiveIntensity:.24}));placard.position.set(0,1.32,.041);sign.add(placard)
  group.add(sign);addCollider(s.x-.22,s.x+.22,s.z-.24,s.z+.24,1.75)
 }
 scene.add(group)
}
export function footShadow(root){
 const c=document.createElement('canvas');c.width=c.height=96;const p=c.getContext('2d'),g=p.createRadialGradient(48,48,1,48,48,47);g.addColorStop(0,'rgba(10,14,18,.65)');g.addColorStop(.4,'rgba(10,14,18,.34)');g.addColorStop(1,'rgba(10,14,18,0)');p.fillStyle=g;p.fillRect(0,0,96,96)
 const mesh=new T.Mesh(new T.PlaneGeometry(1.2,1.35),new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}));mesh.rotation.x=-Math.PI/2;mesh.position.y=.014;root.add(mesh);return mesh
}
export function districtGates(scene,addCollider){
 const outline=new T.Shape()
 outline.moveTo(-.37,0);outline.lineTo(.37,0);outline.lineTo(.37,.16);outline.lineTo(.19,.43);outline.lineTo(.14,.84);outline.lineTo(-.14,.84);outline.lineTo(-.19,.43);outline.lineTo(-.37,.16);outline.closePath()
 const geometry=new T.ExtrudeGeometry(outline,{depth:3.1,bevelEnabled:false}).translate(0,0,-1.55)
 const concrete=new T.MeshStandardMaterial({color:0xa59c88,roughness:.94})
 const paint=new T.MeshStandardMaterial({color:0xea813f,roughness:.58,emissive:0x56321c,emissiveIntensity:.12})
 const reflector=new T.BoxGeometry(.3,.12,.35),points=[]
 for(const z of [-99.5,57])for(const x of [-4.2,0,4.2])points.push([x,z,Math.PI/2])
 for(const z of [-40.1,-35.7,-31.3])points.push([-96,z,0])
 const blocks=new T.InstancedMesh(geometry,concrete,points.length),markers=new T.InstancedMesh(reflector,paint,points.length*2)
 const m=new T.Object3D()
 points.forEach(([x,z,r],i)=>{
  m.position.set(x,0,z);m.rotation.y=r;m.updateMatrix();blocks.setMatrixAt(i,m.matrix)
  const ax=Math.sin(r),az=Math.cos(r)
  for(let side=0;side<2;side++){const off=side?1.07:-1.07;m.position.set(x+off*ax,.64,z+off*az);m.updateMatrix();markers.setMatrixAt(i*2+side,m.matrix)}
  addCollider(x-(r?1.55:.37),x+(r?1.55:.37),z-(r?.37:1.55),z+(r?.37:1.55),.84,true)
 })
 blocks.castShadow=blocks.receiveShadow=true;scene.add(blocks,markers)
}
