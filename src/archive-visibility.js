import {Box3,Frustum,Matrix4,Vector3} from 'three'
import {archive} from './chart-room.js'

export function archiveVisibility(scene,camera){
 const a=archive
 const portal=new Box3(new Vector3(a.front-.4,-.2,a.door-a.opening/2-.4),
  new Vector3(a.front+.5,a.ceiling+.2,a.door+a.opening/2+.4))
 const frustum=new Frustum(),clip=new Matrix4()
 const exterior=['Breakwater Avenue streetscape','Harborline container terminal'].map(name=>scene.getObjectByName(name))
 let shown=true
 return ()=>{
  const p=camera.position
  let visible=true
  if(p.x<a.front-.5 && p.x>a.back && p.z>a.north && p.z<a.south && p.y<a.ceiling){
   camera.updateMatrixWorld()
   frustum.setFromProjectionMatrix(clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse))
   visible=frustum.intersectsBox(portal)
  }
  if(visible===shown)return false
  shown=visible
  for(const group of exterior)group.visible=shown
  return true
 }
}
