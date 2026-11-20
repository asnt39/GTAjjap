import {createRoomServer} from './rooms.js'

const origins=(process.env.HARBORLINE_ORIGINS??'').split(',').map(value=>value.trim()).filter(Boolean)
const host=process.env.HARBORLINE_HOST??process.env.HOST??'127.0.0.1'
const port=Number(process.env.PORT??8787)
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535')
if(!['localhost','127.0.0.1','::1'].includes(host)&&!origins.length){
 throw new Error('Set HARBORLINE_ORIGINS before binding the room server to a public interface')
}
const rooms=createRoomServer({origins})
rooms.server.listen(port,host,()=>console.log('HARBORLINE room server listening on %s:%d',host,port))
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>rooms.close())
