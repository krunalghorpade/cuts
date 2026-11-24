// Public gallery pages matched to the title, release year, and physical format.
const galleries={
  tt0113277:'heat-1995-r1-dvd-cover-label',
  tt0133093:'the-matrix-1999-dvd-cover-label',
  tt0245429:'spirited-away-2001-ws-r1',
  tt0286106:'signs-2002-r1-dvd-cover',
  tt0332280:'the-notebook-2004-r1-r4',
  tt0338751:'the-aviator-2004-r1',
  tt0408306:'munich-2005-r1-dvd-cover-label',
  tt0468569:'the-dark-knight-2008-r1-dvd-blu-ray-cover',
  tt0848228:'marvels-the-avengers-2012-r4-blu-ray-cover',
  tt1130884:'shutter-island-2010-blu-ray-dvd-covers',
  tt1219827:'ghost-in-the-shell-2017-blu-ray-cover',
  tt1345836:'the-dark-knight-rises-2012-r1-dvd-blu-ray-cover',
  tt1375666:'inception-2010-dvd-blu-ray-cover',
  tt1895587:'spotlight',
  tt2015381:'guardians-of-the-galaxy-2014-r4-blu-ray-cover',
  tt2543164:'arrival-2016-r1-blu-ray-cover-label',
  tt3315342:'logan-2017-r1-blu-ray-cover-labels',
  tt7961060:'dragon-ball-super-broly-2018-r1-blu-ray-cover'
};

export function dvdCoverReference(item){
  if(!['movies','anime-movies','shows','anime'].includes(item.category))return null;
  const slug=galleries[item.id];
  if(slug)return {url:'https://dvdcover.com/'+slug+'/',label:'View cover on DVDcover.com'};
  const url=new URL('https://dvdcover.com/');
  const isMovie=item.category==='movies'||item.category==='anime-movies';
  url.searchParams.set('s',[item.title,isMovie&&item.year].filter(Boolean).join(' '));
  return {url:url.href,label:'Find covers on DVDcover.com'};
}
