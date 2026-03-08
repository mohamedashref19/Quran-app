/* eslint-disable */
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import localforage from 'localforage';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Browser } from '@capacitor/browser';


import axios from 'axios';
import '@babel/polyfill';
import { login, logout, signup, verifyOTP, updateSettings, forgotPassword, resetPassword, deleteUser, showAlert, changePassword,deleteUserForuser } from './auth';
import { 
  loadSurahs, startSurahReading, manageKhatmah, createKhatmah, updateKhatmahProgress,
  checkRecitation, loadReciters, loadPrayers, loadBookmarks, loadQuranPage,
  toggleBookmark, deleteBookmark, deleteKhatmah, initSearch, initBookmarksSearch,scheduleFridayKahfNotification,scheduleDuhaNotification,
  shareAyah,
} from './features';
import './insights';


import { surahNames, surahPageMap, juzData, getSurahNameByPage } from './constants';

if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.log = function () {};
    console.info = function () {};
    console.warn = function () {}; 
    console.error = function () {};
}

// ─── 1. Config 
// axios.defaults.baseURL = 'https://aqra-app.serveftp.com';
axios.defaults.baseURL = 'https://aqraapp.com';
// axios.defaults.baseURL ='http://127.0.0.1:3000';
axios.defaults.withCredentials =  Capacitor.isNativePlatform();
const OFFLINE_HANDLED_URLS = [
  '/api/v1/bookmarks',
  '/api/v1/khatmah',
  '/api/v1/audio/reciters',
  '/api/v1/quran',
  '/api/v1/prayers',
  '/api/v1/users/me',
  '/api/v1/prayers/get-location'
];
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!navigator.onLine || error.message === 'Network Error') {
      // لو الـ endpoint بيتعامل مع الأوفلاين بنفسه، متطلعش الـ error
      const requestUrl = error.config?.url || '';
      const isOfflineHandled = OFFLINE_HANDLED_URLS.some(url => requestUrl.includes(url));
      
      if (!isOfflineHandled) {
        Swal.fire({
          icon: 'error',
          title: 'لا يوجد اتصال بالإنترنت',
          text: 'يرجى التحقق من اتصالك بالشبكة والمحاولة مرة أخرى.',
          confirmButtonText: 'فهمت',
          confirmButtonColor: '#1e5f31'
        });
      }
    }
    return Promise.reject(error);
  }
);

window.addEventListener('offline', () => {
  Swal.fire({
    toast: true,
    position: 'top',
    icon: 'warning',
    title: '📶 انقطع الاتصال بالإنترنت',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });
});
// ─── Offline Queue Processor 
const processOfflineQueue = async () => {
  if (!navigator.onLine) return;
  try {
    const queue = await localforage.getItem('offline_actions_queue') || [];
    if (queue.length === 0) return;

    console.log(`🔄 [OFFLINE QUEUE] معالجة ${queue.length} عملية معلقة...`);
    const failed = [];
    let successCount = 0;

    for (const action of queue) {
      try {
        if (action.type === 'ADD_BOOKMARK') {
  await axios.post('/api/v1/bookmarks', {
    surahNumber: action.payload.surahNumber,
    ayahNumber:  action.payload.ayahNumber,
    ayahText:    action.payload.ayahText || '',
    note:        action.payload.note    || ''
  });
  successCount++;
}else if (action.type === 'DELETE_BOOKMARK') {
          const res = await axios.get('/api/v1/bookmarks');
          const bookmarks = res.data.data.bookmarks;
          const found = bookmarks.find(
            b => parseInt(b.surah) === parseInt(action.payload.surah) &&
                 parseInt(b.ayah)  === parseInt(action.payload.ayah)
          );
          if (found) {
            await axios.delete(`/api/v1/bookmarks/${found._id}`);
            successCount++;
          }
        } else if (action.type === 'UPDATE_KHATMAH') {
          await axios.patch('/api/v1/khatmah', action.payload);
          successCount++;
        }
     } catch (err) {
        if (err.response?.status === 401) {
          // جلسة منتهية - مسح الـ queue كلها ومنع data loss
          console.warn('⚠️ [OFFLINE QUEUE] جلسة منتهية - مسح الـ queue');
          await localforage.setItem('offline_actions_queue', []);
          Swal.fire({
            toast: true, position: 'top-end', icon: 'warning',
            title: 'انتهت جلستك - يرجى تسجيل الدخول مجدداً',
            showConfirmButton: false, timer: 4000
          });
          break; // وقف معالجة باقي الـ queue
        }
        if (!err.response || err.response.status >= 500) {
          failed.push(action);
        }
      }
    }

    await localforage.setItem('offline_actions_queue', failed);

    if (successCount > 0) {
  // ✅ بعد الزامنة، نحدث الكاش من السيرفر عشان يشمل العلامات الجديدة
  try {
    const freshRes = await axios.get('/api/v1/bookmarks');
    await localforage.setItem('offline_bookmarks', freshRes.data.data.bookmarks);
    console.log(`🔄 [SYNC] تم تحديث كاش العلامات بعد الزامنة (${freshRes.data.data.bookmarks.length} علامة)`);
  } catch (e) { /* تجاهل */ }

  Swal.fire({
    toast: true, position: 'top-end', icon: 'success',
    title: `✅ تمت مزامنة ${successCount} عملية محفوظة`,
    showConfirmButton: false, timer: 3000
  });
}
  } catch (e) {
    console.error('❌ [OFFLINE QUEUE] خطأ في المعالجة:', e);
  }
};

window.addEventListener('online', () => {
  Swal.fire({
    toast: true,
    position: 'top',
    icon: 'success',
    title: '✅ عاد الاتصال بالإنترنت',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });
  setTimeout(() => processOfflineQueue(), 2000);
});





// ─── 2. Global State ──────────────────────────────────────────────────────────
window.currentAudio = null;
let aiMediaRecorder = null;
window.currentPage  = 1;

let liveStream = null;
let isLiveTracking = false;
let chunkRecorder = null;
let chunkTimeout = null;
let lastMatchedIndex = -1;   
let searchStartIndex = 0;    
let accumulatedBuffer = '';


window.deleteUserForuser = deleteUserForuser;



// ─── Quran IndexedDB Cache ─────────────────────────────────────────────────
const DB_NAME    = 'QuranAppDB';
const STORE_NAME = 'quranPages';
const DB_VERSION = 1;

let _db = null;

const initQuranDB = () => new Promise((resolve, reject) => {
  if (_db) return resolve(_db);
  const req = indexedDB.open(DB_NAME, DB_VERSION);

  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'page' });
      store.createIndex('cachedAt', 'cachedAt');
    }
  };

  req.onsuccess = (e) => {
    _db = e.target.result;
    console.log('✅ [IDB] قاعدة بيانات المصحف جاهزة');
    resolve(_db);
  };

  req.onerror = (e) => {
    console.error('❌ [IDB] خطأ في فتح قاعدة البيانات:', e.target.error);
    reject(e.target.error);
  };
});

const cacheSet = async (page, data) => {
  try {
    const db = await initQuranDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ page, data, cachedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror    = (e) => reject(e.target.error);
    });
  } catch (e) {
    console.warn('⚠️ [IDB] خطأ في الحفظ:', e);
    return false;
  }
};

const cacheGet = async (page) => {
  try {
    const db = await initQuranDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.get(page);
      req.onsuccess = (e) => resolve(e.target.result?.data || null);
      req.onerror   = (e) => reject(e.target.error);
    });
  } catch (e) {
    console.warn('⚠️ [IDB] خطأ في القراءة:', e);
    return null;
  }
};

const prefetchPage = async (pageNum) => {
  if (pageNum < 1 || pageNum > 604) return;
  if (!navigator.onLine) return;
  try {
    const cached = await cacheGet(pageNum);
    if (cached) return;
    const res = await axios.get(`/api/v1/quran/page/${pageNum}`);
    await cacheSet(pageNum, res.data.data);
  } catch (e) { /* تجاهل */ }
};

Object.assign(window, { cacheSet, cacheGet, prefetchPage });

initQuranDB().catch(e => console.warn('IDB init failed:', e));



// ─── Tafseer Cache ────────────────────────────────
const tafseerSet = async (surah, ayah, text) => {
  try {
    await localforage.setItem(`tafseer_${surah}_${ayah}`, text);
  //  console.log(`💾 [TAFSEER SAVED] سورة ${surah} - آية ${ayah}`);
    return true;
  } catch (e) {
    console.error('❌ [TAFSEER] فشل الحفظ:', e);
    return false;
  }
};

const tafseerGet = async (surah, ayah) => {
  try {
    const cached = await localforage.getItem(`tafseer_${surah}_${ayah}`);
    if (cached) console.log(`⚡ [TAFSEER CACHE HIT] سورة ${surah} - آية ${ayah} - من الكاش`);
    return cached || null;
  } catch (e) {
    return null;
  }
};

// ─── 3. Helpers ───────────────────────────────────────────────────────────────
const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g, '') 
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
};

function calculateSimilarity(spoken, ayah) {
  const spokenArr = spoken.split(' ').filter(w => w.trim().length > 0);
  const ayahArr   = ayah.split(' ').filter(w => w.trim().length > 0);
  if (spokenArr.length === 0 || ayahArr.length === 0) return 0;
  const intersection = spokenArr.filter(w => ayahArr.includes(w));
  const spokenAccuracy = intersection.length / spokenArr.length;
  const ayahCompletion = intersection.length / ayahArr.length;
  return (spokenAccuracy * 0.6) + (ayahCompletion * 0.4);
}



window.loadAllUsers = async () => {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-success"></div><p>جاري تحميل المستخدمين...</p></td></tr>';
    try {
        const res = await axios.get('/api/v1/users'); 
        const users = res.data.data.data; 
        tbody.innerHTML = '';
        if(!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">لا يوجد مستخدمين.</td></tr>';
            return;
        }
        users.forEach(user => {
            const roleBadge = user.role === 'admin' 
                ? '<span class="badge bg-warning text-dark">مدير</span>' 
                : '<span class="badge bg-secondary">مستخدم</span>';
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${user.name}</td>
                    <td>${user.email}</td>
                    <td>${roleBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteUserHandler('${user._id}')">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>`;
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">فشل في تحميل البيانات.</td></tr>';
    }
};

window.deleteUserHandler = async (id) => {
    const result = await Swal.fire({
      title: 'هل أنت متأكد؟', text: "سيتم حذف هذا المستخدم نهائياً!", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، احذف', cancelButtonText: 'تراجع'
    });
    if (result.isConfirmed) {
        try {
            await axios.delete(`/api/v1/users/${id}`);
            Swal.fire({ icon: 'success', title: 'تم الحذف', text: 'تم حذف المستخدم بنجاح.', timer: 1500, showConfirmButton: false });
            window.loadAllUsers(); 
        } catch (err) {
            Swal.fire('خطأ', 'فشل حذف المستخدم، قد لا تمتلك الصلاحية', 'error');
        }
    }
};

window.downloadEntireQuranOffline = async () => {
    const isFullyCached = await localforage.getItem('quran_fully_cached');
    if (isFullyCached) {
        console.log('✅ المصحف كاملاً موجود بالفعل في الذاكرة (Offline Ready)');
        return;
    }
    //console.log('🔄 جاري تحميل المصحف في الخلفية للعمل بدون إنترنت...');
    let successCount = 0;
    for (let page = 1; page <= 604; page++) {
    if (!navigator.onLine) break; // ✅ تحقق في كل iteration

    const pageExists = await window.cacheGet(page);
    if (!pageExists) {
      try {
        const response = await fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`);
        if (!response.ok) throw new Error('Network Error');
        const data = await response.json();
        await window.cacheSet(page, data.data);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.warn(`⚠️ توقف التحميل عند صفحة ${page}`);
        break;
      }
    }
  }
    if (successCount > 0) {
        let allSaved = true;
        for(let i=1; i<=604; i++){
            if(!(await window.cacheGet(i))) { allSaved = false; break; }
        }
        if(allSaved) {
            await localforage.setItem('quran_fully_cached', true);
            console.log('🎉 المصحف متاح الآن للعمل 100% بدون إنترنت.');
        }
    }
};

window.downloadEntireTafseerOffline = async () => {
  const isFullyCached = await localforage.getItem('tafseer_fully_cached');
  if (isFullyCached) {
    console.log('✅ [TAFSEER] التفسير كاملاً موجود بالفعل في الذاكرة');
    return;
  }

  if (!navigator.onLine) return;

  //console.log('🔄 [TAFSEER] جاري تحميل التفسير في الخلفية...');

  let savedSurahs = 0;

  for (let surah = 1; surah <= 114; surah++) {
    if (!navigator.onLine) {
    //  console.warn('⚠️ [TAFSEER] انقطع الاتصال - سيكمل عند عودة النت');
      return;
    }

    // لو السورة دي اتحفظت قبل كده تجاوزها
    const firstAyah = await localforage.getItem(`tafseer_${surah}_1`);
    if (firstAyah) { savedSurahs++; continue; }

    try {
      const res = await axios.get(`/api/v1/quran/tafseer/${surah}`);
      const ayahs = res.data.data;

      for (const item of ayahs) {
        await localforage.setItem(`tafseer_${surah}_${item.ayah}`, item.tafseer);
      }

      savedSurahs++;
    //  console.log(`📥 [TAFSEER] سورة ${savedSurahs}/114 ✅`);
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.warn(`⚠️ [TAFSEER] فشل سورة ${surah} - متجاوز...`);
      await new Promise(r => setTimeout(r, 500));
      continue; // ← بدل return
    }
  }

  await localforage.setItem('tafseer_fully_cached', true);
  console.log('🎉 [TAFSEER] التفسير كاملاً متاح الآن بدون إنترنت!');
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { downloadEntireQuranOffline(); }, 3000);
    setTimeout(() => { window.downloadEntireTafseerOffline(); }, 10000);
});
// ─── 5. requireLogin ──────────────────────────────────────────────────────────
const requireLogin = (featureName = 'هذه الميزة') => {
  Swal.fire({
    icon: 'warning', title: 'يجب تسجيل الدخول أولاً',
    text: `سجّل دخولك لتتمكن من استخدام ${featureName}`,
    confirmButtonText: 'تسجيل الدخول', cancelButtonText: 'لاحقاً',
    showCancelButton: true, confirmButtonColor: '#198754', cancelButtonColor: '#6c757d',
  }).then((result) => { if (result.isConfirmed) window.showSection('login'); });
};
window.requireLogin = requireLogin;

// ─── 6. isUserLoggedIn ────────────────────────────────────────────────────────
const isUserLoggedIn = async () => {
  if (axios.defaults.headers.common['Authorization']) return true;
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: 'auth_token' });
    if (value) return true;
  } else {
    if (localStorage.getItem('auth_token')) return true;
  }
  const userLinks = document.querySelectorAll('.user-link:not(.d-none)');
  return userLinks.length > 0;
};

// ─── 7. Stop All Media ────────────────────────────────────────────────────────
const stopAllMedia = () => {
  console.log("🔴 [SYSTEM] Stopping all media...");
  if (window.currentAudio) { window.currentAudio.pause(); window.currentAudio = null; }
  if (typeof window.stopSheikhFollowAlong === 'function') {
      window.stopSheikhFollowAlong();
  }
  if (typeof window.stopAzkarAudio === 'function') window.stopAzkarAudio();
  document.querySelectorAll('audio, video').forEach(m => { m.pause(); m.currentTime = 0; });
  if (aiMediaRecorder && aiMediaRecorder.state !== 'inactive') {
    aiMediaRecorder.stop();
    if (aiMediaRecorder.stream) aiMediaRecorder.stream.getTracks().forEach(t => t.stop());
    aiMediaRecorder = null;
  }
  isLiveTracking = false;
  clearTimeout(chunkTimeout);
  if (chunkRecorder && chunkRecorder.state !== 'inactive') {
      try { chunkRecorder.stop(); } catch(e){}
  }
  if (liveStream) {
      liveStream.getTracks().forEach(t => t.stop());
      liveStream = null;
  }
  // ✅ FIX: تحقق من وجود الـ DOM قبل استدعاء resetUIButtons
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    resetUIButtons();
  }
   document.querySelectorAll('.live-ayah-text').forEach(el => {
    el.style.backgroundColor = '';
    el.style.color = '';
    el.style.borderRadius = '';
    el.style.padding = '';
  });
  document.querySelectorAll('.live-ayah-item').forEach(el => {
    el.classList.remove('ayah-active');
  });
};

const resetUIButtons = () => {
  document.querySelectorAll('.live-play-btn').forEach(b => {
    if (!b) return;
    b.innerHTML = '<i class="fas fa-play"></i>';
    b.classList.remove('playing', 'btn-danger');
    b.classList.add('btn-outline-success');
  });

  const aiBtn = document.getElementById('recordBtn');
  if (aiBtn) {
    aiBtn.classList.replace('btn-danger', 'btn-outline-danger');
    aiBtn.innerHTML = '<i class="fas fa-microphone fa-2x"></i>';
    const st = document.getElementById('recordStatus');
    if (st) st.innerText = 'اضغط للتسجيل';
  }

  const startLive = document.getElementById('btn-start-live');
  const stopLive  = document.getElementById('btn-stop-live');
  const liveSt    = document.getElementById('live-status');
  if (startLive && stopLive) {
    startLive.classList.remove('d-none');
    stopLive.classList.add('d-none');
    if (liveSt) { liveSt.innerText = 'جاهز...'; liveSt.className = 'text-muted small mt-1'; }
  }

  const radioAudio = document.getElementById('radio-audio');
  const radioPlayIcon = document.getElementById('radio-play-icon');
  const radioStatus = document.getElementById('radio-status');
  const radioIcon = document.getElementById('radio-icon');

  if (radioPlayIcon) {
      radioPlayIcon.classList.replace('fa-stop', 'fa-play');
      radioPlayIcon.style.marginLeft = '5px';
  }
  if (radioStatus) {
      radioStatus.innerText = 'متوقف';
      radioStatus.classList.replace('text-dark', 'text-success');
  }
  if (radioIcon) {
      radioIcon.classList.remove('fa-fade');
  }
  if (radioAudio && !radioAudio.paused) {
      radioAudio.pause();
      radioAudio.src = '';
  }
};

// ─── 8. checkAuth ─────────────────────────────────────────────────────────────
window.checkAuth = async () => {
  let savedToken = null;
  if (Capacitor.isNativePlatform()) {
    const pref = await Preferences.get({ key: 'auth_token' });
    savedToken = pref.value;
  } else {
    savedToken = localStorage.getItem('auth_token');
  }

  // ✅ 2. لو مفيش توكن، اعرض أزرار تسجيل الدخول
  if (!savedToken) {
    document.querySelectorAll('.auth-link').forEach(el => el.classList.remove('d-none'));
    document.querySelectorAll('.user-link, .admin-link').forEach(el => el.classList.add('d-none'));
    return false;
  }

  // ✅ 3. إضافة التوكن للـ axios لو مش موجود
  if (!axios.defaults.headers.common['Authorization']) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
  }
  
  try {
    const res = await axios.get('/api/v1/users/me');
    if (res.data.status === 'success') {
      const user = res.data.data.doc;
      document.querySelectorAll('.auth-link').forEach(el => el.classList.add('d-none'));
      document.querySelectorAll('.user-link').forEach(el => el.classList.remove('d-none'));
      if (user.role === 'admin') {
          document.querySelectorAll('.admin-link').forEach(el => el.classList.remove('d-none'));
      } else {
          document.querySelectorAll('.admin-link').forEach(el => el.classList.add('d-none'));
      }
      await localforage.setItem('is_logged_in', true);
      await localforage.setItem('user_role', user.role);
      return true;
    }
  } catch (err) {
    if (!navigator.onLine || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
      const wasLoggedIn = await localforage.getItem('is_logged_in');
      const cachedRole = await localforage.getItem('user_role');
      if (wasLoggedIn) {
        document.querySelectorAll('.auth-link').forEach(el => el.classList.add('d-none'));
        document.querySelectorAll('.user-link').forEach(el => el.classList.remove('d-none'));
        if (cachedRole === 'admin') {
            document.querySelectorAll('.admin-link').forEach(el => el.classList.remove('d-none'));
        }
        console.log('⚡ [OFFLINE] المستخدم مسجل دخول (من الكاش)');
        return true;
      }
    }
    
    // ✅ 4. مسح التوكن من المكان الصحيح لو الجلسة انتهت
    if (err.response?.status === 401 && savedToken) {
      console.warn('⚠️ [AUTH] 401 رغم وجود توكن - إزالة التوكن وعرض شاشة الدخول');
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key: 'auth_token' });
      } else {
        localStorage.removeItem('auth_token');
      }
      delete axios.defaults.headers.common['Authorization'];
      await localforage.removeItem('is_logged_in');
      await localforage.removeItem('user_role');
    }

    document.querySelectorAll('.auth-link').forEach(el => el.classList.remove('d-none'));
    document.querySelectorAll('.user-link, .admin-link').forEach(el => el.classList.add('d-none'));
    if (err.response?.status !== 401) {
      await localforage.removeItem('is_logged_in');
      await localforage.removeItem('user_role');
    }
  }
  return false;
};

window.loadSurahIndex = () => {
  const container = document.getElementById('surah-index-list');
  if (!container || container.children.length > 0) return;
  surahNames.forEach((name, i) => {
    const pageNum = surahPageMap[i] || 1;
    container.insertAdjacentHTML('beforeend', `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="card shadow-sm h-100 p-2 text-center hover-shadow border-success"
          style="cursor:pointer;transition:transform .2s"
         onclick="window.showSection('quran'); window.loadQuranPage(${pageNum}, ${i + 1}, 1);">
          <div class="card-body p-2">
            <span class="badge bg-light text-dark mb-1 border rounded-circle">${i + 1}</span>
            <h6 class="card-title fw-bold text-success mb-0" style="font-family:'Amiri'">${name}</h6>
            <small class="text-muted" style="font-size:.7rem">صفحة ${pageNum}</small>
          </div>
        </div>
      </div>`);
  });
};

window.loadJuzIndex = () => {
  const container = document.getElementById('juz-index-list');
  if (!container || container.dataset.loaded === 'true') return;
  container.dataset.loaded = 'true';
  let html = '';
  
  juzData.forEach(juz => {
    const hizb1Page = juz.page;
    const hizb2Page = juz.page + 10;
    const hizbNum1  = (juz.juz - 1) * 2 + 1;
    const hizbNum2  = (juz.juz - 1) * 2 + 2;
    
    html += `
      <div class="juz-header">
        <div><h5><i class="fas fa-book-open me-2"></i>الجزء ${juz.juz}</h5><small style="opacity:0.85">${juz.name}</small></div>
        <div class="text-end"><div class="juz-badge mb-1">ص ${juz.page}</div><small style="opacity:0.8; font-size:0.75rem">${juz.surahs}</small></div>
      </div>
      <div class="row g-2 mb-3">
        <div class="col-6">
          <div class="card bg-transparent border-success h-100 hover-shadow" style="cursor:pointer; border-width:2px !important;"
            onclick="window.showSection('quran'); window.loadQuranPage(${hizb1Page});">
            <div class="card-body text-center py-3">
              <div class="text-success fw-bold mb-2" style="font-size:1.1rem">الحزب ${hizbNum1}</div>
              <div class="justify-content-center d-flex flex-wrap gap-2">
                <button class="btn btn-sm btn-success text-white rounded-pill px-2 py-1" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb1Page});">ص ${hizb1Page} الربع 1</button>
                <button class="btn btn-sm btn-success text-white rounded-pill px-2 py-1" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb1Page + 2});">ص ${hizb1Page + 2} الربع 2</button>
                <button class="btn btn-sm btn-success text-white rounded-pill px-2 py-1" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb1Page + 5});">ص ${hizb1Page + 5} الربع 3</button>
                <button class="btn btn-sm btn-success text-white rounded-pill px-2 py-1" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb1Page + 7});">ص ${hizb1Page + 7} الربع 4</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-6">
          <div class="card bg-transparent border-success h-100 hover-shadow" style="cursor:pointer; border-width:2px !important;"
            onclick="window.showSection('quran'); window.loadQuranPage(${hizb2Page});">
            <div class="card-body text-center py-3">
              <div class="text-success fw-bold mb-2" style="font-size:1.1rem">الحزب ${hizbNum2}</div>
              <div class="justify-content-center d-flex flex-wrap gap-2">
                <button class="btn btn-sm btn-success text-white rounded-pill px-2 py-1" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb2Page});">ص ${hizb2Page} الربع 1</button>
                <button class="btn btn-sm btn-success text-white rounded-pill px-2 py-1" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb2Page + 2});">ص ${hizb2Page + 2} الربع 2</button>
                <button class="btn btn-sm btn-success text-white rounded-pill px-2 py-1" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb2Page + 5});">ص ${hizb2Page + 5} الربع 3</button>
                <button class="btn btn-sm btn-success text-white rounded-pill px-2 py-1" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb2Page + 7});">ص ${hizb2Page + 7} الربع 4</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  });
  
  container.innerHTML = html;
};

window.showTafseer = async (surahId, ayahId) => {
  try {
    const cached = await tafseerGet(surahId, ayahId);
    if (cached) {
      showTafseerModal(ayahId, cached);
    } else {
      Swal.fire({ title: 'جاري جلب التفسير...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const res = await axios.get(`/api/v1/quran/tafseer/${surahId}/${ayahId}`);
      const tafseer = res.data.data.tafseer;
      await tafseerSet(surahId, ayahId, tafseer);
      showTafseerModal(ayahId, tafseer);
    }
  } catch {
    const cached = await tafseerGet(surahId, ayahId);
    if (cached) {
      showTafseerModal(ayahId, cached);
    } else {
      Swal.fire({ icon: 'error', title: 'لا يوجد اتصال', text: 'التفسير غير متاح بدون إنترنت حتى الآن' });
    }
  }
};

// ─── Helper Modal ──────────────────────────────────
const showTafseerModal = (ayahId, tafseer) => {
  Swal.fire({
    title: `<span class="text-success" style="font-family:'Amiri'">تفسير الآية ${ayahId}</span>`,
    html: `
      <div style="font-family:'Amiri';font-size:1.2rem;line-height:1.8;
                  text-align:justify;direction:rtl;
                  max-height:60vh;overflow-y:auto;padding-right:5px;">
        ${tafseer}
      </div>
      <div style="margin-top:15px;padding-top:10px;border-top:1px solid #e0e0e0;text-align:center;">
        <small style="color:#6c757d;font-family:'Amiri'">
          📚 المصدر: <span style="color:#198754;font-weight:bold">التفسير الميسر</span>
        </small>
      </div>`,
    confirmButtonText: 'إغلاق',
    confirmButtonColor: '#198754',
  });
};

// ─── showSection ──────────────────────────────────────────────────────────────
window.showSection = async (sectionName) => {
  stopAllMedia();
  if (sectionName !== 'quran' && typeof _stopAutoScroll === 'function') _stopAutoScroll();
  document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
  const target = document.getElementById(`${sectionName}-section`);
  if (!target) return;
  target.classList.remove('d-none');
  window.scrollTo(0, 0);
  if (sectionName === 'quran') {
    if (typeof _nightModeActive !== 'undefined' && _nightModeActive) {
      document.body.setAttribute('data-reading', 'night');
      document.documentElement.style.setProperty('background-color', '#0d1b0f', 'important');
    }
  } else {
    document.body.removeAttribute('data-reading');
    document.documentElement.style.removeProperty('background-color');
  }

  const newPath = sectionName === 'home' ? '/' : `/${sectionName}`;
  const titles = {
    'home': 'Aqra | اقرأ📖', 'surah-index': 'المصحف الشريف',
    'reciters': 'القراء والمشايخ', 'bookmarks': 'علاماتي المرجعية',
    'khatmah': 'ختمتي الحالية', 'profile': 'إعدادات الحساب',
    'live-recitation': 'تتبع التلاوة المباشر', 'ai-correction': 'المصحح الذكي',
    'reset-password': 'تعيين كلمة مرور جديدة',
  };
  if (sectionName !== 'quran') {
    document.title = titles[sectionName] || "تطبيق اقرأ";
  }
  if (window.location.pathname !== newPath) {
    window.history.pushState({ section: sectionName }, '', newPath);
  }
 if (sectionName === 'home') {
  const lastCheck = window._lastAuthCheck || 0;
  if (Date.now() - lastCheck > 60000) {
    window._lastAuthCheck = Date.now();
    window.checkAuth();
  }
  loadPrayers();
  if (document.getElementById('active-khatmah')) manageKhatmah().catch(() => {});
}
  if (sectionName === 'surah-index') window.loadSurahIndex();
  if (sectionName === 'reciters') loadReciters();
  if (sectionName === 'bookmarks') loadBookmarks();
  if (sectionName === 'khatmah') {
    manageKhatmah().catch(() => {});
    const sel = document.getElementById('currentSurah');
    if (sel && sel.options.length <= 1) surahNames.forEach((n, i) => { const o = document.createElement('option'); o.value = i + 1; o.textContent = `${i + 1}. ${n}`; sel.appendChild(o); });
  }
  if (sectionName === 'profile') {
    let savedToken = null;
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: 'auth_token' });
      savedToken = value;
    } else {
      savedToken = localStorage.getItem('auth_token');
    }
    if (savedToken) axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    axios.get('/api/v1/users/me').then(async res => {
      const u = res.data.data.doc;
      if (u) { 
        const n = document.getElementById('profile-name'); if (n) n.value = u.name; 
        const e = document.getElementById('profile-email'); if (e) e.value = u.email; 
        await localforage.setItem('cached_user_profile', { name: u.name, email: u.email });
      }
    }).catch(async (err) => {
      if (!navigator.onLine || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        const cachedUser = await localforage.getItem('cached_user_profile');
        if (cachedUser) {
          const n = document.getElementById('profile-name'); if (n) n.value = cachedUser.name;
          const e = document.getElementById('profile-email'); if (e) e.value = cachedUser.email;
          return;
        }
      }
      if (err.response?.status === 401) window.showSection('login');
    });
  }
  if (sectionName === 'forgot-password') {
    const emailEl = document.getElementById('forgot-email');
    const msgEl   = document.getElementById('forgot-success-msg');
    if (emailEl) emailEl.value = '';
    if (msgEl) msgEl.classList.add('d-none');
  }
  const fillSelect = (id) => {
    const s = document.getElementById(id);
    if (s && s.options.length <= 1) {
      surahNames.forEach((n, i) => { 
        const o = document.createElement('option'); 
        o.value = i + 1; 
        o.textContent = `${i + 1}. ${n}`; 
        s.appendChild(o); 
      });
      if (window.transformSelectToSearchable) {
        window.transformSelectToSearchable(s);
      }
    }
  };
  if (sectionName === 'ai-correction') fillSelect('ai-surah-select');
  if (sectionName === 'live-recitation') fillSelect('live-surah-select');
    if (sectionName === 'qibla') {
    setTimeout(() => {
      if (window.initQibla) window.initQibla();
    }, 300);
  }

  if (sectionName === 'azkar') {
    if (window.loadTasbeeh) window.loadTasbeeh();
  }

  

  if (sectionName !== 'qibla') {

    window.removeEventListener('deviceorientationabsolute', window._qiblaOrientationHandler);
    window.removeEventListener('deviceorientation', window._qiblaOrientationHandler);
  }
};

window.openQuranAtCurrentKhatmah = async () => {
  try {
    if (!await isUserLoggedIn()) { requireLogin('متابعة الختمة'); return; }

    // ─── 1. قراءة الكاش فوراً (0 ثانية انتظار) ───────────────────────────────
    let k = await localforage.getItem('latest_khatmah');

    // ─── 2. تحديث صامت في الخلفية لتحديث الكاش للمرة القادمة ─────────────────
    if (navigator.onLine) {
      axios.get('/api/v1/khatmah').then(async (res) => {
        const fresh = res.data?.data?.khatmah;
        if (fresh) await localforage.setItem('latest_khatmah', fresh);
      }).catch(() => {});
    }

    // ─── 3. لو مفيش كاش خالص (أول مرة)، هنا فقط نظهر اللودينج ──────────────
    if (!k) {
      if (!navigator.onLine) { window.showSection('khatmah'); return; }
      Swal.fire({
        title: '📖 جاري فتح ختمتك...',
        html: `<div class="text-center py-2"><div class="spinner-border text-success mb-3" style="width:3rem;height:3rem;"></div></div>`,
        allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading()
      });
      try {
        const res = await axios.get('/api/v1/khatmah');
        k = res.data.data.khatmah;
        if (k) await localforage.setItem('latest_khatmah', k);
      } catch (fetchErr) {
        Swal.close();
        if (fetchErr.response?.status === 401) requireLogin('متابعة الختمة');
        else if (fetchErr.response?.status === 404) window.showSection('khatmah');
        else showAlert('error', 'تعذر تحميل الختمة');
        return;
      }
      Swal.close();
    }

    // ─── 4. الانتقال المباشر بدون أي انتظار ──────────────────────────────────
    if (!k || !k.currentSurah || !k.currentAyah) { window.showSection('khatmah'); return; }
    
    const currentSurah   = parseInt(k.currentSurah);
    const currentAyah    = parseInt(k.currentAyah);
    const surahFirstPage = surahPageMap[currentSurah - 1] || 1;
    const savedPage      = k.page ? parseInt(k.page) : 0;
    const targetPage     = (savedPage >= surahFirstPage && savedPage <= 604) ? savedPage : surahFirstPage;
    
    document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
    document.getElementById('quran-section')?.classList.remove('d-none');
    window.scrollTo(0, 0);
    window.history.pushState({ section: 'quran' }, '', '/quran');
    document.querySelectorAll('.bottom-nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById('bnav-quran')?.classList.add('active');
    
    await window.loadQuranPage(targetPage, currentSurah, currentAyah);
  } catch (err) {
    Swal.close();
    if (err.response?.status === 401) requireLogin('متابعة الختمة');
    else window.showSection('khatmah');
  }
};

window.loadQuranPage = loadQuranPage;
window.startSurahReading = startSurahReading;
window.changePassword = changePassword;
window.forgotPasswordHandler = forgotPassword;
window.forgotPassword = forgotPassword;
window.resetPassword  = resetPassword;
window.login          = login;
window.signup         = signup;
window.verifyOTP      = verifyOTP;
window.logout         = logout;

// ─── 9. Live Audio Player ─────────────────────────────────────────────────────
window.playLiveAudio = (url, btnId) => {
  if (isLiveTracking) { showAlert('error', 'أوقف التسميع أولاً قبل تشغيل الصوت'); return; }
  if (window.stopSheikhFollowAlong && typeof window.stopSheikhFollowAlong === 'function') {
    window.stopSheikhFollowAlong();
  }
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (window.currentAudio && btn.classList.contains('playing')) {
    window.currentAudio.pause(); window.currentAudio = null;
    btn.innerHTML = '<i class="fas fa-play"></i>';
    btn.classList.remove('playing', 'btn-danger'); btn.classList.add('btn-outline-success');
    return;
  }
  const playNew = () => {
    const audio = new Audio(url); window.currentAudio = audio;
    const p = audio.play();
    if (p !== undefined) {
      p.then(() => { btn.innerHTML = '<i class="fas fa-stop"></i>'; btn.classList.add('playing', 'btn-danger'); btn.classList.remove('btn-outline-success'); })
       .catch(err => { console.warn('Audio play:', err.name); window.currentAudio = null; });
    }
    audio.onended = audio.onerror = () => {
      btn.innerHTML = '<i class="fas fa-play"></i>';
      btn.classList.remove('playing', 'btn-danger'); btn.classList.add('btn-outline-success');
      window.currentAudio = null;
    };
  };
  if (window.currentAudio) { window.currentAudio.pause(); window.currentAudio = null; resetUIButtons(); setTimeout(playNew, 150); }
  else playNew();
};

// ─── 10. Chunking Logic ────────────────────────────────────────────────────────
async function sendChunkToAPI(blob) {
    const formData = new FormData();
    formData.append('audio', blob, 'chunk.webm');
    const surahSelect = document.getElementById('live-surah-select');
    const surahName = surahSelect.options[surahSelect.selectedIndex].text.replace(/[0-9.]/g, '').trim();
    formData.append('surahName', surahName);
    const ayahEls = document.querySelectorAll('.live-ayah-item');
    let context = "";
    let end = Math.min(ayahEls.length, searchStartIndex + 2);
    for(let i = searchStartIndex; i < end; i++) {
        if(ayahEls[i]) context += ayahEls[i].dataset.clean + " ";
    }
    formData.append('expectedContext', context.trim());
    try {
        let token = null;
        if (Capacitor.isNativePlatform()) {
            const pref = await Preferences.get({ key: 'auth_token' });
            token = pref.value;
        } else {
            token = axios.defaults.headers.common['Authorization']?.split(' ')[1];
        }
        const config = { headers: {} };
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
        const res = await axios.post('/api/v1/quran/stream-check', formData, config);
        if (res.data.status === 'success' && res.data.text) {
            highlightSpokenAyah(res.data.text);
        }
    } catch (e) { 
      console.error("🔴 [CHUNK ERROR]", e.message); 
      if (e.response && e.response.status === 429) {
    Swal.fire({
      icon: 'info',
      title: 'مهلاً!',
      text: e.response.data.message || 'يرجى المحاولة لاحقاً.',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#198754' 
    });
    if (typeof stopLiveTracking === 'function') stopLiveTracking();
    
    resetUIButtons(); 
    return;
  }

    }
}

function startChunkLoop() {
    if (!isLiveTracking || !liveStream) return;
    try { chunkRecorder = new MediaRecorder(liveStream, { mimeType: 'audio/webm' }); }
    catch (e) { chunkRecorder = new MediaRecorder(liveStream); }
    let chunks = [];
    chunkRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    chunkRecorder.onstop = () => {
        if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            sendChunkToAPI(blob);
        }
        if (isLiveTracking) startChunkLoop();
    };
    chunkRecorder.start();
    chunkTimeout = setTimeout(() => {
        if (chunkRecorder && chunkRecorder.state === 'recording') chunkRecorder.stop(); 
    }, 4000);
}

function highlightSpokenAyah(spokenText) {
  if (!spokenText || spokenText.trim().length === 0) return;
  const ayahEls = document.querySelectorAll('.live-ayah-item');
  if (ayahEls.length === 0) return;
  const newWords = normalizeArabic(spokenText).split(' ').filter(w => w.trim().length > 0);
  let bufferWords = accumulatedBuffer.split(' ').filter(w => w.length > 0);
  bufferWords = bufferWords.concat(newWords);
  if (bufferWords.length > 12) bufferWords = bufferWords.slice(-12);
  accumulatedBuffer = bufferWords.join(' ');
  const recent = accumulatedBuffer.trim();
  let bestEl = null, bestScore = 0, newMatchedIndex = -1;
  const from = searchStartIndex;
  const to   = Math.min(ayahEls.length, from + 3);
  for (let i = from; i < to; i++) {
    const el = ayahEls[i];
    const clean = el.dataset.clean;
    if (!clean) continue;
    let score = 0;
    if (clean === recent) score = 1.0;
    else if (clean.includes(recent) && recent.split(' ').length > 2) score = 0.8;
    else if (recent.includes(clean)) score = 1.0;
    else score = calculateSimilarity(recent, clean);
    if (score > bestScore && score >= 0.35) {
      bestScore = score; bestEl = el; newMatchedIndex = i;
      if (score >= 0.85) break; 
    }
  }
  if (bestEl && bestScore >= 0.35) {
    const isMemMode = document.getElementById('memorize-mode')?.checked;
    document.querySelectorAll('.live-ayah-item').forEach((el, idx) => {
      el.classList.remove('ayah-active');
      const td = el.querySelector('.live-ayah-text');
      if (!td) return;
      td.style.backgroundColor = ''; td.style.color = ''; td.style.borderRadius = ''; td.style.padding = '';
      if (idx <= newMatchedIndex) td.classList.remove('blurred-text');
      else if (isMemMode) td.classList.add('blurred-text');
      else td.classList.remove('blurred-text');
    });
    bestEl.classList.add('ayah-active');
    const curTd = bestEl.querySelector('.live-ayah-text');
    if (curTd) {
      curTd.classList.remove('blurred-text');
      curTd.style.backgroundColor = '#d1e7dd';
      curTd.style.color = '#0f5132';
      curTd.style.borderRadius = '10px';
      curTd.style.padding = '10px';
    }
    bestEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    lastMatchedIndex = newMatchedIndex;
    if (bestScore >= 0.7 || recent.includes(bestEl.dataset.clean)) {
        searchStartIndex = newMatchedIndex + 1;
        accumulatedBuffer = '';
    } else {
        searchStartIndex = newMatchedIndex;
    }
  }
}

// ─── 11. Load Live Ayahs ──────────────────────────────────────────────────────
window.loadLiveAyahs = async () => {
  const surahSelect = document.getElementById('live-surah-select');
  const surah       = surahSelect.value;
  const startAyah   = parseInt(document.getElementById('live-start-ayah').value) || 1;
  const endAyah     = parseInt(document.getElementById('live-end-ayah').value)   || 999;
  const isBlur      = document.getElementById('memorize-mode').checked;
  if (!surah) return showAlert('error', 'اختر السورة أولاً');
  const container = document.getElementById('live-quran-container');
  container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-success"></div><p>جاري جلب الآيات...</p></div>';
  document.getElementById('live-controls').classList.remove('d-none');
  
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah}`);
    const data = await response.json();
    const filteredAyahs = data.data.ayahs.filter(a => a.numberInSurah >= startAyah && a.numberInSurah <= endAyah);
    container.innerHTML = '';
    
    if (!filteredAyahs.length) { 
        container.innerHTML = '<p class="text-muted">لا توجد آيات في هذا النطاق.</p>'; 
        return; 
    }
    
    lastMatchedIndex = -1; searchStartIndex = 0; accumulatedBuffer = '';
    document.querySelectorAll('.live-ayah-text').forEach(el => {
        el.style.backgroundColor = '';
        el.style.color = '';
        el.style.borderRadius = '';
        el.style.padding = '';
    });
    
    // حفظ الآيات للوضع مع الشيخ
    window._liveAyahsList = filteredAyahs.map(ayah => ({
      surah: String(surah).padStart(3, '0'),
      ayah: String(ayah.numberInSurah).padStart(3, '0'),
      num: ayah.numberInSurah,
      text: ayah.text
    }));
    window._liveCurrentSurah = surah;

    filteredAyahs.forEach(ayah => {
      const s = String(surah).padStart(3, '0');
      const a = String(ayah.numberInSurah).padStart(3, '0');
      const audioUrl = `https://everyayah.com/data/Husary_128kbps/${s}${a}.mp3`;
      const btnId    = `btn-play-${s}-${a}`;
      const blurClass = isBlur ? 'blurred-text' : '';
      const cleanText = normalizeArabic(ayah.text);

      // 🛠️ تمرير نص الآية على قاموس التصحيح لضمان اتصال الحروف
      let ayahText = ayah.text;
      if (typeof UTHMANI_FIXES !== 'undefined') {
          Object.keys(UTHMANI_FIXES).forEach(wrongWord => {
              ayahText = ayahText.split(wrongWord).join(UTHMANI_FIXES[wrongWord]);
          });
      }

      container.insertAdjacentHTML('beforeend', `
        <div class="live-ayah-item" data-clean="${cleanText}" data-ayah-id="${s}${a}">
          <button id="${btnId}" class="btn live-play-btn btn-outline-success rounded-circle ms-3"
            style="width:45px;height:45px;padding:0;flex-shrink:0"
            onclick="playLiveAudio('${audioUrl}','${btnId}')">
            <i class="fas fa-play"></i>
          </button>
          
          <div class="live-ayah-text ${blurClass}" id="text-${btnId}"
            style="flex-grow:1; text-align:right; margin-left:15px;
                  font-family:'Amiri Quran', 'Amiri', serif; font-size:28px;
                   line-height:2.4; transition:all 0.3s ease;">
            ${ayahText}
            <span class="badge bg-light text-dark ms-2 rounded-circle border" style="font-family: sans-serif; font-size: 0.9rem; vertical-align: middle;">
              ${ayah.numberInSurah}
            </span>
          </div>
        </div>
      `);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="text-danger">حدث خطأ في تحميل الآيات.</p>';

  }
};

// ─── اقرأ مع الشيخ: تشغيل متتالي للآيات مع تظليل ─────────────────────────────
let _sheikPlaybackActive = false;
let _sheikCurrentAudio   = null;
let _sheikCurrentIndex   = 0;

window.startSheikhFollowAlong = function() {
  const ayahs = window._liveAyahsList;
  if (!ayahs || !ayahs.length) {
    showAlert('error', 'حمّل الآيات أولاً');
    return;
  }
  if (window.currentAudio) {
      window.currentAudio.pause();
      window.currentAudio = null;
      document.querySelectorAll('.live-play-btn').forEach(b => {
          b.innerHTML = '<i class="fas fa-play"></i>';
          b.classList.remove('playing', 'btn-danger');
          b.classList.add('btn-outline-success');
      });
  }
  _sheikPlaybackActive = true;
  _sheikCurrentIndex = 0;

  const btnStart = document.getElementById('btn-sheikh-start');
  const btnStop  = document.getElementById('btn-sheikh-stop');
  if (btnStart) btnStart.classList.add('d-none');
  if (btnStop)  btnStop.classList.remove('d-none');

  _playSheikhAyah(_sheikCurrentIndex);
};

window.stopSheikhFollowAlong = function() {
  _sheikPlaybackActive = false;
  if (_sheikCurrentAudio) {
    _sheikCurrentAudio.pause();
    _sheikCurrentAudio = null;
  }
  // إزالة تظليل كل الآيات
  document.querySelectorAll('.live-ayah-item').forEach(el => {
    el.classList.remove('ayah-active');
    const td = el.querySelector('.live-ayah-text');
    if (td) { td.style.backgroundColor = ''; td.style.color = ''; }
  });

  const btnStart = document.getElementById('btn-sheikh-start');
  const btnStop  = document.getElementById('btn-sheikh-stop');
  if (btnStart) btnStart.classList.remove('d-none');
  if (btnStop)  btnStop.classList.add('d-none');

  const statusEl = document.getElementById('sheikh-status');
  if (statusEl) statusEl.textContent = '';
};

function _playSheikhAyah(index) {
  if (!_sheikPlaybackActive) return;
  const ayahs = window._liveAyahsList;
  if (!ayahs || index >= ayahs.length) {
    // انتهى
    window.stopSheikhFollowAlong();
    const statusEl = document.getElementById('sheikh-status');
    if (statusEl) statusEl.innerHTML = '<span class="text-success fw-bold">✅ انتهت التلاوة</span>';
    return;
  }

  const ayah = ayahs[index];
  const audioUrl = `https://everyayah.com/data/Husary_128kbps/${ayah.surah}${ayah.ayah}.mp3`;

  // تظليل الآية الحالية وإزالة السابقة
  document.querySelectorAll('.live-ayah-item').forEach((el, i) => {
    const td = el.querySelector('.live-ayah-text');
    if (i === index) {
      el.classList.add('ayah-active');
      if (td) { td.classList.remove('blurred-text'); }
      // scroll للآية الحالية
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      el.classList.remove('ayah-active');
      if (td && document.getElementById('memorize-mode')?.checked && i > index) {
        td.classList.add('blurred-text');
      }
    }
  });

  const statusEl = document.getElementById('sheikh-status');
  if (statusEl) statusEl.innerHTML = `
    <span class="text-success small">
      <i class="fas fa-volume-up fa-pulse me-1"></i> الآية ${ayah.num} من ${ayahs.length}
    </span>`;

  _sheikCurrentAudio = new Audio(audioUrl);
  _sheikCurrentAudio.play().catch(() => {});

  // لما تخلص الآية روح للتالية
  _sheikCurrentAudio.onended = () => {
    if (!_sheikPlaybackActive) return;
    _sheikCurrentIndex = index + 1;
    // وقت الراحة بين الآيات من الـ slider
    const pauseSlider = document.getElementById('sheikh-pause-slider');
    const pauseMs = pauseSlider ? parseFloat(pauseSlider.value) * 1000 : 2000;
    setTimeout(() => _playSheikhAyah(_sheikCurrentIndex), pauseMs);
};

  _sheikCurrentAudio.onerror = () => {
    if (!_sheikPlaybackActive) return;
    _sheikCurrentIndex = index + 1;
    setTimeout(() => _playSheikhAyah(_sheikCurrentIndex), 300);
  };
}

// ─── 12. Memorize Mode Toggle ─────────────────────────────────────────────────
document.addEventListener('change', (e) => {
  if (e.target.id !== 'memorize-mode') return;
  if (isLiveTracking) {
    e.target.checked = !e.target.checked;
    showAlert('error', 'أوقف التسميع أولاً قبل تغيير وضع الحفظ');
    return;
  }
  const isBlur = e.target.checked;
  document.querySelectorAll('.live-ayah-item').forEach((el, idx) => {
    const td = el.querySelector('.live-ayah-text');
    if (!td) return;
    if (idx <= lastMatchedIndex) td.classList.remove('blurred-text');
    else if (isBlur) td.classList.add('blurred-text');
    else             td.classList.remove('blurred-text');
  });
});

// ─── 13. Global Click Listener (Bottom Sheet Logic) ──────────────────────────
let selectedVerseData = null; 

document.addEventListener('click', async (e) => {
  // 🌟 1. فتح القائمة السفلية عند الضغط على أي مكان في الآية
  const verseWrapper = e.target.closest('.verse-wrapper');
  if (verseWrapper) {
    e.preventDefault(); e.stopPropagation();
    
    // سحب بيانات الآية من الـ HTML
    const surah = verseWrapper.dataset.surah;
    const ayah = verseWrapper.dataset.ayah;
    const rawSurahName = verseWrapper.dataset.surahname || '';
    const isBookmarked = verseWrapper.dataset.bookmarked === 'true';
    
    // ✅ التعديل: تنظيف اسم السورة عشان كلمة "سورة" متتكررش
    const cleanSurahName = rawSurahName.replace(/سورة /g, '').replace(/سُورَةُ /g, '').trim();
    
    // تنظيف النص لتجهيزه للنسخ أو المشاركة
    const ayahEl = document.getElementById(`ayah-${surah}-${ayah}`);
    const text = ayahEl ? ayahEl.innerText.replace(/[۩]/g, '').replace(/[٠-٩0-9]/g, '').trim() : '';

    // حفظ البيانات بالاسم النظيف
    selectedVerseData = { surah, ayah, surahName: cleanSurahName, text, isBookmarked };

    // تحديث النصوص داخل القائمة السفلية (Bottom Sheet)
    const sheetLabel = document.getElementById('verseActionSheetLabel');
    if(sheetLabel) sheetLabel.innerText = `سورة ${cleanSurahName} - آية ${ayah}`;
    
    const bookmarkBtnText = document.getElementById('sheet-bookmark-text');
    const bookmarkIcon = document.getElementById('sheet-bookmark-icon');
    if (bookmarkBtnText && bookmarkIcon) {
        if (isBookmarked) {
            bookmarkBtnText.innerText = 'إزالة العلامة المرجعية';
            bookmarkIcon.className = 'fas fa-bookmark text-danger fa-fw';
        } else {
            bookmarkBtnText.innerText = 'حفظ كعلامة مرجعية';
            bookmarkIcon.className = 'far fa-bookmark text-warning fa-fw';
        }
    }

    // إظهار القائمة المنزلقة من الأسفل
    const sheetEl = document.getElementById('verseActionSheet');
    if (sheetEl) {
        const bsSheet = new bootstrap.Offcanvas(sheetEl);
        bsSheet.show();
    }
    return;
  }

  // 🌟 2. تنفيذ الأوامر عند الضغط على الأزرار داخل القائمة السفلية
  if (e.target.closest('.action-btn-tafseer')) {
    if (selectedVerseData) window.showTafseer(selectedVerseData.surah, selectedVerseData.ayah);
    return;
  }
   if (e.target.closest('.action-btn-nuzul')) {
    e.preventDefault();
    
    const sheetEl = document.getElementById('verseActionSheet');
    if (sheetEl) {
        const bsSheet = bootstrap.Offcanvas.getInstance(sheetEl) || new bootstrap.Offcanvas(sheetEl);
        bsSheet.hide();
    }

    setTimeout(() => {
        if (selectedVerseData && window.openAyahInsights) {
            window.openAyahInsights(selectedVerseData.surah, selectedVerseData.ayah);
        }
    }, 300);
    
    return;
  }
  
  if (e.target.closest('.action-btn-bookmark')) {
    if (!await isUserLoggedIn()) { requireLogin('استخدام العلامات المرجعية'); return; }
    if (selectedVerseData) {
        const dummyIcon = document.createElement('i');
        dummyIcon.className = selectedVerseData.isBookmarked ? 'fas' : 'far';
        await toggleBookmark(selectedVerseData.surah, selectedVerseData.ayah, dummyIcon);
        // تحديث الواجهة فوراً لتظهر/تختفي علامة الـ Bookmark الصغيرة
        setTimeout(() => window.loadQuranPage(window.currentPage), 400); 
    }
    return;
  }
  
  if (e.target.closest('.action-btn-khatmah')) {
    if (!await isUserLoggedIn()) { requireLogin('تتبع الختمة'); return; }
    if (selectedVerseData) {
        await updateKhatmahProgress(selectedVerseData.surah, selectedVerseData.ayah);
        setTimeout(() => window.loadQuranPage(window.currentPage), 400);
    }
    return;
  }
  
  if (e.target.closest('.action-btn-share')) {
    if (selectedVerseData) {
        shareAyah(selectedVerseData.text, selectedVerseData.surahName, selectedVerseData.ayah);
    }
    return;
  }

  if (e.target.closest('.action-btn-copy')) {
    if (selectedVerseData) {
        navigator.clipboard.writeText(`"${selectedVerseData.text}"\n[سورة ${selectedVerseData.surahName} - الآية ${selectedVerseData.ayah}]`).then(() => {
            Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'تم نسخ الآية بنجاح 📋', showConfirmButton: false, timer: 2000 });
        });
    }
    return;
  }

  // 🌟 3. زر حذف العلامة من صفحة (العلامات المرجعية)
  const deleteBookmarkBtn = e.target.closest('.delete-bookmark-btn');
  if (deleteBookmarkBtn) {
    e.preventDefault(); e.stopPropagation();
    const id = deleteBookmarkBtn.dataset.id;
    if (id) await deleteBookmark(id);
    return;
  }
});
// ─── 14. Swipe ────────────────────────────────────────────────────────────────
let touchstartX = 0, touchstartY = 0, startTime = 0;
document.addEventListener('touchstart', e => {
  const qs = document.getElementById('quran-section');
  if (qs && !qs.classList.contains('d-none')) {
    const touchObj = e.changedTouches[0];
    touchstartX = touchObj.screenX; touchstartY = touchObj.screenY;
    startTime = new Date().getTime(); 
  }
}, { passive: true });

document.addEventListener('touchend', e => {
  const qs = document.getElementById('quran-section');
  if (!qs || qs.classList.contains('d-none')) return;
  const touchObj = e.changedTouches[0];
  const distX = touchObj.screenX - touchstartX;
  const distY = touchObj.screenY - touchstartY;
  const elapsedTime = new Date().getTime() - startTime;
  if (elapsedTime <= 400) {
    if (Math.abs(distX) >= 90 && Math.abs(distY) <= 60) {
      if (distX > 0) document.getElementById('btn-prev-page')?.click();
      else           document.getElementById('btn-next-page')?.click();
    }
  }
}, { passive: true });

// ══════════════════════════════════════════════════════════════════════════════
// ─── وضع القراءة الليلية 🌙 ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
let _nightModeActive = localStorage.getItem('aqra_night_mode') === '1';

function _applyNightMode(active) {
  if (active) {
    document.body.setAttribute('data-reading', 'night');
    // تطبيق الخلفية الداكنة على كل الصفحة
    document.documentElement.style.setProperty('background-color', '#0d1b0f', 'important');
  } else {
    document.body.removeAttribute('data-reading');
    document.documentElement.style.removeProperty('background-color');
  }
  const btn = document.getElementById('btn-night-mode');
  if (btn) {
    if (active) {
      btn.classList.add('active');
      btn.innerHTML = '<i class="fas fa-sun me-1"></i> نهاري';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fas fa-moon me-1"></i> ليلي';
    }
  }
}

window.toggleNightMode = function() {
  _nightModeActive = !_nightModeActive;
  localStorage.setItem('aqra_night_mode', _nightModeActive ? '1' : '0');
  _applyNightMode(_nightModeActive);
};

// تطبيق عند التحميل
if (_nightModeActive) _applyNightMode(true);

// ══════════════════════════════════════════════════════════════════════════════
// ─── إحصائيات القراءة 📊 ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const STATS_KEY = 'aqra_reading_stats'; // { "2025-01-15": 5, "2025-01-16": 3, ... }

function _getTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function _getStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || {}; }
  catch { return {}; }
}

function _saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// تسجيل صفحة مقروءة
function _recordPageRead() {
  const stats = _getStats();
  const today = _getTodayKey();
  stats[today] = (stats[today] || 0) + 1;
  _saveStats(stats);
  // تحديث الكارت في الهوم
  const el = document.getElementById('home-stats-today');
  if (el) el.textContent = stats[today] + ' صفحة اليوم';
}

// حساب الإحصائيات
function _calcStats() {
  const stats  = _getStats();
  const today  = new Date();
  const todayK = _getTodayKey();

  // اليوم
  const todayCount = stats[todayK] || 0;

  // الأسبوع (آخر 7 أيام)
  let weekCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    weekCount += stats[d.toISOString().slice(0, 10)] || 0;
  }

  // الشهر (آخر 30 يوم)
  let monthCount = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    monthCount += stats[d.toISOString().slice(0, 10)] || 0;
  }

  // الإجمالي
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  // أفضل يوم
  const best = Object.values(stats).length ? Math.max(...Object.values(stats)) : 0;

  // أيام متتالية (streak)
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    if ((stats[d.toISOString().slice(0, 10)] || 0) > 0) streak++;
    else break;
  }

  // آخر 7 أيام للرسم البياني
  const last7 = [];
  const last7Labels = [];
  const days = ['أحد','اثن','ثلا','أرب','خمي','جمع','سبت'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    last7.push(stats[d.toISOString().slice(0, 10)] || 0);
    last7Labels.push(days[d.getDay()]);
  }

  return { todayCount, weekCount, monthCount, total, best, streak, last7, last7Labels };
}

// رسم الإحصائيات في الصفحة
function _renderStats() {
  const s = _calcStats();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-today',  s.todayCount);
  set('stat-week',   s.weekCount);
  set('stat-month',  s.monthCount);
  set('stat-total',  s.total);
  set('stat-streak', s.streak);
  set('stat-best',   s.best);

  const pct = Math.round((s.total / 604) * 100);
  const totalPct = document.getElementById('stat-total-pct');
  if (totalPct) totalPct.textContent = `${pct}% من المصحف الكريم`;

  // كارت الهوم
  const homeEl = document.getElementById('home-stats-today');
  if (homeEl) homeEl.textContent = s.todayCount + ' صفحة اليوم';

  // الرسم البياني
  const chart  = document.getElementById('stats-chart');
  const labels = document.getElementById('stats-chart-labels');
  if (!chart || !labels) return;

  const maxVal = Math.max(...s.last7, 1);
  chart.innerHTML  = '';
  labels.innerHTML = '';

  s.last7.forEach((val, i) => {
    const isToday = i === 6;
    const heightPct = Math.round((val / maxVal) * 100);
    const barH = Math.max(heightPct, val > 0 ? 8 : 3);

    const bar = document.createElement('div');
    bar.style.cssText = `
      flex:1; border-radius:6px 6px 0 0;
      height:${barH}%; min-height:${val > 0 ? 6 : 2}px;
      background:${isToday ? 'linear-gradient(to top,#1e5f31,#4caf50)' : (val > 0 ? '#a5d6a7' : '#e8f5e9')};
      transition: height 0.4s ease;
      position:relative; cursor:default;
    `;
    if (val > 0) {
      bar.title = `${s.last7Labels[i]}: ${val} صفحة`;
      // رقم فوق البار
      const num = document.createElement('span');
      num.style.cssText = 'position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:0.65rem;color:#555;white-space:nowrap;';
      num.textContent = val;
      bar.appendChild(num);
    }
    chart.appendChild(bar);

    const lbl = document.createElement('div');
    lbl.style.cssText = `flex:1;text-align:center;font-size:0.65rem;color:${isToday ? '#198754' : '#999'};font-weight:${isToday ? 'bold' : 'normal'};`;
    lbl.textContent = s.last7Labels[i];
    labels.appendChild(lbl);
  });
}

// hook على loadQuranPage لتسجيل الصفحات
const _origLoadForStats = window.loadQuranPage;
if (_origLoadForStats) {
  window.loadQuranPage = async function(...args) {
    const res = await _origLoadForStats.apply(this, args);
    _recordPageRead();
    return res;
  };
}

window._renderStats = _renderStats;

// ══════════════════════════════════════════════════════════════════════════════
// ─── Quran Zoom ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const ZOOM_STEPS  = [0.65, 0.75, 0.85, 1.0, 1.1, 1.2, 1.35, 1.5, 1.7, 2.0];
const ZOOM_LABELS = ['65%','75%','85%','100%','110%','120%','135%','150%','170%','200%'];
let   _zoomIndex  = 3;

function _applyZoom() {
  const scale = ZOOM_STEPS[_zoomIndex];
  const book  = document.getElementById('quran-book');
  if (book) {
    book.style.zoom         = scale;
    book.style.transform    = '';
    book.style.marginBottom = '';
    const parent = book.parentElement;
    if (parent) parent.style.paddingBottom = '';
  }
  const lbl = document.getElementById('zoom-label');
  if (lbl) lbl.textContent = ZOOM_LABELS[_zoomIndex];
}

window.quranZoom = function(direction) {
  _zoomIndex = Math.max(0, Math.min(ZOOM_STEPS.length - 1, _zoomIndex + direction));
  _applyZoom();
  localStorage.setItem('aqra_quran_zoom', _zoomIndex);
};

window.quranZoomReset = function() {
  _zoomIndex = 3;
  _applyZoom();
  localStorage.removeItem('aqra_quran_zoom');
};

// hook على loadQuranPage لإعادة تطبيق الـ zoom
const _origLoadForZoom = window.loadQuranPage;
if (_origLoadForZoom) {
  window.loadQuranPage = async function(...args) {
    const res = await _origLoadForZoom.apply(this, args);
    setTimeout(_applyZoom, 80);
    return res;
  };
}

// استعادة الـ zoom المحفوظ
(function() {
  const saved = localStorage.getItem('aqra_quran_zoom');
  if (saved !== null) {
    _zoomIndex = Math.min(Math.max(parseInt(saved), 0), ZOOM_STEPS.length - 1);
    const lbl  = document.getElementById('zoom-label');
    if (lbl) lbl.textContent = ZOOM_LABELS[_zoomIndex];
  }
})();


// ─── Auto Scroll (Pro Version) 
let _autoScrollReq = null; 
let _scrollSpeedLevel = 2; 

const SCROLL_SPEEDS = [
  null,
  0.5, 
  1,   
  1.5, 
  2,   
  3,   
  5,   
  7,   
  10,  
  15   
];

function _isOnQuranPage() {
  const qs = document.getElementById('quran-section');
  return qs && !qs.classList.contains('d-none');
}

window.toggleAutoScroll = function() {
  _autoScrollReq ? _stopAutoScroll() : _startAutoScroll();
};

function _startAutoScroll() {
  if (!_isOnQuranPage()) return;
  const btn = document.getElementById('btn-autoscroll');
  const ctl = document.getElementById('autoscroll-controls');
  const fab = document.getElementById('autoscroll-fab');
  
  if (btn) { btn.classList.add('active'); btn.innerHTML = '<i class="fas fa-pause me-1"></i> إيقاف'; }
  if (ctl) ctl.classList.replace('d-none', 'd-flex');
  if (fab) fab.classList.add('visible');
  
  const lbl = document.getElementById('scroll-speed-label');
  if (lbl) lbl.textContent = _scrollSpeedLevel;

  _runScrollLoop();
}

function _stopAutoScroll() {
  if (_autoScrollReq) { cancelAnimationFrame(_autoScrollReq); _autoScrollReq = null; }
  const btn = document.getElementById('btn-autoscroll');
  const ctl = document.getElementById('autoscroll-controls');
  const fab = document.getElementById('autoscroll-fab');
  
  if (btn) { btn.classList.remove('active'); btn.innerHTML = '<i class="fas fa-scroll me-1"></i> تمرير تلقائي'; }
  if (ctl) ctl.classList.replace('d-flex', 'd-none');
  if (fab) fab.classList.remove('visible');
}

function _runScrollLoop() {
  if (!_isOnQuranPage()) { _stopAutoScroll(); return; }

  const step = SCROLL_SPEEDS[_scrollSpeedLevel] || 2;
  const maxY = document.body.scrollHeight - window.innerHeight;

  if (window.scrollY >= maxY - 2) {
    _stopAutoScroll();
    if (window.currentPage < 604) {
      document.getElementById('btn-prev-page')?.click();
      setTimeout(() => {
        if (_isOnQuranPage()) {
          window.scrollTo({ top: 0, behavior: 'instant' });
          _startAutoScroll();
        }
      }, 700); 
    }
  } else {
    window.scrollBy({ top: step, left: 0, behavior: 'instant' });
    
    _autoScrollReq = requestAnimationFrame(_runScrollLoop);
  }
}

window.changeScrollSpeed = function(dir) {
  _scrollSpeedLevel = Math.max(1, Math.min(9, _scrollSpeedLevel + dir));
  const lbl = document.getElementById('scroll-speed-label');
  if (lbl) lbl.textContent = _scrollSpeedLevel;
};

function _pauseAutoScrollOnManualNav() { if (_autoScrollReq) _stopAutoScroll(); }
// ─── 15. Nav Buttons 
document.getElementById('btn-prev-page')?.addEventListener('click', () => {
  _pauseAutoScrollOnManualNav();
  if (window.currentPage < 604) {
    window.currentPage++;
    window.loadQuranPage(window.currentPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    prefetchPage(window.currentPage + 1);
    prefetchPage(window.currentPage + 2);
  }
});
document.getElementById('btn-next-page')?.addEventListener('click', () => {
  _pauseAutoScrollOnManualNav();
  if (window.currentPage > 1) {
    window.currentPage--;
    window.loadQuranPage(window.currentPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    prefetchPage(window.currentPage - 1);
    prefetchPage(window.currentPage - 2);
  }
});

// ─── 16. Popstate ─────────────────────────────────────────────────────────────
window.addEventListener('popstate', (event) => {
  stopAllMedia();
  const path = window.location.pathname;
  // إظهار القسم بناءً على الـ state المحفوظ أولاً
  if (event.state?.section) {
    document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
    document.getElementById(`${event.state.section}-section`)?.classList.remove('d-none');
  } else if (path === '/' || path === '/index.html') {
    document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
    const homeSection = document.getElementById('home-section');
    if (homeSection) homeSection.classList.remove('d-none');
  }
});

// ─── 13. Global Listeners (Smart Navigation) ──────────────────────────────────
document.body.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;

  const href = link.getAttribute('href');
  
  // تجاهل الروابط الخارجية أو الفارغة
  if (!href || href.startsWith('http') || href === '#') return;

  // خريطة التوجيه (Route Map) 
  const routeMap = {
    '/':              'home',
    '/index.html':    'home',
    '/signup':        'signup',
    '/login':         'login',
    '/forgot-password': 'forgot-password', 
    '/reciters':      'reciters',
    '/bookmarks':     'bookmarks',
    '/my-bookmarks':  'bookmarks',
    '/khatmah':       'khatmah',
    '/profile':       'profile',
    '/live-recitation': 'live-recitation',
    '/ai-correction': 'ai-correction',
    '/surah-index':   'surah-index',
    '/admin':         'admin',
    '/radio':         'radio',
  };

  // التعامل مع روابط المصحف الديناميكية (/quran أو /quran/50)
  if (href.startsWith('/quran')) {
     e.preventDefault();
     window.showSection('surah-index');
     window.loadSurahIndex();
     return;
  }

  // التعامل مع باقي الروابط في الخريطة
  if (href.startsWith('/')) {
    const cleanHref = href.replace(/\/$/, ''); // إزالة الشرطة الأخيرة إن وجدت
    const section = routeMap[cleanHref];

    if (section) {
      e.preventDefault();
      
      // منطق خاص لبعض الأقسام لضمان تحميل البيانات
      if (section === 'reciters') {
         window.showSection('reciters');
         if (window.loadReciters) window.loadReciters();
      } 
      else if (section === 'bookmarks') {
         window.showSection('bookmarks');
         if (window.loadBookmarks) window.loadBookmarks();
      }
      else {
         window.showSection(section);
      }
    }
  }
});

// ─── 1. Native Init & Cache Management ─────────────────────────────────────────
const initNativeFeatures = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const isDark = localStorage.getItem('theme') === 'dark';
    await StatusBar.setOverlaysWebView({ overlay: true });
    if (isDark) {
        await StatusBar.setBackgroundColor({ color: '#1e5f31' });
        await StatusBar.setStyle({ style: Style.Dark });
    } else {
        await StatusBar.setBackgroundColor({ color: '#1e5f31' }); 
        await StatusBar.setStyle({ style: Style.Dark }); 
    }

    // 🧹 [مسح الكاش الذكي عند التحديث فقط]
    const savedVersion = localStorage.getItem('app_version');
    const appInfo = await App.getInfo();
    const currentVersion = appInfo.version;

    if (savedVersion && savedVersion !== currentVersion) {
      console.log(`🔄 [UPDATE] تم تحديث التطبيق إلى ${currentVersion} — جاري مسح الكاش القديم`);
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let r of regs) await r.unregister();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (let k of keys) {
          if (k !== 'quran-audio-cache-v1') { 
            await caches.delete(k);
          }
        }
      }
    }
    localStorage.setItem('app_version', currentVersion);

    // 🔔 إعدادات الإشعارات ويوم الجمعة
    await LocalNotifications.cancel({ notifications: [{ id: 101 }] });
    await App.removeAllListeners();
    await App.addListener('backButton', ({ canGoBack }) => {
      
      // 1. هل في رسالة تنبيه (SweetAlert) مفتوحة؟ نقفلها
      if (typeof Swal !== 'undefined' && Swal.isVisible()) {
        Swal.close();
        return; 
      }

      // 2. هل في نافذة (Modal) زي "الإضاءات" أو التحديثات مفتوحة؟ نقفلها
      const openModal = document.querySelector('.modal.show');
      if (openModal) {
        const modalInstance = bootstrap.Modal.getInstance(openModal);
        if (modalInstance) modalInstance.hide();
        return;
      }

      // 3. هل في القائمة السفلية (Bottom Sheet) بتاعة الآيات مفتوحة؟ نقفلها
      const openOffcanvas = document.querySelector('.offcanvas.show');
      if (openOffcanvas) {
        const offcanvasInstance = bootstrap.Offcanvas.getInstance(openOffcanvas);
        if (offcanvasInstance) offcanvasInstance.hide();
        return;
      }

      // 4. لو مفيش أي نوافذ مفتوحة، نفذ سلوك الرجوع الطبيعي
      const home = document.getElementById('home-section');
      if (home && !home.classList.contains('d-none')) {
        stopAllMedia();
        canGoBack ? window.history.back() : App.exitApp();
      } else {
        if (canGoBack) window.history.back();
        else { stopAllMedia(); window.showSection('home'); }
      }
    });

    // ✅ التقاط الرابط لو المستخدم فتح التطبيق من الإيميل
   await App.addListener('appUrlOpen', ({ url }) => {
      try {
        const urlObj = new URL(url);
        if (urlObj.pathname === '/resetPassword' || urlObj.pathname === '/reset-password.html') {
                window.showSection('reset-password');
        }
      } catch (e) { console.warn('Deep link error:', e); }
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (notif) => {
      if (notif.notification.actionTypeId === 'OPEN_KAHF') {
        window.showSection('quran');
        window.loadQuranPage(293);
      }
    });

    const notifs = await LocalNotifications.requestPermissions();
    if (notifs.display === 'granted') {
      await LocalNotifications.createChannel({ id: 'azan-channel', name: 'تنبيهات الصلاة', importance: 5, sound: 'azan_short.mp3', visibility: 1, vibration: true });
      await LocalNotifications.createChannel({ id: 'khatmah-channel', name: 'تنبيهات الورد', importance: 4, visibility: 1, vibration: true });
      
      // ✅ الحفاظ على تنبيه سورة الكهف
      await scheduleFridayKahfNotification();
        await scheduleDuhaNotification();
     console.log('✅ [NOTIFICATIONS] تم جدولة تنبيهات سورة الكهف وصلاة الضحى بنجاح');
    }
    try { await Geolocation.requestPermissions(); } catch (e) { console.log('Geo permission:', e); }
  } catch (err) { console.error('Native Init Error:', err); }
};

// ─── 2. Update Checker 🔄 ────────────────────────────────────────────────────────
const checkForUpdates = async () => {
  if (!Capacitor.isNativePlatform() || !navigator.onLine) return;

  try {
    const appInfo = await App.getInfo();
    const currentBuild = parseInt(appInfo.build); 

    const res  = await fetch('https://aqraapp.com/version.json?t=' + Date.now());
    const data = await res.json();
    const serverBuild = parseInt(data.versionCode);

    if (serverBuild <= currentBuild) return; // التطبيق محدث بالفعل

    const isForce = data.forceUpdate;
    const modalHtml = `
      <div class="modal fade" id="modal-update" tabindex="-1" data-bs-backdrop="${isForce ? 'static' : 'true'}" dir="rtl">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg" style="border-radius:20px;overflow:hidden;background:#ffffff !important;font-family:'Amiri',sans-serif;">
            <div style="background:linear-gradient(135deg,#1e5f31,#198754);padding:28px 24px 20px;text-align:center;color:white;">
              <div style="width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">
                <i class="fas fa-rocket" style="font-size:1.8rem;"></i>
              </div>
              <h5 class="fw-bold mb-1" style="font-size:1.3rem;color:#fff !important;">تحديث جديد متاح! 🎉</h5>
              <p class="mb-0" style="font-size:0.9rem;color:#e8f5e9 !important;">الإصدار ${data.version} جاهز للتحميل</p>
            </div>
            <div class="modal-body p-4" style="background:#ffffff !important;">
              <div style="border-radius:12px;background:#f1f8e9 !important;border:1px solid #c8e6c9;padding:14px 16px;margin-bottom:16px;">
                <div class="fw-bold mb-1" style="font-size:0.9rem;color:#1e5f31 !important;"><i class="fas fa-list-check me-1"></i> ما الجديد؟</div>
                <div style="font-size:0.9rem;color:#333 !important;line-height:1.8;">${data.releaseNotes}</div>
              </div>
              ${isForce ? `<div style="border-radius:12px;background:#fff3e0 !important;border:1px solid #ffcc80;padding:12px 16px;text-align:center;"><span style="font-size:0.85rem;color:#e65100 !important;font-weight:600;">⚠️ هذا التحديث إجباري ويجب التحديث للمتابعة</span></div>` : ''}
            </div>
            <div class="modal-footer border-0 pb-4 pt-0 d-flex flex-column gap-2 px-4" style="background:#ffffff !important;">
              <button id="btn-do-update" class="btn w-100 py-3 fw-bold text-white" style="border-radius:12px;background:#198754 !important;font-size:1rem;border:none;">
                <i class="fas fa-download me-2"></i> حدّث الآن
              </button>
              ${!isForce ? `<button class="btn w-100 py-2 fw-semibold" data-bs-dismiss="modal" style="border-radius:12px;background:#eeeeee !important;color:#555 !important;border:none;">لاحقاً</button>` : ''}
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('modal-update')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('modal-update'));
    modal.show();

    document.getElementById('btn-do-update').addEventListener('click', async () => {
      try { await Browser.open({ url: data.downloadUrl, presentationStyle: 'popover' }); } 
      catch { window.open(data.downloadUrl, '_system'); }
    });

  } catch (err) { console.warn('Update check failed:', err); }
};

const scheduleWebFridayReminder = () => {
  const now = new Date();
  const isFriday = now.getDay() === 5;
  const hour = now.getHours();

  if (isFriday && hour < 12) {
    const lastShown = localStorage.getItem('kahf_reminder_shown');
    const today     = now.toDateString();

    if (lastShown !== today) {
      setTimeout(() => {
        Swal.fire({
          title: '📖 يوم الجمعة المبارك',
          html: `
            <div style="font-family:'Amiri'; direction:rtl; text-align:right;">
              <p style="font-size:1.1rem; line-height:1.8;">
                <strong>من قرأ سورة الكهف يوم الجمعة أضاء له النور ما بين الجمعتين</strong>
              </p>
              <p class="text-muted small">رواه البيهقي والحاكم</p>
            </div>`,
          confirmButtonText: '📖 اقرأ سورة الكهف الآن',
          cancelButtonText:  'لاحقاً',
          showCancelButton:   true,
          confirmButtonColor: '#198754',
          cancelButtonColor:  '#6c757d',
          imageUrl: null,
        }).then(result => {
          if (result.isConfirmed) {
            // سورة الكهف رقم 18 - الصفحة 293
            window.showSection('quran');
            window.loadQuranPage(293);
          }
        });
        localStorage.setItem('kahf_reminder_shown', today);
      }, 5000);
    }
  }
};

// ─── منطق آية اليوم ──────────────────────────────
const dailyAyahs = [
    // 🌸 آيات الطمأنينة والتفاؤل (تريند السوشيال ميديا)
    { text: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا * إِنَّ مَعَ الْعُسْرِ يُسْرًا", surah: "الشرح", number: "5-6" },
    { text: "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ", surah: "الضحى", number: "5" },
    { text: "وَاصْبِرْ لِحُكْمِ رَبِّكَ فَإِنَّكَ بِأَعْيُنِنَا", surah: "الطور", number: "48" },
    { text: "لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا", surah: "التوبة", number: "40" },
    { text: "فَاسْتَجَبْنَا لَهُ وَنَجَّيْنَاهُ مِنَ الْغَمِّ ۚ وَكَذَٰلِكَ نُنجِي الْمُؤْمِنِينَ", surah: "الأنبياء", number: "88" },
    { text: "سَيَجْعَلُ اللَّهُ بَعْدَ عُسْرٍ يُسْرًا", surah: "الطلاق", number: "7" },
    { text: "قَالَ لَا تَخَافَا ۖ إِنَّنِي مَعَكُمَا أَسْمَعُ وَأَرَىٰ", surah: "طه", number: "46" },
    { text: "وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ", surah: "يوسف", number: "87" },
    { text: "إِنَّمَا أَشْكُو بَثِّي وَحُزْنِي إِلَى اللَّهِ", surah: "يوسف", number: "86" },
    { text: "فَصَبْرٌ جَمِيلٌ ۖ وَاللَّهُ الْمُسْتَعَانُ", surah: "يوسف", number: "18" },
    { text: "وَهُوَ الَّذِي يُنَزِّلُ الْغَيْثَ مِن بَعْدِ مَا قَنَطُوا وَيَنشُرُ رَحْمَتَهُ", surah: "الشورى", number: "28" },

    // 🤲 آيات الدعاء والاستجابة
    { text: "وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ", surah: "غافر", number: "60" },
    { text: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ", surah: "البقرة", number: "186" },
    { text: "أَمَّن يُجِيبُ الْمُضْطَرَّ إِذَا دَعَاهُ وَيَكْشِفُ السُّوءَ", surah: "النمل", number: "62" },
    { text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", surah: "البقرة", number: "201" },

    // 🛡️ آيات التوكل واليقين
    { text: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا * وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ", surah: "الطلاق", number: "2-3" },
    { text: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", surah: "الطلاق", number: "3" },
    { text: "وَأُفَوِّضُ أَمْرِي إِلَى اللَّهِ ۚ إِنَّ اللَّهَ بَصِيرٌ بِالْعِبَادِ", surah: "غافر", number: "44" },
    { text: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", surah: "آل عمران", number: "173" },
    { text: "وَتَوَكَّلْ عَلَى الْحَيِّ الَّذِي لَا يَمُوتُ", surah: "الفرقان", number: "58" },
    { text: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", surah: "البقرة", number: "286" },

    // 💡 آيات الإرشادات والأخلاق (التعامل مع الناس)
    { text: "وَقُولُوا لِلنَّاسِ حُسْنًا", surah: "البقرة", number: "83" },
    { text: "خُذِ الْعَفْوَ وَأْمُرْ بِالْعُرْفِ وَأَعْرِضْ عَنِ الْجَاهِلِينَ", surah: "الأعراف", number: "199" },
    { text: "ادْفَعْ بِالَّتِي هِيَ أَحْسَنُ فَإِذَا الَّذِي بَيْنَكَ وَبَيْنَهُ عَدَاوَةٌ كَأَنَّهُ وَلِيٌّ حَمِيمٌ", surah: "فصلت", number: "34" },
    { text: "وَعِبَادُ الرَّحْمَٰنِ الَّذِينَ يَمْشُونَ عَلَى الْأَرْضِ هَوْنًا وَإِذَا خَاطَبَهُمُ الْجَاهِلُونَ قَالُوا سَلَامًا", surah: "الفرقان", number: "63" },
    { text: "يَا أَيُّهَا الَّذِينَ آمَنُوا اجْتَنِبُوا كَثِيرًا مِّنَ الظَّنِّ إِنَّ بَعْضَ الظَّنِّ إِثْمٌ", surah: "الحجرات", number: "12" },
    { text: "وَلَا تُصَعِّرْ خَدَّكَ لِلنَّاسِ وَلَا تَمْشِ فِي الْأَرْضِ مَرَحًا", surah: "لقمان", number: "18" },

    // 💖 آيات الرحمة والمغفرة والذكر
    { text: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ", surah: "الزمر", number: "53" },
    { text: "وَمَا كَانَ اللَّهُ مُعَذِّبَهُمْ وَهُمْ يَسْتَغْفِرُونَ", surah: "الأنفال", number: "33" },
    { text: "وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ", surah: "الأعراف", number: "156" },
    { text: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", surah: "الرعد", number: "28" },
    { text: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ", surah: "البقرة", number: "152" },
    { text: "إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا", surah: "الأحزاب", number: "56" }
];

const dailyAhadith = [
    // 📚 أحاديث من المتفق عليه (رواه البخاري ومسلم)
    { text: "« كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ »", source: "متفق عليه" },
    { text: "« إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى »", source: "متفق عليه" },
    { text: "« الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ »", source: "متفق عليه" },
    { text: "« لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ »", source: "متفق عليه" },
    { text: "« الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ »", source: "متفق عليه" },
    { text: "« مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ »", source: "متفق عليه" },
    { text: "« مَنْ لَا يَرْحَمُ لَا يُرْحَمُ »", source: "متفق عليه" },
    { text: "« يَسِّرُوا وَلَا تُعَسِّرُوا، وَبَشِّرُوا وَلَا تُنَفِّرُوا »", source: "متفق عليه" },
    { text: "« أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ »", source: "متفق عليه" },
    { text: "« مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ »", source: "متفق عليه" },
    { text: "« إِنَّ الصِّدْقَ يَهْدِي إِلَى الْبِرِّ، وَإِنَّ الْبِرَّ يَهْدِي إِلَى الْجَنَّةِ »", source: "متفق عليه" },
    { text: "« سِبَابُ الْمُسْلِمِ فُسُوقٌ، وَقِتَالُهُ كُفْرٌ »", source: "متفق عليه" },

    // 📘 أحاديث صحيحة من صحيح البخاري
    { text: "« خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ »", source: "رواه البخاري" },
    { text: "« لَيْسَ الشَّدِيدُ بِالصُّرْعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ »", source: "رواه البخاري" },

    // 📗 أحاديث صحيحة من صحيح مسلم
    { text: "« مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا »", source: "رواه مسلم" },
    { text: "« الدِّينُ النَّصِيحَةُ »", source: "رواه مسلم" },
    { text: "« مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا، سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ »", source: "رواه مسلم" },
    { text: "« الْبِرُّ حُسْنُ الْخُلُقِ »", source: "رواه مسلم" },
    { text: "« لَا تَحْقِرَنَّ مِنَ الْمَعْرُوفِ شَيْئًا، وَلَوْ أَنْ تَلْقَى أَخَاكَ بِوَجْهٍ طَلْقٍ »", source: "رواه مسلم" },
    { text: "« عَجَبًا لِأَمْرِ الْمُؤْمِنِ إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ »", source: "رواه مسلم" },
    { text: "« مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا، نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ »", source: "رواه مسلم" },
    { text: "« إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ »", source: "رواه مسلم" },
    { text: "« مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ، وَمَا زَادَ اللَّهُ عَبْدًا بِعَفْوٍ إِلَّا عِزًّا »", source: "رواه مسلم" },
    { text: "« اقْرَءُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ »", source: "رواه مسلم" },
    { text: "« الدَّالُّ عَلَى الْخَيْرِ كَفَاعِلِهِ »", source: "رواه مسلم" },
    { text: "« لَا يَدْخُلُ الْجَنَّةَ مَنْ كَانَ فِي قَلْبِهِ مِثْقَالُ ذَرَّةٍ مِنْ كِبْرٍ »", source: "رواه مسلم" },
    { text: "« رَكْعَتَا الْفَجْرِ خَيْرٌ مِنَ الدُّنْيَا وَمَا فِيهَا »", source: "رواه مسلم" },
    { text: "« الطُّهُورُ شَطْرُ الْإِيمَانِ، وَالْحَمْدُ لِلَّهِ تَمْلَأُ الْمِيزَانَ »", source: "رواه مسلم" },

    // 📙 أحاديث صحيحة وحسنة من السنن (الترمذي وأبو داود)
    { text: "« رِضَا الرَّبِّ فِي رِضَا الْوَالِدِ، وَسَخَطُ الرَّبِّ فِي سَخَطِ الْوَالِدِ »", source: "رواه الترمذي وصححه الألباني" },
    { text: "« تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ »", source: "رواه الترمذي وصححه الألباني" },
    { text: "« مِنْ حُسْنِ إِسْلَامِ الْمَرْءِ تَرْكُهُ مَا لَا يَعْنِيهِ »", source: "رواه الترمذي وحسنه الألباني" },
    { text: "« مَنْ صَمَتَ نَجَا »", source: "رواه الترمذي وصححه الألباني" },
    { text: "« اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ »", source: "رواه الترمذي وقال حسن صحيح" },
    { text: "« إِنَّ مِنْ أَحَبِّكُمْ إِلَيَّ وَأَقْرَبِكُمْ مِنِّي مَجْلِسًا يَوْمَ الْقِيَامَةِ أَحَاسِنَكُمْ أَخْلَاقًا »", source: "رواه الترمذي وصححه الألباني" },
    { text: "« بَشِّرِ الْمَشَّائِينَ فِي الظُّلَمِ إِلَى الْمَسَاجِدِ بِالنُّورِ التَّامِّ يَوْمَ الْقِيَامَةِ »", source: "رواه أبو داود وصححه الألباني" }
];
function loadDailyContent() {
    const now = new Date();
    const localTimestamp = now.getTime() - (now.getTimezoneOffset() * 60000);
    const dayOfEpoch = Math.floor(localTimestamp / (1000 * 60 * 60 * 24));
    
    // تحميل الآية
    const ayahIndex = dayOfEpoch % dailyAyahs.length;
    const selectedAyah = dailyAyahs[ayahIndex];
    const ayahTextEl = document.getElementById('daily-ayah-text');
    const ayahSourceEl = document.getElementById('daily-ayah-source');
    if (ayahTextEl && ayahSourceEl) {
        ayahTextEl.innerText = selectedAyah.text;
        ayahSourceEl.innerText = `سورة ${selectedAyah.surah} - الآية ${selectedAyah.number}`;
    }

    // تحميل الحديث
    const hadithIndex = dayOfEpoch % dailyAhadith.length;
    const selectedHadith = dailyAhadith[hadithIndex];
    const hadithTextEl = document.getElementById('daily-hadith-text');
    const hadithSourceEl = document.getElementById('daily-hadith-source');
    if (hadithTextEl && hadithSourceEl) {
        hadithTextEl.innerText = selectedHadith.text;
        hadithSourceEl.innerText = selectedHadith.source;
    }
}

window.toggleDailyCard = function(type) {
    const ayahContent = document.getElementById('daily-ayah-content');
    const hadithContent = document.getElementById('daily-hadith-content');
    const btnAyah = document.getElementById('btn-show-ayah');
    const btnHadith = document.getElementById('btn-show-hadith');

    if (type === 'ayah') {
        ayahContent.classList.remove('d-none');
        hadithContent.classList.add('d-none');
        btnAyah.classList.add('active-toggle-btn');
        btnAyah.classList.remove('text-muted');
        btnHadith.classList.remove('active-toggle-btn');
        btnHadith.classList.add('text-muted');
    } else {
        ayahContent.classList.add('d-none');
        hadithContent.classList.remove('d-none');
        btnHadith.classList.add('active-toggle-btn');
        btnHadith.classList.remove('text-muted');
        btnAyah.classList.remove('active-toggle-btn');
        btnAyah.classList.add('text-muted');
    }
};

window.shareDailyContent = async function() {
    if (typeof html2canvas === 'undefined') {
        Swal.fire({ icon: 'error', title: 'عفواً', text: 'مكتبة الصور غير محملة.' });
        return;
    }

    const isAyah = !document.getElementById('daily-ayah-content').classList.contains('d-none');
    const textId = isAyah ? 'daily-ayah-text' : 'daily-hadith-text';
    const sourceId = isAyah ? 'daily-ayah-source' : 'daily-hadith-source';
    
    const textToShare = document.getElementById(textId).innerText;
    const sourceToShare = document.getElementById(sourceId).innerText;
    const shareMessage = `"${textToShare}"\n\n[ ${sourceToShare} ]\n\n✨ تمت المشاركة عبر تطبيق اقرأ`;

    const card = document.createElement('div');
    card.style.cssText = `
        width: 1080px; 
        padding: 100px 80px; 
        background: linear-gradient(135deg, #ffffff 0%, #f1f8e9 100%); 
        border-bottom: 25px solid #198754; 
        text-align: center; 
        direction: rtl; 
        font-family: 'Amiri', serif; 
        position: fixed; 
        left: -9999px; 
        top: 0;
    `;
    
    card.innerHTML = `
        <div style="display: inline-block; background: rgba(25,135,84,0.1); color: #198754; padding: 15px 45px; border-radius: 50px; border: 2px solid rgba(25,135,84,0.2); font-size: 2.2rem; font-weight: bold; margin-bottom: 60px;">
            <span style="color: #ffc107; margin-left: 15px;">★</span> ${isAyah ? 'آية اليوم' : 'حديث اليوم'}
        </div>
        
        <h1 style="font-family: 'Amiri Quran', 'Amiri', serif; font-size: 4.5rem; line-height: 1.9; color: #1e5f31; font-weight: bold; margin-bottom: 60px;">
            ${textToShare}
        </h1>
        
        <div style="display: inline-block; background: #ffffff; border: 3px solid #c8e6c9; color: #2e7d32; padding: 20px 60px; border-radius: 60px; font-size: 2.5rem; font-weight: bold;">
            ${sourceToShare}
        </div>

        <div style="margin-top: 80px; padding-top: 40px; border-top: 4px dashed #dee2e6; color: #6c757d; font-size: 2rem; font-weight: bold;">
            📖 تمت المشاركة عبر تطبيق اقرأ
        </div>
    `;
    document.body.appendChild(card);

    Swal.fire({
        title: 'جاري تجهيز الصورة...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        await document.fonts.ready; 
        
        const canvas = await html2canvas(card, { 
            scale: 2, 
            backgroundColor: '#ffffff', 
            useCORS: true 
        });
        const imgData = canvas.toDataURL('image/png');
        document.body.removeChild(card); 

        const fileNameBase = isAyah ? 'daily_ayah' : 'daily_hadith';

        // 🔴 التعديل السحري هنا: جلب إضافات Capacitor بطريقة آمنة
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            
            // استدعاء المكتبات بشكل مباشر من الكائن العام لتجنب خطأ is not defined
            const Filesystem = window.Capacitor.Plugins.Filesystem;
            const Share = window.Capacitor.Plugins.Share;

            const base64Data = imgData.split(',')[1];
            const fileName = `${fileNameBase}_share_${Date.now()}.png`;
            
            // استخدام كلمة 'CACHE' مباشرة بدل Directory.Cache
            await Filesystem.writeFile({ 
                path: fileName, 
                data: base64Data, 
                directory: 'CACHE' 
            });
            
            const { uri } = await Filesystem.getUri({ 
                path: fileName, 
                directory: 'CACHE' 
            });
            
            Swal.close();
            
            await Share.share({
                title: isAyah ? 'آية اليوم' : 'حديث اليوم',
                text: shareMessage,
                url: uri,
                dialogTitle: 'مشاركة',
            });
            
        } else {
            // كود متصفح الويب العادي
            const blob = await (await fetch(imgData)).blob();
            const file = new File([blob], `${fileNameBase}.png`, { type: 'image/png' });
            
            Swal.close();

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'تطبيق اقرأ 📖',
                    text: shareMessage,
                    files: [file]
                });
            } else {
                const link = document.createElement('a');
                link.download = `${fileNameBase}.png`;
                link.href = imgData;
                link.click();
                
                await navigator.clipboard.writeText(shareMessage);
                Swal.fire({
                    icon: 'success',
                    title: 'تم الحفظ بنجاح!',
                    text: 'تم تحميل الصورة لجهازك ونسخ النص.',
                    timer: 3500,
                    showConfirmButton: false
                });
            }
        }
    } catch (e) {
        console.error('خطأ في توليد الصورة:', e);
        if (document.body.contains(card)) document.body.removeChild(card);
        Swal.fire('خطأ', 'تعذر إنشاء الصورة، تأكد من اتصالك بالإنترنت', 'error');
    }
};
// ─── منطق راديو القرآن الكريم ──────────────────────────────
window.toggleRadio = function() {
    const audio     = document.getElementById('radio-audio');
    const playIcon  = document.getElementById('radio-play-icon');
    const select    = document.getElementById('radio-station-select');
    const status    = document.getElementById('radio-status');
    const radioIcon = document.getElementById('radio-icon');

    if (!audio.paused) {
        audio.pause();
        audio.src = '';
        playIcon.classList.replace('fa-stop', 'fa-play');
        playIcon.style.marginLeft = '5px';
        status.innerText = 'متوقف';
        status.classList.replace('text-dark', 'text-success');
        if (radioIcon) radioIcon.classList.remove('fa-fade');
        return;
    }

    status.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> جاري الاتصال...';
    
    // تشغيل مباشر بدون لف ودوران
    audio.src = select.value;
    audio.load();
    audio.play().then(() => {
        playIcon.classList.replace('fa-play', 'fa-stop');
        playIcon.style.marginLeft = '0';
        status.innerHTML = '<i class="fas fa-circle text-danger me-1 blink-animation"></i> بث مباشر';
        status.classList.replace('text-success', 'text-dark');
        if (radioIcon) radioIcon.classList.add('fa-fade');
    }).catch((err) => {
        console.error('Radio Error:', err);
        status.innerHTML = '<i class="fas fa-exclamation-triangle text-danger me-1"></i> تعذر الاتصال بالمحطة';
        playIcon.classList.replace('fa-stop', 'fa-play');
        if (radioIcon) radioIcon.classList.remove('fa-fade');
    });
};

// تشغيل المحطة الجديدة تلقائياً عند تغييرها من القائمة
document.getElementById('radio-station-select')?.addEventListener('change', function() {
    const audio  = document.getElementById('radio-audio');
    const status = document.getElementById('radio-status');
    if (!audio.paused) {
        status.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> تبديل المحطة...';
        audio.pause();
        audio.src = '';
        window.toggleRadio(); 
    } else {
        audio.src = this.value;
    }
});


window.allahNamesData = [
    { n: "اللَّهُ", m: "الاسم الأعظم الجامع لجميع صفات الكمال" },
    { n: "الرَّحْمَنُ", m: "واسع الرحمة لجميع الخلائق في الدنيا والآخرة" },
    { n: "الرَّحِيمُ", m: "المختص برحمته للمؤمنين" },
    { n: "الْمَلِكُ", m: "المالك المتصرف في ملكه كيف يشاء" },
    { n: "الْقُدُّوسُ", m: "المنزه عن كل نقص وعيب" },
    { n: "السَّلَامُ", m: "الواهب للسلام والأمن لخلقه" },
    { n: "الْمُؤْمِنُ", m: "المصدق لرسله والمانح للأمن لخلقه" },
    { n: "الْمُهَيْمِنُ", m: "الرقيب الحافظ لكل شيء" },
    { n: "الْعَزِيزُ", m: "الغالب الذي لا يُقهر أبداً" },
    { n: "الْجَبَّارُ", m: "الذي يجبر كسر الضعفاء ويقهر الجبابرة" },
    { n: "الْمُتَكَبِّرُ", m: "المتفرد بالعظمة والكبرياء" },
    { n: "الْخَالِقُ", m: "المُوجد للأشياء من العدم" },
    { n: "الْبَارِئُ", m: "الذي خلق الخلق بريئاً من التفاوت" },
    { n: "الْمُصَوِّرُ", m: "الذي أعطى كل مخلوق صورته الخاصة" },
    { n: "الْغَفَّارُ", m: "الذي يستر الذنوب ويتجاوز عنها بكثرة" },
    { n: "الْقَهَّارُ", m: "الغالب الذي قهر جميع الخلائق" },
    { n: "الْوَهَّابُ", m: "كثير العطاء بغير عوض" },
    { n: "الرَّزَّاقُ", m: "خالق الأرزاق والمتكفل بإيصالها لخلقه" },
    { n: "الْفَتَّاحُ", m: "الذي يفتح مغاليق الأمور برحمته" },
    { n: "الْعَلِيمُ", m: "المحيط علمه بكل شيء ظاهراً وباطناً" },
    { n: "الْقَابِضُ", m: "الذي يقبض الرزق والأرواح بحكمته" },
    { n: "الْبَاسِطُ", m: "الذي يبسط الرزق لمن يشاء بفضله" },
    { n: "الْخَافِضُ", m: "الذي يخفض المتكبرين والظالمين" },
    { n: "الرَّافِعُ", m: "الذي يرفع درجات المؤمنين وأوليائه" },
    { n: "الْمُعِزُّ", m: "الذي يهب العزة لمن يشاء" },
    { n: "الْمُذِلُّ", m: "الذي يذل من يشاء بحكمته" },
    { n: "السَّمِيعُ", m: "الذي يسمع السر والنجوى وكل صوت" },
    { n: "الْبَصِيرُ", m: "الذي يرى كل ما تحت الثرى وما فوق السماء" },
    { n: "الْحَكَمُ", m: "الحاكم العدل الذي لا يظلم" },
    { n: "الْعَدْلُ", m: "المنزه عن الظلم والجور في أحكامه" },
    { n: "اللَّطِيفُ", m: "العالم بخفايا الأمور، البر بعباده" },
    { n: "الْخَبِيرُ", m: "العالم ببواطن الأمور وخفاياها" },
    { n: "الْحَلِيمُ", m: "الذي لا يعجل بالعقوبة على من عصاه" },
    { n: "الْعَظِيمُ", m: "الذي لا تحيط به العقول، عظيم الشأن" },
    { n: "الْغَفُورُ", m: "الذي يستر الذنوب ويغفرها مهما بلغت" },
    { n: "الشَّكُورُ", m: "الذي يثيب على العمل القليل بالثواب الكثير" },
    { n: "الْعَلِيُّ", m: "المرتفع عن كل نقص، المتعالي عن كل ند" },
    { n: "الْكَبِيرُ", m: "العظيم في ذاته وصفاته، الأكبر من كل شيء" },
    { n: "الْحَفِيظُ", m: "الذي يحفظ السماوات والأرض وما فيهما" },
    { n: "الْمُقِيتُ", m: "خالق الأقوات وموصلها للكائنات" },
    { n: "الْحَسِيبُ", m: "الكافي لعباده، المُحاسب لهم" },
    { n: "الْجَلِيلُ", m: "عظيم القدر والجلال، المستحق للتعظيم" },
    { n: "الْكَرِيمُ", m: "كثير الخير، الجواد المعطي الذي لا ينفد عطاؤه" },
    { n: "الرَّقِيبُ", m: "المراقب لأحوال العباد لا يغيب عنه شيء" },
    { n: "الْمُجِيبُ", m: "الذي يجيب دعوة الداعين وسؤال السائلين" },
    { n: "الْوَاسِعُ", m: "الذي وسع رزقه ورحمته جميع خلقه" },
    { n: "الْحَكِيمُ", m: "المنزه عن العبث، الذي يضع الأشياء مواضعها" },
    { n: "الْوَدُودُ", m: "المحب لأوليائه والمحبوب لهم" },
    { n: "الْمَجِيدُ", m: "البالغ النهاية في المجد والشرف" },
    { n: "الْبَاعِثُ", m: "الذي يبعث الموتى للحساب يوم القيامة" },
    { n: "الشَّهِيدُ", m: "المطلع على كل شيء، الحاضر الذي لا يغيب" },
    { n: "الْحَقُّ", m: "الذي لا شك في وجوده ووحدانيته" },
    { n: "الْوَكِيلُ", m: "الكفيل بأرزاق العباد والمدبر لأمورهم" },
    { n: "الْقَوِيُّ", m: "صاحب القوة التامة المطلقة" },
    { n: "الْمَتِينُ", m: "الشديد القوة الذي لا يلحقه ضعف أو تعب" },
    { n: "الْوَلِيُّ", m: "الناصر والنصير لأوليائه المؤمنين" },
    { n: "الْحَمِيدُ", m: "المستحق للحمد والثناء في كل حال" },
    { n: "الْمُحْصِي", m: "الذي أحصى كل شيء عدداً وعلماً" },
    { n: "الْمُبْدِئُ", m: "الذي بدأ الخلق من عدم" },
    { n: "الْمُعِيدُ", m: "الذي يعيد الخلائق بعد الموت" },
    { n: "الْمُحْيِي", m: "خالق الحياة وواهبها لمن يشاء" },
    { n: "الْمُمِيتُ", m: "المقدر للموت على كل من أماته" },
    { n: "الْحَيُّ", m: "الدائم البقاء الذي لا يموت ولا يزول" },
    { n: "الْقَيُّومُ", m: "القائم بنفسه والمقيم والمُدبر لغيره" },
    { n: "الْوَاجِدُ", m: "الغني الذي لا يعوزه شيء" },
    { n: "الْمَاجِدُ", m: "صاحب الكمال المتناهي والشرف الواسع" },
    { n: "الْوَاحِدُ", m: "المتفرد في ذاته وصفاته، لا شريك له" },
    { n: "الصَّمَدُ", m: "الذي يقصده الخلائق في حوائجهم" },
    { n: "الْقَادِرُ", m: "الذي لا يعجزه شيء في السماوات ولا في الأرض" },
    { n: "الْمُقْتَدِرُ", m: "صاحب القدرة التامة المطلقة على كل شيء" },
    { n: "الْمُقَدِّمُ", m: "الذي يقدم الأشياء ويضعها في مواضعها" },
    { n: "الْمُؤَخِّرُ", m: "الذي يؤخر الأشياء لحكمة يعلمها" },
    { n: "الْأَوَّلُ", m: "الذي ليس قبله شيء" },
    { n: "الْآخِرُ", m: "الذي ليس بعده شيء" },
    { n: "الظَّاهِرُ", m: "الذي ليس فوقه شيء، المتجلي بآياته" },
    { n: "الْبَاطِنُ", m: "الذي ليس دونه شيء، المحتجب عن الأبصار" },
    { n: "الْوَالِي", m: "المالك للأشياء المتصرف فيها بمشيئته" },
    { n: "الْمُتَعَالِي", m: "المنزه عن صفات المخلوقين ونقائصهم" },
    { n: "الْبَرُّ", m: "كثير الإحسان واللطف بعباده" },
    { n: "التَّوَّابُ", m: "الذي يقبل التوبة عن عباده ويعفو عن السيئات" },
    { n: "الْمُنْتَقِمُ", m: "الذي يقصم ظهور الطغاة والظالمين" },
    { n: "الْعَفُوُّ", m: "الذي يمحو السيئات ويتجاوز عنها" },
    { n: "الرَّؤُوفُ", m: "شديد الرحمة واللطف بعباده" },
    { n: "مَالِكُ الْمُلْكِ", m: "الذي ينفذ مشيئته في ملكه كيف يشاء" },
    { n: "ذُو الْجَلَالِ وَالْإِكْرَامِ", m: "المستحق للتعظيم والتكريم، صاحب الفضل" },
    { n: "الْمُقْسِطُ", m: "العادل في حكمه وفعله" },
    { n: "الْجَامِعُ", m: "الذي يجمع الخلائق ليوم لا ريب فيه" },
    { n: "الْغَنِيُّ", m: "المستغني عن كل ما سواه، وكل شيء مفتقر إليه" },
    { n: "الْمُغْنِي", m: "الذي يغني بفضله من يشاء من عباده" },
    { n: "الْمَانِعُ", m: "الذي يدفع أسباب الهلاك عن خلقه، ويمنع العطاء عمن يشاء" },
    { n: "الضَّارُّ", m: "مقدر الضر على من يشاء بحكمته" },
    { n: "النَّافِعُ", m: "مقدر النفع والخير لمن يشاء" },
    { n: "النُّورُ", m: "الذي بنوره اهتدى المتقون، ومنور السماوات والأرض" },
    { n: "الْهَادِي", m: "الذي يهدي القلوب للإيمان ويرشد الخلائق" },
    { n: "الْبَدِيعُ", m: "خالق الأشياء على غير مثال سابق" },
    { n: "الْبَاقِي", m: "الدائم الذي لا يزول ولا يفنى" },
    { n: "الْوَارِثُ", m: "الذي تعود إليه الأملاك بعد فناء الخلق" },
    { n: "الرَّشِيدُ", m: "الذي يرشد العباد لمصالحهم، الحكيم في أفعاله" },
    { n: "الصَّبُورُ", m: "الذي لا يعاجل العصاة بالعقوبة، ويحلم عنهم" }
];

window.loadNamesOfAllah = function() {
    const container = document.getElementById('names-carousel-inner');
    const myCarouselEl = document.getElementById('namesCarousel');
    
    if (!container || container.dataset.loaded === 'true') return;

    window.renderAllahNames(window.allahNamesData);
    container.dataset.loaded = 'true';

    new bootstrap.Carousel(myCarouselEl, {
        interval: false,
        touch: true
    });

    myCarouselEl.addEventListener('slide.bs.carousel', function (e) {
        const total = document.querySelectorAll('#names-carousel-inner .carousel-item').length;
        const counterEl = document.getElementById('names-counter');
        if (counterEl) {
            counterEl.innerText = `${e.to + 1} / ${total}`;
        }
    });
};

window.renderAllahNames = function(data) {
    const container = document.getElementById('names-carousel-inner');
    const counterEl = document.getElementById('names-counter');
    let html = '';
    
    if(!data || data.length === 0) {
        container.innerHTML = '<div class="text-center text-danger p-4 fw-bold mt-4"><i class="fas fa-search-minus fa-3x mb-3"></i><br>لم يتم العثور على هذا الاسم</div>';
        if (counterEl) counterEl.innerText = '0 / 0';
        return;
    }

    data.forEach((item, index) => {
        const isActive = index === 0 ? 'active' : '';
        html += `
            <div class="carousel-item ${isActive}">
                <div class="card border-0 shadow-lg mx-auto" style="max-width: 320px; border-radius: 24px; background: linear-gradient(135deg, #ffffff 0%, #f1f8e9 100%); border-bottom: 5px solid #198754 !important; min-height: 220px;">
                    <div class="card-body p-4 text-center d-flex flex-column justify-content-center align-items-center h-100">
                        <h1 class="display-3 fw-bold text-success mb-3" style="font-family: 'Amiri', serif; text-shadow: 0 2px 4px rgba(25,135,84,0.1);">${item.n}</h1>
                        <p class="text-muted fs-6 mb-0 px-2" style="line-height: 1.8;">${item.m}</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    if (counterEl) counterEl.innerText = `1 / ${data.length}`;
};

window.filterAllahNames = function() {
    const query = document.getElementById('search-name-input').value.trim();
    
    const cleanText = (text) => {
        return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g, '')
                   .replace(/[أإآٱ]/g, 'ا')
                   .replace(/ى/g, 'ي')
                   .replace(/ة/g, 'ه');
    };

    if (!query) {
        window.renderAllahNames(window.allahNamesData);
        new bootstrap.Carousel(document.getElementById('namesCarousel'), {
            interval: false,
            touch: true
        });
        return;
    }

    const cleanQuery = cleanText(query);
    const filtered = window.allahNamesData.filter(item => {
        return cleanText(item.n).includes(cleanQuery) || cleanText(item.m).includes(cleanQuery);
    });

    window.renderAllahNames(filtered);

    new bootstrap.Carousel(document.getElementById('namesCarousel'), {
        interval: false,
        touch: true
    });
};

window.initIslamicCountdown = function() {
    const hijriEvents = [
        { name: 'رمضان المبارك 🌙', m: 9, d: 1 },
        { name: 'عيد الفطر 🎉', m: 10, d: 1 },
        { name: 'يوم عرفة 🕋', m: 12, d: 9 },
        { name: 'عيد الأضحى 🐑', m: 12, d: 10 },
        { name: 'رأس السنة الهجرية 📅', m: 1, d: 1 }
    ];

    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { 
        day: 'numeric', month: 'numeric' 
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextEvent = null;
    let diffDays = 0;

    for (let i = 0; i <= 360; i++) {
        const checkDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        const parts = formatter.formatToParts(checkDate);
        
        const hDay = parseInt(parts.find(p => p.type === 'day').value);
        const hMonth = parseInt(parts.find(p => p.type === 'month').value);

        const matched = hijriEvents.find(e => e.m === hMonth && e.d === hDay);
        if (matched) {
            nextEvent = matched;
            diffDays = i;
            break; 
        }
    }

    const container = document.getElementById('islamic-countdown-container');
    if (!container) return;

    if (nextEvent) {
        let daysText = '';
        if (diffDays === 0) daysText = 'اليوم!';
        else if (diffDays === 1) daysText = 'غداً';
        else if (diffDays === 2) daysText = 'بعد يومين';
        else if (diffDays <= 10) daysText = `باقي ${diffDays} أيام`;
        else daysText = `باقي ${diffDays} يوماً`;

        const note = diffDays > 2 ? ' <span style="font-size: 0.65rem; opacity: 0.7; font-weight: normal; margin-right: 2px;">(فلكياً)</span>' : '';

       container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold" style="font-family: 'Tajawal', sans-serif;">
                    <i class="fas fa-hourglass-half text-warning me-2 fa-spin-hover"></i> ${nextEvent.name}
                </span>
                <span class="badge rounded-pill px-3 py-2 fs-6 shadow-sm" style="background-color: #ffc107 !important; color: #000000 !important;">
                    ${daysText}${note}
                </span>
            </div>
        `;
        container.classList.remove('d-none');
    } else {
        container.classList.add('d-none');
    }
};

const AZKAR_AUDIO_LINKS = {
 'morning': 'audio/sabah.mp3',
    'evening': 'audio/masaa.mp3',
    'sleep': 'audio/sleep.mp3'
};

function formatAudioTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

window.openAzkarCategory = function(type) {
    showSection('azkar-detail');
    if(typeof loadAzkarList === 'function') loadAzkarList(type);

    const audioBox = document.getElementById('azkar-audio-box');
    const audioPlayer = document.getElementById('azkar-audio-player');
    const progressBar = document.getElementById('azkar-progress-bar');
    const btnIcon = document.querySelector('#btn-play-azkar i');
    const btn = document.getElementById('btn-play-azkar');
    
    // 🔴 جلب عنصر اسم القارئ
    const reciterName = document.getElementById('azkar-audio-reciter'); 
    
    if(typeof window.stopAzkarAudio === 'function') window.stopAzkarAudio();

    if (AZKAR_AUDIO_LINKS[type]) {
        audioBox.classList.remove('d-none');
        audioPlayer.src = AZKAR_AUDIO_LINKS[type];
        audioPlayer.load();

        // 🌟 الذكاء هنا: تغيير اسم القارئ حسب نوع الذكر
        if (reciterName) {
            if (type === 'sleep') {
                reciterName.innerText = 'بصوت الشيخ مشاري راشد';
            } else {
                reciterName.innerText = 'بصوت الشيخ محمد جبريل';
            }
        }
        
        progressBar.value = 0;
        document.getElementById('azkar-current-time').innerText = "00:00";
        document.getElementById('azkar-duration').innerText = "00:00";
        if(btnIcon) {
            btnIcon.className = 'fas fa-play fs-5';
            btnIcon.style.marginLeft = '3px';
            btn.classList.replace('btn-danger', 'btn-success');
        }

        audioPlayer.onloadedmetadata = () => {
            document.getElementById('azkar-duration').innerText = formatAudioTime(audioPlayer.duration);
        };
        
        audioPlayer.ontimeupdate = () => {
            const current = audioPlayer.currentTime;
            const duration = audioPlayer.duration;
            document.getElementById('azkar-current-time').innerText = formatAudioTime(current);
            if (duration > 0) {
                progressBar.value = (current / duration) * 100;
            }
        };
    } else {
        audioBox.classList.add('d-none');
        audioPlayer.removeAttribute('src');
    }
};

window.toggleAzkarAudio = function() {
    const audio = document.getElementById('azkar-audio-player');
    const btn = document.getElementById('btn-play-azkar');
    const icon = btn.querySelector('i');

    if (!audio.src || audio.src === window.location.href) return;

    if (audio.paused) {
        if (typeof stopAllMedia === 'function') stopAllMedia(); 
        
        icon.className = 'fas fa-spinner fa-spin fs-5';
        icon.style.marginLeft = '0';
        
        audio.play().then(() => {
            icon.className = 'fas fa-pause fs-5'; // زرار إيقاف مؤقت عشان شريط التقدم
            btn.classList.replace('btn-success', 'btn-danger');
        }).catch(e => {
            icon.className = 'fas fa-play fs-5';
            icon.style.marginLeft = '3px';
            Swal.fire({ toast: true, position: 'top', icon: 'error', title: 'تأكد من اتصالك بالإنترنت', showConfirmButton: false, timer: 3000 });
        });
    } else {
        audio.pause();
        icon.className = 'fas fa-play fs-5';
        icon.style.marginLeft = '3px';
        btn.classList.replace('btn-danger', 'btn-success');
    }
    
    audio.onended = () => {
        icon.className = 'fas fa-play fs-5';
        icon.style.marginLeft = '3px';
        btn.classList.replace('btn-danger', 'btn-success');
        document.getElementById('azkar-progress-bar').value = 0;
    };
};

window.seekAzkarAudio = function(value) {
    const audio = document.getElementById('azkar-audio-player');
    if (audio && audio.duration) {
        // حساب الوقت الجديد بناءً على سحب المستخدم للشريط
        audio.currentTime = (value / 100) * audio.duration;
    }
};

window.stopAzkarAudio = function() {
    const audio = document.getElementById('azkar-audio-player');
    const btn = document.getElementById('btn-play-azkar');
    const icon = btn?.querySelector('i');
    
    if (audio && !audio.paused) {
        audio.pause();
        // مش هنصفر الوقت عشان لو المستخدم خرج ورجع يكمل من نفس المكان
    }
    if (icon) {
        icon.className = 'fas fa-play fs-5';
        icon.style.marginLeft = '3px';
        if (btn) btn.classList.replace('btn-danger', 'btn-success');
    }
};

window.openAyahInsights = function(surahNum, ayahNum) {
    const modal = new bootstrap.Modal(document.getElementById('insightsModal'));
    const contentDiv = document.getElementById('insight-content');
    const subtitle = document.getElementById('insight-subtitle');
    const modalContent = document.querySelector('#insightsModal .modal-content');

    // ─── Dark Mode Detection ──────────────────────────────────────────────────
    const isDark = document.body.getAttribute('data-theme') === 'dark';

    const colors = {
        cardBg: {
            red:    isDark ? '#2a1a1a' : '#fff5f5',
            green:  isDark ? '#0f2318' : '#f0fdf4',
            blue:   isDark ? '#0d1f2d' : '#f0f7ff',
            yellow: isDark ? '#2a2000' : '#fff9e6',
        },
        text:       isDark ? '#e8e8e8' : '#212529',
        modalBg:    isDark ? '#1a2e1f' : '#fafafa',
        titleColor: isDark ? '#ffffff' : '#212529',
    };

    if (modalContent) modalContent.style.background = colors.modalBg;

    // 2. البحث عن البيانات
    const key = `${surahNum}_${ayahNum}`;
    const verseData = window.quranInsights.verses[key];

    const surahData = window.quranInsights.surahs[surahNum] || {
        name: `السورة رقم ${surahNum}`,
        theme: "هذه السورة تتضمن توجيهات إلهية ومقاصد عظيمة تدعو للتفكر في آيات الله والعمل بمنهجه.",
        fadl: ""
    };

    // 3. تحديث العنوان
    subtitle.innerText = `سورة ${surahData.name} - آية ${ayahNum}`;

    // ─── Helper: بناء كارت موحد ──────────────────────────────────────────────
    const card = (bgKey, borderColor, iconClass, titleLabel, bodyText) => `
        <div class="mb-3 p-3 rounded-4" style="background-color:${colors.cardBg[bgKey]}; border-right:4px solid ${borderColor};">
            <h6 class="fw-bold mb-2" style="color:${borderColor};">
                <i class="${iconClass} me-2"></i>${titleLabel}
            </h6>
            <p class="mb-0 small fw-medium" style="line-height:1.8; color:${colors.text};">${bodyText}</p>
        </div>`;

    let html = '';

    // 4. البناء الذكي للمحتوى - دايمًا نعرض محتوى قيّم ومفيد
    if (verseData) {
        html += `<h5 class="fw-bold text-center mb-4" style="font-family:'Amiri',serif; line-height:1.6; color:${colors.titleColor};">${verseData.title}</h5>`;

        if (verseData.sabab)
            html += card('red',    '#dc3545', 'fas fa-scroll',             'سبب النزول',             verseData.sabab);
        if (verseData.fadl)
            html += card('green',  '#198754', 'fas fa-star',               'فضل الآية',              verseData.fadl);
        if (verseData.action)
            html += card('blue',   '#0dcaf0', 'fas fa-hand-holding-heart', 'رسالة لك (تطبيق عملي)', verseData.action);

        // ─── بطاقة السورة دايمًا في الأسفل ───────────────────
        html += card('green', '#198754', 'fas fa-compass', 'مقصد السورة', surahData.theme);

        if (surahData.fadl)
            html += card('yellow', '#ffc107', 'fas fa-medal', 'فضل السورة', surahData.fadl);

    } else {
        // ─── لا يوجد بيانات مخصصة للآية → بطاقة السورة كاملة ─
        html += card('green', '#198754', 'fas fa-compass', 'مقصد السورة', surahData.theme);

        if (surahData.fadl)
            html += card('yellow', '#ffc107', 'fas fa-medal', 'فضل السورة', surahData.fadl);

        // ─── رسالة تدبر عامة دايمًا موجودة ──────────────────
        if (surahData.action)
            html += card('blue', '#0dcaf0', 'fas fa-hand-holding-heart', 'رسالة لك (تطبيق عملي)', surahData.action);
        else
            html += card('blue', '#0dcaf0', 'fas fa-hand-holding-heart', 'وقفة تدبر',
                'تأمل في هذه الآية وتفكر في معناها، فإن التدبر في القرآن باب عظيم لتنوير القلب وتقريبه من الله. اسأل نفسك: ماذا يريد الله أن يُعلمني من هذه الآية؟');
    }

    contentDiv.innerHTML = html;
    modal.show();
};


// ─── 18. DOMContentLoaded 
document.addEventListener('DOMContentLoaded', async () => {
  // if ('serviceWorker' in navigator) {
  //   try {
  //     const regs = await navigator.serviceWorker.getRegistrations();
  //     for (let r of regs) await r.unregister();
  //     const keys = await caches.keys();
  //     for (let k of keys) {
  //       if (k !== 'quran-audio-cache-v1') {
  //         await caches.delete(k);
  //       }
  //     }
  //     console.log('🧹 تم تنظيف الكاش القديم بنجاح');
  //   } catch (e) {
  //     console.error('خطأ في مسح الكاش:', e);
  //   }
  // }
  initNativeFeatures();
  setTimeout(checkForUpdates, 3000);
  loadDailyContent();
initIslamicCountdown();
  // 1. استرجاع التوكن أول حاجة
  try {
    if (Capacitor.isNativePlatform()) {
      const { value: token } = await Preferences.get({ key: 'auth_token' });
      if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      const token = localStorage.getItem('auth_token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('✅ Token restored from localStorage');
      }
    }
  } catch { console.log('No saved token'); }

  // initNativeFeatures();
  if (typeof initSearch === 'function') initSearch();
if (typeof initBookmarksSearch === 'function') initBookmarksSearch();

  // ✅ await عشان الـ routing يشتغل بعد ما نعرف حالة المستخدم
  await window.checkAuth().catch(() => {});
  // مزامنة أي عمليات معلقة عند فتح التطبيق
if (navigator.onLine) {
  setTimeout(() => processOfflineQueue(), 5000);
}

  if (document.getElementById('prayers-list')) loadPrayers();
  if (document.getElementById('active-khatmah')) manageKhatmah().catch(() => {});
document.getElementById('tasbeeh-tab')?.addEventListener('shown.bs.tab', () => {
    if (window.loadTasbeeh) window.loadTasbeeh();
});
  // ✅ الـ Routing
  const initialPath = window.location.pathname;

  if (initialPath === '/' || initialPath === '/index.html') {
    window.showSection('home');

  }else if (initialPath === '/resetPassword') {
    window.showSection('reset-password');
  }
  else if (initialPath.startsWith('/quran')) {
    document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
    const quranSection = document.getElementById('quran-section');
    if (quranSection) quranSection.classList.remove('d-none');
    window.scrollTo(0, 0);
    const parts = initialPath.split('/');
    const pageToLoad = (parts.length > 2 && !isNaN(parts[2])) ? parseInt(parts[2]) : window.currentPage || 1;
    setTimeout(() => {
      if (window.loadQuranPage) window.loadQuranPage(pageToLoad);
    }, 300);

  } else if (initialPath.includes('admin') || initialPath.includes('manage-users')) {
    window.showSection('admin');
    if (window.loadAllUsers) window.loadAllUsers();

  } 
  else {
    // ✅ تنظيف الـ path من الشرطات الزائدة - هذا هو الإصلاح الأساسي
    const sectionName = initialPath.replace(/^\/|\/$/g, '');
    if (sectionName && document.getElementById(`${sectionName}-section`)) {
      window.showSection(sectionName);
    } else {
      window.showSection('home');
    }
  }

  // ─── Form Handlers 
  const handleForm = (id, action) => {
    const f = document.getElementById(id);
    if (f) {
      f.removeEventListener('submit', f._handler);
      f._handler = (e) => { e.preventDefault(); action(); };
      f.addEventListener('submit', f._handler);
    }
  };

  handleForm('loginFormPage', () => {
    const emailEl = document.getElementById('login-email');
    const passEl  = document.getElementById('login-password');
    if (emailEl && passEl) login(emailEl.value, passEl.value);
  });
  handleForm('loginForm', () => {
    const emailEl = document.getElementById('email');
    const passEl  = document.getElementById('password');
    if (emailEl && passEl) login(emailEl.value, passEl.value);
  });
  handleForm('signupFormPage', () => {
    signup(
      document.getElementById('signup-name').value,
      document.getElementById('signup-email').value,
      document.getElementById('signup-password').value,
      document.getElementById('signup-passwordConfirm').value
    );
  });
  handleForm('signupForm', () => {
    signup(
      document.getElementById('name').value,
      document.getElementById('email').value,
      document.getElementById('password').value,
      document.getElementById('passwordConfirm').value
    );
  });
  handleForm('verifyOTPFormPage', () => verifyOTP(document.getElementById('verify-email').value, document.getElementById('verify-otp').value));
  handleForm('verifyOTPForm',     () => verifyOTP(document.getElementById('email').value,        document.getElementById('otp').value));
  //  منطق تفعيل/إلغاء تعديل الملف الشخصي 
  const editProfileBtn = document.getElementById('edit-profile-btn');
  const saveProfileBtn = document.getElementById('save-profile-btn');
  const profileNameInput = document.getElementById('profile-name');
  const profileEmailInput = document.getElementById('profile-email');

  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
      const isCurrentlyDisabled = profileNameInput.hasAttribute('disabled');

      if (isCurrentlyDisabled) {
        profileNameInput.removeAttribute('disabled');
        profileEmailInput.removeAttribute('disabled');
        
        if (saveProfileBtn) saveProfileBtn.classList.remove('d-none');
        
        editProfileBtn.innerHTML = '<i class="fas fa-times me-1"></i> إلغاء';
        editProfileBtn.classList.replace('btn-outline-success', 'btn-outline-danger');
        
        profileNameInput.focus();
      } else {
        profileNameInput.setAttribute('disabled', 'true');
        profileEmailInput.setAttribute('disabled', 'true');
        
        if (saveProfileBtn) saveProfileBtn.classList.add('d-none');
        
        editProfileBtn.innerHTML = '<i class="fas fa-edit me-1"></i> تعديل';
        editProfileBtn.classList.replace('btn-outline-danger', 'btn-outline-success');
        
        window.showSection('profile'); 
      }
    });
  }



  handleForm('updateUserForm', () => {
    const name  = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    updateSettings({ name, email }, 'data');
  });
  handleForm('resetPasswordFormPage', () => {
    const otp         = document.getElementById('reset-otp').value;
    const newPass     = document.getElementById('reset-password').value;
    const confirmPass = document.getElementById('reset-password-confirm').value;

    if (!otp)                        return showAlert('error', 'يرجى إدخال كود التحقق');
    if (newPass.length < 8)          return showAlert('error', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    if (newPass !== confirmPass)      return showAlert('error', 'كلمتا المرور غير متطابقتين');

    resetPassword(otp, newPass, confirmPass);
  });

  document.getElementById('logoutBtnProfile')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  document.getElementById('logoutBtn')?.addEventListener('click',        (e) => { e.preventDefault(); logout(); });

  // AI Upload
  const triggerUpload = document.getElementById('triggerUpload');
  const audioFile     = document.getElementById('audioFile');
  const uploadBtn     = document.getElementById('uploadBtn');
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
      const surahVal  = document.getElementById('ai-surah-select')?.value;
      const startAyah = document.getElementById('ai-start-ayah')?.value || null;
      const endAyah   = document.getElementById('ai-end-ayah')?.value   || null;
      if (!audioFile.files[0]) return showAlert('error', 'يرجى اختيار ملف أولاً');
      if (!surahVal)            return showAlert('error', 'يرجى اختيار السورة');
      checkRecitation(audioFile.files[0], surahVal, startAyah, endAyah, URL.createObjectURL(audioFile.files[0]));
    });
  }

  // AI Recording
  const aiRecordBtn    = document.getElementById('recordBtn');
  const aiRecordStatus = document.getElementById('recordStatus');
  if (aiRecordBtn) {
    aiRecordBtn.addEventListener('click', async () => {
      if (!await isUserLoggedIn()) { requireLogin('المصحح الذكي للتلاوة'); return; }
      if (!aiMediaRecorder || aiMediaRecorder.state === 'inactive') {
        const surahVal = document.getElementById('ai-surah-select').value;
        if (!surahVal) return showAlert('error', 'يرجى اختيار السورة أولاً');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          aiMediaRecorder = new MediaRecorder(stream);
          let chunks = [];
          aiMediaRecorder.ondataavailable = (e) => chunks.push(e.data);
          aiMediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            checkRecitation(
              new File([blob], 'rec.webm', { type: 'audio/webm' }),
              surahVal,
              document.getElementById('ai-start-ayah').value,
              document.getElementById('ai-end-ayah').value,
              URL.createObjectURL(blob)
            );
          };
          aiMediaRecorder.start();
          aiRecordBtn.classList.replace('btn-outline-danger', 'btn-danger');
          aiRecordBtn.innerHTML = '<i class="fas fa-stop fa-3x"></i>';
          if (aiRecordStatus) aiRecordStatus.innerText = 'جاري التسجيل... انقر للإيقاف';
        } catch (err) { showAlert('error', 'يرجى السماح بصلاحية الميكروفون'); }
      } else {
        aiMediaRecorder.stop();
        aiMediaRecorder.stream.getTracks().forEach(t => t.stop());
        aiRecordBtn.classList.replace('btn-danger', 'btn-outline-danger');
        aiRecordBtn.innerHTML = '<i class="fas fa-microphone fa-2x"></i>';
        if (aiRecordStatus) aiRecordStatus.innerText = 'تم الانتهاء! جاري التحليل...';
      }
    });
  }

  // Live Tracking
  const btnStartLive = document.getElementById('btn-start-live');
  const btnStopLive  = document.getElementById('btn-stop-live');
  const liveStatus   = document.getElementById('live-status');

  if (btnStartLive && btnStopLive) {
    btnStartLive.addEventListener('click', async () => {
      if (!await isUserLoggedIn()) { requireLogin('تتبع التلاوة المباشر'); return; }
      try {
        liveStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        isLiveTracking = true;
        lastMatchedIndex = -1; searchStartIndex = 0; accumulatedBuffer = '';
        btnStartLive.classList.add('d-none');
        btnStopLive.classList.remove('d-none');
        if (liveStatus) {
          liveStatus.innerHTML = `
            <div class="d-flex flex-column align-items-center mt-2">
              <span class="text-success fw-bold mb-1" style="font-size: 1.1rem;">
                <i class="fas fa-microphone-alt fa-pulse text-danger me-2"></i> جاري الاستماع لتلاوتك... اقرأ الآن
              </span>
              <span class="text-muted bg-light px-3 py-1 rounded-pill" style="font-size: 0.85rem; border: 1px solid #e9ecef;">
                <i class="fas fa-robot text-secondary me-1"></i> المعلم الذكي يتابعك (يستغرق التحديث حوالي 3 ثوانٍ ⏳)
              </span>
            </div>`;
        }
        startChunkLoop();
      } catch (err) { showAlert('error', 'يرجى السماح بصلاحية الميكروفون'); }
    });

    btnStopLive.addEventListener('click', () => {
      stopAllMedia();
      btnStartLive.classList.remove('d-none');
      btnStopLive.classList.add('d-none');
      if (liveStatus) { liveStatus.innerText = 'تم التوقف.'; liveStatus.className = 'text-muted small mt-1'; }
      const isMemMode = document.getElementById('memorize-mode')?.checked;
      document.querySelectorAll('.live-ayah-item').forEach((el, idx) => {
        el.classList.remove('ayah-active');
        const td = el.querySelector('.live-ayah-text');
        if (!td) return;
        td.style.backgroundColor = ''; td.style.color = ''; td.style.borderRadius = ''; td.style.padding = '';
        if (idx <= lastMatchedIndex) td.classList.remove('blurred-text');
        else if (isMemMode)          td.classList.add('blurred-text');
      });
    });
  }

  // Dark Mode
  const toggleBtn = document.getElementById('theme-toggle');
  const icon      = toggleBtn?.querySelector('i');
  if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    if (icon) { icon.classList.replace('fa-moon', 'fa-sun'); icon.classList.add('text-warning'); }
  }
 toggleBtn?.addEventListener('click', async () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      if (icon) { icon.classList.remove('fa-sun', 'text-warning'); icon.classList.add('fa-moon'); }
      if (Capacitor.isNativePlatform()) {
       await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setBackgroundColor({ color: '#1e5f31' });
          await StatusBar.setStyle({ style: Style.Dark });
      }
    } else {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun', 'text-warning'); }
      if (Capacitor.isNativePlatform()) {
          await StatusBar.setBackgroundColor({ color: '#1a2e1f' });;
          await StatusBar.setStyle({ style: Style.Dark });
      }
    }
  });

  // Khatmah Buttons
  document.getElementById('specialBookmarkBtn')?.addEventListener('click', async () => {
    const surah = document.getElementById('currentSurah')?.value;
    const ayah  = document.getElementById('currentAyah')?.value;
    if (!surah || !ayah) return showAlert('error', 'اختر السورة والآية');
    await updateKhatmahProgress(surah, ayah);
  });

  document.getElementById('deleteKhatmahBtn')?.addEventListener('click', async () => {
    const result = await Swal.fire({
      title: 'هل أنت متأكد؟', text: 'سيتم إلغاء الختمة الحالية نهائياً', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#198754',
      confirmButtonText: 'نعم، إلغاء الختمة', cancelButtonText: 'تراجع'
    });
    if (result.isConfirmed) await deleteKhatmah();
  });

  handleForm('createKhatmahForm', async () => {
    const name     = document.getElementById('planName')?.value;
    const duration = document.getElementById('duration')?.value;
    if (!name || !duration) return showAlert('error', 'أدخل اسم الختمة والمدة');
    await createKhatmah(name, duration);
  });

  // Volume Control
  const volumeSliderAi  = document.getElementById('volume-slider-ai');
  // const volumeControlAi = document.getElementById('volume-control-ai');
  if (volumeSliderAi) {
    volumeSliderAi.addEventListener('input', function() {
      document.querySelectorAll('#result-container audio').forEach(audio => { audio.volume = parseFloat(this.value); });
    });
  }
const resultContainer = document.getElementById('result-container');
if (resultContainer) {
  const observer = new MutationObserver(() => {
    const volumeControlAi = document.getElementById('volume-control-ai'); 
    if (!resultContainer.classList.contains('d-none')) {
      if (volumeControlAi) volumeControlAi.classList.remove('d-none');
    } else {
      if (volumeControlAi) volumeControlAi.classList.add('d-none');
    }
  });
  observer.observe(resultContainer, { attributes: true, attributeFilter: ['class'] });
}
  document.getElementById('volume-slider-live')?.addEventListener('input', function() {
    if (window.currentAudio) window.currentAudio.volume = parseFloat(this.value);
    document.querySelectorAll('#live-quran-container audio').forEach(a => { a.volume = parseFloat(this.value); });
  });

    function setupIosInstallPrompt() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome') && !userAgent.includes('crios');
  
  const isStandalone = ('standalone' in window.navigator) && window.navigator.standalone;

  const hasSeenPrompt = localStorage.getItem('aqra_ios_prompt_seen');

  if (isIos && isSafari && !isStandalone && !hasSeenPrompt) {
    
    setTimeout(() => {
      Swal.fire({
        title: '📲 ثبّت تطبيق اقرأ',
        html: `
          <div style="font-family: 'Amiri', serif; text-align: center; direction: rtl; line-height: 1.8;">
            <p class="text-muted mb-3" style="font-size: 1.1rem;">للاستمتاع بالمصحف والتلاوة بدون إنترنت، أضف التطبيق لشاشتك الرئيسية:</p>
            <div class="bg-light p-3 rounded text-end" style="border: 1px dashed #198754;">
              <p class="mb-2 fw-bold text-dark">
                ١. اضغط على زر المشاركة <i class="fas fa-external-link-alt text-primary mx-1"></i> أسفل الشاشة.
              </p>
              <p class="mb-0 fw-bold text-dark">
                ٢. اختر <strong>"إضافة إلى الصفحة الرئيسية"</strong> <br>
                <span class="text-muted small" style="font-family: sans-serif;">(Add to Home Screen) <i class="far fa-plus-square ms-1"></i></span>
              </p>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'حسناً، فهمت',
        cancelButtonText: 'ليس الآن',
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
      }).then((result) => {
        localStorage.setItem('aqra_ios_prompt_seen', 'true');
      });
    }, 5000); 
  }
}

setupIosInstallPrompt();
scheduleWebFridayReminder();






  console.log(Capacitor.isNativePlatform() ? '📱 Mobile Mode Active' : '🌐 Web Mode Active');


    
  // ─── Fix aria-hidden: استنى الـ modal يخلص قبل showSection ────────────────
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-goto][data-bs-dismiss="modal"]');
    if (!btn) return;
    const target  = btn.getAttribute('data-goto');
    const modalEl = btn.closest('.modal');
    if (!modalEl || !target) return;
    modalEl.addEventListener('hidden.bs.modal', function() {
      if (window.showSection) window.showSection(target);
    }, { once: true });
  });
});