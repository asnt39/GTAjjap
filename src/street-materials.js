import * as T from 'three'
import {pierStreetEast} from './street-plan.js'

const pierEnd=pierStreetEast[1].toFixed(2)

export const asphaltScale=4.04,pavingScale=2.65
export function pavingSurface(colorMap,normalMap){
 return new T.MeshStandardMaterial({color:0xb0aba2,map:colorMap,normalMap,
  normalScale:new T.Vector2(.45,.45),roughness:.68,metalness:.045})
}

export function roadSurface(diffuse, normal) {
  const material = new T.MeshStandardMaterial({
    map: diffuse, normalMap: normal, normalScale: new T.Vector2(.32, .32),
    color: 0x85898f, roughness: .43, metalness: .14, envMapIntensity: .7
  })
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 streetPoint;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nstreetPoint = (modelMatrix * vec4(transformed,1.)).xyz;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 streetPoint;
      float roadHash(vec2 cell){
        vec3 p=fract(cell.xyx*vec3(.1031,.1030,.0973));
        p+=dot(p,p.yzx+33.33);
        return fract((p.x+p.y)*p.z);
      }
      float roadNoise(vec2 p){
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        // Hash each grid coordinate directly so adjacent cells share corners.
        float low=mix(roadHash(i),roadHash(i+vec2(1.,0.)),f.x);
        float high=mix(roadHash(i+vec2(0.,1.)),roadHash(i+vec2(1.)),f.x);
        return mix(low,high,f.y);
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
      // The same continuous finish follows world position across every road tile.
      float patches=.23+.55*roadNoise(p*vec2(.48,.20));
      patches=.81*patches+.19*roadNoise(p*vec2(1.28,.48)+3.);
      float sheen=smoothstep(.38,.64,patches);
      float grain=clamp(diffuseColor.r*3.6,0.,1.);
      diffuseColor.rgb*=mix(1.02,.68,sheen);

      // Only these streets have Breakwater's double lines and marked bays.
      float lane=abs(p.x);
      float quay=(1.-step(.04,streetPoint.y))*step(-107.,p.y)*(1.-step(63.,p.y));
      float dockJunction=quay*step(-40.,p.x)*step(p.x,${pierEnd});
      float wear=clamp(.57+2.*grain+.20*roadNoise(p*19.),.30,1.);
      float onAvenue=(1.-smoothstep(5.99,6.,lane))*quay;
      float crossingArea=abs(p.y+37.);
      float paired=finiteStripe(lane-.115,.045)*smoothstep(9.2,9.45,crossingArea)*onAvenue;
      vec2 sideSpace=vec2(lane-4.06,mod(p.y+3.,6.4)-3.2);
      float bay=finiteStripe(sideSpace.x,.033)*step(abs(sideSpace.y),2.9)+finiteStripe(abs(sideSpace.y)-2.92,.034)*step(0.,sideSpace.x)*step(sideSpace.x,.49);
      bay*=smoothstep(12.,12.2,crossingArea)*onAvenue;
      float crosswalkA=(1.-smoothstep(.78,.80,abs(crossingArea-7.20)))*finiteStripe(mod(p.x+.4,1.)-.5,.28)*step(lane,5.75);
      float crosswalkB=(1.-smoothstep(.70,.72,abs(lane-7.20)))*finiteStripe(mod(p.y+.36,1.)-.5,.28)*step(crossingArea,5.72);
      float stopLine=finiteStripe(crossingArea-9.36,.13)*step(.26,lane)*step(lane,5.68)*step(0.,-p.x*(p.y+37.));
      float sideLine=finiteStripe(crossingArea-.11,.038)*smoothstep(9.2,9.8,lane)*(1.-smoothstep(${pierEnd}-.8,${pierEnd}-.15,p.x));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.31,.188,.044),clamp((paired+sideLine*dockJunction)*wear,0.,1.));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.44,.425,.355),clamp((bay*.58+(max(crosswalkA,crosswalkB)*.85+stopLine*.9)*dockJunction)*wear,0.,1.));`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor=mix(.60,.25,sheen)*(.86+.26*grain);`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float avenueGlow=onAvenue*smoothstep(-107.,-103.,p.y)*(1.-smoothstep(55.,63.,p.y));
      if(avenueGlow>0.){
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
      float ripple=(.48+.52*sheen)*(.70+.3*roadNoise(p*vec2(3.,15.)));
      outgoingLight+=avenueGlow*ripple*(vec3(.85,.39,.106)*lens*.86+vec3(.34,.16,.047)*shop*.66)*(.38+.62*grazing);
      }
      #include <opaque_fragment>`)
  }
  return material
}
