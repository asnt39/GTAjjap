import * as T from 'three'
import {coastalRocks,dock,seaLevel,shoreNorth,shoreSouth,shoal,waveSource} from './coast-plan.js'

// A mipmapped repeating height derivative shared by both moving wave fields.
function waveNormals(){
 const size=64,bytes=new Uint8Array(size*size*4)
 const bands=[[1,2,.28],[3,-2,.19],[5,3,.14],[7,-4,.09],[6,7,.07]]
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  let dx=0,dz=0
  for(const [kx,kz,a] of bands){
   const k=Math.hypot(kx,kz),v=a*Math.cos(2*Math.PI*(kx*x+kz*z)/size+k)
   dx+=v*kx/k;dz+=v*kz/k
  }
  const at=4*(z*size+x)
  bytes[at]=Math.round(127.5*(1+dx))
  bytes[at+1]=Math.round(127.5*(1+dz))
  bytes[at+2]=bytes[at+3]=255
 }
 const map=new T.DataTexture(bytes,size,size)
 map.wrapS=map.wrapT=T.RepeatWrapping
 map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter
 map.generateMipmaps=true;map.needsUpdate=true
 return map
}

// Rasterize the irregular breakers once; no per-fragment collider loop.
function coastBreakers(){
 const width=160,height=192,bytes=new Uint8Array(width*height*4)
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const x=26+(i+.5)/width*160,z=92+(j+.5)/height*172
  let value=0
  for(const rock of coastalRocks){
   const dx=(x-rock.x)/rock.rx,dz=(z-rock.z)/rock.rz
   if(dx*dx+dz*dz>2.65)continue
   const edge=Math.abs(Math.hypot(dx,dz)-1)*Math.min(rock.rx,rock.rz)
   value=Math.max(value,1-T.MathUtils.smoothstep(edge,.34,2.05))
  }
  const nearPier=Math.abs(Math.abs(z-dock.z)-dock.half)
  if(x>=dock.west&&x<=dock.east)value=Math.max(value,.4*(1-T.MathUtils.smoothstep(nearPier,.2,1.25)))
  bytes[4*(j*width+i)]=Math.round(value*255)
  bytes[4*(j*width+i)+3]=255
 }
 const map=new T.DataTexture(bytes,width,height)
 map.magFilter=map.minFilter=T.LinearFilter;map.needsUpdate=true
 return map
}

export function coastalSurface(){
 const uniforms={...T.UniformsUtils.clone(T.UniformsLib.fog),time:{value:0},rippleQuality:{value:1},reflections:{value:2},
  waves:{value:waveNormals()},breakers:{value:coastBreakers()},skyMap:{value:null},
  sunDirection:{value:new T.Vector3(34,37,-40).normalize()},
  sunTint:{value:new T.Color(0xffc597)},skyIntensity:{value:.65},skyRotation:{value:2.1}}
 const material=new T.ShaderMaterial({
  fog:true,transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,uniforms,
  vertexShader:`
   uniform float time;
   varying vec3 world;
   varying vec3 waveField;
   ${waveSource}
   #include <fog_pars_vertex>
   void main(){
    world=(modelMatrix*vec4(position,1.)).xyz;
    waveField=vec3(swellSlope(world.xz,time),swell(world.xz,time));
    world.y+=waveField.z;
    vec4 mvPosition=viewMatrix*vec4(world,1.);
    gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
   }`,
  fragmentShader:`
   uniform float time,rippleQuality,reflections,skyIntensity,skyRotation;
   uniform sampler2D waves,breakers,skyMap;
   uniform vec3 sunDirection,sunTint;
   varying vec3 world;
   varying vec3 waveField;
   #include <fog_pars_fragment>
   void main(){
    vec2 p=world.xz;
    vec3 offset=cameraPosition-world;
    float distanceToEye=length(offset);
    float detail=1.-smoothstep(25.,105.,distanceToEye);
    float u=clamp((p.y-${shoreNorth}.)/${shoreSouth-shoreNorth}.,0.,1.);
    float shore=26.+sin(u*3.141593)*(53.+9.*sin(u*10.)+3.25*sin(u*23.));
    float island=(length((p-vec2(${shoal.x}.,${shoal.z}.))/vec2(${shoal.rx}.,${shoal.rz}.))-1.)*12.;
    float beach=min(p.x-shore,island);
    float depth=max(0.,beach*.145);
    float coast=smoothstep(100.,121.,p.y)*(1.-smoothstep(237.,255.,p.y));
    float wave=waveField.z;
    vec2 slope=waveField.xy;
    vec2 warp=vec2(sin(p.x*.12+p.y*.085-time*.38),sin(p.y*.13-p.x*.093+time*.47));
    vec2 normalA=(texture2D(waves,p*.22+warp*.28+vec2(.008,-.026)*time).rg*2.-1.);
    vec2 normalB=vec2(0.);
    if(rippleQuality>.6){
     mat2 rotation=mat2(.64,-.77,.77,.64);
     normalB=rotation*(texture2D(waves,rotation*p*.69+vec2(-.04,.023)*time).rg*2.-1.);
    }
    vec2 choppy=-slope*(.52+.42*sin(p.y*.17+p.x*.11+warp.x))+normalA*(.10+.32*detail)+normalB*.17*detail;
    vec3 n=normalize(vec3(choppy.x,1.,choppy.y));
    vec3 ray=offset/max(distanceToEye,.01);
    float above=gl_FrontFacing?1.:0.;
    n*=above*2.-1.;
    float ndv=max(dot(n,ray),0.);
    float fresnel=.021+.979*pow(1.-ndv,5.);
    float deep=1.-exp(-depth*.42);
    vec3 scatter=mix(vec3(.18,.32,.225),vec3(.028,.11,.145),mix(1.,deep,coast));
    float wet=1.-exp(-depth*.66);
    float clarity=mix(.985,max(.10,wet),coast);
    float pixels=max(fwidth(p.x),fwidth(p.y));
    float fade=1.-smoothstep(.24,1.2,pixels);
    float sandWave=sin(p.y*.26+p.x*.16-time*1.5)+.46*sin(p.y*.38-p.x*.08+time*.9);
    float wash=.65+wave*6.;
    float front=1.-smoothstep(.07,.38+pixels,abs(beach-wash-.18*sandWave));
    float back=1.-smoothstep(.1,.68+pixels,abs(beach-2.8-wave*8.));
    float breakups=smoothstep(-.45,.57,sandWave+normalA.x*.68);
    vec2 field=(p-vec2(26.,92.))/vec2(160.,172.);
    float valid=step(0.,field.x)*step(field.x,1.)*step(0.,field.y)*step(field.y,1.);
    float nearby=texture2D(breakers,field).r*valid;
    float white=clamp((coast*(front*.77+back*.16)+nearby*.46)*breakups*fade,0.,.92);
    // The vertical quay remains reflective, with a narrow band of breaking chop.
    float wall=(1.-smoothstep(.09,.55,abs(p.x-26.2-wave*2.)))*(1.-smoothstep(38.,44.,p.y))*smoothstep(-74.,-67.,p.y);
    white=max(white,wall*breakups*.32);
    vec3 color=above>.5?scatter:vec3(.115,.32,.32);
    if(reflections>.5){
     vec3 reflection=reflect(-ray,n);
     float horizon=clamp(reflection.y*.75+.20,0.,1.);
     vec3 sky=mix(vec3(.26,.40,.47),vec3(.17,.27,.44),horizon);
     if(reflections>1.5&&above>.5){
      vec2 env=vec2(fract(atan(reflection.z,reflection.x)*.159155+.5-skyRotation*.159155),
                     asin(clamp(reflection.y,-1.,1.))*.31831+.5);
      vec3 hdr=clamp(texture2D(skyMap,env).rgb*skyIntensity,vec3(.07),vec3(1.35));
      sky=mix(sky,hdr,.48);
     }
     float towardSun=max(0.,dot(reflection,sunDirection));
     sky+=sunTint*(.06*pow(towardSun,6.)+.66*pow(towardSun,52.));
     color=above>.5?mix(color,sky,.09+.80*fresnel):mix(color,sky*.65,.34+.41*fresnel);
    }
    float opacity=mix(clarity,.995,fresnel*.85);
    if(above<.5){
     opacity=.73+.23*fresnel;
     white*=.4;
    }
    gl_FragColor=vec4(mix(color,vec3(.59,.72,.64),white),max(opacity,white*.91));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
   }`
 })
 const mesh=new T.Mesh(new T.PlaneGeometry(392,694,51,81),material)
 mesh.rotation.x=-Math.PI/2;mesh.position.set(222.05,seaLevel,0)
 mesh.name='Harbor and coastal water'
 return mesh
}
