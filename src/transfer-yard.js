import * as T from 'three'
import {yardCover} from './prologue-plan.js'

export function buildTransferYard(scene,add,maps){
 const group=new T.Group();group.name='Quay Transfer'
 const iron=new T.MeshStandardMaterial({color:0x566261,roughness:.62,metalness:.29})
 const yellow=new T.MeshStandardMaterial({color:0xbb9c58,roughness:.72})
 const casework=new T.MeshStandardMaterial({color:0xa2825b,roughness:.91,map:maps.architecture[1]})
 const lamp=new T.MeshStandardMaterial({color:0xf9d5a5,emissive:0xdb9254,emissiveIntensity:.36})
 const box=new T.BoxGeometry(),stamp=new T.Object3D(),parts=new Map()
 function part(material,x,y,z,width,height,depth){
  stamp.position.set(x,y,z);stamp.scale.set(width,height,depth);stamp.updateMatrix()
  const matrices=parts.get(material)??[];matrices.push(stamp.matrix.clone());parts.set(material,matrices)
 }
 for(const {x,z,w,d,h} of yardCover){
  part(casework,x,h/2+.07,z,w,h,d)
  for(const position of [-.35,.35])part(iron,x,h/2+.09,z+d*position,w+.035,h+.08,.09)
  part(yellow,x,.16,z,w+.07,.16,d+.06)
  add(x-w/2,x+w/2,z-d/2,z+d/2,h+.07)
 }
 for(const z of [-34.7,-30.0]){
  part(iron,17.3,1.75,z,.12,3.43,.13)
  part(yellow,17.3,.19,z,.31,.29,.31)
  add(17.21,17.39,z-.08,z+.08,3.56)
 }
 part(iron,16.87,3.35,-32.35,1.1,.18,5.22)
 part(iron,16.87,3.51,-32.35,1.65,.14,5.38)
 part(lamp,16.59,3.23,-32.35,.089,.09,2.9)
 for(let i=0;i<7;i++)part(yellow,12.25,.018,-34.4+i*.76,.065,.013,.39)
 const panel=document.createElement('canvas');panel.width=512;panel.height=128
 const c=panel.getContext('2d');c.fillStyle='#283637';c.fillRect(0,0,512,128)
 c.fillStyle='#d9bb7e';c.fillRect(0,10,512,3);c.font='bold 45px sans-serif';c.fillText('QUAY TRANSFER',38,66)
 c.font='24px sans-serif';c.fillText('PORTSIDE  /  BAY 04',39,101)
 const texture=new T.CanvasTexture(panel);texture.colorSpace=T.SRGBColorSpace
 const sign=new T.Mesh(new T.PlaneGeometry(2.94,.73),new T.MeshStandardMaterial({map:texture,side:T.DoubleSide}))
 sign.rotation.y=-Math.PI/2;sign.position.set(16.04,3.6,-32.35);group.add(sign)
 for(const [material,matrices] of parts){
  const mesh=new T.InstancedMesh(box,material,matrices.length)
  matrices.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix))
  mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh)
 }
 scene.add(group)
}
