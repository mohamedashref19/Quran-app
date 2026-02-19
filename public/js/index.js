/* eslint-disable */
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import axios from 'axios';
import '@babel/polyfill';
import { login, logout, signup, verifyOTP, showAlert } from './auth';
import { loadSurahs, manageKhatmah, createKhatmah, updateKhatmahProgress, checkRecitation, loadReciters, loadPrayers, loadBookmarks, loadQuranPage, toggleBookmark, deleteBookmark, deleteKhatmah, initSearch, startSurahReading } from './features';

// 1. Config
axios.defaults.baseURL = 'https://aqra-app.serveftp.com';
axios.defaults.withCredentials = true;

// --- Global State ---
window.currentAudio = null;
let aiMediaRecorder = null;
let liveStream = null;
window.currentPage = 1;

// 2. Data
const surahNames = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
  "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
  "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
  "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
  "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
  "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
  "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
  "التكوير", "الإنفطار", "المطففين", "الإنشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
  "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
  "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
  "المسد", "الإخلاص", "الفلق", "الناس"
];

const surahPageMap = [
  1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312,
  322, 332, 342, 350, 359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 458, 467,
  477, 483, 489, 496, 499, 502, 507, 511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542, 545, 549,
  551, 553, 554, 556, 558, 560, 562, 564, 566, 568, 570, 572, 574, 575, 577, 578, 580, 582, 583, 585,
  586, 587, 587, 589, 590, 591, 591, 592, 593, 594, 595, 596, 596, 597, 597, 598, 598, 599, 599, 600,
  600, 601, 601, 601, 602, 602, 602, 603, 603, 603, 604, 604, 604, 604
];

// --- 3. Master Stop Function ---
const stopAllMedia = () => {
  if (window.currentAudio) {
    window.currentAudio.pause();
    window.currentAudio = null;
  }
  document.querySelectorAll('audio, video').forEach(media => {
    media.pause();
    media.currentTime = 0;
  });
  if (aiMediaRecorder && aiMediaRecorder.state !== 'inactive') {
    aiMediaRecorder.stop();
    if (aiMediaRecorder.stream) aiMediaRecorder.stream.getTracks().forEach(t => t.stop());
    aiMediaRecorder = null;
  }
  if (liveStream) {
    liveStream.getTracks().forEach(t => t.stop());
    liveStream = null;
  }
  resetUIButtons();
};

const resetUIButtons = () => {
  document.querySelectorAll('.live-play-btn').forEach(b => {
    b.innerHTML = '<i class="fas fa-play"></i>';
    b.classList.remove('playing', 'btn-danger');
    b.classList.add('btn-outline-success');
  });
  document.querySelectorAll('.play-btn i').forEach(icon => {
    icon.classList.remove('fa-pause');
    icon.classList.add('fa-play');
  });
  const aiBtn = document.getElementById('recordBtn');
  if (aiBtn) {
    aiBtn.classList.replace('btn-danger', 'btn-outline-danger');
    aiBtn.innerHTML = '<i class="fas fa-microphone fa-2x"></i>';
    const status = document.getElementById('recordStatus');
    if (status) status.innerText = 'اضغط للتسجيل';
  }
  const startLive = document.getElementById('btn-start-live');
  const stopLive = document.getElementById('btn-stop-live');
  if (startLive && stopLive) {
    startLive.classList.remove('d-none');
    stopLive.classList.add('d-none');
    const liveStatus = document.getElementById('live-status');
    if (liveStatus) {
      liveStatus.innerText = "جاهز...";
      liveStatus.classList.remove('text-success', 'fw-bold');
      liveStatus.classList.add('text-muted');
    }
  }
};

// --- 4. Helpers ---
const getSurahNameByPage = (pageNum) => {
  let surahIndex = 0;
  for (let i = 0; i < surahPageMap.length; i++) {
    if (surahPageMap[i] <= pageNum) surahIndex = i;
    else break;
  }
  return surahNames[surahIndex];
};

// --- 5. Auth ---
window.checkAuth = async () => {
  try {
    const res = await axios.get('/api/v1/users/me');
    if (res.data.status === 'success') {
      document.querySelectorAll('.auth-link').forEach(el => el.classList.add('d-none'));
      document.querySelectorAll('.user-link').forEach(el => el.classList.remove('d-none'));
      return true;
    }
  } catch (err) {
    document.querySelectorAll('.auth-link').forEach(el => el.classList.remove('d-none'));
    document.querySelectorAll('.user-link').forEach(el => el.classList.add('d-none'));
  }
  return false;
};

// --- 6. Quran Index ---
window.loadSurahIndex = () => {
  const container = document.getElementById('surah-index-list');
  if (!container || container.children.length > 0) return;
  container.innerHTML = '';
  surahNames.forEach((name, index) => {
    const pageNum = surahPageMap[index] || 1;
    const html = `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="card shadow-sm h-100 p-2 text-center hover-shadow border-success"
          style="cursor: pointer; transition: transform 0.2s;"
          onclick="window.showSection('quran'); window.loadQuranPage(${pageNum});">
          <div class="card-body p-2">
            <span class="badge bg-light text-dark mb-1 border rounded-circle">${index + 1}</span>
            <h6 class="card-title fw-bold text-success mb-0" style="font-family: 'Amiri'">${name}</h6>
            <small class="text-muted" style="font-size: 0.7rem;">صفحة ${pageNum}</small>
          </div>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
  });
};

// --- 7. Tafseer ---
window.showTafseer = async (surahId, ayahId) => {
  try {
    Swal.fire({ title: 'جاري جلب التفسير...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = await axios.get(`/api/v1/quran/tafseer/${surahId}/${ayahId}`);
    Swal.fire({
      title: `<span class="text-success" style="font-family: 'Amiri'">تفسير الآية ${ayahId}</span>`,
      html: `<div style="font-family: 'Amiri'; font-size: 1.2rem; line-height: 1.8; text-align: justify; direction: rtl;">${res.data.data.tafseer}</div>`,
      confirmButtonText: 'إغلاق',
      confirmButtonColor: '#198754',
    });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'خطأ', text: 'تعذر جلب التفسير. تأكد من الاتصال بالإنترنت.' });
  }
};

// --- 8. Router ---
window.showSection = (sectionName) => {
  stopAllMedia();
  document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
  const target = document.getElementById(`${sectionName}-section`);
  if (!target) return;

  target.classList.remove('d-none');
  window.scrollTo(0, 0);

  const newPath = sectionName === 'home' ? '/' : `/${sectionName}`;
  if (window.location.pathname !== newPath) {
    window.history.pushState({ section: sectionName }, '', newPath);
  }

  if (sectionName === 'home') {
    window.checkAuth();
    loadPrayers();
    if (document.getElementById('active-khatmah')) manageKhatmah().catch(() => {});
  }
  if (sectionName === 'surah-index') window.loadSurahIndex();
  if (sectionName === 'reciters') loadReciters();
  if (sectionName === 'bookmarks') loadBookmarks();

  if (sectionName === 'profile') {
    axios.get('/api/v1/users/me').then(res => {
      const user = res.data.data.doc;
      if (user) {
        if (document.getElementById('profile-name')) document.getElementById('profile-name').value = user.name;
        if (document.getElementById('profile-email')) document.getElementById('profile-email').value = user.email;
      }
    }).catch(() => window.showSection('login'));
  }

  const fillSelect = (id) => {
    const select = document.getElementById(id);
    if (select && select.options.length <= 1) {
      surahNames.forEach((name, index) => {
        const opt = document.createElement('option');
        opt.value = index + 1;
        opt.textContent = `${index + 1}. ${name}`;
        select.appendChild(opt);
      });
    }
  };
  if (sectionName === 'ai-correction') fillSelect('ai-surah-select');
  if (sectionName === 'live-recitation') fillSelect('live-surah-select');
};

window.openQuranAtCurrentKhatmah = () => {
  window.showSection('quran');
  loadQuranPage(window.currentPage || 1);
};

window.loadQuranPage = async (pageNum) => {
  window.currentPage = pageNum;
  const titleEl = document.getElementById('surah-title-display');
  if (titleEl) titleEl.textContent = `سورة ${getSurahNameByPage(pageNum)}`;
  await loadQuranPage(pageNum);
};

window.startSurahReading = startSurahReading;

// --- 9. Live Recitation ---
window.playLiveAudio = (url, btnId) => {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (window.currentAudio && !window.currentAudio.paused && btn.classList.contains('playing')) {
    window.currentAudio.pause();
    window.currentAudio = null;
    btn.innerHTML = '<i class="fas fa-play"></i>';
    btn.classList.remove('playing', 'btn-danger');
    btn.classList.add('btn-outline-success');
    return;
  }
  if (window.currentAudio) {
    window.currentAudio.pause();
    window.currentAudio = null;
    resetUIButtons();
  }
  const audio = new Audio(url);
  window.currentAudio = audio;
  audio.play();
  btn.innerHTML = '<i class="fas fa-stop"></i>';
  btn.classList.add('playing', 'btn-danger');
  btn.classList.remove('btn-outline-success');
  audio.onended = () => {
    btn.innerHTML = '<i class="fas fa-play"></i>';
    btn.classList.remove('playing', 'btn-danger');
    btn.classList.add('btn-outline-success');
    window.currentAudio = null;
  };
};

window.loadLiveAyahs = async () => {
  const surahSelect = document.getElementById('live-surah-select');
  const surah = surahSelect.value;
  const startAyah = parseInt(document.getElementById('live-start-ayah').value) || 1;
  const endAyah = parseInt(document.getElementById('live-end-ayah').value) || 999;
  const isMemorizeMode = document.getElementById('memorize-mode').checked;
  if (!surah) return showAlert('error', 'اختر السورة أولاً');

  const container = document.getElementById('live-quran-container');
  container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-success"></div><p>جاري جلب الآيات...</p></div>';
  document.getElementById('live-controls').classList.remove('d-none');

  try {
    const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surah}`);
    const filteredAyahs = response.data.data.ayahs.filter(
      a => a.numberInSurah >= startAyah && a.numberInSurah <= endAyah
    );
    container.innerHTML = '';
    if (filteredAyahs.length === 0) {
      container.innerHTML = '<p class="text-muted">لا توجد آيات في هذا النطاق.</p>';
      return;
    }
    filteredAyahs.forEach(ayah => {
      const s = String(surah).padStart(3, '0');
      const a = String(ayah.numberInSurah).padStart(3, '0');
      const audioUrl = `https://everyayah.com/data/Husary_128kbps/${s}${a}.mp3`;
      const btnId = `btn-play-${s}-${a}`;
      const blurClass = isMemorizeMode ? 'blurred-text' : '';
      const html = `
        <div class="live-ayah-item" style="border-bottom:1px solid #eee; padding:10px 0; display:flex; align-items:center; justify-content:space-between;">
          <button id="${btnId}" class="btn live-play-btn btn-outline-success rounded-circle"
            style="width:40px; height:40px; padding:0;"
            onclick="playLiveAudio('${audioUrl}', '${btnId}')">
            <i class="fas fa-play"></i>
          </button>
          <div class="live-ayah-text ${blurClass}" id="text-${btnId}"
            style="flex-grow:1; text-align:right; margin-right:15px; font-family:'Amiri'; font-size:1.3rem;">
            ${ayah.text}
            <span class="badge bg-light text-dark ms-1 rounded-circle border">${ayah.numberInSurah}</span>
          </div>
        </div>`;
      container.insertAdjacentHTML('beforeend', html);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="text-danger">حدث خطأ في تحميل الآيات.</p>';
  }
};

const memorizeToggle = document.getElementById('memorize-mode');
if (memorizeToggle) {
  memorizeToggle.addEventListener('change', (e) => {
    document.querySelectorAll('.live-ayah-text').forEach(el => {
      if (e.target.checked) el.classList.add('blurred-text');
      else el.classList.remove('blurred-text');
    });
  });
}

// --- 10. Global Click Listener ---
document.addEventListener('click', async (e) => {
  // أ) Bookmark
  const bookmarkBtn = e.target.closest('.bookmark-icon-btn');
  if (bookmarkBtn) {
    e.preventDefault();
    e.stopPropagation();
    await toggleBookmark(bookmarkBtn.dataset.surah, bookmarkBtn.dataset.ayah, bookmarkBtn);
    return;
  }
  // ب) Khatmah
  const khatmahBtn = e.target.closest('.khatmah-icon-btn');
  if (khatmahBtn) {
    e.preventDefault();
    e.stopPropagation();
    await updateKhatmahProgress(khatmahBtn.dataset.surah, khatmahBtn.dataset.ayah);
    const icon = khatmahBtn.querySelector('i') || khatmahBtn;
    icon.classList.replace('far', 'fas');
    showAlert('success', 'تم تحديث الورد بنجاح');
    return;
  }
  // ج) تجاهل الأزرار والروابط
  if (e.target.closest('button') || e.target.closest('a')) return;
  // د) التفسير
  const verse = e.target.closest('[data-surah][data-ayah]');
  if (verse) {
    e.preventDefault();
    window.showTafseer(verse.dataset.surah, verse.dataset.ayah);
  }
});

// --- 11. Swipe Logic ---
let touchstartX = 0;
document.addEventListener('touchstart', e => {
  if (!document.getElementById('quran-section').classList.contains('d-none')) {
    touchstartX = e.changedTouches[0].screenX;
  }
}, { passive: true });

document.addEventListener('touchend', e => {
  if (!document.getElementById('quran-section').classList.contains('d-none')) {
    const touchendX = e.changedTouches[0].screenX;
    if (touchendX < touchstartX - 80) document.getElementById('btn-next-page')?.click();
    if (touchendX > touchstartX + 80) document.getElementById('btn-prev-page')?.click();
  }
}, { passive: true });

// --- 12. Navigation Buttons ---
document.getElementById('btn-next-page')?.addEventListener('click', () => {
  if (window.currentPage < 604) { window.currentPage++; window.loadQuranPage(window.currentPage); window.scrollTo(0, 0); }
});
document.getElementById('btn-prev-page')?.addEventListener('click', () => {
  if (window.currentPage > 1) { window.currentPage--; window.loadQuranPage(window.currentPage); window.scrollTo(0, 0); }
});

// --- 13. Popstate & Body Link Routing ---
window.addEventListener('popstate', (event) => {
  stopAllMedia();
  const path = window.location.pathname;
  if (path === '/' || path === '/index.html') {
    document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
    document.getElementById('home-section').classList.remove('d-none');
  } else if (event.state?.section) {
    document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
    document.getElementById(`${event.state.section}-section`).classList.remove('d-none');
  }
});

document.body.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('http') || href === '#') return;
  if (href.includes('login') || href.includes('signup') || href.includes('logout')) return;
  if (href.startsWith('/')) {
    e.preventDefault();
    if (href === '/' || href === '/index.html') window.showSection('home');
    else if (href.includes('quran')) { window.showSection('surah-index'); window.loadSurahIndex(); }
    else if (href.includes('reciters')) window.showSection('reciters');
    else if (href.includes('my-bookmarks')) window.showSection('bookmarks');
  }
});

// --- 14. Native Init ---
const initNativeFeatures = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let reg of registrations) await reg.unregister();
      const keys = await caches.keys();
      for (let key of keys) await caches.delete(key);
    }
    await LocalNotifications.cancel({ notifications: [{ id: 101 }] });
    await App.removeAllListeners();
    await App.addListener('backButton', ({ canGoBack }) => {
      const homeSection = document.getElementById('home-section');
      if (homeSection && !homeSection.classList.contains('d-none')) {
        stopAllMedia();
        if (canGoBack) window.history.back();
        else App.exitApp();
      } else {
        window.showSection('home');
      }
    });
    const notifs = await LocalNotifications.requestPermissions();
    if (notifs.display === 'granted') {
      await LocalNotifications.createChannel({ id: 'azan-channel', name: 'تنبيهات الصلاة', importance: 5, sound: 'azan_short.mp3', visibility: 1, vibration: true });
      await LocalNotifications.createChannel({ id: 'khatmah-channel', name: 'تنبيهات الورد', importance: 4, visibility: 1, vibration: true });
    }
    try { await Geolocation.requestPermissions(); } catch (e) { console.log("Geolocation permission error:", e); }
  } catch (err) {
    console.error('Native Init Error:', err);
  }
};

// --- 15. Main DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
  initNativeFeatures();
  if (typeof initSearch === 'function') initSearch();
  window.checkAuth();

  const isMobile = Capacitor.isNativePlatform();
  if (document.getElementById('prayers-list')) loadPrayers();
  if (document.getElementById('active-khatmah')) manageKhatmah().catch(() => {});

  // Forms
  const handleForm = (id, action) => {
    const f = document.getElementById(id);
    if (f) f.addEventListener('submit', (e) => { e.preventDefault(); action(); });
  };
  handleForm('loginFormPage', () => login(
    document.getElementById('login-email').value,
    document.getElementById('login-password').value
  ));
  handleForm('signupFormPage', () => signup(
    document.getElementById('signup-name').value,
    document.getElementById('signup-email').value,
    document.getElementById('signup-password').value,
    document.getElementById('signup-passwordConfirm').value
  ));
  handleForm('verifyOTPFormPage', () => verifyOTP(
    document.getElementById('verify-email').value,
    document.getElementById('verify-otp').value
  ));

  // Logout
  document.getElementById('logoutBtnProfile')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });

  // AI Upload
  const triggerUpload = document.getElementById('triggerUpload');
  const audioFile = document.getElementById('audioFile');
  const uploadBtn = document.getElementById('uploadBtn');
  if (triggerUpload && audioFile) {
    triggerUpload.addEventListener('click', () => audioFile.click());
    audioFile.addEventListener('change', function () {
      if (this.files?.[0]) {
        if (uploadBtn) uploadBtn.classList.remove('d-none');
        triggerUpload.innerText = `تم اختيار: ${this.files[0].name}`;
      }
    });
  }
  if (uploadBtn) {
    uploadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const surahValue = document.getElementById('ai-surah-select')?.value;
      const startAyah = document.getElementById('ai-start-ayah')?.value || null;
      const endAyah = document.getElementById('ai-end-ayah')?.value || null;
      if (!audioFile.files[0]) return showAlert('error', 'يرجى اختيار ملف أولاً');
      if (!surahValue) return showAlert('error', 'يرجى اختيار السورة');
      checkRecitation(audioFile.files[0], surahValue, startAyah, endAyah, URL.createObjectURL(audioFile.files[0]));
    });
  }

  // AI Recording
  let aiAudioChunks = [];
  const aiRecordBtn = document.getElementById('recordBtn');
  const aiRecordStatus = document.getElementById('recordStatus');
  if (aiRecordBtn) {
    aiRecordBtn.addEventListener('click', async () => {
      if (!aiMediaRecorder || aiMediaRecorder.state === 'inactive') {
        const surahValue = document.getElementById('ai-surah-select').value;
        if (!surahValue) return showAlert('error', 'يرجى اختيار السورة أولاً');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          aiMediaRecorder = new MediaRecorder(stream);
          aiAudioChunks = [];
          aiMediaRecorder.ondataavailable = (e) => aiAudioChunks.push(e.data);
          aiMediaRecorder.onstop = () => {
            const audioBlob = new Blob(aiAudioChunks, { type: 'audio/webm' });
            const file = new File([audioBlob], "rec.webm", { type: "audio/webm" });
            checkRecitation(file, surahValue,
              document.getElementById('ai-start-ayah').value,
              document.getElementById('ai-end-ayah').value,
              URL.createObjectURL(audioBlob)
            );
          };
          aiMediaRecorder.start();
          aiRecordBtn.classList.replace('btn-outline-danger', 'btn-danger');
          aiRecordBtn.innerHTML = '<i class="fas fa-stop fa-3x"></i>';
          aiRecordStatus.innerText = 'جاري التسجيل... انقر للإيقاف';
        } catch (err) {
          console.error(err);
          showAlert('error', 'يرجى السماح بصلاحية الميكروفون');
        }
      } else {
        aiMediaRecorder.stop();
        aiMediaRecorder.stream.getTracks().forEach(t => t.stop());
        aiRecordBtn.classList.replace('btn-danger', 'btn-outline-danger');
        aiRecordBtn.innerHTML = '<i class="fas fa-microphone fa-2x"></i>';
        aiRecordStatus.innerText = 'تم الانتهاء! جاري التحليل...';
      }
    });
  }

  // Live Mic
  const btnStartLive = document.getElementById('btn-start-live');
  const btnStopLive = document.getElementById('btn-stop-live');
  const liveStatus = document.getElementById('live-status');
  if (btnStartLive && btnStopLive) {
    btnStartLive.addEventListener('click', async () => {
      try {
        liveStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        btnStartLive.classList.add('d-none');
        btnStopLive.classList.remove('d-none');
        if (liveStatus) {
          liveStatus.innerText = "🎤 جاري الاستماع... (اقرأ بصوت واضح)";
          liveStatus.classList.add('text-success', 'fw-bold');
          liveStatus.classList.remove('text-muted');
        }
      } catch (err) {
        showAlert('error', 'يرجى السماح بصلاحية الميكروفون');
      }
    });
    btnStopLive.addEventListener('click', () => {
      if (liveStream) { liveStream.getTracks().forEach(t => t.stop()); liveStream = null; }
      btnStartLive.classList.remove('d-none');
      btnStopLive.classList.add('d-none');
      if (liveStatus) {
        liveStatus.innerText = "تم التوقف.";
        liveStatus.classList.remove('text-success', 'fw-bold');
        liveStatus.classList.add('text-muted');
      }
    });
  }

  if (isMobile) console.log("📱 Mobile Mode Active");
  else console.log("🌐 Web Mode Active");
});