const load = async path => {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error("Unable to read the store catalog");
  return response.json();
};
const [trakt, music, games, playlistSources] = await Promise.all([
  load("trakt-items.json"), load("spotify-items.json"), load("backloggd-items.json"), load("playlists.json")
]);
export const playlists = playlistSources;
export const gameList = "https://backloggd.com/u/krunalghorpade/list/my-games/";
export const traktList = "https://app.trakt.tv/users/krunal-ghorpade-324337/lists/my-watch-list?share=P0J99Y06TeYp";

export const CATEGORIES = [
  {
    "id": "movies",
    "label": "Movie DVDs",
    "short": "MOVIES",
    "format": "DVD",
    "source": "Trakt list",
    "accent": "#d65b55",
    "rack": {
      "x": -7.35,
      "z": -2,
      "side": -1
    }
  },
  {
    "id": "shows",
    "label": "Series",
    "short": "SERIES",
    "format": "BOX SET",
    "source": "Trakt list",
    "accent": "#d99043",
    "rack": {
      "x": -7.35,
      "z": -2,
      "side": 1
    }
  },
  {
    "id": "anime",
    "label": "Anime",
    "short": "ANIME",
    "format": "BOX SET",
    "source": "Trakt list",
    "accent": "#a4a4a4"
  },
  {
    "id": "game-discs",
    "label": "Game DVDs",
    "short": "GAME DISCS",
    "format": "DISC",
    "source": "Backloggd",
    "accent": "#4c9daa",
    "rack": {
      "x": -2.45,
      "z": -2,
      "side": -1
    }
  },
  {
    "id": "cartridges",
    "label": "Game cartridges",
    "short": "CARTRIDGES",
    "format": "CART",
    "source": "Backloggd",
    "accent": "#8875b5",
    "rack": {
      "x": -2.45,
      "z": -2,
      "side": 1
    }
  },
  {
    "id": "vinyl",
    "label": "Vinyl records",
    "short": "VINYL",
    "format": "LP",
    "source": "Spotify playlist",
    "accent": "#bd6480",
    "rack": {
      "x": 2.45,
      "z": -2,
      "side": -1
    }
  },
  {
    "id": "cds",
    "label": "CDs",
    "short": "CDS",
    "format": "CD",
    "source": "Spotify playlist",
    "accent": "#6c9c70",
    "rack": {
      "x": 2.45,
      "z": -2,
      "side": 1
    }
  },
  {
    "id": "cassettes",
    "label": "Cassettes",
    "short": "CASSETTES",
    "format": "TAPE",
    "source": "Spotify playlist",
    "accent": "#c9934e",
    "rack": {
      "x": 7.35,
      "z": -2,
      "side": -1
    }
  }
];
export const categoryById = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
// Merge multiple Spotify editions with the same credited artist and album title.
const releases=new Map();
const releaseKey=item=>item.creator.toLowerCase()==='various artists' ? item.albumUri
  : JSON.stringify([item.creator.trim().toLowerCase(),item.title.trim().toLowerCase()]);
for(const item of music){
  const key=releaseKey(item);
  let group=releases.get(key);
  if(!group){group={album:item,lists:new Set()};releases.set(key,group);}
  if(item.releaseDate < group.album.releaseDate)group.album=item;
  for(const id of item.playlists || [])group.lists.add(id);
}
const retainedMusic=music.filter(item=>releases.get(releaseKey(item)).album.albumUri===item.albumUri)
  .map(item=>({...item,playlists:[...releases.get(releaseKey(item)).lists]}));
const seen = new Set();
export const ITEMS = [...trakt, ...retainedMusic, ...games].filter(item => {
  const key = item.albumUri ? item.albumUri + "|" + item.category : item.id;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}).map(item => ({...item, accent: categoryById[item.category].accent}));
