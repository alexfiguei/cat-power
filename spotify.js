function spotifyPlaylist(raw){
  const value=raw.trim();if(!value)return '';
  const uri=/^spotify:playlist:([A-Za-z0-9]{22})$/.exec(value);
  if(uri)return 'https://open.spotify.com/playlist/'+uri[1];
  try{
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
    if(u.hostname==='spotify.link'&&/^\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname))return u.origin+u.pathname;
    const match=/^\/(?:intl-[a-zA-Z-]+\/)?playlist\/([A-Za-z0-9]{22})\/?$/.exec(u.pathname);
    return u.hostname==='open.spotify.com'&&match?'https://open.spotify.com/playlist/'+match[1]:null;
  }catch{return null}
}
