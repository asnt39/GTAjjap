import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

export function southBasinDetail(maps,trees){
 const group=new T.Group(),leaves=[]
 group.name='South Basin foliage and planters'
 const treeMat=new T.MeshLambertMaterial({map:maps.street[4],alphaTest:.33,side:T.DoubleSide,color:0xbfc896})
 const wood=new T.MeshStandardMaterial({color:0x6d5541,roughness:.92})
 const shrub=new T.MeshStandardMaterial({color:0x788b54,roughness:.92})
 const bark=new T.CylinderGeometry(.035,.16,1,7)
 const trunks=new T.InstancedMesh(bark,wood,trees.length),stem=new T.Object3D()
 const canopy=new T.IcosahedronGeometry(1,0),beds=new T.InstancedMesh(canopy,shrub,18)
 trees.forEach(([x,z,h],j)=>{
  stem.position.set(x,h*.37,z);stem.scale.set(1,h*.75,1);stem.rotation.set(.03,0,-.045);stem.updateMatrix()
  trunks.setMatrixAt(j,stem.matrix)
  // Reuse the street tree atlas with two crossed quads per nearby tree.
  for(let k=0;k<2;k++){
   const g=new T.PlaneGeometry(h*.89,h*.92),uv=g.attributes.uv
   for(let i=0;i<uv.count;i++)uv.setXY(i,(1+uv.getX(i))/4,(1-k+uv.getY(i))/2)
   leaves.push(g.rotateY(j*.19+k*Math.PI/2).translate(x,h*.53+.21,z))
  }
 })
 for(let i=0;i<18;i++){
  const right=i>=9,p=i%9
  stem.position.set((right?20.5:8.4)+Math.sin(i*2.4)*.7,.52,188.5+p*1.84)
  stem.scale.set(.54,.4,.58);stem.rotation.set(0,i*.81,0);stem.updateMatrix();beds.setMatrixAt(i,stem.matrix)
 }
 const canopyGeo=mergeGeometries(leaves)
 leaves.forEach(g=>g.dispose())
 group.add(trunks,beds,new T.Mesh(canopyGeo,treeMat))
 return {group,dispose(){
  trunks.dispose();beds.dispose()
  bark.dispose();canopy.dispose();canopyGeo.dispose()
  for(const m of [treeMat,wood,shrub])m.dispose()
 }}
}
