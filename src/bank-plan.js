const point=(x,z)=>({x,z,y:.083})
const door=(x,z,north,title,type)=>({
 x,z,depth:.16,angle:north?Math.PI:0,sin:0,cos:north?-1:1,title,door:type
})

export const bank={
 bounds:[-194,-180,188,207],ceiling:4.7,
 entry:point(-187,187.45),lobby:point(-187,192),tellers:point(-191.65,194.60),
 consultation:point(-182.5,199.5),office:point(-191.5,200.42),vault:point(-187,204.75)
}
export const bankDoors=[
 door(-187,188.10,true,'Meridian Bank 정문','auto'),
 door(-182.65,197.36,true,'상담실','slide'),
 door(-191.63,198.75,true,'사무실','slide'),
 door(-187,202.58,true,'금고 전실','pair')
]
export const insideBank=(x,z)=>x>-194&&x<-180&&z>188&&z<207
export const bankSight={...bank.entry,tag:'MB',title:'Meridian Bank',name:'은행 안내',
 body:'로비에서 창구를 이용하고 상담실, 사무실과 금고 전실을 둘러볼 수 있습니다.'}
