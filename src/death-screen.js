import './death-screen.css'

export function createDeathScreen(canvas,dialog){
 const game=canvas.parentElement,button=dialog.querySelector('button')
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)')
 let resume

 dialog.addEventListener('cancel',event=>event.preventDefault())
 function finish(){
  const continueGame=resume
  resume=null
  continueGame()
  dialog.close()
  game.classList.remove('player-death')
  delete dialog.dataset.phase
  delete dialog.dataset.automatic
  button.disabled=true
  canvas.focus({preventScroll:true})
 }
 button.addEventListener('click',()=>{if(resume&&!button.disabled)finish()})

 return {
  get active(){return dialog.open},
  begin(onContinue,{auto=false}={}){
   resume=onContinue
   if(auto)dialog.dataset.automatic=''
   dialog.showModal()
   game.classList.add('player-death')
   const reduced=reducedMotion.matches
   setTimeout(()=>{
    dialog.dataset.phase='title'
    setTimeout(()=>{
     if(auto){finish();return}
     button.disabled=false
     button.focus({preventScroll:true})
    },reduced?(auto?650:230):950)
   },reduced?420:1250)
  }
 }
}
