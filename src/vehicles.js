// Stable IDs and spawn poses are shared with the room server.
const touring = {top:16, reverse:4.8, power:4.8, reversePower:3.2, brake:9.1,
 handbrake:11.2, steer:.57, steerRate:1.85, wheelbase:.63, camera:2.2, cameraHeight:1.22}

export const vehicles = Object.freeze({
 touring:Object.freeze({...touring, name:'Touring', x:4.92, z:12, heading:0, width:2.024, length:4.15, height:1.257}),
 sport:Object.freeze({...touring, name:'Sprint', x:-4.86, z:6, heading:0, width:1.94, length:4.32, height:1.31,
  top:21, power:6.2, brake:11, steer:.62, steerRate:2.22, wheelbase:.62, camera:2.4}),
 van:Object.freeze({...touring, name:'Dock Van', x:-4.86, z:-18, heading:0, width:2.11, length:4.72, height:2.16,
  doorZ:-.23, cabinZ:-1.09, seatLift:.43, crouchDrop:.31, top:13, power:3.55, brake:8, steer:.52, steerRate:1.5, wheelbase:.68, camera:2.95, cameraHeight:1.74})
})

export const touringSetup=vehicles.touring

// The deployed room server still validates its original speed limits.
export function soloRoadTuning(setup){
 if(setup.bike)return null
 if(setup.top>=20)return {top:32,power:8.3,brake:13.1,handbrake:14.4,weight:.79}
 if(setup.top<=14)return {top:21,power:4.9,brake:9.25,handbrake:10.4,weight:1.28}
 return {top:25,power:6.25,brake:10.8,handbrake:12.3,weight:1}
}
