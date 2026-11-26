import {loadPortProp} from './port-props.js'
import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {marketEntrance} from './old-town-plan.js'
import {premises,front,windowMasonry} from './market-plan.js'

// Batch fixed fittings by material; unloading releases district-owned GPU resources.
export async function marketDetail(){
 let testLamp
 const crates=[]
 const group=new T.Group(), batches=new Map(), textures=[], materials=[]
 const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.8,...extra});materials.push(m);return m}
 const loader=new T.TextureLoader()
 const load=async path=>{
  const t=await loader.loadAsync('/assets/'+path+'.webp');textures.push(t)
  t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,1);return t
 }
 const dispose=()=>{
  group.traverse(o=>{
   o.geometry?.dispose()
   if(o.isInstancedMesh)o.dispose()
  })
  materials.forEach(m=>m.dispose())
  textures.forEach(t=>t.dispose())
 }
 const surfaces=[...premises.map(p=>'architecture/'+p.skin),'street/asphalt_04-Diffuse','street/concrete_pavement_02-Diffuse']
 const [crate,loaded]=await Promise.all([
  loadPortProp('chandlery-crate'),Promise.allSettled(surfaces.map(load))
 ])
 if(crate){
  materials.push(crate.material)
  for(const t of new Set(Object.values(crate.material).filter(v=>v?.isTexture)))textures.push(t)
 }
 if(loaded.some(v=>v.status==='rejected')){crate?.geometry.dispose();dispose();throw Error('시장 표면 재질 로딩 실패')}
 const maps=loaded.map(v=>v.value)
 function box(x,y,z,w,h,d,m){
  const g=new T.BoxGeometry(w,h,d).translate(x,y,z)
  if(!batches.has(m))batches.set(m,[])
  batches.get(m).push(g)
 }
 function fitting(geometry,x,y,z,material,angle=0){
  geometry.rotateX(angle).translate(x,y,z)
  if(!batches.has(material))batches.set(material,[])
  batches.get(material).push(geometry)
 }
 function sign(text,x,y,z,w,h){
  const c=document.createElement('canvas');c.width=768;c.height=128
  const ctx=c.getContext('2d');ctx.fillStyle='#253332';ctx.fillRect(0,0,768,128)
  ctx.fillStyle='#dfcf9e';ctx.fillRect(10,10,748,3);ctx.font='600 62px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,86)
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;textures.push(t)
  box(x,y,z,w,h,.045,mat(0xffffff,{map:t}))
 }
 const metal=mat(0x324041),wood=mat(0x916d4c),linen=mat(0xdcccad),stripe=mat(0xd7c093),glass=mat(0x899f9e,{metalness:.16,roughness:.2,transparent:true,opacity:.23,depthWrite:false}),paper=mat(0xc6bd98)
 box(-68,-.008,-37,56,.018,12,mat(0xaaaaaa,{map:maps[3]}))
 const sidewalk=mat(0xc3bab0,{map:maps[4]})
 box(-68,.045,-44.5,56,.07,3,sidewalk)
 for(const [a,b] of [[-96,marketEntrance[0]],[marketEntrance[1],-40]])box((a+b)/2,.045,-29,b-a,.07,4,sidewalk)
 for(let x=-42;x>-95;x-=5)box(x,.012,-37,2,.018,.1,stripe)
 for(const [i,p] of premises.entries()){
  const facade=mat(0xffffff,{map:maps[i]}),glow=mat(p.light,{emissive:p.light,emissiveIntensity:.9})
  for(const [x,y,,w,h] of windowMasonry(p.x))box(x,y,front+.13,w,h,.025,facade)
  for(const dx of [-3.25,3.25]){
   for(const side of [-1,1]){
    box(p.x+dx+side*1.35,1.70,front+.16,.09,1.52,.16,metal)
    box(p.x+dx,1.70+side*.72,front+.16,2.79,.09,.16,metal)
   }
   box(p.x+dx,1.72,front+.21,2.65,1.37,.04,glass)
   for(const k of [-.8,0,.8])box(p.x+dx+k,1.72,front+.24,.065,1.42,.045,metal)
   box(p.x+dx,1.01,front+.26,2.95,.12,.22,wood)
  }
  // Stone thresholds, skirting, and fittings use the same street materials as the quay.
  box(p.x,.052,-51,10.7,.01,9.72,mat(i===0?0xbcb6a8:0x9b9e96,{map:maps[4]}))
  for(const side of [-1,1]){
   box(p.x+side*5.36,1.55,-51,.035,3.05,9.82,facade)
   box(p.x+side*5.32,.28,-51,.085,.47,9.86,metal)
  }
  box(p.x,.29,-55.79,10.7,.47,.085,metal)
  // Cladding continues along the sides visible from the cross street.
  for(const side of [-1,1])box(p.x+side*5.63,1.71,-51,.035,3.37,10,facade)
  box(p.x,1.71,-56.14,11,3.37,.035,facade)
  box(p.x,1.55,-55.85,10.7,3,.03,facade)
  if(i===0){
   box(p.x,3.64,-51,11.6,.13,10.6,metal)
   fitting(new T.CylinderGeometry(.045,.075,2.25,8),p.x+4,4.75,-52,metal)
   for(let k=0;k<3;k++)box(p.x+4,5.1+k*.18,-52,1.16-k*.2,.035,.04,metal)
  }else if(i===1){
   box(p.x,2.93,-45.3,11.6,.10,1.7,linen)
   for(let k=0;k<11;k++)box(p.x-5+k,2.95,-45.3,.44,.09,1.71,facade)
  }else{
   for(const dx of [-2.7,2.7])fitting(new T.CylinderGeometry(.54,.57,.95,12),p.x+dx,4.05,-52,metal)
   for(const dx of [-2.7,2.7])fitting(new T.ConeGeometry(.79,.34,12),p.x+dx,4.66,-52,metal)
  }
  // Open leaf hangs alongside the jamb, leaving a two-metre opening clear.
  box(p.x-.98,1.12,front-.49,.055,2.25,.98,wood)
  box(p.x-.93,1.03,front-.78,.08,.14,.05,metal)
  box(p.x,2.88,front+.58,10.95,.12,1.25,metal)
  sign(p.title.toUpperCase(),p.x,3.3,front+.18,8,.66)
  for(const [dx,dz,w,h,d] of p.furnishings){
   const x=p.x+dx,z=-51+dz
   box(x,h,z,w,.12,d,wood)
   for(const u of [-1,1])for(const v of [-1,1])box(x+u*(w*.5-.1),h*.5,z+v*(d*.5-.1),.11,h,.11,metal)
   if(i===0){box(x,h+.09,z,w*.6,.025,d*.7,paper);box(x+.25,h+.15,z,.62,.1,.13,wood)}
   if(i===1){
    box(x,h*.46,z,w,.07,d,wood)
    for(let j=0;j<3;j++){
     const zz=z+(j-1)*d*.26
     // The reels occupy the western tabletop; the freight sits on its lower shelf.
     if(crate)crates.push([x,(dx<0?h*.46+.035:h+.06)+.01,zz])
     else box(x,h+.17,zz,.63,.31,.5,j===1?linen:wood)
    }
   }
   if(i===2){for(const k of [-.3,.3]){box(x+k,h+.22,z,.25,.36,.24,glow);box(x+k,h+.43,z,.36,.08,.35,metal)}}
  }
  // A wall tide dial, chandlery rope reels and serviceable signal lanterns.
  if(i===0){
   fitting(new T.CylinderGeometry(.87,.87,.14,32),p.x,2.1,-55.78,metal,Math.PI/2)
   fitting(new T.CylinderGeometry(.78,.78,.04,32),p.x,2.1,-55.67,paper,Math.PI/2)
   for(let t=0;t<12;t++){const a=t*Math.PI/6;box(p.x+Math.sin(a)*.66,2.1+Math.cos(a)*.66,-55.63,.045,.065,.02,metal)}
   fitting(new T.BoxGeometry(.035,.6,.035).translate(0,.3,0).rotateZ(-.65),p.x,2.1,-55.61,metal)
  }else if(i===1){
   for(const z of [-52,-50]){
    for(const side of [-1,1])fitting(new T.CylinderGeometry(.37,.37,.04,20),p.x-3,1.48,z+side*.3,metal,Math.PI/2)
    for(let j=0;j<7;j++)fitting(new T.TorusGeometry(.27,.049,5,20),p.x-3,1.48,z-.24+j*.08,linen)
   }
  }else{
   testLamp=mat(0x226a50,{emissive:0x35f2a6,emissiveIntensity:.12})
   for(const dx of [1.2,2.8]){
    fitting(new T.CylinderGeometry(.22,.3,.18,12),p.x+dx,1.16,-54,metal)
    fitting(new T.CylinderGeometry(.18,.2,.43,12),p.x+dx,1.46,-54,testLamp)
    fitting(new T.ConeGeometry(.32,.22,12),p.x+dx,1.78,-54,metal)
   }
  }
  for(const dx of [-3,3]){box(p.x+dx,3.24,-51,1.8,.12,.44,metal);box(p.x+dx,3.15,-51,1.65,.045,.38,glow)}
  for(let j=0;j<4;j++)box(p.x+2+j*.65,3.67,-53, .07,.32,2.2,metal)
 }
 for(let x=-44;x>=-94;x-=16){box(x,1.9,-30.7,.13,3.8,.13,metal);box(x+.5,3.76,-30.7,1,.11,.18,metal);box(x+.89,3.68,-30.7,.4,.07,.36,linen)}
 if(crate){
  const bins=new T.InstancedMesh(crate.geometry,crate.material,crates.length)
  const placement=new T.Object3D()
  placement.rotation.y=Math.PI/2;placement.scale.setScalar(.83)
  crates.forEach(([x,y,z],index)=>{
   placement.position.set(x,y,z);placement.updateMatrix();bins.setMatrixAt(index,placement.matrix)
  })
  bins.name='Chandlery freight';bins.castShadow=bins.receiveShadow=true;group.add(bins)
 }
 for(const [material,parts] of batches){const mesh=new T.Mesh(mergeGeometries(parts),material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);parts.forEach(g=>g.dispose())}
 return {group,dispose,signalTest(on){testLamp.emissiveIntensity=on?3:.12}}
}
