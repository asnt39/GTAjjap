// Use only voices the device explicitly marks local.
export function dialogueVoice(browser=globalThis,volume=()=>.9){
 const engine=browser.speechSynthesis
 let enabled=false,last='',current=false
 const voices=()=>engine?.getVoices().filter(voice=>voice.localService&&/^ko(?:-|$)/i.test(voice.lang))??[]
 const stop=()=>{
  if(current)engine.cancel()
  current=false;last=''
 }
 return {
  get enabled(){return enabled},
  toggle(){
   if(enabled){enabled=false;stop();return '대사 음성을 껐어.'}
   if(!browser.SpeechSynthesisUtterance||!voices().length)return '기기에 한국어 오프라인 음성이 없어. 자막을 사용해.'
   enabled=true;return '대사 음성을 켰어.'
  },
  say(speaker,text){
   const key=speaker+'\n'+text
   if(!enabled||!text||key===last)return
   const choices=voices()
   if(!choices.length)return
   const index=Array.from(speaker).reduce((acc,c)=>acc+c.charCodeAt(0),0)
   stop();last=key
   const utterance=new browser.SpeechSynthesisUtterance(text.replace(/^.{1,22} · /,''))
   utterance.volume=volume()
   utterance.voice=choices[index%choices.length];utterance.lang=utterance.voice.lang
   utterance.rate=.89+(index%5)*.032;utterance.pitch=.91+(index%4)*.053
   current=true;engine.speak(utterance)
  },
  stop
 }
}
