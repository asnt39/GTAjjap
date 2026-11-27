export const shopSite={x:-16.50,z:54.25,width:5.8,depth:10,cos:0,sin:1,angle:Math.PI/2,door:'pair',title:'Breakwater Arms'}
export const shopApron=[-11.58,-9.20,51.27,57.23]
export function shopPoint(x,z){return {x:shopSite.x+z+51,z:shopSite.z-x-56}}
export const shopAccess=(x,z,r=0)=>x>=-21.63+r&&x<=-9.2-r&&z>=51.27+r&&z<=57.23-r
export const oldShopWorkshop={x:-56,z:-51,left:-59.02,right:-52.98,front:-45.88,back:-56.12}
export const weaponShop={
 ...shopPoint(-56,-51.6),tag:'ARM',title:'Breakwater Arms',name:'무기와 탄약 구입',range:1.75,
 body:'카운터에서 장비와 예비탄을 구입할 수 있어. 새 총의 탄창은 비어 있어.'
}
export const weaponVendor={
 id:'arms-clerk',name:'Mara Quinn',role:'무기 상점 판매원',model:'crew',variant:3,
 ...shopPoint(-56,-54.3),face:Math.PI/2,pace:.8,temper:'avoid',station:true,
 lines:['가격과 남은 돈은 카운터에서 확인할 수 있어요.','빈 탄창은 예비탄을 산 뒤 장전하세요.']
}
export const insideWeaponShop=(x,z)=>x>-21.35&&x<-11.43&&z>51.36&&z<57.14

// [x, y, z, width, height, depth, material, solid].
export const localShopParts=[
 [-58.9,1.73,-51,.24,3.46,10,'wall',true],[-53.1,1.73,-51,.24,3.46,10,'wall',true],
 [-56,1.73,-56,6.04,3.46,.24,'wall',true],
 [-57.96,1.73,-46,1.89,3.46,.24,'wall',true],[-54.04,1.73,-46,1.89,3.46,.24,'wall',true],
 [-56,2.99,-46,2.04,.94,.24,'wall'],[-56,3.47,-51,6.1,.2,10.3,'metal'],
 [-56,.026,-51,5.8,.052,10,'floor'],
 [-56,.46,-53.12,3.65,.92,.72,'wood',true],[-56,.95,-53.12,3.82,.09,.88,'metal'],
 [-58.15,.64,-50.05,.71,1.28,3.02,'wood',true],[-53.83,.64,-50.05,.71,1.28,3.02,'wood',true],
 [-58.24,1.42,-50.05,.50,.28,3,'glass'],[-53.76,1.42,-50.05,.50,.28,3,'glass'],
 [-56,2.83,-45.23,6.03,.14,1.37,'metal'],[-56,3.21,-45.84,4.6,.45,.06,'sign'],
 [-56,3.32,-50.5,3.2,.07,.35,'light'],[-56,3.32,-54.4,3.2,.07,.35,'light']
]

export function weaponShopCollision(add){
 for(const [x,y,z,w,h,d,,solid] of localShopParts){
  if(!solid)continue
  const p=shopPoint(x,z)
  add(p.x-d/2,p.x+d/2,p.z-w/2,p.z+w/2,y+h/2)
 }
 add(-21.5,-11.5,51.35,57.15,3.57,false,3.37)
 const {left,right,back,front}=oldShopWorkshop
 add(left,right,back,front,3.38)
}
