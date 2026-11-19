const record='harborline.firstDrive.v2'
const stops=[
 {x:0,z:-37,name:'시장 교차로',radius:5.5},
 {x:2.6,z:-87,name:'북부 하역장',radius:3.2},
 {x:3.1,z:19.5,name:'항구 정문',radius:3.4}
]
export function firstDrive(car){
 let stage=-2,completed=false
 try{completed=localStorage.getItem(record)==='complete'}catch{}
 return {
  get active(){return stage>=-1},
  get completed(){return completed},
  start(isDriving){stage=isDriving?0:-1},
  board(){if(stage===-1)stage=0},
  tick(driving){
   if(!driving||stage<0||stage>=stops.length)return
   const target=stops[stage]
   if(Math.hypot(car.x-target.x,car.z-target.z)<target.radius&&Math.abs(car.speed)<.48)stage++
  },
  exit(){
   if(stage!==3||Math.hypot(car.x-stops[2].x,car.z-stops[2].z)>stops[2].radius)return false
   completed=true;stage=-2;try{localStorage.setItem(record,'complete')}catch{}return true
  },
  goal(driving){
   if(stage===-2)return null
   if(!driving)return {x:car.x,z:car.z,label:'Touring 탑승'}
   const stop=stops[Math.min(Math.max(0,stage),2)]
   return {...stop,label:stage===3?'항구 정문에 주차하고 하차':(stage+1)+'/3　'+stop.name+'에 정차'}
  }
 }
}
