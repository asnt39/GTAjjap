// Stable IDs and spawn poses are shared with the room server.
const touring = {top:16, reverse:4.8, power:3.9, reversePower:2.8, brake:8.2,
 handbrake:10.5, steer:.57, steerRate:1.6, wheelbase:.63, camera:2.2, cameraHeight:1.22}

export const vehicles = Object.freeze({
 touring:Object.freeze({...touring, name:'Touring', x:4.92, z:12, heading:0, width:2.024, length:4.15, height:1.257}),
 sport:Object.freeze({...touring, name:'Sprint', x:-4.86, z:6, heading:0, width:1.94, length:4.32, height:1.31,
  top:21, power:5.1, brake:10.2, steer:.62, steerRate:2, wheelbase:.62, camera:2.4}),
 van:Object.freeze({...touring, name:'Dock Van', x:-4.86, z:-18, heading:0, width:2.11, length:4.72, height:2.16,
  doorZ:-.23, cabinZ:-1.09, seatLift:.43, crouchDrop:.31, top:13, power:2.8, brake:7.25, steer:.52, steerRate:1.3, wheelbase:.68, camera:2.95, cameraHeight:1.74})
})

export const touringSetup=vehicles.touring
