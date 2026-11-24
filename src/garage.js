export const garage={
 x:-17.35,z:37.75,yaw:Math.PI/2,
 bounds:[-21.1,-9.9,35,49], doorway:[-12.4,-9.2,39.24,44.76], front:-11.1, ceiling:3.36, forecourt:[-21.1,-6,37.9,46.1],
 car:{x:-16.05,z:42,heading:Math.PI/2}
}
export const garageSight={x:-17.5,z:36.6,tag:'HOME',title:'Breakwater Garage',name:'차고지 살림',
 body:'침대, 냉장고, 공구대가 놓인 내 차고지. 쉬면서 체력을 채우고, 안에 세운 개인 차량을 수리할 수 있다.'}
export function atGarage(x,z,r=0){
 const [a,b,n,s]=garage.bounds
 return x>=a+r&&x<=b-r&&z>=n+r&&z<=s-r
}
export function garageAccess(x,z,r=0){
 const [a,b,n,s]=garage.doorway
 return atGarage(x,z,r)||(x>=a+r&&x<=b-r&&z>=n+r&&z<=s-r)
}

export function buildGarage({cube,panel,addCollider,wall,iron,trim,ledge,lit},height){
 const [back,,north,south]=garage.bounds
 const {front,ceiling}=garage
 const block=(a,b,n,s,h,material)=>{
  cube((a+b)*.5,h*.5,(n+s)*.5,b-a,h,s-n,material)
  addCollider(a,b,n,s,h)
 }
 block(back,back+.25,north,south,ceiling,wall)
 for(const [n,s] of [[north,north+.24],[south-.24,south]])block(back,front,n,s,ceiling,wall)
 for(const [n,s] of [[north,39.24],[44.76,south]])block(front-.24,front,n,s,ceiling,wall)
 cube((back+front)/2,(ceiling+height)/2,42,front-back,height-ceiling,south-north,wall)
 cube((back+front)/2,.031,42,front-back,.104,south-north,trim)
 cube(front+.08,3.18,42,.30,.21,5.76,iron)
 for(let i=0;i<5;i++)cube(front+.13,3.27+i*.083,42,.07,.042,5.62,trim)
 for(const z of [38.4,45.6])cube(-15.8,3.25,z,3.6,.09,.15,lit)
 block(-20.68,-18.10,36.1,37.9,.53,iron)
 cube(-19.39,.61,37,2.57,.16,1.76,ledge)
 cube(-20.22,.73,37,.54,.10,1.63,trim)
 block(-20.75,-19.37,44.65,47.62,.95,iron)
 cube(-20.06,1,46.13,1.43,.12,3.16,ledge)
 for(const z of [45.16,46.16,47.16])cube(-20.06,1.19,z,.37,.27,.53,trim)
 block(-12.58,-11.55,46.2,47.32,1.75,ledge)
 cube(-12.63,1.29,46.65,.05,.34,.07,iron)
 for(const z of [40.74,43.28])cube(-15.65,.089,z,4.9,.012,.072,ledge)
 panel(front+.13,3.61,42,3.5,.40,5,1,lit)
}
