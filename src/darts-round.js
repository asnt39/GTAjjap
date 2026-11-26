export function dartScore(power){
 const error=Math.abs(power-.61)
 return error<.035?50:error<.10?25:error<.19?15:error<.32?5:0
}
export function dartPower(elapsed){return 1-Math.abs(elapsed%1.8/.9-1)}
