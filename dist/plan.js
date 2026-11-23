// Plan coordinates are metres. North is negative Z on both levels.
export const rise = 4.2;
export const rooms = [
  {id:'lounge', name:'Music + game lounge', floor:1, bounds:[-8,-6,8,6], spawn:[-3.5,4.1,-.3]},
  {id:'shop', name:'Clothing shop', floor:1, bounds:[-13,6,-4,11], spawn:[-6.2,7.15,1.5]},
  {id:'bed', name:'Bedroom', floor:1, bounds:[8,-9,15,-1], spawn:[9.3,-2.3,-.5]},
  {id:'bath', name:'Washroom', floor:1, bounds:[8,-1,13,3], spawn:[9.1,1.3,-1.4]},
  {id:'kitchen', name:'Kitchen', floor:1, bounds:[8,3,14,9], spawn:[9.2,4.4,-2.3]},
  {id:'gallery', name:'Media browsing gallery', floor:2, bounds:[-8,-6,8,6], spawn:[-3.2,3.4,-.25]},
  {id:'library', name:'Book library', floor:2, bounds:[-13,6,-4,11], spawn:[-6.1,7.3,1.5]},
  {id:'games', name:'Game cartridges + consoles', floor:2, bounds:[8,-9,15,-1], spawn:[10.1,-3.85,2.95]},
  {id:'collect', name:'Collectibles', floor:2, bounds:[8,3,14,9], spawn:[9.3,4.4,-2.35]}
];
export const stair = [-12,-9,-8,-2];
export const doorways = [
  ['x',-8,-4,-2.3,'Stairs'], ['z',6,-7.6,-5.65,'West wing'],
  ['x',8,-3.15,-1.35,'East wing'], ['x',8,.3,2,'Washroom'], ['x',8,3.45,5.35,'Kitchen']
];
export const fixtures = [
  [1,'vinyl',-5.6,-5.55,3.35,0], [1,'movies',5.75,-5.55,3.5,0],
  [1,'cassettes',-7.55,2.4,2.85,Math.PI/2], [1,'cds',-7.55,-.85,2.55,Math.PI/2],
  [2,'vinyl',-5.6,-5.55,3.7,0], [2,'cassettes',-.2,-5.55,4,0], [2,'movies',5.6,-5.55,3.7,0],
  [2,'shows',-7.55,-.6,2.45,Math.PI/2], [2,'cassettes',-7.55,2.75,2.45,Math.PI/2],
  [2,'cds',-3.8,-.6,3.3,Math.PI/2], [2,'game-discs',3.95,-.6,3.3,-Math.PI/2],
  [2,'cds',-4.51,-.6,3.3,-Math.PI/2], [2,'cds',4.66,-.6,3.3,Math.PI/2],
  [2,'vinyl',-2.7,5.56,2.7,Math.PI], [2,'movies',.8,5.56,2.8,Math.PI], [2,'anime',4.3,5.56,2.8,Math.PI],
  [2,'cartridges',11.5,-8.5,5.6,0],
  [2,'books',-8.5,10.56,6.05,Math.PI], [2,'books',-12.46,8.98,2.72,Math.PI/2],
  [1,'books',-2.7,5.56,2.4,Math.PI]
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
