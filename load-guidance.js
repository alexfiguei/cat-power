// Compare only working sets from this variant and the equipment selected for today.
function loadGuidance(ex, day, rows, records, station, today, deload) {
  const result = (tone, title, why, kg = null) => ({tone, title, why, kg});
  const lower = kg => kg > ex.inc ? Math.round((kg - ex.inc) * 100) / 100 : null;
  const reduce = (why, kg) => result('red', 'Baixa a carga', why, lower(kg));
  const normalized = value => String(value || '').trim().toLocaleLowerCase('pt');
  const matched = records.filter(record => record.d < today && station &&
    normalized(record.station) === normalized(station) && record.sets?.length)
    .slice().sort((a,b) => b.d.localeCompare(a.d));
  const recent = matched[0];
  const sets = rows.filter(row => row?.done && row.r > 0);
  const last = sets.at(-1);
  const latest = last || recent?.sets.at(-1);
  const kg = latest?.kg || 0;
  const effort = day.rir?.[ex.id];
  const condition = day.condition?.[ex.id];
  if (day.readiness === 'pain' || condition === 'pain')
    return result('red', 'Pára se o movimento provocar dor', 'Interrompe o exercício doloroso e esclarece a causa antes de retomar.');
  if (condition === 'form') return reduce('A técnica perdeu qualidade. Descansa e revê a execução.', kg);
  if (last && last.r < ex.reps[0]) return reduce('A última série ficou abaixo do mínimo de '+ex.reps[0]+' repetições.', kg);
  if (effort === 0) return reduce('Registaste zero repetições em reserva.', kg);
  if (!last && recent && (recent.rir === 0 || recent.condition === 'form' || recent.sets.at(-1).r < ex.reps[0]))
    return reduce('O último treino neste equipamento terminou no limite ou abaixo do alvo.', kg);
  if (deload || day.readiness === 'tired') {
    const why = deload ? 'Semana leve. Deixa margem em cada série.' : 'Hoje indicaste recuperação fraca.';
    return last ? result('neutral','Mantém o esforço leve',why,kg || null) : result('red','Começa mais leve',why,kg ? Math.round(kg*0.9*2)/2 || null : null);
  }
  if (!last && recent && Date.parse(today)-Date.parse(recent.d)>42*864e5)
    return reduce('Passaram mais de seis semanas desde este registo.', kg);
  const strong = record => record && record.readiness === 'normal' && !record.deload &&
    (!record.condition || record.condition === 'ok') && record.rir >= 2 && record.sets.length >= ex.sets &&
    record.sets.every(s => s.kg > 0 && s.kg === record.sets[0].kg && s.r >= ex.reps[1]);
  const pair = last ? [{sets, rir:effort, readiness:day.readiness || 'normal',condition},recent] : matched.slice(0,2);
  if (pair.length === 2 && pair.every(strong) && pair[0].sets[0].kg === pair[1].sets[0].kg &&
      pair.every(r => !r.d || Date.parse(today)-Date.parse(r.d)<=42*864e5))
    return result('green',last?'Podes subir na próxima sessão':'Podes subir a carga','Duas sessões com todas as séries no topo e pelo menos duas repetições em reserva. Usa o menor incremento disponível.',kg+ex.inc);
  if (!station) return result('neutral','Identifica o equipamento','Escreve o nome ou número da máquina para comparar as tuas sessões.',last?.kg || null);
  return result('neutral',kg?'Mantém a carga':'Escolhe a carga inicial',kg?'Continua a registar repetições e reserva final.':'Escolhe uma carga controlável e regista a primeira série.',kg || null);
}
