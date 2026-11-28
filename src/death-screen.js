import './death-screen.css'

const timings={
 normal:{fade:1100,reveal:1200,choices:650,auto:1500},
 reduced:{fade:200,reveal:280,choices:80,auto:760}
}

export function createDeathScreen(canvas,dialog){
 const game=canvas.parentElement
 const continueButton=dialog.querySelector('#death-continue')
 const retryButton=dialog.querySelector('#death-retry')
 const status=dialog.querySelector('#death-status')
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)')
 let resume,timer,awaitingFade

 function setAction(button,visible){
  if(button){button.hidden=!visible;button.disabled=!visible}
 }
 function reset(){
  clearTimeout(timer)
  if(awaitingFade)canvas.removeEventListener('transitionend',awaitingFade)
  awaitingFade=null
  game.classList.remove('player-death','death-grayscale')
  game.style.removeProperty('--death-fade')
  delete dialog.dataset.phase
  setAction(continueButton,false);setAction(retryButton,false)
  if(status){status.hidden=true;status.textContent=''}
 }
 function finish(choice){
  if(!resume)return
  const continueGame=resume
  resume=null
  dialog.close()
  reset()
  try{continueGame(choice)}finally{canvas.focus({preventScroll:true})}
 }

 dialog.addEventListener('cancel',event=>event.preventDefault())
 dialog.addEventListener('close',()=>{if(!dialog.open&&resume){resume=null;reset()}})
 continueButton.addEventListener('click',()=>{if(!continueButton.disabled)finish('continue')})
 retryButton?.addEventListener('click',()=>{if(!retryButton.disabled)finish('retry')})

 return {
  get active(){return dialog.open},
  begin(onContinue,{auto=false,retry=false,continueLabel='계속하기',autoMessage='곧 안전한 장소에서 깨어납니다.',onTitle}={}){
   if(dialog.open)return
   const timing=reducedMotion.matches?timings.reduced:timings.normal
   resume=onContinue
   continueButton.textContent=continueLabel
   setAction(continueButton,false);setAction(retryButton,false)
   if(status&&auto)status.hidden=false
   game.style.setProperty('--death-fade',`${timing.fade}ms`)
   dialog.showModal()
   game.classList.add('player-death')
   function reveal(){
    clearTimeout(timer)
    if(awaitingFade)canvas.removeEventListener('transitionend',awaitingFade)
    awaitingFade=null
    if(!resume||!dialog.open)return
    game.classList.add('death-grayscale')
    dialog.dataset.phase='title'
    onTitle?.()
    if(status&&auto)status.textContent=autoMessage
    timer=setTimeout(()=>{
     if(auto){finish('continue');return}
     setAction(continueButton,true);setAction(retryButton,retry)
     const initialAction=retry&&retryButton?retryButton:continueButton
     initialAction.focus({preventScroll:true})
    },auto?timing.auto:timing.choices)
   }
   timer=setTimeout(()=>{
    if(getComputedStyle(canvas).filter==='grayscale(1)'){reveal();return}
    awaitingFade=event=>{if(event.propertyName==='filter')reveal()}
    canvas.addEventListener('transitionend',awaitingFade)
    timer=setTimeout(reveal,Math.ceil(timing.fade*.65))
   },timing.reveal)
  }
 }
}
