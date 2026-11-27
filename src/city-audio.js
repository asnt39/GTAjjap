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
 harborBell:[510,1230,.42,.14],wallHit:[91,1200,.11,.13],
 sand:[69,610,.115,.095],splash:[83,2180,.34,.19],boatStart:[47,580,.52,.19]
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
 let ctx,master,buses,roomFilter,echo,windGain,waterGain,cityGain,motor,motorGain,motorHarmonic,harmonicGain,motorFilter,roadGain,traction,siren,sirenGain,noise,spatialWind
 let active=false,paused=false,hidden=false,listener={x:0,z:0,yaw:0},muted=false,cue='',previousTrack=''
 let tracks=[],targetTrack=null,lastPlayback=0,velocityBand=0,nextAmbience=0
 const shots=new Map(),roadClips=new Map()
 let roadMedia=null,loadingRoad=false
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
  motorFilter=filtered(motor,'lowpass',370,motorGain)
  motorHarmonic=ctx.createOscillator();motorHarmonic.type='sawtooth';harmonicGain=gain(0)
  motorHarmonic.connect(harmonicGain).connect(motorFilter);motorHarmonic.start()
  motorGain.connect(buses.effects);motor.start()
  roadGain=noiseLoop('highpass',680);traction=noiseLoop('bandpass',1680)
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
 function prepareRoad(){
  if(roadMedia||loadingRoad||!browser.fetch)return
  loadingRoad=true
  const library=['rpm-low','rpm-high','skid','ignition']
  Promise.allSettled(library.map(async id=>{
   const res=await browser.fetch('/assets/driving-audio/'+id+'.wav')
   if(!res.ok)return
   roadClips.set(id,await ctx.decodeAudioData(await res.arrayBuffer()))
  })).then(()=>{
   function loop(id,target,positioned=false){
    const buffer=roadClips.get(id)
    if(!buffer)return null
    const source=ctx.createBufferSource(),level=gain(0)
    const pan=positioned?ctx.createStereoPanner?.():null
    source.buffer=buffer;source.loop=true
    source.connect(level)
    if(pan)level.connect(pan).connect(target);else level.connect(target)
    source.start()
    return {source,level,pan}
   }
   roadMedia={low:loop('rpm-low',buses.effects),high:loop('rpm-high',buses.effects),
    skid:loop('skid',buses.effects),passing:loop('rpm-low',buses.ambient,true)}
  })
 }
 function sampleIgnition(level){
  const clip=roadClips.get('ignition')
  if(!clip)return false
  const source=ctx.createBufferSource(),volume=gain(level*.36)
  source.buffer=clip;source.connect(volume).connect(buses.effects);source.start()
  source.onended=()=>{source.disconnect();volume.disconnect()}
  return true
 }
 function sound(name,p,amount=1,menu=false,ambient=false){
  if(!active||(paused&&!menu)||hidden||!(ambient?settings.ambient:settings.effects)||!sounds[name]||ctx.state!=='running')return
  const [freq,cut,length,level]=sounds[name],now=ctx.currentTime
  if((shots.get(name)??0)>now||shots.size>28)return
  const dx=p?p.x-listener.x:0,dz=p?p.z-listener.z:0,d=Math.hypot(dx,dz)
  const radius=name==='blast'?86:name==='pistol'||name==='shotgun'||name==='sniper'?56:29
  if(d>=radius)return
  shots.set(name,now+Math.min(.22,length*.65))
  if(name==='engineStart'&&sampleIgnition(amount))return
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
  prepareDrive(){if(active)prepareRoad()},
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
   const {indoor,driving,car,harbor,wanted,t,boat,underwater,coastal}=frame
   if(driving||frame.passing)prepareRoad()
   fade(roomFilter.frequency,underwater?420:indoor?1140:14000,.23);fade(echo.send.gain,indoor?.20:.035,.21)
   fade(windGain.gain,underwater?.025:(indoor?.04:.25)*(frame.park?1.2:.67),.31)
   fade(waterGain.gain,underwater?.16:coastal?.29+.12*Math.sin(t*1.45):harbor?(.14+.06*Math.sin(t*1.15))*(indoor?.42:1):frame.park?.047:0,.26)
   const nearby=frame.passing?Math.max(0,1-frame.passingDistance/32)*.18:0
   fade(cityGain.gain,(indoor?.065:.105)+nearby*(indoor?.24:1),.34)
   if(!paused&&!indoor&&t>nextAmbience&&(harbor||frame.park)){
    const kind=harbor?(Math.random()<.67?'gull':'harborBell'):'bird'
    sound(kind,{x:frame.x+(harbor?12:-9),z:frame.z-6},1,false,true)
    nextAmbience=t+5+Math.random()*6
   }
   fade(siren.frequency,710+230*Math.sin(t*4.4),.13)
   fade(sirenGain.gain,wanted&&frame.policeDistance<72?.05*(1-frame.policeDistance/72):0,.28)
   const speed=Math.abs(car.speed),bike=car.setup.bike,sport=car.setup.top>=20
   const ratios=bike?[4,9,15]:sport?[6,12,20]:[4.6,9.5,15]
   const band=ratios.reduce((n,v)=>n+(speed>v?1:0),0)
   const rpm=Math.min(1,Math.max(0,(speed-(ratios[band-1]??0)*.78)/(ratios[band]??29)))
   const throttle=Math.max(0,Math.min(1,(car.throttle??0)+Math.max(0,car.accel)*.075))
   const marineSpeed=Math.abs(boat?.speed??0),marineRPM=boat?Math.min(1,marineSpeed/boat.top+.21*Math.abs(boat.throttle??0)):0
   const sportBoat=boat?.id==='launch'
   const pitch=boat?(sportBoat?57:45)+marineRPM*(sportBoat?118:85):
    (bike?68:sport?49:37)+(bike?183:sport?152:114)*rpm+throttle*22
   fade(motor.frequency,pitch,.11);fade(motorHarmonic.frequency,pitch*(boat?2.14:bike?2.03:sport?2.50:1.51),.105)
   fade(harmonicGain.gain,boat?.33:bike?.50:sport?.34:.18,.12)
   fade(motorFilter.frequency,boat?340+marineRPM*480:(bike?970:sport?740:420)+throttle*690,.18)
   const driveLevel=driving&&!paused?1:0
   const synthetic=roadMedia?.low&&!bike ? .57 : 1
   fade(motorGain.gain,boat&&!paused?.037+marineRPM*.086:driveLevel*(.049+rpm*.053+throttle*.095)*synthetic,.13)
   fade(roadGain.gain,boat&&!paused?Math.min(.15,marineSpeed*.018):driving&&!paused?Math.min(.19,speed*.012):0,.18)
   const slip=Math.abs(car.slip??0)
   const skid=Math.min(.26,slip*.74+(car.braking?Math.max(0,speed-5)*.007:0))
   fade(traction.gain,driveLevel*skid*(roadMedia?.skid ? .38 : 1),.17)
   function mix(loop,level,rate){
    if(loop){fade(loop.level.gain,level,.15);fade(loop.source.playbackRate,rate,.14)}
   }
   const loaded=driveLevel*(bike?.09:.31)*(sport?1.13:1)
   const blend=Math.max(0,Math.min(1,(rpm-.18)/.58))
   mix(roadMedia?.low,loaded*(1-blend)*(throttle*.42+.58),.69+rpm*.86+(bike?.22:0))
   mix(roadMedia?.high,loaded*blend*(throttle*.55+.48),.76+rpm*.63+(bike?.26:0))
   mix(roadMedia?.skid,driveLevel*skid*.83,.91+Math.min(.30,speed*.013))
   const passing=roadMedia?.passing
   if(passing){
    mix(passing,nearby*(indoor?.21:.79),.75+Math.abs(frame.passing?.speed??0)*.032)
    if(passing.pan&&frame.passing){
     const lateral=(frame.passing.x-frame.x)*Math.cos(frame.yaw)+(frame.passing.z-frame.z)*Math.sin(frame.yaw)
     fade(passing.pan.pan,Math.max(-.8,Math.min(.8,lateral/Math.max(2,frame.passingDistance))),.13)
    }
   }
   if(driving&&band!==velocityBand&&speed>2)sound('gear',null,.68)
   velocityBand=band
  }
 }
}
