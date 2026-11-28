import {MathUtils,Matrix3,Raycaster,Vector3,Vector4} from 'three'

const maximumStains=6
const styles={
 melee:{radius:.091,opacity:.62},
 shot:{radius:.126,opacity:.83},
 vehicle:{radius:.115,opacity:.71},
 blast:{radius:.139,opacity:.75}
}

const ray=new Raycaster(undefined,undefined,0,1.6),hits=[]
const base=new Vector3(),anchor=new Vector3(),target=new Vector3(),incoming=new Vector3(),forward=new Vector3()
const a=new Vector3(),b=new Vector3(),c=new Vector3(),center=new Vector3(),normal=new Vector3()
const normalMatrix=new Matrix3()

function stainMaterial(original,stains,normals,count){
 const material=original.clone()
 material.customProgramCacheKey=()=>original.customProgramCacheKey()+'|harbor-impact-stains'
 material.onBeforeCompile=(shader,renderer)=>{
  original.onBeforeCompile(shader,renderer)
  shader.uniforms.harborStainCount=count
  shader.uniforms.harborStains={value:stains}
  shader.uniforms.harborStainNormals={value:normals}
  shader.vertexShader=shader.vertexShader
   .replace('#include <common>','#include <common>\nvarying vec3 harborStainPosition;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nharborStainPosition = position;')
  shader.fragmentShader=shader.fragmentShader
   .replace('#include <common>',`#include <common>
    varying vec3 harborStainPosition;
    uniform int harborStainCount;
    uniform vec4 harborStains[${maximumStains}];
    uniform vec4 harborStainNormals[${maximumStains}];
   `)
   .replace('#include <color_fragment>',`#include <color_fragment>
    float stainCoverage = 0.0;
    for (int i = 0; i < ${maximumStains}; i++) {
      if (i >= harborStainCount) break;
      vec4 stamp = harborStains[i];
      vec3 offset = (harborStainPosition - stamp.xyz) / stamp.w;
      if (dot(offset, offset) > 1.44) continue;
      vec4 impact = harborStainNormals[i];
      float depth = dot(offset, impact.xyz);
      if (abs(depth) > .60) continue;
      vec3 axis = abs(impact.y) > .93 ? vec3(1,0,0) : vec3(0,1,0);
      vec3 tangent = normalize(cross(axis, impact.xyz));
      vec3 bitangent = cross(impact.xyz, tangent);
      vec2 stain = vec2(dot(offset, tangent), dot(offset, bitangent));
      float seed = dot(stamp.xyz, vec3(53.5, 164.3, 92.4));
      float grain = sin(dot(stain, vec2(19.5,11.3)) + seed) * .095
                  + sin(dot(stain, vec2(-26.7,18.1))) * .065;
      float ragged = length(vec2(stain.x, stain.y * .79) + vec2(stain.y * .22, 0.0)) + grain;
      float spread = (1.0 - smoothstep(.54, .89, ragged)) * .84;
      float core = (1.0 - smoothstep(.19, .62, ragged)) * .16;
      float fleck = (1.0 - smoothstep(.035, .13, length(stain - vec2(.61, -.65)))) * .52;
      float surface = 1.0 - smoothstep(.26, .60, abs(depth));
      float coverage = max(spread + core, fleck) * surface * impact.w;
      stainCoverage += (1.0 - stainCoverage) * coverage;
    }
    float clothLuminance = dot(diffuseColor.rgb, vec3(.213, .715, .072));
    vec3 driedRed = vec3(.107, .013, .017) * (.67 + .57 * sqrt(max(0.0, clothLuminance)));
    diffuseColor.rgb = mix(diffuseColor.rgb, driedRed, stainCoverage);
   `)
 }
 return material
}

export function characterImpacts(root,scene){
 const marks=[],surfaces=new Map()
 let parts,head,chest,disposed=false
 function loadParts(){
  parts=[]
  scene.traverse(part=>{
   if(part.isBone&&part.name.endsWith('_Head'))head=part
   if(part.isBone&&part.name.endsWith('_Spine2'))chest=part
   if(!part.isSkinnedMesh||!part.visible||!part.material.isMeshStandardMaterial||part.material.name==='Hair')return
   // A generous one-time ray bound covers the same surface in a fall or crouch.
   part.computeBoundingSphere()
   const scale=forward.setFromMatrixColumn(part.matrixWorld,0).length()
   part.boundingSphere.radius=Math.max(part.boundingSphere.radius,1.9/Math.max(.0001,scale))
   parts.push(part)
  })
 }
 function cast(point){
  ray.ray.origin.copy(point).addScaledVector(incoming,-.73)
  ray.ray.direction.copy(incoming)
  hits.length=0
  ray.intersectObjects(parts,false,hits)
  return hits[0]
 }
 function refresh(mesh){
  const data=surfaces.get(mesh)
  let size=0
  for(const mark of marks){
   if(mark.mesh!==mesh)continue
   data.stains[size].copy(mark.stamp)
   data.normals[size++].copy(mark.normal)
  }
  data.count.value=size
  if(size===0){
   mesh.material=data.original
   data.material.dispose()
   surfaces.delete(mesh)
  }
 }
 function markImpact({point,source,direction,kind='melee',zone='body',strength=24}={}){
  if(disposed||!Number.isFinite(strength)||strength<=0)return null
  root.parent?.updateWorldMatrix(true,false)
  root.updateMatrixWorld(true)
  if(!parts)loadParts()
  const upper=zone==='upper'
  const bone=upper?head:chest
  base.setFromMatrixPosition(root.matrixWorld)
  if(bone)anchor.setFromMatrixPosition(bone.matrixWorld).y+=upper?.11:.025
  else anchor.copy(base).y+=upper?1.63:1.26
  const hasPoint=Number.isFinite(point?.x)&&Number.isFinite(point.y)&&Number.isFinite(point.z)&&
   (target.copy(point).distanceToSquared(base)>.01)
  if(!hasPoint)target.copy(anchor)
  if(direction)incoming.set(direction.x,direction.y??0,direction.z)
  else if(source)incoming.set(target.x-source.x,target.y-(source.y??target.y),target.z-source.z)
  else incoming.set(0,0,0)
  forward.setFromMatrixColumn(root.matrixWorld,2).normalize()
  if(!Number.isFinite(incoming.lengthSq())||incoming.lengthSq()<.0001)incoming.copy(forward).negate()
  incoming.normalize()
  let hit=cast(target)
  if(!hit){
   incoming.y=0
   if(incoming.lengthSq()<.0001)incoming.copy(forward).negate()
   incoming.normalize()
   hit=cast(anchor)
  }
  if(!hit)return null

  // Convert the hit on the posed triangle to the same triangle in bind space.
  // The mesh shader samples here so its stain deforms with the underlying skin.
  const mesh=hit.object,position=mesh.geometry.getAttribute('position')
  const face=hit.face,barycentric=hit.barycoord
  a.fromBufferAttribute(position,face.a)
  b.fromBufferAttribute(position,face.b)
  c.fromBufferAttribute(position,face.c)
  center.copy(a).multiplyScalar(barycentric.x).addScaledVector(b,barycentric.y).addScaledVector(c,barycentric.z)
  normal.subVectors(b,a).cross(c.sub(a)).normalize()
  if(!surfaces.has(mesh)){
   const original=mesh.material,count={value:0}
   const stains=Array.from({length:maximumStains},()=>new Vector4())
   const normals=Array.from({length:maximumStains},()=>new Vector4())
   const material=stainMaterial(original,stains,normals,count)
   surfaces.set(mesh,{original,material,stains,normals,count})
   mesh.material=material
  }
  const style=styles[kind]??styles.melee
  const skin=mesh.material.name==='Skin'||mesh.material.name==='Patrol face'
  const severity=MathUtils.clamp(Math.sqrt(strength/32),.28,1.24)
  const radius=style.radius*(.68+.32*severity)*(skin?.69:1)
  const opacity=style.opacity*(.52+.42*severity)
  const dropped=marks.length===maximumStains?marks.shift():null
  marks.push({mesh,stamp:new Vector4(center.x,center.y,center.z,radius),normal:new Vector4(normal.x,normal.y,normal.z,opacity)})
  refresh(mesh)
  if(dropped&&dropped.mesh!==mesh)refresh(dropped.mesh)
  const outward=hit.face.normal.clone().applyNormalMatrix(normalMatrix.getNormalMatrix(mesh.matrixWorld))
  if(outward.dot(incoming)>0)outward.negate()
  outward.addScaledVector(incoming,-.55).normalize()
  return {point:hit.point,direction:outward}
 }
 function clearImpacts(){
  marks.length=0
  for(const mesh of surfaces.keys())refresh(mesh)
 }
 return {markImpact,clearImpacts,dispose(){disposed=true;clearImpacts()}}
}
