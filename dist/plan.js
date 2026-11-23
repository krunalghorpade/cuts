// Plan coordinates are metres. North is negative Z on both levels.
export const rise = 4.2;
export const rooms = [
  {id:'cinema', name:'Private movie theatre', floor:1, bounds:[-8,-6,0,6], spawn:[-1.35,3.25,.29]},
  {id:'television', name:'TV room', floor:1, bounds:[0,-6,8,6], spawn:[1.24,2.7,-.35]},
  {id:'shop', name:'Clothing shop', floor:1, bounds:[-13,6,-4,11], spawn:[-6.2,7.15,1.5]},
  {id:'bed', name:'Bedroom', floor:1, bounds:[8,-9,15,-1], spawn:[9.3,-2.3,-.5]},
  {id:'bath', name:'Washroom', floor:1, bounds:[8,-1,13,3], spawn:[9.1,1.3,-1.4]},
  {id:'kitchen', name:'Kitchen', floor:1, bounds:[8,3,14,9], spawn:[9.2,4.4,-2.3]},
  {id:'music', name:'Music room', floor:2, bounds:[-8,-6,0,6], spawn:[-5.55,2.68,2.36]},
  {id:'gaming', name:'Modern gaming room', floor:2, bounds:[0,-6,8,6], spawn:[2.00,2.6,-.40]},
  {id:'library', name:'Book library', floor:2, bounds:[-13,6,-4,11], spawn:[-6.1,7.3,1.5]},
  {id:'retro', name:'Retro Gaming Room', floor:2, bounds:[8,-9,15,-1], spawn:[9.65,-2.25,-Math.PI/2]},
  {id:'collect', name:'Collectibles', floor:2, bounds:[8,3,14,9], spawn:[9.3,4.4,-2.35]}
];
export const stair = [-12,-9,-8,-2];
export const doorways = [
  ['x',-8,-4,-2.3,'Stairs'], ['z',6,-7.6,-5.65,'West wing'],
  ['x',8,-3.15,-1.35,'East wing'], ['x',8,.3,2,'Washroom'], ['x',8,3.45,5.35,'Kitchen']
];
export function openingsFor(level){
  return [...doorways.filter(o=>level===1||o[4]!=='Washroom'), ['x',0,2.82,4.55,level===1?'TV room':'Modern gaming room']];
}
export const fixtures = [
  [1,'movies',-7.55,-.05,1.825,Math.PI/2], [1,'anime-movies',-7.55,3.69,1.69,Math.PI/2],
  [1,'movies',-3.71,5.55,1.70,Math.PI],
  [1,'shows',2.08,5.55,1.73,Math.PI], [1,'anime',5.94,5.55,1.70,Math.PI],
  [2,'vinyl',-5.99,-5.55,3.50,0], [2,'vinyl',-2.04,-5.55,3.55,0],
  [2,'cds',-7.55,-.05,3.12,Math.PI/2], [2,'cassettes',-7.55,3.40,3.25,Math.PI/2],
  [2,'cds',-4.88,.04,3.30,-Math.PI/2], [2,'cds',-4.15,.04,3.30,Math.PI/2],
  [2,'cds',-.45,-.10,3.55,-Math.PI/2],
  [2,'playstation',2.10,-5.55,3.42,0], [2,'xbox',5.93,-5.55,3.42,0],
  [2,'switch',6.48,5.54,2.28,Math.PI],
  [2,'retro-games',11.5,-8.5,5.6,0],
  [2,'game-discs',11.25,3.47,3.65,0],
  [2,'manga',-4.44,8.52,3.45,-Math.PI/2],
  [2,'books',-8.5,10.56,6.05,Math.PI], [2,'books',-12.46,8.98,2.72,Math.PI/2]
];
export function roomAt(floor,x,z) {
  return rooms.find(r=>r.floor===floor && inside(r.bounds,x,z));
}
export function inside([x0,z0,x1,z1],x,z) {
  return x>=x0 && x<=x1 && z>=z0 && z<=z1;
}
// Both flights share the north landing. The south landings open onto their respective floors.
export function groundAt(x,z,previous) {
  if(inside(stair,x,z)){
    if(z>=-4.1) return previous<rise/2?0:rise;
    if(z<=-7.9) return rise/2;
    const climb=(-4.1-z)/3.8*rise/2;
    return x<-10?climb:rise-climb;
  }
  const level=previous>rise/2?2:1;
  return roomAt(level,x,z)?(level-1)*rise:null;
}
