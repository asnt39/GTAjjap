export const weaponShop={
 x:-56,z:-51.6,tag:'ARM',title:'Breakwater Arms',name:'무기와 탄약 구입',range:1.75,
 body:'카운터에서 장비와 예비탄을 구입할 수 있어. 새 총의 탄창은 비어 있어.'
}
export const weaponVendor={
 id:'arms-clerk',name:'Mara Quinn',role:'무기 상점 판매원',model:'crew',variant:3,
 x:-56,z:-54.3,face:0,pace:.8,temper:'avoid',station:true,
 lines:['가격과 남은 돈은 카운터에서 확인할 수 있어요.','빈 탄창은 예비탄을 산 뒤 장전하세요.']
}
export const insideWeaponShop=(x,z)=>x>-58.9&&x<-53.1&&z<-46&&z>-55.8

// [x, y, z, width, height, depth, material, solid].
export const shopParts=[
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
 for(const [x,y,z,w,h,d,,solid] of shopParts){
  if(solid)add(x-w/2,x+w/2,z-d/2,z+d/2,y+h/2)
 }
}
