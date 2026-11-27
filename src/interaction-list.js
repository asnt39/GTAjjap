export function interactionSelection(){
 let selected=null
 return {
  update(candidates){
   candidates.sort((a,b)=>b.priority-a.priority||a.distance-b.distance||a.id.localeCompare(b.id))
   if(!candidates.some(item=>item.id===selected))selected=candidates[0]?.id??null
   return candidates
  },
  get id(){return selected},
  cycle(candidates,direction=1){
   if(!candidates.length)return
   const index=candidates.findIndex(item=>item.id===selected)
   selected=candidates[(index+direction+candidates.length)%candidates.length].id
  },
  reset(){selected=null}
 }
}
