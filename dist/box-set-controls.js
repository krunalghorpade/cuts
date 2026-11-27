import {caseLatch} from './room-audio.js';
import {discSpread,spreadName} from './box-set-layout.js';

const byId=id=>document.getElementById(id);
function credit(parent,text,url){
  if(parent.childNodes.length)parent.append(' · ');
  if(!url){parent.append(text);return;}
  const a=document.createElement('a');a.textContent=text;a.href=url;
  a.target='_blank';a.rel='noopener noreferrer';parent.append(a);
}
export function createBoxSetControls(preview){
  const panel=byId('boxActions'),advance=byId('boxAdvance'),back=byId('boxBack');
  const seasonSelect=byId('seasonSelect'),discSelect=byId('discSpread'),note=byId('boxNote');
  let item=null,stage=0,index=0,page=0,request=0;
  const slider=byId('seasonSlider');
  function travel(fraction){
    const value=Math.round(100*fraction);slider.value=String(value);
    slider.setAttribute('aria-valuetext',value===0?'In box':value===100?'Fully out':value+'% out');
  }
  function paint(){
    const season=item.seasons[index],drawn=stage===2,opened=stage===3;
    byId('boxLabel').textContent=['Open box set','Slide case out','Open season case','Close season case'][stage];
    back.hidden=stage===0;byId('boxBackLabel').textContent=stage===1?'Close box set':drawn?'Return to box':'Back to box';
    byId('seasonPicker').hidden=stage!==1||item.seasons.length<2;
    byId('caseTravel').hidden=stage!==1&&stage!==2;
    byId('discSpreadPicker').hidden=!opened||season.count<3;
    seasonSelect.value=String(index);discSelect.value=String(page);
    note.replaceChildren();
    if(!stage)return;
    credit(note,season.label,season.seasonArt?(season.artworkPage||season.source):season.source);
    if(season.episodes)credit(note,season.episodes+' episodes');
    if(!opened)return;
    const nums=discSpread(season,page);
    if(season.verified)credit(note,season.count+' disc'+(season.count===1?'':'s'),season.editionSource);
    else if(season.unknownCount)credit(note,'Disc count unconfirmed');
    else credit(note,season.count+(season.count===1?' disc':' discs')+' (estimated)');
    const matched=nums.filter(n=>season.labels.has(n));
    for(const n of matched){
      const label=season.labels.get(n);
      credit(note,'Disc '+n+' artwork'+(label.credit?' — '+label.credit:''),label.source);
    }
    const adapted=nums.filter(n=>!season.labels.has(n));
    if(adapted.length){
      const what=matched.length?'Disc '+adapted.join(' & '):'Disc '+(adapted.length>1?'labels':'label');
      credit(note,what+' adapted from the '+(season.seasonArt?'season':'series')+' artwork');
    }
  }
  function trays(){
    const season=item.seasons[index];
    discSelect.replaceChildren(...Array.from({length:Math.ceil(season.count/2)},(_,p)=>new Option(spreadName(season,p),String(p))));
  }
  async function move(next,position=null){
    if(!item)return;
    const ticket=++request,wasOpen=stage===3;stage=next;paint();
    try{
      await preview.setBoxStage(stage,index,page,position);
      if(ticket===request&&wasOpen!==(stage===3))caseLatch(stage===3,item);
    }
    catch(err){
      if(ticket!==request)return;
      stage=0;page=0;paint();note.textContent='The box preview could not load. Try opening it again.';
      console.error('Box set preview unavailable',err);
    }
  }
  function pick(i){
    if(!item||stage!==1||!item.seasons[i]||i===index)return;
    index=i;page=0;trays();move(1);
  }
  function show(next){
    request++;item=next?.seasons?next:null;index=page=stage=0;panel.hidden=!item;advance.hidden=!item;
    if(!item)return;
    seasonSelect.replaceChildren(...item.seasons.map((s,i)=>new Option(s.label,String(i))));
    travel(0);trays();paint();
  }
  advance.onclick=()=>move(stage===3?2:stage+1);
  back.onclick=()=>move(stage===1?0:1);
  seasonSelect.onchange=()=>pick(Number(seasonSelect.value));
  discSelect.onchange=()=>{page=Number(discSelect.value);move(3);};
  slider.oninput=()=>{const t=slider.valueAsNumber/100;move(t>0?2:1,t);};
  function openTappedCase(season){
    if(!item)return;
    if(stage===0){move(1);return;}
    if(stage===1 && Number.isInteger(season))pick(season);
    move(stage===3?2:3);
  }
  return {show,pick,travel,openTappedCase};
}
