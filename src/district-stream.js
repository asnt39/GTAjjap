// Keep the walkable shell in the scene while replaceable district detail is in flight.
export function streamDistrict({load,attach,detach,enterDistance,leaveDistance,clock=()=>performance.now()}){
 let detail=null,pending=null,wanted=false,retryAt=0,changed=false
 return distance=>{
  wanted=distance<(detail||pending?leaveDistance:enterDistance)
  if(wanted&&!detail&&!pending&&clock()>=retryAt){
   pending=load().then(next=>{
    if(wanted){detail=next;attach(next);changed=true}
    else next.dispose()
   }).catch(error=>{console.warn(error.message);retryAt=clock()+5000}).finally(()=>{pending=null})
  }else if(!wanted&&detail){
   detach(detail);detail.dispose();detail=null;changed=true
  }
  const redraw=changed;changed=false;return redraw
 }
}
