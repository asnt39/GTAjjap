export const ARREST_REACH = 1.12
export const custodyTimes = { arrest: 2.25, fade: .42, sentence: 7 }
export const station = {
 x: -93.2, left: -96.4, right: -90, front: -46, back: -56, ceiling: 3.32,
 cell: { x: -92.5, z: -53.4 }, release: { x: -93.2, z: -43.7 }
}

export function atStation(x, z) {
 return x>station.left&&x<station.right&&z>station.back&&z<station.front
}

export function createCustody({admit,release}) {
 let stage='free', clock=0, officer=null
 const change=next=>{stage=next;clock=0}
 return {
  get stage(){return stage},
  get officer(){return officer},
  get active(){return stage!=='free'},
  get locked(){return stage!=='free'&&stage!=='sentence'},
  get progress(){return stage==='arrest'?Math.min(1,clock/custodyTimes.arrest):1},
  get remaining(){return Math.ceil(Math.max(0,custodyTimes.sentence-clock))},
  get opacity(){
   if(stage==='transfer'||stage==='discharge')return Math.min(1,clock/custodyTimes.fade)
   if(stage==='arrival'||stage==='released')return Math.max(0,1-clock/custodyTimes.fade)
   return 0
  },
  begin(by){
   if(stage!=='free'||!by)return false
   officer=by;change('arrest');return true
  },
  update(dt){
   if(stage==='free')return
   clock+=dt
   if(stage==='arrest'&&clock>=custodyTimes.arrest)change('transfer')
   else if(stage==='transfer'&&clock>=custodyTimes.fade){admit();officer=null;change('arrival')}
   else if(stage==='arrival'&&clock>=custodyTimes.fade)change('sentence')
   else if(stage==='sentence'&&clock>=custodyTimes.sentence)change('discharge')
   else if(stage==='discharge'&&clock>=custodyTimes.fade){release();change('released')}
   else if(stage==='released'&&clock>=custodyTimes.fade)change('free')
  }
 }
}

export function stationColliders(add) {
 const s=station
 for(const [a,b,c,d,h] of [
  [s.left,s.left+.22,s.back,s.front,3.45],
  [s.right-.22,s.right,s.back,s.front,3.45],
  [s.left,s.right,s.back,s.back+.24,3.45],
  [s.left,s.x-.94,s.front-.18,s.front,3.45],
  [s.x+.94,s.right,s.front-.18,s.front,3.45],
  [s.left,s.right,-51.8,-51.62,3.08],
  [-95.85,-94.8,-55.55,-52.75,.58],
  [-95.95,-94.7,-50.65,-48.68,1.02]
 ])add(a,b,c,d,h)
}
