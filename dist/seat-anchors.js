// Metres in the same floor-local frame as the room GLBs and plan fixtures.
// Bounds enclose the tappable upholstery. The eye is 0.73 m above the seat.
const seats = [];
function seat(room, level, label, x, z, width, depth, top, surface, facing, eyeX=x, eyeZ=z, bottom=.12) {
  const eyeY = surface + .73;
  let yaw = facing, pitch = 0;
  if (Array.isArray(facing)) {
    const [targetX, targetY, targetZ] = facing;
    const dx = targetX-eyeX, dz = targetZ-eyeZ;
    yaw = Math.atan2(-dx, -dz);
    pitch = Math.atan2(targetY-eyeY, Math.hypot(dx,dz));
  }
  seats.push({id:`${room}-${x.toFixed(2)}-${z.toFixed(2)}`, level, room, label, x, z, width, depth,
    bottom, top, eyeX, eyeY, eyeZ, yaw, pitch});
}

// Recliner translations include the raised rear tread from buildCinema().
for (const [z,base] of [[-.10,.004],[2.22,.203]]) {
  for (const x of [-5.43,-4.14,-2.85]) {
    seat('cinema',1,'recliner',x,z,1.01,1.04,base+1.13,base+.48,
      [-4.95,2.08,-5.50],x,z-.07,base+.10);
  }
}
const tv = [1.91,1.73,-5.4755];
for (const offset of [-.80,0,.80]) {
  seat('television',1,'sofa',3.20+offset,2.15,.80,.92,1.08,.555,tv,3.20+offset,2.05);
}
seat('television',1,'armchair',5.6,-.34,.94,.96,1.08,.555,tv,5.54,-.42);

// Each mattress half can be reached from the side; sit at the foot facing out.
for (const side of [-1,1]) {
  const x=11.65+side*.58;
  seat('bed',1,'bed',x,-6.02,1.16,3.01,.85,.74,[11.65,1.78,-1.511],x,-4.72);
}
seat('bath',1,'toilet seat',12.07,-.15,.49,.65,.50,.48,Math.PI);
for (const x of [10.45,11.74]) seat('kitchen',1,'stool',x,5.93,.465,.465,.704,.704,Math.PI);

for (const x of [6.30,7.00]) seat('landing',2,'bench',x,-7.90,.70,.64,.56,.56,Math.PI/2);
for (const offset of [-.72,0,.72]) {
  seat('music',2,'sofa',-3.73+offset,4.59,.72,.90,.99,.546,0,-3.73+offset,4.55);
}
seat('music',2,'armchair',-4.80,2.05,.85,.87,.96,.516,-2.64);
seat('music',2,'armchair',-2.60,2.05,.85,.87,.96,.516,2.64);
for (const x of [-9.68,-8.40]) {
  seat('library',2,'reading chair',x,7.89,.49,.51,.78,.519,Math.PI);
  seat('library',2,'reading chair',x,9.69,.49,.51,.78,.519,0);
}
const monitor = [4,1.51,-1.98];
seat('gaming',2,'gaming chair',3.48,-.32,.69,.73,1.31,.556,monitor);
seat('gaming',2,'beanbag',5.90,.50,1.13,1.13,.72,.341,monitor);
seat('gaming',2,'beanbag',5.06,2.20,1.13,1.13,.72,.341,monitor);
const crt = [13.965,1.52,-2.25];
seat('retro',2,'beanbag',10.99,-4.50,1.18,1.17,.72,.335,crt);
seat('retro',2,'beanbag',12.46,-5.14,1.18,1.17,.72,.335,crt);

for (const x of [-.65,.65]) {
  for (const z of [.72,1.49,2.26]) {
    seat('gallery',3,'gallery bench',x,z,.41,.77,.489,.488,x<0?Math.PI/2:-Math.PI/2);
  }
}
for (const side of [-1,1]) {
  const x=11.62+side*.55;
  seat('private',3,'bed',x,-6.38,1.10,2.58,.81,.68,Math.PI,x,-5.25);
}
seat('private',3,'desk chair',11.80,-2.41,.53,.51,.89,.524,Math.PI);

export const seatAnchors = seats;
