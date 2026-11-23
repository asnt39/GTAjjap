import {Matrix4, Vector3} from 'three'

// Impacts are stored in normalized body coordinates so doors, wheels and
// collision bounds can keep their authored pivots.
export function dentVehicle(car, localX, localZ, force) {
 if(force<3.8)return null
 const x=localX/(car.width*.5),z=localZ/(car.length*.5)
 const side=Math.abs(x)>Math.abs(z)
 const axis=side?Math.sign(x):Math.sign(z)||1
 const zone=(side?'side':'end')+axis
 const prior=car.dents?.[zone]
 const dent={
  x:side?axis:Math.max(-1,Math.min(1,x)),
  z:side?Math.max(-1,Math.min(1,z)):axis,
  dx:side?-axis:0, dz:side?0:-axis,
  depth:Math.min(.38,(prior?.depth??0)+Math.min(.24,(force-3)*.019))
 }
 car.dents={...car.dents,[zone]:dent}
 return dent
}

export function deformBody(root, meshes, width, length) {
 root.updateMatrixWorld(true)
 const inverse=new Matrix4().copy(root.matrixWorld).invert()
 const point=new Vector3(),offset=new Vector3(),origin=new Vector3()
 const panels=meshes.map(mesh=>{
  const toBody=new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld)
  return {mesh, geometry:mesh.geometry, toBody, toPanel:toBody.clone().invert()}
 })
 let previous
 return dents=>{
  if(dents===previous)return
  previous=dents
  if(!dents){
   for(const {mesh,geometry} of panels){
    if(mesh.geometry!==geometry){mesh.geometry.dispose();mesh.geometry=geometry}
   }
   return
  }
  const active=Object.values(dents)
  for(const {mesh,geometry,toBody,toPanel} of panels){
   if(mesh.geometry===geometry)mesh.geometry=geometry.clone()
   const original=geometry.attributes.position,vertices=mesh.geometry.attributes.position
   for(let i=0;i<original.count;i++){
    origin.fromBufferAttribute(original,i).applyMatrix4(toBody)
    point.copy(origin)
    for(const dent of active){
     offset.set(origin.x-dent.x*width*.5,origin.y-.51,origin.z-dent.z*length*.5)
     const weight=Math.max(0,1-offset.lengthSq()/1.45)**2
     point.x+=dent.dx*dent.depth*weight
     point.z+=dent.dz*dent.depth*weight
     point.y-=dent.depth*.26*weight
    }
    point.applyMatrix4(toPanel)
    vertices.setXYZ(i,point.x,point.y,point.z)
   }
   vertices.needsUpdate=true
   mesh.geometry.computeVertexNormals()
  }
 }
}
