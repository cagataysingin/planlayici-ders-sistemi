(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const get = (key, fallback) => { try { return JSON.parse(localStorage.getItem('vize_'+key)) ?? fallback; } catch { return fallback; } };
  const set = (key, value) => localStorage.setItem('vize_'+key, JSON.stringify(value));
  const safe = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const profileInput=$('#profilePhotoInput');
  function applyProfilePhoto(data){['brandAvatar','sideAvatar'].forEach(id=>{const image=$('#'+id);if(image){image.src=data;image.hidden=false;}});['brandInitial','sideInitial'].forEach(id=>{const label=$('#'+id);if(label)label.hidden=true;});}
  const saved=get('profilePhoto',null);if(saved)applyProfilePhoto(saved);
  profileInput?.addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;if(file.size>3*1024*1024){alert('Profil fotoğrafı 3 MB altında olmalı.');event.target.value='';return;}const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});set('profilePhoto',data);applyProfilePhoto(data);event.target.value='';});

  // Yerel çalışma asistanı: çevrimiçi AI bağlantısı olmadan pratik öneriler sunar.
  const replies=[
    [/plan|program|2 saat|çalışma plan/i,'Önerim: 10 dk hedef belirle, 25 dk konu çalış, 5 dk mola ver, 25 dk örnek çöz, 5 dk mola ver ve son 25 dk kendi başına soru çöz. Son 10 dk yanlışlarını not et.'],
    [/pomodoro|25/i,'25 dakika tek bir hedefe odaklan, ardından 5 dakika mola ver. Dört turdan sonra 15–20 dakikalık uzun mola yap. Her turun başında bitireceğin işi tek cümleyle yaz.'],
    [/motivasyon|istemiyorum|üşen/i,'Motivasyon beklemek yerine görevi küçült: yalnızca 10 dakika çalış. Defteri aç, başlığı yaz ve ilk örneğe başla. Başlangıçtan sonra devam etmek genellikle kolaylaşır.'],
    [/matematik|limit|türev|integral|trigonometri/i,'Matematik için şu sırayı dene: kısa konu özeti, çözümlü iki örnek, beş bağımsız soru ve yanlışların kısa analizi. Çözümünü gördüğün soruyu kapatıp yeniden çözmeyi de dene.'],
    [/programlama|algoritma|kod/i,'Programlama çalışırken önce kavramı kendi cümlelerinle açıkla, sonra küçük bir örnek yaz, ardından örneği değiştirerek üç farklı girdiyle test et. Sadece kodu okumak yerine kendin yaz.'],
    [/tekrar|ezber|unut/i,'Aralıklı tekrar uygula: bugün öğrendiklerini gün sonunda, yarın, üç gün sonra ve bir hafta sonra kısa şekilde hatırla. Notu kapatıp kendine soru sormak pasif okumaktan daha etkilidir.'],
    [/merhaba|selam/i,'Selam! Bugün tek bir net hedef seçelim. Hangi dersi çalışıyorsun ve çalışmanın sonunda neyi bitirmiş olmak istiyorsun?']
  ];
  function send(message){const value=message.trim();if(!value)return;const box=$('#chatMessages');box.insertAdjacentHTML('beforeend',`<div class="chat-bubble user">${safe(value)}</div>`);let answer='Önce hedefini küçültelim: bugün hangi konuyu bitirmek istiyorsun? Konuyu 25 dakikalık bir parçaya böl ve sonunda kendini üç soruyla dene.';for(const [pattern,text] of replies){if(pattern.test(value)){answer=text;break;}}box.insertAdjacentHTML('beforeend',`<div class="chat-bubble bot">${safe(answer)}<small>Yerel çalışma önerisi</small></div>`);box.scrollTop=box.scrollHeight;}
  $('#chatForm')?.addEventListener('submit',event=>{event.preventDefault();const input=$('#chatInput');send(input.value);input.value='';});
  $$('.quick-prompts button').forEach(button=>button.addEventListener('click',()=>send(button.dataset.prompt||button.textContent)));
})();
