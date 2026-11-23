// Approximate outside dimensions of a representative North American retail edition (mm).
const packages=[
  ['Game Boy Advance',/^(?:game boy advance|gba)$/i,127,127,25,'#57455e'],
  ['Game Boy Color',/^(?:game boy color|gbc)$/i,127,127,25,'#414444'],
  ['Game Boy',/^(?:game boy|gb)$/i,127,127,25,'#878a82'],
  ['Nintendo 3DS',/^(?:new )?(?:nintendo )?(?:2ds|3ds|n2ds|n3ds)(?: xl)?$/i,137,124,13,'#e1ded7'],
  ['Nintendo DS',/^(?:nintendo ds(?:i| lite)?|nds)$/i,135,122,15,'#38373c'],
  ['Nintendo GameCube',/^(?:nintendo )?(?:gamecube|ncube|ngc)$/i,135,190,14,'#44395a'],
  ['PlayStation Portable',/^(?:sony )?(?:playstation portable|psp)$/i,105,177,14,'#e0ddd7'],
  ['PlayStation 2',/^(?:sony )?(?:playstation 2|ps2)$/i,135,190,14,'#292c35'],
  ['PlayStation',/^(?:sony )?(?:playstation|ps1|psx)$/i,142,125,10,'#434449'],
  ['Xbox',/^(?:microsoft )?(?:xbox|original xbox|xbox og|og xbox)$/i,135,190,14,'#46633a'],
  ['Sega Genesis',/^(?:sega )?(?:genesis|mega drive)$/i,145,195,27,'#252529'],
  ['Super Nintendo',/^(?:super nintendo(?: entertainment system)?|snes|super famicom)$/i,179,125,30,'#7b7181'],
  ['Famicom',/^(?:nintendo )?(?:famicom|famicon|family computer)$/i,139,98,21,'#985755'],
  ['Nintendo Entertainment System',/^(?:nintendo entertainment system|nes)$/i,126,179,26,'#47454b'],
  ['Nintendo 64',/^(?:nintendo 64|n64)$/i,179,125,30,'#4c4752']
];
export function retroPackage(platform){return packages.find(p=>p[1].test((platform||'').trim()));}
