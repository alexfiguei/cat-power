const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const api = vm.runInNewContext(fs.readFileSync('spotify.js','utf8')+fs.readFileSync('compact-training.js','utf8')+
  '\n;({exercises,weeks,phaseFor,phaseForSession,lisbonDate,advice,spotifyPlaylist})',{URL,Intl,Date});
const {weeks,phaseFor,advice,spotifyPlaylist} = api;
for (const [i,week] of weeks.entries()) {
  for (const code of ['A','B','C']) {
    assert.equal(new Set(week[code]).size,4);
    week[code].forEach((id,slot)=>{
      assert.notEqual(id,weeks[(i+1)%3][code][slot]);
      assert.ok(api.exercises[id]);
      for(const pos of [0,1])assert.ok(fs.existsSync('img/'+id+'_'+pos+'.jpg'));
    });
  }
}
assert.equal(phaseFor('2026-11-08'),0);
assert.equal(phaseFor('2026-11-09'),1);
assert.equal(phaseFor('2026-11-23'),0);
assert.equal(api.lisbonDate.format(new Date('2027-03-28T23:05:00Z')),'2027-03-29');
assert.equal(api.phaseForSession('2026-11-09',{'A-leg_press-1-reps':'8'},'A'),0);
const session=(effort,load=20)=>({
 completed:'A',phases:{A:0},'A-chest_press-station':'M4','A-chest_press-effort':effort,
 ...Object.fromEntries([1,2,3].flatMap(n=>[['A-chest_press-'+n+'-kg',String(load)],['A-chest_press-'+n+'-reps','12']]))
});
const first='2026-11-03',today='2026-11-07';
const logs={[first]:session('room'),[today]:session('room')};
const color=()=>advice(logs,today,'A','chest_press',1)[0];
assert.equal(color(),'green');
logs[today]['A-chest_press-station']='M5';assert.equal(color(),'neutral');
logs[today]=session('room',22);assert.equal(color(),'neutral');
logs[today]=session('one');assert.equal(color(),'neutral');
logs[today]=session('room');logs[today]['A-chest_press-1-reps']='';assert.equal(color(),'neutral');
logs[today]['A-chest_press-1-reps']='7';assert.equal(color(),'red');
logs[today]=session('form');assert.equal(color(),'red');
logs[today]=session('pain');assert.match(advice(logs,today,'A','chest_press',1)[1],/Pára/);
logs[today]=session('room');delete logs[first].completed;assert.equal(color(),'neutral');
const id='37i9dQZF1DZ06evO3eIivx',url='https://open.spotify.com/playlist/'+id;
assert.equal(spotifyPlaylist(url+'?si=abc'),url);
assert.equal(spotifyPlaylist('spotify:playlist:'+id),url);
assert.equal(spotifyPlaylist('https://spotify.link/abc123'),'https://spotify.link/abc123');
assert.equal(spotifyPlaylist('https://example.org/playlist/'+id),null);
assert.equal(spotifyPlaylist(''),'');
console.log('PASS: compact weekly rotation, Lisbon calendar, legacy logs, per-machine feedback and Spotify playlists.');
