export function healthPresentation(hp,maxHealth){
 const max=Number.isFinite(maxHealth)?Math.max(1,Math.round(maxHealth)):1
 const value=Number.isFinite(hp)?Math.min(max,Math.max(0,Math.round(hp))):0
 const fraction=value/max,critical=Math.max(0,(.55-fraction)/.55)
 return {hp:value,max,fraction,label:value+'/'+max,band:fraction<=.28?'critical':fraction<=.58?'hurt':'steady',vignette:critical*.56}
}

export function createHealthHUD(game,hud){
 const text=hud.querySelector('.health-count'),armorText=hud.querySelector('.health-armor')
 const meter=hud.querySelector('[role="meter"]'),opponent=hud.querySelector('.health-opponent')
 const flash=game.querySelector('#damage-flash'),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)')
 let signature='',pulse
 return {
  update({hp,maxHealth,armor},target,hidden){
   hud.hidden=hidden
   const next=healthPresentation(hp,maxHealth)
   const key=next.label+'/'+armor+'/'+target
   if(key===signature)return
   signature=key;hud.dataset.health=next.band
   hud.style.setProperty('--health',String(next.fraction))
   game.style.setProperty('--injury-vignette',String(next.vignette))
   meter.setAttribute('aria-valuemax',String(next.max));meter.setAttribute('aria-valuenow',String(next.hp))
   text.textContent=next.label;armorText.textContent=armor?'보호 '+armor:'';opponent.textContent=target
  },
  hit(amount=10,kind='melee'){
   pulse?.cancel()
   const alpha=Math.min(.42, .13+Math.max(0,amount)*.006)*(reducedMotion.matches?.43:1)
   flash.dataset.hit=kind
   pulse=flash.animate?.([{opacity:alpha},{opacity:0}],{duration:reducedMotion.matches?120:220,easing:'ease-out'})
  },
  clear(){pulse?.cancel();pulse=null;signature='';game.style.setProperty('--injury-vignette','0')}
 }
}
