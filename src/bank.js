import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {bank} from './bank-plan.js'

export function buildBank(scene,addCollider,maps){
 const root=new T.Group(),batches=new Map()
 root.name='Meridian Bank';scene.add(root)
 const material=(color,map=null,extra={})=>new T.MeshStandardMaterial({color,map,roughness:.77,...extra})
 const stone=material(0xc7bda6,maps.architecture[1]),base=material(0x536563,maps.architecture[1])
 const plaster=material(0xd0c6ad),wood=material(0x755340),brass=material(0xb69258,null,{metalness:.42})
 const metal=material(0x3b5356,null,{metalness:.34}),glass=material(0x729898,null,{roughness:.22,metalness:.26})
 const tile=material(0xa9a397,maps.street[2]),carpet=material(0x48616a)
 const lamp=material(0xffe5af,null,{emissive:0xffd58c,emissiveIntensity:.61})
 function batch(g,mat){
  if(mat.map){
   const uv=g.attributes.uv
   for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*2,uv.getY(i)*2)
  }
  if(!batches.has(mat))batches.set(mat,[])
  batches.get(mat).push(g)
 }
 const box=(x,y,z,w,h,d,mat)=>batch(new T.BoxGeometry(w,h,d).translate(x,y,z),mat)
 function solid(a,b,c,d,y0,y1,mat,walkable=false){
  box((a+b)/2,(y0+y1)/2,(c+d)/2,b-a,y1-y0,d-c,mat)
  addCollider(a,b,c,d,y1,walkable,y0)
 }
 function front(a,b,z,gaps,high=bank.ceiling,mat=plaster){
  let at=a
  for(const x of gaps){
   solid(at,x-.91,z,z+.20,.083,high,mat)
   solid(x-.91,x+.91,z,z+.20,2.67,high,mat)
   at=x+.91
  }
  solid(at,b,z,z+.20,.083,high,mat)
 }
 const [w,e,n,s]=bank.bounds,top=bank.ceiling
 box(-187,-.017,197.5,14,.21,19,tile)
 box(-187,.081,187.44,5.6,.015,.96,stone)
 solid(w,e,n,s,top,top+.31,stone,true)
 for(const x of [w,e-.25])solid(x,x+.25,n,s,.083,top,stone)
 solid(w,e,s-.25,s,.083,top,base)
 front(w,e,n,[-187],top,stone)
 for(const x of [-193.35,-190.21,-188.55,-185.45,-183.79,-180.65]){
  solid(x-.16,x+.16,n-.19,n+.23,.083,4.50,stone)
  box(x,.22,n-.21,.45,.27,.28,base)
  box(x,4.42,n-.20,.48,.20,.33,brass)
 }
 for(const x of [-191.85,-182.15]){
  box(x,2.25,n-.04,2.31,2.78,.10,metal)
  box(x,2.25,n-.12,2.10,2.54,.072,glass)
  for(const dx of [-.69,0,.69])box(x+dx,2.25,n-.17,.065,2.56,.05,brass)
  box(x,2.32,n-.17,2.12,.056,.05,brass)
 }
 for(const y of [.48,3.91,4.78,5.07])box(-187,y,n-.08,14.36,.14,.42,y===3.91?brass:base)
 box(-187,3.43,n-.52,4.56,.17,1.21,metal)
 box(-187,3.36,n-.75,1.98,.061,.18,lamp)

 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96
 const ctx=canvas.getContext('2d')
 ctx.fillStyle='#243b41';ctx.fillRect(0,0,512,96)
 ctx.fillStyle='#f6dd9f';ctx.textAlign='center';ctx.textBaseline='middle'
 ctx.font='600 45px Georgia';ctx.fillText('MERIDIAN BANK',256,49)
 const sign=new T.Mesh(new T.PlaneGeometry(5.4,1.013),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas)}))
 sign.position.set(-187,4.28,n-.237);sign.rotation.y=Math.PI;root.add(sign)

 box(-187,.094,193.18,2.65,.014,9.29,carpet)
 for(const z of [191.4,194.05]){
  solid(-183.51,-181.1,z-.36,z+.36,.083,.51,wood)
  box(-182.305,.55,z,2.41,.14,.70,carpet)
  box(-182.3,.80,z+.30,2.41,.41,.12,wood)
 }
 solid(-193.62,-189.45,195.20,196.03,.083,1.12,wood)
 box(-191.535,1.155,195.62,4.25,.077,.96,stone)
 for(const x of [-192.83,-191.53,-190.21]){
  box(x,1.51,195.88,1.02,.64,.045,glass)
  box(x,1.20,195.38,.55,.077,.24,brass)
 }
 for(const x of [-189.6,-185])for(const z of [190.5,193.5,196.4,199.8]){
  box(x,4.48,z,1.23,.16,.52,metal);box(x,4.38,z,1.13,.069,.42,lamp)
 }
 front(-184.45,e-.25,197.26,[-182.65])
 solid(-184.45,-184.25,197.26,202.45,.083,top,plaster)
 front(w+.25,-189.59,198.65,[-191.63])
 solid(-189.78,-189.58,198.65,202.45,.083,top,plaster)
 front(w+.25,e-.25,202.48,[-187],top,base)
 for(const [x,z] of [[-182.72,200.41],[-191.52,201.34]]){
  solid(x-.93,x+.93,z-.43,z+.43,.083,.83,wood)
  box(x,.88,z,1.95,.09,.94,stone)
  box(x+.34,1.17,z+.10,.44,.49,.12,metal)
 }
 for(const x of [-192.15,-181.86])for(let i=0;i<2;i++){
  const k=x+i*.75
  solid(k-.32,k+.32,204.28,206.6,.083,2.24,metal)
  for(let j=0;j<6;j++)box(k, .31+j*.30,204.26,.43,.15,.041,brass)
 }
 batch(new T.TorusGeometry(1.07,.095,9,32).translate(-187,1.36,202.455),brass)
 for(const [mat,parts] of batches){
  const mesh=new T.Mesh(mergeGeometries(parts),mat)
  mesh.receiveShadow=true;mesh.castShadow=mat===stone||mat===base;root.add(mesh)
  parts.forEach(piece=>piece.dispose())
 }
 return root
}
