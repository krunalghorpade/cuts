// Plan A-103 and elevation A-301. Coordinates and maximum clear openings are
// in metres relative to the gallery floor. A zero angle faces south (+Z).
const north = [
  [-6.58, 1.61, 1.34, .78, .98], [-.38, 1.65, 1.45, .88, 1.16],
  [1.80, 1.42, 1.18, .77, 1.05], [3.94, 1.74, 1.54, .84, .95],
  [6.48, 1.53, 1.20, .92, 1.12]
];
const mount = (id,x,y,z,angle,w,h,suspended=false) => ({id,x,y,z,angle,w,h,suspended});
const half = Math.PI / 2;
const west = [[-4.25,1.72],[-1.95,1.67],[.30,1.55],[2.48,1.46],[4.62,1.58]];
const east = [[-4.12,1.65],[-1.64,1.92],[1.10,1.72],[3.92,2.07]];
const south = [[-6.20,2.02],[-3.66,1.51],[3.49,1.79],[6.26,1.97]];
const sideHeights = [1.20,1.45,1.17,1.34,1.22];
const hung = [
  [-4.70,-1.20,1.45,-25,2.97,.89], [-4,1.41,1.77,-25,2.37,1.37],
  [-3.37,3.71,1.15,-25,2.61,1.20], [3.95,-1.45,1.65,25,2.86,.89],
  [3.35,1.25,1.80,25,2.40,1.43], [2.66,3.81,1.31,25,2.67,1.29]
];
export const galleryMounts = [
  ...north.map(([x,w,h],i)=>mount('north-lower-'+(i+1),x,1.63,-5.818,0,w,h)),
  ...north.map(([x,w,h,sw,sh],i)=>mount('north-upper-'+(i+1),x,4.24,-5.818,0,w*sw,h*sh)),
  ...west.map(([z,w],i)=>mount('west-'+(i+1),-7.805,1.67,z,half,w,sideHeights[i])),
  ...east.map(([z,w],i)=>mount('east-'+(i+1),7.805,1.67,z,-half,w,sideHeights[(i+5)%5])),
  ...south.map(([x,w],i)=>mount('south-'+(i+1),x,1.67,5.805,Math.PI,w,sideHeights[(i+9)%5])),
  ...hung.map(([x,z,w,degrees,bottom,h],i)=>mount('suspended-'+(i+1),x,bottom+h/2,z,-degrees*Math.PI/180,w,h,true))
];
