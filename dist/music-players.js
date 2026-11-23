const names={vinyl:'Vinyl',cassettes:'Cassette',cds:'CD'};
export function installMusicPlayers(items,previews,devices,openDetail){
  const panel=document.getElementById('musicControls'), info=document.getElementById('musicTrack');
  const link=document.getElementById('musicLink'),details=document.getElementById('musicItem'),unlock=document.getElementById('musicResume');
  const audio=document.createElement('audio');audio.preload='none';panel.append(audio);
  const decks=new Map(Object.keys(names).map(key=>[key,items.filter(i=>i.category===key && previews[i.albumUri]?.url)]));
  const models=devices.map(d=>d.userData).filter(d=>d.show);
  const platter=models.find(d=>d.platter)?.platter;
  const artist=document.getElementById('musicArtist'),art=document.getElementById('musicArtwork'),status=document.getElementById('musicStatus');
  let coverUrl='',cover=null,sounding=false;
  function selectCover(url){
    if(url===coverUrl)return;
    coverUrl=url;cover=null;art.removeAttribute('src');art.classList.add('hidden');
    if(!url)return;
    const img=new Image();
    img.onload=()=>{
      if(url!==coverUrl)return;
      cover=img;art.src=url;art.classList.remove('hidden');render();
    };
    img.src=url;
  }
  let selected='vinyl',present=false,record=null,queue=[],failed=new Set(),last=null,blocked=false,token=0,timer;
  function render(){
    panel.classList.toggle('hidden',!present);
    for(const b of panel.querySelectorAll('[data-deck]')){
      const key=b.dataset.deck,on=selected===key;
      b.setAttribute('aria-pressed',String(on));
      b.setAttribute('aria-label',(on?'Turn off ':'Turn on ')+names[key]+' player');
    }
    const track=record&&previews[record.albumUri];
    selectCover(record?.artwork||'');
    const state=sounding&&present?'Playing':blocked||!present?'Paused':'Loading';
    for(const model of models){
      const on=Boolean(track&&model.device===selected);
      model.show({item:on?record:null,track:on?track:null,status:state,image:on?cover:null});
    }
    info.textContent=track?.title||'';
    artist.textContent=record?.creator||'';
    status.textContent=track?'':selected?'Loading preview…':'Players off';
    link.classList.toggle('hidden',!track);details.classList.toggle('hidden',!track);
    if(track){
      link.href='https://open.spotify.com/track/'+track.trackUri.split(':').at(-1);
      details.setAttribute('aria-label','View '+record.title+' album details');
      details.title=track.title+' · '+record.creator;
    }
    unlock.classList.toggle('hidden',!blocked);
  }
  function stop(){
    sounding=false;token++;clearTimeout(timer);audio.pause();audio.removeAttribute('src');audio.load();record=null;blocked=false;
  }
  function play(){
    if(!present||!record)return;
    const attempt=++token;clearTimeout(timer);
    timer=setTimeout(()=>{if(attempt===token)skip();},18000);
    audio.play().catch(e=>{
      if(attempt!==token||!present||e.name==='AbortError')return;
      if(e.name==='NotAllowedError'){clearTimeout(timer);blocked=true;render();}
      else skip();
    });
  }
  function next(){
    if(!present||!selected)return;
    if(!queue.length){
      queue=decks.get(selected).filter(i=>!failed.has(i.id)).slice();
      for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
      if(queue.length>1&&queue.at(-1).id===last)queue.unshift(queue.pop());
    }
    record=queue.pop()||null;
    if(!record){selected=null;stop();render();return;}
    sounding=false;last=record.id;audio.src=previews[record.albumUri].url;audio.title=previews[record.albumUri].title;
    blocked=false;play();render();
  }
  function skip(){if(record&&present){failed.add(record.id);stop();next();}}
  function toggle(key){
    if(!decks.has(key)||!present)return;
    const on=selected===key;stop();selected=on?null:key;queue=[];failed.clear();
    if(selected)next();render();
  }
  audio.onplaying=()=>{clearTimeout(timer);blocked=false;sounding=true;render();};
  audio.onwaiting=audio.onpause=()=>{if(sounding){sounding=false;render();}};
  audio.onended=next;audio.onerror=()=>{if(audio.getAttribute('src'))skip();};
  unlock.onclick=play;details.onclick=()=>{if(record)openDetail(record);};
  for(const b of panel.querySelectorAll('[data-deck]'))b.onclick=()=>toggle(b.dataset.deck);
  function update(active,dt=0){
    const inside=active&&!document.hidden;
    if(inside!==present){
      present=inside;
      if(!inside){token++;clearTimeout(timer);audio.pause();}
      else if(record)play();else if(selected)next();
      render();
    }
    if(inside&&selected==='vinyl'&&sounding&&!audio.paused&&platter)platter.rotation.y-=dt*3.49;
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)update(false);});
  render();
  return {update,toggle,description:key=>(selected===key?'Turn off ':'Turn on ')+names[key]+' player'};
}
