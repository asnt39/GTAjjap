import {createRoomServer} from './rooms.js'

const origins=(process.env.HARBORLINE_ORIGINS??'').split(',').map(value=>value.trim()).filter(Boolean)
const host=process.env.HARBORLINE_HOST??'127.0.0.1'
const port=Number(process.env.PORT??8787)
const rooms=createRoomServer({origins})
rooms.server.listen(port,host,()=>console.log('HARBORLINE room server listening on %s:%d',host,port))
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>rooms.close())
