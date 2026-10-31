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

function lastSeven(){const result=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;result.push(study[key]||0);}return result;}

function renderStats(){
  const today=study[todayKey()]||0, week=lastSeven();
  const totalWeeklyMins = week.reduce((a,b)=>a+b,0);
  
  $('#todayStudy').textContent=today+' dk'; 
  $('#totalStudy').textContent=(totalWeeklyMins/60).toFixed(1)+' sa';
  const totalStatSmall = $('#totalStudy')?.closest('.stat')?.querySelector('small');
  if(totalStatSmall) totalStatSmall.textContent='Bu haftaki toplam çalışma süren';

  $('#goalBar').style.width=Math.min(100,today/120*100)+'%'; $('#goalText').textContent=Math.min(today,120)+' / 120 dk';
  $('#goalPercent').textContent=Math.min(100,Math.round(today/120*100))+'%';
  $('#goalRing').style.background=`conic-gradient(#8676b6 ${Math.min(100,today/120*100)*3.6}deg,#ebe8f2 0deg)`;
  $('#weekHours').textContent=totalWeeklyMins+' dk';
  const max=Math.max(30,...week);$('#weekBars').innerHTML=week.map((v,i)=>`<span style="height:${Math.max(5,v/max*55)}px"><small>${['P','S','Ç','P','C','C','P'][i]}</small></span>`).join('');
  $('#noteCount').textContent=notes.length;
  renderDashboardSchedule();
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

// Sayaç mantığı
let duration = 25 * 60, left = duration, interval = null;
const circumference = 2 * Math.PI * 104;

function drawTimer(){
  const mm = Math.floor(left / 60), ss = left % 60;
  $('#timerDisplay').textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  $('#timerProgress').style.strokeDashoffset = circumference * (1 - left / duration);
}

function addStudy(minutes){
  if(!minutes) return;
  const key = todayKey();
  study[key] = (study[key] || 0) + minutes;
  store.set('study', study);
  renderStats();
}

function stopTimer(){
  clearInterval(interval);
  interval = null;
  const startBtn = $('#startTimer');
  if(startBtn) startBtn.innerHTML = 'Devam et <span>▶</span>';
}

function startTimer(){
  if(interval) return;
  interval = setInterval(() => {
    if(left > 0){
      left--;
      drawTimer();
      if((duration - left) % 60 === 0){
        addStudy(1);
      }
    } else {
      stopTimer();
      left = 0;
      drawTimer();
      $('#timerLabel').textContent = 'TUR TAMAMLANDI';
      toast('Harika! Odaklanma turunu tamamladın.');
    }
  }, 1000);
  const startBtn = $('#startTimer');
  if(startBtn) startBtn.innerHTML = 'Duraklat <span>Ⅱ</span>';
}

$('#startTimer')?.addEventListener('click', () => { if(interval) stopTimer(); else startTimer(); });
$('#resetTimer')?.addEventListener('click', () => { stopTimer(); left = duration; $('#timerLabel').textContent = 'ODAKLANMA ZAMANI'; drawTimer(); });
$$('.mode').forEach(button => button.addEventListener('click', () => {
  stopTimer();
  $$('.mode').forEach(x => x.classList.toggle('active', x === button));
  const mode = button.dataset.min;
  duration = (mode === 'custom' ? 45 : Number(mode)) * 60;
  left = duration;
  $('#timerLabel').textContent = mode === 'custom' ? 'SERBEST ODAK' : 'ODAKLANMA ZAMANI';
  drawTimer();
}));
$('#applyCustomTime')?.addEventListener('click', () => {
  const minutes = Math.max(1, Math.min(600, Number($('#customMinutes').value) || 25));
  stopTimer();
  duration = minutes * 60;
  left = duration;
  $$('.mode').forEach(x => x.classList.remove('active'));
  $('#timerLabel').textContent = 'ÖZEL ODAK SÜRESİ';
  drawTimer();
});
drawTimer();

// Metin Tabanlı Not Sistemi (Çalışmayan dosya sistemi yerine)
function renderNotes(){
  const list = $('#noteList');
  if(!list) return;
  list.innerHTML = notes.map((n,i)=>`
    <div class="note-file" style="cursor:pointer;" data-open-note="${i}">
      <div class="file-ico">NOT</div>
      <div style="min-width:0;flex:1;"><b>${esc(n.title)}</b><small>${n.subject} • ${n.date}</small></div>
      <button data-remove-note="${i}" class="delete-entry">×</button>
    </div>
  `).join('') || '<p class="muted">Henüz not eklemedin.</p>';
  $('#noteCount').textContent = notes.length;
}

$('#saveNoteBtn')?.addEventListener('click', () => {
  const title = $('#noteTitleInput').value.trim();
  const subject = $('#noteSubject').value;
  const content = $('#noteContentInput').value.trim();
  if(!title || !content){ toast('Başlık ve içerik boş olamaz.'); return; }
  notes.push({title, subject, content, date: new Date().toLocaleDateString('tr-TR')});
  store.set('notes', notes);
  $('#noteTitleInput').value = '';
  $('#noteContentInput').value = '';
  renderNotes();
  toast('Notun başarıyla kaydedildi.');
});

$('#noteList')?.addEventListener('click', e => {
  const removeBtn = e.target.closest('[data-remove-note]');
  if(removeBtn){
    notes.splice(Number(removeBtn.dataset.removeNote), 1);
    store.set('notes', notes);
    renderNotes();
    $('#readerTitle').textContent = 'Bir not seç';
    $('#reader').innerHTML = '<div class="reader-empty"><div>▤</div><b>Notun burada açılacak</b><p>Soldan eklediğin bir notu seç.</p></div>';
    return;
  }
  const item = e.target.closest('[data-open-note]');
  if(item){
    const note = notes[Number(item.dataset.openNote)];
    $('#readerTitle').textContent = note.title;
    $('#reader').innerHTML = `<div style="padding:10px;"><small style="color:var(--muted);display:block;margin-bottom:8px;">Ders: ${note.subject} | Tarih: ${note.date}</small><pre class="reader-text">${esc(note.content)}</pre></div>`;
  }
});

// Ana sayfada günlük ders programını gösterme
function renderDashboardSchedule(){
  const box = $('#dashboardSchedule');
  if(!box) return;
  const schedule = store.get('weekly_schedule', []);
  const currentDayIndex = new Date().getDay(); // 0: Pazar, 1: Pazartesi...
  const todayEntries = schedule.filter(x => Number(x.day) === currentDayIndex).sort((a,b)=>a.start.localeCompare(b.start));
  
  if(!todayEntries.length){
    box.innerHTML = '<p class="muted">Bugün için planlanmış dersin bulunmuyor.</p>';
    return;
  }
  box.innerHTML = todayEntries.map(x=>`
    <div class="exam-row">
      <div class="exam-date" style="background:#f0edf8;color:#7767a8;"><b>${x.start}</b><small>DERS</small></div>
      <div class="exam-details"><b>${esc(x.subject)}</b><p>${x.room ? esc(x.room) : 'Derslik belirtilmedi'} • Bitiş: ${x.end}</p></div>
      <span class="pill purple-pill">Bugün</span>
    </div>
  `).join('');
}

$('#themeToggle')?.addEventListener('click',()=>{document.body.classList.toggle('dark');store.set('darkMode',document.body.classList.contains('dark'));});
if(store.get('darkMode',false))document.body.classList.add('dark');

renderNotes();
renderStats();
renderTasks();
renderDashboardSchedule();
