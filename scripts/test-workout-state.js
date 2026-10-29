const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
process.env.TZ = 'Europe/Lisbon';
const html = fs.readFileSync('index.html', 'utf8');
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1];
const now = Date.parse('2026-10-27T21:00:00Z');
class TestDate extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
  static now() { return now; }
}
function app(storage = new Map(), flavor = 'cat') {
  const nodes = new Map(), listeners = {};
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { innerHTML: '', textContent: '', hidden: true, style: {}, classList: { add() {}, remove() {} }, setAttribute(name,value) { this[name]=value; }, showModal() { this.open=true; }, close() { this.open=false; } });
    return nodes.get(selector);
  };
  const control = { failStore: false, records: [], error: null, queries: [], availability: 0, energy: {}, energyQueries: [], energyErrors: [] };
  const plugin = {
    async checkHealthPermissions() { return {permissions: control.permissions || {READ_WORKOUTS:true,READ_HEART_RATE:vm.runInContext('!!S.hc.hr',context)}}; },
    async requestHealthPermissions() { control.permissionRequests=(control.permissionRequests||0)+1;return {permissions:control.requestedPermissions||control.permissions||{READ_WORKOUTS:true,READ_HEART_RATE:false}}; },
    async isHealthAvailable() { control.availability++; return { available: true }; },
    async queryWorkouts(query) { control.queries.push(query); if (control.error || (query.includeHeartRate&&control.hrError)) throw control.error||control.hrError; return { workouts: control.records }; },
    async queryAggregated(query) { control.energyQueries.push(query); if(control.energyErrors.includes(query.dataType))throw Error('permission denied');const value=control.energy[query.dataType]; return { aggregatedData: value==null?[]:[{value}] }; }
  };
  const context = {
    FLAV: flavor, APPNAME: 'Cat Power', Date: TestDate, console, JSZip: require('jszip'), Uint8Array, ArrayBuffer,
    location: { hash: '', search: '' },
    document: { querySelector: node, getElementById: id => node('#'+id), querySelectorAll: () => [], addEventListener: (type, cb) => (listeners[type] ||= []).push(cb) },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => { if (control.failStore) throw Error('quota'); storage.set(key, value); } },
    Capacitor: { isNativePlatform: () => true, Plugins: { HealthPlugin: plugin } },
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {}, scrollTo() {},
  };
  context.window = context;
  vm.createContext(context); vm.runInContext(source, context);
  return { control, storage, nodes, read: code => vm.runInContext(code, context),
    click: (act, data = {}) => listeners.click.forEach(cb => cb({ target: { closest: selector => selector === '[data-act]' ? { dataset: { act, ...data } } : null } })),
    input: target => listeners.input.forEach(cb => cb({target})),
    change: target => listeners.change.forEach(cb => cb({target})),
    event: (kind, target) => (listeners[kind]||[]).forEach(cb => cb({target})) };
}
function seedDraft(a) {
  a.read(`ui.code='A'; S.setup=true; const ex=exList('A')[0]; S.drafts.A={date:TODAY,t0:Date.parse('2026-10-27T20:00:00Z'),v:{[ex.id]:[{kg:20,r:10,done:true},{kg:22.5,r:8,done:true}]}}; save()`);
}
function workout(id = 'strength', overrides = {}) {
  return { id, sourceBundleId: 'com.sec.android.app.shealth', startDate: '2026-10-27T20:00:00Z', endDate: '2026-10-27T20:50:00Z', duration: 3000, calories: 310, workoutType: 'STRENGTH_TRAINING', heartRate: [{ bpm: 110 }, { bpm: 130 }], ...overrides };
}
(async () => {
  const a = app(); seedDraft(a);
  assert.equal(a.read(`saveWorkout('A')`), true);
  assert.equal(a.read('S.history.length'), 1);
  assert.equal(a.read('S.history[0].sets'), 2);
  assert.equal(a.read('S.history[0].vol'), 380);
  assert.match(a.nodes.get('#app').innerHTML, /Treino guardado com sucesso/);
  assert.match(a.nodes.get('#app').innerHTML, /✓ Série 2/);
  assert.doesNotMatch(a.nodes.get('#app').innerHTML, /data-act="done"|data-act="save"/);
  assert.equal(a.read(`saveWorkout('A')`), false);
  const reopened = app(a.storage);
  assert.match(reopened.nodes.get('#app').innerHTML, /Treino guardado com sucesso/);
  assert.equal(reopened.read('S.history.length'), 1);
  reopened.click('edit-saved', { code: 'A' });
  assert.equal(reopened.read('S.drafts.A.v[exList("A")[0].id][1].done'), true);
  assert.equal(reopened.read(`saveWorkout('A')`), true);
  assert.equal(reopened.read('S.history.length'), 1);
  const failed = app(); seedDraft(failed); failed.control.failStore = true;
  assert.equal(failed.read(`saveWorkout('A')`), false);
  assert.equal(failed.read('S.history.length'), 0);
  assert.equal(failed.read('S.drafts.A.v[exList("A")[0].id][1].kg'), 22.5);
  assert.match(failed.nodes.get('#toast').textContent, /Não foi possível guardar/);
  for (const flavor of ['cat', 'mary']) {
    const watch = app(new Map(), flavor);
    watch.read('S.setup=true; S.hc={on:true,hr:true}');
    watch.control.records = [workout()];
    await watch.read('syncWatch(TODAY,false)');
    assert.equal(watch.control.availability, 1);
    assert.equal(watch.read('S.history.length'), 1);
    assert.equal(watch.read('S.history[0].source'), 'watch');
    assert.equal(watch.read('S.sessions.length'), 0);
    assert.equal(watch.read('S.history[0].watch.hrAvg'), 120);
    assert.equal(watch.read('hStats(S.history[0]).kcal'), 310);
    assert.match(watch.read('vHist()'), /Registo importado do relógio/);
    await watch.read('syncWatch(TODAY,false)');
    assert.equal(watch.read('S.history.length'), 1);
    watch.control.records[0].calories = 330;
    await watch.read('syncWatch(TODAY,false)');
    assert.equal(watch.read('S.history[0].watch.kcal'), 330);
    seedDraft(watch);
    assert.equal(watch.read(`saveWorkout('A')`), true);
    assert.equal(watch.read('S.history.length'), 1);
    assert.equal(watch.read('S.history[0].code'), 'A');
    assert.equal(watch.read('S.history[0].watch.kcal'), 330);
    assert.equal(watch.read('S.history[0].sets'), 2);
    watch.control.records.push(workout('walk', { startDate: '2026-10-27T17:00:00Z', endDate: '2026-10-27T17:30:00Z', duration: 1800, workoutType: 'WALKING', calories: 90 }));
    await watch.read('syncWatch(TODAY,false)');
    assert.equal(watch.read('S.history.length'), 2);
    assert.equal(watch.read('hStats(S.history.find(h=>h.code==="A")).kcal'), 330);
    await watch.read('syncWatch(TODAY,false)');
    assert.equal(watch.read('S.history.length'), 2);
    const before = watch.read('JSON.stringify({history:S.history,logs:S.logs,drafts:S.drafts,watch:S.watch})');
    watch.control.records = [];
    await watch.read('syncWatch(TODAY,false)');
    assert.equal(watch.read('JSON.stringify({history:S.history,logs:S.logs,drafts:S.drafts,watch:S.watch})'), before);
    assert.equal(watch.read('S.hc.lastImport.found'), 0);
    watch.control.error = Error('Health Connect permission denied');
    await watch.read('syncWatch(TODAY,false)');
    assert.equal(watch.read('HC_BUSY'), false);
    assert.equal(watch.read('JSON.stringify({history:S.history,logs:S.logs,drafts:S.drafts,watch:S.watch})'), before);
  }
  const late = app(); seedDraft(late); late.read(`saveWorkout('A'); S.hc={on:true,hr:false}`);
  late.control.records = [workout()]; await late.read('syncWatch(TODAY,false)');
  assert.equal(late.read('S.history.length'), 1);
  assert.equal(late.read('S.history[0].watch.dur'), 50);
  assert.equal(late.control.queries[0].includeHeartRate, false);
  const invalid = app(); invalid.read('S.hc={on:true,hr:true}');
  invalid.control.records = [workout('future', { endDate: '2026-10-28T00:00:00Z' }), workout('invalid', { startDate: 'bad' })];
  await invalid.read('syncWatch(TODAY,false)'); assert.equal(invalid.read('S.history.length'), 0);
  invalid.control.records = [workout()]; invalid.control.failStore = true;
  await invalid.read('syncWatch(TODAY,false)'); assert.equal(invalid.read('S.history.length'), 0); assert.equal(invalid.read('HC_BUSY'), false);
  invalid.control.failStore = false;
  await invalid.read(`fetchWatch('2026-10-25')`);
  const q = invalid.control.queries.at(-1);
  assert.equal(Date.parse(q.endDate) - Date.parse(q.startDate), 25 * 3600000);
  const month = app(); month.read('S.hc={on:true,hr:true}');
  month.control.records = [
    workout('first-day', { startDate: '2026-09-28T09:00:00+01:00', endDate: '2026-09-28T10:00:00+01:00', title: 'Supino inclinado com halteres' }),
    workout('middle', { startDate: '2026-10-10T18:00:00+01:00', endDate: '2026-10-10T19:00:00+01:00' }),
    workout('too-old', { startDate: '2026-09-27T23:00:00+01:00', endDate: '2026-09-27T23:30:00+01:00' }),
    workout('today'),
  ];
  await month.read('syncWatch(TODAY,false)');
  assert.equal(month.control.queries[0].startDate, '2026-09-27T23:00:00.000Z');
  assert.equal(month.read('S.history.length'), 3);
  assert.equal(month.read('S.hc.lastImport.imported'), 3);
  assert.equal(month.read('ui.tab'), 'historico');
  assert.equal(month.read('S.history[0].d'), '2026-09-28');
  assert.equal(month.read('S.history[1].d'), '2026-10-10');
  assert.equal(month.read('S.history[2].d'), '2026-10-27');
  assert.equal(month.read('S.sessions.length'), 0);
  assert.match(month.read('vHoje()'), /03<\/b><small>sessões feitas/);
  assert.equal(month.read('imageExerciseIds(S.history[0])[0]'), 'sup_incl');
  assert.equal(month.read('imageExerciseIds(S.history[1]).length'), 0);
  assert.equal(month.read('S.history[0].ex.length'), 0);
  assert.match(month.read('vHist()'), /img\/sup_incl_0.jpg/);
  assert.match(month.read('vHist()'), /3 treinos encontrados nos últimos 30 dias/);
  assert.match(month.read('vHist()'), /—<\/b><small>peso levantado/);
  month.nodes.set('#chosen-image', { value: 'sup_incl' });
  const key = month.read('encodeURIComponent(historyKey(S.history[1]))');
  month.click('image-add', { select: 'chosen-image', record: key });
  assert.equal(month.read('S.history[1].imageExerciseIds[0]'), 'sup_incl');
  await month.read('syncWatch(TODAY,false)');
  assert.equal(month.read('S.history.length'), 3);
  assert.equal(month.read('S.hc.lastImport.imported'), 0);
  assert.equal(month.read('S.history[1].imageExerciseIds[0]'), 'sup_incl');
  month.control.records[0].title = '<img src=x onerror=alert(1)>';
  await month.read('syncWatch(TODAY,false)');
  assert.doesNotMatch(month.read('vHist()'), /<img src=x/);
  month.read("S.history.find(h=>h.d===TODAY).imageExerciseIds=['remada_peito']");
  seedDraft(month); month.read("saveWorkout('A')");
  assert.equal(month.read('S.history.length'), 3);
  assert.equal(month.read('savedToday("A").imageExerciseIds[0]'), 'remada_peito');
  month.click('edit-saved', { code: 'A' }); month.read("saveWorkout('A')");
  assert.equal(month.read('savedToday("A").imageExerciseIds[0]'), 'remada_peito');
  for (const id of JSON.parse(month.read('JSON.stringify(Object.keys(EXN))'))) {
    for (const position of [0, 1]) assert(fs.existsSync(`img/${id}_${position}.jpg`), `Exercise image missing: ${id}_${position}`);
  }
  const rotation=app();
  rotation.read(`S.sessions=[{d:TODAY,code:'D'}];S.history=[mkHist('2026-10-25','A',[],1,2),mkHist('2026-10-24','D',[],1,2)]`);
  assert.equal(rotation.read('suggested()'), 'B');
  rotation.click('code',{c:'D'});assert.equal(rotation.read('nextCode()'), 'B');
  rotation.read(`S.history.push(mkHist(TODAY,'B',[],Date.now()-3600000,Date.now()-1))`);
  assert.equal(rotation.read('suggested()'), 'C');
  rotation.read(`S.history.push({...mkHist(TODAY,null,[],Date.now()-1000,Date.now()),source:'watch',watch:{id:'unknown',type:'STRENGTH_TRAINING',title:'Musculação'}})`);
  assert.equal(rotation.read('suggested()'), null);
  assert.match(rotation.read('recommendationCard()'), /Falta identificar o último treino/);
  rotation.nodes.set('#classify', {value:'C'});
  rotation.click('rotation-save',{select:'classify',record:encodeURIComponent('watch:unknown')});
  assert.equal(rotation.read('suggested()'), 'D');
  assert.equal(rotation.read('S.history.at(-1).ex.length'),0);
  rotation.read(`S.history.push({...mkHist(TODAY,null,[],Date.now()-1,Date.now()),source:'watch',watch:{id:'walk',type:'WALKING'}})`);
  assert.equal(rotation.read('suggested()'),'D');
  rotation.read(`S.history=S.history.filter(h=>h.watch?.id!=='unknown')`);
  assert.equal(rotation.read('suggested()'),'C');
  rotation.read(`S.history=[{...mkHist(TODAY,null,[],Date.now()-1000,Date.now()),source:'watch',watch:{id:'named',type:'STRENGTH_TRAINING',title:'Treino D'}}]`);
  assert.equal(rotation.read('suggested()'),'A');
  rotation.read(`S.history[0].rotationCode='none'`);assert.equal(rotation.read('trainingHistory().length'),0);
  rotation.read(`S.history=[mkHist(TODAY,'C',[],Date.now()-3000,Date.now()-2000),mkHist(TODAY,'A',[],Date.now()-5000,Date.now()-4000)]`);
  assert.equal(rotation.read('suggested()'),'D');
  const report=app();report.read('S.hc={on:true,hr:true}');
  report.control.energy={'active-calories':629,'total-calories':629};
  report.control.records=[workout('report',{startDate:'2026-10-27T19:00:00Z',endDate:'2026-10-27T20:16:53Z',duration:4613,heartRate:[{timestamp:'2026-10-27T19:00:00Z',bpm:85},{timestamp:'2026-10-27T19:15:00Z',bpm:110},{timestamp:'2026-10-27T19:30:00Z',bpm:125},{timestamp:'2026-10-27T20:00:00Z',bpm:169},{timestamp:'2026-10-27T20:16:53Z',bpm:136},{timestamp:'2026-10-27T18:00:00Z',bpm:999}]})];
  await report.read('syncWatch(TODAY,false)');
  assert.equal(report.read('S.history[0].watch.durationSec'),4613);
  assert.equal(report.read('S.history[0].watch.hrAvg'),125);
  assert.equal(report.read('S.history[0].watch.hrMax'),169);
  assert.equal(report.read('S.history[0].watch.hr.length'),5);
  assert.match(report.read('watchDetails(S.history[0],0)'),/1:16:53/);
  assert.match(report.read('watchDetails(S.history[0],0)'),/629/);
  assert.match(report.read('heartChart(S.history[0],"qa")'),/<path d="M/);
  assert.doesNotMatch(report.read('heartChart(S.history[0],"qa")'),/NaN|undefined/);
  assert.deepEqual(Array.from(report.control.energyQueries[0].dataOrigins),['com.sec.android.app.shealth']);
  report.input({dataset:{hrRecord:encodeURIComponent('watch:com.sec.android.app.shealth:report'),output:'sample-output',cursor:'sample-cursor',duration:'4613'},value:'3'});
  assert.equal(report.nodes.get('#sample-output').textContent,'1:00:00 · 169 bpm');
  const dense=report.read('compactHeartRate(Array.from({length:24000},(_,i)=>[i,i===11111?200:100]),1800)');
  assert(dense.length<=1800);assert(dense.some(p=>p[1]===200));assert.equal(dense[0][0],0);assert.equal(dense.at(-1)[0],23999);
  report.control.energyErrors=['active-calories'];await report.read('syncWatch(TODAY,false)');
  assert.equal(report.read('S.history[0].watch.activeKcal'),629);
  assert.equal(report.read('S.history[0].watch.totalKcal'),629);
  const missing=app();missing.read('S.hc={on:true,hr:false}');missing.control.records=[workout('missing',{heartRate:[]})];await missing.read('syncWatch(TODAY,false)');
  assert.equal(missing.read('S.history[0].watch.activeKcal'),null);assert.equal(missing.read('S.history[0].watch.totalKcal'),null);
  assert.match(missing.read('watchDetails(S.history[0],0)'),/Não há leituras individuais/);
  report.click('photo-open',{ex:'sup_incl',pos:'0'});assert.equal(report.nodes.get('#photo-dialog').open,true);
  assert.equal(report.nodes.get('#photo-large').src,'img/sup_incl_0.jpg');
  report.click('photo-more');assert.equal(report.nodes.get('#photo-large').style.width,'150%');
  report.click('photo-next');assert.equal(report.nodes.get('#photo-large').src,'img/sup_incl_1.jpg');
  report.click('photo-close');assert.equal(report.nodes.get('#photo-dialog').open,false);
  // Block rotation depends on actual exercise exposures, not calendar weeks or watch labels.
  const adaptive=app();
  const first=adaptive.read('exList("A")[0].id');
  assert.equal(first,'sup_incl_maq');
  adaptive.read('S.drafts={};S.start="2025-01-01"');
  assert.equal(adaptive.read('exList("A")[0].id'),first);
  adaptive.read(`S.history=Array.from({length:5},(_,i)=>({d:'2026-10-'+String(i+1).padStart(2,'0'),code:'A',ex:[{id:'sup_incl_maq',sets:[{kg:20,r:8+i}]}]}));S.drafts={}`);
  assert.equal(adaptive.read('exList("A")[0].id'),first);
  adaptive.read(`S.history.push({d:'2026-10-06',code:'A',ex:[{id:'sup_incl_maq',sets:[{kg:20,r:12}]}]});S.drafts={}`);
  assert.notEqual(adaptive.read('exList("A")[0].id'),first);
  assert.equal(adaptive.read('exList("A")[0].muscle'),'Peito');
  const pinned=adaptive.read('draft("A").ids[0]');
  adaptive.read(`S.history=[]`);
  assert.equal(adaptive.read('exList("A")[0].id'),pinned);
  adaptive.read(`S.drafts={};S.history=Array.from({length:4},(_,i)=>({d:'2026-10-'+String(i+1).padStart(2,'0'),code:'A',ex:[{id:'elev_lat_maq',sets:[{kg:5,r:12}]}]}))`);
  assert.notEqual(adaptive.read('exList("A")[4].id'),'elev_lat_maq');
  // Plateau detection requires three complete, comparable normal-recovery exposures and RIR.
  adaptive.read(`S.drafts={};S.history=Array.from({length:3},(_,i)=>({d:'2026-10-'+String(i+1).padStart(2,'0'),code:'A',ex:[{id:'sup_incl_maq',rir:2,sets:Array.from({length:4},()=>({kg:20,r:8}))}]}))`);
  assert.equal(adaptive.read('variantChoice("A",0).changed'),true);
  adaptive.read('S.history[2].readiness="tired"');
  assert.equal(adaptive.read('variantChoice("A",0).changed'),undefined);
  // Effort and drafts survive save/reload/edit, and failure does not recommend more load.
  const effort=app();seedDraft(effort);const eid=effort.read('exList("A")[0].id');
  effort.change({id:'readiness',value:'tired',dataset:{}});
  effort.change({id:'',value:'0',dataset:{rir:eid}});
  assert.equal(effort.read(`coachPlan(exList('A')[0],null,false,2,[{kg:20,r:20,done:true}])[1].kg`),20);
  assert.equal(effort.read(`saveWorkout('A')`),true);
  assert.equal(effort.read('S.history[0].ex[0].rir'),0);
  assert.equal(effort.read('S.history[0].readiness'),'tired');
  const effortReload=app(effort.storage);effortReload.click('edit-saved',{code:'A'});
  assert.equal(effortReload.read('S.drafts.A.rir[exList("A")[0].id]'),0);
  assert.equal(effortReload.read('S.drafts.A.readiness'),'tired');
  const notLost=effortReload.read('JSON.stringify(S.drafts.A.v)');effortReload.click('variant',{slot:'0'});
  assert.equal(effortReload.read('JSON.stringify(S.drafts.A.v)'),notLost);
  effortReload.change({id:'readiness',value:'pain',dataset:{}});
  assert.equal(effortReload.read(`coachPlan(exList('A')[0],sugg(exList('A')[0]),false,2,[]).every(x=>x===null)`),true);
  const progress=app();progress.read(`S.logs.sup_incl_maq=[{d:'2026-10-26',rir:2,sets:Array.from({length:4},()=>({kg:20,r:10}))}]`);
  assert.equal(progress.read('sugg(exList("A")[0]).hit'),true);
  progress.read('S.logs.sup_incl_maq[0].rir=0');assert.equal(progress.read('sugg(exList("A")[0]).hit'),false);
  // Nutrition reviews need repeat measurements, adherence, a bounded step and a 14-day cooldown.
  const food=app();assert.equal(food.read('nutritionReview().delta'),0);
  food.read(`S.weights=['2026-10-12','2026-10-14','2026-10-17','2026-10-20','2026-10-23','2026-10-25','2026-10-27'].map(d=>({d,kg:86}));S.profile.goal='ganhar'`);
  assert.equal(food.read('nutritionReview().delta'),150);
  food.nodes.set('#food-adherence',{checked:false});food.click('nutrition-apply');assert.equal(food.read('S.adj'),0);
  food.nodes.set('#food-adherence',{checked:true});food.click('nutrition-apply');assert.equal(food.read('S.adj'),150);
  assert.equal(food.read('nutritionReview().delta'),0);food.click('nutrition-apply');assert.equal(food.read('S.adj'),150);
  assert.equal(app(food.storage).read('nutritionReview().delta'),0);
  food.read('S.nutrition={};S.adj=600');assert.equal(food.read('nutritionReview().delta'),0);
  food.read('S.adj=0;S.weights=S.weights.slice(-3)');assert.equal(food.read('nutritionReview().delta'),0);
  // Completing the final prescribed set stops rest, including reduced-volume plans and extra logged sets.
  for(const flavor of ['cat','mary'])for(const mode of ['normal','tired','deload']){
    const timer=app(new Map(),flavor);timer.read(`S.setup=true;ui.code='B';S.start=${mode==='deload'?"'2026-09-29'":"TODAY"};const d=draft('B');d.readiness='${mode==='tired'?'tired':'normal'}';exList('B').forEach(ex=>{d.v[ex.id]=Array.from({length:plannedSets(ex,d)},()=>({kg:15,r:12,done:true}))});const last=exList('B').at(-1);d.v[last.id].at(-1).done=false;save()`);
    const id=timer.read('exList("B").at(-1).id'),k=timer.read('S.drafts.B.v[exList("B").at(-1).id].length-1');
    timer.read('startTimer(60)');assert.equal(timer.nodes.get('#timer').hidden,false);
    timer.click('done',{ex:id,k:String(k),rest:'60'});
    assert.equal(timer.read('workoutComplete("B")'),true);assert.equal(timer.read('T.id'),null);assert.equal(timer.nodes.get('#timer').hidden,true);
    assert.match(timer.nodes.get('#app').innerHTML,/Todas as séries concluídas/);
    timer.read('tick()');assert.equal(timer.nodes.get('#timer').hidden,true);
    timer.click('done',{ex:id,k:String(k),rest:'60'});assert.equal(timer.read('workoutComplete("B")'),false);
    timer.read('startTimer(60)');assert.equal(timer.nodes.get('#timer').hidden,false);
    timer.read('saveWorkout("B")');assert.equal(timer.nodes.get('#timer').hidden,true);assert.equal(timer.read('T.code'),null);
  }
  const revoked=app();revoked.read('S.setup=true;S.hc={on:true,hr:true}');revoked.control.permissions={READ_WORKOUTS:false};
  await revoked.read('syncWatch(TODAY,false)');assert.equal(revoked.control.permissionRequests,1);assert.equal(revoked.control.queries.length,0);assert.equal(revoked.read('HC_BUSY'),false);
  assert.match(revoked.read('vHoje()'),/Falta autorizar/);assert.match(revoked.read('vWatchEu()'),/Falta autorizar/);
  revoked.control.requestedPermissions={READ_WORKOUTS:true,READ_HEART_RATE:false};revoked.control.records=[workout()];await revoked.read('syncWatch(TODAY,false)');assert.equal(revoked.read('S.history.length'),1);
  const hrFailure=app();hrFailure.read('S.setup=true;S.hc={on:true,hr:true}');hrFailure.control.hrError=Error('HR read failed');hrFailure.control.records=[workout()];
  await hrFailure.read('syncWatch(TODAY,false)');assert.equal(hrFailure.read('S.history.length'),1);assert.equal(hrFailure.control.queries.length,2);assert.equal(hrFailure.control.queries[1].includeHeartRate,false);assert.match(hrFailure.read('vHist()'),/sem frequência cardíaca/);
  const empty=app();empty.read('S.setup=true;S.hc={on:true,hr:false}');await empty.read('syncWatch(TODAY,false)');assert.match(empty.read('vHoje()'),/Isto não significa/);assert.equal(empty.read('!!S.hc.monthImported'),false);
  assert.equal(empty.read('S.hc.lastImport.read.received'),0);
  empty.control.records=[workout('bad-date',{startDate:'invalid'}),workout('future',{endDate:'2026-10-28T10:00:00Z'}),workout('old',{startDate:'2026-08-01T10:00:00Z',endDate:'2026-08-01T11:00:00Z'})];await empty.read('syncWatch(TODAY,false)');
  assert.equal(empty.read('S.hc.lastImport.read.received'),3);assert.equal(empty.read('S.hc.lastImport.read.invalid'),1);assert.equal(empty.read('S.hc.lastImport.read.unfinished'),1);assert.equal(empty.read('S.hc.lastImport.read.outside'),1);
  assert.match(empty.read('vHoje()'),/não os aceitou/);assert.doesNotMatch(empty.read('vHoje()'),/devolveu 0/);assert.match(empty.read('vHoje()'),/Registos recebidos: 3/);

  const exact=app();seedDraft(exact);exact.read('saveWorkout("A");S.hc={on:true,hr:false}');
  assert.equal(exact.read('hStats(S.history[0]).kcal'),null);assert.match(exact.read('savedWorkoutCard(S.history[0])'),/Aguarda relógio/);
  exact.control.records=[workout('exact',{duration:3746,startDate:'2026-10-27T19:47:34Z',endDate:'2026-10-27T20:50:00Z',calories:520})];exact.control.energy={'active-calories':463,'total-calories':520};await exact.read('syncWatch(TODAY,false)');
  assert.equal(exact.read('S.history.length'),1);assert.equal(exact.read('hStats(S.history[0]).kcal'),463);assert.equal(exact.read('hStats(S.history[0]).durationSec'),3746);
  assert.match(exact.read('savedWorkoutCard(S.history[0])'),/1:02:26/);assert.match(exact.read('savedWorkoutCard(S.history[0])'),/463/);assert.match(exact.read('savedWorkoutCard(S.history[0])'),/kcal ativas/);
  assert.match(exact.read('watchDetails(S.history[0],0)'),/520/);
  const samsung=app();samsung.read('S.setup=true;S.hc.on=false');
  const csv=['com.samsung.shealth.exercise,version', 'com.samsung.health.exercise.datauuid,com.samsung.health.exercise.start_time,com.samsung.health.exercise.end_time,com.samsung.health.exercise.time_offset,com.samsung.health.exercise.duration,com.samsung.health.exercise.exercise_type,total_calorie,com.samsung.health.exercise.mean_heart_rate,com.samsung.health.exercise.max_heart_rate', 'test-id,2026-10-27 19:47:34.000,2026-10-27 20:50:03.000,UTC+0000,3746000,15002,463,118,145','old-id,2026-08-01 10:00:00,2026-08-01 11:00:00,UTC+0100,3600000,15002,100,100,130','invalid,not-a-date,2026-10-27 20:50:03,UTC+0000,3746000,15002,100,100,130'].join('\n');
  const result=samsung.read(`parseSamsung(${JSON.stringify(csv)})`);assert.equal(result.workouts.length,1);assert.equal(result.rejected,1);assert.equal(result.workouts[0].durationSec,3746);assert.equal(result.workouts[0].totalKcal,463);assert.equal(result.workouts[0].hrAvg,118);assert.equal(result.workouts[0].hrMax,145);assert.equal(result.workouts[0].start,'2026-10-27T19:47:34.000Z');
  assert.equal(samsung.read(`samsungTime('2026-10-27 20:00:00','3600000')`),Date.parse('2026-10-27T19:00:00Z'));
  seedDraft(samsung);samsung.read('saveWorkout("A")');samsung.read(`SAMSUNG_PREVIEW=parseSamsung(${JSON.stringify(csv)});importSamsung()`);assert.equal(samsung.read('S.history.length'),1);assert.equal(samsung.read('S.history[0].watch.kcal'),463);assert.equal(samsung.read('S.history[0].sets'),2);assert.match(samsung.read('savedWorkoutCard(S.history[0])'),/1:02:26/);
  samsung.read(`SAMSUNG_PREVIEW=parseSamsung(${JSON.stringify(csv)});importSamsung()`);assert.equal(samsung.read('S.history.length'),1);
  samsung.control.records=[workout('hc-id',{startDate:'2026-10-27T19:47:34Z',endDate:'2026-10-27T20:50:03Z',duration:3746})];samsung.read('S.hc={on:true,hr:false}');await samsung.read('syncWatch(TODAY,false)');assert.equal(samsung.read('S.history.length'),1);
  assert.throws(()=>samsung.read(`parseSamsung('not,a,workout\\n1,2,3')`),/ficheiro de exercícios/);
  const zipApp=app();zipApp.read('S.setup=true');const zip=new (require('jszip'))();zip.file('Samsung Health/com.samsung.shealth.exercise.20261029.csv',csv);zip.file('Samsung Health/com.samsung.shealth.exercise.hr_zone.20261029.csv','irrelevant');const bytes=await zip.generateAsync({type:'uint8array'});zipApp.read(`globalThis.syntheticCsv=${JSON.stringify(csv)}`);zipApp.read(`globalThis.zipBytes=Uint8Array.from(${JSON.stringify(Array.from(bytes))})`);
  await zipApp.read(`selectSamsungFile({name:'export.csv',size:syntheticCsv.length,text:async()=>syntheticCsv})`);assert.equal(zipApp.read('SAMSUNG_PREVIEW.workouts.length'),1);
  await zipApp.read(`selectSamsungFile({name:'export.zip',size:zipBytes.length,arrayBuffer:async()=>zipBytes})`);assert.equal(zipApp.read('SAMSUNG_PREVIEW.workouts.length'),1);
  await zipApp.read(`selectSamsungFile({name:'wrong.csv',size:10,text:async()=>'wrong,data'})`);assert.equal(zipApp.read('SAMSUNG_PREVIEW'),null);assert.match(zipApp.read('vHist()'),/Não foi encontrado o ficheiro/);
  const picker=app();picker.read('S.hc={on:true,hr:false}');picker.event('click',{id:'samsung-file'});assert.equal(picker.read('SAMSUNG_PICKER'),true);const before=picker.nodes.get('#app').innerHTML;picker.read('autoWatch();render()');assert.equal(picker.control.queries.length,0);assert.equal(picker.nodes.get('#app').innerHTML,before);picker.event('cancel',{id:'samsung-file'});assert.equal(picker.read('SAMSUNG_PICKER'),false);
  console.log('PASS: Samsung CSV import, timezone, 30-day window, invalid rows, match and duplicate prevention. Synthetic data only.');
  console.log('PASS: final-set timer stop, reduced-volume plans, undo/save cleanup; permission refresh/re-request, HR fallback, persistent empty/error guidance; exact imported summary and separate active/total calories.');
  console.log('PASS: adaptive exposure blocks, pinned machines, comparable plateaus, effort/recovery persistence, no load increases at failure/pain, evolution reporting, nutrition data/adherence/cooldown/bounds.');
  console.log('PASS: workout persistence, monthly imports, chronological next-workout rotation and classification, exercise image association/zoom, exact duration, separate calories, actual HR graph/scrubbing, dense-sample peak preservation and error handling. Health Connect responses are mocked.');
})().catch(error => { console.error(error); process.exitCode = 1; });
