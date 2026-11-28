const settingsKey='harborline.audio.v1'
const defaults={music:.45,effects:.65,ambient:.65,voice:.9,enabled:false}
const scores={
 explore:['market-lights','after-hours','last-ferry'],night:['after-hours','last-ferry'],drive:['causeway','after-hours'],
 harbor:['last-ferry','after-hours'],danger:['blue-beacons','crosswind'],story:['crosswind','after-hours'],radio:['causeway','after-hours','market-lights'],chase:['ambush-chase']
}
const scoreLevel={explore:.43,night:.40,drive:.44,harbor:.42,danger:.54,story:.45,radio:.68,chase:.54}
const firearmReports={pistol:{level:.68,interval:.043},shotgun:{level:.82,interval:.07},sniper:{level:.76,interval:.07}}
const drivingReports={engineStart:{clip:'ignition',level:.74},brake:{clip:'brake',level:.42}}
const fieldReports={
 asphalt:['stone01'],concrete:['stone01'],wood:['wood01','wood02','wood03'],
 stairs:['wood01','wood02','wood03'],grass:['leaves01','leaves02','mud02'],
 sand:['gravel','mud02'],blast:['blast']
}
const shiftSpeeds={bike:[4.5,9.5,15.5,23,31],sport:[6.5,13,20,27,34],car:[5,10.5,16.5,22,27]}
const unit=value=>Math.min(1,Math.max(0,value))
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
 tire:[55,920,.17,.17],brake:[140,1900,.31,.21],gear:[67,390,.16,.12],bird:[1660,2300,.23,.07],gull:[980,1400,.38,.13],
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
export function musicCue({wanted,combat,radio,driving,story,harbor,night,chase}){
 return chase?'chase':radio&&driving?'radio':wanted||combat?'danger':story?'story':driving?'drive':harbor?'harbor':night?'night':'explore'
}
export function cityAudio(browser=globalThis){
 let storage
 try{storage=browser.localStorage}catch{}
 const settings=readMixer(storage)
 let ctx,master,buses,roomFilter,echo,windGain,waterGain,cityGain,motor,motorGain,motorHarmonic,harmonicGain,motorFilter,roadGain,traction,siren,sirenGain,noise,spatialWind
 let active=false,paused=false,hidden=false,dead=false,deathTitlePlayed=false,listener={x:0,z:0,yaw:0},muted=false,cue='',previousTrack=''
 let tracks=[],targetTrack=null,lastPlayback=0,velocityBand=0,drivenCar=null,shiftUntil=0,nextAmbience=0,brakeActive=false
 const shots=new Map(),roadClips=new Map(),firearmClips=new Map(),fieldClips=new Map()
 let roadMedia=null,loadingRoad=false,firearmsRequested=false,fieldRequested=false
 function store(){try{storage?.setItem(settingsKey,JSON.stringify(settings))}catch{}}
 function fade(param,value,seconds=.10){param.setTargetAtTime(value,ctx.currentTime,seconds)}
 function filtered(source,type,freq,target){
  const filter=ctx.createBiquadFilter();filter.type=type;filter.frequency.value=freq
  source.connect(filter).connect(target)
  return filter
 }
 function gain(value){const g=ctx.createGain();g.gain.value=value;return g}
 function noiseLoop(type,hz,target=buses.ambient){
  const source=ctx.createBufferSource(),level=gain(0)
  source.buffer=spatialWind;source.loop=true;filtered(source,type,hz,level);level.connect(target);source.start()
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
  roadGain=noiseLoop('highpass',680,buses.effects);traction=noiseLoop('bandpass',1680,buses.effects)
  siren=ctx.createOscillator();siren.type='triangle';sirenGain=gain(0)
  siren.connect(sirenGain).connect(buses.ambient);siren.start()
 }
 function musicVolume(){
  return settings.music*(dead?.08:paused?.35:listener.dialogue?.24:1)
 }
 function volumes(){
  if(!ctx)return
  const live=active&&!hidden
  fade(master.gain,live?1:0,.08)
  fade(buses.music.gain,musicVolume(),dead?.34:.14)
  fade(buses.effects.gain,settings.effects*(paused?0:dead?.34:1))
  fade(buses.ambient.gain,settings.ambient*(dead?.30:paused?.20:1),dead?.28:.14)
 }
 function deathCue(){
  if(!active||paused||hidden||!settings.effects||ctx.state!=='running')return
  const now=ctx.currentTime
  const breath=ctx.createBufferSource(),tone=ctx.createOscillator()
  const level=gain(0),resonance=gain(0)
  const filter=filtered(breath,'lowpass',520,level)
  breath.buffer=noise;breath.playbackRate.value=.86
  filter.frequency.setValueAtTime(520,now)
  filter.frequency.exponentialRampToValueAtTime(160,now+.62)
  level.gain.setValueAtTime(.001,now)
  level.gain.exponentialRampToValueAtTime(Math.max(.001,settings.effects*.29),now+.045)
  level.gain.exponentialRampToValueAtTime(.001,now+.64)
  level.connect(master)
  tone.type='sine'
  tone.frequency.setValueAtTime(87,now)
  tone.frequency.exponentialRampToValueAtTime(53,now+.60)
  resonance.gain.setValueAtTime(.001,now)
  resonance.gain.exponentialRampToValueAtTime(Math.max(.001,settings.effects*.31),now+.095)
  resonance.gain.exponentialRampToValueAtTime(.001,now+.72)
  tone.connect(resonance).connect(master)
  breath.onended=()=>{breath.disconnect();filter.disconnect();level.disconnect()}
  tone.onended=()=>{tone.disconnect();resonance.disconnect()}
  breath.start(now);breath.stop(now+.66)
  tone.start(now);tone.stop(now+.74)
 }
 function death(value){
  if(dead===value)return
  dead=value;deathTitlePlayed=false
  volumes()
  if(dead)deathCue()
 }
 function deathTitle(){
  if(!dead||deathTitlePlayed||!active||hidden||paused||!settings.effects||ctx?.state!=='running')return
  deathTitlePlayed=true
  const now=ctx.currentTime,tone=ctx.createOscillator(),level=gain(0)
  tone.type='triangle'
  tone.frequency.setValueAtTime(102,now)
  tone.frequency.exponentialRampToValueAtTime(43,now+.37)
  level.gain.setValueAtTime(.001,now)
  level.gain.exponentialRampToValueAtTime(Math.max(.001,settings.effects*.27),now+.022)
  level.gain.exponentialRampToValueAtTime(.001,now+.44)
  tone.connect(level).connect(master)
  tone.onended=()=>{tone.disconnect();level.disconnect()}
  tone.start(now);tone.stop(now+.45)
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
   active=true;settings.enabled=true;store();volumes();prepareFirearms();prepareField();return true
  }catch{return false}
 }
 function startTrack(next){
  const choices=scores[next],song=choices[(choices.indexOf(previousTrack)+1)%choices.length]
  const path='/assets/city-audio/'+song+'.mp3'
  const audio=new browser.Audio(browser.harborPreviewAssets?.[path]??path)
  audio.loop=next==='chase'
  const source=ctx.createMediaElementSource(audio),level=gain(0)
  source.connect(level).connect(buses.music)
  const track={audio,source,gain:level,stopAt:Infinity}
  for(const old of tracks){
   old.stopAt=Math.min(old.stopAt,ctx.currentTime+3.6);fade(old.gain.gain,0,.78)
  }
  if(tracks.length>1){tracks[0].stopAt=ctx.currentTime;cleanup()}
  tracks.push(track);targetTrack=track;cue=next
  audio.play().then(()=>{
   if(track===targetTrack){fade(level.gain,scoreLevel[next],.88);previousTrack=song}
  }).catch(()=>{track.stopAt=ctx.currentTime+.2;if(track===targetTrack)targetTrack=null})
 }
 function cleanup(){
  tracks=tracks.filter(track=>{
   if(track.stopAt>ctx.currentTime)return true
   track.audio.pause();track.source.disconnect();track.gain.disconnect()
   track.audio.removeAttribute('src');track.audio.load();return false
  })
 }
 async function loadClip(path){
  const response=await browser.fetch(browser.harborPreviewAssets?.[path]??path)
  return response.ok?ctx.decodeAudioData(await response.arrayBuffer()):null
 }
 function prepareFirearms(){
  if(firearmsRequested||!browser.fetch)return
  firearmsRequested=true
  for(const name of Object.keys(firearmReports)){
   loadClip('/assets/city-audio/'+name+'.wav').then(clip=>{
    if(clip)firearmClips.set(name,clip)
   }).catch(()=>{})
  }
 }
 function prepareField(){
  if(fieldRequested||!browser.fetch)return
  fieldRequested=true
  for(const name of new Set(Object.values(fieldReports).flat())){
   loadClip('/assets/field-audio/'+name+'.wav').then(clip=>{
    if(clip)fieldClips.set(name,clip)
   }).catch(()=>{})
  }
 }
 function prepareRoad(){
  if(roadMedia||loadingRoad||!browser.fetch)return
  loadingRoad=true
  const library=['rpm-low','rpm-high','skid',...Object.values(drivingReports).map(report=>report.clip)]
  Promise.allSettled(library.map(async id=>{
   const clip=await loadClip('/assets/driving-audio/'+id+'.wav')
   if(clip)roadClips.set(id,clip)
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
 function position(dx,dz,distance){
  const pan=ctx.createStereoPanner?.()
  if(pan)pan.pan.value=Math.max(-.78,Math.min(.78,(dx*Math.cos(listener.yaw)+dz*Math.sin(listener.yaw))/Math.max(2.2,distance)))
  return pan
 }
 function playClip(clip,volume,pan,target,rate,cut,reflect){
  const source=ctx.createBufferSource(),level=gain(volume)
  source.buffer=clip;source.playbackRate.value=rate
  const filter=cut?filtered(source,'lowpass',cut,level):null
  if(!filter)source.connect(level)
  if(pan)level.connect(pan)
  const output=pan??level
  output.connect(target)
  if(reflect)output.connect(echo)
  source.onended=()=>{for(const node of [source,filter,level,pan])node?.disconnect()}
  source.start()
 }
 function sound(name,p,amount=1,menu=false,ambient=false){
  if(!active||(paused&&!menu)||hidden||!(ambient?settings.ambient:settings.effects)||!sounds[name]||ctx.state!=='running')return
  const [freq,cut,length,level]=sounds[name],now=ctx.currentTime
  if((shots.get(name)??0)>now||shots.size>28)return
  const dx=p?p.x-listener.x:0,dz=p?p.z-listener.z:0,d=Math.hypot(dx,dz)
  const report=firearmReports[name]
  const radius=name==='blast'?86:report?72:29
  if(d>=radius)return
  shots.set(name,now+(report?.interval??Math.min(.22,length*.65)))
  const target=menu?master:ambient?buses.ambient:buses.effects
  const near=1-d/radius
  const attenuation=Math.max(report?0:.05,near*near)*(menu?settings.effects:1)*amount
  const pan=position(dx,dz,d)
  const drivingReport=drivingReports[name]
  const variants=fieldReports[name]?.map(id=>fieldClips.get(id)).filter(Boolean)
  const fieldClip=variants?.length?variants[Math.floor(Math.random()*variants.length)]:null
  const clip=report?firearmClips.get(name):fieldClip??roadClips.get(drivingReport?.clip)
  if(clip){
   playClip(clip,attenuation*(report?.level??drivingReport?.level??level),pan,target,.97+Math.random()*.06,
    report?650+near*near*14000:null,!!report&&!menu&&!ambient)
   return
  }
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
  hit.gain.exponentialRampToValueAtTime(Math.max(.001,level*attenuation),now+(report ? .004 : .014))
  hit.gain.exponentialRampToValueAtTime(.001,now+length)
  if(pan)hit.connect(pan).connect(sum)
  else hit.connect(sum)
  sum.connect(target);if(!menu&&!ambient)sum.connect(echo)
  tone.start();tone.stop(now+length+.02)
  dust.start(now,Math.random()*.05);dust.stop(now+length+.014)
  tone.onended=()=>{for(const n of [tone,dust,partial,pan,hit,sum])n?.disconnect()}
 }
 return {
  prepareDrive(){if(active)prepareRoad()},deathTitle,
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
  pause(value){paused=value;volumes();if(value&&ctx)fade(motorGain.gain,0);for(const track of tracks){if(value)track.audio.pause();else if(active&&!hidden)track.audio.play().catch(()=>{})}},
  visibility(value){hidden=value;if(ctx)syncMedia()},
  death,
  sound,
  update(frame){
   listener=frame
   if(typeof frame.dead==='boolean')death(frame.dead)
   if(!active||hidden||ctx.state!=='running')return
   for(const [name,until] of shots)if(until<ctx.currentTime)shots.delete(name)
   cleanup()
   const zone=musicCue(frame)
   fade(buses.music.gain,musicVolume(),dead?.34:.23)
   if(!dead&&!paused&&(!targetTrack||cue!==zone||targetTrack.audio.ended||cue!=='chase'&&targetTrack.audio.duration-targetTrack.audio.currentTime<3.4)&&
    ctx.currentTime-lastPlayback>1.4&&settings.music>0){
    lastPlayback=ctx.currentTime;startTrack(zone)
   }
   const {indoor,driving,car,harbor,wanted,t,boat,underwater,coastal}=frame
   if(driving||frame.passing)prepareRoad()
   fade(roomFilter.frequency,underwater?420:dead?760:indoor?1140:14000,.23);fade(echo.send.gain,indoor?.20:.035,.21)
   fade(windGain.gain,underwater?.025:(indoor?.04:.25)*(frame.park?1.2:.67),.31)
   fade(waterGain.gain,underwater?.16:coastal?.29+.12*Math.sin(t*1.45):harbor?(.14+.06*Math.sin(t*1.15))*(indoor?.42:1):frame.park?.047:0,.26)
   const nearby=frame.passing?Math.max(0,1-frame.passingDistance/32)*.18:0
   fade(cityGain.gain,(indoor?.065:.105)+nearby*(indoor?.24:1),.34)
   if(!dead&&!paused&&!indoor&&t>nextAmbience&&(harbor||frame.park)){
    const kind=harbor?(Math.random()<.67?'gull':'harborBell'):'bird'
    sound(kind,{x:frame.x+(harbor?12:-9),z:frame.z-6},1,false,true)
    nextAmbience=t+5+Math.random()*6
   }
   fade(siren.frequency,710+230*Math.sin(t*4.4),.13)
   fade(sirenGain.gain,wanted&&frame.policeDistance<72?.05*(1-frame.policeDistance/72):0,.28)
   const speed=Math.abs(car.speed),bike=car.setup.bike,sport=car.setup.top>=20
   const driveLevel=driving&&!paused&&!dead?1:0
   const throttle=unit(Math.abs(car.throttle??0))
   const gears=shiftSpeeds[bike?'bike':sport?'sport':'car']
   const engaged=driving&&car.speed>=0
   if(!driving||drivenCar!==car){
    velocityBand=engaged?gears.slice(0,-1).filter(limit=>speed>limit).length:0
    shiftUntil=0;drivenCar=driving?car:null;brakeActive=false
   }else if(engaged&&velocityBand<gears.length-1&&speed>gears[velocityBand]+.35){
    velocityBand++;shiftUntil=ctx.currentTime+.17
    if(throttle>.24&&driveLevel)sound('gear',null,.38)
   }else if(velocityBand&&(!engaged||speed<gears[velocityBand-1]-.95)){
    velocityBand--;shiftUntil=ctx.currentTime+.10
   }
   const shifting=ctx.currentTime<shiftUntil
   const lower=gears[velocityBand-1]??0,upper=engaged?gears[velocityBand]:car.setup.reverse??5
   const gearProgress=unit((speed-lower)/Math.max(1,upper-lower))
   const rpm=unit((velocityBand?.37:0)+gearProgress*(velocityBand?.48:.86)+throttle*.14-(shifting?.12:0))
   const marineSpeed=Math.abs(boat?.speed??0),marineRPM=boat?Math.min(1,marineSpeed/boat.top+.21*Math.abs(boat.throttle??0)):0
   const sportBoat=boat?.id==='launch'
   const pitch=boat?(sportBoat?57:45)+marineRPM*(sportBoat?118:85):
    (bike?58:sport?40:34)+(bike?158:sport?108:87)*rpm+throttle*9
   fade(motor.frequency,pitch,.11);fade(motorHarmonic.frequency,pitch*(boat?2.14:bike?2.03:sport?2.50:1.51),.105)
   fade(harmonicGain.gain,boat?.33:bike?.50:sport?.34:.18,.12)
   fade(motorFilter.frequency,boat?340+marineRPM*480:(bike?970:sport?740:420)+throttle*690,.18)
   const synthetic=roadMedia?.low&&roadMedia.high&&!bike ? .19 : 1
   fade(motorGain.gain,boat&&!paused&&!dead?.037+marineRPM*.086:driveLevel*(.037+rpm*.039+throttle*.075)*synthetic,.13)
   fade(roadGain.gain,boat&&!paused&&!dead?Math.min(.15,marineSpeed*.018):driveLevel*Math.min(.19,speed*.012),.18)
   const slip=Math.abs(car.slip??0)
   const scrub=unit((speed-2.8)/8)*unit(slip*3.8)
   const skid=scrub**1.5
   const deceleration=-(car.accel??0)*Math.sign(car.speed)
   const brakePressure=unit((speed-2.8)/8)*unit((deceleration-1.8)/4.2)
   if(!car.braking)brakeActive=false
   else if(driveLevel&&!brakeActive&&brakePressure>.18){
    sound('brake',null,(.54+.46*brakePressure)*(1-.35*scrub))
    brakeActive=true
   }
   fade(traction.gain,driveLevel*scrub*(roadMedia?.skid ? .16 : .30),scrub>.2?.07:.15)
   function mix(loop,level,rate,seconds=.13){
    if(loop){fade(loop.level.gain,level,seconds);fade(loop.source.playbackRate,rate,.17)}
   }
   const loaded=driveLevel*(bike?.07:.34)*(sport?1.12:1)*(.43+throttle*.57)*(shifting?.59:1)
   const crossfade=unit((pitch-53)/40)
   const blend=crossfade*crossfade*(3-2*crossfade)
   mix(roadMedia?.low,loaded*(1-blend),pitch/42.8)
   mix(roadMedia?.high,loaded*blend,pitch/76.2)
   mix(roadMedia?.skid,driveLevel*skid*.67,.82+Math.min(.36,speed*.015),skid>.08?.07:.11)
   const passing=roadMedia?.passing
   if(passing){
    mix(passing,nearby*(indoor?.21:.79),.75+Math.abs(frame.passing?.speed??0)*.032)
    if(passing.pan&&frame.passing){
     const lateral=(frame.passing.x-frame.x)*Math.cos(frame.yaw)+(frame.passing.z-frame.z)*Math.sin(frame.yaw)
     fade(passing.pan.pan,Math.max(-.8,Math.min(.8,lateral/Math.max(2,frame.passingDistance))),.13)
    }
   }
  }
 }
}
