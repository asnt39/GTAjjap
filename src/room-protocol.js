export const MAX_PLAYERS=4
export const TICK_MS=67
export const MESSAGE_BYTES=1024
export const ROOM_PATH='/harborline'
export const ROOM_CODE=/^[A-F0-9]{12}$/

export const packPlayer=p=>[p.x,p.z,p.y,p.face,p.speed,p.jump,p.land,p.visible,p.crouch,p.reach,p.side]
export const unpackPlayer=([x,z,y,face,speed,jump,land,visible,crouch,reach,side])=>({x,z,y,face,speed,jump,land,visible,crouch,reach,side})
export const packVehicle=v=>[v.x,v.z,v.heading,v.speed,v.steer,v.accel,v.braking,v.door]
export const unpackVehicle=([x,z,heading,speed,steer,accel,braking,door])=>({x,z,heading,speed,steer,accel,braking,door})

export const wrapAngle=value=>Math.atan2(Math.sin(value),Math.cos(value))
