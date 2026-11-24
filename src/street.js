import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createTouring } from './touring.js'
import {garage} from './garage.js'
import {createMotorcycle} from './motorcycle.js'
import { createVehicleRig } from './vehicle-rig.js'
import { touringSetup } from './vehicles.js'

const ROOT = '/assets/street/'
const PI = Math.PI
const V = (x, y, z) => new T.Vector3(x, y, z)
const standard = (color, roughness, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness })

function roadSurface(diffuse, normal) {
  const material = new T.MeshStandardMaterial({
    map: diffuse, normalMap: normal, normalScale: new T.Vector2(.32, .32),
    color: 0x85898f, roughness: .43, metalness: .14, envMapIntensity: .7
  })
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 streetPoint;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nstreetPoint = (modelMatrix * vec4(transformed,1.)).xyz;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 streetPoint;
      float roadNoise(vec2 p){
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        vec4 c=vec4(dot(i,vec2(127.1,311.7)))+vec4(0.,127.1,311.7,438.8);
        c=fract(sin(c)*43758.5453);
        return mix(mix(c.x,c.y,f.x),mix(c.z,c.w,f.x),f.y);
      }
      float finiteStripe(float v,float w){
        float aa=clamp(fwidth(v),.002,.12);
        return 1.-smoothstep(w-aa,w+aa,abs(v));
      }
      float lampTrace(vec2 hit, float side, float start, float dist, float grain){
        float nearest=clamp(floor((hit.y-start)/26.+.5),0.,5.);
        vec2 delta=hit-vec2(side*4.74,start+26.*nearest);
        vec2 spread=vec2(.30+dist*.033,2.4+dist*.33);
        float core=exp(-dot(delta/spread,delta/spread));
        float scatter=exp(-abs(delta.x)/(spread.x*2.8)-abs(delta.y)/(spread.y*1.6));
        return (core*.74+scatter*.26)*grain;
      }`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 p=streetPoint.xz;
      float lane=abs(p.x);
      float basin=roadNoise(p*vec2(.48,.20))*.54+roadNoise(p*vec2(1.28,.48)+3.)*.32+roadNoise(p*3.2)*.14;
      float water=smoothstep(.38,.64,basin);
      float grain=texture2D(map,streetPoint.xz/4.04).r;
      float wear=clamp(.57+2.*grain+.20*roadNoise(p*19.),.30,1.);
      float onAvenue=1.-smoothstep(5.99,6.,lane);
      float crossingArea=abs(p.y+37.);
      float paired=finiteStripe(lane-.115,.045)*smoothstep(9.2,9.45,crossingArea)*onAvenue;
      vec2 sideSpace=vec2(lane-4.06,mod(p.y+3.,6.4)-3.2);
      float bay=finiteStripe(sideSpace.x,.033)*step(abs(sideSpace.y),2.9)+finiteStripe(abs(sideSpace.y)-2.92,.034)*step(0.,sideSpace.x)*step(sideSpace.x,.49);
      bay*=smoothstep(12.,12.2,crossingArea)*onAvenue;
      float crosswalkA=(1.-smoothstep(.78,.80,abs(crossingArea-7.20)))*finiteStripe(mod(p.x+.4,1.)-.5,.28)*step(lane,5.75);
      float crosswalkB=(1.-smoothstep(.70,.72,abs(lane-7.20)))*finiteStripe(mod(p.y+.36,1.)-.5,.28)*step(crossingArea,5.72);
      float stopLine=finiteStripe(crossingArea-9.36,.13)*step(.26,lane)*step(lane,5.68)*step(0.,-p.x*(p.y+37.));
      float sideLine=finiteStripe(crossingArea-.11,.038)*smoothstep(9.2,9.8,lane);
      diffuseColor.rgb*=mix(1.02,.60,water);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.31,.188,.044),clamp((paired+sideLine)*wear,0.,1.));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.44,.425,.355),clamp((bay*.58+max(crosswalkA,crosswalkB)*.85+stopLine*.9)*wear,0.,1.));`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor=mix(.62,.21,water)*(.86+.26*grain);`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec2 ahead=p-cameraPosition.xz;
      float dist=length(ahead);
      float eye=max(cameraPosition.y,.65);
      vec2 reflectedLamp=p+ahead*(6.16/eye);
      float fleck=.40+roadNoise(p*vec2(8.1,43.))*.65;
      float lens=lampTrace(reflectedLamp,-1.,-93.,dist,fleck)+lampTrace(reflectedLamp,1.,-83.,dist,fleck);
      float grazing=smoothstep(.8,14.,dist);
      float shop=0.;
      if(abs(ahead.x)>.01){
        float t=(sign(ahead.x)*10.8-p.x)/ahead.x;
        float reflectedHeight=eye*t;
        float zHit=p.y+ahead.y*t;
        float bays=pow(abs(sin(zHit*.43+sin(zHit*.19))),.75);
        float lit=smoothstep(.27,.56,roadNoise(vec2(floor(zHit/5.),sign(ahead.x)*7.)));
        shop=(1.-smoothstep(.9,2.2,abs(reflectedHeight-2.0)))*bays*lit*step(0.,t)*fleck;
      }
      float ripple=(.48+.52*water)*(.70+.3*roadNoise(p*vec2(3.,15.)));
      outgoingLight+=onAvenue*ripple*(vec3(.85,.39,.106)*lens*.86+vec3(.34,.16,.047)*shop*.66)*(.38+.62*grazing);
      #include <opaque_fragment>`)
  }
  return material
}

function canvasMap(w,h,draw) {
  const c=document.createElement('canvas')
  c.width=w; c.height=h
  draw(c.getContext('2d'),w,h)
  const t=new T.CanvasTexture(c)
  t.colorSpace=T.SRGBColorSpace; t.anisotropy=4
  return t
}

function makeSignMap(title, kind) {
  const street=kind==='street'
  return canvasMap(street?512:192,street?116:240,(c,w,h)=>{
    c.fillStyle=street?'#244847':'#d1cdba'; c.fillRect(0,0,w,h)
    c.strokeStyle=street?'#a9c2b6':'#625c53'; c.lineWidth=4; c.strokeRect(5,5,w-10,h-10)
    c.textAlign='center'; c.textBaseline='middle'
    if(street){
      c.fillStyle='#ebede0'; c.font='600 56px Arial,sans-serif'; c.fillText(title,w/2,h*.53,w*.92)
    }else{
      c.fillStyle='#892f27';c.font='bold 38px Arial,sans-serif';c.fillText('NO',w/2,43);c.fillText('PARKING',w/2,84,w*.9)
      c.fillRect(20,111,w-40,3); c.fillStyle='#393d3c'; c.font='bold 20px Arial,sans-serif'
      c.fillText('LOADING ZONE',w/2,145); c.font='17px Arial,sans-serif'; c.fillText('6 AM — 6 PM',w/2,178)
      c.font='bold 28px Arial,sans-serif'; c.fillText('⟷',w/2,209)
    }
  })
}

function floorGeometry(x1, x2, z1, z2, y, scale) {
  const geom = new T.BufferGeometry()
  geom.setAttribute('position',new T.Float32BufferAttribute([x1,y,z1,x1,y,z2,x2,y,z2,x2,y,z1],3))
  geom.setAttribute('normal',new T.Float32BufferAttribute([0,1,0,0,1,0,0,1,0,0,1,0],3))
  geom.setAttribute('uv',new T.Float32BufferAttribute([x1/scale,z1/scale,x1/scale,z2/scale,x2/scale,z2/scale,x2/scale,z1/scale],2))
  geom.setIndex([0,1,2,0,2,3])
  return geom
}

export async function buildStreet(scene, addCollider, surfaceMaps) {
  const texLoader=new T.TextureLoader(), modelLoader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const files=['asphalt_04-Diffuse.webp','asphalt_04-nor_gl.webp','concrete_pavement_02-Diffuse.webp','concrete_pavement_02-nor_gl.webp','tree-leaves.webp']
  const modelNames=['tree-wood','touring','riverside','fairheaven','dock-panel','sprint-coupe','harbor-motorcycle']
  const [maps,models]=await Promise.all([
    Promise.all(files.map(f=>texLoader.loadAsync(ROOT+f))),
    Promise.all(modelNames.map(f=>modelLoader.loadAsync(ROOT+f+'.glb')))
  ])
  for(let i=0;i<4;i++){
    maps[i].wrapS=maps[i].wrapT=T.RepeatWrapping
    maps[i].anisotropy=4
  }
  for(const i of [0,2,4])maps[i].colorSpace=T.SRGBColorSpace
  if(surfaceMaps)surfaceMaps.street=maps
  const group=new T.Group()
  group.name='Breakwater Avenue streetscape'
  const batches=new Map()
  const unitBox=new T.BoxGeometry(1,1,1)
  const up=V(0,1,0)
  const matrix=new T.Matrix4()
  const identity=new T.Quaternion()
  function batch(geom,mat,position=V(0,0,0),rotation=identity,scale=V(1,1,1)) {
    const parts=batches.get(mat)||[]
    const piece=geom.clone().applyMatrix4(matrix.compose(position,rotation,scale))
    for(const key of Object.keys(piece.attributes))if(!['position','uv','normal'].includes(key))piece.deleteAttribute(key)
    if(!piece.attributes.uv)piece.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(piece.attributes.position.count*2),2))
    parts.push(piece.index?piece.toNonIndexed():piece)
    batches.set(mat,parts)
  }
  const box=(x,y,z,w,h,d,mat,angle=0)=>batch(unitBox,mat,V(x,y,z),new T.Quaternion().setFromAxisAngle(up,angle),V(w,h,d))
  function rod(start,end,r1,r2,mat,sides=8){
    const diff=end.clone().sub(start)
    if(diff.lengthSq()<1e-9)return
    const g=new T.CylinderGeometry(r2,r1,diff.length(),sides,1)
    batch(g,mat,start.clone().lerp(end,.5),new T.Quaternion().setFromUnitVectors(up,diff.normalize()))
    g.dispose()
  }
  const round=(x,y,z,r,h,mat,n=14)=>rod(V(x,y-h/2,z),V(x,y+h/2,z),r,r,mat,n)
  const pillarCollider=(x,z,r,h)=>addCollider(x-r,x+r,z-r,z+r,h)
  const asphalt=roadSurface(maps[0],maps[1])
  const paving=new T.MeshStandardMaterial({color:0xb0aba2,map:maps[2],normalMap:maps[3],normalScale:new T.Vector2(.45,.45),roughness:.64,metalness:.045})
  const concrete=standard(0x8e8a82,.78), curbTop=standard(0x9a9589,.64), gap=standard(0x454849,.88)
  const iron=standard(0x333e41,.52,.58), pole=standard(0x566061,.41,.61), rim=standard(0x8b9390,.43,.55), brown=standard(0x625040,.75)
  const timber=standard(0x84644b,.66), mustard=standard(0x967326,.61,.22), signalBlack=standard(0x252b2a,.48,.28)
  const illumination = color=>new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2.4,roughness:.35})
  const lampOn=illumination(0xffce83), green=illumination(0x7fc193),red=illumination(0xed5840)
  const foundation=standard(0x434442,.92)
  // The three asphalt strips meet edge-to-edge so the intersection has one continuous surface.
  batch(floorGeometry(-6,6,-107,63,0,4.04),asphalt)
  batch(floorGeometry(-40,-6,-43,-31,0,4.04),asphalt)
  batch(floorGeometry(6,26,-43,-31,0,4.04),asphalt)
  function sidewalk(x1,x2,z1,z2){
    batch(floorGeometry(x1,x2,z1,z2,.083,2.65),paving)
  }
  for(const side of [-1,1]){
    const inner=side*6, outer=side*10.8
    for(const [lo,hi] of [[-107,-43],[-31,63]]){
      sidewalk(Math.min(inner,outer),Math.max(inner,outer),lo,hi)
      box(side*6.08,.041,(lo+hi)*.5,.16,.082,hi-lo,concrete)
      const n=Math.ceil((hi-lo)/1.55),step=(hi-lo)/n
      for(let i=0;i<n;i++)box(side*6.09,.088,lo+(i+.5)*step,.19,.018,step-.017,curbTop)
      for(let z=lo+1.75;z<hi;z+=2.28)box(side*8.45,.084,z,4.54,.002,.012,gap)
    }
  }
  for(const [lo,hi] of [[-40,-10.8],[10.8,26]]){
    sidewalk(lo,hi,-46.1,-43); sidewalk(lo,hi,-31,-27.9)
  }
  for(const sz of [-1,1])for(const [lo,hi] of [[-40,-6],[6,26]]){
    const ez=-37+sz*6
    box((lo+hi)*.5,.041,ez+sz*.08,hi-lo,.082,.16,concrete)
    let n=Math.ceil((hi-lo)/1.58),step=(hi-lo)/n
    for(let i=0;i<n;i++)box(lo+(i+.5)*step,.088,ez+sz*.09,step-.018,.018,.19,curbTop)
  }

  const tactile=standard(0xa08555,.64,.14)
  for(const sx of [-1,1])for(const sz of [-1,1]){
    for(const [x,z,angle] of [[sx*6.52,-37+sz*7.24,0],[sx*7.24,-37+sz*6.52,PI/2]]){
      box(x,.09,z,.77,.014,1.28,tactile,angle)
      for(let i=0;i<5;i++)for(let j=0;j<8;j++){
        const dx=(i-2)*.136,dz=(j-3.5)*.149
        round(x+(angle?dz:dx),.103,z+(angle?dx:dz),.021,.019,mustard,6)
      }
    }
  }

  const drainMap=canvasMap(256,256,(c,w)=>{
    c.fillStyle='#323735';c.fillRect(0,0,w,w)
    c.lineWidth=6;c.strokeStyle='#7c8178'
    for(const r of [119,111,95,25]){c.beginPath();c.arc(128,128,r,0,2*PI);c.stroke()}
    c.lineWidth=3
    for(let y=-75;y<=75;y+=16)for(let x=-75;x<=75;x+=16)if(x*x+y*y<7600&&x*x+y*y>1000){
      c.beginPath();c.moveTo(128+x-3,128+y+3);c.lineTo(128+x+3,128+y-3);c.stroke()
    }
    c.fillStyle='#969a8d';c.textAlign='center';c.font='bold 18px Arial';c.fillText('PORT',128,125);c.font='bold 11px Arial';c.fillText('WORKS',128,139)
  })
  const drainSkin=new T.MeshStandardMaterial({map:drainMap,roughness:.57,metalness:.48})
  for(const [x,z] of [[1.38,17.5],[-1.6,-14],[1.28,-38],[-1.5,-72],[1.4,49]]){
    const cover=new T.CircleGeometry(.38,32);cover.rotateX(-PI/2);batch(cover,drainSkin,V(x,.004,z))
  }
  for(const s of [-1,1])for(const z of [-96,-73,-48,-25,-4,17,41,59]){
    const x=s*5.75
    box(x,.007,z,.33,.012,.81,iron)
    for(let k=0;k<8;k++)box(x,.017,z-.326+k*.093,.27,.014,.025,rim)
  }

  const haloMat=new T.SpriteMaterial({map:canvasMap(96,96,(c)=>{
    const grad=c.createRadialGradient(48,48,1,48,48,47)
    grad.addColorStop(0,'rgba(255,232,182,.92)');grad.addColorStop(.14,'rgba(255,208,129,.43)')
    grad.addColorStop(.38,'rgba(253,175,87,.16)');grad.addColorStop(1,'rgba(249,147,66,0)')
    c.fillStyle=grad;c.fillRect(0,0,96,96)
  }),transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:.66, fog:true})
  for(const s of [-1,1])for(let i=0;i<6;i++){
    const z=(s<0?-93:-83)+26*i
    if(z>-43&&z<-31)continue
    const x=s*6.64
    round(x,.122,z,.205,.082,iron,10); round(x,.40,z,.13,.49,pole,10)
    rod(V(x,.40,z),V(x,5.98,z),.085,.057,pole,10)
    const curve=new T.QuadraticBezierCurve3(V(x,5.82,z),V(x,6.43,z),V(s*5.43,6.43,z))
    let last=curve.getPoint(0)
    for(let k=1;k<=4;k++){const next=curve.getPoint(k/4);rod(last,next,.052,.05,pole);last=next}
    rod(last,V(s*4.83,6.32,z),.047,.05,pole)
    const cap=new T.SphereGeometry(1,12,6)
    batch(cap,iron,V(s*4.73,6.29,z),identity,V(.45,.122,.17))
    batch(cap,lampOn,V(s*4.72,6.218,z),identity,V(.361,.068,.128))
    const halo=new T.Sprite(haloMat);halo.position.set(s*4.72,6.218,z);halo.scale.set(1.05,1.05,1);group.add(halo)
    pillarCollider(x,z,.14,6.1)
  }

  const noPark=new T.MeshStandardMaterial({map:makeSignMap('', 'parking'),roughness:.65,metalness:.08,side:T.DoubleSide})
  const breakwater=new T.MeshStandardMaterial({map:makeSignMap('Breakwater Ave','street'),roughness:.54,metalness:.16,side:T.DoubleSide})
  const pier=new T.MeshStandardMaterial({map:makeSignMap('Pier Street','street'),roughness:.54,metalness:.16,side:T.DoubleSide})
  function signFace(x,y,z,w,h,angle,mat){batch(new T.PlaneGeometry(w,h),mat,V(x,y,z),new T.Quaternion().setFromAxisAngle(up,angle))}
  for(const [s,z] of [[-1,7],[1,15],[-1,-55],[1,-17],[1,53]]){
    const x=s*6.54
    rod(V(x,.084,z),V(x,2.7,z),.04,.035,pole,6);signFace(x,2.4,z+.036,.32,.48,s*.20,noPark);pillarCollider(x,z,.04,2.7)
  }
  for(const s of [-1,1]){
    const x=s*6.59,z=-37+s*6.62
    round(x,.16,z,.21,.18,pole)
    rod(V(x,.17,z),V(x,5.77,z),.14,.078,pole,12)
    rod(V(x,5.42,z),V(s*1.13,5.25,z),.096,.06,pole,9)
    rod(V(x,4.85,z),V(s*4.4,5.36,z),.046,.041,pole,7)
    const zSign=z+.095
    signFace(x,3.91,zSign,1.46,.32,.18,breakwater)
    signFace(x,3.56,zSign,1.29,.32,PI/2-.15,pier)
    const signal=(lx,lz,angle,active)=>{
      const dx=Math.sin(angle),dz=Math.cos(angle)
      box(lx,4.72,lz,.35,1.06,.32,mustard,angle)
      box(lx+dx*.174,4.72,lz+dz*.174,.38,1.04,.04,signalBlack,angle)
      for(let k=0;k<3;k++){
        const yy=5.045-k*.32
        box(lx+dx*.238,yy+.117,lz+dz*.238,.275,.066,.21,iron,angle)
        rod(V(lx+dx*.185,yy,lz+dz*.185),V(lx+dx*.21,yy,lz+dz*.21),.102,.10,k===active?(k===0?red:green):signalBlack,14)
      }
    }
    signal(s*1.42,z,s>0?PI:0,2)
    rod(V(x,5.32,z),V(x,5.25,-37+s*3.90),.075,.055,pole)
    signal(x,-37+s*4,s*PI/2,0)
    pillarCollider(x,z,.18,5.8)
  }
  // The foliage atlas contains four depth slices in each of two viewing directions.
  const foliage=new T.MeshStandardMaterial({map:maps[4],alphaTest:.32,side:T.DoubleSide,roughness:.95})
  function plantTree(model,x,z,height){
    const object=model.scene.clone(true),bounds=new T.Box3().setFromObject(object),size=bounds.getSize(V(0,0,0))
    const scale=height/size.y
    const center=bounds.getCenter(V(0,0,0))
    const pivot=new T.Group();pivot.add(object);object.position.sub(V(center.x,bounds.min.y,center.z))
    pivot.scale.setScalar(scale);pivot.position.set(x,.083,z)
    pivot.updateMatrixWorld(true)
    pivot.traverse(mesh=>{if(mesh.isMesh){const geo=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);batch(geo,mesh.material);geo.dispose()}})
  }
  const touring=createTouring(models[1],touringSetup.x,touringSetup.z,touringSetup.length)
  const personal=createTouring(models[1],garage.car.x,garage.car.z,touringSetup.length)
  personal.setup={...touringSetup,...garage.car,name:'내 Touring'}
  personal.heading=garage.car.heading
  personal.localOnly=true
  const vehicles={touring,'garage-touring':personal,'breakwater-650':createMotorcycle(models[6]),sport:createVehicleRig('sport',models[5]),van:createVehicleRig('van',models[4])}
  const parking=[
    ['riverside-quay','touring',2,'Riverside',4.93,-5,4.35,PI],
    ['sprint-north','sport',5,'Sprint',-4.85,-57,4.22,0],
    ['van-north','van',4,'Dock Van',4.86,-75,4.5,PI],
    ['riverside-south','touring',2,'Riverside',-4.83,46,4.3,0],
    ['fairheaven-south','touring',3,'Fairheaven',4.9,51,4.4,PI]
  ]
  for(const [id,base,model,name,x,z,length,heading] of parking){
    vehicles[id]=createVehicleRig(base,models[model],{name,x,z,length,heading})
  }
  for(const rig of Object.values(vehicles))group.add(rig.root)
  for(const [x,z,scale] of [[-8,15,1.2],[8,2,1.22],[-8,-10,1.1],[8,-27,1.28],[-8,-50,1.17],[8,-58,1.2],[-8,45,1.2],[8,36,1.1],[-8,-83,1.1]]){
    plantTree(models[0],x,z,4.3*scale)
    for(let ax=0;ax<2;ax++)for(let i=0;i<4;i++){
      const g=new T.PlaneGeometry(4.8*scale,4.8*scale),uv=g.attributes.uv
      for(let j=0;j<uv.count;j++)uv.setXY(j,(i+uv.getX(j))/4,(1-ax+uv.getY(j))/2)
      const depth=(i-1.5)*1.04*scale
      batch(g,foliage,V(x+(ax?depth:0),2.24*scale+.083,z+(ax?0:depth)),new T.Quaternion().setFromAxisAngle(up,ax*PI/2))
    }
    pillarCollider(x,z,.18,4)
  }
  for(const [mat,geometries] of batches){
    const merged=mergeGeometries(geometries)
    const mesh=new T.Mesh(merged,mat);mesh.castShadow=mat!==asphalt&&mat!==paving&&mat!==foliage;mesh.receiveShadow=true;group.add(mesh)
    for(const g of geometries)g.dispose()
  }
  scene.add(group)
  return vehicles
}
