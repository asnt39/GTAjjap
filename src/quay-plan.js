// Measured top of the existing 16.06 × 114 m terminal deck. Leave the
// outer coping on the waterside of the handrail.
export const quayApron=[9.98,25.46,-70.83,42.83]
export const onQuay=(x,z,r=0)=>x>=quayApron[0]+r&&x<=quayApron[1]-r&&z>=quayApron[2]+r&&z<=quayApron[3]-r
