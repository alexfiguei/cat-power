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
    if (!nodes.has(selector)) nodes.set(selector, { innerHTML: '', textContent: '', hidden: true, style: {}, classList: { add() {}, remove() {} } });
    return nodes.get(selector);
  };
  const control = { failStore: false, records: [], error: null, queries: [], availability: 0 };
  const plugin = {
    async isHealthAvailable() { control.availability++; return { available: true }; },
    async queryWorkouts(query) { control.queries.push(query); if (control.error) throw control.error; return { workouts: control.records }; }
  };
  const context = {
    FLAV: flavor, APPNAME: 'Cat Power', Date: TestDate, console,
    location: { hash: '', search: '' },
    document: { querySelector: node, getElementById: id => node('#'+id), querySelectorAll: () => [], addEventListener: (type, cb) => (listeners[type] ||= []).push(cb) },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => { if (control.failStore) throw Error('quota'); storage.set(key, value); } },
    Capacitor: { isNativePlatform: () => true, Plugins: { HealthPlugin: plugin } },
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {}, scrollTo() {},
  };
  context.window = context;
  vm.createContext(context); vm.runInContext(source, context);
  return { control, storage, nodes, read: code => vm.runInContext(code, context),
    click: (act, data = {}) => listeners.click.forEach(cb => cb({ target: { closest: selector => selector === '[data-act]' ? { dataset: { act, ...data } } : null } })) };
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
  console.log('PASS: saved workout persistence; monthly Health Connect import with correct dates and no duplicates; linked sessions; both profiles; image matching and explicit association; storage/permission failures; DST. Health Connect responses are mocked.');
})().catch(error => { console.error(error); process.exitCode = 1; });
