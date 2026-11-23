// Wayfinding remains live text. All fixed hall furniture, garden and railing
// geometry is supplied by the corresponding Blender room model.
export function furnishHall({group,level,box,walnut,label}){
  function plaque(text,x,y,z,width,direction){
    box(x,y,z,width,.245,.025,walnut);
    const face=label(group,text,x,y,z+direction*.018,width-.022,.22,{
      height:128,width:1024,bg:'#34352e',color:'#e6dcc4',size:61
    });
    face.rotation.y=direction>0?0:Math.PI;
  }
  if(level===1)plaque('TV ROOM',3.17,1.68,-6.115,.89,-1);
  if(level===2)plaque('MUSIC & LIBRARY',-4.28,1.71,-6.117,1.51,-1);
  if(level===3)plaque('GALLERY',-1.35,1.69,-6.117,.92,-1);
  plaque('STAIR   /   LIFT',-6.20,1.69,-8.883,1.56,1);
}
