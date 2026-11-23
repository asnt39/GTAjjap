// Height is the absolute position of the soles. The caller supplies the floor under them.
const launch=5.25, gravity=13.8
export function createFootwork(){
 let preference='toggle'
 try{if(localStorage.getItem('harborline.runMode.v3')==='hold')preference='hold'}catch{}
 const state={
  height:0,vertical:0,flight:0,air:false,land:0,sprint:false,jumpDelay:0,
  get canJump(){return !state.air&&state.jumpDelay===0},
  get preference(){return preference},
  changePreference(){preference=preference==='toggle'?'hold':'toggle';state.sprint=false;try{localStorage.setItem('harborline.runMode.v3',preference)}catch{}},
  shift(){if(preference==='toggle')state.sprint=!state.sprint},
  jump(){if(!state.canJump)return false;state.vertical=launch;state.flight=0;state.air=true;state.land=0;return true},
  reset(floor){Object.assign(state,{height:floor,vertical:0,air:false,flight:0,land:0,jumpDelay:0})},
  advance(dt,floor=0,maxHeight=Infinity){
   state.jumpDelay=Math.max(0,state.jumpDelay-dt)
   if(!state.air && state.height-floor>.135){
    state.air=true;state.vertical=0;state.flight=.23
   }

   if(state.air){
    state.height+=state.vertical*dt-gravity*dt*dt/2;state.vertical-=gravity*dt;state.flight+=dt
    if(state.height>maxHeight){state.height=maxHeight;state.vertical=Math.min(0,state.vertical)}
    if(state.vertical<=0&&state.height<=floor){
     const force=-state.vertical
     state.height=floor;state.vertical=0;state.air=false;state.land=1;state.jumpDelay=.055
     return force
    }
   }else{state.height=floor;state.land=Math.max(0,state.land-dt*5.7)}
  },
  get phase(){return state.air?Math.min(1,state.flight/(2*launch/gravity)):null},
  rate(held,stick){
   const analog=Math.max(0,Math.min(1,(stick-.65)/.32))
   return 1.85+(6.8-1.85)*((preference==='hold'?held:state.sprint)?1:analog*analog*(3-2*analog))
  }
 }
 return state
}
