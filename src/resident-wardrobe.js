import {BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshStandardMaterial} from 'three'

// Garments use the original Rocketbox fabric colour/normal maps. The body atlas
// packs jeans in its top corners and has separate lower islands for hands/shoes.
const residents = [
  { jacket:0xc16a35, shirt:0x445754, denim:0x3c454c, scale:[1.06,1.035,1.08], hat:'hardhat' },
  { jacket:0x77515e, shirt:0xc9bfa7, denim:0x61634b, scale:[.96,.955,1.01] },
  { jacket:0x297274, shirt:0xbac5bd, denim:0x887553, scale:[.92,1.012,.95], hat:'cap' },
  { jacket:0x62768b, shirt:0xb58f56, denim:0x393e43, scale:[1.13,.986,1.08], hat:'knit' },
  { jacket:0xb1a17e, shirt:0x854f51, denim:0x697a87, scale:[.93,.975,.98] }
]
const dyedMaterials = new WeakMap()
const hatGeometries = new Map()
const hatMaterial = new MeshStandardMaterial({vertexColors:true,roughness:.77,metalness:.035})

function dye(original,index) {
  let cache=dyedMaterials.get(original)
  if (!cache) { cache=new Map();dyedMaterials.set(original,cache) }
  if (cache.has(index)) return cache.get(index)
  const look=residents[index]
  const material=original.clone()
  material.onBeforeCompile=shader=>{
    shader.uniforms.jacketTint={value:new Color(look.jacket)}
    shader.uniforms.shirtTint={value:new Color(look.shirt)}
    shader.uniforms.denimTint={value:new Color(look.denim)}
    shader.uniforms.garmentCut={value:index}
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 garmentPosition;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n garmentPosition = position;')
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        varying vec3 garmentPosition;
        uniform vec3 jacketTint;
        uniform vec3 shirtTint;
        uniform vec3 denimTint;
        uniform float garmentCut;`)
      .replace('#include <map_fragment>',`#include <map_fragment>
        vec2 uvCloth=vMapUv;
        vec3 cloth=diffuseColor.rgb;
        float lightness=dot(cloth,vec3(.2126,.7152,.0722));
        float garmentDepth=clamp(lightness/.050,.035,3.0);
        bool corner=uvCloth.x<.298||uvCloth.x>.705;
        bool jeans=corner&&uvCloth.y>.027&&uvCloth.y<.433;
        bool jacketArea=uvCloth.y<.837&&!(corner&&uvCloth.y<.433);
        // Belt, leather shoes, exposed hands and the separate face material pass through.
        if(jeans){
          diffuseColor.rgb=denimTint*clamp(lightness/.046,.035,3.2);
        } else if(jacketArea && (abs(garmentPosition.x)<.57 || uvCloth.y<.82)){
          float shirt=smoothstep(.018,.055,cloth.r-cloth.b);
          vec3 outer=jacketTint*garmentDepth;
          vec3 inner=shirtTint*clamp(lightness/.075,.035,3.0);
          if(garmentCut<.5){
            // Two stitched reflective bands, in bind coordinates so they bend with the jacket.
            float d=min(abs(garmentPosition.y-1.155),abs(garmentPosition.y-1.286));
            float band=1.-smoothstep(.012,.020,d);
            outer=mix(outer,vec3(.47,.51,.45)*garmentDepth,band*.88);
          } else if(garmentCut<1.5){
            float stripe=smoothstep(.70,.98,cos(garmentPosition.x*340.));
            inner*=1.-.20*stripe;
          } else if(garmentCut<2.5){
            outer*=mix(1.,.53,smoothstep(1.418,1.428,garmentPosition.y));
          } else if(garmentCut<3.5){
            vec2 weave=cos(garmentPosition.xy*210.);
            inner*=1.-.17*smoothstep(.15,.65,max(weave.x,weave.y));
          }
          diffuseColor.rgb=mix(outer,inner,shirt);
        }`)
  }
  // All five variants share one shader; only uniform values change.
  material.customProgramCacheKey=()=>'harbor-resident-fabric-1'
  cache.set(index,material)
  return material
}

// Closed elliptical profiles form the crown, cuff, and brim. Their fit is measured
// against this avatar's bind-pose scalp. Each hat uses one material and one mesh.
function makeHatGeometry(kind) {
  if (hatGeometries.has(kind)) return hatGeometries.get(kind)
  const shell=kind==='hardhat'?0xe0bb7a:kind==='knit'?0x77544d:0x3c494b
  const binding=kind==='hardhat'?0x9f8457:kind==='knit'?0x634540:0x323d3e
  // Ring entries give height above the ground, lateral/fore-aft radii, visor
  // extension in front, and colour. The brim web is integrated into the crown.
  const profile=kind==='hardhat'?[
    [1.711,.093,.109,0,binding],[1.716,.107,.128,.029,binding],
    [1.720,.112,.129,.032,shell],[1.726,.097,.115,.012,shell],
    [1.742,.094,.113,0,shell],[1.764,.091,.108,0,shell],
    [1.796,.080,.095,0,shell],[1.821,.060,.074,0,shell],
    [1.836,.026,.034,0,shell],[1.838,0,0,0,shell]
  ]:kind==='cap'?[
    [1.713,.086,.106,0,binding],[1.718,.087,.106,.070,binding],
    [1.723,.088,.107,.071,shell],[1.728,.087,.106,.004,shell],
    [1.741,.087,.107,0,shell],[1.770,.083,.099,0,shell],
    [1.797,.068,.088,0,shell],[1.820,.047,.059,0,shell],
    [1.829,.012,.015,0,binding],[1.830,0,0,0,binding]
  ]:[
    [1.703,.084,.104,0,binding],[1.708,.089,.109,0,binding],
    [1.734,.091,.112,0,binding],[1.739,.088,.110,0,shell],
    [1.758,.086,.110,0,shell],[1.786,.080,.101,0,shell],
    [1.811,.060,.084,0,shell],[1.834,.044,.056,0,shell],
    [1.848,.023,.031,0,shell],[1.854,0,0,0,binding]
  ]
  const positions=[],colors=[],indices=[],segments=48
  const tone=new Color()
  for (let r=0;r<profile.length;r++){
    const [h,rx,rz,visor,color]=profile[r]
    for(let i=0;i<segments;i++){
      const a=i*Math.PI*2/segments,front=Math.cos(a),lateral=Math.sin(a)
      const bill=Math.max(0,front)**2
      const rib=kind==='knit'?1+.007*Math.cos(16*a):1
      const ridge=kind==='hardhat'&&r>3&&r<9?.007*Math.exp(-((lateral/.18)**2)):0
      positions.push(rx*lateral*rib,h-.012*bill*visor/.07+ridge,.019+rz*front*rib+visor*bill)
      tone.setHex(color)
      if(kind==='knit')tone.multiplyScalar(1+.06*Math.cos(16*a))
      colors.push(tone.r,tone.g,tone.b)
      if(r+1<profile.length){
        const k=r*segments+i,n=r*segments+(i+1)%segments
        indices.push(k,n,n+segments,k,n+segments,k+segments)
      }
    }
  }
  const geometry=new BufferGeometry()
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3))
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3))
  geometry.setIndex(indices);geometry.computeVertexNormals()
  hatGeometries.set(kind,geometry)
  return geometry
}

let silverHair
export function applyWardrobe(root,index) {
  const look=residents[index]
  if (!look) return root
  root.traverse(part=>{
    if (!part.isSkinnedMesh) return
    if (part.material.name==='Canvas jacket, shirt and denim') {
      part.material=dye(part.material,index)
    } else if (part.material.name==='Hair') {
      if(look.hat)part.visible=false
      else if(index===4){
        if(!silverHair){
          silverHair=part.material.clone()
          silverHair.onBeforeCompile=shader=>{
            shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
              float hairLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
              diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.34,.35,.33)*sqrt(hairLuma)+.077,.85);`)
          }
          silverHair.customProgramCacheKey=()=>'harbor-resident-silver-1'
        }
        part.material=silverHair
      }
    }
  })
  const head=root.getObjectByName('Bip01_Head')
  if(look.hat&&head){
    const cap=new Mesh(makeHatGeometry(look.hat),hatMaterial)
    cap.name=look.hat;cap.castShadow=true;cap.receiveShadow=true
    root.add(cap)
    root.updateMatrixWorld(true)
    head.attach(cap)
  }
  root.scale.multiply({x:look.scale[0],y:look.scale[1],z:look.scale[2]})
  return root
}
