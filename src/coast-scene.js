import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {beachGate,coastalRocks,dock,rockRadius,seabed,seaLevel,shoreX,shoal,swimLadder} from './coast-plan.js'

const sandURL='/assets/coast/'
function textures(color,normal){
 const loader=new T.TextureLoader()
 const map=loader.load(sandURL+color),normalMap=loader.load(sandURL+normal)
 map.colorSpace=T.SRGBColorSpace
 for(const texture of [map,normalMap]){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4}
 return {map,normalMap}
}
function sandGeometry(){
 const g=new T.PlaneGeometry(156,175,106,112).rotateX(-Math.PI/2).translate(104.1,0,179)
 const p=g.attributes.position,u=g.attributes.uv,col=[]
 const dry=new T.Color(0xe9c89c),wet=new T.Color(0xb3a18a),lo=new T.Color(0x677d71),mix=new T.Color()
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),y=seabed(x,z)
  p.setY(i,y);u.setXY(i,x/3.72,-z/3.72)
  mix.copy(lo).lerp(wet,T.MathUtils.smoothstep(y,seaLevel-3,seaLevel+.10))
   .lerp(dry,T.MathUtils.smoothstep(y,seaLevel+.21,seaLevel+.85))
  mix.multiplyScalar(.95+.05*Math.sin(.14*x+.02*z)*Math.cos(.18*z))
  col.push(mix.r,mix.g,mix.b)
 }
 g.setAttribute('color',new T.Float32BufferAttribute(col,3))
 g.computeVertexNormals()
 return g
}
function sandMaterial(){
 const {map,normalMap}=textures('sand-diffuse.webp','sand-nor_gl.webp')
 const roughnessMap=new T.TextureLoader().load(sandURL+'sand-rough.webp')
 roughnessMap.wrapS=roughnessMap.wrapT=T.RepeatWrapping
 const clock={value:0}
 const material=new T.MeshStandardMaterial({map,normalMap,roughnessMap,vertexColors:true,
  roughness:.96,normalScale:new T.Vector2(.53,.53)})
 material.onBeforeCompile=shader=>{
  shader.uniforms.shoreTime=clock
  shader.vertexShader='varying vec3 sandPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\n sandPoint=position;')
  shader.fragmentShader='varying vec3 sandPoint; uniform float shoreTime;\n'+shader.fragmentShader
   .replace('#include <map_fragment>',`#include <map_fragment>
    vec2 uv=sandPoint.xz;
    float wet=1.-smoothstep(${seaLevel+.04},${seaLevel+.82},sandPoint.y);
    float layers=.5+.5*sin(uv.x*.13+.72*sin(uv.y*.17));
    vec2 macroUV=mat2(.8,-.6,.6,.8)*vMapUv*.33;
    diffuseColor.rgb*=mix(vec3(1.),texture2D(map,macroUV).rgb*1.48,.24+.16*layers);
    diffuseColor.rgb*=mix(1.15,.76,wet);
   `)
   .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    roughnessFactor=mix(clamp(roughnessFactor*.65+.31,.66,.99),.48,wet);
   `)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float waterDepth=${seaLevel}-sandPoint.y;
    if(cameraPosition.y<${seaLevel}&&waterDepth>0.){
     float a=sin(uv.x*3.6+sin(uv.y*2.2+shoreTime*.82)*1.3+shoreTime);
     float b=sin(uv.y*4.2+sin(uv.x*2.7-shoreTime*.75)*1.2-shoreTime*.52);
     float caustics=pow(1.-abs(a*b),7.)*exp(-waterDepth*.31);
     totalEmissiveRadiance+=vec3(.066,.126,.105)*caustics;
    }
   `)
 }
 return {material,clock}
}
function parasol(radius,turn){
 const texture=[],p=[],tri=[],sectors=14,heights=[.42,.35,.13,-.04]
 for(let ring=0;ring<heights.length;ring++)for(let j=0;j<=sectors;j++){
  const angle=j/sectors*Math.PI*2+turn,r=ring*radius/3*(j%2?.95:1)
  p.push(Math.cos(angle)*r,heights[ring]+(j%2?-.055:0),Math.sin(angle)*r)
  texture.push(j/sectors,ring/3)
  if(ring&&j){const i=p.length/3-1;tri.push(i,i-1,i-sectors-2,i,i-sectors-2,i-sectors-1)}
 }
 const g=new T.BufferGeometry()
 g.setAttribute('position',new T.Float32BufferAttribute(p,3))
 g.setAttribute('uv',new T.Float32BufferAttribute(texture,2))
 g.setIndex(tri);g.computeVertexNormals()
 return g
}
function rockGeometry(k,index){
 const p=[],uv=[],tri=[],sides=20,rings=[[-.21,.68],[.01,1],[.28,.95],[.64,.77],[.91,.43],[1,0]]
 const ground=seabed(k.x,k.z)
 const floor=Math.max(seaLevel-1.0,Math.min(seaLevel+.65,ground))
 for(let j=0;j<rings.length;j++)for(let i=0;i<=sides;i++){
  const a=i/sides*Math.PI*2,[y,r]=rings[j]
  const n=rockRadius(index,a)*r
  const motion=Math.sin(a*3+index)*Math.sin(Math.PI*j/5)*.15
  p.push(k.x+Math.cos(a)*k.rx*n+(y+.21)*k.rx*.18,j===0?Math.min(ground-.12,floor+y*k.h):floor+(y+motion)*k.h,k.z+Math.sin(a)*k.rz*n)
  uv.push(i/sides*(k.rx+k.rz)*1.62,(y+motion)*k.h*.47)
  if(j&&i){const d=j*(sides+1)+i;tri.push(d,d-1,d-sides-2,d,d-sides-2,d-sides-1)}
 }
 const g=new T.BufferGeometry()
 g.setAttribute('position',new T.Float32BufferAttribute(p,3))
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2))
 g.setIndex(tri);g.computeVertexNormals()
 return g
}

function underwaterDrift(scene){
 const seeds=[],noise=i=>(Math.sin(i*127.1+34.9)*43758.5453)%1
 for(let i=0;i<54;i++)for(let j=0;j<3;j++)seeds.push((noise(i*3+j)+1)%1)
 const geometry=new T.BufferGeometry()
 geometry.setAttribute('position',new T.Float32BufferAttribute(seeds,3))
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,
  uniforms:{time:{value:0}},
  vertexShader:`
   uniform float time;
   varying float opacity;
   void main(){
    vec3 world=cameraPosition+(fract(position+vec3(time*.016,time*.027,time*.008))-.5)*vec3(16.,8.,16.);
    vec4 mv=viewMatrix*vec4(world,1.);
    float d=-mv.z;
    opacity=smoothstep(1.2,3.8,d)*(1.-smoothstep(7.,13.,d))*
     (1.-smoothstep(${seaLevel-.32},${seaLevel},world.y))*.22;
    gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp(18./max(1.,d),1.,4.);
   }`,
  fragmentShader:`
   varying float opacity;
   void main(){
    float feather=1.-smoothstep(.15,.48,length(gl_PointCoord-vec2(.5)));
    gl_FragColor=vec4(.67,.80,.69,opacity*feather);
   }`
 })
 const mist=new T.Points(geometry,material)
 mist.name='Submerged drifting particles';mist.frustumCulled=false;mist.visible=false
 scene.add(mist)
 return (time,submerged)=>{
  mist.visible=submerged
  if(submerged)material.uniforms.time.value=time
 }
}

export function buildCoast(scene,addCollider){
 const group=new T.Group();group.name='Meridian Beach and shoals'
 const sand=sandMaterial(),drift=underwaterDrift(scene)
 const terrain=new T.Mesh(sandGeometry(),sand.material)
 terrain.name='Dry sand, intertidal shelf and seabed';terrain.receiveShadow=true;group.add(terrain)
 const rocks=coastalRocks.map(rockGeometry)
 const stone=new T.Mesh(mergeGeometries(rocks),new T.MeshStandardMaterial({roughness:.88,color:0xb4a59a,side:T.DoubleSide,...textures('rock-diffuse.webp','rock-nor_gl.webp')}))
 for(const g of rocks)g.dispose()
 stone.castShadow=stone.receiveShadow=true;group.add(stone)
 const parts=new Map(),box=new T.BoxGeometry()
 const wood=new T.MeshStandardMaterial({color:0x91734f,roughness:.87})
 const base=new T.MeshStandardMaterial({color:0x4d574c,roughness:.93})
 const cream=new T.MeshStandardMaterial({color:0xd8c2a2,roughness:.73})
 const rust=new T.MeshStandardMaterial({color:0x9d503c,roughness:.83})
 const canvas=[0xcd895a,0x517781,0xd0bb8c].map(color=>new T.MeshStandardMaterial({
  color,roughness:.91,side:T.DoubleSide}))
 const stoneAccent=new T.MeshStandardMaterial({color:0x6f6557,roughness:.92})
 const reed=new T.MeshStandardMaterial({color:0x768052,roughness:.92,side:T.DoubleSide})
 function batch(g,m){const list=parts.get(m)??[];list.push(g);parts.set(m,list)}
 function block(x,y,z,w,h,d,m){batch(box.clone().scale(w,h,d).translate(x,y,z),m)}
 function tube(x,y,z,r,h,m,r0=r){batch(new T.CylinderGeometry(r,r0,h,7).translate(x,y,z),m)}
 for(let x=dock.west+.19;x<dock.east;x+=.37)block(x,dock.height-.095,dock.z,.355,.19,dock.half*2,wood)
 for(const z of [dock.z-1.42,dock.z+1.42]){
  block((dock.west+dock.east)*.5,-.16,z,dock.east-dock.west,.22,.25,base)
  for(let x=dock.west+.55;x<dock.east;x+=4.25){tube(x,-2.8,z,.105,5.75,base);tube(x,.37,z,.12,.48,wood)}
 }
 for(const s of [-1,1])tube(swimLadder.x+s*.29,-.87,swimLadder.z-.24,.036,2.42,cream)
 for(let i=0;i<8;i++)block(swimLadder.x,.14-i*.28,swimLadder.z-.24,.62,.046,.08,cream)
 for(let x=30;x<46;x+=.60)block(x,.053,beachGate.z,.581,.077,4.42,wood)
 for(const z of [beachGate.z-2.23,beachGate.z+2.23])block(37,.10,z,15,.19,.10,base)
 for(const [i,[x,z]] of [[48,139],[52,155],[58,158],[57,176],[64,196]].entries()){
  const y=seabed(x,z)
  tube(x,y+1.12,z,.052,2.24,base)
  batch(parasol(1.43-.075*(i%3),i*.82).translate(x,y+2.10,z),canvas[i%canvas.length])
  tube(x,y+2.53,z,.034,.105,cream)
  block(x-1.7,y+.42,z,1.33,.12,.46,wood)
  for(const d of [-.50,.50])block(x-1.7+d,y+.22,z,.12,.43,.38,base)
  addCollider(x-.07,x+.07,z-.07,z+.07,y+2.12)
 }
 const hut={x:49,z:169}
 const y=seabed(hut.x,hut.z)
 block(hut.x,y+1.23,hut.z,4.7,2.46,3.9,cream)
 batch(new T.BoxGeometry(5.6,.19,4.6).rotateZ(-.080).translate(hut.x,y+2.62,hut.z),rust)
 for(let z=hut.z-1.85;z<hut.z+1.9;z+=.29)block(hut.x,y+2.46,z,5.25,.08,.028,wood)
 for(let z=hut.z-1.62;z<hut.z+1.78;z+=.17)block(hut.x+2.383,y+.56,z,.028,.81,.035,wood)
 for(const z of [hut.z-1.6,hut.z+1.6]){
  tube(hut.x+2.4,y+1.38,z,.13,.07,cream,.17)
  block(hut.x+2.42,y+1.28,z,.11,.10,.27,rust)
 }
 block(hut.x+2.38,y+1.62,hut.z,.08,.75,2.38,base)
 block(hut.x+1.5,y+.135,hut.z+2.27,3.1,.27,.57,wood)
 addCollider(hut.x-2.35,hut.x+2.35,hut.z-1.95,hut.z+1.95,y+2.5)
 const board=document.createElement('canvas');board.width=512;board.height=176
 const paint=board.getContext('2d');paint.fillStyle='#6c4737';paint.fillRect(0,0,512,176)
 paint.fillStyle='#e2cda4';paint.fillRect(6,9,500,5);paint.fillRect(6,162,500,5)
 paint.font='bold 43px sans-serif';paint.textAlign='center';paint.fillText('MERIDIAN BEACH',256,79)
 paint.font='24px sans-serif';paint.fillText('PUBLIC ACCESS  /  PIER',256,125)
 const signTexture=new T.CanvasTexture(board);signTexture.colorSpace=T.SRGBColorSpace
 const sign=new T.Mesh(new T.PlaneGeometry(2.37,.82),new T.MeshStandardMaterial({map:signTexture,roughness:.83}))
 sign.rotation.y=-Math.PI/2;sign.position.set(44,1.39,149.36);group.add(sign)
 block(44,1.39,149.36,.085,.86,2.44,wood)
 for(const z of [148.46,150.26]){
  block(44,.92,z,.105,1.84,.13,base)
  addCollider(43.94,44.06,z-.07,z+.07,1.84)
 }
 for(const [x,z] of [[38,129],[45,132],[37,163],[40,183],[43,187],[49,206],[52,213],[150,206]]){
  const baseY=seabed(x,z),height=3.9+.38*Math.sin(x),tilt=.30*Math.sin(z)
  const stem=new T.CylinderGeometry(.085,.16,height,7).rotateZ(tilt)
  batch(stem.translate(x,baseY+height*.5,z),wood)
  const topX=x-Math.sin(tilt)*height*.5,topY=baseY+height*.97
  for(let i=0;i<9;i++){
   const ph=i*.698,length=1.6+.6*Math.cos(i*7+x),points=[]
   for(let j=0;j<=6;j++){
    const q=j/6,w=Math.sin(q*Math.PI)*.32
    for(const d of [-1,1])points.push(q*length,Math.sin(q*Math.PI)*.47-q*.52,d*w)
   }
   const indices=[]
   for(let j=0;j<6;j++){const a=j*2;indices.push(a,a+1,a+3,a,a+3,a+2)}
   const g=new T.BufferGeometry()
   g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals()
   batch(g.rotateY(ph).translate(topX,topY,z),reed)
  }
  addCollider(x-.17,x+.17,z-.18,z+.18,baseY+height)
 }
 for(const [x,z] of [[41,149],[200,-65],[200,-5],[200,55],[200,115],[200,175],[200,234],[155,268],[95,268],[200,268],[52,-89],[125,-89]]){
  if(x<45){
   block(x,1.2,z,.13,2.26,.13,base)
   block(x,1.62,z,.12,.55,1.2,rust)
   continue
  }
  tube(x,seaLevel+.24,z,.26,.55,rust,.43)
  tube(x,seaLevel+.57,z,.105,.20,cream)
 }
 // The upper strand traps ordered pockets of flotsam rather than uniform scatter.
 for(let i=0;i<36;i++){
  const z=123+i*2.79,x=shoreX(z)-2.9-Math.abs(Math.sin(i*4.21))*3.1
  const y=seabed(x,z)
  if(Math.abs(z-beachGate.z)<5||y<seaLevel+.22)continue
  const size=.045+.07*Math.abs(Math.cos(i*3.21))
  batch(new T.IcosahedronGeometry(size,0).scale(1.5,.49,.68).rotateY(i*1.9).translate(x,y+.02,z),i%5?stoneAccent:cream)
 }
 for(const [x,z,angle] of [[70,156,.8],[64,183,-.43],[58,207,.25]]){
  const height=seabed(x,z)
  batch(new T.CylinderGeometry(.052,.085,.8,7).rotateZ(Math.PI/2).rotateY(angle).translate(x,height+.045,z),wood)
 }
 // Submerged ribbons are batched and use the same seabed as swimming.
 for(let i=0;i<54;i++){
  const z=115+i*2.35,x=(i%4===0?shoal.x-12:shoreX(z)+7.5)+Math.sin(i*5.2)*3.4
  const h=.27+.24*Math.abs(Math.sin(i*2.44)),f=seabed(x,z)
  if(f>seaLevel-.36)continue
  batch(new T.PlaneGeometry(.08,h).rotateY(i*.93).rotateZ(.42*Math.sin(i)).translate(x,f+h*.47,z),reed)
 }
 box.dispose()
 for(const [mat,list] of parts){
  const nonIndexed=list.map(g=>g.index?g.toNonIndexed():g)
  for(const geometry of nonIndexed)geometry.deleteAttribute('uv')
  const mesh=new T.Mesh(mergeGeometries(nonIndexed),mat);mesh.receiveShadow=true;group.add(mesh)
  for(const g of new Set([...list,...nonIndexed]))g.dispose()
 }
 scene.add(group)
 const printCanvas=document.createElement('canvas');printCanvas.width=32;printCanvas.height=64
 const pen=printCanvas.getContext('2d')
 pen.fillStyle='#2317136e'
 for(const [x,y,rx,ry] of [[16,20,9,17],[15,43,6,14],[17,55,5,7]]){pen.beginPath();pen.ellipse(x,y,rx,ry,.14,0,Math.PI*2);pen.fill()}
 const footMaterial=new T.MeshBasicMaterial({map:new T.CanvasTexture(printCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})
 const tracks=new T.InstancedMesh(new T.PlaneGeometry(.21,.43).rotateX(-Math.PI/2),footMaterial,48)
 tracks.frustumCulled=false;tracks.count=0;group.add(tracks)
 const footprints=[],stepPose=new T.Object3D()
 let left=false
 function update(position,time=0,cameraY=0){
  sand.clock.value=time;drift(time,cameraY<seaLevel-.06)
  while(footprints.length&&time-footprints[0].time>19)footprints.shift()
  if(tracks.count!==footprints.length){
   tracks.count=footprints.length
   for(let i=0;i<footprints.length;i++)tracks.setMatrixAt(i,footprints[i].matrix)
   tracks.instanceMatrix.needsUpdate=true
  }
  const visible=position.x> -90&&position.z> -6||position.x>32
  if(visible===group.visible)return false
  group.visible=visible
  return true
 }
 update.footstep=(x,z,face,time)=>{
  const side=(left=!left)?.16:-.16
  x+=Math.cos(face)*side+Math.sin(face)*.18;z-=Math.sin(face)*side-Math.cos(face)*.18
  const y=seabed(x,z)
  if(y<seaLevel+.04)return
  stepPose.position.set(x,y+.026,z);stepPose.rotation.set(0,face,0);stepPose.updateMatrix()
  if(footprints.length===48){footprints.shift();tracks.count--}
  footprints.push({matrix:stepPose.matrix.clone(),time})
 }
 return update
}
