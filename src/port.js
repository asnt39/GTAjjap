import * as THREE from 'three';

const PI = Math.PI;
const assetRoot = `${import.meta.env.BASE_URL}assets/port/`;
const boxShape = new THREE.BoxGeometry(1, 1, 1);
const rodShape = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
const tankShape = new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
const up = new THREE.Vector3(0, 1, 0);

function placard(label, subtitle, bg, ink) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = bg;
  c.fillRect(0, 0, 768, 128);
  c.fillStyle = ink;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.moveTo(57 + i * 7, 29 + i * 23);
    c.lineTo(140 + i * 4, 29 + i * 23);
    c.lineTo(117 + i * 4, 41 + i * 23);
    c.lineTo(36 + i * 7, 41 + i * 23);
    c.fill();
  }
  c.font = 'bold 54px sans-serif';
  c.fillText(label, 168, 64);
  c.font = '21px monospace';
  c.fillText(subtitle, 172, 97);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map, roughness: 0.77, metalness: 0.15});
}

function containerShape(style) {
  const shape = new THREE.BoxGeometry(1, 1, 1);
  const uv = shape.attributes.uv;
  const top = 5 + 336 * style;
  for (let face = 0; face < 6; face++) {
    let xMin = 4, xMax = 1507;
    if (face === 2 || face === 3) [xMin, xMax] = [1847, 2038];
    if (face === 4 || face === 5) [xMin, xMax] = [1517, 1836];
    for (let v = face * 4; v < (face + 1) * 4; v++) {
      uv.setXY(v, (xMin + 1 + uv.getX(v) * (xMax - xMin - 2)) / 2048,
        1 - (top + 1 + (1 - uv.getY(v)) * 317) / 2048);
    }
  }
  return shape;
}

function waterSurface() {
  const material = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {time: {value: 0}}]),
    vertexShader: `
      varying vec3 world;
      #include <fog_pars_vertex>
      void main() {
        world = (modelMatrix * vec4(position, 1.)).xyz;
        vec4 mvPosition = viewMatrix * vec4(world, 1.);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float time;
      varying vec3 world;
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p) {
        vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
      }
      void main() {
        vec2 p=world.xz;
        float t=time*.45;
        float a=sin(p.y*2.5+p.x*.5+noise(p*.16)*4.+t*1.4);
        float b=sin(p.x*1.1-p.y*3.4+sin(p.x*.53-t)+t);
        float c=noise(vec2(p.x*1.2+t*.21,p.y*4.-t*.27));
        vec3 n=normalize(vec3(.084*a+.054*b,1.,.105*b+(c-.5)*.4));
        vec3 view=normalize(cameraPosition-world);
        vec3 reflected=reflect(-view,n);
        float fres=pow(1.-max(dot(n,view),0.),3.);
        float peach=pow(max(dot(normalize(vec3(-.42,.05,-.91)),reflected),0.),5.);
        vec3 sky=mix(vec3(.20,.35,.43),vec3(.78,.41,.25),peach);
        vec3 col=mix(vec3(.037,.113,.132),sky,.22+.57*fres);
        float ripple=smoothstep(.60,.88,c)*smoothstep(-.45,.8,b);
        col+=vec3(.12,.16,.16)*ripple*(.27+.73*fres);
        // Fragmented reflections beneath lamps on the opposite wharf.
        float lights=exp(-abs(sin((p.y+p.x*.13)*.19))*(8.+p.x*.032))*
                     smoothstep(.48,.77,c)*smoothstep(40.,79.,p.x);
        col+=vec3(.53,.28,.11)*lights;
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(340, 400), material);
  mesh.rotation.x = -PI / 2;
  mesh.position.set(196.05, -1.18, -57);
  return mesh;
}

export async function buildPort(scene, addCollider) {
  const group = new THREE.Group();
  group.name = 'Harborline container terminal';
  scene.add(group);
  const loader = new THREE.TextureLoader();
  const files = ['quay-diff.webp', 'quay-nor_gl.webp', 'paint-wear.webp', 'container-paint.webp', 'container-ribs.webp'];
  const [groundMap, groundNormal, wear, paint, ribs] = await Promise.all(files.map(name =>
    loader.loadAsync(assetRoot + name)));
  for (const t of [groundMap, groundNormal, wear, paint, ribs]) t.anisotropy = 4;
  for (const t of [groundMap, wear, paint]) t.colorSpace = THREE.SRGBColorSpace;
  for (const t of [groundMap, groundNormal, wear]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  for (const t of [groundMap, groundNormal]) t.repeat.set(4.1, 29.1);
  const plain = new THREE.MeshStandardMaterial({roughness: .83, metalness: .20});
  const steel = new THREE.MeshStandardMaterial({roughness: .68, metalness: .26, map: wear});
  const luminous = new THREE.MeshBasicMaterial({toneMapped: false});
  const cargoSkin = new THREE.MeshStandardMaterial({map: paint, normalMap: ribs, normalScale: new THREE.Vector2(.55,.55), roughness: .83, metalness: .17});
  const cargoShapes = Array.from({length:6}, (_, i) => containerShape(i));
  const batches = new Map();
  const transform = new THREE.Object3D();
  function batch(geometry, material, position, scale, color, quaternion) {
    const key = geometry.uuid + material.uuid;
    if (!batches.has(key)) batches.set(key, {geometry, material, instances: []});
    transform.position.set(...position);
    transform.scale.set(...scale);
    if (quaternion?.isQuaternion) transform.quaternion.copy(quaternion);
    else transform.rotation.set(...(quaternion ?? [0,0,0]));
    transform.updateMatrix();
    batches.get(key).instances.push([transform.matrix.clone(), color]);
  }
  function box(x,y,z,w,h,d,color,material = plain,rotation) {
    batch(boxShape, material, [x,y,z], [w,h,d], color, rotation);
  }
  function tube(x,y,z,w,h,d,color,material = plain,rotation) {
    batch(tankShape, material, [x,y,z], [w,h,d], color, rotation);
  }
  function beam(a,b,w,d,color,material = steel,shape = boxShape) {
    const delta = new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    const length = delta.length();
    if (!length) return;
    const center = a.map((v,i)=>(v+b[i])/2);
    batch(shape,material,center,[w,length,d],color,new THREE.Quaternion().setFromUnitVectors(up,delta.normalize()));
  }
  const line = (a,b,width,color) => beam(a,b,width,width,color,plain,rodShape);
  const safety = '#d9a544', iron = '#3a4b4b', dark = '#303b3e', oxide = '#bc513b', orange = '#ea7953';
  const quay = new THREE.Mesh(new THREE.PlaneGeometry(16.06,114),new THREE.MeshStandardMaterial({
    map:groundMap, normalMap:groundNormal, normalScale:new THREE.Vector2(.56,.56),color:0xb5b3a8,roughness:.92
  }));
  quay.rotation.x = -PI/2;
  quay.position.set(18.01,.001,-14);
  quay.receiveShadow = true;
  group.add(quay);
  box(25.83,-1.03,-14,.44,2.11,114,'#8d9385');
  for (let z=-68;z<=41;z+=4.15) {
    box(24.60,.023,z,.13,.032,2.15,'#d4b770');
    box(25.82,.075,z,.50,.14,3.96,'#b1b2a1');
    box(17.46,.016,z,.10,.041,4.15,'#49514b');
    box(23.82,.016,z,.10,.041,4.15,'#49514b');
    if (Math.round((z+68)/4.15)%2 === 0) {
      box(26.16,-.72,z,.45,1.55,.72,'#283338',plain,[.12,0,.05]);
      box(25.20,.12,z,.86,.22,.82,'#454944');
      tube(25.20,.39,z,.37,.53,.37,safety);
      tube(25.20,.65,z,.55,.12,.55,safety);
    }
  }
  for (let z=-65;z<43;z+=8) {
    box(12,.013,z,.055,.018,7.86,'#9e9b8a');
    box(18,.013,z,15.93,.018,.025,'#96978a');
  }
  function container(x, base, z, length, style, across = false, solid = false) {
    const h = 2.57, w = 2.44;
    const color = ['#9d422e','#347370','#b78940','#384e70','#b66c46','#a6a897'][style];
    batch(cargoShapes[style],cargoSkin,[x,base+h/2,z],[w,h,length],'#ffffff',[0,across?PI/2:0,0]);
    const extentX = across ? length/2 : w/2, extentZ = across ? w/2 : length/2;
    for (const sx of [-1,1]) for (const sz of [-1,1]) {
      for(const y of [base+.10,base+h-.10])
        box(x+sx*(extentX-.10),y,z+sz*(extentZ-.10),.23,.20,.23,color,steel);
    }
    if (solid) addCollider?.(x-extentX,x+extentX,z-extentZ,z+extentZ,base+h);
  }
  // Keep the apron by the avenue open through the entire terminal.
  const freight = [
    [18.9,12.2,6.1,[1]], [21.65,12.2,6.1,[0]],
    [20.6,1.7,12.05,[0,4]], [23.23,1.7,12.05,[3]],
    [18.75,-11.4,12.05,[1,2]], [21.42,-11.4,12.05,[4]],
    [18.9,-30.0,12.05,[0,3]], [21.53,-30,12.05,[2,1,4]],
    [18.9,-43.0,12.05,[5,4]], [21.54,-43,12.05,[1,3,2]],
    [19.65,-57.0,12.05,[2,0]], [22.38,-57,12.05,[3,1,5]]
  ];
  for (const [x,z,l,stack] of freight) stack.forEach((s,i)=>container(x,.08+i*2.60,z,l,s,false,i===0));
  function guardRail(a,b,y,c) {
    const dist=Math.hypot(b[0]-a[0],b[1]-a[1]), n=Math.ceil(dist/2.1);
    for (let i=0;i<=n;i++) {
      const f=i/n,x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;
      line([x,y,z],[x,y+.79,z],.052,c);
    }
    for(const h of [.40,.78])line([a[0],y+h,a[1]],[b[0],y+h,b[1]],.056,c);
  }
  function crane(x,z,s,index,collide = false) {
    const p=(u,v,w)=>[x+u*s,v*s,z+w*s];
    const b=(u,v,w,ww,h,dd,c,m=steel,rot)=>box(...p(u,v,w),ww*s,h*s,dd*s,c,m,rot);
    const girder=(a,c,w,d,col=oxide)=>beam(p(...a),p(...c),w*s,d*s,col);
    const wire=(a,c,w=.05,col=dark)=>line(p(...a),p(...c),w*s,col);
    // Splayed legs on twin wheel bogies. The crossheads carry a lattice bridge and tip stays.
    for (const u of [0,7.8]) {
      for (const sign of [-1,1]) {
        const w=sign*3.8;
        b(u,.67,w,1.24,.76,2.50,oxide);
        for(const k of [-.80,.80])b(u,.32,w+k,.95,.60,.65,dark);
        girder([u,1.0,w],[u+(u===0?.32:-.32),11.3,w*.58],.64,.72,orange);
        b(u,1.47,w,1.02,.25,1.08,'#d4b073');
        if (collide) {
          const pos=p(u,0,w);
          addCollider?.(pos[0]-.64*s,pos[0]+.64*s,pos[2]-1.20*s,pos[2]+1.20*s,1.75*s);
        }
      }
      girder([u,4.8,-3.12],[u,4.8,3.12],.34,.30);
      girder([u,4.9,-3.1],[u,11.2,2.2],.19,.22);
      girder([u,4.9,3.1],[u,11.2,-2.2],.19,.22);
    }
    for(const w of [-2.18,2.18]) {
      b(4,11.4,w,10.3,1.1,.73,orange);
      girder([0,6.1,w*1.40],[7.8,11.0,w],.33,.37);
      girder([7.8,6.1,w*1.40],[0,11.0,w],.33,.37);
      // A-frame tower and back stays.
      girder([1.15,12.08,w],[6.4,23.7,w*.73],.39,.43,orange);
      girder([9.75,12.08,w],[6.4,23.7,w*.73],.36,.39,orange);
      girder([3.8,17.95,w*.86],[7.95,17.95,w*.86],.25,.25);
      for (const u of [15.8,23.9])wire([6.42,23.53,w*.73],[u,13.3,w*.62],.082);
      wire([6.4,23.54,w*.73],[-4.0,13.3,w*.62],.094);
    }
    for (const u of [0,7.8])b(u,11.43,0,.68,1.08,5.05,orange);
    b(6.4,23.7,0,.75,.50,3.80,orange);
    b(6.4,24.06,0,.54,.24,.54,'#f35b3c',luminous);
    const min=-4.3,max=25.4,n=13,step=(max-min)/n;
    for(const w of [-1.38,1.38]) {
      for (const v of [12.0,13.39])b((min+max)/2,v,w,max-min,.24,.22,orange);
      for(let k=0;k<n;k++) {
        const u=min+k*step;
        girder([u,12.07,w],[u+step,13.32,w],.14,.14,orange);
        girder([u,13.32,w],[u+step,12.07,w],.14,.14,oxide);
        if(k%2===0)girder([u,12.0,w],[u,13.36,w],.17,.17,orange);
      }
    }
    for(let u=min;u<max+.1;u+=step)b(u,12.0,0,.14,.18,3.0,oxide);
    b(-2,13.5,0,4.2,2.40,2.93,'#c76446');
    b(-2,14.86,0,4.45,.23,3.13,'#e89a6a');
    for(const u of [-3.33,-2.8,-2.27,-1.74,-1.21])b(u,13.61,1.49,.31,.66,.05,'#4b5858');
    const plaque = placard('HARBORLINE', 'TERMINAL  /  CRANE  '+String(index).padStart(2,'0'), '#a34b38','#fff0c9');
    b(3.38,11.45,2.57,4.93,.85,.08,'#ffffff',plaque);
    b(-2.0,13.48,-1.49,3.8,.67,.06,'#ffffff',plaque);
    const hoist=15.35;
    b(hoist,12.08,0,2.62,.68,2.95,iron);
    b(hoist-1.05,11.00,1.31,1.24,1.52,1.18,'#e4b379');
    b(hoist-1.08,11.11,1.92,.98,.86,.04,'#64949d');
    b(hoist-1.69,11.10,1.27,.04,.86,.93,'#486a72');
    const level=index===1?4.82:6.28;
    for(const u of [hoist-.81,hoist+.81]) for(const w of [-.93,.93])wire([u,11.8,w],[u,level+.38,w*2.72],.041);
    b(hoist,level+.18,0,2.16,.38,6.16,safety);
    if(index===1 || index===2)container(x+hoist*s,(level-2.57)*s,z,5.98*s,index===1?2:0);
    // A caged ladder on the service side, and a maintenance walkway.
    for(const w of [2.64,3.17])wire([.04,1.3,w],[.04,12.22,w],.054,safety);
    for(let v=1.5;v<=12.3;v+=.39)wire([.04,v,2.62],[.04,v,3.18],.055,safety);
    for(let v=3.0;v<11.9;v+=.85){
      wire([.04,v,2.60],[-.46,v,2.60],.048,safety);
      wire([-.46,v,2.60],[-.46,v,3.21],.048,safety);
      wire([-.46,v,3.21],[.04,v,3.21],.048,safety);
    }
    b(3,12.03,2.65,12.6,.15,1.01,'#6a6660');
    guardRail([x-3.15*s,z+3.11*s],[x+9.25*s,z+3.11*s],12.12*s,safety);
    b(8.3,11.54,2.96,.36,.19,.37,'#ffde9d',luminous);
    b(-2.91,12.03,2.96,.30,.16,.31,'#ffde9d',luminous);
  }
  crane(17.47,-20.4,1,1,true);
  crane(17.48,-50.15,.96,2,true);
  const water = waterSurface();
  group.add(water);
  // A shallow-draft feeder alongside, with a raked stem and inset stern.
  function vessel(x,z) {
    const bands=[
      [-2.4,3.64,-23.5,20.6],
      [-.89,4.83,-24.0,24.4],
      [-.58,4.99,-24.3,25.2],
      [1.60,5.12,-24.6,26.2],
      [2.03,5.08,-24.7,26.35]
    ];
    function rim([y,width,stern,bow]) {
      return [
        [-width*.72,y,stern],[-width,y,stern+2.2],[-width,y,bow-11.0],
        [-width*.86,y+.08,bow-5.2],[-width*.46,y+.22,bow-1.8],[0,y+.37,bow],
        [width*.46,y+.22,bow-1.8],[width*.86,y+.08,bow-5.2],[width,y,bow-11.0],
        [width,y,stern+2.2],[width*.72,y,stern]
      ];
    }
    const points=[],colors=[],rimColors=['#85493c','#a35b47','#35515c','#c3bda8'];
    function tri(a,b,c,tint){
      const col=new THREE.Color(tint);
      for(const v of [a,b,c]){points.push(...v);colors.push(col.r,col.g,col.b);}
    }
    for(let j=1;j<bands.length;j++){
      const lo=rim(bands[j-1]),hi=rim(bands[j]);
      for(let i=0;i<lo.length;i++){
        const n=(i+1)%lo.length;
        tri(lo[i],lo[n],hi[n],rimColors[j-1]);tri(lo[i],hi[n],hi[i],rimColors[j-1]);
      }
    }
    const deck=rim(bands[bands.length-1]);
    for(let i=0;i<deck.length;i++)tri(deck[(i+1)%deck.length],[0,2.05,0],deck[i],'#706c5c');
    const shape=new THREE.BufferGeometry();
    shape.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    shape.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    shape.computeVertexNormals();
    const hull=new THREE.Mesh(shape,new THREE.MeshStandardMaterial({side:THREE.DoubleSide,vertexColors:true,roughness:.82,metalness:.28}));
    hull.position.set(x,0,z);hull.castShadow=hull.receiveShadow=true;group.add(hull);
    // An aft accommodation block with continuous bridge glazing and external decks.
    box(x,4.74,z-18.7,6.82,5.60,7.18,'#c6c8b6',steel);
    for(let h=3.05;h<=6.8;h+=1.40) {
      box(x,h,z-18.68,7.24,.15,7.63,'#d5d1b6');
      for(const s of [-1,1])for(let i=0;i<4;i++) {
        box(x+s*3.43,h+.62,z-21.25+i*1.69,.12,.55,.68,((i+h|0)%3===0)?'#e2b87e':'#435f66');
      }
    }
    box(x,7.68,z-18.0,8.2,1.85,5.22,'#d4d6c7',steel);
    box(x,8.85,z-17.98,8.52,.31,5.52,'#c8c9b7');
    box(x,7.94,z-15.37,7.98,.73,.08,'#304c57');
    for(let i=-3;i<=3;i++)box(x+i,7.94,z-15.29,.09,.77,.11,'#bcc7b7');
    for(const s of [-1,1]){
      box(x+s*4.12,7.94,z-17.98,.08,.74,4.94,'#3c555b');
      box(x+s*4.34,7.22,z-17.92,.97,.22,4.59,'#babdaa');
      guardRail([x+s*4.8,z-20.1],[x+s*4.8,z-15.7],7.30,'#b8c2ad');
      guardRail([x+s*4.67,z-14.92],[x+s*4.67,z+15.2],2.08,'#9caa9b');
    }
    tube(x+1.32,9.52,z-20.03,1.44,1.97,1.81,oxide,steel);
    tube(x+1.32,10.52,z-20.03,1.50,.44,1.85,iron,steel);
    line([x,8.95,z-16.8],[x,13.73,z-16.8],.16,'#adb5a8');
    line([x-1.78,11.96,z-16.8],[x+1.78,11.96,z-16.8],.13,'#9ba599');
    box(x,13.75,z-16.8,.16,.17,.16,'#ffbc83',luminous);
    for(let i=0;i<4;i++)for(let j=0;j<3;j++) {
      const cx=x+(j-1)*2.64, cz=z-10.7+i*6.63;
      container(cx,2.10,cz,6.2,(j+i*2+2)%6);
      if(i<3 && (i+j)%4!==1)container(cx,4.70,cz,6.2,(i+j*4)%6);
    }
    for(let i=0;i<4;i++) {
      const zz=z+17.32+i*.51;
      box(x-4.50,1.53-i*.15,zz,.15,.048,.24,'#d3cdb8');
    }
    const hullName=placard('SUNDHAVN','HL  /  PORT OF REGISTRY','#364f59','#e2d8b9');
    box(x-5.11,.75,z+10.4,.07,.74,4.75,'#ffffff',hullName);
    for(const k of [-15.2,15.2]){
      const a=[x-4.6,2.09,z+k],b=[25.16,.63,z+k+Math.sign(k)*6.85];
      const m=[(a[0]+b[0])/2,.80,(a[2]+b[2])/2];
      line(a,m,.083,'#82755a');line(m,b,.083,'#82755a');
    }
  }
  vessel(39.6,-42.0);
  // Low-level operational details give pedestrians a readable sense of scale.
  const ringShape = new THREE.TorusGeometry(.40,.094,8,28);
  function lifeStation(x,z) {
    box(x,.89,z,.11,1.78,.12,'#afb4a5');
    box(x,1.52,z,.18,1.12,.99,'#b5ac93');
    batch(ringShape,plain,[x-.13,1.50,z],[1,1,1],'#e77747',[0,-PI/2,0]);
    for(let i=0;i<4;i++){
      const angle=i*PI/2+PI/4;
      box(x-.13,1.50+Math.cos(angle)*.40,z+Math.sin(angle)*.40,.195,.19,.14,'#dbd3b8',plain,[-angle,0,0]);
    }
  }
  lifeStation(25.21,-11);
  lifeStation(25.21,25.1);
  const quaySign=placard('QUAY 04','MARINE OPERATIONS','#315651','#efe6cb');
  box(16.18,1.61,7.53,.10,.73,2.40,'#ffffff',quaySign);
  for(const z of [6.67,8.39])box(16.18,.68,z,.10,1.37,.12,iron);
  // Opposite shore. These low, broad masses keep the gantries legible on the skyline.
  box(94,-.87,-43,43,2.48,189,'#606d69');
  for(let i=0;i<13;i++){
    const z=-127+i*13;
    box(72.64,-.14,z,.73,1.18,12.84,'#8b8e80');
    box(72.31,-.60,z,.38,1.36,.81,dark);
    if(i%2===0){
      box(74.0,3.52,z,.16,6.52,.16,iron);
      box(73.76,6.72,z,.81,.18,.55,'#ffdfac',luminous);
    }
  }
  function warehouse(x,z,l,h,c){
    box(x,h/2+.37,z,11.6,h,l,c,steel);
    for(const side of [-1,1]){
      box(x+side*2.92,h+1.10,z,6.15,.24,l+.46,'#6e7875',steel,[0,0,-side*.19]);
    }
    for(let q=-l/2+1.4;q<l/2;q+=2.75){
      box(x-5.82,h*.68+.35,z+q,.105,.86,1.58,'#899b97');
      box(x-5.89,h*.68+.35,z+q,.11,.88,.08,iron);
    }
    box(x-5.87,1.38,z,.12,2.18,3.11,'#536563');
  }
  warehouse(87,-1,28,5.7,'#88908a');
  warehouse(87,-33,26,5.1,'#9c9d89');
  warehouse(90,-89,35,6.8,'#75827f');
  for(let i=0;i<5;i++){
    const x=101+i%2*6.8,z=-15-i*9;
    tube(x,4.21,z,6.35,7.63,6.35,'#acada0',steel);
    for(const y of [1.2,3.6,5.9,7.82])tube(x,y,z,6.42,.115,6.42,'#788480');
    tube(x,8.08,z,6.48,.25,6.48,'#a0a496');
    tube(x,8.31,z,.48,.53,.48,iron);
  }
  for(const [x,z,h] of [[98,-70,22],[100.4,-74.2,18.3]]){
    tube(x,h/2+.4,z,1.15,h,1.15,'#aa9e89',steel);
    for(let k=0;k<3;k++)tube(x,h-1.02-k*2.1,z,1.18,.99,1.18,'#a46653');
    tube(x,h+.48,z,1.27,.22,1.27,iron);
  }
  crane(77,-77,1.07,3);
  for(let i=0;i<8;i++){
    const z=-123+i*12.6;
    for(let j=0;j<2;j++){
      container(77.7+j*2.65,.43,z,11.8,(i*3+j+2)%6);
      if((i+j)%3)container(77.7+j*2.65,3.03,z,11.8,(i*2+j+1)%6);
    }
  }
  for(const {geometry,material,instances} of batches.values()){
    const mesh=new THREE.InstancedMesh(geometry,material,instances.length);
    instances.forEach(([matrix,tint],i)=>{
      mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new THREE.Color(tint));
    });
    mesh.castShadow=material!==luminous;
    mesh.receiveShadow=material!==luminous;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return (_dt,elapsed)=>{water.material.uniforms.time.value=elapsed;};
}
