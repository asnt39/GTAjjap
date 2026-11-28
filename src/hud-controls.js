const startMinutes=19*60+42
export function gameTime(elapsedMs){
 const minutes=(startMinutes+Math.floor(Math.max(0,elapsedMs)/60_000))%(24*60)
 return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0')
}

export function stickVector(dx,dy,radius){
 const distance=Math.hypot(dx,dy),deadZone=.105
 if(distance<=radius*deadZone)return {x:0,y:0}
 const magnitude=(Math.min(1,distance/radius)-deadZone)/(1-deadZone)
 return {x:dx/distance*magnitude,y:dy/distance*magnitude}
}
