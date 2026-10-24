const C='catpower-v5';
const CORE=["./", "index.html", "manifest.webmanifest", "manifest-mary.webmanifest", "icons/mary-192.png", "icons/mary-512.png", "icons/icon-192.png", "icons/icon-512.png", "img/abd_cabo_0.jpg", "img/abd_cabo_1.jpg", "img/bulgaro_0.jpg", "img/bulgaro_1.jpg", "img/chest_press_0.jpg", "img/chest_press_1.jpg", "img/cruc_cabo_0.jpg", "img/cruc_cabo_1.jpg", "img/curl_incl_0.jpg", "img/curl_incl_1.jpg", "img/curl_martelo_0.jpg", "img/curl_martelo_1.jpg", "img/desenv_0.jpg", "img/desenv_1.jpg", "img/elev_lat_0.jpg", "img/elev_lat_1.jpg", "img/elev_lat_cabo_0.jpg", "img/elev_lat_cabo_1.jpg", "img/face_pull_0.jpg", "img/face_pull_1.jpg", "img/gemeos_pe_0.jpg", "img/gemeos_pe_1.jpg", "img/gemeos_sent_0.jpg", "img/gemeos_sent_1.jpg", "img/hack_0.jpg", "img/hack_1.jpg", "img/hip_thrust_0.jpg", "img/hip_thrust_1.jpg", "img/leg_curl_d_0.jpg", "img/leg_curl_d_1.jpg", "img/leg_curl_s_0.jpg", "img/leg_curl_s_1.jpg", "img/leg_ext_0.jpg", "img/leg_ext_1.jpg", "img/leg_press_0.jpg", "img/leg_press_1.jpg", "img/pallof_0.jpg", "img/pallof_1.jpg", "img/puxada_0.jpg", "img/puxada_1.jpg", "img/puxada_neutra_0.jpg", "img/puxada_neutra_1.jpg", "img/rdl_0.jpg", "img/rdl_1.jpg", "img/remada_peito_0.jpg", "img/remada_peito_1.jpg", "img/remada_uni_0.jpg", "img/remada_uni_1.jpg", "img/sup_incl_0.jpg", "img/sup_incl_1.jpg", "img/tric_cabeca_0.jpg", "img/tric_cabeca_1.jpg", "img/tric_corda_0.jpg", "img/tric_corda_1.jpg"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put('index.html',cp));return res}).catch(()=>caches.match('index.html')));return}
  if(u.origin===location.origin||u.hostname.endsWith('fonts.googleapis.com')||u.hostname.endsWith('fonts.gstatic.com')){
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));return res})));
  }
});
