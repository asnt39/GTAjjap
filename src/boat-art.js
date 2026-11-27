import * as T from 'three'
import {seaLevel,swellAt} from './coast-plan.js'

const clamp=T.MathUtils.clamp
const ease=T.MathUtils.damp
const rect=new T.BoxGeometry()
function hull(length,width){
 const profile=[[-.50,.10,-.18],[-.36,.67,-.34],[-.17,.97,-.36],[.20,1,-.35],[.45,.89,-.25],[.5,.73,-.19]]
 const vertices=[],triangles=[]
 for(const [z,w,keel] of profile){
  const beam=w*width*.5
  vertices.push(-beam,.33,z*length,-beam*.78,-.06,z*length,0,keel,z*length,beam*.78,-.06,z*length,beam,.33,z*length)
 }
 for(let j=1;j<profile.length;j++){
  for(let i=0;i<4;i++){const a=j*5+i,b=a-5;triangles.push(a,b,b+1,a,b+1,a+1)}
  const a=j*5,b=a-5;triangles.push(a,a+4,b+4,a,b+4,b)
 }
 triangles.push(0,1,2,0,2,3,0,3,4)
 const end=(profile.length-1)*5
 triangles.push(end,end+2,end+1,end,end+3,end+2,end,end+4,end+3)
 const g=new T.BufferGeometry()
 g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(triangles);g.computeVertexNormals()
 return g
}

function trail(scene){
 const limit=24,points=[],position=new Float32Array(limit*2*6*3),alpha=new Float32Array(limit*2*6)
 const geometry=new T.BufferGeometry()
 geometry.setAttribute('position',new T.BufferAttribute(position,3).setUsage(T.DynamicDrawUsage))
 geometry.setAttribute('foam',new T.BufferAttribute(alpha,1).setUsage(T.DynamicDrawUsage))
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,
  vertexShader:`attribute float foam; varying float opacity; void main(){opacity=foam;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying float opacity;void main(){gl_FragColor=vec4(.69,.87,.82,opacity);}`})
 const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=4
 scene.add(mesh)
 let previous=-1
 function update(x,z,heading,speed,t,min=1.05){
  if(speed>min&&t>previous+.12){
   previous=t
   points.push({x,z,t,speed,heading})
  }
  while(points.length&&(points.length>limit||t-points[0].t>3.2))points.shift()
  let offset=0
  const index=(a,b,side)=>{
   const edge=(node,inner)=>{
    const age=t-node.t,width=.26+(1-Math.exp(-age*.87))*(.8+.13*node.speed)
    const v=side*(width+(inner?-.37:.12)),px=node.x+Math.cos(node.heading)*v,pz=node.z+Math.sin(node.heading)*v
    position[offset*3]=px;position[offset*3+1]=swellAt(px,pz,t)+.035;position[offset*3+2]=pz
    alpha[offset++]=inner?Math.min(.41,.08+node.speed*.042)*(1-age/3.25)*Math.min(age*6,1):0
   }
   edge(a,true);edge(a,false);edge(b,true);edge(a,false);edge(b,false);edge(b,true)
  }
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i]
   if(b.t-a.t>.44)continue
   index(a,b,-1);index(a,b,1)
  }
  geometry.setDrawRange(0,offset);mesh.visible=offset>0
  if(offset)geometry.attributes.position.needsUpdate=geometry.attributes.foam.needsUpdate=true
 }
 return update
}

export function boatArt(scene,boats){
 const swimTrail=trail(scene)
 const black=new T.MeshStandardMaterial({color:0x293435,roughness:.77})
 const alloy=new T.MeshStandardMaterial({color:0x7c989a,roughness:.39,metalness:.35})
 const deck=new T.MeshStandardMaterial({color:0xd3c9ab,roughness:.72})
 const glass=new T.MeshStandardMaterial({color:0x5f7f85,roughness:.30,metalness:.19,transparent:true,opacity:.72,side:T.DoubleSide})
 const rigs=boats.map(b=>{
  const root=new T.Group(),pilot=new T.Object3D();root.name=b.name
  const body=new T.MeshStandardMaterial({color:b.color,roughness:.48,metalness:.19,side:T.DoubleSide})
  const lower=new T.Mesh(hull(b.length,b.width),body);lower.castShadow=lower.receiveShadow=true;root.add(lower)
  const block=(m,x,y,z,w,h,d,pitch=0)=>{
   const n=new T.Mesh(rect,m);n.scale.set(w,h,d);n.position.set(x,y,z);n.rotation.x=pitch;n.castShadow=true;root.add(n)
  }
  block(deck,0,.311,.17,b.width*.88,.066,b.length*.74)
  block(deck,0,.304,-b.length*.32,b.width*.54,.066,b.length*.25)
  block(black,0,.45,.62,b.width*.73,.22,.61)
  block(black,0,.635,.87,b.width*.73,.37,.14,-.1)
  block(b.id==='launch'?body:alloy,0,.57,-.50,b.width*.76,.52,.42)
  block(glass,0,.98,-.71,b.width*.69,.43,.048,-.39)
  block(alloy,0,.79,-.62,b.width*.72,.047,.083)
  for(const sign of [-1,1]){
   block(alloy,sign*b.width*.39,.40,.35,.054,.058,b.length*.65)
   block(black,sign*b.width*.43,.23,0,.06,.075,b.length*.69)
  }
  block(black,0,.25,b.length*.49,.49,.72,.44)
  block(alloy,0,-.22,b.length*.53,.14,.36,.21)
  block(black,0,-.40,b.length*.56,.38,.07,.14)
  pilot.position.set(-b.width*.20,-.39,.61);pilot.rotation.y=Math.PI
  root.add(pilot);scene.add(root)
  return {root,pilot,wake:trail(scene),boat:b}
 })
 function update(dt,time,position,active){
  for(const rig of rigs){
   const b=rig.boat,bob=swellAt(b.x,b.z,time)
   rig.root.visible=Math.hypot(b.x-position.x,b.z-position.z)<130||b===active
   rig.root.position.set(b.x,bob-.026,b.z)
   rig.root.rotation.order='YXZ'
   b.heel=ease(b.heel,-b.rudder*clamp(b.speed*.033,-.16,.32),3.4,dt)
   rig.root.rotation.set(.058*Math.sin(time*1.55+b.x*.10)+clamp(b.speed*.009,-.03,.11),b.heading,
    b.heel+.033*Math.cos(time*1.45+b.z*.25))
   rig.root.updateMatrixWorld()
   const back=b.length*.44
   rig.wake(b.x-Math.sin(b.heading)*back,b.z+Math.cos(b.heading)*back,b.heading,b===active?Math.abs(b.speed):0,time)
  }
 }
 return {update,pilot(b){return rigs.find(r=>r.boat===b).pilot},swimTrail}
}
