import { BufferAttribute, BufferGeometry, Color, LineBasicMaterial, LineSegments, Points, ShaderMaterial } from 'three'
import {worldPoint} from './driving.js'

const palettes={
 exhaust:{color:0xa6a7a5,size:.14,growth:.32,opacity:.23,life:[.46,.78],spread:.32,rise:.23,gravity:-.3},
 smoke:{color:0x555756,size:.25,growth:.82,opacity:.47,life:[.55,1.24],spread:.29,rise:.84,gravity:-.55},
 dust:{color:0xc3ad91,size:.15,growth:.52,opacity:.34,life:[.22,.47],spread:1.65,rise:.27,gravity:.7},
 sparks:{color:0xffba54,size:.045,growth:-.08,opacity:.94,life:[.13,.34],spread:3.1,rise:2.1,gravity:9.8},
 flash:{color:0xffd18a,size:.28,growth:.65,opacity:.9,life:[.075,.13],spread:.6,rise:.06,gravity:0}
}

export function worldEffects(scene,{capacity=120}={}){
 const geometry=new BufferGeometry(),positions=new Float32Array(capacity*3)
 const colors=new Float32Array(capacity*3),params=new Float32Array(capacity*2)
 geometry.setAttribute('position',new BufferAttribute(positions,3))
 geometry.setAttribute('tint',new BufferAttribute(colors,3))
 geometry.setAttribute('appearance',new BufferAttribute(params,2))
 const material=new ShaderMaterial({
  transparent:true,depthWrite:false,
  uniforms:{viewport:{value:800}},
  vertexShader:`
   attribute vec3 tint;
   attribute vec2 appearance;
   uniform float viewport;
   varying vec4 particle;
   void main(){
    vec4 eye=modelViewMatrix*vec4(position,1.0);
    gl_Position=projectionMatrix*eye;
    gl_PointSize=clamp(appearance.x*viewport*projectionMatrix[1][1]/max(.2,-eye.z),1.,70.);
    particle=vec4(tint,appearance.y);
   }`,
  fragmentShader:`
   varying vec4 particle;
   void main(){
    vec2 p=gl_PointCoord*2.-1.;
    float r=dot(p,p);
    float soft=(1.-smoothstep(.04,.98,r))*(.86+.14*cos(p.x*16.+p.y*10.));
    gl_FragColor=vec4(particle.rgb,particle.a*soft);
    #include <colorspace_fragment>
   }`
 })
 const points=new Points(geometry,material)
 points.frustumCulled=false;points.visible=false;scene.add(points)
 const maxTrails=36,trailGeometry=new BufferGeometry(),trailPositions=new Float32Array(maxTrails*6)
 trailGeometry.setAttribute('position',new BufferAttribute(trailPositions,3))
 const line=new LineSegments(trailGeometry,new LineBasicMaterial({color:0xffc765,transparent:true,opacity:.72,depthWrite:false,toneMapped:false}))
 line.frustumCulled=false;line.visible=false;scene.add(line)
 const particles=[],trails=[],timers=new WeakMap()
 const color=new Color()
 const variation=(min,max)=>min+(max-min)*Math.random()
 function emit(type,x,y,z,count=1,driftX=0,driftZ=0){
  const style=palettes[type]
  color.setHex(style.color)
  for(let i=0;i<count;i++){
   if(particles.length>=capacity)particles.shift()
   particles.push({style,x,y,z,vx:driftX+variation(-style.spread,style.spread),vy:style.rise*variation(.52,1.38),
    vz:driftZ+variation(-style.spread,style.spread),life:variation(...style.life),age:0,r:color.r,g:color.g,b:color.b})
  }
 }
 function trace(from,to){
  const distance=from.distanceTo(to)
  if(distance<.15)return
  if(trails.length>=maxTrails)trails.shift()
  trails.push({from:from.clone(),to:to.clone(),age:0,distance,duration:Math.min(.25,.09+distance*.004)})
 }
 function muzzle(point,power=1){
  emit('flash',point.x,point.y,point.z,power)
  emit('smoke',point.x,point.y,point.z,1)
 }
 function vehicle(car,dt,distance){
  if(distance>42)return
  const timer=timers.get(car)??{exhaust:0,smoke:0}
  const speed=Math.abs(car.speed)
  timer.exhaust-=dt;timer.smoke-=dt
  if(car.collision){
   emit('sparks',car.collision.x,.45+(car.lift??0),car.collision.z,7)
   emit('dust',car.collision.x,.18,car.collision.z,3)
  }
  if(speed>1.25&&timer.exhaust<=0){
   const at=worldPoint(car,-car.width*.26,car.length*.51)
   emit('exhaust',at.x,.24+(car.lift??0),at.z,1,-Math.sin(car.heading)*.6,Math.cos(car.heading)*.6)
   timer.exhaust=speed>9?.09:.16
  }
  if(timer.smoke<=0&&car.dents){
   const damage=Object.values(car.dents)
   const dent=damage.reduce((a,b)=>a.depth>b.depth?a:b)
   const at=worldPoint(car,dent.x*car.width*.38,dent.z*car.length*.43)
   emit('smoke',at.x,.74+(car.lift??0),at.z,1)
   timer.smoke=dent.depth>.23?.14:.32
  }
  timers.set(car,timer)
 }
 function update(dt,height){
  material.uniforms.viewport.value=height*.5
  let index=0
  for(let i=0;i<particles.length;i++){
   const p=particles[i],s=p.style
   if(p.age>=p.life)continue
   particles[index]=p
   const fade=1-p.age/p.life
   const offset=index*3
   positions[offset]=p.x;positions[offset+1]=p.y;positions[offset+2]=p.z
   colors[offset]=p.r;colors[offset+1]=p.g;colors[offset+2]=p.b
   params[index*2]=Math.max(.018,s.size+s.growth*p.age);params[index*2+1]=s.opacity*fade*fade
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=s.gravity*dt;p.age+=dt
   index++
  }
  particles.length=index;points.visible=index>0
  geometry.setDrawRange(0,index)
  if(index)for(const attr of Object.values(geometry.attributes))attr.needsUpdate=true
  index=0
  for(let i=0;i<trails.length;i++){
   const t=trails[i]
   if(t.age>=t.duration)continue
   trails[index]=t
   const front=Math.min(1,(t.age+Math.min(.026,dt))/t.duration)
   const back=Math.max(0,front-Math.min(.65,1.8/t.distance))
   const offset=index*6
   trailPositions.set([
    t.from.x+(t.to.x-t.from.x)*back,t.from.y+(t.to.y-t.from.y)*back,t.from.z+(t.to.z-t.from.z)*back,
    t.from.x+(t.to.x-t.from.x)*front,t.from.y+(t.to.y-t.from.y)*front,t.from.z+(t.to.z-t.from.z)*front
   ],offset)
   t.age+=dt;index++
  }
  trails.length=index;line.visible=index>0
  trailGeometry.setDrawRange(0,index*2)
  if(index)trailGeometry.attributes.position.needsUpdate=true
 }
 return {emit,vehicle,trace,muzzle,update,
  land(x,y,z,force){if(force>2.2)emit('dust',x,y+.07,z,force>4?6:3)}}
}
