import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {citySpots} from './city-life-plan.js'
import {terracePoint,terraceRooms} from './terrace-plan.js'

export function cityFixtures(scene,add){
 const groups=new Map(),shell=new T.BoxGeometry()
 function piece(id,x,y,z,w,h,d,color){
  const g=shell.clone().scale(w,h,d).translate(x,y,z),uv=g.attributes.position,n=uv.count,t=new T.Color(color),rgb=[]
  for(let i=0;i<n;i++)rgb.push(t.r,t.g,t.b)
  g.setAttribute('color',new T.Float32BufferAttribute(rgb,3))
  const parts=groups.get(id)??[];parts.push(g);groups.set(id,parts)
 }
 for(const [id,color,depth,height] of [['vending',0x2c5557,.53,1.89],['atm',0x404e53,.37,1.52]]){
  const {x,z}=citySpots.find(s=>s.id===id),bodyZ=z-.69
  piece('square',x,.083+height/2,bodyZ,.87,height,depth,color)
  piece('square',x,1.36,bodyZ+depth/2,.57,.30,.036,0x9bc6af)
  piece('square',x,.95,bodyZ+depth/2,.42,.075,.05,0x424b49)
  piece('square',x,.52,bodyZ+depth/2,.50,.14,.04,0x1d2526)
  add(x-.445,x+.445,bodyZ-depth/2,bodyZ+depth/2,.083+height)
 }
 const map=citySpots.find(s=>s.id==='directions')
 piece('square',map.x,1.27,map.z-.58,.78,.67,.12,0x3d5252)
 piece('square',map.x,.58,map.z-.58,.12,1.15,.15,0x4f5656)
 add(map.x-.40,map.x+.4,map.z-.66,map.z-.50,1.64)
 const marquee=document.createElement('canvas');marquee.width=256;marquee.height=128
 const pen=marquee.getContext('2d');pen.fillStyle='#394a49';pen.fillRect(0,0,256,128)
 pen.strokeStyle='#e6c792';pen.lineWidth=4;pen.strokeRect(9,9,238,110)
 pen.fillStyle='#efe0bb';pen.font='600 30px sans-serif';pen.textAlign='center';pen.fillText('CLOCK COURT',128,58)
 pen.font='17px sans-serif';pen.fillText('MARKET · WEST BANK',128,93)
 const sign=new T.Mesh(new T.PlaneGeometry(.75,.36),new T.MeshBasicMaterial({map:new T.CanvasTexture(marquee)}))
 sign.material.map.colorSpace=T.SRGBColorSpace;sign.position.set(map.x,1.29,map.z-.513);scene.add(sign)
 const {x,z}=citySpots.find(s=>s.id==='light')
 piece('bakery',x,1.32,z,.09,.14,.083,0xe8cca5)
 const room=terraceRooms.find(r=>r.index===0),p=terracePoint(room,0,-.33)
 const glow=new T.PointLight(0xffd5a1,0,8,2)
 glow.position.set(p.x,2.84,p.z);glow.visible=false;scene.add(glow)
 let lightOn=true
 const r=terraceRooms.find(r=>r.index===8)
 const board=new T.Group()
 const center=terracePoint(r,1.55,-r.depth/2+.14)
 board.position.set(center.x,1.78,center.z);board.rotation.y=r.angle
 for(const [radius,color,z] of [[.275,0x47382d,0],[.232,0x283637,.008],[.16,0xada480,.016],[.086,0x43625a,.024],[.047,0xa2664a,.032],[.018,0xc89865,.04]]){
  const ring=new T.Mesh(new T.CircleGeometry(radius,24),new T.MeshStandardMaterial({color,roughness:.8}));ring.position.z=z;board.add(ring)
 }
 scene.add(board)
 const service=citySpots.find(s=>s.id==='repair')
 const panel=document.createElement('canvas');panel.width=512;panel.height=96
 const signFace=panel.getContext('2d')
 signFace.fillStyle='#2d4243';signFace.fillRect(0,0,512,96);signFace.fillStyle='#f2d79f'
 signFace.strokeStyle='#f2d79f';signFace.strokeRect(12,9,488,78);signFace.textAlign='center';signFace.font='bold 38px sans-serif'
 signFace.fillText('WEST BANK SERVICE',256,66)
 const serviceMap=new T.CanvasTexture(panel);serviceMap.colorSpace=T.SRGBColorSpace
 const serviceSign=new T.Mesh(new T.PlaneGeometry(3.9,.73),new T.MeshBasicMaterial({map:serviceMap}))
 serviceSign.position.set(service.x,2.57,49.045);scene.add(serviceSign)
 const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.8})
 for(const parts of groups.values()){
  const geo=mergeGeometries(parts);const mesh=new T.Mesh(geo,mat)
  mesh.receiveShadow=true;scene.add(mesh);parts.forEach(g=>g.dispose())
 }
 shell.dispose()
 return {toggleLamp(){lightOn=!lightOn;return lightOn},update(pos){
  const inside=Math.abs(pos.x-room.x)<room.depth/2&&Math.abs(pos.z-room.z)<room.width/2
  glow.visible=inside&&lightOn
  glow.intensity=glow.visible?12:0
 }}
}
