(() => {
  const $ = (s) => document.querySelector(s);
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem('vize_' + key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem('vize_' + key, JSON.stringify(value));
  const esc = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dayNames = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

  let exams = read('custom_exams', []);
  let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  let selectedDay = dateKey(new Date());
  let dailyPlans = read('daily_plans', []);
  const localDate = key => { const [y,m,d]=key.split('-').map(Number); return new Date(y,m-1,d); };
  const examForm = $('#examForm');
  function examDate(item) { return new Date(`${item.date}T${item.time || '09:00'}:00`); }
  
  function renderExams() {
    exams.sort((a,b) => examDate(a) - examDate(b));
    const now = new Date();
    const upcoming = exams.filter(x => examDate(x) >= now);
    const list = $('#examList');
    $('#examCount').textContent = `${exams.length} sınav`;
    if (!exams.length) list.innerHTML = '<p class="muted">Henüz sınav eklemedin. İlk sınavını yukarıdan ekleyebilirsin.</p>';
    else list.innerHTML = exams.map((x,i) => {
      const d = examDate(x), past = d < now;
      return `<div class="exam-row planner-exam-row"><div class="exam-date"><b>${String(d.getDate()).padStart(2,'0')}</b><small>${d.toLocaleDateString('tr-TR',{month:'short'}).toLocaleUpperCase('tr-TR')}</small></div><div class="exam-details"><b>${esc(x.name)}</b><p>${d.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} • ${esc(x.time)}${x.place ? ' • '+esc(x.place) : ''}</p></div><span class="pill ${past?'':'purple-pill'}">${past?'Tamamlandı':'Yaklaşıyor'}</span><button class="delete-entry" data-exam-delete="${i}" aria-label="Sınavı sil">×</button></div>`;
    }).join('');
    const next = upcoming[0];
    if (!next) {
      $('#nextExamName').textContent = exams.length ? 'Yaklaşan sınav kalmadı 🎉' : 'Henüz sınav eklemedin';
      $('#nextExamCountdown').textContent = '—';
      $('#nextExamWhen').textContent = exams.length ? 'Yeni bir sınav ekleyerek devam edebilirsin.' : 'Sınav eklediğinde geri sayım burada başlayacak.';
      $('#examProgressBar').style.width = '0%';
      $('#examProgressText').textContent = 'Planını oluştur ve hazırlanmaya başla.';
    } else {
      const ms = examDate(next) - now;
      const days = Math.floor(ms / 86400000), hours = Math.floor(ms % 86400000 / 3600000), mins = Math.floor(ms % 3600000 / 60000);
      $('#nextExamName').textContent = next.name;
      $('#nextExamCountdown').textContent = days ? `${days} gün ${hours} saat` : `${hours} saat ${mins} dk`;
      $('#nextExamWhen').textContent = `${examDate(next).toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'})} • ${next.time}`;
      const totalDays = Math.max(1, Math.ceil((examDate(next) - new Date(now.getFullYear(),now.getMonth(),now.getDate())) / 86400000));
      const progress = Math.max(4, Math.min(100, 100 - (days / Math.max(totalDays,1) * 100)));
      $('#examProgressBar').style.width = `${progress}%`;
      $('#examProgressText').textContent = 'Her gün kısa tekrar yap; son güne bırakma.';
    }
    const dash = $('#dashboardExams');
    if (dash) dash.innerHTML = upcoming.slice(0,3).map(x => {
      const d = examDate(x);
      return `<div class="exam-row"><div class="exam-date"><b>${String(d.getDate()).padStart(2,'0')}</b><small>${d.toLocaleDateString('tr-TR',{month:'short'}).toLocaleUpperCase('tr-TR')}</small></div><div><b>${esc(x.name)}</b><p>${d.toLocaleDateString('tr-TR',{day:'numeric',month:'long'})} • ${esc(x.time)}</p></div><span class="pill purple-pill">Sınav</span></div>`;
    }).join('') || '<p class="muted">Yaklaşan sınavın yok.</p>';
    const nextStat = $('#nextExam');
    if (nextStat) nextStat.textContent = next ? `${Math.ceil((examDate(next)-now)/86400000)} gün` : '—';
    write('custom_exams', exams);
    if (typeof renderMonth === 'function') renderMonth();
  }
  examForm?.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#examName').value.trim(), date = $('#examDate').value, time = $('#examTime').value;
    if (!name || !date || !time) return;
    exams.push({name,date,time,place:$('#examPlace').value.trim()});
    examForm.reset(); $('#examTime').value = '09:00';
    renderExams();
  });
  $('#examList')?.addEventListener('click', e => {
    const b = e.target.closest('[data-exam-delete]'); if (!b) return;
    exams.splice(Number(b.dataset.examDelete),1); renderExams();
  });
  renderExams();

  // Haftalık ders programı
  let schedule = read('weekly_schedule', []);
  const scheduleForm = $('#scheduleForm');
  function renderSchedule() {
    const root = $('#timetable');
    if (!root) return;
    if (!schedule.length) { root.innerHTML = '<p class="muted">Derslerini ekledikçe haftalık programın burada görünecek.</p>'; return; }
    root.innerHTML = dayNames.slice(1).concat(dayNames[0]).map((day,idx) => {
      const dayIndex = idx === 6 ? 0 : idx + 1;
      const entries = schedule.filter(x => Number(x.day) === dayIndex).sort((a,b) => a.start.localeCompare(b.start));
      if (!entries.length) return '';
      return `<div class="timetable-day"><h4>${day}</h4><div class="timetable-entries">${entries.map(x => `<div class="timetable-entry"><span class="timetable-time">${esc(x.start)}–${esc(x.end)}</span><b>${esc(x.subject)}</b><small>${x.room ? esc(x.room) : 'Derslik belirtilmedi'}</small><button class="delete-entry" data-schedule-delete="${x.id}" aria-label="Dersi sil">×</button></div>`).join('')}</div></div>`;
    }).join('') || '<p class="muted">Henüz ders eklenmedi.</p>';
  }
  scheduleForm?.addEventListener('submit', e => {
    e.preventDefault();
    const subject = $('#scheduleSubject').value.trim(), start = $('#scheduleStart').value, end = $('#scheduleEnd').value;
    if (!subject || !start || !end || end <= start) { alert('Ders bitiş saati başlangıç saatinden sonra olmalı.'); return; }
    schedule.push({id:Date.now(),subject,day:$('#scheduleDay').value,start,end,room:$('#scheduleRoom').value.trim()});
    write('weekly_schedule',schedule); scheduleForm.reset(); $('#scheduleStart').value='09:00'; $('#scheduleEnd').value='10:00'; renderSchedule();
    if(typeof renderDashboardSchedule === 'function') renderDashboardSchedule();
  });
  $('#timetable')?.addEventListener('click', e => {
    const b=e.target.closest('[data-schedule-delete]'); if(!b)return;
    schedule=schedule.filter(x=>String(x.id)!==b.dataset.scheduleDelete);write('weekly_schedule',schedule);renderSchedule();
    if(typeof renderDashboardSchedule === 'function') renderDashboardSchedule();
  });
  renderSchedule();

  // Aylık takvim ve günlük planlayıcı
  function renderDaily(){
    const date=$('#dailyDate'); if(!date)return;
    if(!date.value)date.value=selectedDay;
    selectedDay=date.value; const items=dailyPlans.filter(x=>x.date===selectedDay);
    $('#dailyDateLabel').textContent=localDate(selectedDay).toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'});
    $('#dailyTaskList').innerHTML=items.map((x,i)=>`<div class="daily-task ${x.done?'done':''}"><label><input type="checkbox" data-daily-done="${x.id}" ${x.done?'checked':''}><span class="daily-task-text">${esc(x.text)}</span></label><span class="daily-task-status">${x.done?'Tamamlandı':'Bekliyor'}</span><button class="delete-entry" data-daily-delete="${x.id}" aria-label="Görevi sil">×</button></div>`).join('')||'<div class="daily-empty"><span>☑</span><b>Henüz görev eklemedin</b><p>Yukarıdan ilk görevini ekleyerek gününü planlamaya başla.</p></div>';
    const done=items.filter(x=>x.done).length, pct=items.length?done/items.length*100:0;
    $('#dailyProgressBar').style.width=pct+'%'; $('#dailyProgressText').textContent=`${done} / ${items.length} görev tamamlandı`;
    write('daily_plans',dailyPlans);
  }
  $('#dailyDate')?.addEventListener('change',renderDaily);
  $('#addDailyTask')?.addEventListener('click',()=>{const input=$('#dailyTaskInput'),text=input.value.trim(),date=$('#dailyDate').value;if(!text||!date)return;dailyPlans.push({id:Date.now()+Math.random(),date,text,done:false});input.value='';renderDaily();renderMonth();});
  $('#dailyTaskInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('#addDailyTask').click();});
  $('#dailyTaskList')?.addEventListener('change',e=>{const id=e.target.dataset.dailyDone;if(!id)return;const item=dailyPlans.find(x=>String(x.id)===id);if(item)item.done=e.target.checked;renderDaily();renderMonth();});
  $('#dailyTaskList')?.addEventListener('click',e=>{const b=e.target.closest('[data-daily-delete]');if(!b)return;dailyPlans=dailyPlans.filter(x=>String(x.id)!==b.dataset.dailyDelete);renderDaily();renderMonth();});
  function renderMonth(){
    const root=$('#monthGrid'); if(!root)return;
    $('#monthTitle').textContent=viewMonth.toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
    const weekdays=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
    const first=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),1), offset=(first.getDay()+6)%7, days=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,0).getDate();
    let html=weekdays.map(x=>`<div class="month-weekday">${x}</div>`).join('');
    for(let i=0;i<offset;i++)html+='<div class="month-cell empty"></div>';
    for(let day=1;day<=days;day++){
      const d=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),day),key=dateKey(d),hasExam=exams.some(x=>x.date===key),hasTask=dailyPlans.some(x=>x.date===key),isToday=key===dateKey(new Date());
      html+=`<button class="month-cell ${key===selectedDay?'selected':''} ${isToday?'today':''}" data-pick-date="${key}"><span>${day}</span><i class="month-dots">${hasExam?'<b class="exam-dot"></b>':''}${hasTask?'<b class="task-dot"></b>':''}</i></button>`;
    }
    root.innerHTML=html;
    const picked=localDate(selectedDay);$('#selectedDateTitle').textContent=picked.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const dayExams=exams.filter(x=>x.date===selectedDay),dayTasks=dailyPlans.filter(x=>x.date===selectedDay);
    $('#selectedDateItems').innerHTML=[...dayExams.map(x=>`<div class="selected-item exam-item"><b>Sınav:</b> ${esc(x.name)} • ${esc(x.time||'')}</div>`),...dayTasks.map(x=>`<div class="selected-item task-item-view"><b>Görev:</b> ${esc(x.text)} ${x.done?'✓':''}</div>`)].join('')||'<p class="muted">Bu tarihte kayıtlı sınav veya günlük görev yok.</p>';
  }
  $('#monthGrid')?.addEventListener('click',e=>{const b=e.target.closest('[data-pick-date]');if(!b)return;selectedDay=b.dataset.pickDate;$('#dailyDate').value=selectedDay;renderMonth();renderDaily();});
  $('#prevMonth')?.addEventListener('click',()=>{viewMonth.setMonth(viewMonth.getMonth()-1);renderMonth();});
  $('#nextMonth')?.addEventListener('click',()=>{viewMonth.setMonth(viewMonth.getMonth()+1);renderMonth();});
  $('#todayMonth')?.addEventListener('click',()=>{viewMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);selectedDay=dateKey(new Date());$('#dailyDate').value=selectedDay;renderMonth();renderDaily();});
  renderDaily();renderMonth();

  // Sudoku Level Mantığı (Kolay, Orta, Zor)
  let sudokuSolution=[], sudokuPuzzle=[];
  const board=$('#sudokuBoard');
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function validGrid(g,r,c,n){for(let i=0;i<9;i++)if(g[r][i]===n||g[i][c]===n)return false;const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(let y=br;y<br+3;y++)for(let x=bc;x<bc+3;x++)if(g[y][x]===n)return false;return true;}
  function fillGrid(g){for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(!g[r][c]){for(const n of shuffle([1,2,3,4,5,6,7,8,9]))if(validGrid(g,r,c,n)){g[r][c]=n;if(fillGrid(g))return true;g[r][c]=0;}return false;}return true;}
  
  function newSudoku(){
    const g=Array.from({length:9},()=>Array(9).fill(0));
    fillGrid(g);
    sudokuSolution=g.map(r=>r.slice());
    sudokuPuzzle=g.map(r=>r.slice());
    
    // Level seçimine göre boşaltılacak hücre sayısı (Kolay: 30, Orta: 45, Zor: 56)
    const diff = $('#sudokuDifficulty')?.value || 'medium';
    const blanks = {easy: 30, medium: 45, hard: 56}[diff] || 45;

    for(const [r,c] of shuffle(Array.from({length:81},(_,i)=>[Math.floor(i/9),i%9])).slice(0, blanks)){
      sudokuPuzzle[r][c]=0;
    }
    renderSudoku();
    $('#sudokuMessage').textContent = `Seviye: ${diff.toUpperCase()} - Boş hücreleri 1–9 arasındaki sayılarla doldur.`;
  }
  
  function renderSudoku(){
    if(!board)return;
    board.innerHTML='';
    for(let r=0;r<9;r++)for(let c=0;c<9;c++){
      const input=document.createElement('input');
      input.className='sudoku-cell';
      input.inputMode='numeric';
      input.maxLength=1;
      input.dataset.r=r;
      input.dataset.c=c;
      input.setAttribute('aria-label',`Satır ${r+1}, sütun ${c+1}`);
      if(sudokuPuzzle[r][c]){
        input.value=sudokuPuzzle[r][c];
        input.disabled=true;
        input.classList.add('given');
      }else{
        input.value='';
        input.addEventListener('input',()=>{input.value=input.value.replace(/[^1-9]/g,'').slice(0,1);input.classList.remove('wrong');});
      }
      if(c===2||c===5)input.classList.add('box-right');
      if(r===2||r===5)input.classList.add('box-bottom');
      board.appendChild(input);
    }
  }
  $('#newSudoku')?.addEventListener('click',newSudoku);
  $('#sudokuDifficulty')?.addEventListener('change',newSudoku);

  $('#checkSudoku')?.addEventListener('click',()=>{
    let empty=0,wrong=0;
    board.querySelectorAll('input').forEach(input=>{
      const r=+input.dataset.r,c=+input.dataset.c;
      if(!input.value)empty++;
      else if(Number(input.value)!==sudokuSolution[r][c]){wrong++;input.classList.add('wrong');}
      else input.classList.remove('wrong');
    });
    $('#sudokuMessage').textContent=wrong?`${wrong} hücre hatalı görünüyor. Tekrar dene.`:empty?`Şu ana kadar doğru! ${empty} boş hücre kaldı.`:'Tebrikler! Sudoku tamamlandı 🎉';
  });
  $('#hintSudoku')?.addEventListener('click',()=>{
    const cells=[...board.querySelectorAll('input:not(:disabled)')],empty=cells.filter(x=>!x.value);
    if(!empty.length){$('#sudokuMessage').textContent='Boş hücre kalmadı.';return;}
    const input=empty[Math.floor(Math.random()*empty.length)],r=+input.dataset.r,c=+input.dataset.c;
    input.value=sudokuSolution[r][c];input.classList.add('hinted');$('#sudokuMessage').textContent='Bir hücre için ipucu verdim.';
  });
  if(board)newSudoku();

  // Bilim ve tarih kısa bilgiler
  const facts=[
    ['BİLİM','Işık hızı','Işık boşlukta saniyede yaklaşık 300 bin kilometre yol alır.','✦'],
    ['TARİH','Antikythera düzeneği','Antik Yunan’dan kalan bu mekanizma, gök cisimlerinin hareketlerini hesaplamak için tasarlanmış çok eski bir analog bilgisayar örneğidir.','⚙'],
    ['BİLİM','Ahtapotların kalbi','Ahtapotların üç kalbi vardır; ikisi solungaçlara, biri vücudun geri kalanına kan pompalar.','🐙'],
    ['TARİH','İlk e-posta','Ray Tomlinson, 1971’de farklı bilgisayarlar arasında e-posta gönderimini mümkün kılan sistemi geliştirdi.','✉'],
    ['EĞLENCE','Muz meyve mi?','Botanik açıdan muz bir meyvedir; hatta teknik sınıflandırmada bir üzümsü meyve türüdür.','🍌'],
    ['BİLİM','Venüs’te bir gün','Venüs kendi ekseni etrafında o kadar yavaş döner ki bir Venüs günü, bir Venüs yılından daha uzundur.','🪐']
  ];
  function renderFacts(){
    const grid=$('#factsGrid'); if(!grid)return;
    grid.innerHTML=facts.map((f,i)=>`<article class="fact-tile fact-tone-${i%4}"><div class="fact-tile-top"><span class="fact-category">${f[0]}</span><span class="fact-tile-icon">${f[3]}</span></div><h4>${f[1]}</h4><p>${f[2]}</p></article>`).join('');
  }
  renderFacts();

  // Bilimsel hesap makinesi
  const expressionEl = $('#calcExpression'), displayEl = $('#calcDisplay');
  if (expressionEl && displayEl) {
    let expression = '', answer = Number(read('calc_answer',0)) || 0, angleMode = 'DEG', justSolved = false;
    const show = (message='') => { expressionEl.textContent = message || expression || 'İşlemini gir'; displayEl.textContent = expression ? expression : '0'; };
    function insert(value) {
      if (justSolved && /^[0-9.]$/.test(value)) expression='';
      justSolved=false;
      if (value === 'Ans') value = String(answer);
      expression += value; show();
    }
    function factorial(n) { if (!Number.isInteger(n) || n < 0 || n > 170) throw Error('Faktöriyel için 0–170 arasında tam sayı kullan.'); let v=1; for(let i=2;i<=n;i++)v*=i; return v; }
    function calculate() {
      if (!expression.trim()) return;
      let source = expression.replace(/π/g,'PI').replace(/×/g,'*').replace(/÷/g,'/').replace(/\^/g,'**').replace(/(\d+(?:\.\d+)?)%/g,'($1/100)');
      source = source.replace(/(\d+(?:\.\d+)?|\([^()]*\))!/g,'factorial($1)');
      const allowed = new Set(['PI','e','Ans','sin','cos','tan','asin','acos','atan','sqrt','log','ln','abs','factorial']);
      const ids = source.match(/[A-Za-z_]+/g) || [];
      if (ids.some(x => !allowed.has(x))) throw Error('Geçersiz işlem.');
      const toRad = x => angleMode==='DEG' ? x*Math.PI/180 : x;
      const fromRad = x => angleMode==='DEG' ? x*180/Math.PI : x;
      const funcs = {
        PI:Math.PI,e:Math.E,Ans:answer,
        sin:x=>Math.sin(toRad(x)),cos:x=>Math.cos(toRad(x)),tan:x=>Math.tan(toRad(x)),
        asin:x=>fromRad(Math.asin(x)),acos:x=>fromRad(Math.acos(x)),atan:x=>fromRad(Math.atan(x)),
        sqrt:Math.sqrt,log:Math.log10,ln:Math.log,abs:Math.abs,factorial
      };
      const result = Function(...Object.keys(funcs),`"use strict"; return (${source});`)(...Object.values(funcs));
      if (typeof result !== 'number' || !Number.isFinite(result)) throw Error('Bu işlem için gerçek bir sonuç bulunamadı.');
      answer=result; write('calc_answer',answer); expression=String(Number(result.toPrecision(12))); justSolved=true;
      expressionEl.textContent='Sonuç'; displayEl.textContent=expression;
    }
    document.querySelector('.calc-keys')?.addEventListener('click', e => {
      const b=e.target.closest('button'); if(!b)return;
      try {
        if (b.dataset.clear) { expression='';justSolved=false;show();return; }
        if (b.dataset.action==='back') { expression=expression.slice(0,-1);justSolved=false;show();return; }
        if (b.dataset.insert) { insert(b.dataset.insert);return; }
        if (b.dataset.fn) {
          const fn=b.dataset.fn;
          if(fn==='square') expression=`(${expression || '0'})^2`;
          else if(fn==='factorial') expression += '!';
          else expression += `${fn}(`;
          justSolved=false;show();return;
        }
        if (b.dataset.equals) calculate();
      } catch(err) { expressionEl.textContent='Hata';displayEl.textContent=err.message; }
    });
    document.querySelector('.angle-toggle')?.addEventListener('click',e=>{const b=e.target.closest('[data-angle]');if(!b)return;angleMode=b.dataset.angle;document.querySelectorAll('[data-angle]').forEach(x=>x.classList.toggle('active',x===b));});
  }
})();
