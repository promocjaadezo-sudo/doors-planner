// scripts/diagnostic-schedule-days.js
// Diagnostyka: weryfikacja omijania dni wolnych (weekend + święta) przez scheduleSequential
// Uruchom: node scripts/diagnostic-schedule-days.js

const fs = require('fs');
const vm = require('vm');

// Przygotuj środowisko "window" dla schedule.js
global.window = global;

// Wczytaj moduł harmonogramu
const scheduleCode = fs.readFileSync(require('path').join(__dirname,'..','js','schedule.js'),'utf8');
vm.runInThisContext(scheduleCode, { filename: 'schedule.js' });

if(!global.scheduleCore){
  console.error('❌ Brak scheduleCore po załadowaniu schedule.js');
  process.exit(1);
}

function runScenario({nowTs, offWeekdays, holidays, opsCount=6, opTime=120}){
  // Patch Date.now na stabilny punkt startu
  const realNow = Date.now;
  Date.now = ()=> nowTs;

  const state = {
    scheduleConfig: { workdayStartHour:8, workdayLengthHours:8, offWeekdays, holidays },
    operationsCatalog: Array.from({length:opsCount}).map((_,i)=>({id:'op'+(i+1), name:'Operacja '+(i+1), time: opTime})),
    tasks: [],
    orders: []
  };
  const order = { id:'ord1', quantity:1, processId:null };
  const tasks = scheduleCore.generateTasksForOrder(order, state);
  state.tasks = tasks;
  scheduleCore.generateSchedule(state);

  // Przywróć Date.now
  Date.now = realNow;

  return state.tasks.map(t=>{
    const d = new Date(t.startPlanned);
    const day = d.getDay();
    const dateStr = d.toISOString().slice(0,10);
    return { id: t.id, day, date: dateStr, holiday: holidays.includes(dateStr), off: offWeekdays.includes(day) };
  });
}

function fmt(taskInfo){
  return taskInfo.map(x=>`${x.id.slice(-4)} ${x.date} (wd=${x.day}) off=${x.off} hol=${x.holiday}`).join('\n');
}

// Scenariusz 1: Start w niedzielę (powinien przeskoczyć na poniedziałek)
// Uwaga: miesiąc w Date.UTC jest 0-based (9 = październik)
const sundayStart = Date.UTC(2025,9,5,7,0,0,0); // 2025-10-05 07:00:00 UTC
const offWeekdays = [0,6];
const holidays = []; // brak świąt w tym teście
const result1 = runScenario({ nowTs: sundayStart, offWeekdays, holidays });

// Scenariusz 2: Start w piątek, ale poniedziałek święto (powinno ominąć weekend i święto)
const fridayStart = Date.UTC(2025,9,10,7,0,0,0); // 2025-10-10 (piątek)
const holidays2 = ['2025-10-13']; // poniedziałek święto
const result2 = runScenario({ nowTs: fridayStart, offWeekdays, holidays: holidays2 });

function checkNoOff(list, label){
  const offenders = list.filter(x=>x.off || x.holiday);
  if(offenders.length){
    console.log(`⚠️  ${label} - wykryto zadania w dni wolne / święta:`); console.log(fmt(offenders));
  } else {
    console.log(`✅ ${label} - brak zadań zaczynających w dni wolne / święta.`);
  }
}

console.log('=== Scenariusz 1 (start niedziela) ===');
console.log(fmt(result1));
checkNoOff(result1,'Scenariusz 1');

console.log('\n=== Scenariusz 2 (weekend + święto poniedziałek) ===');
console.log(fmt(result2));
checkNoOff(result2,'Scenariusz 2');

// Exit code, jeśli są naruszenia
const bad = [...result1, ...result2].some(x=> x.off || x.holiday);
if(bad){
  console.log('\n❌ Wykryto naruszenia – algorytm nie omija wszystkich dni wolnych.');
  process.exit(2);
} else {
  console.log('\n🎯 Test OK – algorytm omija dni wolne i święta w testowych scenariuszach.');
}
