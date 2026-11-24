let apiRequest;
function loadPlayerAPI(){
  if(apiRequest)return apiRequest;
  apiRequest=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    const fail=()=>{clearTimeout(timer);script.remove();apiRequest=null;reject(new Error('Spotify player unavailable'));};
    const timer=setTimeout(fail,12000);
    window.onSpotifyIframeApiReady=api=>{clearTimeout(timer);resolve(api);};
    script.src='https://open.spotify.com/embed/iframe-api/v1';script.onerror=fail;document.head.append(script);
  });
  return apiRequest;
}

// Only mount the official album player following an explicit listening request.
export function spotifyPlayer(host){
  let version=0,controller=null,helpTimer;
  function stop(){
    version++;clearTimeout(helpTimer);controller?.destroy();controller=null;host.replaceChildren();host.hidden=true;
  }
  async function start(item,onState){
    stop();const current=version;
    host.hidden=false;
    function albumLink(){
      if(version!==current||host.querySelector('a'))return;
      const link=document.createElement('a');link.href=item.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
      link.textContent='Open album on Spotify';host.append(link);
    }
    try{
      const api=await loadPlayerAPI();
      if(version!==current)return;
      const node=document.createElement('div');host.append(node);
      api.createController(node,{uri:item.albumUri,width:'100%',height:80},player=>{
        if(version!==current){player.destroy();return;}
        controller=player;
        player.addListener('ready',()=>{
          if(version!==current)return;
          helpTimer=setTimeout(albumLink,8000);
          try{Promise.resolve(player.play()).catch(albumLink);}catch{albumLink();}
        });
        player.addListener('playback_update',e=>{if(version!==current)return;
          const playing=!e.data.isPaused&&!e.data.isBuffering;
          if(playing)clearTimeout(helpTimer);
          onState(playing);});
      });
    }catch{
      if(version!==current)return;
      albumLink();
    }
  }
  return {start,stop};
}
