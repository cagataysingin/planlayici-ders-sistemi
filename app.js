const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem('vize_' + key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { localStorage.setItem('vize_' + key, JSON.stringify(value)); }
};
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
let study = store.get('study', {}), tasks = store.get('tasks', []), notes = store.get('notes', []), target = store.get('target', '');
function toast(message) { const el=$('#toast'); if(!el)return; el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200); }
function esc(value) { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showPage(page) {
  $$('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+page));
  $$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
  const names={dashboard:'Genel Bakış',study:'Ders Çalışma',calendar:'Ders Programı & Sınavlar',notes:'Notlarım',assistant:'Çalışma Asistanı',calculator:'Bilimsel Hesap Makinesi',calendarview:'Genel Takvim',daily:'Günlük Planlayıcı',sudoku:'Sudoku',facts:'Küçük Bilgiler'};
  $('#pageTitle').textContent=names[page]||'Genel Bakış';
}
$('#nav')?.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)showPage(b.dataset.page);});
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)showPage(b.dataset.go);});

// Toplam çalışma yerine son 7 günün haftalık toplamını hesaplar
function weekMinutes(){const week=lastSeven();return week.reduce((a,b)=>a+b,0);}
function lastSeven(){const result=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;result.push(study[key]||0);}return result;}

function renderStats(){
  const today=study[todayKey()]||0, week=lastSeven();
  const totalWeeklyMins = week.reduce((a,b)=>a+b,0);
  
  $('#todayStudy').textContent=today+' dk'; 
  // Toplam çalışma alanı artık haftalık saate dönüştürüldü
  $('#totalStudy').textContent=(totalWeeklyMins/60).toFixed(1)+' sa';
  $('#totalStudy').closest('.stat').querySelector('small').textContent='Bu haftaki toplam çalışma süren';

  $('#goalBar').style.width=Math.min(100,today/120*100)+'%'; $('#goalText').textContent=Math.min(today,120)+' / 120 dk';
  $('#goalPercent').textContent=Math.min(100,Math.round(today/120*100))+'%';
  $('#goalRing').style.background=`conic-gradient(#8676b6 ${Math.min(100,today/120*100)*3.6}deg,#ebe8f2 0deg)`;
  $('#weekHours').textContent=totalWeeklyMins+' dk';
  const max=Math.max(30,...week);$('#weekBars').innerHTML=week.map((v,i)=>`<span style="height:${Math.max(5,v/max*55)}px"><small>${['P','S','Ç','P','C','C','P'][i]}</small></span>`).join('');
  $('#noteCount').textContent=notes.length;
}

function renderTasks(){
  const done=tasks.filter(t=>t.done).length;$('#taskProgress').textContent=`${done} / ${tasks.length} tamamlandı`;
  $('#taskList').innerHTML=tasks.map((task,i)=>`<div class="task-item ${task.done?'done':''}"><input type="checkbox" data-task="${i}" ${task.done?'checked':''}><span>${esc(task.text)}</span><button data-del="${i}" aria-label="Görevi sil">✕</button></div>`).join('')||'<p class="muted">Henüz görev eklemedin. İlk küçük hedefini yaz.</p>';
  store.set('tasks',tasks);
}
$('#addTask')?.addEventListener('click',()=>{const input=$('#taskInput'),value=input.value.trim();if(!value)return;tasks.push({text:value,done:false});input.value='';renderTasks();});
$('#taskInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('#addTask').click();});
$('#taskList')?.addEventListener('click',e=>{if(e.target.dataset.task!==undefined){tasks[Number(e.target.dataset.task)].done=e.target.checked;renderTasks();}if(e.target.dataset.del!==undefined){tasks.splice(Number(e.target.dataset.del),1);renderTasks();}});
$('#saveTarget')?.addEventListener('click',()=>{target=$('#studyTarget').value.trim();store.set('target',target);$('#targetSaved').textContent=target?'Hedefin kaydedildi: '+target:'Hedef temizlendi.';});
$('#studyTarget').value=target;

function updateClock(){const now=new Date();$('#liveClock').textContent=now.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});$('#todayLabel').textContent=now.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'}).toLocaleUpperCase('tr-TR');}
updateClock();setInterval(updateClock,1000);

let duration=25*60,left=duration,interval=null,elapsed=0;
const circumference=2*Math.PI*104;
let session=store.get('activeStudySession',null);
function drawTimer(){const mm=Math.floor(left/60),ss=left%60;$('#timerDisplay').textContent=`${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;$('#timerProgress').style.strokeDashoffset=circumference*(1-left/duration);}
function addStudy(minutes){if(!minutes)return;const key=todayKey();study[key]=(study[key]||0)+minutes;store.set('study',study);renderStats();}

function syncSession(){
  if(!session || !session.running) return;
  const now = Date.now();
  const delta = Math.max(0, Math.floor((now - session.lastTick) / 1000));
  if(delta > 0) {
    session.elapsed = (session.elapsed || 0) + delta;
    session.pendingSeconds = (session.pendingSeconds || 0) + delta;
    session.lastTick = now; // lastTick güncellenerek döngüsel atlama engellendi
    while(session.pendingSeconds >= 60){
      addStudy(1);
      session.pendingSeconds -= 60;
    }
    left = Math.max(0, (session.duration || duration) - session.elapsed);
    elapsed = session.elapsed;
    store.set('activeStudySession', session);
    drawTimer();
  }
}

function stopTimer(){
  syncSession();
  if(session){
    session.running = false;
    store.set('activeStudySession', session);
  }
  clearInterval(interval);
  interval = null;
  const startBtn = $('#startTimer');
  if(startBtn) startBtn.innerHTML = 'Devam et <span>▶</span>';
}

function startTimer(){
  if(interval) return;
  if(!session || session.duration !== duration || session.elapsed >= duration){
    session = { duration, elapsed: 0, lastTick: Date.now(), running: true, pendingSeconds: 0 };
  } else {
    session.lastTick = Date.now();
    session.running = true;
  }
  store.set('activeStudySession', session);
  
  interval = setInterval(()=>{
    syncSession();
    if(left <= 0){
      stopTimer();
      session = null;
      store.set('activeStudySession', null);
      left = 0;
      drawTimer();
      $('#timerLabel').textContent = 'TUR TAMAMLANDI';
      toast('Harika! Odaklanma turunu tamamladın.');
    }
  }, 500);
  
  const startBtn = $('#startTimer');
  if(startBtn) startBtn.innerHTML = 'Duraklat <span>Ⅱ</span>';
}

function restoreTimer(){
  if(session){
    duration = Number(session.duration) || duration;
    elapsed = Number(session.elapsed) || 0;
    left = Math.max(0, duration - elapsed);
    if(session.running){
      // Sayfa yenilendiğinde sayaç askıda kalmasın diye duraklatılıyor
      session.running = false;
      session.lastTick = Date.now();
      store.set('activeStudySession', session);
    }
    const startBtn = $('#startTimer');
    if(startBtn) startBtn.innerHTML = 'Devam et <span>▶</span>';
  }
  drawTimer();
}

$('#startTimer')?.addEventListener('click',()=>session?.running?stopTimer():startTimer());
$('#resetTimer')?.addEventListener('click',()=>{stopTimer();session=null;store.set('activeStudySession',null);left=duration;elapsed=0;$('#timerLabel').textContent='ODAKLANMA ZAMANI';drawTimer();});
$$('.mode').forEach(button=>button.addEventListener('click',()=>{stopTimer();session=null;store.set('activeStudySession',null);$$('.mode').forEach(x=>x.classList.toggle('active',x===button));const mode=button.dataset.min;duration=(mode==='custom'?45:Number(mode))*60;left=duration;elapsed=0;$('#timerLabel').textContent=mode==='custom'?'SERBEST ODAK':'ODAKLANMA ZAMANI';drawTimer();}));
$('#applyCustomTime')?.addEventListener('click',()=>{const minutes=Math.max(1,Math.min(600,Number($('#customMinutes').value)||25));stopTimer();session=null;store.set('activeStudySession',null);duration=minutes*60;left=duration;elapsed=0;$$('.mode').forEach(x=>x.classList.remove('active'));$('#timerLabel').textContent='ÖZEL ODAK SÜRESİ';drawTimer();});

document.addEventListener('visibilitychange',()=>{if(session?.running)syncSession();});
function pauseTimerOnExit(){if(session?.running){syncSession();session.running=false;store.set('activeStudySession',session);clearInterval(interval);interval=null;}}
window.addEventListener('pagehide',pauseTimerOnExit);
window.addEventListener('beforeunload',pauseTimerOnExit);
restoreTimer();
$('#themeToggle')?.addEventListener('click',()=>{document.body.classList.toggle('dark');store.set('darkMode',document.body.classList.contains('dark'));});
if(store.get('darkMode',false))document.body.classList.add('dark');

function renderNotes(){
  $('#noteList').innerHTML=notes.map((n,i)=>`<div class="note-file"><div class="file-ico">${n.type==='application/pdf'?'PDF':n.type.startsWith('image/')?'IMG':'TXT'}</div><div><b>${esc(n.name)}</b><small>${(n.size/1024).toFixed(0)} KB</small></div><button data-open="${i}">Aç</button><button data-remove="${i}">Sil</button></div>`).join('')||'<p class="muted">Henüz dosya eklemedin.</p>';
  $('#noteCount').textContent=notes.length;
}
$('#fileInput')?.addEventListener('change',async e=>{
  for(const file of e.target.files){if(file.size>8*1024*1024){toast(file.name+' çok büyük (8 MB sınırı).');continue;}const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});notes.push({name:file.name,type:file.type,size:file.size,data});}
  store.set('notes',notes);renderNotes();e.target.value='';toast('Notların eklendi.');
});
$('#noteList')?.addEventListener('click',e=>{
  if(e.target.dataset.open!==undefined){const note=notes[Number(e.target.dataset.open)];$('#readerTitle').textContent=note.name;const reader=$('#reader');if(note.type==='application/pdf')reader.innerHTML=`<iframe class="reader-frame" src="${note.data}"></iframe>`;else if(note.type.startsWith('image/'))reader.innerHTML=`<img class="reader-image" src="${note.data}" alt="${esc(note.name)}">`;else{const text=atob(note.data.split(',')[1]);reader.innerHTML=`<pre class="reader-text">${esc(decodeURIComponent(escape(text)))}</pre>`;}}
  if(e.target.dataset.remove!==undefined){notes.splice(Number(e.target.dataset.remove),1);store.set('notes',notes);renderNotes();$('#readerTitle').textContent='Bir not seç';$('#reader').innerHTML='<div class="reader-empty"><div>▤</div><b>Notun burada açılacak</b><p>Soldan eklediğin bir dosyayı seç.</p></div>';}
});
renderNotes();renderStats();renderTasks();
