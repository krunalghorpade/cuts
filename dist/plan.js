// Metres, with north toward negative Z. The two library zones share an open four-metre bay.
export const rise = 4.2;
export const levels = [1, 2, 3];
export const levelOf = height => Math.max(1, Math.min(3, Math.round(height / rise) + 1));
export const ceilingOf = level => level === 3 ? 6.4 : rise;
export const stair = [-12,-9,-8,-2];
export const lift = [-4.7,-11.4,-2.25,-9];
export const hall = [-8,-9,8,-6];
export const entrance = [5.04,-8.23,2.82];
const room = (id,name,floor,bounds,spawn) => ({id,name,floor,bounds,spawn});
export const rooms = [
  room('lobby','Entrance lobby',1,hall,entrance),
  room('cinema','Private movie theatre',1,[-8,-6,0,6],[-2.12,-3.79,2.78]),
  room('television','TV room',1,[0,-6,8,6],[1.15,2.64,-.12]),
  room('shop','Clothing shop',1,[-13,6,-4,11],[-6.2,7.15,1.5]),
  room('bed','Bedroom',1,[8,-9,15,-1],[9.3,-2.3,-.5]),
  room('bath','Washroom',1,[8,-1,13,3],[9.1,1.3,-1.4]),
  room('kitchen','Kitchen',1,[8,3,14,9],[9.2,4.4,-2.3]),
  room('landing','Landing',2,hall,[.3,-7.5,1.75]),
  room('music','Music & book library',2,[-8,-6,0,6],[-6.78,2.48,-1.60]),
  room('library','Reading area',2,[-13,6,-4,11],[-6.1,7.3,1.5]),
  room('gaming','Modern gaming room',2,[0,-6,8,6],[2,2.6,-.40]),
  room('retro','Retro gaming room',2,[8,-9,15,-1],[9.65,-2.25,-Math.PI/2]),
  room('collect','Collectibles',2,[8,3,14,9],[9.3,4.4,-2.03]),
  room('foyer','Gallery foyer',3,hall,[.43,-7.34,1.98]),
  room('gallery','Art gallery',3,[-8,-6,8,6],[.4,-4.32,Math.PI]),
  room('private','Kratex’s private room',3,[8,-9,15,-1],[9.35,-7.82,-2.18])
];
export function roomAt(floor,x,z){return rooms.find(r=>r.floor===floor&&inside(r.bounds,x,z));}
export function inside([x,z,X,Z],px,pz){return px>=x&&px<=X&&pz>=z&&pz<=Z;}
// Each aperture is shared by the render, collision, and poster placement code.
const shared=[
 ['x',-8,-8.76,-7.18,'Landing','open'],['z',-9,-4.23,-2.72,'Elevator','lift'],
 ['z',-9,-11.55,-8.52,'','glass'],['z',-9,-1.72,2.56,'','glass'],['x',-12,-6.92,-3.46,'','glass']
];
const apertures=[
 [['z',-9,3.94,6.14,'Entrance','double'],['z',-6,3.94,6.14,'TV room','open'],
  ['z',-6,-2.69,-1.12,'Private movie theatre','single'],['x',0,2.86,4.47,'TV room','double'],
  ['z',6,-7.58,-5.65,'Clothing shop','double'],['x',8,-3.02,-1.86,'Bedroom','single'],
  ['x',8,.31,1.45,'Washroom','single'],['x',8,3.48,5.34,'Kitchen','double'],
  ['z',6,3.22,4.75,'','glass'],['z',-9,9.03,13.75,'','glass'],['x',13,-.30,1.55,'','glass'],
  ['x',14,4.26,6.68,'','glass'],['z',11,-11.72,-8.2,'','glass']],
 [['z',-6,-3.20,-1.12,'Music & book library','open'],['z',-6,3.15,4.65,'Modern gaming room','single'],
  ['x',0,2.82,4.55,'Modern gaming room','double'],['z',6,-8,-4,'Reading area','open'],
  ['x',8,-3.15,-1.35,'Retro gaming room','double'],['x',8,3.45,5.35,'Collectibles','double'],
  ['z',11,-12.55,-11.32,'','glass'],['x',-13,6.57,7.98,'','glass'],['x',15,-8.56,-7.14,'','glass'],
  ['x',14,3.48,4.43,'','glass'],['x',14,7.57,8.6,'','glass']],
 [['z',-6,-4.65,-2.10,'Art gallery','open'],['x',8,-8.39,-7.22,'Kratex’s private room','single'],
  ['z',-9,9.25,13.90,'','glass'],['x',15,-5.94,-2.78,'','glass'],['z',6,-1.56,1.56,'','glass']]
];
export const openingsFor=level=>[...shared,...apertures[level-1]];
export const fixtures=[
 [1,'movies',-7.51,-1.90,1.825,Math.PI/2],[1,'anime-movies',-7.51,-.1425,1.69,Math.PI/2],[1,'movies',-7.51,1.5525,1.70,Math.PI/2],
 [1,'shows',2.08,5.55,1.73,Math.PI],[1,'anime',5.94,5.55,1.70,Math.PI],
 [2,'cassettes',-7.52,-2.83,2.88,Math.PI/2],[2,'cds',-7.52,1.19,3.08,Math.PI/2],[2,'cds',-.46,-1.5,3.21,-Math.PI/2],
 [2,'vinyl',-5.25,-1.015,2.65,0],[2,'vinyl',-5.25,-1.325,2.65,Math.PI],[2,'playstation',1.67,-5.53,2.55,0],[2,'xbox',6.52,-5.53,2.12,0],
 [2,'switch',6.47,5.54,2.28,Math.PI],[2,'retro-games',11.5,-8.48,5.55,0],[2,'game-discs',11.25,3.48,3.6,0],
 [2,'manga',-4.41,8.59,3.50,-Math.PI/2],[2,'books',-8.02,10.54,6.05,Math.PI],[2,'books',-12.55,9.26,2.5,Math.PI/2]
];
export const cinemaSteps=[
 {bounds:[-6.41,.96,-1.87,3.48],height:.10},
 {bounds:[-6.23,1.15,-2.05,3.29],height:.20}
];
export const stairStart = -7.24, stairEnd = -3.40;
export const approach = [3.78,-11.05,6.30,-9];
// Find the nearest physically continuous flight. The centre stringer separates flights.
export function groundAt(x,z,previous){
 if(inside(stair,x,z)){
   if(z<=stairStart)return (levelOf(previous)-1)*rise;
   const t=Math.min(1,(z-stairStart)/(stairEnd-stairStart));
   const h=(x<-10?t:2-t)*rise/2;
   return Math.abs(previous-h)<=Math.abs(previous-h-rise)?h:h+rise;
 }
 const floor=levelOf(previous);
 if(floor===1){
   for(let i=cinemaSteps.length-1;i>=0;i--)if(inside(cinemaSteps[i].bounds,x,z))return cinemaSteps[i].height;
 }
 if(roomAt(floor,x,z)||inside(lift,x,z)||(floor===1&&inside(approach,x,z)))return (floor-1)*rise;
 return null;
}
