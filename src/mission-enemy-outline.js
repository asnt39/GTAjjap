import {AlwaysStencilFunc,Group,Mesh,MeshBasicMaterial,NotEqualStencilFunc,ReplaceStencilOp,SkinnedMesh,Vector2} from 'three'

const outlineRed=0xda3e49
const stencilBit=1

function passMaterial(source,outline,viewport){
 const alphaTest=source.alphaTest||(source.transparent ? .25 : 0)
 const material=new MeshBasicMaterial({
  color:outlineRed,toneMapped:false,fog:outline,colorWrite:outline,depthWrite:outline,
  side:source.side,map:alphaTest?source.map:null,alphaMap:alphaTest?source.alphaMap:null,
  alphaTest,stencilWrite:true,stencilRef:stencilBit,stencilFuncMask:stencilBit,
  stencilWriteMask:outline?0:stencilBit,stencilFunc:outline?NotEqualStencilFunc:AlwaysStencilFunc
 })
 if(!outline)material.stencilZPass=ReplaceStencilOp
 material.customProgramCacheKey=()=>outline?'mission-enemy-outline':'mission-enemy-mask'
 material.onBeforeCompile=shader=>{
  // Keep the texture's cutout without tinting the outline with the outfit.
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
   #ifdef USE_MAP
    diffuseColor.a *= texture2D(map, vMapUv).a;
   #endif
  `)
  if(!outline)return
  shader.uniforms.outlineViewport={value:viewport}
  // Widen the posed mesh by two CSS pixels along the projected vertex normal.
  shader.vertexShader=shader.vertexShader
   .replace('#include <common>','#include <common>\nuniform vec2 outlineViewport;')
   .replace('#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )','#if 1')
   .replace('#include <project_vertex>',`#include <project_vertex>
    vec4 normalClip = projectionMatrix * vec4(transformedNormal, 0.0);
    vec2 direction = (normalClip.xy * gl_Position.w - gl_Position.xy * normalClip.w) * outlineViewport;
    gl_Position.xy += direction / max(length(direction), 0.0001) * (4.0 / outlineViewport) * gl_Position.w;
   `)
 }
 return material
}

function passMesh(source,material){
 const mesh=source.isSkinnedMesh?new SkinnedMesh(source.geometry,material):new Mesh(source.geometry,material)
 if(source.isSkinnedMesh){
  mesh.bindMode=source.bindMode
  mesh.bind(source.skeleton,source.bindMatrix)
 }
 mesh.morphTargetInfluences=source.morphTargetInfluences
 mesh.frustumCulled=source.frustumCulled
 mesh.layers.mask=source.layers.mask
 mesh.raycast=()=>{}
 return mesh
}

export function missionEnemyOutline(root){
 const parts=[],passes=[],materials=new Map(),viewport=new Vector2(1,1)
 root.traverse(part=>{if(part.isMesh)parts.push(part)})
 function materialsFor(source){
  if(!materials.has(source))materials.set(source,[passMaterial(source,false,viewport),passMaterial(source,true,viewport)])
  return materials.get(source)
 }
 for(const part of parts){
  const pairs=Array.isArray(part.material)?part.material.map(materialsFor):null
  const [maskMaterial,outlineMaterial]=pairs?
   [pairs.map(([mask])=>mask),pairs.map(([,outline])=>outline)]:materialsFor(part.material)
  const group=new Group()
  // Draw the combined character masks after opaque scenery and before any outline.
  group.name='Mission enemy outline'
  group.renderOrder=100
  group.visible=false
  const mask=passMesh(part,maskMaterial),outline=passMesh(part,outlineMaterial)
  outline.renderOrder=1
  outline.onBeforeRender=renderer=>renderer.getSize(viewport)
  group.add(mask,outline);part.add(group);passes.push(group)
 }
 return {
  show(visible){for(const pass of passes)pass.visible=visible},
  dispose(){
   for(const pass of passes)pass.removeFromParent()
   for(const pair of materials.values())for(const material of pair)material.dispose()
  }
 }
}
