const settingsKey='harborline.audio.v1'
const defaults={music:.45,effects:.65,ambient:.65,voice:.9,enabled:false}
const scores={
 explore:['market-lights','last-ferry'],night:['after-hours','last-ferry'],drive:['causeway','market-lights'],
 harbor:['last-ferry','after-hours'],danger:['blue-beacons','crosswind'],story:['crosswind','market-lights'],radio:['causeway','after-hours']
}
const sounds={
 asphalt:[100,950,.075,.11],concrete:[149,1500,.07,.10],grass:[74,480,.10,.10],
 metal:[268,2600,.11,.095],wood:[177,710,.115,.11],stairs:[125,720,.09,.11],
 jump:[90,420,.09,.09],doorOpen:[142,584,.23,.18],doorClose:[80,460,.16,.30],
 blast:[47,490,.63,.57],crash:[53,470,.36,.33],hit:[99,410,.14,.24],
 pistol:[100,3300,.12,.47],shotgun:[62,1900,.23,.57],sniper:[86,2400,.31,.49],
 engineStart:[60,390,.27,.23],bikeStart:[83,620,.26,.24],reload:[262,2380,.13,.13],
 switch:[232,1400,.11,.12],buy:[587,2400,.19,.11],click:[310,1750,.08,.085],
 drink:[143,490,.24,.10],eat:[116,980,.15,.12],repair:[328,1900,.32,.16],
 mission:[392,2400,.38,.12],ui:[345,1550,.10,.085],horn:[330,1300,.52,.20],
 tire:[55,920,.17,.17],gear:[67,390,.16,.12],bird:[1660,2300,.23,.07],gull:[980,1400,.38,.13],
 harborBell:[510,1230,.42,.14],wallHit:[91,1200,.11,.13]
}

export function readMixer(storage){
 try{
  const raw=JSON.parse(storage?.getItem(settingsKey))
  return {...Object.fromEntries(Object.entries(defaults).map(([key,value])=>[
   key,key==='enabled'?raw?.enabled===true:Number.isFinite(raw?.[key])?Math.max(0,Math.min(1,raw[key])):value]))}
 }catch{return {...defaults}}
}
export function musicCue({wanted,combat,radio,driving,story,harbor,night}){
 return radio&&driving?'radio':wanted||combat?'danger':story?'story':driving?'drive':harbor?'harbor':night?'night':'explore'
}
export function cityAudio(browser=globalThis){
 let storage
 try{storage=browser.localStorage}catch{}
 const settings=readMixer(storage)
 let ctx,master,buses,roomFilter,echo,windGain,waterGain,cityGain,motor,motorGain,roadGain,siren,sirenGain,noise,spatialWind
 let active=false,paused=false,hidden=false,listener={x:0,z:0,yaw:0},muted=false,cue='',previousTrack=''
 let tracks=[],targetTrack=null,lastPlayback=0,velocityBand=0,nextAmbience=0
 const shots=new Map()
 function store(){try{storage?.setItem(settingsKey,JSON.stringify(settings))}catch{}}
 function fade(param,value,seconds=.10){param.setTargetAtTime(value,ctx.currentTime,seconds)}
 function filtered(source,type,freq,target){
  const filter=ctx.createBiquadFilter();filter.type=type;filter.frequency.value=freq
  source.connect(filter).connect(target)
  return filter
 }
 function gain(value){const g=ctx.createGain();g.gain.value=value;return g}
 function noiseLoop(type,hz){
  const source=ctx.createBufferSource(),level=gain(0)
  source.buffer=spatialWind;source.loop=true;filtered(source,type,hz,level);level.connect(buses.ambient);source.start()
  return level
 }
 function init(){
  const AudioContext=browser.AudioContext||browser.webkitAudioContext
  if(!AudioContext)return
  ctx=new AudioContext()
  master=gain(0);const limit=ctx.createDynamicsCompressor()
  limit.threshold.value=-18;limit.knee.value=14;limit.ratio.value=8
  master.connect(limit).connect(ctx.destination)
  buses={music:gain(settings.music),effects:gain(settings.effects),ambient:gain(settings.ambient)}
  roomFilter=ctx.createBiquadFilter();roomFilter.type='lowpass';roomFilter.frequency.value=14000
  buses.ambient.connect(roomFilter).connect(master)
  buses.effects.connect(master);buses.music.connect(master)
  echo=ctx.createDelay(.26);echo.delayTime.value=.108
  const reflect=gain(0);echo.connect(reflect).connect(buses.effects);echo.send=reflect
  noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.68),ctx.sampleRate)
  const white=noise.getChannelData(0)
  for(let i=0;i<white.length;i++)white[i]=Math.random()*2-1
  spatialWind=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate)
  const brown=spatialWind.getChannelData(0);let drift=0
  for(let i=0;i<brown.length;i++){drift=(drift+(Math.random()-.5)*.062)*.985;brown[i]=drift*2.6}
  windGain=noiseLoop('lowpass',660);waterGain=noiseLoop('lowpass',310);cityGain=noiseLoop('bandpass',212)
  motor=ctx.createOscillator();motor.type='triangle';motorGain=gain(0)
  filtered(motor,'lowpass',370,motorGain);motorGain.connect(buses.effects);motor.start()
  roadGain=noiseLoop('highpass',680)
  siren=ctx.createOscillator();siren.type='triangle';sirenGain=gain(0)
  siren.connect(sirenGain).connect(buses.ambient);siren.start()
 }
 function volumes(){
  if(!ctx)return
  const live=active&&!hidden
  fade(master.gain,live?1:0,.08)
  fade(buses.music.gain,settings.music*(paused?.35:1),.14)
  fade(buses.effects.gain,paused?0:settings.effects)
  fade(buses.ambient.gain,settings.ambient*(paused?.20:1),.14)
 }
 function haltTracks(){
  for(const track of tracks){track.audio.pause();track.source.disconnect();track.gain.disconnect();track.audio.removeAttribute('src');track.audio.load()}
  tracks=[];targetTrack=null;cue=''
 }
 function syncMedia(){
  volumes()
  if(hidden||!active){haltTracks();if(hidden)ctx?.suspend().catch(()=>{});return}
  ctx?.resume().catch(()=>{})
 }
 async function enable(){
  try{
   if(!ctx)init()
   if(!ctx)return false
   await ctx.resume()
   if(ctx.state!=='running')return false
   active=true;settings.enabled=true;store();volumes();return true
  }catch{return false}
 }
 function startTrack(next){
  const choices=scores[next],song=choices.find(id=>id!==previousTrack)??choices[0]
  const audio=new browser.Audio('/assets/city-audio/'+song+'.mp3')
  const source=ctx.createMediaElementSource(audio),level=gain(0)
  source.connect(level).connect(buses.music)
  const track={audio,source,gain:level,stopAt:Infinity}
  for(const old of tracks){
   old.stopAt=Math.min(old.stopAt,ctx.currentTime+3.6);fade(old.gain.gain,0,.78)
  }
  if(tracks.length>1){tracks[0].stopAt=ctx.currentTime;cleanup()}
  tracks.push(track);targetTrack=track;cue=next
  audio.play().then(()=>{
   if(track===targetTrack){fade(level.gain,.73,.88);previousTrack=song}
  }).catch(()=>{track.stopAt=ctx.currentTime+.2;if(track===targetTrack)targetTrack=null})
 }
 function cleanup(){
  tracks=tracks.filter(track=>{
   if(track.stopAt>ctx.currentTime)return true
   track.audio.pause();track.source.disconnect();track.gain.disconnect()
   track.audio.removeAttribute('src');track.audio.load();return false
  })
 }
 function sound(name,p,amount=1,menu=false,ambient=false){
  if(!active||(paused&&!menu)||hidden||!(ambient?settings.ambient:settings.effects)||!sounds[name]||ctx.state!=='running')return
  const [freq,cut,length,level]=sounds[name],now=ctx.currentTime
  if((shots.get(name)??0)>now||shots.size>28)return
  const dx=p?p.x-listener.x:0,dz=p?p.z-listener.z:0,d=Math.hypot(dx,dz)
  const radius=name==='blast'?86:name==='pistol'||name==='shotgun'||name==='sniper'?56:29
  if(d>=radius)return
  shots.set(name,now+Math.min(.22,length*.65))
  const tone=ctx.createOscillator(),dust=ctx.createBufferSource(),hit=gain(0),sum=gain(1)
  const spread=.91+Math.random()*.18
  dust.buffer=noise;dust.playbackRate.value=spread
  filtered(dust,'lowpass',cut*spread,hit)
  const partial=gain(name==='horn'||name==='mission'||name==='buy'||name==='bird'||name==='gull'||name==='harborBell'?.75:.23)
  tone.type=name==='horn'?'triangle':'sine'
  tone.frequency.setValueAtTime(freq*spread,now)
  tone.frequency.exponentialRampToValueAtTime(freq*(name==='horn'?spread:name==='mission'?1.55:.61),now+length)
  tone.connect(partial).connect(hit)
  hit.gain.setValueAtTime(.001,now)
  hit.gain.exponentialRampToValueAtTime(level*amount*(menu?settings.effects:1)*Math.max(.05,(1-d/radius)**2),now+.014)
  hit.gain.exponentialRampToValueAtTime(.001,now+length)
  const pan=ctx.createStereoPanner?.()
  if(pan){pan.pan.value=Math.max(-.78,Math.min(.78,(dx*Math.cos(listener.yaw)+dz*Math.sin(listener.yaw))/Math.max(2.2,d)));hit.connect(pan).connect(sum)}
  else hit.connect(sum)
  sum.connect(menu?master:ambient?buses.ambient:buses.effects);if(!menu&&!ambient)sum.connect(echo)
  tone.start();tone.stop(now+length+.02)
  dust.start(now,Math.random()*.05);dust.stop(now+length+.014)
  tone.onended=()=>{for(const n of [tone,dust,partial,pan,hit,sum])n?.disconnect()}
 }
 return {
  settings,get active(){return active},get song(){return previousTrack},
  async toggle(){
   if(!active)return enable()
   active=false;settings.enabled=false;store();syncMedia();return false
  },
  gesture(){
   if(active&&ctx?.state==='suspended'&&!hidden){ctx.resume().catch(()=>{});return}
   if(settings.enabled&&!active&&!muted){muted=true;enable().finally(()=>{muted=false})}
  },
  set(key,value){
   if(key==='enabled'||!Object.hasOwn(defaults,key)||!Number.isFinite(value))return
   settings[key]=Math.max(0,Math.min(1,value));store();volumes()
  },
  pause(value){paused=value;volumes();if(value&&ctx)fade(motorGain.gain,0)},
  visibility(value){hidden=value;if(ctx)syncMedia()},
  sound,
  update(frame){
   listener=frame
   if(!active||hidden||ctx.state!=='running')return
   for(const [name,until] of shots)if(until<ctx.currentTime)shots.delete(name)
   cleanup()
   const zone=musicCue(frame)
   fade(buses.music.gain,settings.music*(paused?.35:frame.dialogue?.28:1),.23)
   if((!targetTrack||cue!==zone||targetTrack.audio.ended||targetTrack.audio.duration-targetTrack.audio.currentTime<3.4)&&
    ctx.currentTime-lastPlayback>1.4&&settings.music>0){
    lastPlayback=ctx.currentTime;startTrack(zone)
   }
   const {indoor,driving,car,harbor,wanted,t}=frame
   fade(roomFilter.frequency,indoor?1140:14000,.23);fade(echo.send.gain,indoor?.20:.035,.21)
   fade(windGain.gain,(indoor?.04:.25)*(frame.park?1.2:.67),.31)
   fade(waterGain.gain,harbor?(.14+.06*Math.sin(t*1.15))*(indoor?.42:1):frame.park?.047:0,.26)
   const nearby=frame.passing?Math.max(0,1-frame.passingDistance/32)*.18:0
   fade(cityGain.gain,(indoor?.065:.105)+nearby*(indoor?.24:1),.34)
   if(!paused&&!indoor&&t>nextAmbience&&(harbor||frame.park)){
    const kind=harbor?(Math.random()<.67?'gull':'harborBell'):'bird'
    sound(kind,{x:frame.x+(harbor?12:-9),z:frame.z-6},1,false,true)
    nextAmbience=t+5+Math.random()*6
   }
   fade(siren.frequency,710+230*Math.sin(t*4.4),.13)
   fade(sirenGain.gain,wanted&&frame.policeDistance<72?.05*(1-frame.policeDistance/72):0,.28)
   const speed=Math.abs(car.speed),band=speed<3?0:speed<8?1:speed<14?2:3
   fade(motor.frequency,(car.setup.bike?56:38)+speed*(car.setup.bike?5.1:2.9)+Math.max(0,car.accel)*4-band*5,.09)
   fade(motorGain.gain,driving&&!paused?.07+Math.min(.055,speed*.003):0,.13)
   fade(roadGain.gain,driving&&!paused?Math.min(.2,speed*.014):0,.18)
   if(driving&&band>velocityBand)sound('gear',null,.65)
   if(driving&&car.braking&&speed>5)sound('tire',null,.46)
   velocityBand=band
  }
 }
}
