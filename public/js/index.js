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
  toggleBookmark, deleteBookmark, deleteKhatmah, initSearch, initBookmarksSearch,scheduleFridayKahfNotification,
  shareAyah,
} from './features';

import { surahNames, surahPageMap, juzData, getSurahNameByPage } from './constants';

// ─── إخفاء رسائل الكونسول في وضع الـ Production ───
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.log = function () {};
    console.info = function () {};
    console.warn = function () {}; 
    console.error = function () {};
}

// ─── 1. Config ────────────────────────────────────────────────────────────────
// axios.defaults.baseURL = 'https://aqra-app.serveftp.com';
axios.defaults.baseURL = 'https://aqraapp.com';
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
// ─── Offline Queue Processor ──────────────────────────────────────────────────
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
  // ✅ FIX: تحقق من وجود كل عنصر قبل الوصول إليه لمنع classList null error
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
};

// ─── 8. checkAuth ─────────────────────────────────────────────────────────────
window.checkAuth = async () => {
  // ✅ 1. استرجاع التوكن دايماً حسب نوع الجهاز (موبايل أو ويب)
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
          onclick="window.showSection('quran');window.loadQuranPage(${pageNum});">
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
          <div class="card border-success h-100 hover-shadow" style="cursor:pointer;border-width:2px!important"
            onclick="window.showSection('quran'); window.loadQuranPage(${hizb1Page});">
            <div class="card-body text-center py-3">
              <div class="text-success fw-bold mb-1" style="font-size:1.1rem">الحزب ${hizbNum1}</div>
              <div class="hizb-tabs justify-content-center d-flex flex-wrap gap-1 mt-2">
                <span class="hizb-tab" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb1Page});">ص ${hizb1Page} الربع الأول</span>
                <span class="hizb-tab" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb1Page + 2});">ص ${hizb1Page + 2} الربع الثاني</span>
                <span class="hizb-tab" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb1Page + 5});">ص ${hizb1Page + 5} الربع الثالث</span>
                <span class="hizb-tab" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb1Page + 7});">ص ${hizb1Page + 7} الربع الرابع</span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6">
          <div class="card border-success h-100 hover-shadow" style="cursor:pointer;border-width:2px!important"
            onclick="window.showSection('quran'); window.loadQuranPage(${hizb2Page});">
            <div class="card-body text-center py-3">
              <div class="text-success fw-bold mb-1" style="font-size:1.1rem">الحزب ${hizbNum2}</div>
              <div class="hizb-tabs justify-content-center d-flex flex-wrap gap-1 mt-2">
                <span class="hizb-tab" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb2Page});">ص ${hizb2Page} الربع الأول</span>
                <span class="hizb-tab" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb2Page + 2});">ص ${hizb2Page + 2} الربع الثاني</span>
                <span class="hizb-tab" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb2Page + 5});">ص ${hizb2Page + 5} الربع الثالث</span>
                <span class="hizb-tab" onclick="event.stopPropagation(); window.showSection('quran'); window.loadQuranPage(${hizb2Page + 7});">ص ${hizb2Page + 7} الربع الرابع</span>
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
    if (s && s.options.length <= 1) surahNames.forEach((n, i) => { const o = document.createElement('option'); o.value = i + 1; o.textContent = `${i + 1}. ${n}`; s.appendChild(o); });
  };
  if (sectionName === 'ai-correction') fillSelect('ai-surah-select');
  if (sectionName === 'live-recitation') fillSelect('live-surah-select');
    if (sectionName === 'qibla') {
    // تأجيل بسيط لضمان ظهور الـ DOM قبل بدء الـ sensors
    setTimeout(() => {
      if (window.initQibla) window.initQibla();
    }, 300);
  }

  if (sectionName === 'azkar') {
    // تحميل المسبحة من الكاش عند فتح قسم الأذكار
    if (window.loadTasbeeh) window.loadTasbeeh();
  }

  

  // تنظيف بوصلة القبلة عند مغادرة الصفحة
  if (sectionName !== 'qibla') {
    // cleanupQibla مُستدعاة تلقائياً في initQibla عند الفتح التالي
    // لكن نوقف الـ sensors فوراً إذا غادر المستخدم
    window.removeEventListener('deviceorientationabsolute', window._qiblaOrientationHandler);
    window.removeEventListener('deviceorientation', window._qiblaOrientationHandler);
  }
};

window.openQuranAtCurrentKhatmah = async () => {
  try {
    if (!await isUserLoggedIn()) { requireLogin('متابعة الختمة'); return; }
    Swal.fire({
      title: '📖 جاري فتح ختمتك...',
      html: `<div class="text-center py-2"><div class="spinner-border text-success mb-3" style="width: 3rem; height: 3rem;"></div><p class="text-muted mb-0">جاري البحث عن موضع الختمة</p></div>`,
      allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });
    const res = await axios.get('/api/v1/khatmah');
    const k = res.data.data.khatmah;
    if (!k || !k.currentSurah || !k.currentAyah) { Swal.close(); window.showSection('khatmah'); return; }
    const currentSurah   = parseInt(k.currentSurah);
    const currentAyah    = parseInt(k.currentAyah);
    const surahFirstPage = surahPageMap[currentSurah - 1] || 1;
    const savedPage      = k.page ? parseInt(k.page) : 0;
    const isSavedPageValid = savedPage >= surahFirstPage && savedPage <= 604;
 
    let targetPage;
    if (isSavedPageValid) {
      targetPage = savedPage;
    } else {
      const nextSurahPage = surahPageMap[currentSurah] || 604;
      targetPage = surahFirstPage;
      for (let p = surahFirstPage; p <= nextSurahPage && p <= 604; p++) {
        try {
          let ayahs;
          const cached = await cacheGet(p);
          if (cached) { ayahs = cached.ayahs; }
          else {
            const pageRes = await axios.get(`/api/v1/quran/page/${p}`);
            ayahs = pageRes.data.data.ayahs;
            await cacheSet(p, pageRes.data.data);
          }
          const matched = ayahs.find(a => parseInt(a.surahNumber) === currentSurah && parseInt(a.ayahNumber) === currentAyah);
          if (matched) {
            targetPage = p;
            try { await axios.patch('/api/v1/khatmah', { surah: currentSurah, ayah: currentAyah, page: p }); } catch(e) {}
            break;
          }
        } catch (e) { break; }
      }
    }
    Swal.close();
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
    else if (err.response?.status === 404) window.showSection('khatmah');
    else if (!navigator.onLine || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
      const offlineKhatmah = await localforage.getItem('latest_khatmah');
      if (offlineKhatmah && offlineKhatmah.currentSurah && offlineKhatmah.currentAyah) {
        const currentSurah   = parseInt(offlineKhatmah.currentSurah);
        const currentAyah    = parseInt(offlineKhatmah.currentAyah);
        const surahFirstPage = surahPageMap[currentSurah - 1] || 1;
        const savedPage      = offlineKhatmah.page ? parseInt(offlineKhatmah.page) : 0;
        // ✅ استخدم الـ page المحفوظة لو صحيحة، غير كده أول صفحة السورة
        const targetPage = (savedPage >= surahFirstPage && savedPage <= 604)
          ? savedPage
          : surahFirstPage;
        document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
        document.getElementById('quran-section')?.classList.remove('d-none');
        window.scrollTo(0, 0);
        window.history.pushState({ section: 'quran' }, '', '/quran');
        document.querySelectorAll('.bottom-nav-item').forEach(btn => btn.classList.remove('active'));
        document.getElementById('bnav-quran')?.classList.add('active');
        await window.loadQuranPage(targetPage, currentSurah, currentAyah);
      } else {
        window.showSection('khatmah');
      }
    } else {
      showAlert('error', 'تعذر تحميل الختمة');
    }
  }
};

window.loadQuranPage = loadQuranPage;
window.startSurahReading = startSurahReading;
window.changePassword = changePassword;
window.forgotPasswordHandler = forgotPassword;

// ─── 9. Live Audio Player ─────────────────────────────────────────────────────
window.playLiveAudio = (url, btnId) => {
  if (isLiveTracking) { showAlert('error', 'أوقف التسميع أولاً قبل تشغيل الصوت'); return; }
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
    } catch (e) { console.error("🔴 [CHUNK ERROR]", e.message); }
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

// ══════════════════════════════════════════════════════════════════════════════
// ─── Auto Scroll ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
let _autoScrollTimer  = null;
let _scrollSpeedLevel = 2;
const SCROLL_SPEEDS   = [0, 40, 25, 15, 8, 4];

function _isOnQuranPage() {
  const qs = document.getElementById('quran-section');
  return qs && !qs.classList.contains('d-none');
}

window.toggleAutoScroll = function() {
  _autoScrollTimer ? _stopAutoScroll() : _startAutoScroll();
};

function _startAutoScroll() {
  if (!_isOnQuranPage()) return;
  const btn = document.getElementById('btn-autoscroll');
  const ctl = document.getElementById('autoscroll-controls');
  const fab = document.getElementById('autoscroll-fab');
  if (btn) { btn.classList.add('active'); btn.innerHTML = '<i class="fas fa-pause me-1"></i> إيقاف'; }
  if (ctl) ctl.classList.replace('d-none', 'd-flex');
  if (fab) fab.classList.add('visible');
  _runScrollLoop();
}

function _stopAutoScroll() {
  if (_autoScrollTimer) { clearTimeout(_autoScrollTimer); _autoScrollTimer = null; }
  const btn = document.getElementById('btn-autoscroll');
  const ctl = document.getElementById('autoscroll-controls');
  const fab = document.getElementById('autoscroll-fab');
  if (btn) { btn.classList.remove('active'); btn.innerHTML = '<i class="fas fa-scroll me-1"></i> تمرير تلقائي'; }
  if (ctl) ctl.classList.replace('d-flex', 'd-none');
  if (fab) fab.classList.remove('visible');
}

function _runScrollLoop() {
  if (!_isOnQuranPage()) { _stopAutoScroll(); return; }
  const delay = SCROLL_SPEEDS[_scrollSpeedLevel] || 25;
  _autoScrollTimer = setTimeout(() => {
    if (!_isOnQuranPage()) { _stopAutoScroll(); return; }
    const maxY = document.body.scrollHeight - window.innerHeight;
    if (window.scrollY >= maxY - 5) {
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
      window.scrollBy(0, 1);
      _runScrollLoop();
    }
  }, delay);
}

window.changeScrollSpeed = function(dir) {
  _scrollSpeedLevel = Math.max(1, Math.min(5, _scrollSpeedLevel + dir));
  const lbl = document.getElementById('scroll-speed-label');
  if (lbl) lbl.textContent = _scrollSpeedLevel;
};

function _pauseAutoScrollOnManualNav() { if (_autoScrollTimer) _stopAutoScroll(); }

// ─── 15. Nav Buttons ──────────────────────────────────────────────────────────
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

  // خريطة التوجيه (Route Map) - تربط الرابط باسم القسم
  const routeMap = {
    '/':              'home',
    '/index.html':    'home',
    '/signup':        'signup',
    '/login':         'login',
    '/forgot-password': 'forgot-password', // إضافة نسيان كلمة المرور
    '/reciters':      'reciters',
    '/bookmarks':     'bookmarks',
    '/my-bookmarks':  'bookmarks',
    '/khatmah':       'khatmah',
    '/profile':       'profile',
    '/live-recitation': 'live-recitation',
    '/ai-correction': 'ai-correction',
    '/surah-index':   'surah-index',
    '/admin':         'admin',
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
        if (urlObj.pathname.startsWith('/resetPassword/')) {
            const token = urlObj.pathname.split('/').pop();
            window.currentResetToken = token; // حفظ التوكن في الذاكرة
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
      console.log('✅ [FRIDAY] تنبيه سورة الكهف مجدول');
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
  // على الويب نستخدم setTimeout لليوم الحالي فقط (لا يوجد persistent notifications)
  const now = new Date();
  const isFriday = now.getDay() === 5;
  const hour = now.getHours();

  // لو النهارده جمعة وقبل الساعة 12 ظهراً - نعرض تذكير
  if (isFriday && hour < 12) {
    // تحقق إذا أُظهر التذكير بالفعل اليوم
    const lastShown = localStorage.getItem('kahf_reminder_shown');
    const today     = now.toDateString();

    if (lastShown !== today) {
      // نأجره 5 ثوانٍ بعد فتح التطبيق حتى لا يزعج المستخدم فوراً
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



// ─── 18. DOMContentLoaded ─────────────────────────────────────────────────────
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

  }else if (initialPath.startsWith('/resetPassword/')) {
    const token = initialPath.split('/').pop();
    window.currentResetToken = token;
    window.showSection('reset-password');
  }else if (initialPath.startsWith('/quran')) {
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

  // ─── Form Handlers ──────────────────────────────────────────────────────
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
  handleForm('updateUserForm', () => {
    const name  = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    updateSettings({ name, email }, 'data');
  });
  handleForm('resetPasswordFormPage', () => {
    const newPass = document.getElementById('reset-new-password').value;
    const confirmPass = document.getElementById('reset-confirm-password').value;
    
    if (newPass.length < 8) return showAlert('error', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    if (newPass !== confirmPass) return showAlert('error', 'كلمتا المرور غير متطابقتين');
    if (!window.currentResetToken) return showAlert('error', 'رابط غير صالح أو مفقود التوكن');

    // استدعاء دالة resetPassword من auth.js
    resetPassword(window.currentResetToken, newPass, confirmPass);
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
    const volumeControlAi = document.getElementById('volume-control-ai'); // ← جوا الـ observer
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

  console.log(Capacitor.isNativePlatform() ? '📱 Mobile Mode Active' : '🌐 Web Mode Active');
  scheduleWebFridayReminder();

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