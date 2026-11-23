import * as T from './vendor/three.module.js';

const ink = '#22262b', graphite = '#363a40', steel = '#717782', silver = '#adafb3';
const ivory = '#d7ceba', violet = '#655391', plum = '#974362', green = '#86ab53';
const amber = '#e3b76e', ruby = '#a73c42', blue = '#377490', lcd = '#526c72';
const blackGlass = '#17252d', red = '#e44f40', lit = '#c2d0b1';
const wallX = 8.43, depth = .49, front = wallX + depth / 2;
const facing = Math.PI / 2;
const consoleBayZ = -6.99, lowerDeck = .48;

export const ps2ShelfView = {level:2, x:9.46, z:consoleBayZ+.06, yaw:Math.PI/2-.055, pitch:-.76};

export async function installPlayStation2(room, loader) {
  const {scene:model} = await loader.loadAsync(new URL('./models/playstation-2.glb',import.meta.url).href);
  const display = new T.Group();
  display.name = 'PlayStation 2 · console, DualShock 2 and memory card';
  display.position.set(wallX, lowerDeck, consoleBayZ);
  display.rotation.y = facing;
  display.add(model);
  const bounds = new T.Box3().setFromObject(model), size = bounds.getSize(new T.Vector3());
  const pick = new T.Mesh(new T.BoxGeometry(size.x,size.y,size.z),new T.MeshBasicMaterial());
  bounds.getCenter(pick.position);pick.visible=false;
  pick.userData = {display:'console',level:2,width:size.x,height:size.y,depth:size.z,item:{
    id:'display:playstation-2',title:'PlayStation 2',creator:'Sony Computer Entertainment',year:2000,
    description:'The original ribbed PlayStation 2 stands upright in its blue base, with a wired DualShock 2 controller and a removable 8 MB memory card.',
    source:'PlayStation',sourceUrl:'https://www.playstation.com/en-us/playstation-history/2000-ps2-psp/',
    exhibit:{model,section:'Retro gaming room',format:'Home console',dimensions:[78,301,182],destination:ps2ShelfView}
  }};
  display.add(pick);room.add(display);
  return pick;
}

// Local +z faces the visitor. All hardware details, including the tiny controls,
// bake into the floor's existing material batches.
function workbench(part, z, top) {
  const pose = new T.Matrix4().makeRotationY(facing).setPosition(wallX, top, z);
  const draw = (shape, x, y, d, w, h, l, mat, rx = 0, ry = 0, rz = 0) =>
    part(shape, x, y, d, w, h, l, mat, rx, ry, rz, pose);
  const b = (...args) => draw('box', ...args);
  const soft = (...args) => draw('cushion', ...args);
  const disk = (...args) => draw('round', ...args);
  const dial = (x, y, d, size, color) => disk(x, y, d, size, .005, size, color, Math.PI / 2);
  const cross = (x, y, d, size) => {
    b(x, y, d, size, size * .32, .006, ink);
    b(x, y, d, size * .32, size, .007, ink);
  };
  const pad = (x, y, d, size, color = graphite) => {
    for (const [dx, dy] of [[0,1],[1,0],[0,-1],[-1,0]]) dial(x + size * dx, y + size * dy, d, size * .8, color);
  };
  return { b, soft, disk, dial, cross, pad };
}

function uprightStand({b}, width) {
  b(0,.008,0,width,.016,.099,graphite);
  b(0,.043,-.018,width*.43,.075,.010,steel,-.12);
}

function gameBoy(p) {
  const {b, soft, dial, cross} = p;
  uprightStand(p,.15);
  soft(0,.135,0,.146,.231,.043,ivory);
  soft(0,.186,.022,.123,.084,.003,steel);
  b(.005,.187,.025,.079,.058,.002,'#91a05d');
  dial(-.050,.184,.025,.005,ruby);
  cross(-.041,.112,.024,.037);
  dial(.031,.105,.025,.020,plum); dial(.056,.119,.025,.020,plum);
  for (const x of [-.012,.013]) b(x,.070,.024,.019,.005,.004,steel,0,0,.30);
  for (let i=0;i<5;i++) b(.026+i*.007,.046+i*.002,.024,.002,.019,.002,steel,0,0,-.38);
}

function advance(p) {
  const {b, soft, dial, cross} = p;
  uprightStand(p,.20);
  soft(0,.105,0,.247,.134,.038,violet);
  for (const side of [-1,1]) soft(side*.096,.158,-.002,.042,.015,.032,silver);
  soft(0,.108,.019,.137,.099,.006,ink);
  b(0,.111,.023,.112,.076,.003,lcd);
  cross(-.090,.112,.021,.034);
  dial(.082,.104,.021,.018,plum); dial(.105,.119,.021,.018,plum);
  for (const y of [.060,.073]) dial(-.060,y,.023,.004,silver);
}

function clamshell(p, stereoscopic) {
  const {b, soft, disk} = p;
  const shell = stereoscopic ? blue : silver, w = stereoscopic ? .226 : .245;
  soft(0,.030,.025,w,.039,.135,shell);
  soft(0,.101,-.043,w,.139,.019,shell);
  b(0,.106,-.032,stereoscopic?.175:.148,.101,.005,graphite);
  b(0,.106,-.028,stereoscopic?.153:.126,.079,.004,blackGlass);
  disk(0,.043,-.038,.020,w*.81,.020,graphite,0,0,Math.PI/2);
  b(0,.051,.026,.124,.004,.083,ink);
  b(0,.054,.026,.109,.002,.069,lcd);
  b(-.087,.052,.030,.031,.004,.009,graphite); b(-.087,.053,.030,.009,.004,.031,graphite);
  for (const [x,d] of [[0,-.010],[-.010,0],[.010,0],[0,.010]]) disk(.088+x,.052,.035+d,.009,.005,.009,graphite);
  if(stereoscopic) {
    disk(-.086,.054,-.001,.027,.006,.027,silver);
    disk(0,.162,-.032,.007,.004,.007,ink,Math.PI/2);
  } else {
    for (const side of [-1,1]) for(let i=0;i<3;i++) b(side*.094,.100+i*.007,-.032,.017,.002,.002,steel);
  }
}

function twoDS(p) {
  const {b, soft, cross, pad} = p;
  uprightStand(p,.19);
  soft(0,.128,0,.215,.203,.044,blue);
  soft(0,.128,.020,.202,.193,.013,graphite);
  b(0,.166,.028,.130,.077,.004,ink); b(0,.166,.031,.117,.064,.003,lcd);
  b(0,.083,.028,.103,.071,.004,ink); b(0,.083,.031,.090,.058,.003,blackGlass);
  p.dial(-.079,.147,.029,.026,silver); cross(-.078,.104,.029,.027); pad(.077,.141,.030,.011,steel);
}

function portable(p) {
  const {b,soft,cross,pad,dial}=p;
  uprightStand(p,.21);
  soft(0,.099,0,.274,.121,.038,silver);
  soft(0,.099,.008,.272,.119,.033,ink);
  b(0,.105,.026,.162,.092,.004,blackGlass);
  cross(-.106,.112,.026,.031); dial(-.106,.068,.026,.021,graphite);
  pad(.104,.103,.026,.012,steel);
  for (const x of [-.038,0,.038]) b(x,.045,.026,.012,.003,.003,silver);
}

function cube({b,soft,disk,dial}) {
  soft(0,.105,0,.250,.189,.245,violet);
  disk(0,.203,.001,.194,.008,.194,graphite);
  b(0,.168,-.157,.178,.020,.019,violet);
  for(const x of [-.078,.078]) b(x,.168,-.134,.020,.020,.044,violet);
  b(0,.105,.125,.22,.113,.006,graphite);
  for(const x of [-.081,-.027,.027,.081]) dial(x,.123,.130,.032,ink);
  for(const x of [-.053,.053]) b(x,.071,.130,.081,.009,.004,ink);
}

function xbox({b,soft,disk}) {
  soft(0,.058,0,.364,.115,.275,ink);
  for(const side of [-1,1]) b(0,.119,0,.335,.012,.052,graphite,0,side*.60);
  disk(0,.129,0,.088,.009,.088,green);
  b(-.056,.075,.139,.191,.026,.006,graphite);
  for(const x of [-.123,-.074,.076,.125]) b(x,.027,.139,.032,.014,.006,steel);
  b(.100,.078,.139,.022,.010,.005,green);
}

function genesis({b,soft,disk}) {
  soft(0,.047,-.004,.348,.094,.224,ink);
  disk(0,.098,-.020,.197,.013,.197,graphite);
  b(0,.110,-.040,.123,.012,.020,ink);
  b(-.112,.099,.064,.042,.009,.034,steel);
  b(.115,.101,.054,.022,.004,.015,ruby);
  for(const x of [-.07,.07]) soft(x,.030,.108,.059,.021,.007,graphite);
}

function nes({b}) {
  b(0,.038,0,.294,.076,.231,graphite);
  b(0,.096,0,.302,.076,.227,ivory);
  b(-.046,.091,.117,.192,.060,.007,silver);
  b(-.048,.071,.122,.162,.009,.004,graphite);
  for(let i=0;i<9;i++) b(.096,.135,-.091+i*.019,.056,.004,.008,steel);
  for(const x of [-.116,-.083]) b(x,.043,.120,.025,.011,.009,silver);
  b(-.137,.043,.120,.004,.006,.007,ruby);
}
function snes({b,soft}) {
  soft(0,.056,0,.285,.110,.225,silver);
  soft(0,.111,-.012,.245,.018,.175,ivory);
  b(0,.122,-.035,.149,.004,.022,graphite);
  for(const x of [-.068,.068]) b(x,.124,.051,.061,.012,.031,violet);
  for(const x of [-.065,.065]) soft(x,.048,.114,.093,.022,.008,graphite);
}
function famicom({b,soft,disk}) {
  soft(0,.037,0,.296,.072,.199,'#932f37');
  soft(0,.079,0,.260,.033,.183,ivory);
  b(0,.102,-.021,.142,.024,.023,'#932f37');
  b(0,.093,.051,.063,.012,.035,'#932f37');
  b(0,.055,.103,.233,.022,.005,amber);
  for(const side of [-1,1]){
    b(side*.135,.082,-.010,.025,.012,.112,'#932f37');
    b(side*.135,.089,-.010,.018,.004,.090,amber);
    disk(side*.135,.093,.014,.010,.003,.010,ink);
  }
}

// Small freestanding enameled pixel pieces. Contiguous pixels share one solid
// run, preserving a sculpted outline without hundreds of individual scene nodes.
const pixelPalette = {k:ink,w:'#f4e5bd',r:red,g:'#579654',m:'#9cc659',s:'#edbb51',b:blue,u:'#80cacf',o:'#d78243'};
const sprites = [
  ['1-UP', ['...kkkkk...','..kggmggk..','.kggwwwggk.','kgwggwggwgk','kgwgggggwgk','.kkwwwwwkk.','...kwkwk...','...kwwwk...','....kkk....']],
  ['RUPEE', ['...kkk...','..kgmgk..','.kgmwmgk.','kgmmwmmgk','kgmmwmmgk','kgmmwmmgk','.kgmmmgk.','..kgmgk..','...kkk...']],
  ['POKÉ BALL', ['...kkkk...','..krrrrk..','.krrrrrrk.','krrrrrrrrk','kkkwwwwkkk','kwwkwwkwwk','.kwwkkwwk.','..kwwwwk..','...kkkk...']],
  ['FIRE FLOWER', ['...kkkkk...','..krrrrrk..','.krooooork.','krooowooork','kroowkwoork','.kroooork..','..krrrrk...','....kgk....','..kgkgkgk..','...kgggk...','....kkk....']],
  ['CHOCOBO', ['...ksk.....','..ksssk....','.kssksokkk.','.ksssooook.','..kssskkk..','kksssssk...','.ksssssk...','..ksssk....','..kokok....','.kooook....']],
  ['HEART', ['.kkk.kkk.','krrrkrrrk','krwrrrrrk','krrrrrrrk','.krrrrrk.','..krrrk..','...krk...','....k....']]
];
function pixelCollectible({b}, rows) {
  const step=.020, cols=Math.max(...rows.map(r=>r.length));
  b(0,.009,0,cols*step+.050,.018,.091,graphite);
  b(0,.020,0,cols*step*.7,.008,.027,steel);
  for(let y=0;y<rows.length;y++){
    const row=rows[y];let start=0;
    while(start<row.length){
      const color=row[start];let end=start+1;
      while(end<row.length&&row[end]===color)end++;
      if(color!=='.') b(((start+end)/2-cols/2)*step,.024+(rows.length-y-.5)*step,0,(end-start)*step,.020,.036,pixelPalette[color]);
      start=end;
    }
  }
}

function cordGeometry(points,radius,segments=24){
  return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal'),segments,radius,6,false);
}
function floorAudio({part:rawPart,box:rawBox,cyl:rawCyl}) {
  const rugTop=.034;
  const part=(shape,x,y,z,...args)=>rawPart(shape,x,y+rugTop,z,...args);
  const box=(x,y,z,...args)=>rawBox(x,y+rugTop,z,...args);
  const cyl=(x,y,z,...args)=>rawCyl(x,y+rugTop,z,...args);
  function cable(points,r,color,segments=28,onRug=true){
    rawPart(cordGeometry(points,r,segments),0,onRug?rugTop:0,0,1,1,1,color);
  }
  // A first-generation silver-and-navy portable cassette deck, face up.
  const wx=8.89,wz=-6.27;
  box(wx,.027,wz,.139,.051,.191,blue);
  box(wx,.053,wz-.009,.133,.005,.158,silver);
  box(wx,.0565,wz-.016,.092,.003,.074,graphite);
  box(wx,.0585,wz-.017,.076,.002,.046,lcd);
  for(const x of [-.020,.020])cyl(wx+x,.060,wz-.017,.020,.003,.020,ivory);
  for(const z of [-.048,-.019,.010])box(wx+.073,.036,wz+z,.006,.019,.020,silver);
  box(wx-.072,.032,wz+.037,.007,.020,.035,red);
  for(let i=0;i<5;i++)box(wx-.037+i*.015,.057,wz+.050,.008,.002,.019,graphite);
  // White hard-drive iPod, its screen and mechanically distinct click wheel.
  const px=8.95,pz=-6.58;
  part('cushion',px,.013,pz,.095,.025,.158,silver);
  part('cushion',px,.026,pz,.093,.006,.156,'#e8e5d8');
  box(px,.030,pz-.036,.072,.003,.055,graphite); box(px,.032,pz-.036,.066,.002,.048,'#9fa98e');
  for(let i=0;i<3;i++)box(px-.009,.0335,pz-.048+i*.011,.038-i*.003,.001,.003,'#58695b');
  cyl(px,.0305,pz+.038,.056,.003,.056,silver);cyl(px,.0326,pz+.038,.021,.002,.021,ivory);
  const hx=8.91,hz=-6.89;
  // The headphones rest on both orange foam ear pads. Two rails form the open band.
  const arch=[[-.072,.043,.015],[-.095,.039,-.051],[-.064,.046,-.11],[0,.050,-.139],[.068,.046,-.113],[.094,.037,-.052],[.072,.043,.015]];
  for(const k of [-.004,.004])cable(arch.map(([x,y,z])=>[hx+x,y+k,hz+z+k]),.0028,steel);
  cable(arch.slice(1,-1).map(([x,y,z])=>[hx+x,y,hz+z]),.0095,graphite);
  for(const side of [-1,1]){
    cyl(hx+side*.072,.033,hz+.016,.061,.027,.072,graphite);
    cyl(hx+side*.072,.015,hz+.016,.075,.028,.084,'#d28340');
  }
  cable([[hx+.072,.030,hz+.045],[8.99,.012,-6.82],[9.037,.008,-6.76],[9.013,.007,-6.708],[8.958,.009,-6.756],[px+.029,.012,pz-.10],[px+.029,.020,pz-.077]],.0035,ink);
  // Original console leads drop beside the rack and return to a floor power strip.
  const sx=8.43,sz=-5.61;
  rawBox(sx,.024,sz+.12,.105,.044,.245,ivory);
  for(const z of [-.066,.014,.083]) rawBox(sx,.049,sz+.12+z,.057,.011,.039,graphite);
  cable([[8.32,.54,-6.19],[8.26,.543,-5.79],[8.26,.51,-5.57],[8.33,.25,-5.55],[8.39,.058,-5.542],[sx,.053,sz+.054]],.006,ink,28,false);
  cable([[8.59,1.154,-6.06],[8.64,1.13,-5.87],[8.681,1.03,-5.66],[8.686,.53,-5.612],[8.63,.086,-5.55],[8.58,.014,-5.51],[sx,.055,sz+.134]],.0065,graphite,28,false);
}

export function buildRetroShowcase({part,box,cyl,group,label}) {
  function plaque(text,z,y,w,h,heading=false) {
    const s=label(group,text,front+.004,y,z,w,h,{width:heading?960:480,height:92,size:heading?58:52,color:'#f4ead6',bg:heading?'#282e32':'#393630'});
    s.rotation.y=facing;s.name=text;
  }
  const main=consoleBayZ, mini=-4.76;
  const lower=lowerDeck,middle=1.10,upper=1.71;
  plaque('CONSOLE ARCHIVE',main,2.17,1.02,.095,true);
  plaque('PIXEL COLLECTIBLES',mini,1.87,1.02,.095,true);
  function system(name,offset,top,model){
    const z=main+offset; model(workbench(part,z,top));plaque(name,z,top-.043,.370,.061);
  }
  const handhelds=[
    ['GAME BOY',gameBoy],['GAME BOY ADVANCE',advance],['NINTENDO DS',p=>clamshell(p,false)],
    ['NINTENDO 2DS',twoDS],['NINTENDO 3DS',p=>clamshell(p,true)],['PSP',portable]
  ];
  handhelds.forEach(([n,model],i)=>system(n,1.10-i*.44,upper,model));
  [['NES',nes],['FAMICOM',famicom],['SUPER NES',snes],['SEGA GENESIS',genesis]]
    .forEach(([n,model],i)=>system(n,.99-i*.66,middle,model));
  system('GAMECUBE',.85,lower,cube);
  plaque('PLAYSTATION 2',main,lower-.043,.370,.061);
  system('ORIGINAL XBOX',-.85,lower,xbox);
  sprites.forEach(([name,rows],i)=>{
    const z=mini+(.42-(i%3)*.42),top=i<3?1.44:.84;
    pixelCollectible(workbench(part,z,top),rows);
    plaque(name,z,top-.043,.32,.054);
  });
  floorAudio({part,box,cyl});
}
