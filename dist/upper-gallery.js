import * as T from './vendor/three.module.js';

const halfTurn = Math.PI;
const quarterTurn = Math.PI / 2;

// Author the image face in the local +Z direction. Each gallery print shares
// one texture and the room batcher can combine every face in one draw call.
function printFaces() {
  const texture = new T.TextureLoader().load(new URL('./art/gallery-originals.webp', import.meta.url).href);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new T.MeshStandardMaterial({
    map: texture, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: .19,
    roughness: .94, metalness: 0
  });
  const planes = Array.from({length: 16}, (_, index) => {
    const plane = new T.PlaneGeometry(1, 1);
    const uv = plane.attributes.uv;
    // Keep a slim inset on all four edges to exclude adjoining atlas cells.
    const left = index % 4, bottom = 3 - Math.floor(index / 4), pad = .003;
    for (let i=0; i<uv.count; i++) {
      uv.setXY(i, (left + pad + uv.getX(i)*(1-2*pad)) / 4,
        (bottom + pad + uv.getY(i)*(1-2*pad)) / 4);
    }
    return plane;
  });
  return {material, planes};
}

export function furnishUpper({part, box, cyl, oval, block, seat, table, rug, plant, walnut, linen, stone, cream, iron, brass}) {
  const prints = printFaces();
  const sand = '#d8c8ac', graphite = '#363c3b', sage = '#748271';
  const oak = '#ac8560', terracotta = '#95583c', chalk = '#e2d8c5';
  const lampGlass = new T.MeshBasicMaterial({color:'#ffdfa8',toneMapped:false});
  const torus = new T.TorusGeometry(.38,.12,12,48);

  // One local transform for the frame, print and shallow sculptural reliefs.
  function mount(x, y, z, angle) {
    const pose = new T.Matrix4().makeRotationY(angle);
    pose.setPosition(x,y,z);
    return (shape, dx, dy, dz, w,h,d,mat, rx=0,ry=0,rz=0) =>
      part(shape,dx,dy,dz,w,h,d,mat,rx,ry,rz,pose);
  }

  function framed(x, y, z, angle, w, h, index, pendant=false) {
    const draw = mount(x,y,z,angle);
    const border = pendant ? .038 : .054;
    draw('box',0,0,0,w,h,.058,pendant ? graphite : walnut);
    draw('box',0,0,.035,w-.047,h-.047,.012,sand);
    draw(prints.planes[index],0,0,.043,w-2*border,h-2*border,1,prints.material);
    if (pendant) {
      draw('box',0,0,-.035,w-.047,h-.047,.012,sand);
      draw(prints.planes[index],0,0,-.043,w-2*border,h-2*border,1,prints.material,0,halfTurn);
    } else {
      // Dark edge behind the matte creates a floating shadow against the masonry.
      draw('box',0,-.015,-.032,w-.10,h-.10,.031,graphite);
    }
  }

  const north = [
    [-6.58,1.61,1.34,.78,.98],[-.38,1.65,1.45,.88,1.16],[1.8,1.42,1.18,.77,1.05],
    [3.94,1.74,1.54,.84,.95],[6.48,1.53,1.20,.92,1.12]
  ];
  north.forEach(([x,w,h,topW,topH], i) => {
    framed(x,1.63,-5.83,0,w,h,i);
    framed(x,4.24,-5.83,0,w*topW,h*topH,5+i);
  });

  // Cable-hung canvases sit above head height, allowing a visitor to walk beneath.
  const hanging = [
    [-4.70,-1.20,1.45,-25,2.97,.89],[-4.00,1.41,1.77,-25,2.37,1.37],
    [-3.37,3.71,1.15,-25,2.61,1.20],[3.95,-1.45,1.65,25,2.86,.89],
    [3.35,1.25,1.80,25,2.40,1.43],[2.66,3.81,1.31,25,2.67,1.29]
  ];
  hanging.forEach(([x,z,w,deg,bottom,h], i) => {
    const angle=-deg*halfTurn/180, y=bottom+h/2;
    framed(x,y,z,angle,w,h,10+i,true);
    const draw=mount(x,0,z,angle), anchor=6.38, top=bottom+h;
    draw('box',0,anchor,0,w+.15,.034,.055,graphite);
    for (const xx of [-w*.37,w*.37]) {
      draw('round',xx,(top+anchor)/2,0,.010,anchor-top,.010,graphite);
      draw('round',xx,top+.016,0,.026,.034,.026,brass);
    }
  });

  // Dimensional pieces complement the works on paper. The three series use
  // bent sheet metal, parallel timber fins, and cut painted circular forms.
  function relief(x,z,angle,w,index,y=1.67) {
    const draw=mount(x,y,z,angle);
    const height=[1.20,1.45,1.17,1.34,1.22][index%5];
    const field=[sage,graphite,'#c3af93','#9f795f','#5a6b6e'][index%5];
    draw('box',0,0,0,w,height,.057,walnut);
    draw('box',0,0,.035,w-.047,height-.047,.020,field);
    const iw=w-.19, ih=height-.19;
    if (index % 3 === 0) {
      const count=15;
      for (let i=0;i<count;i++) {
        const t=i/(count-1);
        const len=ih*(.42+.47*(.5+.5*Math.sin(t*5.0+index*.59)));
        const shift=(ih-len)*.43*Math.cos(t*4.8+index*.28);
        draw('box',(t-.5)*iw*.88,shift,.081,iw*.033,len,.081,
          i%5===index%5 ? brass : (index%2 ? chalk : oak),0,.30*Math.sin(halfTurn*t+index),0);
      }
    } else if (index % 3 === 1) {
      // Successive arcs are cut from a single family of metal rings.
      for (let i=0;i<4;i++) {
        const radius=.13+i*.085, thick=.019+i*.002;
        const arc=new T.TorusGeometry(radius,thick,8,44,halfTurn*(1.12+.09*i));
        draw(arc,iw*(index%2 ? .07 : -.07),.00,.090+i*.010,iw*.94,ih*.95,1,
          i===2 ? terracotta : (index%2 ? sand : graphite),0,0,(index%5)*.38+i*.33);
        arc.dispose();
      }
      draw('round',iw*.27,-ih*.28,.074,iw*.11,.036,iw*.11,brass,quarterTurn);
    } else {
      for (let i=0;i<3;i++) {
        const px=(-.27+i*.23)*iw,py=(i%2 ? -.10 : .10)*ih;
        draw('round',px,py,.081+i*.023,iw*(.34-.045*i),.042,ih*(.50-.06*i),
          [terracotta,chalk,graphite][(i+index)%3],quarterTurn);
      }
      draw('box',iw*.17,-ih*.27,.175,iw*.36,.032,.027,brass,0,0,.16*(index%4));
    }
  }
  const sideWalls=[
    ...[[-4.25,1.72],[-1.95,1.67],[.30,1.55],[2.48,1.46],[4.62,1.58]].map(([z,w])=>[-7.81,z,quarterTurn,w]),
    ...[[-4.12,1.65],[-1.64,1.92],[1.10,1.72],[3.92,2.07]].map(([z,w])=>[7.81,z,-quarterTurn,w]),
    ...[[-6.20,2.02],[-3.66,1.51],[3.49,1.79],[6.26,1.97]].map(([x,w])=>[x,5.80,halfTurn,w])
  ];
  sideWalls.forEach(([x,z,angle,w],i)=>relief(x,z,angle,w,i));
  for (const x of [-.65,.65]) {
    for(let i=0;i<4;i++) box(x+(i-1.5)*.094,.458,1.49,.085,.072,2.38,walnut);
    for(const z of [.58,2.40]) {
      box(x,.232,z,.31,.40,.082,iron);
      box(x,.043,z,.41,.055,.22,iron);
    }
    block(x,1.49,.38,2.38);
  }
  // Two walk-around sculptures on round mineral plinths.
  for (const [x,z,diameter] of [[-6.41,3.85,1.04],[6.12,3.81,.90]]) {
    cyl(x,.39,z,diameter,.75,diameter,stone);
    cyl(x,.774,z,diameter*.96,.025,diameter*.96,'#75786a');
    block(x,z,diameter,diameter);
  }
  part(torus,-6.41,1.16,3.85,.85,1.04,.57,brass,.08,.58,-.35);
  oval(-6.41,.809,3.85,.45,.072,.33,graphite);
  const folded=new T.Shape();
  folded.moveTo(-.29,0);folded.lineTo(-.055,.66);folded.lineTo(.21,.93);folded.lineTo(.06,.40);
  folded.lineTo(.31,.17);folded.lineTo(.19,0);folded.closePath();
  const casting=new T.ExtrudeGeometry(folded,{depth:.08,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.022,bevelThickness:.02});
  part(casting,6.10,.80,3.81,1,1,1,graphite,0,-.61,0);
  part(casting,6.22,.80,3.83,.65,.68,.82,terracotta,0,.72,0);
  torus.dispose();casting.dispose();

  // Kratex's private room. The bed island leaves a path around either side.
  rug(11.60,-5.85,4.50,4.15);
  box(11.65,.16,-5.95,2.18,.25,2.98,graphite);
  box(11.65,.35,-5.95,2.38,.18,3.18,walnut);
  box(11.65,.58,-5.95,2.31,.34,3.12,linen);
  box(11.65,.775,-5.43,2.30,.14,2.08,'#7f8578');
  box(11.65,.849,-6.33,2.30,.046,.25,'#b2ac94');
  for(let i=0;i<6;i++) box(11.65,.852,-4.67+i*.060,2.30,.018,.018,'#a9a28b');
  box(11.65,.83,-7.61,2.54,1.48,.16,walnut);
  for(let i=0;i<14;i++) box(10.47+i*.18,.97,-7.517,.035,1.04,.03,'#6f5541');
  for (const x of [11.11,12.19]) oval(x,.795,-7.01,.97,.23,.56,cream,.16);
  block(11.65,-5.95,2.40,3.19);
  for(const x of [10,13.30]) {
    box(x,.27,-7.15,.64,.37,.68,walnut);
    box(x,.469,-7.15,.65,.03,.68,stone);
    box(x,.317,-6.803,.21,.016,.017,brass);
    cyl(x,.54,-7.15,.22,.095,.22,iron);
    cyl(x,.72,-7.15,.032,.36,.032,brass);
    part('cone',x,.93,-7.15,.32,.26,.32,sand);
    cyl(x,.808,-7.15,.31,.016,.31,lampGlass);
    block(x,-7.15,.64,.68);
  }
  box(14.50,1.24,-5.05,.8,2.48,3.60,walnut);
  for(let i=0;i<4;i++) {
    const z=-6.40+i*.90;
    box(14.087,1.25,z,.035,2.35,.878,i%2 ? '#765e49' : '#806650');
    box(14.06,1.16,z+.28,.035,.28,.025,brass);
  }
  block(14.50,-5.05,.80,3.60);
  table(12.15,-1.47,4.04,.68,.78);
  seat(11.68,-2.35,.69,halfTurn,linen);
  // A desk lamp, folio, loose sheet and pencils establish a lived-in writing desk.
  cyl(13.62,.856,-1.45,.23,.039,.23,graphite);
  cyl(13.62,1.08,-1.45,.025,.43,.025,brass);
  box(13.51,1.286,-1.45,.245,.028,.032,brass);
  part('cone',13.38,1.23,-1.45,.18,.12,.18,graphite);
  cyl(13.38,1.175,-1.45,.146,.012,.146,lampGlass);
  box(11.75,.839,-1.46,.49,.022,.31,terracotta,0,-.07);
  box(11.77,.853,-1.47,.43,.010,.28,chalk,0,-.07);
  for(let i=0;i<5;i++) box(11.76,.860,-1.545+i*.029,.21+i*.017,.003,.003,'#8d8977',0,-.07);
  for(let i=0;i<3;i++) cyl(12.18+i*.021,.853,-1.47,.009,.18,.009,i===0?graphite:oak,quarterTurn,0,-.17);
  plant(8.65,-1.68,1.0);
}
