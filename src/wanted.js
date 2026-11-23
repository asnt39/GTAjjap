// Patrols plan towards a reported position. Only a fresh sighting moves it.
export function createWanted(){
 let level=0, unseen=0, lastKnown=null, hold=0, contact=null, phase='clear'
 function clear(){level=0;unseen=0;hold=0;contact=null;lastKnown=null;phase='clear'}
 function sight(point){lastKnown={x:point.x,z:point.z};unseen=0}
 return {
  get level(){return level},get phase(){return phase},get lastKnown(){return lastKnown},
  report(point,severity){level=Math.min(3,level+severity);hold=0;sight(point);phase=level===1?'investigate':'pursuit'},
  tick(dt,point,visible,officer,legacy=false){
   if(!level)return
   if(visible)sight(point);else unseen+=dt
   phase=unseen>1?'search':level===1?'investigate':'pursuit'
   const touching=visible&&officer?officer:null
   hold=touching?(touching===contact?hold:0)+dt:0
   contact=touching
   if(hold+1e-8>=(level===1||legacy?1.8:1)){
    const outcome=level===1?'warning':'arrest'
    clear();return outcome
   }
   if(unseen>8+level*3){clear();return 'escaped'}
  },clear
 }
}
