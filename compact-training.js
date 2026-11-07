const exercises = {
  "leg_press": [
    "Prensa de pernas",
    "Apoia toda a planta do pé e mantém a bacia encostada ao descer."
  ],
  "chest_press": [
    "Press de peito na máquina",
    "Ajusta o banco para teres as pegas à altura do meio do peito."
  ],
  "remada_peito": [
    "Remada com halteres no banco inclinado",
    "Mantém o peito apoiado e puxa os cotovelos para trás."
  ],
  "leg_curl_s": [
    "Flexão de pernas sentada",
    "Alinha o joelho com o eixo da máquina e mantém a anca apoiada."
  ],
  "hip_thrust": [
    "Elevação da bacia com barra",
    "Apoia a parte superior das costas no banco e termina com o tronco alinhado com as coxas."
  ],
  "puxada": [
    "Puxada alta à frente",
    "Mantém o tronco estável e puxa a barra em direção à parte superior do peito."
  ],
  "sup_plano_h": [
    "Supino plano com halteres",
    "Mantém os pés apoiados e sobe os halteres de forma controlada."
  ],
  "leg_ext": [
    "Extensão de pernas na máquina",
    "Alinha o joelho com o eixo de rotação e controla a descida."
  ],
  "hack": [
    "Agachamento na máquina hack",
    "Mantém as costas apoiadas e desce até onde controlas o movimento."
  ],
  "remada_cabo": [
    "Remada baixa no cabo",
    "Mantém o tronco estável e traz a pega até às costelas inferiores."
  ],
  "sup_incl": [
    "Supino inclinado com halteres",
    "Apoia as costas no banco inclinado e controla a descida dos halteres."
  ],
  "leg_curl_d": [
    "Flexão de pernas deitada",
    "Alinha o joelho com o eixo e mantém a bacia apoiada."
  ],
  "goblet": [
    "Agachamento goblet",
    "Segura o peso junto ao peito e mantém os pés apoiados."
  ],
  "pull_through": [
    "Extensão da anca no cabo",
    "Com a corda entre as pernas, leva a anca atrás e volta a estendê-la."
  ],
  "remada_maq": [
    "Remada na máquina",
    "Mantém o peito apoiado e conduz os cotovelos para trás."
  ],
  "smith_squat": [
    "Agachamento na Smith",
    "Ajusta os batentes e escolhe uma posição que permita controlar a descida."
  ],
  "hiperext": [
    "Extensão da anca no banco a 45°",
    "Apoia as coxas, inclina-te pela anca e sobe até alinhar o tronco com as pernas."
  ],
  "rdl_barra": [
    "Peso morto com barra",
    "Mantém a barra perto do corpo e levanta-a de forma controlada; usa uma variante já dominada."
  ],
  "puxada_sup": [
    "Puxada alta com pega supinada",
    "Com as palmas viradas para ti, baixa a barra à frente do peito, sem balanço."
  ],
  "desenv": [
    "Press de ombros sentado com halteres",
    "Mantém as costas apoiadas e empurra os halteres sem arquear a lombar."
  ]
};
const weeks = [
  {
    "A": [
      "leg_press",
      "chest_press",
      "remada_peito",
      "leg_curl_s"
    ],
    "B": [
      "hip_thrust",
      "puxada",
      "sup_plano_h",
      "leg_ext"
    ],
    "C": [
      "hack",
      "remada_cabo",
      "chest_press",
      "leg_curl_s"
    ]
  },
  {
    "A": [
      "hack",
      "sup_incl",
      "remada_cabo",
      "leg_curl_d"
    ],
    "B": [
      "pull_through",
      "remada_maq",
      "chest_press",
      "goblet"
    ],
    "C": [
      "smith_squat",
      "puxada",
      "sup_plano_h",
      "hiperext"
    ]
  },
  {
    "A": [
      "goblet",
      "sup_plano_h",
      "remada_maq",
      "hiperext"
    ],
    "B": [
      "rdl_barra",
      "puxada_sup",
      "sup_incl",
      "leg_press"
    ],
    "C": [
      "leg_press",
      "remada_peito",
      "desenv",
      "leg_curl_d"
    ]
  }
];
const lisbonDate = new Intl.DateTimeFormat('sv-SE', {year:'numeric', month:'2-digit', day:'2-digit', timeZone:'Europe/Lisbon'});
function phaseFor(date) {
  const weeksSinceLaunch = Math.floor((Date.parse(date) - Date.UTC(2026,10,2)) / 604800000);
  return ((weeksSinceLaunch % weeks.length) + weeks.length) % weeks.length;
}
function phaseForSession(date, record, code) {
  if (Number.isInteger(record.phases?.[code])) return record.phases[code];
  // Older entries had exactly one fixed edition.
  if (record.completed===code || Object.keys(record).some(k=>k.startsWith(code+'-') && record[k]!=='')) return 0;
  return phaseFor(date);
}
function samples(record, code, id, count) {
  const base=code+'-'+id+'-';
  return Array.from({length:count},(_,i)=>{
    const kg=record[base+(i+1)+'-kg'], reps=record[base+(i+1)+'-reps'];
    if(kg==null||kg===''||reps==null||reps==='')return null;
    const load=Number(kg), n=Number(reps);
    return Number.isFinite(load)&&load>=0&&load<=1500&&Number.isInteger(n)&&n>0&&n<=150?{load,n}:null;
  });
}
function ready(rows, top, effort) {
  return effort==='room' && rows.every(r=>r && r.n>=top && r.load===rows[0].load);
}
function advice(logs, date, code, id, slot) {
  const count=slot===3?2:3, min=slot===3?10:8, top=slot===3?15:12;
  const record=logs[date]||{}, prefix=code+'-'+id+'-', effort=record[prefix+'effort'];
  const model=String(record[prefix+'station']||'').trim().toLowerCase();
  const rows=samples(record,code,id,count), present=rows.filter(Boolean);
  if(effort==='pain')return ['red','Pára este exercício','Assinalaste dor. Interrompe o movimento e esclarece a causa antes de retomar.'];
  if(effort==='form')return ['red','Baixa a carga','A execução perdeu qualidade. Para a série e usa o escalão inferior se conseguires retomar com controlo.'];
  const short=present.find(r=>r.n<min);
  if(short)return ['red','Baixa a carga','Fizeste '+short.n+' de '+min+' repetições mínimas com '+short.load+' kg. Descansa e experimenta o escalão inferior na próxima série.'];
  if(effort==='limit'&&present.length)return ['red','Baixa a carga','Terminaste no limite. Usa um escalão que permita manter duas repetições em reserva.'];
  const previous=[];
  for(const d of Object.keys(logs).filter(d=>d<date).sort().reverse()){
    const day=logs[d], c=day?.completed;
    if(!['A','B','C'].includes(c))continue;
    const s=weeks[phaseForSession(d,day,c)][c].indexOf(id);
    if(s<0||(s===3)!==(slot===3))continue;
    const base=c+'-'+id+'-';
    if(!model || String(day[base+'station']||'').trim().toLowerCase()!==model)continue;
    previous.push({rows:samples(day,c,id,count),effort:day[base+'effort']});
    if(previous.length===2)break;
  }
  const compare=present.length?[{rows,effort},...previous]:previous;
  if(compare.length>=2&&compare.slice(0,2).every(x=>ready(x.rows,top,x.effort))&&compare[0].rows[0].load===compare[1].rows[0].load)
    return ['green','Podes subir a carga', 'Duas sessões no topo do intervalo a '+compare[0].rows[0].load+' kg, com margem. Experimenta o menor incremento '+(present.length?'na próxima sessão.':'nesta sessão.')];
  if(!present.length)return ['neutral','Escolhe a carga',previous[0]?.rows.some(Boolean)?'Último registo neste equipamento: '+previous[0].rows.filter(Boolean).map(r=>r.load+' kg × '+r.n).join(' · '):'Começa com uma carga que deixe duas ou três repetições em reserva.'];
  return ['neutral','Mantém a carga',!model?'Identifica o equipamento para comparar sessões.':present.length<count?'Continua a registar as séries com boa técnica.':!effort?'Indica como terminou a última série.':'Consolida as repetições antes de subir.'];
}
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
