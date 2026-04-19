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
import { login, logout, signup, verifyOTP, updateSettings, forgotPassword, resetPassword, deleteUser, showAlert, changePassword,deleteUserForuser,resendOTP } from './auth';
import { 
  loadSurahs, startSurahReading, manageKhatmah, createKhatmah, updateKhatmahProgress,
  checkRecitation, loadReciters, loadPrayers, loadBookmarks, loadQuranPage,
  toggleBookmark, deleteBookmark, deleteKhatmah, initSearch, initBookmarksSearch,scheduleFridayKahfNotification,scheduleDuhaNotification,scheduleAllPrayers,checkAndPromptNotifications,
  shareAyah, scheduleIslamicEvents,loadDailyQuiz,scheduleDailyQuizNotification,loadRadioStations
} from './features';
import './insights';

import { surahNames, surahPageMap,surahAyahCounts, juzData, getSurahNameByPage } from './constants';



if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.log = function () {};
    console.info = function () {};
    console.warn = function () {}; 
    // console.error = function () {};
}

// ─── 1. Config 
// axios.defaults.baseURL = 'https://aqra-app.serveftp.com';
//axios.defaults.baseURL = 'https://aqraapp.com';
// axios.defaults.baseURL ='http://127.0.0.1:3000';
// تحديد هل نحن في بيئة التطوير أم الإنتاج
// لو بتستخدم Webpack أو Create React App أو أداة مشابهة:
const isDev = process.env.NODE_ENV !== 'production'; 
// ملاحظة: لو بتستخدم Vite، استبدل السطر اللي فوق بـ: const isDev = import.meta.env.DEV;

const DEV_IP = '192.168.1.8';

const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
const isLocalWeb = !isNative && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');

// تحديد الـ Base URL بناءً على بيئة التشغيل
if (isLocalWeb) {
    // 🌐 لو بتفتح من المتصفح على جهازك (تطوير)
    axios.defaults.baseURL = 'http://127.0.0.1:3000';
} else if (isNative && isDev && DEV_IP !== '') {
    // 📱 لو بتشغل الموبايل في وضع (التطوير) فقط بيكلم جهازك المحلي
    axios.defaults.baseURL = `http://${DEV_IP}:3000`;
} else {
    // 🚀 الإنتاج (الويب المرفوع + الموبايل الحقيقي للمستخدمين)
    axios.defaults.baseURL = 'https://aqraapp.com';
}

// إرسال الـ Cookies مع الموبايل (للـ Authentication إن وُجد)
axios.defaults.withCredentials = Capacitor.isNativePlatform();
const OFFLINE_HANDLED_URLS = [
  '/api/v1/bookmarks',
  '/api/v1/khatmah',
  '/api/v1/audio/reciters',
  '/api/v1/quran',
  '/api/v1/prayers',
  '/api/v1/users/me',
  '/api/v1/prayers/get-location',
  '/api/v1/quiz/today'
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
  toast: true,
  position: 'top',
  icon: 'warning',
  title: '📶 لا يوجد اتصال بالإنترنت',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
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
          console.warn('⚠️ [OFFLINE QUEUE] جلسة منتهية - مسح الـ queue');
          await localforage.setItem('offline_actions_queue', []);
          Swal.fire({
            toast: true, position: 'top-end', icon: 'warning',
            title: 'انتهت جلستك - يرجى تسجيل الدخول مجدداً',
            showConfirmButton: false, timer: 4000
          });
          break;
        }
        if (!err.response || err.response.status >= 500) {
          failed.push(action);
        }
      }
    }

    await localforage.setItem('offline_actions_queue', failed);

    if (successCount > 0) {
  // بعد الزامنة، نحدث الكاش من السيرفر
  try {
    const freshRes = await axios.get('/api/v1/bookmarks');
    const freshBookmarks = freshRes.data.data.bookmarks;
    await localforage.setItem('offline_bookmarks', freshBookmarks);
    // FIX BUG 2: حدّث الـ in-memory cache
    window._cachedBookmarks = freshBookmarks;
    console.log(`🔄 [SYNC] تم تحديث كاش العلامات بعد الزامنة (${freshBookmarks.length} علامة)`);
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
 const clearExpiredNotifications = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const pending = await LocalNotifications.getPending();
      const now = Date.now();
      
      // العثور على الإشعارات المجدولة التي مر وقتها بالفعل
      const expired = pending.notifications
        .filter(n => n.schedule && n.schedule.at && new Date(n.schedule.at).getTime() <= now)
        .map(n => ({ id: n.id }));
        
      if (expired.length > 0) {
        await LocalNotifications.cancel({ notifications: expired });
        console.log(`🧹 [NOTIFICATIONS] تم مسح ${expired.length} إشعار قديم فات وقته لمنع الإزعاج.`);
      }
    } catch (e) {
      console.warn('Error clearing expired notifications:', e);
    }
  };

window.addEventListener('online', async () => {
  Swal.fire({
    toast: true, position: 'top', icon: 'success',
    title: '✅ عاد الاتصال بالإنترنت',
    showConfirmButton: false, timer: 3000, timerProgressBar: true
  });
  await clearExpiredNotifications();
  setTimeout(() => processOfflineQueue(), 2000);
});

// دالة لجلب الإعدادات الديناميكية من السيرفر
const fetchDynamicSettings = async () => {
    try {
        // بنضيف وقت عشان نمنع الكاش القديم
        const res = await axios.get(`/version.json?t=${new Date().getTime()}`);
        if (res.data && res.data.shareUrl) {
            localStorage.setItem('dynamic_share_url', res.data.shareUrl);
        }
    } catch (e) {
        console.log("لم يتم تحديث الرابط الديناميكي، سيتم استخدام الرابط الافتراضي");
    }
};

// إتاحتهم على مستوى التطبيق بالكامل
window.surahNames = surahNames;
window.surahAyahCounts = surahAyahCounts;
window.surahPageMap = surahPageMap;

// ─── 2. دالة التحويل (مربوطة بـ window عشان ميديناش Error) ───
window.getSurahAndAyahFromAbsolute = function(absoluteAyahNumber) {
    if (!window.surahAyahCounts || !window.surahNames) {
        console.error("❌ مصفوفات السور غير موجودة!");
        return { surahNum: 1, ayahNum: 1, surahName: "الفاتحة" };
    }

    let currentSum = 0;
    for (let i = 0; i < window.surahAyahCounts.length; i++) {
        const count = window.surahAyahCounts[i];
        if (absoluteAyahNumber <= currentSum + count) {
            return {
                surahNum: i + 1,
                ayahNum: absoluteAyahNumber - currentSum,
                surahName: window.surahNames[i]
            };
        }
        currentSum += count;
    }
    return { surahNum: 1, ayahNum: 1, surahName: "الفاتحة" };
};

// ─── 3. دالة الضغط على الآية ───
window.handleAyahClick = async function(absoluteAyahId, pageNum) {
    // 1. حماية: التأكد من وجود دالة التحويل
    if (typeof window.getSurahAndAyahFromAbsolute !== 'function') {
        console.error("⚠️ دالة getSurahAndAyahFromAbsolute غير موجودة!");
        return;
    }
    
    // استدعاء دالة التحويل
    const { surahNum, ayahNum, surahName } = window.getSurahAndAyahFromAbsolute(parseInt(absoluteAyahId));
    
    // 2. حماية: جلب النص الحقيقي بـ try-catch لتجنب توقف التطبيق عند انقطاع النت
    let pageData = window._pageCache && window._pageCache[pageNum];
    if (!pageData) {
        try {
            const res = await fetch(`/assets/quran_pages/${pageNum}.json`);
            if (!res.ok) throw new Error("Network response was not ok");
            const data = await res.json();
            pageData = data?.data?.ayahs || data?.ayahs || [];
            if(!window._pageCache) window._pageCache = {};
            window._pageCache[pageNum] = pageData;
        } catch (error) {
            console.error("❌ خطأ في جلب بيانات الآية:", error);
            pageData = []; // مصفوفة فارغة لتجنب الـ Error لاحقاً
        }
    }

    const ayahData = pageData.find(a => 
        (a.ayahNumber || a.numberInSurah) == ayahNum && 
        (a.surah?.number || a.surahNumber) == surahNum
    );

    const ayahText = ayahData ? (ayahData.text || ayahData.ayahText) : "نص الآية غير متوفر";

    // التحقق من العلامات المرجعية
    let userBookmarks = window._cachedBookmarks || [];
    if (userBookmarks.length === 0 && typeof localforage !== 'undefined') {
        userBookmarks = await localforage.getItem('offline_bookmarks') || [];
    }
    const isBookmarked = userBookmarks.some(b => parseInt(b.surah) === surahNum && parseInt(b.ayah) === ayahNum);

    // تحديث البيانات المختارة
    window.selectedVerseData = { 
        surah: surahNum, 
        ayah: ayahNum, 
        surahName: surahName, 
        text: ayahText, // النص المظبوط للـ Share
        isBookmarked: isBookmarked 
    };

    // تحديث الواجهة (Label)
    const sheetLabel = document.getElementById('verseActionSheetLabel');
    if(sheetLabel) sheetLabel.innerText = `سورة ${surahName} - آية ${ayahNum}`;
    
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

  // 7. إظهار القائمة (Bottom Sheet) مع إصلاح مشكلة الـ Fullscreen
    const sheetEl = document.getElementById('verseActionSheet');
    if (sheetEl && window.bootstrap) {
        
        if (document.activeElement) document.activeElement.blur();

        // 🔥 السحر هنا: نقل الـ Action Sheet ليكون داخل العنصر الذي يملأ الشاشة 🔥
        const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
        
        // إذا كنا في وضع الشاشة الكاملة، والـ sheetEl ليس داخل العنصر المعروض
        if (fullscreenElement && !fullscreenElement.contains(sheetEl)) {
            fullscreenElement.appendChild(sheetEl);
        } else if (!fullscreenElement && sheetEl.parentElement !== document.body) {
            // إذا لم نكن في شاشة كاملة، نرجعه لجسم الصفحة (body) لتجنب أي أخطاء تصميمية
            document.body.appendChild(sheetEl);
        }
        
        // تعديل بسيط في CSS القائمة لضمان ظهورها فوق المصحف المصور
        sheetEl.style.zIndex = "105000"; 
        
        // إذا كانت القائمة تحتوي على خلفية مظلمة (Backdrop) من Bootstrap، قد نحتاج لرفع الـ z-index لها أيضاً
        // Bootstrap يضع الـ Backdrop في الـ body مباشرة، سنحاول نقله أيضاً لو كنا في الشاشة الكاملة
        const bsSheet = bootstrap.Offcanvas.getInstance(sheetEl) || new bootstrap.Offcanvas(sheetEl);
        
        // استخدام حدث 'show.bs.offcanvas' لالتقاط الـ Backdrop ونقله
        sheetEl.addEventListener('show.bs.offcanvas', function () {
            setTimeout(() => {
                const backdrop = document.querySelector('.offcanvas-backdrop');
                if (backdrop && fullscreenElement && !fullscreenElement.contains(backdrop)) {
                    fullscreenElement.appendChild(backdrop);
                    backdrop.style.zIndex = "104000"; // تحت القائمة مباشرة
                }
            }, 10);
        }, { once: true }); // مرة واحدة لكل ضغطة

        bsSheet.show();
    }
};



// ─── 2. Global State ──────────────────────────────────────────────────────────
window.currentAudio = null;
let aiMediaRecorder = null;
window.currentPage  = 1;

let liveStream = null;
let isLiveTracking = false;
let chunkRecorder = null;
let chunkTimeout = null;
let searchStartIndex = 0;    

window.deleteUserForuser = deleteUserForuser;

// ═══ FIX BUG 2: تهيئة الـ in-memory cache للختمة والعلامات ═══
// يُقرأ مرة واحدة عند أول فتح للمصحف ويُحدَّث عند أي تغيير
window._cachedKhatmah   = null;
window._cachedBookmarks = [];
window._cacheLoadedAt   = 0;

// دالة تحديث الكاش في الخلفية (تُستدعى عند فتح المصحف)
window._refreshSwipePageCache = async () => {
  try {
    if (typeof localforage !== 'undefined') {
      const [k, b] = await Promise.all([
        localforage.getItem('latest_khatmah'),
        localforage.getItem('offline_bookmarks')
      ]);
      window._cachedKhatmah   = k   ?? null;
      window._cachedBookmarks = b   ?? [];
      window._cacheLoadedAt   = Date.now();
    }
  } catch(e) { /* تجاهل */ }
};



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
async function loadAppVersion() {
    const versionBadge = document.getElementById('app-version-badge');
    if (!versionBadge) return;

    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        try {
            // استدعاء معلومات التطبيق من الأندرويد مباشرة
            const App = window.Capacitor.Plugins.App;
            const info = await App.getInfo();
            
            // info.version هتجيب "1.5.0" من ملف build.gradle
            versionBadge.innerText = `الإصدار ${info.version}`;
        } catch (error) {
            console.error('خطأ في جلب رقم الإصدار:', error);
            versionBadge.innerText = 'الإصدار 1.5.0'; // رقم احتياطي لو حصل خطأ
        }
    } else {
        // لو المستخدم فاتح من متصفح الويب العادي
        versionBadge.innerText = 'الإصدار 1.5.0 (Web)';
    }
}
window.switchReciterTab = (tab) => {
    const listPane = document.getElementById('reciters-list-pane');
    const livePane = document.getElementById('live-stream-pane');
    const btnList = document.getElementById('tab-btn-reciters');
    const btnLive = document.getElementById('tab-btn-live');

    if (tab === 'list') {
        listPane.classList.remove('d-none');
        livePane.classList.add('d-none');
        btnList.classList.add('active');
        btnList.classList.remove('text-dark');
        btnLive.classList.remove('active');
        btnLive.classList.add('text-dark');
        
        // إيقاف البث المباشر إذا رجع لقائمة القراء
        const makkahVid = document.getElementById('makkah-video');
        const madinahVid = document.getElementById('madinah-video');
        if (makkahVid) makkahVid.pause();
        if (madinahVid) madinahVid.pause();

    } else {
        listPane.classList.add('d-none');
        livePane.classList.remove('d-none');
        btnLive.classList.add('active');
        btnLive.classList.remove('text-dark');
        btnList.classList.remove('active');
        btnList.classList.add('text-dark');
        
        // إيقاف أي صوت شغال (القرآن/الراديو)
        if (typeof stopAllMedia === 'function') stopAllMedia();

        // 🌟 تشغيل البث المباشر
        initLiveStreams();
    }
};

// 🌟 دالة تهيئة مشغل البث المباشر الذكي (مع نظام البدائل والتبديل التلقائي بين القنوات)
window.initLiveStreams = async () => {
    try {
        // 1. جلب قائمة الروابط من الباك إيند
        const res = await axios.get('/api/v1/audio/livetv');
        const streams = res.data.data;

        // 2. دالة التشغيل الذكية للتعامل مع الـ Fallbacks
        const setupVideo = (videoId, urlsArray) => {
            const video = document.getElementById(videoId);
            const errorOverlay = document.getElementById(videoId.replace('-video', '-error'));

            if (!video || !urlsArray || urlsArray.length === 0) {
                if (errorOverlay) errorOverlay.classList.remove('d-none');
                return;
            }

            // 🌟🌟 الإضافة الجديدة: إيقاف القنوات الأخرى عند تشغيل هذه القناة 🌟🌟
            video.addEventListener('play', () => {
                // نجيب كل الفيديوهات اللي جوه قسم البث المباشر
                const allLiveVideos = document.querySelectorAll('#live-stream-pane video');
                allLiveVideos.forEach(otherVideo => {
                    // لو الفيديو التاني ده مش هو الفيديو اللي دسنا عليه Play، اعمله Pause
                    if (otherVideo !== video && !otherVideo.paused) {
                        otherVideo.pause();
                    }
                });
            });
            // 🌟🌟 نهاية الإضافة 🌟🌟

            let currentUrlIndex = 0;
            let hls;

            const loadStream = () => {
                if (errorOverlay) errorOverlay.classList.add('d-none');
                const currentStreamUrl = urlsArray[currentUrlIndex];
                console.log(`📡 جاري تشغيل ${videoId} من الرابط:`, currentStreamUrl);

                if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                    if (hls) hls.destroy();

                    // إنشاء المشغل بخصائص افتراضية نظيفة
                    // إنشاء المشغل بخصائص قوية للموبايل
                    hls = new Hls({
                        maxMaxBufferLength: 30, 
                        liveSyncDurationCount: 3,
                        // 🌟 الحل الجذري למوبايل 🌟
                        xhrSetup: function(xhr, url) {
                            // لو Capacitor حاول يغير الرابط לـ localhost، نرجعه لأصله
                            if (url.includes('localhost') || url.includes('_capacitor_http_interceptor_')) {
                                try {
                                    // استخراج الرابط الأصلي من داخل رابط Capacitor المعقد
                                    const originalUrlParam = new URL(url).searchParams.get('u');
                                    let finalUrl = originalUrlParam ? decodeURIComponent(originalUrlParam) : url;
                                    
                                    // لو الرابط لسة بايز وبيشاور على localhost (زي chunklist)
                                    if (finalUrl.includes('localhost')) {
                                        const baseUrl = currentStreamUrl.substring(0, currentStreamUrl.lastIndexOf('/') + 1);
                                        const fileName = finalUrl.substring(finalUrl.lastIndexOf('/') + 1);
                                        finalUrl = baseUrl + fileName;
                                    }
                                    
                                    xhr.open('GET', finalUrl, true);
                                } catch (e) {
                                    // في حالة الفشل، نحاول بالطريقة اليدوية
                                    const baseUrl = currentStreamUrl.substring(0, currentStreamUrl.lastIndexOf('/') + 1);
                                    const fileName = url.substring(url.lastIndexOf('/') + 1);
                                    xhr.open('GET', baseUrl + fileName, true);
                                }
                            }
                        }
                    });

                    hls.loadSource(currentStreamUrl);
                    hls.attachMedia(video);

                    hls.on(Hls.Events.ERROR, function(event, data) {
                        if (data.fatal) {
                            console.warn(`⚠️ فشل الرابط الحالي لـ ${videoId}`, data);
                            
                            // الانتقال للرابط البديل
                            currentUrlIndex++;
                            if (currentUrlIndex < urlsArray.length) {
                                console.log(`🔄 التبديل للرابط البديل لـ ${videoId}...`);
                                loadStream(); // المحاولة بالرابط التالي
                            } else {
                                console.error(`❌ جميع الروابط فشلت لـ ${videoId}`);
                                if (errorOverlay) errorOverlay.classList.remove('d-none');
                                hls.destroy();
                            }
                        }
                    });
                } 
                // دعم أجهزة أبل (iOS/Safari)
                else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = currentStreamUrl;
                    video.addEventListener('error', () => {
                        currentUrlIndex++;
                        if (currentUrlIndex < urlsArray.length) {
                            loadStream();
                        } else {
                            if (errorOverlay) errorOverlay.classList.remove('d-none');
                        }
                    }, { once: true });
                }
            };

            loadStream(); // إطلاق شرارة البدء
        };

        // تشغيل مكة والمدينة
        setupVideo('makkah-video', streams.makkah);
        setupVideo('madinah-video', streams.madinah);

    } catch (err) {
        console.error("❌ خطأ في جلب روابط البث المباشر من السيرفر", err);
        const makkahError = document.getElementById('makkah-error');
        const madinahError = document.getElementById('madinah-error');
        if (makkahError) makkahError.classList.remove('d-none');
        if (madinahError) madinahError.classList.remove('d-none');
    }
};
// ─── 🌟 دالة التبديل بين تبويبات المسابقة ───
window.switchQuizTab = (tabName) => {
    const quizPane = document.getElementById('quiz-pane');
    const leaderboardPane = document.getElementById('leaderboard-pane');
    const tabBtnQuiz = document.getElementById('tab-btn-quiz');
    const tabBtnLeaderboard = document.getElementById('tab-btn-leaderboard');

    if (tabName === 'quiz') {
        // إظهار المسابقة وإخفاء لوحة الشرف
        quizPane.classList.remove('d-none');
        leaderboardPane.classList.add('d-none');
        
        // تفعيل زر المسابقة
        tabBtnQuiz.classList.add('active');
        tabBtnQuiz.classList.remove('text-dark');
        // إلغاء تفعيل زر لوحة الشرف
        tabBtnLeaderboard.classList.remove('active');
        tabBtnLeaderboard.classList.add('text-dark');
    } else {
        // إظهار لوحة الشرف وإخفاء المسابقة
        quizPane.classList.add('d-none');
        leaderboardPane.classList.remove('d-none');
        
        // تفعيل زر لوحة الشرف
        tabBtnLeaderboard.classList.add('active');
        tabBtnLeaderboard.classList.remove('text-dark');
        // إلغاء تفعيل زر المسابقة
        tabBtnQuiz.classList.remove('active');
        tabBtnQuiz.classList.add('text-dark');
    }
};
window.submitToLeaderboard = async (score, total, dateStr) => {
    const nameInput = document.getElementById('leaderboard-name').value.trim();
    const statusDiv = document.getElementById('leaderboard-status');
    const btn = document.getElementById('submit-score-btn');

    if (!nameInput) {
        statusDiv.innerHTML = '<span class="text-danger">يرجى كتابة اسمك أولاً!</span>';
        return;
    }

    // حفظ الاسم للمرات القادمة
    localStorage.setItem('quiz_nickname', nameInput);

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // إرسال النتيجة للباك إيند
        await axios.post('/api/v1/quiz/leaderboard', {
            name: nameInput,
            score: score,
            total: total,
            date: dateStr
        });

        statusDiv.innerHTML = '<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i> تم تسجيل نتيجتك بنجاح!</span>';
        btn.innerHTML = 'تم ✓';
        
        // 🌟 التعديل هنا: إعادة تحميل الصفحة بعد ثانية ونص عشان يشوف اسمه في لوحة الشرف فوق!
        setTimeout(() => {
            if (typeof window.loadDailyQuiz === 'function') {
                window.loadDailyQuiz(); // تحديث الداتا
            }
            window.switchQuizTab('leaderboard'); // 👈 ينقله لتاب لوحة الشرف أوتوماتيك
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        }, 1500);

    } catch (error) {
        btn.disabled = false;
        btn.innerHTML = 'شارك';
        statusDiv.innerHTML = '<span class="text-danger">حدث خطأ في الاتصال، حاول مرة أخرى.</span>';
    }
};
document.addEventListener('DOMContentLoaded', () => {
  fetchDynamicSettings();
  loadRadioStations();
   loadAppVersion()
  window.loadDailyQuiz = loadDailyQuiz;
    // setTimeout(() => { downloadEntireQuranOffline(); }, 3000);
    setTimeout(() => { window.downloadEntireTafseerOffline(); }, 10000);
    // setTimeout(() => { checkAndPromptNotifications(); }, 2000);
    // ─── تنظيف الإشعارات القديمة لمنع ظاهرة (انفجار الإشعارات) ─────────────────
 


 // تنفيذ التنظيف عندما يعود التطبيق للواجهة (App Resume)
  if (Capacitor.isNativePlatform()) {
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        console.log('📱 [APP] Resumed, clearing old notifications...');
        await clearExpiredNotifications();
        
        // 🌟 الإضافة هنا: تشييك سريع على رصيد إشعارات المسابقة وتجديدها لو لزم الأمر
        if (typeof scheduleDailyQuizNotification === 'function') {
            await scheduleDailyQuizNotification();
        }
      }
    });
  }

    // التأكد إننا على تطبيق موبايل عشان الإشعارات متعملش إيرور على الويب
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
        
        // ─── مستمع واحد ذكي لكل الإشعارات ───
        LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
            const notification = action.notification;
            const extraData = notification.extra || {}; // جلب البيانات الإضافية إن وجدت

            
            // 1. حالة الضغط على إشعار "الورد اليومي للختمة"
            
            if (notification.id === 999 || notification.actionTypeId === 'OPEN_KHATMAH') {
                const khatmahNavBtn = document.getElementById('bnav-khatmah'); // تأكد من الـ ID
                if (khatmahNavBtn) {
                    khatmahNavBtn.click(); // فتح قسم الختمة
                }
                if (typeof manageKhatmah === 'function') {
                    await manageKhatmah(); // تحديث البيانات
                }
            }

            
            // 2. حالة الضغط على إشعار "سورة الكهف يوم الجمعة"
            
            else if (extraData.target === 'kahf') {
                // توجيه المستخدم لقسم المصحف
                if (typeof window.showSection === 'function') {
                    window.showSection('quran');
                }
                
                // فتح صفحة سورة الكهف والنزول للآية الأولى
                if (typeof window.loadQuranPage === 'function') {
                    window.loadQuranPage(extraData.page, extraData.surah, extraData.ayah);
                } else if (typeof loadQuranPage === 'function') {
                    loadQuranPage(extraData.page, extraData.surah, extraData.ayah);
                }
                
                // عرض رسالة ترحيبية خفيفة
                setTimeout(() => {
                    if (typeof showAlert === 'function') {
                        showAlert('success', 'تقبل الله طاعتك.. جمعة مباركة ✨');
                    }
                }, 1000);
            }
            
            
            // 🌟 3. الحالة الجديدة: الضغط على إشعار التحديث الجديد 🌟
            
            else if (extraData.type === 'update' && extraData.url) {
                try {
                    // فتح رابط التحديث (جوجل بلاي) مباشرة
                    if (typeof Browser !== 'undefined') {
                        await Browser.open({ url: extraData.url });
                    } else {
                        window.open(extraData.url, '_system');
                    }
                } catch (e) {
                    console.error("فشل فتح رابط التحديث:", e);
                }
              }else if (extraData && extraData.target === 'quiz') {
        if (typeof window.showSection === 'function') {
            window.showSection('quiz'); // تأكد إن الـ ID في الـ HTML هو quiz-section
        }
        // تأخير بسيط للتأكد من تحميل الشاشة
        setTimeout(() => {
            if (typeof loadDailyQuiz === 'function') {
                loadDailyQuiz();
            }
        }, 300);
    }
            
        });
    }
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
window.stopAllMedia = () => {
  console.log("🔴 [SYSTEM] Stopping all media...");

  // 1. إيقاف صوت صفحة "تسجيلاتي" وإرجاع الزرار لشكله الطبيعي
  if (window.currentPlayingAudio) { 
      window.currentPlayingAudio.pause(); 
      if (window.currentPlayingBtn) {
          window.currentPlayingBtn.innerHTML = '<i class="fas fa-play me-1"></i> تشغيل';
          window.currentPlayingBtn.disabled = false;
      }
      window.currentPlayingAudio = null; 
      window.currentPlayingBtn = null;
  }

  // 2. إيقاف الصوت العام (لو مستخدم في حتة تانية)
  if (window.currentAudio) { 
      window.currentAudio.pause(); 
      window.currentAudio = null; 
  }

  if (typeof window.stopSheikhFollowAlong === 'function') {
      window.stopSheikhFollowAlong();
  }
  
  if (typeof window.stopAzkarAudio === 'function') window.stopAzkarAudio();
  
  // 3. إيقاف كل المشغلات المخفية (زي صفحة القراء)
  document.querySelectorAll('audio, video').forEach(m => { 
      m.pause(); 
      // ملحوظة: شيلنا m.currentTime = 0 عشان لو هو عامل Pause يفضل محتفظ بمكانه
  });

  if (typeof aiMediaRecorder !== 'undefined' && aiMediaRecorder && aiMediaRecorder.state !== 'inactive') {
    aiMediaRecorder.stop();
    if (aiMediaRecorder.stream) aiMediaRecorder.stream.getTracks().forEach(t => t.stop());
    aiMediaRecorder = null;
  }
  
  if (typeof isLiveTracking !== 'undefined') isLiveTracking = false;
  if (typeof chunkTimeout !== 'undefined') clearTimeout(chunkTimeout);
  
  if (typeof chunkRecorder !== 'undefined' && chunkRecorder && chunkRecorder.state !== 'inactive') {
      try { chunkRecorder.stop(); } catch(e){}
  }
  
  if (typeof liveStream !== 'undefined' && liveStream) {
      liveStream.getTracks().forEach(t => t.stop());
      liveStream = null;
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
      if (typeof resetUIButtons === 'function') resetUIButtons();
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
   const searchWrapper = document.querySelector('.surah-search-wrapper');
    if (searchWrapper) searchWrapper.style.display = '';
  const container = document.getElementById('surah-index-list');
  if (!container || container.children.length > 0) return;
  surahNames.forEach((name, i) => {
    const pageNum = surahPageMap[i] || 1;
     const ayahCount = surahAyahCounts[i] || '';
     
    container.insertAdjacentHTML('beforeend', `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="card shadow-sm h-100 p-2 text-center hover-shadow border-success"
          style="cursor:pointer;transition:transform .2s"
         onclick="window.showSection('quran'); window.loadQuranPage(${pageNum}, ${i + 1}, 1);">
          <div class="card-body p-2">
            <span class="badge bg-light text-dark mb-1 border rounded-circle">${i + 1}</span>
            <h6 class="card-title fw-bold text-success mb-0" style="font-family:'Amiri'">${name}</h6>
            <small class="text-muted" style="font-size:.7rem">صفحة ${pageNum}</small>
            <small class="text-success d-block" style="font-size:.7rem;font-weight:600;">${ayahCount} آية</small>
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
  // 🌟 التعديل: إيقاف أي صوت شغال بأمان تام قبل الانتقال لأي صفحة
  if (typeof window.stopAllMedia === 'function') {
      window.stopAllMedia();
  }
  
  // السطر السحري: إجبار الخروج من الشاشة الكاملة عند الانتقال لأي صفحة أخرى 
  // لكن لو المستخدم في وضع المصحف المصور نسيبه
  if (sectionName !== 'quran' || window._imageMushafActive !== true) {
    document.body.classList.remove('fullscreen-reading');
  }
  const quranBook = document.getElementById('quran-book');
  if (quranBook) quranBook.classList.remove('no-transition');

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
    // FIX BUG 2: حدّث الكاش في الخلفية بدون تعليق الـ UI
    if (typeof window._refreshSwipePageCache === 'function') {
      window._refreshSwipePageCache().catch(() => {});
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
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
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
// ─── دالة سحرية لتنظيف الشاشة من أي ألوان أو أخطاء ────────────────────────
window.resetAyahsUI = () => {
    const isMemMode = document.getElementById('memorize-mode')?.checked;
    document.querySelectorAll('.live-ayah-item').forEach(el => {
        el.classList.remove('ayah-active');
        const textContainer = el.querySelector('.live-ayah-text');
        if (textContainer) {
            textContainer.style.backgroundColor = '';
            textContainer.style.padding = '';
        }
        // تنظيف كل الكلمات المفتتة
        el.querySelectorAll('.live-word').forEach(span => {
            span.style.color = '';
            span.style.backgroundColor = '';
            span.style.fontWeight = 'normal';
            span.style.padding = '';
            span.style.borderRadius = '';
            // الحفاظ على وضع الحفظ لو كان شغال
            if (isMemMode) span.classList.add('blurred-text');
            else span.classList.remove('blurred-text');
        });
    });
};

// ─── 9. Live Audio Player ─────────────────────────────────────────────────────
window.playLiveAudio = (url, btnId) => {
  // 1. منع التشغيل أثناء وضع "التسميع" (الميكروفون)
  if (isLiveTracking) { 
      showAlert('error', 'أوقف التسميع أولاً قبل تشغيل الصوت'); 
      return; 
  }

  // 2. 🌟 التعديل الجديد: منع التشغيل أثناء وضع "اقرأ مع الشيخ" 🌟
  if (typeof _sheikPlaybackActive !== 'undefined' && _sheikPlaybackActive) {
      Swal.fire({
          icon: 'warning',
          title: 'الشيخ يقرأ الآن',
          text: 'عذراً، لا يمكنك تشغيل آية مفردة أثناء تشغيل وضع "اقرأ مع الشيخ". يرجى إيقاف الشيخ أولاً أو الانتظار حتى ينتهي.',
          confirmButtonText: 'حسناً فهمت',
          confirmButtonColor: '#198754',
          customClass: { popup: 'rounded-4' }
      });
      return; // نوقف الدالة هنا ومفيش صوت هيشتغل
  }
if(typeof resetAyahsUI === 'function') resetAyahsUI();
  // 3. باقي الكود القديم للتشغيل العادي (زرار الـ Play/Pause)
  const btn = document.getElementById(btnId);
  if (!btn) return;
  
  if (window.currentAudio && btn.classList.contains('playing')) {
    window.currentAudio.pause(); 
    window.currentAudio = null;
    btn.innerHTML = '<i class="fas fa-play"></i>';
    btn.classList.remove('playing', 'btn-danger'); 
    btn.classList.add('btn-outline-success');
    return;
  }
  
  const playNew = () => {
    const audio = new Audio(url); 
    window.currentAudio = audio;
    const p = audio.play();
    
    if (p !== undefined) {
      p.then(() => { 
          btn.innerHTML = '<i class="fas fa-stop"></i>'; 
          btn.classList.add('playing', 'btn-danger'); 
          btn.classList.remove('btn-outline-success'); 
      }).catch(err => { 
          console.warn('Audio play:', err.name); 
          window.currentAudio = null; 
      });
    }
    
    audio.onended = audio.onerror = () => {
      btn.innerHTML = '<i class="fas fa-play"></i>';
      btn.classList.remove('playing', 'btn-danger'); 
      btn.classList.add('btn-outline-success');
      window.currentAudio = null;
    };
  };
  
  if (window.currentAudio) { 
      window.currentAudio.pause(); 
      window.currentAudio = null; 
      resetUIButtons(); 
      setTimeout(playNew, 150); 
  } else {
      playNew();
  }
};

// ─── تعريف المتغيرات العالمية للـ AI ───
let currentWordIndex = 0; // المؤشر اللي بيحفظ إنت واقف فين جوه الآية

// ─── 10. Chunking Logic ────────────────────────────────────────────────────────
async function sendChunkToAPI(blob) {
    const formData = new FormData();
    formData.append('audio', blob, 'chunk.webm');
    
    const surahSelect = document.getElementById('live-surah-select');
    const surahName = surahSelect.options[surahSelect.selectedIndex].text.replace(/[0-9.]/g, '').trim();
    formData.append('surahName', surahName);
    
    const ayahEls = document.querySelectorAll('.live-ayah-item');
    if (searchStartIndex >= ayahEls.length) return; 

    // بناء النص المتوقع من "الكلمة اللي عليها الدور" فقط فصاعداً
    const currentAyahEl = ayahEls[searchStartIndex];
    const wordSpans = currentAyahEl.querySelectorAll('.live-word');
    let expectedContext = "";
    
    // 🌟 التعديل هنا: تحديد سقف الكلمات بـ 10 كلمات كحد أقصى للأمام 🌟
    let wordsLimit = Math.min(currentWordIndex + 10, wordSpans.length);
    for(let i = currentWordIndex; i < wordsLimit; i++) {
        expectedContext += wordSpans[i].dataset.clean + " ";
    }
    
    if (expectedContext.trim() === "") return;
    
    formData.append('expectedContext', expectedContext.trim());

    try {
        let token = null;
        if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
            const pref = await Preferences.get({ key: 'auth_token' });
            token = pref.value;
        } else {
            token = axios.defaults.headers.common['Authorization']?.split(' ')[1];
        }
        
        const config = { headers: {} };
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
        
        const res = await axios.post('/api/v1/quran/stream-check', formData, config);
        
        if (res.data.status === 'success' && res.data.wordByWordResult) {
            highlightWordByWord(res.data.wordByWordResult);
        }
    } catch (e) { 
        console.error("🔴 [CHUNK ERROR]", e.message); 
        if (e.response && e.response.status === 429) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'info', title: 'مهلاً!',
                    text: e.response.data.message || 'يرجى المحاولة لاحقاً.',
                    confirmButtonText: 'حسناً', confirmButtonColor: '#198754' 
                });
            }
            if (typeof stopLiveTracking === 'function') stopLiveTracking();
            if (typeof resetUIButtons === 'function') resetUIButtons(); 
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

window.stopLiveTracking = function() {
    console.log("🛑 جاري إيقاف التتبع وإغلاق الميكروفون...");
    
    // 1. إيقاف حالة التتبع
    if (typeof isLiveTracking !== 'undefined') {
        isLiveTracking = false;
    }
    
    // 2. إيقاف مسجل الـ Chunks
    if (typeof chunkRecorder !== 'undefined' && chunkRecorder && chunkRecorder.state !== 'inactive') {
        chunkRecorder.stop();
    }
    if (typeof chunkTimeout !== 'undefined') {
        clearTimeout(chunkTimeout);
    }

    // 🌟 3. السحر هنا: إغلاق الميكروفون تماماً 🌟
    if (typeof liveStream !== 'undefined' && liveStream) {
        liveStream.getTracks().forEach(track => {
            track.stop(); // إيقاف إجباري لكل قناة صوتية (يغلق اللمبة الحمراء)
        });
        liveStream = null; // تفريغ المتغير
    }

    // 4. إعادة تعيين الواجهة (UI)
    if (typeof resetUIButtons === 'function') {
        resetUIButtons(); 
    }
    
    // إخفاء مؤشر التحميل/التسجيل إن وجد
    const statusEl = document.getElementById('live-status-indicator');
    if (statusEl) statusEl.textContent = '';
};
// ─── دالة التظليل والاستئناف كلمة بكلمة ──────────────────────
function highlightWordByWord(aiFeedback) {
    const { lastCorrectWordIndex, hasMistake } = aiFeedback;
    
    const ayahEls = document.querySelectorAll('.live-ayah-item');
    if (searchStartIndex >= ayahEls.length) return; 
    
    const currentAyahEl = ayahEls[searchStartIndex];
    const wordSpans = currentAyahEl.querySelectorAll('.live-word');
    const isMemMode = document.getElementById('memorize-mode')?.checked;

    let absoluteCorrectIndex = currentWordIndex + lastCorrectWordIndex;

    ayahEls.forEach((el, idx) => {
        if (idx === searchStartIndex) {
            el.classList.add('ayah-active');
            const textContainer = el.querySelector('.live-ayah-text');
            if(textContainer) {
                textContainer.style.backgroundColor = '#f8fdfa';
                textContainer.style.borderRadius = '12px';
                textContainer.style.padding = '10px';
            }
        } else {
            el.classList.remove('ayah-active');
            const textContainer = el.querySelector('.live-ayah-text');
            if(textContainer) { textContainer.style.backgroundColor = ''; textContainer.style.padding = ''; }
        }
    });
    currentAyahEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    wordSpans.forEach((span, index) => {
        // تصفير الستايل
        span.style.color = '';
        span.style.backgroundColor = '';
        span.style.fontWeight = 'normal';
        span.style.padding = '';
        span.style.borderRadius = '';
        span.style.borderBottom = ''; // 🌟 تصفير خط المؤشر

        if (isMemMode) {
            if (index <= absoluteCorrectIndex) span.classList.remove('blurred-text');
            else span.classList.add('blurred-text');
        } else {
            span.classList.remove('blurred-text');
        }

        // 1. الكلمات الصحيحة
        if (index <= absoluteCorrectIndex) {
            span.style.color = '#198754';
            span.style.fontWeight = 'bold';
        }
        
        // 2. الكلمة الخاطئة
        if (hasMistake && index === absoluteCorrectIndex + 1) {
            span.classList.remove('blurred-text');
            span.style.color = '#dc3545';
            span.style.fontWeight = 'bold';
            span.style.backgroundColor = 'rgba(220, 53, 69, 0.15)';
            span.style.borderRadius = '6px';
            span.style.padding = '2px 4px';
        }
        
        // 🌟 3. الإضافة الجديدة: خط أخضر (Cursor) للكلمة التي عليها الدور
        if (!hasMistake && index === absoluteCorrectIndex + 1) {
            span.classList.remove('blurred-text'); // نظهرها حتى في وضع الحفظ
            span.style.borderBottom = '3px solid #198754'; // الخط الأخضر
            span.style.paddingBottom = '2px';
        }
    });

    currentWordIndex = absoluteCorrectIndex + 1;

    if (hasMistake) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true, position: 'bottom', icon: 'error',
                title: 'انتبه.. أعد قراءة الكلمة المظللة ليتم تصحيحها',
                showConfirmButton: false, timer: 3000
            });
        }
    } else if (currentWordIndex >= wordSpans.length) {
        searchStartIndex++;
        currentWordIndex = 0; 
        
        if (searchStartIndex >= ayahEls.length) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'success', title: 'ما شاء الله!', text: 'أتممت تسميع المقطع بنجاح.', confirmButtonColor: '#198754' });
            }
            if (typeof stopLiveTracking === 'function') stopLiveTracking();
            if (typeof resetUIButtons === 'function') resetUIButtons(); 
        }
    }
}

// ─── 11. Load Live Ayahs ────────────────────────────────
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
    
    searchStartIndex = 0; 
    currentWordIndex = 0; 
    
    window._liveAyahsList = filteredAyahs.map(ayah => ({
      surah: String(surah).padStart(3, '0'),
      ayah: String(ayah.numberInSurah).padStart(3, '0'),
      num: ayah.numberInSurah,
      text: ayah.text
    }));

    filteredAyahs.forEach(ayah => {
      const s = String(surah).padStart(3, '0');
      const a = String(ayah.numberInSurah).padStart(3, '0');
      const audioUrl = `https://everyayah.com/data/Husary_128kbps/${s}${a}.mp3`;
      const btnId    = `btn-play-${s}-${a}`;
      const blurClass = isBlur ? 'blurred-text' : '';
      const cleanText = normalizeArabic(ayah.text);

      let ayahText = ayah.text;
      if (typeof UTHMANI_FIXES !== 'undefined') {
          Object.keys(UTHMANI_FIXES).forEach(wrongWord => {
              ayahText = ayahText.split(wrongWord).join(UTHMANI_FIXES[wrongWord]);
          });
      }

      const words = ayahText.trim().split(/\s+/); 
      const wordSpansHTML = words.map((word, index) => {
          const wordId = `S${s}A${a}W${index}`;
          const cleanWord = normalizeArabic(word);
          return `<span class="live-word ${blurClass}" id="${wordId}" data-clean="${cleanWord}" style="transition: color 0.2s ease, background-color 0.2s ease; display: inline-block;">${word}</span>`;
      }).join(' ');

      container.insertAdjacentHTML('beforeend', `
        <div class="live-ayah-item" data-clean="${cleanText}" data-ayah-id="${s}${a}">
          <button id="${btnId}" class="btn live-play-btn"
            onclick="playLiveAudio('${audioUrl}','${btnId}')">
            <i class="fas fa-play"></i>
          </button>
          
          <div class="live-ayah-text" id="text-${btnId}">
            ${wordSpansHTML}
            <span class="badge ms-1">
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

// ─── 12. اقرأ مع الشيخ: تشغيل متتالي للآيات ─────────────────────────────
let _sheikPlaybackActive = false;
let _sheikIsPaused       = false; 
let _sheikCurrentAudio   = null;
let _sheikCurrentIndex   = 0;

window.startSheikhFollowAlong = function() {
  // 🌟 التعديل: التأكد أن المايك لا يعمل أولاً
  if (typeof isLiveTracking !== 'undefined' && isLiveTracking) {
      if (typeof Swal !== 'undefined') {
          Swal.fire({ toast: true, position: 'bottom', icon: 'warning', title: 'أوقف التسميع أولاً قبل تشغيل الشيخ', showConfirmButton: false, timer: 3000 });
      }
      return; // نوقف الدالة فوراً
  }

  const ayahs = window._liveAyahsList;
  if (!ayahs || !ayahs.length) {
    showAlert('error', 'حمّل الآيات أولاً');
    return;
  }

  const btnStart = document.getElementById('btn-sheikh-start');
  const btnStop  = document.getElementById('btn-sheikh-stop');

  if (!_sheikPlaybackActive) {
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
      _sheikIsPaused = false;
      
      if (btnStart) {
          btnStart.innerHTML = '<i class="fas fa-pause me-1"></i> إيقاف مؤقت';
          btnStart.classList.remove('btn-success');
          btnStart.classList.add('btn-warning'); 
          btnStart.classList.remove('d-none');
      }
      if (btnStop) btnStop.classList.remove('d-none');

      _playSheikhAyah(_sheikCurrentIndex);

  } else {
      if (_sheikIsPaused) {
          _sheikIsPaused = false;
          if (btnStart) {
              btnStart.innerHTML = '<i class="fas fa-pause me-1"></i> إيقاف مؤقت';
              btnStart.classList.remove('btn-success');
              btnStart.classList.add('btn-warning');
          }
          if (_sheikCurrentAudio) _sheikCurrentAudio.play().catch(() => {});
          else _playSheikhAyah(_sheikCurrentIndex);
      } else {
          _sheikIsPaused = true;
          if (btnStart) {
              btnStart.innerHTML = '<i class="fas fa-play me-1"></i> استئناف';
              btnStart.classList.remove('btn-warning');
              btnStart.classList.add('btn-success');
          }
          if (_sheikCurrentAudio) _sheikCurrentAudio.pause();
      }
  }
};

window.stopSheikhFollowAlong = function() {
  _sheikPlaybackActive = false;
  _sheikIsPaused = false;
  _sheikCurrentIndex = 0; 

  if (_sheikCurrentAudio) {
    _sheikCurrentAudio.pause();
    _sheikCurrentAudio = null;
  }
  
  document.querySelectorAll('.live-ayah-item').forEach(el => {
    el.classList.remove('ayah-active');
    const td = el.querySelector('.live-ayah-text');
    if (td) { td.style.backgroundColor = ''; td.style.color = ''; td.style.padding = ''; }
    
    const isBlur = document.getElementById('memorize-mode')?.checked;
    el.querySelectorAll('.live-word').forEach(span => {
        // 🌟 تصفير كل تأثيرات التتبع 🌟
        span.style.color = '';
        span.style.fontWeight = 'normal';
        span.style.borderBottom = '';
        
        if (isBlur) span.classList.add('blurred-text');
        else span.classList.remove('blurred-text');
    });
  });

  const btnStart = document.getElementById('btn-sheikh-start');
  const btnStop  = document.getElementById('btn-sheikh-stop');
  
  if (btnStart) {
      btnStart.innerHTML = '<i class="fas fa-play me-1"></i> ابدأ مع الشيخ';
      btnStart.classList.remove('btn-warning');
      btnStart.classList.add('btn-success');
      btnStart.classList.remove('d-none');
  }
  if (btnStop) btnStop.classList.add('d-none');

  const statusEl = document.getElementById('sheikh-status');
  if (statusEl) statusEl.textContent = '';
};

// ─── مساعد: تتبع الكلمات أثناء تشغيل الصوت ───────────────────────────────────
function _attachWordTracking(audioEl, ayahIndex, skipBasmala) {
  // skipBasmala = true لما الآية الأولى في سورة غير الفاتحة
  // عشان كلمات البسملة (W0-W3) موجودة في الـ HTML بس الشيخ مش بيقولها في الـ MP3
  const BASMALA_WORD_COUNT = 4; // بسم + الله + الرحمن + الرحيم

  const handler = () => {
    if (!audioEl || audioEl !== _sheikCurrentAudio) return;
    if (!audioEl.duration || isNaN(audioEl.duration)) return;

    const progress = audioEl.currentTime / audioEl.duration;
    const currentAyahEl = document.querySelectorAll('.live-ayah-item')[ayahIndex];
    if (!currentAyahEl) return;

    const wordSpans = currentAyahEl.querySelectorAll('.live-word');
    const totalWords = wordSpans.length;

    // لو فيه بسملة نتخطاها: نحسب الـ progress على الكلمات الحقيقية بس
    const startWord = skipBasmala ? BASMALA_WORD_COUNT : 0;
    const realWords = totalWords - startWord;
    if (realWords <= 0) return;

    let activeRealIndex = Math.floor(progress * realWords);
    if (activeRealIndex >= realWords) activeRealIndex = realWords - 1;

    const activeWordIndex = startWord + activeRealIndex;

    wordSpans.forEach((span, i) => {
      if (i < startWord) {
        // كلمات البسملة: خليها بلونها العادي ومتلمعش
        span.style.color = '';
        span.style.fontWeight = 'normal';
        span.style.borderBottom = '';
      } else if (i === activeWordIndex) {
        span.style.color = '#198754';
        span.style.fontWeight = 'bold';
        span.style.borderBottom = '3px solid #198754';
      } else if (i < activeWordIndex) {
        span.style.color = '#4a5568';
        span.style.fontWeight = 'normal';
        span.style.borderBottom = '';
      } else {
        span.style.color = '';
        span.style.fontWeight = 'normal';
        span.style.borderBottom = '';
      }
    });
  };
  audioEl.addEventListener('timeupdate', handler);
}

// ─── مساعد: تصفير ألوان كلمات آية معينة ─────────────────────────────────────
function _resetAyahWordStyles(ayahIndex) {
  const el = document.querySelectorAll('.live-ayah-item')[ayahIndex];
  if (!el) return;
  el.querySelectorAll('.live-word').forEach(span => {
    span.style.color = '';
    span.style.fontWeight = 'normal';
    span.style.borderBottom = '';
  });
}

function _playSheikhAyah(index) {
  if (!_sheikPlaybackActive || _sheikIsPaused) return;

  const ayahs = window._liveAyahsList;
  if (!ayahs || index >= ayahs.length) {
    window.stopSheikhFollowAlong();
    const statusEl = document.getElementById('sheikh-status');
    if (statusEl) statusEl.innerHTML = '<span class="text-success fw-bold">✅ انتهت التلاوة</span>';
    return;
  }

  const ayah = ayahs[index];
  const isBlur = document.getElementById('memorize-mode')?.checked;

  // ─── تمييز الآية النشطة في الواجهة ──────────────────────────────────────────
  document.querySelectorAll('.live-ayah-item').forEach((el, i) => {
    const textContainer = el.querySelector('.live-ayah-text');
    const wordSpans = el.querySelectorAll('.live-word');

    if (i === index) {
      el.classList.add('ayah-active');
      if (textContainer) {
        textContainer.style.backgroundColor = '#f8fdfa';
        textContainer.style.borderRadius = '12px';
        textContainer.style.padding = '10px';
      }
      wordSpans.forEach(span => {
        span.classList.remove('blurred-text');
        span.style.color = '';
        span.style.fontWeight = 'normal';
        span.style.borderBottom = '';
      });
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      el.classList.remove('ayah-active');
      if (textContainer) {
        textContainer.style.backgroundColor = '';
        textContainer.style.padding = '';
      }
      wordSpans.forEach(span => {
        span.style.color = '';
        span.style.fontWeight = 'normal';
        span.style.borderBottom = '';
        if (isBlur && i > index) span.classList.add('blurred-text');
      });
    }
  });

  const statusEl = document.getElementById('sheikh-status');

  // ─── منطق البسملة ────────────────────────────────────────────────────────────
  const surahNum = parseInt(ayah.surah);
  // البسملة في الـ HTML موجودة كـ W0-W3 فقط في الآية رقم 1 من السورة
  // الشيخ في الـ MP3 مش بيقولها -> نخبر الـ tracking يتخطاها
  // الشرط: رقم الآية الفعلي = 1، والسورة مش الفاتحة (1) ولا التوبة (9)
  const isActualFirstAyah = parseInt(ayah.ayah) === 1;
  const skipBasmala = isActualFirstAyah && surahNum !== 1 && surahNum !== 9;

  const playMainAyah = () => {
    if (!_sheikPlaybackActive) return;

    const audioUrl = `https://everyayah.com/data/Husary_128kbps/${ayah.surah}${ayah.ayah}.mp3`;
    if (statusEl) statusEl.innerHTML = `<span class="text-success small"><i class="fas fa-volume-up fa-pulse me-1"></i> الآية ${ayah.num} من ${ayahs.length}</span>`;

    _sheikCurrentAudio = new Audio(audioUrl);
    _attachWordTracking(_sheikCurrentAudio, index, skipBasmala);
    _sheikCurrentAudio.play().catch(() => {});

    _sheikCurrentAudio.onended = () => {
      _resetAyahWordStyles(index);
      if (!_sheikPlaybackActive) return;
      _sheikCurrentIndex = index + 1;
      const pauseSlider = document.getElementById('sheikh-pause-slider');
      const pauseMs = pauseSlider ? parseFloat(pauseSlider.value) * 1000 : 2000;
      setTimeout(() => { if (_sheikPlaybackActive && !_sheikIsPaused) _playSheikhAyah(_sheikCurrentIndex); }, pauseMs);
    };

    _sheikCurrentAudio.onerror = () => {
      if (!_sheikPlaybackActive) return;
      _sheikCurrentIndex = index + 1;
      setTimeout(() => { if (_sheikPlaybackActive && !_sheikIsPaused) _playSheikhAyah(_sheikCurrentIndex); }, 300);
    };
  };

  playMainAyah();
}

// ─── 13. التبديل لوضع الحفظ (Memorize Mode) ──────────────────────────────────
document.addEventListener('change', (e) => {
  if (e.target.id !== 'memorize-mode') return;
  if (isLiveTracking) {
    e.target.checked = !e.target.checked;
    showAlert('error', 'أوقف التسميع أولاً قبل تغيير وضع الحفظ');
    return;
  }
  
  const isBlur = e.target.checked;
  const ayahEls = document.querySelectorAll('.live-ayah-item');
  
  ayahEls.forEach((el, idx) => {
    const wordSpans = el.querySelectorAll('.live-word');
    if (idx < searchStartIndex) {
        wordSpans.forEach(span => span.classList.remove('blurred-text'));
    } else {
        wordSpans.forEach(span => {
            if (isBlur) span.classList.add('blurred-text');
            else span.classList.remove('blurred-text');
        });
    }
  });
});

// ─── 13. Global Click Listener (Bottom Sheet Logic) ──────────────────────────
let selectedVerseData = null;
function hideVerseSheet() {
  return new Promise(resolve => {
    const sheetEl = document.getElementById('verseActionSheet');
    if (!sheetEl) return resolve();
    
    const bs = bootstrap.Offcanvas.getInstance(sheetEl);
    if (!bs) return resolve();

    const backupTimeout = setTimeout(() => { resolve(); }, 400);

    sheetEl.addEventListener('hidden.bs.offcanvas', () => {
      clearTimeout(backupTimeout);
      resolve();
    }, { once: true });

    bs.hide();
  });
}

// ─── 14. التنظيف التلقائي (Cleanup) وإدارة الموارد ─────────────────────────────

// 1. عند خروج التطبيق للخلفية (Minimizing the app / changing tabs)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (typeof stopLiveTracking === 'function' && typeof isLiveTracking !== 'undefined' && isLiveTracking) {
            stopLiveTracking();
            resetUIButtons();
        }
    }
});

// 2. عند الضغط على زر الرجوع في الموبايل أو المتصفح (Back Button)
window.addEventListener('popstate', () => {
    if (typeof stopLiveTracking === 'function' && typeof isLiveTracking !== 'undefined' && isLiveTracking) {
        stopLiveTracking();
        resetUIButtons();
    }
    if (typeof stopSheikhFollowAlong === 'function' && typeof _sheikPlaybackActive !== 'undefined' && _sheikPlaybackActive) {
        stopSheikhFollowAlong();
    }
});

// 3. عند الضغط على أي رابط في الـ Navbar أو الـ Sidebar للخروج من الصفحة
document.addEventListener('click', (e) => {
    const isNavLink = e.target.closest('.nav-link, .bottom-nav-item, .back-btn');
    if (isNavLink) {
        if (typeof stopLiveTracking === 'function' && typeof isLiveTracking !== 'undefined' && isLiveTracking) {
            stopLiveTracking();
            resetUIButtons();
        }
        if (typeof stopSheikhFollowAlong === 'function' && typeof _sheikPlaybackActive !== 'undefined' && _sheikPlaybackActive) {
            stopSheikhFollowAlong();
        }
    }
});

// 🌟 تنفيذ الأوامر عند الضغط على الأزرار داخل القائمة السفلية 🌟
document.addEventListener('click', async (e) => {
  
  // -- زر التفسير --
  if (e.target.closest('.action-btn-tafseer')) {
    if (typeof hideVerseSheet === 'function') await hideVerseSheet();
    const data = window.selectedVerseData;
    if (data) {
      if (typeof window.showTafseer === 'function') window.showTafseer(data.surah, data.ayah);
      else if (typeof window.showTafseerModal === 'function') window.showTafseerModal(data.surah, data.ayah);
      else if (typeof showTafseerModal !== 'undefined') showTafseerModal(data.surah, data.ayah);
    }
    return;
  }
  
  // -- زر الإضاءات / أسباب النزول --
  if (e.target.closest('.action-btn-nuzul')) {
    if (typeof hideVerseSheet === 'function') await hideVerseSheet(); 
    const data = window.selectedVerseData;
    if (data) {
      if (typeof window.openAyahInsights === 'function') window.openAyahInsights(data.surah, data.ayah);
      else if (typeof window.showNuzulModal === 'function') window.showNuzulModal(data);
      else if (typeof showNuzulModal !== 'undefined') showNuzulModal(data);
    }
    return;
  }
  
  // -- زر العلامة المرجعية --
  if (e.target.closest('.action-btn-bookmark')) {
    if (typeof hideVerseSheet === 'function') await hideVerseSheet();
    if (typeof isUserLoggedIn === 'function' && !(await isUserLoggedIn())) { requireLogin('استخدام العلامات المرجعية'); return; }
    
    const data = window.selectedVerseData;
    if (data) {
        const dummyIcon = document.createElement('i');
        dummyIcon.className = data.isBookmarked ? 'fas' : 'far';
        if (typeof toggleBookmark === 'function') await toggleBookmark(data.surah, data.ayah, dummyIcon);
        
        // تحديث الواجهة عشان نعكس حالة الحفظ الجديدة (ممكن تفكر ترسم النجمة فوق الزرار الشفاف مستقبلاً)
        if (window.loadQuranPage) window.loadQuranPage(window.currentPage);
    }
    return;
  }
  
  // -- زر الختمة --
  if (e.target.closest('.action-btn-khatmah')) {
    if (typeof hideVerseSheet === 'function') await hideVerseSheet();
    if (typeof isUserLoggedIn === 'function' && !(await isUserLoggedIn())) { requireLogin('تتبع الختمة'); return; }
    
    const data = window.selectedVerseData;
    if (data) {
        if (typeof updateKhatmahProgress === 'function') await updateKhatmahProgress(data.surah, data.ayah);
        if (window.loadQuranPage) window.loadQuranPage(window.currentPage);
    }
    return;
  }
  
  // -- زر المشاركة --
  if (e.target.closest('.action-btn-share')) {
    if (typeof hideVerseSheet === 'function') await hideVerseSheet();
    const data = window.selectedVerseData;
    if (data) {
        // نمرر النص الفعلي اللي جابته دالة handleAyahClick من الـ JSON
        if (typeof window.shareAyah === 'function') window.shareAyah(data.text, data.surahName, data.ayah);
        else if (typeof shareAyah === 'function') shareAyah(data.text, data.surahName, data.ayah);
    }
    return;
  }

  // -- زر النسخ --
  if (e.target.closest('.action-btn-copy')) {
    if (typeof hideVerseSheet === 'function') await hideVerseSheet();
    const data = window.selectedVerseData;
    if (data && data.text) {
        navigator.clipboard.writeText(`"${data.text}"\n[سورة ${data.surahName} - الآية ${data.ayah}]`).then(() => {
            if (window.Swal) Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'تم نسخ الآية بنجاح 📋', showConfirmButton: false, timer: 2000 });
        });
    }
    return;
  }

  // 🌟 3. زر حذف العلامة من صفحة (العلامات المرجعية)
  const deleteBookmarkBtn = e.target.closest('.delete-bookmark-btn');
  if (deleteBookmarkBtn) {
    e.preventDefault(); e.stopPropagation();
    const id = deleteBookmarkBtn.dataset.id;
    if (id && typeof deleteBookmark === 'function') await deleteBookmark(id);
    return;
  }
});


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
// ─── إحصائيات القراءة 📊 (النسخة المطورة الذكية) ──────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const STATS_KEY = 'aqra_reading_stats';

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

// 🌟 1. إضافة مانع التلاعب (Anti-cheat Cooldown)
let _lastRecordTime = 0;
let _lastRecordedPage = 0;

// تسجيل صفحة مقروءة (معدلة)
function _recordPageRead(pageNum) {
  const now = Date.now();
  // ⏳ لن نحسب الصفحة إلا إذا مرت 3 ثوانٍ على الأقل من تقليب آخر صفحة 
  // (لتجاهل التقليب العشوائي السريع) أو إذا كانت نفس الصفحة
  if (pageNum === _lastRecordedPage || (now - _lastRecordTime < 3000)) {
      _lastRecordedPage = pageNum;
      return; 
  }
  
  _lastRecordTime = now;
  _lastRecordedPage = pageNum;

  const stats = _getStats();
  const today = _getTodayKey();
  stats[today] = (stats[today] || 0) + 1;
  _saveStats(stats);
  
  // تحديث الكارت في الهوم
  const el = document.getElementById('home-stats-today');
  if (el) el.textContent = stats[today] + ' صفحة اليوم';
}

// حساب الإحصائيات الشاملة
function _calcStats() {
  const stats  = _getStats();
  const today  = new Date();
  const todayK = _getTodayKey();

  const todayCount = stats[todayK] || 0;

  let weekCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    weekCount += stats[d.toISOString().slice(0, 10)] || 0;
  }

  let monthCount = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    monthCount += stats[d.toISOString().slice(0, 10)] || 0;
  }

  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const best = Object.values(stats).length ? Math.max(...Object.values(stats)) : 0;

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    if ((stats[d.toISOString().slice(0, 10)] || 0) > 0) streak++;
    else break;
  }

  const last7 = [];
  const last7Labels = [];
  const days = ['أحد','اثن','ثلا','أرب','خمي','جمع','سبت'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    last7.push(stats[d.toISOString().slice(0, 10)] || 0);
    last7Labels.push(days[d.getDay()]);
  }

  // 🌟 2. حساب المستوى واللقب 🌟
  let levelName = "بذرة الإيمان"; let levelIcon = "🌱"; let levelColor = "text-secondary";
  if (total >= 604) { levelName = "تاج الوقار (خاتم)"; levelIcon = "👑"; levelColor = "text-warning"; }
  else if (total >= 300) { levelName = "صاحب القرآن"; levelIcon = "🌟"; levelColor = "text-primary"; }
  else if (total >= 100) { levelName = "القارئ المواظب"; levelIcon = "📘"; levelColor = "text-success"; }
  else if (total >= 30) { levelName = "محب التلاوة"; levelIcon = "📖"; levelColor = "text-info"; }

  // 🌟 3. توقع الختمة (Khatmah Predictor) 🌟
  const avgPerDay = weekCount / 7;
  let expectedDays = 0;
  if (avgPerDay > 0) {
      const remainingPages = 604 - (total % 604); // حساب المتبقي للختمة الحالية
      expectedDays = Math.ceil(remainingPages / avgPerDay);
  }

  return { todayCount, weekCount, monthCount, total, best, streak, last7, last7Labels, levelName, levelIcon, levelColor, expectedDays };
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

  // تحديث المستوى
  const lvlNameEl = document.getElementById('stat-level-name');
  const lvlIconEl = document.getElementById('stat-level-icon');
  if (lvlNameEl) {
      lvlNameEl.textContent = s.levelName;
      lvlNameEl.className = `fw-bold mb-0 ${s.levelColor}`;
  }
  if (lvlIconEl) lvlIconEl.textContent = s.levelIcon;

  // تحديث التوقع
  const predictEl = document.getElementById('stat-prediction');
  if (predictEl) {
      if (s.expectedDays > 0) {
          predictEl.innerHTML = `بمعدلك الحالي، ستختم القرآن بعد <strong class="text-success">${s.expectedDays}</strong> يوماً إن شاء الله.`;
      } else {
          predictEl.innerHTML = `اقرأ يومياً لنتمكن من حساب موعد ختمتك المتوقع ⏳`;
      }
  }

  const pct = Math.min(100, Math.round(((s.total % 604) / 604) * 100)); // نسبة الختمة الحالية
  const totalPct = document.getElementById('stat-total-pct');
  if (totalPct) totalPct.textContent = `${pct}% من الختمة الحالية`;

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
  window.loadQuranPage = async function(pageNum, ...args) {
    const res = await _origLoadForStats.apply(this, [pageNum, ...args]);
    _recordPageRead(pageNum); // تمرير رقم الصفحة مهم لمنع التكرار
    return res;
  };
}

window._renderStats = _renderStats;

// ══════════════════════════════════════════════════════════════════════════════
// ─── Quran Zoom ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const ZOOM_STEPS  = [0.55, 0.65, 0.75, 0.85, 1.0, 1.1, 1.2, 1.35, 1.5, 1.7, 2.0, 2.3, 2.6, 3.0];
const ZOOM_LABELS = ['55%','65%','75%','85%','100%','110%','120%','135%','150%','170%','200%','230%','260%','300%'];
let   _zoomIndex  = 4; // 100% as default

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
  _zoomIndex = 4; // 100% in new ZOOM_STEPS
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

// ===================================================
// ─── Auto Scroll (Pro Version - Continuous Flow) ───
// ===================================================

let _autoScrollReq = null; 
let _scrollSpeedLevel = 2; 
let _scrollAccumulator = 0; // 🔥 الحصالة اللي هنجمع فيها الكسور للكمبيوتر

const SCROLL_SPEEDS = [ null, 0.15, 0.25, 0.4, 0.6, 0.9, 1.3, 1.8, 2.5, 3.5 ];

function _isOnQuranPage() {
  const qs = document.getElementById('quran-section');
  const isNormal = qs && !qs.classList.contains('d-none');
  // في وضع الشاشة الكاملة النصي (مش المصحف المصور) نحتاج نتحقق من الـ body class
  const isTextFullscreen = document.body.classList.contains('fullscreen-reading') && window._imageMushafActive !== true;
  return isNormal || isTextFullscreen;
}

window.toggleAutoScroll = function() {
  _autoScrollReq ? _stopAutoScroll() : _startAutoScroll();
};

function _updateAutoScrollUI(isActive) {
  const btnN = document.getElementById('btn-autoscroll-normal');
  const ctlN = document.getElementById('autoscroll-controls-normal');
  
  const btnF = document.getElementById('btn-autoscroll'); 
  const ctlF = document.getElementById('autoscroll-controls'); 
  const fabF = document.getElementById('autoscroll-fab'); 

  if (isActive) {
      if (btnN) { btnN.classList.replace('text-secondary', 'text-success'); btnN.innerHTML = '<i class="fas fa-pause me-1"></i> إيقاف'; }
      if (ctlN) { ctlN.classList.replace('d-none', 'd-flex'); }
      
      if (btnF) { btnF.innerHTML = '<i class="fas fa-pause me-1"></i> إيقاف'; btnF.classList.add('text-danger'); }
      if (ctlF) { ctlF.style.setProperty('display', 'flex', 'important'); }
      if (fabF) { fabF.style.setProperty('display', 'flex', 'important'); }
      
      if (document.body.classList.contains('fullscreen-reading')) {
          document.body.classList.add('is-autoscrolling');
      }
  } else {
      if (btnN) { btnN.classList.replace('text-success', 'text-secondary'); btnN.innerHTML = '<i class="fas fa-scroll me-1"></i> تمرير'; }
      if (ctlN) { ctlN.classList.replace('d-flex', 'd-none'); }
      
      if (btnF) { btnF.innerHTML = '<i class="fas fa-scroll me-1"></i> تمرير'; btnF.classList.remove('text-danger'); }
      if (ctlF) { ctlF.style.setProperty('display', 'none', 'important'); }
      if (fabF) { fabF.style.setProperty('display', 'none', 'important'); }
      
      document.body.classList.remove('is-autoscrolling');
  }
}

function _startAutoScroll() {
  if (!_isOnQuranPage()) return;
  _updateAutoScrollUI(true);

  _scrollAccumulator = 0; // تصفير الحصالة مع كل تشغيل جديد

  const lblN = document.getElementById('scroll-speed-label-normal');
  const lblF = document.getElementById('scroll-speed-label');
  if (lblN) lblN.textContent = _scrollSpeedLevel;
  if (lblF) lblF.textContent = _scrollSpeedLevel;

  _runScrollLoop();
}

function _stopAutoScroll() {
  if (_autoScrollReq) { 
      cancelAnimationFrame(_autoScrollReq); 
      _autoScrollReq = null; 
  }
  
  // تنظيف: إزالة المساحة الوهمية فوراً عند الإيقاف
  const spacer = document.getElementById('auto-scroll-spacer');
  if (spacer) spacer.remove();

  _updateAutoScrollUI(false);
}

function _runScrollLoop() {
    if (!_isOnQuranPage()) { _stopAutoScroll(); return; }

    const isFullScreen = document.body.classList.contains('fullscreen-reading');
    
    // 🔥 التعديل الجذري: تحديد الصفحة النشطة حالياً عشان السكرول يشتغل جواها 🔥
    const activePage = document.querySelector('.quran-swipe-page.active-page');
    
    // تحديد الحاوية الصحيحة
    const scrollContainer = (isFullScreen && activePage) ? activePage : window;
    const contentContainer = (isFullScreen && activePage) ? activePage : document.getElementById('quran-book');

    if (!scrollContainer || !contentContainer) { 
        // ننتظر الإطار القادم لو الصفحة لسه بتُبنى
        _autoScrollReq = requestAnimationFrame(_runScrollLoop);
        return; 
    }

    // 🔥 الخدعة السحرية: إضافة المساحة الوهمية (Spacer) لرفع آخر آية 🔥
    let spacer = document.getElementById('auto-scroll-spacer');
    if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'auto-scroll-spacer';
        // مساحة كبيرة كافية لرفع السطر الأخير لمنتصف الشاشة قبل التقليب
        spacer.style.height = '45vh'; 
        spacer.style.width = '100%';
        spacer.style.flexShrink = '0'; // يمنع انكماش المساحة
        spacer.style.display = 'flex';
        spacer.style.justifyContent = 'center';
        spacer.style.alignItems = 'flex-end';
        spacer.style.paddingBottom = '5vh';
        spacer.style.opacity = '0.5';
        spacer.style.pointerEvents = 'none'; // عشان ميعطلش التاتش
        spacer.innerHTML = '<i class="fas fa-chevron-down fa-2x fa-fade text-success"></i>'; 
        contentContainer.appendChild(spacer);
    } else if (spacer.parentNode !== contentContainer) {
        // لو المستخدم قلب الصفحة يدوياً، ننقل الـ Spacer للصفحة الجديدة فوراً
        contentContainer.appendChild(spacer);
    }

    const step = SCROLL_SPEEDS[_scrollSpeedLevel] || 0.25;
    let currentY = isFullScreen ? scrollContainer.scrollTop : window.scrollY;
    
    let maxY = isFullScreen 
        ? (scrollContainer.scrollHeight - scrollContainer.clientHeight)
        : (document.documentElement.scrollHeight - window.innerHeight);

    // 🔥 التقليب التلقائي لما نوصل لآخر الـ Spacer 🔥
    if (maxY > 0 && currentY >= maxY - 2) {
        if (window.currentPage >= 604) {
            _stopAutoScroll(); // نهاية المصحف
            return;
        }

        // إزالة الـ Spacer قبل التقليب عشان الصفحة الجديدة تكون نظيفة
        if (spacer) spacer.remove();

        // التقليب للصفحة التالية
        window.currentPage++;
        if (window.loadQuranPage) window.loadQuranPage(window.currentPage);
        
        // تصفير مكان السكرول للصفحة الجديدة
        if (isFullScreen) { scrollContainer.scrollTop = 0; } 
        else { window.scrollTo({ top: 0, behavior: 'instant' }); }
        
        // التحميل المسبق (Prefetch)
        if (typeof window.prefetchPage === 'function') {
            window.prefetchPage(window.currentPage + 1);
        }

        // إيقاف السكرول لثلث ثانية حتى يتم رسم الصفحة الجديدة ثم الإكمال
        setTimeout(() => {
            _autoScrollReq = requestAnimationFrame(_runScrollLoop);
        }, 300);
        return;

    } else {
        // 🔥 تطبيق الحصالة لحل مشكلة السكرول البطيء على متصفحات الكمبيوتر 🔥
        if (maxY > 0) {
            _scrollAccumulator += step;
            if (_scrollAccumulator >= 1) {
                const pixelsToScroll = Math.floor(_scrollAccumulator);
                _scrollAccumulator -= pixelsToScroll;
                
                if (isFullScreen) { 
                    scrollContainer.scrollTop += pixelsToScroll; 
                } else { 
                    window.scrollBy({ top: pixelsToScroll, left: 0, behavior: 'instant' }); 
                }
            }
        }
    }

    _autoScrollReq = requestAnimationFrame(_runScrollLoop);
}

window.changeScrollSpeed = function(dir) {
  _scrollSpeedLevel = Math.max(1, Math.min(9, _scrollSpeedLevel + dir));
  const lblN = document.getElementById('scroll-speed-label-normal');
  const lblF = document.getElementById('scroll-speed-label');
  if (lblN) lblN.textContent = _scrollSpeedLevel;
  if (lblF) lblF.textContent = _scrollSpeedLevel;
};



// ─── Horizontal Swipe Navigation (Peek Effect) ───────
// ─── Horizontal Swipe Navigation (Peek Effect) ───────
(function() {
  const TOTAL_PAGES = 604;
  let _swipeTrack = null;
  let _pages = {}; // cache: { pageNum: domElement }
  let _pageCache = {}; // data cache: { pageNum: ayahsArray }

  // ─── متغيرات خريطة الإحداثيات الجديدة ───
  window._quranCoordinates = null; 

  async function _loadCoordinatesCSV() {
    if (window._quranCoordinates) return;
    try {
      const response = await fetch('/assets/quran_data/data.csv');
      const csvText = await response.text();
      // تقسيم السطور وتجاهل السطر الأول (الهيدر)
      const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
      
      const coords = {};
      for (let i = 1; i < lines.length; i++) {
        // ترتيب الـ CSV: aya_id, page, x, y
        const [aya_id, page, x, y] = lines[i].split(',').map(Number);
        if (!coords[page]) coords[page] = [];
        coords[page].push({ aya_id, x, y });
      }
      window._quranCoordinates = coords;
      console.log("✅ تم تحميل إحداثيات المصحف بنجاح!", Object.keys(coords).length, "صفحة");
    } catch (err) {
      console.error("❌ خطأ في تحميل ملف الإحداثيات:", err);
    }
  }

  // استدعاء الدالة فوراً مع بداية التطبيق
  document.addEventListener('DOMContentLoaded', () => {
    _loadCoordinatesCSV();
  });

  // ─── إنشاء هيكل الـ DOM ───
  function _initSwipeUI() {
    const book = document.getElementById('quran-book');
    if (!book || document.getElementById('quran-pages-track-wrapper')) return;

    // 🌟 1. FIX BUG: إضافة الستايل الخاص بالأزرار لضمان ظهورها دائمًا فوق المصحف المصور 🌟
    if (!document.getElementById('_mushaf_slot_styles')) {
        const style = document.createElement('style');
        style.id = '_mushaf_slot_styles';
        style.textContent = `
          #quran-pages-track-wrapper {
            position: fixed; inset: 0;
            overflow: hidden;
            z-index: 9999;
            background: var(--quran-book-bg, #000);
            touch-action: pan-y;
          }
          /* السطر السحري لضمان بقاء الأزرار مرئية */
          #quran-floating-controls {
            z-index: 10500 !important; 
          }
          #quran-pages-track {
            display: flex;
            flex-direction: row;
            width: 300vw;
            height: 100%;
            will-change: transform;
            transition: transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          }
          #quran-pages-track.no-transition { transition: none !important; }
          .quran-swipe-page {
            flex-shrink: 0;
            width: 100vw; 
            height: 100%;
            display: flex; align-items: center; justify-content: center;
            position: relative;
            contain: layout style paint;
          }
          .quran-image-wrapper {
            position: relative; width: 100%; height: 100%;
            display: flex; justify-content: center; align-items: center;
          }
          .quran-bg-image {
            max-width: 100%; max-height: 100%;
            object-fit: contain; display: block;
            -webkit-user-select: none; user-select: none; pointer-events: none;
            transform: translateZ(0); backface-visibility: hidden;
          }
          .quran-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;
          }
          .ayah-hotspot {
            position: absolute; cursor: pointer; pointer-events: auto;
            background: transparent; border-radius: 4px;
          }
          .ayah-hotspot:active { background-color: rgba(25, 135, 84, 0.2); }
        `;
        document.head.appendChild(style);
    }

    // أضف الغلاف
    const wrapper = document.createElement('div');
    wrapper.id = 'quran-pages-track-wrapper';

    const track = document.createElement('div');
    track.id = 'quran-pages-track';
    wrapper.appendChild(track);
    _swipeTrack = track;

    // أدخل الغلاف داخل #quran-book قبل #ayahs-container
    const ac = document.getElementById('ayahs-container');
    if (ac) book.insertBefore(wrapper, ac);
    else book.appendChild(wrapper);

    document.body.classList.add('swipe-nav-active');
  }

  // ─── تحميل بيانات صفحة من JSON محلي مع كاش ذكي وتحميل مسبق ───
  async function _fetchPageData(pageNum) {
    if (_pageCache[pageNum]) return _pageCache[pageNum];

    if (window.cacheGet) {
      const cached = await window.cacheGet(pageNum).catch(() => null);
      if (cached) {
        const ayahs = cached?.ayahs || cached?.data?.ayahs || cached || [];
        _pageCache[pageNum] = Array.isArray(ayahs) ? ayahs : [];
        return _pageCache[pageNum];
      }
    }

    try {
      const res = await fetch(`/assets/quran_pages/${pageNum}.json`);
      if (res.ok) {
        const data = await res.json();
        const ayahs = data?.data?.ayahs || data?.ayahs || data || [];
        _pageCache[pageNum] = Array.isArray(ayahs) ? ayahs : [];
        if (window.cacheSet) window.cacheSet(pageNum, data);

        setTimeout(() => {
            const nextPage = parseInt(pageNum) - 1; 
            const prevPage = parseInt(pageNum) + 1; 
            if (nextPage >= 1 && !_pageCache[nextPage]) {
                fetch(`/assets/quran_pages/${nextPage}.json`).then(r => r.json())
                .then(d => { _pageCache[nextPage] = d?.data?.ayahs || d?.ayahs || d || []; }).catch(()=>{});
            }
            if (prevPage <= 604 && !_pageCache[prevPage]) {
                fetch(`/assets/quran_pages/${prevPage}.json`).then(r => r.json())
                .then(d => { _pageCache[prevPage] = d?.data?.ayahs || d?.ayahs || d || []; }).catch(()=>{});
            }
        }, 300);

        return _pageCache[pageNum];
      }
    } catch(e) { console.warn("Local fetch failed", e); }

    try {
      const res = await fetch(`/api/v1/quran/page/${pageNum}`);
      const data = await res.json();
      const ayahs = data?.data?.ayahs || data?.ayahs || [];
      _pageCache[pageNum] = Array.isArray(ayahs) ? ayahs : [];
      return _pageCache[pageNum];
    } catch(e) { return []; }
  }

  // ─── بناء عنصر صفحة واحدة ───
  function _buildPageEl(pageNum) {
    const div = document.createElement('div');
    div.className = 'quran-swipe-page loading-page';
    div.dataset.page = pageNum;
    div.innerHTML = `<div class="spinner-border text-success" style="width:2rem;height:2rem;"></div>`;
    return div;
  }

 // ─── بناء محتوى الصفحة مع خوارزمية اللمس الذكي (بدون نقاط تصحيح) ───
  // ─── بناء محتوى الصفحة مع خوارزمية اللمس الذكي + وضع التصحيح الاختياري ───
  async function _loadPageContent(pageEl, pageNum) {
    if (!window._quranCoordinates) await _loadCoordinatesCSV();
    
    const pageCoords = window._quranCoordinates[pageNum] || [];
    const imgSrc = `/assets/quran_images/${pageNum}.webp`; 

    let html = `
      <div class="quran-image-wrapper" style="position: relative; width: 100%; height: 100%;">
        <img src="${imgSrc}" class="quran-bg-image" alt="صفحة ${pageNum}" />
        <div class="quran-overlay" style="pointer-events: auto; cursor: pointer; position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden;"></div>
      </div>
    `;

    pageEl.innerHTML = html;
    pageEl.classList.remove('loading-page');

    const overlay = pageEl.querySelector('.quran-overlay');
    const imgEl = pageEl.querySelector('.quran-bg-image');

    // 🌟 مفتاح تشغيل/إيقاف وضع التصحيح (Debug Mode) 🌟
    // غير هذه القيمة إلى false عندما تنتهي من الاختبار لإخفاء النقاط الحمراء
    const DEBUG_MODE = false; 

    // 🔴 1. دالة رسم النقاط للتصحيح (تعمل فقط إذا كان DEBUG_MODE = true) 🔴
    const drawDebugDots = () => {
        if (!DEBUG_MODE) return; // الخروج فوراً إذا كان وضع التصحيح مغلقاً

        const wrapper = pageEl.querySelector('.quran-image-wrapper');
        if (!wrapper || !imgEl.naturalWidth) return;

        const currentWidth = wrapper.clientWidth;
        const currentHeight = wrapper.clientHeight;

        if (currentWidth === 0 || currentHeight === 0) return;

        // تنظيف النقاط القديمة
        overlay.querySelectorAll('.debug-dot').forEach(d => d.remove());

        const imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;
        const containerRatio = currentWidth / currentHeight;

        let renderWidth, renderHeight, offsetX, offsetY;

        if (containerRatio > imgRatio) {
            renderHeight = currentHeight;
            renderWidth = renderHeight * imgRatio;
            offsetX = (currentWidth - renderWidth) / 2;
            offsetY = 0;
        } else {
            renderWidth = currentWidth;
            renderHeight = renderWidth / imgRatio;
            offsetX = 0;
            offsetY = (currentHeight - renderHeight) / 2;
        }

        const CSV_REF_WIDTH = 640;
        const CSV_REF_HEIGHT = 1136;
        
        const scaleX = renderWidth / CSV_REF_WIDTH;
        const scaleY = renderHeight / CSV_REF_HEIGHT;

        pageCoords.forEach(coord => {
            const dot = document.createElement('div');
            dot.className = 'debug-dot';
            
            const finalX = (coord.x * scaleX) + offsetX;
            const finalY = (coord.y * scaleY) + offsetY;

            dot.style.cssText = `
                position: absolute;
                width: 12px; height: 12px;
                background-color: rgba(255, 0, 0, 0.6);
                border: 2px solid yellow;
                border-radius: 50%;
                left: ${finalX - 6}px;
                top: ${finalY - 6}px;
                pointer-events: none; /* كي لا تمنع اللمس */
                z-index: 100;
            `;
            
            const lbl = document.createElement('span');
            lbl.textContent = coord.aya_id;
            lbl.style.cssText = 'position:absolute; top:-18px; left:-8px; font-size:11px; color:yellow; font-weight:bold; background:rgba(0,0,0,0.7); padding:1px 4px; border-radius:3px; pointer-events:none;';
            dot.appendChild(lbl);

            overlay.appendChild(dot);
        });
    };

    // رسم النقاط بمجرد تحميل الصورة (إذا كان Debug مفعلاً)
    if (imgEl.complete && imgEl.naturalWidth > 0) {
        drawDebugDots();
    } else {
        imgEl.onload = drawDebugDots;
    }
    window.addEventListener('resize', drawDebugDots);


    // 🌟 2. خوارزمية اللمس الذكي 🌟
    overlay.addEventListener('click', (e) => {
        if (pageCoords.length === 0 || !imgEl.naturalWidth) return;

        const wrapper = pageEl.querySelector('.quran-image-wrapper');
        const currentWidth = wrapper.clientWidth;
        const currentHeight = wrapper.clientHeight;

        if (currentWidth === 0 || currentHeight === 0) return;

        const imgRatio = imgEl.naturalWidth / imgEl.naturalHeight;
        const containerRatio = currentWidth / currentHeight;

        let renderWidth, renderHeight, offsetX, offsetY;

        if (containerRatio > imgRatio) {
            renderHeight = currentHeight;
            renderWidth = renderHeight * imgRatio;
            offsetX = (currentWidth - renderWidth) / 2;
            offsetY = 0;
        } else {
            renderWidth = currentWidth;
            renderHeight = renderWidth / imgRatio;
            offsetX = 0;
            offsetY = (currentHeight - renderHeight) / 2;
        }

        const rect = wrapper.getBoundingClientRect();
        const clickX = e.clientX - rect.left - offsetX;
        const clickY = e.clientY - rect.top - offsetY;

        if (clickX < 0 || clickX > renderWidth || clickY < 0 || clickY > renderHeight) return;

        const CSV_REF_WIDTH = 640;
        const CSV_REF_HEIGHT = 1136;
        
        const scaleX = CSV_REF_WIDTH / renderWidth;
        const scaleY = CSV_REF_HEIGHT / renderHeight;

        const realClickX = clickX * scaleX;
        const realClickY = clickY * scaleY;

        let closestAyah = null;
        let minDistance = Infinity;

        pageCoords.forEach(coord => {
            let dx = coord.x - realClickX;
            let dy = coord.y - realClickY;

            if (dy < -20) dy = dy * 3; 
            if (dx > 0 && Math.abs(dy) < 40) dx = dx * 2;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                closestAyah = coord.aya_id;
            }
        });

        // تأثير البصمة (Ripple Effect) الجميل
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute; width: 50px; height: 50px;
            background: rgba(25, 135, 84, 0.4); border-radius: 50%;
            left: ${e.clientX - rect.left - 25}px; 
            top: ${e.clientY - rect.top - 25}px;
            pointer-events: none; transform: scale(0); 
            transition: transform 0.3s ease-out, opacity 0.4s ease-out;
            z-index: 10;
        `;
        overlay.appendChild(ripple);
        
        requestAnimationFrame(() => ripple.style.transform = 'scale(1.5)');
        setTimeout(() => { ripple.style.opacity = '0'; setTimeout(() => ripple.remove(), 400); }, 200);

        if (closestAyah) handleAyahClick(closestAyah, pageNum);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 🚀 نظام Virtual 3-Slot Carousel
  //
  // الفكرة: 3 slots ثابتة في الـ DOM دايمًا (يمين - وسط - يسار)
  //   slot[0] = currentPage + 1  (الصفحة الأصغر رقمًا، على اليمين)
  //   slot[1] = currentPage      (الصفحة الحالية، في المنتصف)  ← الـ track يتمركز عليها
  //   slot[2] = currentPage - 1  (الصفحة الأكبر رقمًا، على اليسار)
  //
  // عند التقليب:
  //   ✅ بنغير محتوى الـ slots فقط (appendChild لعناصر من الكاش)
  //   ✅ الصور من الكاش تظهر فورًا بدون أي loading
  //   ✅ الـ track يتحرك بـ CSS transition فقط على الـ GPU
  //   ✅ مفيش innerHTML = '' أو removeChild في أثناء التقليب
  // ═══════════════════════════════════════════════════════════════

  // كاش الـ DOM: { pageNum → pageElement } — لا يُحذف طوال الجلسة
  const _domPageCache = {};

  // Preload صورة في كاش المتصفح بدون إضافتها للـ DOM
  const _imgPreloadCache = {};
  function _preloadImg(pageNum) {
    if (pageNum < 1 || pageNum > TOTAL_PAGES || _imgPreloadCache[pageNum]) return;
    _imgPreloadCache[pageNum] = true;
    const img = new Image();
    img.src = `/assets/quran_images/${pageNum}.jpg`;
  }

  // بناء أو استرجاع عنصر صفحة جاهز من الكاش
  function _getPage(pageNum) {
    if (_domPageCache[pageNum]) return _domPageCache[pageNum];
    const el = _buildPageEl(pageNum);
    _domPageCache[pageNum] = el;
    _loadPageContent(el, pageNum);
    if (!_pageCache[pageNum]) _fetchPageData(pageNum).catch(() => {});
    return el;
  }

  // ─── إعداد الـ Track: أنشئ الـ 3 slots مرة واحدة فقط، ثم حدّث محتواها ───
  function _setupTrack(currentPage) {
    if (!_swipeTrack) return;

    // أنشئ الـ 3 slots إذا مش موجودين (أول مرة فقط)
    if (_swipeTrack.children.length !== 3) {
      _swipeTrack.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const slot = document.createElement('div');
        slot.className = 'quran-swipe-slot';
        // CSS للـ slot: نفس عرض الشاشة تمامًا
        slot.style.cssText = 'flex:0 0 100vw;width:100vw;height:100%;overflow:hidden;position:relative;';
        _swipeTrack.appendChild(slot);
      }
      // عدّل عرض الـ track ليكون 300vw
      _swipeTrack.style.width = '300vw';
    }

    const slots = _swipeTrack.children;
    const pagesToShow = [currentPage + 1, currentPage, currentPage - 1];

    pagesToShow.forEach((p, i) => {
      const slot = slots[i];
      // أزل العنصر القديم من الـ slot بدون حذفه (يبقى في الكاش)
      while (slot.firstChild) slot.removeChild(slot.firstChild);

      if (p < 1 || p > TOTAL_PAGES) {
        slot.style.visibility = 'hidden';
        return;
      }
      slot.style.visibility = '';

      const pageEl = _getPage(p);
      pageEl.classList.toggle('active-page', p === currentPage);
      pageEl.classList.toggle('peek-page',   p !== currentPage);
      slot.appendChild(pageEl);
    });

    // تمركز فوري على الـ slot الأوسط (index=1) بدون أنيميشن
    _swipeTrack.classList.add('no-transition');
    _centerTrack();
    // إزالة no-transition في الـ frame التالي
    requestAnimationFrame(() => _swipeTrack.classList.remove('no-transition'));

    // Preload الصفحات المجاورة البعيدة (صور + بيانات)
    [currentPage + 2, currentPage - 2, currentPage + 3, currentPage - 3].forEach(_preloadImg);
    [currentPage + 2, currentPage - 2].forEach(p => {
      if (p >= 1 && p <= TOTAL_PAGES && !_pageCache[p]) _fetchPageData(p).catch(() => {});
    });
  }

  // الـ track دايمًا بيتمركز على الـ slot الأوسط = translateX(-100vw)
  function _centerTrack() {
    if (!_swipeTrack) return;
    const w = window.innerWidth;
    _swipeTrack.style.transform = `translateX(${-w}px)`;
  }

  // ─── الانتقال لصفحة: synchronous تمامًا، بدون await ───
  function _swipeToPage(newPage) {
    if (!_swipeTrack || newPage < 1 || newPage > TOTAL_PAGES) return;
    window.currentPage  = newPage;
    window._navSurah     = null;
    window._navSurahPage = null;

    _setupTrack(newPage);

    // حدّث العنوان والجزء بدون إعادة رندر كاملة
    if (window.loadQuranPage) window.loadQuranPage(newPage);
  }

// ─── 1. تحديث Touch Swipe (فصل منطق المصحف النصي عن المصور) ───
  (function() {
    let _tx = 0, _ty = 0, _tt = 0;
    let _dragging = false;
    let _startTransform = 0; 
    let _locked = false;
    let _rafId = null;

    document.addEventListener('touchstart', e => {
      const qs = document.getElementById('quran-section');
      if (!qs || qs.classList.contains('d-none')) return;

      const tag = e.target?.tagName?.toUpperCase();
      if (['BUTTON','INPUT','SELECT','TEXTAREA','A'].includes(tag)) return;

      const t = e.changedTouches[0];
      _tx = t.clientX; _ty = t.clientY; _tt = Date.now();
      _dragging = true;

      // 🌟 نهيئ حركة الـ CSS فقط لو إحنا في المصحف المصور
      if (window._imageMushafActive && _swipeTrack) {
        _startTransform = -window.innerWidth; // تمركز الخانة الوسطى دائماً
        _swipeTrack.classList.add('no-transition');
      }
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      if (!_dragging) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - _tx; 
      const dy = t.clientY - _ty;

      // 🌟 فصل المنطق: المصحف المصور يتفاعل، والمصحف النصي يُترك للسكرول الأصلي 🌟
      if (window._imageMushafActive && _swipeTrack) {
        // إلغاء السحب الأفقي لو المستخدم بيسحب الشاشة لفوق/لتحت بوضوح
        if (Math.abs(dy) > Math.abs(dx) + 15) {
          _dragging = false;
          _swipeTrack.classList.remove('no-transition');
          _centerTrack();
          return;
        }

        if (_rafId) cancelAnimationFrame(_rafId);
        _rafId = requestAnimationFrame(() => {
          let resistance = 1;
          // إضافة مقاومة عند الوصول لأول أو آخر المصحف
          if ((window.currentPage === 1 && dx > 0) || (window.currentPage === TOTAL_PAGES && dx < 0)) {
              resistance = 0.3;
          }
          _swipeTrack.style.transform = `translateX(${_startTransform + (dx * resistance)}px)`;
        });
      } else {
        // 🛑 في المصحف النصي العادي: لا نفعل شيئاً هنا!
        // هذا يسمح للمتصفح بالقيام بالسكرول العمودي (النزول والطلوع بالصفحة) بحرية تامة
      }
    }, { passive: true });

    document.addEventListener('touchend', e => {
      if (!_dragging) return;
      _dragging = false;
      if (_rafId) cancelAnimationFrame(_rafId);
      
      if (_swipeTrack) _swipeTrack.classList.remove('no-transition');

      const t  = e.changedTouches[0];
      const dx = t.clientX - _tx;
      const dy = t.clientY - _ty;
      const dt = Date.now() - _tt;

      // ─── 1. منطق المصحف المصور ───
      if (window._imageMushafActive && _swipeTrack) {
        // الارتداد (رجوع الصفحة للمنتصف) لو السحب بطيء أو مسافته قصيرة
        if (dt > 500 || Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx) * 0.8) {
          _centerTrack();
          return;
        }

        if (_locked) { _centerTrack(); return; }
        _locked = true; 
        setTimeout(() => { _locked = false; }, 300); 
        
        if (dx < 0) { // سحب لليسار (يقلب للصفحة التالية في المصحف)
          if (window.currentPage > 1) _swipeToPage(window.currentPage - 1);
          else _centerTrack();
        } else { // سحب لليمين (يقلب للصفحة السابقة)
          if (window.currentPage < TOTAL_PAGES) _swipeToPage(window.currentPage + 1);
          else _centerTrack();
        }
      } 
      // ─── 2. منطق المصحف النصي العادي ───
      else {
        // نتأكد إنها سحبة أفقية سريعة ومقصودة (مش سكرول لتحت ولا مجرد كليك)
        if (dt > 600 || Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) {
            return; 
        }

        if (_locked) return;
        _locked = true; 
        setTimeout(() => { _locked = false; }, 350);

        // التقليب في المصحف النصي
        if (dx < 0) { // سحب لليسار
            _normalPageNav(-1); 
        } else { // سحب لليمين
            _normalPageNav(+1); 
        }
      }
    }, { passive: true });
  })();

  // ─── 2. تحديث hook: تهيئة وتوجيه صحيح من الفهرس ───
  const _origLoad = window.loadQuranPage;
  if (_origLoad) {
    window.loadQuranPage = async function(pageNum, surahNum, ayahNum, ...rest) {
      const isImageMushafMode = window._imageMushafActive === true;

      if (isImageMushafMode) {
        document.body.classList.add('fullscreen-reading');
      }

      const targetPage = parseInt(pageNum, 10);
      window.currentPage = targetPage;

      if (surahNum && parseInt(surahNum) > 0) {
        window._navSurah     = parseInt(surahNum);
        window._navSurahPage = targetPage;
      } else if (window._navSurah && window._navSurahPage === targetPage) {
        surahNum = window._navSurah;
      }

      if (isImageMushafMode && !document.getElementById('quran-pages-track-wrapper')) {
        _initSwipeUI();
      }
      
      const result = await _origLoad.call(this, targetPage, surahNum, ayahNum, ...rest);
      
      if (isImageMushafMode && document.body.classList.contains('swipe-nav-active') && typeof _setupTrack === 'function') {
        _setupTrack(targetPage);

        if (surahNum) {
          setTimeout(() => {
            const activePage = document.querySelector('.quran-swipe-page.active-page');
            if (activePage) {
              let targetEl = null;
              if (ayahNum && parseInt(ayahNum) > 1) {
                targetEl = activePage.querySelector(`#ayah-${surahNum}-${ayahNum}`);
              } else {
                targetEl = activePage.querySelector(`#surah-header-${surahNum}`);
              }
              if (targetEl) {
                const topPos = targetEl.offsetTop;
                activePage.scrollTo({ top: Math.max(0, topPos - 40), behavior: 'smooth' });
                if (ayahNum && parseInt(ayahNum) > 1) {
                    const wrapper = targetEl.closest('.verse-wrapper');
                    if (wrapper) {
                        wrapper.style.backgroundColor = 'rgba(212, 175, 55, 0.2)';
                        setTimeout(() => { wrapper.style.backgroundColor = 'transparent'; }, 2000);
                    }
                }
              } else {
                activePage.scrollTo({ top: 0, behavior: 'instant' });
              }
            }
          }, 300); 
        }

        const el = document.documentElement;
        if (!document.fullscreenElement) {
            if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        }
      } else if (!isImageMushafMode && surahNum && ayahNum) {
        setTimeout(() => {
          const targetEl = document.getElementById(`ayah-${surahNum}-${ayahNum}`);
          if (targetEl) {
            const rect    = targetEl.getBoundingClientRect();
            const navH    = (document.getElementById('main-navbar')?.offsetHeight || 60) + 10;
            const scrollY = rect.top + window.scrollY - navH;
            window.scrollTo({ top: Math.max(0, scrollY), behavior: 'smooth' });
            targetEl.style.backgroundColor = 'rgba(25, 135, 84, 0.2)';
            setTimeout(() => { targetEl.style.backgroundColor = 'transparent'; }, 2500);
          }
        }, 400);
      }

      return result;
    };
  }

  // ─── تهيئة أولية ───
  document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(() => {
      const qs = document.getElementById('quran-section');
      if (qs && !qs.classList.contains('d-none')) {
        if (window._imageMushafActive === true && !document.getElementById('quran-pages-track-wrapper')) {
          _initSwipeUI();
          setTimeout(() => {
            if (window.currentPage && !document.querySelector('.quran-swipe-page')) {
              _setupTrack(window.currentPage);
            }
          }, 50);
        }
      }
    });
    const qs = document.getElementById('quran-section');
    if (qs) observer.observe(qs, { attributes: true, attributeFilter: ['class'] });
  });

  window._initSwipeUI = _initSwipeUI;
  window._setupTrack  = _setupTrack;

  // ─── التنقل في المصحف النصي العادي ───
  function _normalPageNav(dir) {
    const newPage = (window.currentPage || 1) + dir;
    if (newPage < 1 || newPage > TOTAL_PAGES) return;
    if (window.loadQuranPage) window.loadQuranPage(newPage);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ─── أزرار التنقل ───
  document.getElementById('btn-prev-page')?.addEventListener('click', () => {
    if (window._imageMushafActive && _swipeTrack) {
      if (window.currentPage < TOTAL_PAGES) _swipeToPage(window.currentPage + 1);
    } else {
      _normalPageNav(+1); 
    }
  });
  document.getElementById('btn-next-page')?.addEventListener('click', () => {
    if (window._imageMushafActive && _swipeTrack) {
      if (window.currentPage > 1) _swipeToPage(window.currentPage - 1);
    } else {
      _normalPageNav(-1); 
    }
  });

  window.addEventListener('resize', () => {
      if (_swipeTrack) {
          _swipeTrack.classList.add('no-transition');
          _centerTrack();
          setTimeout(() => _swipeTrack.classList.remove('no-transition'), 50);
      }
  });

// ─── معالجة الخروج من وضع ملء الشاشة (شامل للفيديو والمصحف) ───
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        window._lastFullscreenElement = document.fullscreenElement;
    } 
    else {
        const wasVideo = window._lastFullscreenElement && window._lastFullscreenElement.tagName === 'VIDEO';
        
        if (wasVideo) {
            console.log("📺 تم الخروج من فيديو، تجاهل أوامر المصحف.");
            window._lastFullscreenElement = null; 
            return; 
        }

        if (window._imageMushafActive) {
            if (typeof window.exitQuranMode === 'function') {
                window.exitQuranMode();
            }
            window._lastFullscreenElement = null;
            return;
        }

        const quranSection = document.getElementById('quran-section');
        if (quranSection && !quranSection.classList.contains('d-none')) {
            if (typeof _swipeTrack !== 'undefined' && _swipeTrack) {
                setTimeout(() => {
                    _swipeTrack.classList.add('no-transition');
                    if (typeof _centerTrack === 'function') _centerTrack();
                    setTimeout(() => _swipeTrack.classList.remove('no-transition'), 50);
                }, 100);
            }
        }

        window._lastFullscreenElement = null; 
    }
});

})();

// ─── إبقاء الشاشة مضاءة أثناء القراءة (Wake Lock) ───
let _wakeLockObj = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      _wakeLockObj = await navigator.wakeLock.request('screen');
      console.log('💡 تم تفعيل إبقاء الشاشة مضاءة');
      _wakeLockObj.addEventListener('release', () => {
        console.log('💡 تم إلغاء إبقاء الشاشة مضاءة (توفير البطارية)');
      });
    } else {
        console.log('⚠️ متصفحك لا يدعم ميزة Wake Lock');
    }
  } catch (err) {
    console.error(`خطأ في Wake Lock: ${err.message}`);
  }
}

function releaseWakeLock() {
  if (_wakeLockObj !== null) {
    _wakeLockObj.release().then(() => {
      _wakeLockObj = null;
    });
  }
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && document.body.classList.contains('fullscreen-reading')) {
    requestWakeLock();
  }
});

let _previousFullscreenState = document.body.classList.contains('fullscreen-reading');

const fullscreenObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
            const currentFullscreenState = document.body.classList.contains('fullscreen-reading');
            if (currentFullscreenState !== _previousFullscreenState) {
                _previousFullscreenState = currentFullscreenState; 
                
                if (typeof _autoScrollReq !== 'undefined' && _autoScrollReq) {
                    if (typeof _stopAutoScroll === 'function') _stopAutoScroll();
                }

                if (currentFullscreenState) {
                    requestWakeLock(); 
                } else {
                    releaseWakeLock(); 
                }
            }
        }
    });
});

fullscreenObserver.observe(document.body, { attributes: true });

// ===================================================
// ─── الحفظ السريع بنقرة مزدوجة (Double Tap) 🔖 ───
// ===================================================

// 1. التأكد من وجود الأيقونة الذهبية
let tapIcon = document.querySelector('.double-tap-icon');
if (!tapIcon) {
    tapIcon = document.createElement('i');
    tapIcon.className = 'fas fa-bookmark double-tap-icon';
    document.body.appendChild(tapIcon);
}

let _clickTimer = null;
let _clickCount = 0;

const quranContainer = document.getElementById('quran-book');

if (quranContainer) {
    quranContainer.addEventListener('click', function(e) {
        // البحث عن الغلاف الذي يحمل بيانات الآية
        const verseWrapper = e.target.closest('.verse-wrapper');
        const isAyah = e.target.closest('.ayah-text') || verseWrapper;
        
        if (!verseWrapper || !isAyah) return;

        if (window.isLongPress) return;

        // منع فتح القائمة الافتراضي من Bootstrap
        if (isAyah.hasAttribute('data-bs-toggle') || verseWrapper.hasAttribute('data-bs-toggle')) {
            const target = isAyah.getAttribute('data-bs-target') || verseWrapper.getAttribute('data-bs-target');
            verseWrapper.setAttribute('data-saved-target', target);
            isAyah.removeAttribute('data-bs-toggle');
            isAyah.removeAttribute('data-bs-target');
            verseWrapper.removeAttribute('data-bs-toggle');
            verseWrapper.removeAttribute('data-bs-target');
        }

        if (e.detail === 555) return; 

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        _clickCount++;

        if (_clickCount === 1) {
            _clickTimer = setTimeout(() => {
                _clickCount = 0;
                
                // 1. استخراج بيانات الآية من الـ HTML
                const surahNum = parseInt(verseWrapper.getAttribute('data-surah'));
                const ayahNum = parseInt(verseWrapper.getAttribute('data-ayah'));
                const surahName = verseWrapper.getAttribute('data-surahname');
                const ayahTextEl = verseWrapper.querySelector('.ayah-text');
                const ayahText = ayahTextEl ? ayahTextEl.innerText : "";
                const isBookmarked = verseWrapper.getAttribute('data-bookmarked') === 'true';

                // 2. تحديث البيانات المختارة عالمياً
                window.selectedVerseData = { 
                    surah: surahNum, 
                    ayah: ayahNum, 
                    surahName: surahName, 
                    text: ayahText,
                    isBookmarked: isBookmarked 
                };

                // 3. 🔥 تحديث واجهة القائمة (Bottom Sheet Label) بالاسم والرقم 🔥
                const sheetLabel = document.getElementById('verseActionSheetLabel');
                if(sheetLabel) {
                    sheetLabel.innerText = ` ${surahName} - آية ${ayahNum}`;
                }
                
                // 4. تحديث حالة زر الحفظ (Bookmark) داخل القائمة
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

                // 5. فتح القائمة برمجياً
                const targetId = verseWrapper.getAttribute('data-saved-target') || '#verseActionSheet';
                const sheetEl = document.querySelector(targetId);
                if (sheetEl && window.bootstrap) {
                    const bsSheet = window.bootstrap.Offcanvas.getOrCreateInstance(sheetEl);
                    bsSheet.show();
                }
            }, 300);
        } 
        else if (_clickCount === 2) {
            // دبل كليك: تنفيذ الحفظ السريع
            clearTimeout(_clickTimer);
            _clickCount = 0;

            const tapIcon = document.querySelector('.double-tap-icon'); // تأكد من وجوده في الـ HTML
            if (tapIcon) {
                tapIcon.classList.add('animate-pop');
                setTimeout(() => tapIcon.classList.remove('animate-pop'), 800);
            }

            const originalSwal = window.Swal ? window.Swal.fire : null;
            if (window.Swal) window.Swal.fire = () => {};

            // تحديث البيانات قبل الحفظ
            const surahNum = parseInt(verseWrapper.getAttribute('data-surah'));
            const ayahNum = parseInt(verseWrapper.getAttribute('data-ayah'));
            window.selectedVerseData = { surah: surahNum, ayah: ayahNum };

            setTimeout(() => {
                const bookmarkBtn = document.querySelector('.action-btn-bookmark');
                if (bookmarkBtn) {
                    bookmarkBtn.click();
                }
                if (originalSwal) window.Swal.fire = originalSwal;
            }, 50);
        }
    }, { capture: true }); 
}







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
    '/stories':       'stories',
    '/surah-details': 'surah-details'
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

    if (savedVersion !== currentVersion) {
      console.log(`🔄 [UPDATE] تم تحديث التطبيق إلى ${currentVersion} — جاري مسح الكاش والـ channels القديمة`);
      
      // مسح كاش السيرفر وركر
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

      // ✅ مسح الـ notification channels القديمة عند كل تحديث لضمان التحديث النظيف
      try { await LocalNotifications.deleteChannel({ id: 'khatmah-channel' }); } catch(e) {}
      try { await LocalNotifications.deleteChannel({ id: 'azan-channel' }); } catch(e) {}
      try { await LocalNotifications.deleteChannel({ id: 'quiz-channel-silent' }); } catch(e) {}
    }

    localStorage.setItem('app_version', currentVersion);

    // 🔔 إعدادات الإشعارات
    await LocalNotifications.cancel({ notifications: [{ id: 101 }] });
    await App.removeAllListeners();
    await App.addListener('backButton', ({ canGoBack }) => {
      if (typeof Swal !== 'undefined' && Swal.isVisible()) {
        Swal.close();
        return; 
      }
      const openModal = document.querySelector('.modal.show');
      if (openModal) {
        const modalInstance = bootstrap.Modal.getInstance(openModal);
        if (modalInstance) modalInstance.hide();
        return;
      }
      const openOffcanvas = document.querySelector('.offcanvas.show');
      if (openOffcanvas) {
        const offcanvasInstance = bootstrap.Offcanvas.getInstance(openOffcanvas);
        if (offcanvasInstance) offcanvasInstance.hide();
        return;
      }
      // ✅ الإصلاح: لو المصحف المصور شغال، نخرج منه بدل ما نروح برا التطبيق
      if (window._imageMushafActive) {
        if (typeof window.exitQuranMode === 'function') {
          window.exitQuranMode();
        }
        return;
      }
      const home = document.getElementById('home-section');
      if (home && !home.classList.contains('d-none')) {
        stopAllMedia();
        canGoBack ? window.history.back() : App.exitApp();
      } else {
        if (canGoBack) window.history.back();
        else { stopAllMedia(); window.showSection('home'); }
      }
    });

    await App.addListener('appUrlOpen', ({ url }) => {
      try {
        const urlObj = new URL(url);
        if (urlObj.pathname === '/resetPassword' || urlObj.pathname === '/reset-password.html') {
                window.showSection('reset-password');
        }
      } catch (e) { console.warn('Deep link error:', e); }
    });

    // ملاحظة: الـ Listener الأساسي للإشعارات موجود تحت في الـ DOMContentLoaded فمش محتاجينه هنا

    const notifs = await LocalNotifications.requestPermissions();
    if (notifs.display === 'granted') {
      // 🌟 إنشاء الـ channels (بعد المسح اللي اتعمل فوق لو في تحديث)
      await LocalNotifications.createChannel({ id: 'azan-channel', name: 'تنبيهات الصلاة', importance: 5, sound: 'azan_short.mp3', visibility: 1, vibration: true });
      await LocalNotifications.createChannel({ id: 'khatmah-channel', name: 'تنبيهات الورد', importance: 4, visibility: 1, vibration: true });
      
      // 🌟 التعديل الأهم: إنشاء قناة صامتة (أو بالإشعار العادي) للمسابقة
      await LocalNotifications.createChannel({ 
        id: 'quiz-channel-silent', 
        name: 'إشعارات المسابقة', 
        description: 'تنبيهات المسابقة الدينية اليومية',
        importance: 3, // أهمية عادية (Default Notification Sound)
        visibility: 1,
        vibration: true
      });
      
      await scheduleFridayKahfNotification();
      await scheduleDuhaNotification();
      await scheduleIslamicEvents();
      await scheduleDailyQuizNotification(); // هتستخدم القناة والـ IDs الجديدة

      if (typeof scheduleDailyWird === 'function') {
          await scheduleDailyWird(null);
      }
      
      const savedPrayers = await localforage.getItem('offline_prayers');
      if (savedPrayers && savedPrayers.timings) {
         await scheduleAllPrayers({ timings: savedPrayers.timings, rawTimestamps: savedPrayers.rawTimestamps });
      } else {
          console.log('⚠️ [PRAYERS] لا توجد مواقيت محفوظة، سيتم الجدولة عند فتح صفحة الصلاة');
      }
      console.log('✅ [NOTIFICATIONS] تم جدولة جميع التنبيهات بنجاح');
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

    if (serverBuild <= currentBuild) return;

    const lastNotifiedVersion = localStorage.getItem('last_notified_update');
    if (lastNotifiedVersion !== String(serverBuild)) {
      // ✅ تأخير بسيط عشان الـ channel يكون جاهز
      setTimeout(async () => {
        try {
          await LocalNotifications.schedule({
            notifications: [{
              title: "تحديث جديد متاح! 🎉",
              body: `إصدار ${data.version} متوفر الآن بمميزات جديدة. اضغط للتحميل.`,
              id: 102,
              extra: { type: 'update', url: data.downloadUrl },
              smallIcon: 'ic_notification',
              channelId: 'khatmah-channel'
            }]
          });
        } catch(e) { console.warn('Update notification failed:', e); }
      }, 2000);

      localStorage.setItem('last_notified_update', String(serverBuild));
    }

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

// const scheduleWebFridayReminder = () => {
//   const now = new Date();
//   const isFriday = now.getDay() === 5;
//   const hour = now.getHours();

//   if (isFriday && hour < 12) {
//     const lastShown = localStorage.getItem('kahf_reminder_shown');
//     const today     = now.toDateString();

//     if (lastShown !== today) {
//       setTimeout(() => {
//         Swal.fire({
//           title: '📖 يوم الجمعة المبارك',
//           html: `
//             <div style="font-family:'Amiri'; direction:rtl; text-align:right;">
//               <p style="font-size:1.1rem; line-height:1.8;">
//                 <strong>من قرأ سورة الكهف يوم الجمعة أضاء له النور ما بين الجمعتين</strong>
//               </p>
//               <p class="text-muted small">رواه البيهقي والحاكم</p>
//             </div>`,
//           confirmButtonText: '📖 اقرأ سورة الكهف الآن',
//           cancelButtonText:  'لاحقاً',
//           showCancelButton:   true,
//           confirmButtonColor: '#198754',
//           cancelButtonColor:  '#6c757d',
//           imageUrl: null,
//         }).then(result => {
//           if (result.isConfirmed) {
//             // سورة الكهف رقم 18 - الصفحة 293
//             window.showSection('quran');
//             window.loadQuranPage(293);
//           }
//         });
//         localStorage.setItem('kahf_reminder_shown', today);
//       }, 5000);
//     }
//   }
// };

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

    // 🕊️ آيات السكينة والجبر (إضافات جديدة)
    { text: "قُل لَّن يُصِيبَنَا إِلَّا مَا كَتَبَ اللَّهُ لَنَا هُوَ مَوْلَانَا ۚ وَعَلَى اللَّهِ فَلْيَتَوَكَّلِ الْمُؤْمِنُونَ", surah: "التوبة", number: "51" },
    { text: "وَمَا كَانَ رَبُّكَ نَسِيًّا", surah: "مريم", number: "64" },
    { text: "إِنَّ مَعِيَ رَبِّي سَيَهْدِينِ", surah: "الشعراء", number: "62" },
    { text: "وَاللَّهُ يَعْلَمُ وَأَنتُمْ لَا تَعْلَمُونَ", surah: "البقرة", number: "216" },
    { text: "وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ", surah: "هود", number: "115" },
    { text: "وَلَا تَخَافِي وَلَا تَحْزَنِي ۖ إِنَّا رَادُّوهُ إِلَيْكِ", surah: "القصص", number: "7" },
    { text: "وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ", surah: "ق", number: "16" },

    // 🤲 آيات الدعاء والاستجابة
    { text: "وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ", surah: "غافر", number: "60" },
    { text: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ", surah: "البقرة", number: "186" },
    { text: "أَمَّن يُجِيبُ الْمُضْطَرَّ إِذَا دَعَاهُ وَيَكْشِفُ السُّوءَ", surah: "النمل", number: "62" },
    { text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", surah: "البقرة", number: "201" },
    { text: "إِنَّ رَبِّي قَرِيبٌ مُّجِيبٌ", surah: "هود", number: "61" },

    // 🛡️ آيات التوكل واليقين
    { text: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا * وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ", surah: "الطلاق", number: "2-3" },
    { text: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", surah: "الطلاق", number: "3" },
    { text: "وَأُفَوِّضُ أَمْرِي إِلَى اللَّهِ ۚ إِنَّ اللَّهَ بَصِيرٌ بِالْعِبَادِ", surah: "غافر", number: "44" },
    { text: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", surah: "آل عمران", number: "173" },
    { text: "وَتَوَكَّلْ عَلَى الْحَيِّ الَّذِي لَا يَمُوتُ", surah: "الفرقان", number: "58" },
    { text: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", surah: "البقرة", number: "286" },
    { text: "إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ", surah: "آل عمران", number: "159" },

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
    { text: "« كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ »", source: "متفق عليه" },
    { text: "« إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى »", source: "متفق عليه" },
    { text: "« الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ »", source: "متفق عليه" },
    { text: "« لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ »", source: "متفق عليه" },
    { text: "« الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ »", source: "متفق عليه" },
    { text: "« مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ »", source: "متفق عليه" },
    { text: "« مَنْ لَا يَرْحَمُ لَا يُرْحَمُ »", source: "متفق عليه" },
    { text: "« يَسِّرُوا وَلَا تُعَسِّرُوا، وَبَشِّرُوا وَلَا تُنَفِّرُوا »", source: "متفق عليه" },
    { text: "« أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ »", source: "متفق عليه" },
    { text: "« مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ »", source: "متفق عليه" },
    { text: "« إِنَّ الصِّدْقَ يَهْدِي إِلَى الْبِرِّ، وَإِنَّ الْبِرَّ يَهْدِي إِلَى الْجَنَّةِ »", source: "متفق عليه" },
    { text: "« سِبَابُ الْمُسْلِمِ فُسُوقٌ، وَقِتَالُهُ كُفْرٌ »", source: "متفق عليه" },
    
    // ✨ أحاديث الطمأنينة والرحمة (متفق عليه - إضافات جديدة)
    { text: "« أَنَا عِنْدَ ظَنِّ عَبْدِي بِي، وَأَنَا مَعَهُ إِذَا ذَكَرَنِي »", source: "متفق عليه" },
    { text: "« مَا يُصِيبُ الْمُسْلِمَ مِنْ نَصَبٍ وَلَا وَصَبٍ، وَلَا هَمٍّ وَلَا حُزْنٍ، وَلَا أَذًى وَلَا غَمٍّ، حَتَّى الشَّوْكَةِ يُشَاكُهَا، إِلَّا كَفَّرَ اللَّهُ بِهَا مِنْ خَطَايَاهُ »", source: "متفق عليه" },
    { text: "« مَثَلُ الْمُؤْمِنِينَ فِي تَوَادِّهِمْ، وَتَرَاحُمِهِمْ، وَتَعَاطُفِهِمْ مَثَلُ الْجَسَدِ إِذَا اشْتَكَى مِنْهُ عُضْوٌ تَدَاعَى لَهُ سَائِرُ الْجَسَدِ بِالسَّهَرِ وَالْحُمَّى »", source: "متفق عليه" },
    { text: "« كُلُّ سُلَامَى مِنَ النَّاسِ عَلَيْهِ صَدَقَةٌ، كُلَّ يَوْمٍ تَطْلُعُ فِيهِ الشَّمْسُ »", source: "متفق عليه" },

    // 📘 أحاديث صحيحة من صحيح البخاري
    { text: "« خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ »", source: "رواه البخاري" },
    { text: "« لَيْسَ الشَّدِيدُ بِالصُّرْعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ »", source: "رواه البخاري" },
    { text: "« مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُصِبْ مِنْهُ »", source: "رواه البخاري" },
    { text: "« بَلِّغُوا عَنِّي وَلَوْ آيَةً »", source: "رواه البخاري" },

    // 📗 أحاديث صحيحة من صحيح مسلم
    { text: "« مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا »", source: "رواه مسلم" },
    { text: "« الدِّينُ النَّصِيحَةُ »", source: "رواه مسلم" },
    { text: "« مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا، سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ »", source: "رواه مسلم" },
    { text: "« الْبِرُّ حُسْنُ الْخُلُقِ »", source: "رواه مسلم" },
    { text: "« لَا تَحْقِرَنَّ مِنَ الْمَعْرُوفِ شَيْئًا، وَلَوْ أَنْ تَلْقَى أَخَاكَ بِوَجْهٍ طَلْقٍ »", source: "رواه مسلم" },
    { text: "« عَجَبًا لِأَمْرِ الْمُؤْمِنِ إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ »", source: "رواه مسلم" },
    { text: "« مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا، نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ »", source: "رواه مسلم" },
    { text: "« إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ »", source: "رواه مسلم" },
    { text: "« مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ، وَمَا زَادَ اللَّهُ عَبْدًا بِعَفْوٍ إِلَّا عِزًّا »", source: "رواه مسلم" },
    { text: "« اقْرَءُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ »", source: "رواه مسلم" },
    { text: "« الدَّالُّ عَلَى الْخَيْرِ كَفَاعِلِهِ »", source: "رواه مسلم" },
    { text: "« لَا يَدْخُلُ الْجَنَّةَ مَنْ كَانَ فِي قَلْبِهِ مِثْقَالُ ذَرَّةٍ مِنْ كِبْرٍ »", source: "رواه مسلم" },
    { text: "« رَكْعَتَا الْفَجْرِ خَيْرٌ مِنَ الدُّنْيَا وَمَا فِيهَا »", source: "رواه مسلم" },
    { text: "« الطُّهُورُ شَطْرُ الْإِيمَانِ، وَالْحَمْدُ لِلَّهِ تَمْلَأُ الْمِيزَانَ »", source: "رواه مسلم" },
    { text: "« لَا يَسْتُرُ اللَّهُ عَلَى عَبْدٍ فِي الدُّنْيَا، إِلَّا سَتَرَهُ اللَّهُ يَوْمَ الْقِيَامَةِ »", source: "رواه مسلم" },
    { text: "« وَمَا تَوَاضَعَ أَحَدٌ لِلَّهِ إِلَّا رَفَعَهُ اللَّهُ »", source: "رواه مسلم" },
    { text: "« إِنَّ اللَّهَ لَا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ، وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ »", source: "رواه مسلم" },

    // 📙 أحاديث صحيحة وحسنة من السنن (الترمذي وأبو داود)
    { text: "« رِضَا الرَّبِّ فِي رِضَا الْوَالِدِ، وَسَخَطُ الرَّبِّ فِي سَخَطِ الْوَالِدِ »", source: "رواه الترمذي وصححه الألباني" },
    { text: "« تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ »", source: "رواه الترمذي وصححه الألباني" },
    { text: "« مِنْ حُسْنِ إِسْلَامِ الْمَرْءِ تَرْكُهُ مَا لَا يَعْنِيهِ »", source: "رواه الترمذي وحسنه الألباني" },
    { text: "« مَنْ صَمَتَ نَجَا »", source: "رواه الترمذي وصححه الألباني" },
    { text: "« اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ »", source: "رواه الترمذي وقال حسن صحيح" },
    { text: "« إِنَّ مِنْ أَحَبِّكُمْ إِلَيَّ وَأَقْرَبِكُمْ مِنِّي مَجْلِسًا يَوْمَ الْقِيَامَةِ أَحَاسِنَكُمْ أَخْلَاقًا »", source: "رواه الترمذي وصححه الألباني" },
    { text: "« بَشِّرِ الْمَشَّائِينَ فِي الظُّلَمِ إِلَى الْمَسَاجِدِ بِالنُّورِ التَّامِّ يَوْمَ الْقِيَامَةِ »", source: "رواه أبو داود وصححه الألباني" }
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
    
    const toArabicNum = (n) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
    
    let textToShare = document.getElementById(textId).innerText.trim();
    let sourceToShare = document.getElementById(sourceId).innerText.trim();
    
    sourceToShare = toArabicNum(sourceToShare);

    // 🌟 التعديل هنا: سحب الرابط الديناميكي وإضافته للرسالة 🌟
    const defaultLink = "https://play.google.com/store/apps/details?id=com.mohamedashraf.aqra";
    const dynamicShareLink = localStorage.getItem('dynamic_share_url') || defaultLink;
    const shareMessage = `"${textToShare}"\n\n[ ${sourceToShare} ]\n\n✨ شارك في الأجر وحمل تطبيق "اقرأ":\n${dynamicShareLink}`;

    // 🌟 إعداد النصوص المتغيرة
    const preText = isAyah 
        ? 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ' 
        : 'قَالَ رَسُولُ اللَّهِ ﷺ';

    const appText = isAyah 
        ? 'تطبيق اقرأ — نور يومك بالقرآن الكريم' 
        : 'تطبيق اقرأ — استضئ بنور السنة النبوية';

    const contentHtml = isAyah 
        ? `
            <div style="margin-bottom: 25px;">${textToShare}</div>
            <div style="color: var(--ayah-color); font-size: 2.8rem; font-weight: bold; font-family: 'Amiri', serif;">
                ﴿ ${sourceToShare} ﴾
            </div>
          `
        : `
            <div style="margin-bottom: 25px;">${textToShare}</div>
            <div style="color: var(--ayah-color); font-size: 2.2rem; font-weight: bold; font-family: 'Amiri', serif;">
                [ ${sourceToShare} ]
            </div>
          `;

    // 🌟 ١. اكتشاف حالة التطبيق
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark' || 
                       document.body.getAttribute('data-reading') === 'night';

    // 🌟 ٢. تحديد الألوان بناءً على الوضع الحالي
    const theme = isDarkMode ? {
        bgOuter: '#151515',
        bgInner: '#1a1a1a',
        textMain: '#ffffff',
        textSurah: '#e0e0e0',
        borderOuter: '#333333',
        borderOutline: '#555555',
        borderSurah: '#777777',
        surahBg: 'rgba(255,255,255,0.02)',
        watermark: '#555555',
        ayahNum: '#888888'
    } : {
        bgOuter: '#fcf9f2',
        bgInner: '#fdf8f0',
        textMain: '#1a1a1a',
        textSurah: '#1a1a1a',
        borderOuter: '#d4af37',   
        borderOutline: '#c5a028', 
        borderSurah: '#c5a028', 
        surahBg: '#ffffff',
        watermark: '#198754',     
        ayahNum: '#d4af37'        
    };

    // 🌟 كود الـ SVG للزخرفة
    const surahFrameSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="140" viewBox="0 0 800 140">
        <defs>
            <style>
                .bg-fill      { fill: ${theme.surahBg}; }
                .frame-outer  { fill: none; stroke: ${theme.borderSurah}; stroke-width: 2.5; }
                .frame-inner  { fill: none; stroke: ${theme.borderSurah}; stroke-width: 1; opacity: 0.8; }
                .frame-fine   { fill: none; stroke: ${theme.borderSurah}; stroke-width: 0.5; opacity: 0.6; }
                .ornament     { fill: none; stroke: ${theme.borderSurah}; stroke-width: 1.5; opacity: 0.85; }
                .fill-ornament{ fill: ${theme.borderSurah}; opacity: 0.9; }
            </style>
            
            <g id="flower-complex">
                <path d="M0,-3 C5,-10 12,-20 0,-32 C-12,-20 -5,-10 0,-3 Z" class="fill-ornament"/>
                <path d="M0,-3 C5,-10 12,-20 0,-32 C-12,-20 -5,-10 0,-3 Z" transform="rotate(45)" class="fill-ornament"/>
                <path d="M0,-3 C5,-10 12,-20 0,-32 C-12,-20 -5,-10 0,-3 Z" transform="rotate(90)" class="fill-ornament"/>
                <path d="M0,-3 C5,-10 12,-20 0,-32 C-12,-20 -5,-10 0,-3 Z" transform="rotate(135)" class="fill-ornament"/>
                <path d="M0,-3 C5,-10 12,-20 0,-32 C-12,-20 -5,-10 0,-3 Z" transform="rotate(180)" class="fill-ornament"/>
                <path d="M0,-3 C5,-10 12,-20 0,-32 C-12,-20 -5,-10 0,-3 Z" transform="rotate(225)" class="fill-ornament"/>
                <path d="M0,-3 C5,-10 12,-20 0,-32 C-12,-20 -5,-10 0,-3 Z" transform="rotate(270)" class="fill-ornament"/>
                <path d="M0,-3 C5,-10 12,-20 0,-32 C-12,-20 -5,-10 0,-3 Z" transform="rotate(315)" class="fill-ornament"/>
                <circle cx="0" cy="0" r="8" class="bg-fill"/>
                <circle cx="0" cy="0" r="4" class="fill-ornament"/>
            </g>

            <g id="vines">
                <path d="M 25,-15 C 60,-40 100,-20 70,15 C 55,30 35,10 45,0 C 50,-10 65,-5 60,5" class="ornament"/>
                <path d="M 25,15 C 60,40 100,20 70,-15 C 55,-30 35,-10 45,0 C 50,10 65,5 60,-5" class="ornament"/>
                <path d="M -25,-15 C -60,-40 -100,-20 -70,15 C -55,30 -35,10 -45,0 C -50,-10 -65,-5 -60,5" class="ornament"/>
                <path d="M -25,15 C -60,40 -100,20 -70,-15 C -55,-30 -35,-10 -45,0 C -50,10 -65,5 -60,-5" class="ornament"/>
                <path d="M 60,-20 Q 75,-10 60,0 Q 45,-10 60,-20 Z" class="fill-ornament" opacity="0.7"/>
                <path d="M 60,20 Q 75,10 60,0 Q 45,10 60,20 Z" class="fill-ornament" opacity="0.7"/>
                <path d="M -60,-20 Q -75,-10 -60,0 Q -45,-10 -60,-20 Z" class="fill-ornament" opacity="0.7"/>
                <path d="M -60,20 Q -75,10 -60,0 Q -45,10 -60,20 Z" class="fill-ornament" opacity="0.7"/>
                <circle cx="85" cy="0" r="3" class="fill-ornament"/>
                <circle cx="-85" cy="0" r="3" class="fill-ornament"/>
            </g>
        </defs>

        <polygon points="30,6 770,6 794,30 794,110 770,134 30,134 6,110 6,30" class="bg-fill"/>
        <polygon points="30,6 770,6 794,30 794,110 770,134 30,134 6,110 6,30" class="frame-outer"/>
        <polygon points="32,12 768,12 788,32 788,108 768,128 32,128 12,108 12,32" class="frame-inner"/>
        <polygon points="34,16 766,16 784,34 784,106 766,124 34,124 16,106 16,34" class="frame-fine"/>

        <path d="M 220,16 Q 240,70 220,124 M 225,16 Q 245,70 225,124" class="ornament"/>
        <path d="M 580,16 Q 560,70 580,124 M 575,16 Q 555,70 575,124" class="ornament"/>

        <g transform="translate(115, 70)">
            <use href="#vines"/>
            <use href="#flower-complex"/>
        </g>
        <g transform="translate(685, 70)">
            <use href="#vines"/>
            <use href="#flower-complex"/>
        </g>
        
        <circle cx="20" cy="40" r="2.5" class="fill-ornament"/>
        <circle cx="20" cy="100" r="2.5" class="fill-ornament"/>
        <circle cx="780" cy="40" r="2.5" class="fill-ornament"/>
        <circle cx="780" cy="100" r="2.5" class="fill-ornament"/>
    </svg>
    `;

    const card = document.createElement('div');
    card.style.cssText = `
        width: 1080px; 
        min-height: 1080px; 
        background-color: ${theme.bgOuter};
        padding: 30px; 
        position: fixed; 
        left: -9999px; 
        top: 0;
        direction: rtl;
        box-sizing: border-box;
        --ayah-color: ${theme.ayahNum};
    `;
    
    card.innerHTML = `
        <div style="border: 2px solid ${theme.borderOuter}; outline: 1px solid ${theme.borderOutline}; outline-offset: -12px; padding: 50px 40px; border-radius: 16px; min-height: 1020px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; background-color: ${theme.bgInner};">

            <div style="margin-bottom: 50px; text-align: center; position: relative; width: 100%; display: flex; justify-content: center;">
                <div style="position: relative; display: inline-block;">
                    ${surahFrameSvg}
                    <div style="
                        position: absolute;
                        top: 48%; left: 50%;
                        transform: translate(-50%, -50%);
                        font-family: 'Amiri Quran', 'Amiri', serif;
                        font-size: 2.2rem;
                        color: ${theme.textSurah};
                        white-space: nowrap;
                    ">${preText}</div>
                </div>
            </div>

            <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 10px;">
                <div style="font-family: 'Amiri Quran', 'Amiri', serif; font-size: 4rem; line-height: 2.3; color: ${theme.textMain}; text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    ${contentHtml}
                </div>
            </div>
            
            <div style="margin-top: 40px; text-align: center;">
                <span style="font-family: 'Amiri', serif; font-size: 1.8rem; color: ${theme.watermark};">
                    ${appText}
                </span>
            </div>
            
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
            backgroundColor: theme.bgOuter, 
            useCORS: true 
        });
        const imgData = canvas.toDataURL('image/png');
        document.body.removeChild(card); 

        const fileNameBase = isAyah ? 'daily_ayah' : 'daily_hadith';

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const Filesystem = window.Capacitor.Plugins.Filesystem;
            const Share = window.Capacitor.Plugins.Share;

            const base64Data = imgData.split(',')[1];
            const fileName = `${fileNameBase}_share_${Date.now()}.png`;
            
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
                text: shareMessage, // تم تمرير الرسالة بالرابط الجديد
                url: uri,
                dialogTitle: 'مشاركة',
            });
            
        } else {
            const blob = await (await fetch(imgData)).blob();
            const file = new File([blob], `${fileNameBase}.png`, { type: 'image/png' });
            
            Swal.close();

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'تطبيق اقرأ 📖',
                    text: shareMessage, // تم تمرير الرسالة بالرابط الجديد
                    files: [file]
                });
            } else {
                const link = document.createElement('a');
                link.download = `${fileNameBase}.png`;
                link.href = imgData;
                link.click();
                
                await navigator.clipboard.writeText(shareMessage); // تم تمرير الرسالة بالرابط الجديد
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
    const select    = document.getElementById('radio-station-select');
    const status    = document.getElementById('radio-status');
    const playIcon  = document.getElementById('radio-play-icon');
    const radioIcon = document.getElementById('radio-icon'); // أيقونة الراديو الكبيرة

    const tryBackup = () => {
        const selectedOption = select.options[select.selectedIndex];
        const backupUrl = selectedOption.getAttribute('data-backup');

        if (backupUrl && audio.src !== backupUrl) {
            console.warn("⚠️ الرابط الأساسي تعطل، جاري محاولة الرابط البديل...");
            status.innerHTML = '<i class="fas fa-sync fa-spin me-1"></i> محاولة رابط احتياطي...';
            audio.src = backupUrl;
            audio.load();
            audio.play().then(updateUIOnSuccess).catch(e => {
                status.innerHTML = '<i class="fas fa-times text-danger me-1"></i> جميع الروابط معطلة';
            });
        } else {
            status.innerHTML = '<i class="fas fa-times text-danger me-1"></i> المحطة غير متاحة حالياً';
        }
    };

    // دالة مساعدة لتحديث الواجهة عند النجاح
    function updateUIOnSuccess() {
        playIcon.classList.replace('fa-play', 'fa-stop');
        playIcon.style.marginLeft = '0';
        status.innerHTML = '<i class="fas fa-circle text-danger me-1 blink-animation"></i> بث مباشر';
        if (radioIcon) radioIcon.classList.add('fa-fade');
    }

    if (!audio.paused) {
        audio.pause();
        audio.src = '';
        playIcon.classList.replace('fa-stop', 'fa-play');
        playIcon.style.marginLeft = '5px';
        status.innerText = 'متوقف';
        if (radioIcon) radioIcon.classList.remove('fa-fade');
        return;
    }

    status.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> جاري الاتصال...';
    audio.src = select.value;
    audio.load();
    
    // 🌟 التعديل هنا: أضفنا .then للتعامل مع حالة النجاح
    audio.play()
        .then(updateUIOnSuccess) 
        .catch(() => {
            tryBackup();
        });

    audio.onerror = function() {
        if (!audio.paused) tryBackup();
    };
};
// تشغيل المحطة الجديدة تلقائياً عند تغييرها من القائمة
// استخدام التوقيت المناسب لتبديل المحطة
document.getElementById('radio-station-select')?.addEventListener('change', function() {
    const audio  = document.getElementById('radio-audio');
    const status = document.getElementById('radio-status');

    if (!this.value) return;

    if (!audio.paused) {
        status.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> تبديل المحطة...';
        audio.pause();
        audio.src = '';
        window.toggleRadio(); // إعادة التشغيل بالمصدر الجديد
    } else {
        audio.src = this.value; // تحديث المصدر فقط للمرة القادمة
        status.innerText = 'جاهز للتشغيل';
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

        // 🔥 الاحتفالية المبهجة داخل التطبيق (تظهر يوم المناسبة أو قبلها بيوم) 🔥
        if (diffDays === 0 || diffDays === 1) { 
            const currentYear = new Date().getFullYear();
            const celebrationKey = `aqra_celebrated_${nextEvent.m}_${currentYear}`;
            
            if (!localStorage.getItem(celebrationKey)) {
                setTimeout(() => {
                    // إطلاق الزينة (Confetti)
                    fireIslamicConfetti();
                    
                    const cleanName = nextEvent.name.replace(/🌙|🎉|🕋|🐑|📅/g, '').trim();
                    Swal.fire({
                        title: nextEvent.name,
                        html: `<div style="font-family: 'Amiri', serif; font-size: 1.3rem; line-height: 1.8;">
                                تطبيق اقرأ يهنئكم بحلول <strong>${cleanName}</strong>.<br>
                                <span style="color: #198754; font-weight: bold;">تقبل الله منا ومنكم صالح الأعمال ✨</span>
                               </div>`,
                        confirmButtonText: 'كل عام وأنتم بخير',
                        confirmButtonColor: '#198754',
                        backdrop: `rgba(25, 135, 84, 0.15)`,
                        customClass: { popup: 'rounded-4' }
                    }).then(() => {
                        localStorage.setItem(celebrationKey, 'true'); // عشان متظهرش تاني
                    });
                }, 1500); 
            }
        }

    } else {
        container.classList.add('d-none');
    }
};

// دالة الزينة (Confetti) الخاصة بالاحتفالية
function fireIslamicConfetti() {
    const colors = ['#198754', '#d4af37', '#ffffff', '#ffc107', '#a5d6a7'];
    if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.innerHTML = `@keyframes fall-down { to { top: 110vh; transform: rotate(720deg); } }`;
        document.head.appendChild(style);
    }
    for (let i = 0; i < 45; i++) {
        const p = document.createElement('div');
        const size = 6 + Math.random() * 8;
        p.style.cssText = `
            position: fixed;
            width: ${size}px; height: ${size}px;
            left: ${Math.random() * 100}vw;
            top: -10vh;
            background: ${colors[i % colors.length]};
            animation: fall-down ${1.5 + Math.random() * 2}s linear forwards;
            transform: rotate(${Math.random() * 360}deg);
            z-index: 99999;
            border-radius: ${i % 3 === 0 ? '50%' : '3px'};
        `;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 3500);
    }
}

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

// ─── دوال أسباب النزول والقصص 

// 1. دالة عرض كروت السور
window.renderAsbabAlNuzul = function() {
    const container = document.getElementById('nuzul-container');
    if (!container) return;

    let verses = window.quranInsights?.verses || {};
    if (Object.keys(verses).length === 0) {
        for (const key in window.quranInsights) {
            if (key !== 'surahs' && key.includes('_')) verses[key] = window.quranInsights[key];
        }
    }

    let html = '';
    
    for (let i = 1; i <= 114; i++) {
        const surahData = window.quranInsights?.surahs?.[i];
        let storiesCount = 0;
        for (const key in verses) {
            if (key.startsWith(i + '_') && verses[key].sabab && verses[key].sabab.trim() !== '') storiesCount++;
        }

        if (surahData || storiesCount > 0) {
            const surahName = surahData?.name || (window.surahNames ? window.surahNames[i-1] : `سورة ${i}`);
            const badgeHtml = storiesCount > 0 
                ? `<span class="badge bg-success text-white rounded-pill px-2 py-1 mt-2"><i class="fas fa-book-open me-1"></i> ${storiesCount} قصة</span>` 
                : `<span class="badge bg-light text-secondary border rounded-pill px-2 py-1 mt-2">مقاصد وفضائل</span>`;

            html += `
            <div class="col-6 col-md-4 col-lg-3 mb-3 story-card-item">
                <div class="card shadow-sm border-0 h-100 text-center" style="cursor: pointer; border-bottom: 4px solid #198754; border-radius: 12px; transition: transform 0.2s;" onclick="openSurahDetails(${i})">
                    <div class="card-body p-3 d-flex flex-column align-items-center justify-content-center">
                        <div class="text-success mb-2 fw-bold" style="font-size: 1.5rem; opacity: 0.8;"><i class="fas fa-quran"></i></div>
                        <h6 class="fw-bold text-dark mb-1" style="font-family: 'Amiri Quran', serif; font-size: 1.1rem;">سورة ${surahName}</h6>
                        ${badgeHtml}
                    </div>
                </div>
            </div>
            `;
        }
    }
    container.innerHTML = html;
    if (window.renderProphets) window.renderProphets();
    if (window.renderSahaba) window.renderSahaba();
};

// 1. دالة البحث الرئيسية الذكية (تبحث في أسماء السور وفي عمق الآيات)
window.searchStories = function() {
    const input = document.getElementById('stories-search-input').value.toLowerCase();
    const activeTab = document.querySelector('.tab-pane.active');
    if (!activeTab) return;
    
    const items = activeTab.querySelectorAll('.story-card-item');

    // جلب قاعدة البيانات للبحث بداخلها
    let verses = window.quranInsights?.verses || {};
    if (Object.keys(verses).length === 0) {
        for (const key in window.quranInsights) {
            if (key !== 'surahs' && key.includes('_')) verses[key] = window.quranInsights[key];
        }
    }

    items.forEach(item => {
        let isMatch = item.textContent.toLowerCase().includes(input);

        // 💡 البحث العميق: إذا لم تتطابق السورة، نبحث بداخل قصصها وآياتها
        if (!isMatch && input.trim() !== '' && activeTab.id === 'nuzul-pane') {
            const card = item.querySelector('.card');
            if (card && card.hasAttribute('onclick')) {
                const match = card.getAttribute('onclick').match(/\d+/); // استخراج رقم السورة
                if (match) {
                    const surahNum = match[0];
                    for (const key in verses) {
                        if (key.startsWith(surahNum + '_')) {
                            const verse = verses[key];
                            if (
                                (verse.title && verse.title.toLowerCase().includes(input)) ||
                                (verse.sabab && verse.sabab.toLowerCase().includes(input))
                            ) {
                                isMatch = true;
                                break; // السورة بها القصة، نظهر الكارت فوراً
                            }
                        }
                    }
                }
            }
        }
        item.style.display = isMatch ? '' : 'none';
    });
};

// 2. دالة البحث الجديدة لداخل السورة نفسها
window.searchInnerSurah = function() {
    const input = document.getElementById('inner-surah-search').value.toLowerCase();
    const items = document.querySelectorAll('#surah-details-content .inner-story-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(input) ? '' : 'none';
    });
};

// 3. دالة فتح السورة (تم تحديثها لدعم كلاسات البحث الداخلي)
window.openSurahDetails = function(surahNum) {
    const surahData = window.quranInsights?.surahs?.[surahNum];
    const surahName = surahData?.name || (window.surahNames ? window.surahNames[surahNum-1] : `سورة ${surahNum}`);

    let verses = window.quranInsights?.verses || {};
    if (Object.keys(verses).length === 0) {
        for (const k in window.quranInsights) {
            if (k !== 'surahs' && k.includes('_')) verses[k] = window.quranInsights[k];
        }
    }

    const surahVerses = [];
    for (const key in verses) {
        if (key.startsWith(surahNum + '_') && verses[key].sabab && verses[key].sabab.trim() !== '') {
            surahVerses.push({...verses[key], id: key});
        }
    }

   const titleEl = document.getElementById('surah-details-title');
    titleEl.innerText = `سورة ${surahName}`;
    titleEl.className = 'h4 mb-0 fw-bold text-success w-100'; 
    
    // تفريغ حقل البحث الداخلي عند فتح سورة جديدة
    const innerSearchInput = document.getElementById('inner-surah-search');
    if (innerSearchInput) {
        innerSearchInput.value = '';
        innerSearchInput.parentElement.style.display = 'flex'; // لإظهاره مجدداً
    }

    let contentHtml = '';

    // القسم الأول: بين يدي السورة
    if (surahData) {
        contentHtml += `
        <div class="mb-4 inner-story-item">
            <h6 class="fw-bold text-success border-bottom border-success pb-2 mb-3"><i class="fas fa-info-circle me-1"></i> بين يدي السورة</h6>`;
        if (surahData.theme) contentHtml += `<p class="text-dark small lh-lg mb-2"><strong class="badge bg-success me-1">المقصد العام:</strong> <br> <span class="d-block mt-1">${surahData.theme}</span></p>`;
        if (surahData.fadl) contentHtml += `<p class="text-dark small lh-lg mb-2"><strong class="badge bg-warning text-dark me-1">فضلها:</strong> <br> <span class="d-block mt-1">${surahData.fadl}</span></p>`;
        if (surahData.action) contentHtml += `<p class="text-dark small lh-lg mb-0"><strong class="badge bg-info text-dark me-1">تأمل وعمل:</strong> <br> <span class="d-block mt-1">${surahData.action}</span></p>`;
        contentHtml += `</div>`;
    }

    // القسم الثاني: أسباب النزول
    if (surahVerses.length > 0) {
        contentHtml += `
        <div>
            <h6 class="fw-bold text-success border-bottom border-success pb-2 mb-3"><i class="fas fa-scroll me-1"></i> أسباب النزول وقصص الآيات</h6>`;

        surahVerses.sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]));

        surahVerses.forEach(verse => {
            const ayahNum = verse.id.split('_')[1];
            contentHtml += `
            <div class="inner-story-item p-3 mb-4 bg-light rounded border-start border-success border-3 shadow-sm">
                <h6 class="fw-bold text-success mb-2 pb-2 border-bottom" style="font-family: 'Amiri Quran', serif; font-size: 1.1rem; line-height: 1.6;">
                    <span class="badge bg-success me-1 opacity-75">${ayahNum}</span> ${verse.title}
                </h6>
                <p class="text-muted small lh-lg mb-0" style="white-space: pre-wrap; font-size: 0.95rem;">${verse.sabab}</p>
            </div>`;
        });
        contentHtml += `</div>`;
    }

    document.getElementById('surah-details-content').innerHTML = contentHtml;
    
    window.showSection('surah-details');
    setTimeout(() => { window.scrollTo(0, 0); }, 50);
};

// === 1. دالة عرض كروت الأنبياء ===
window.renderProphets = function() {
    const container = document.getElementById('prophets-pane');
    if (!container) return;

    const prophets = window.quranInsights?.prophets || [];
    if (prophets.length === 0) return;

    let html = '<div class="row g-3">';
    prophets.forEach((prophet, index) => {
        html += `
        <div class="col-6 col-md-4 col-lg-3 story-card-item">
            <div class="card shadow-sm border-0 h-100 text-center hover-shadow" style="cursor: pointer; border-bottom: 4px solid #ffc107; border-radius: 12px; transition: transform 0.2s;" onclick="openPersonDetails('prophet', ${index})">
                <div class="card-body p-3 d-flex flex-column align-items-center justify-content-center">
                    <div class="text-warning mb-2 fw-bold" style="font-size: 1.5rem;"><i class="fas fa-star-and-crescent"></i></div>
                    <h6 class="fw-bold text-dark mb-1" style="font-family: 'Amiri Quran', serif; font-size: 1.1rem;">${prophet.name}</h6>
                    <span class="badge bg-light text-secondary border rounded-pill px-2 py-1 mt-2">${prophet.title}</span>
                </div>
            </div>
        </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};

// === 2. دالة عرض كروت الصحابة ===
window.renderSahaba = function() {
    const container = document.getElementById('sahaba-pane');
    if (!container) return;

    const sahaba = window.quranInsights?.sahaba || [];
    if (sahaba.length === 0) return;

    // 💡 تجميع الصحابة حسب الـ category_tag أو category
    const groupedSahaba = {};
    sahaba.forEach((person, index) => {
        const tag = person.category_tag || person.category || "صحابة أجلاء";
        if (!groupedSahaba[tag]) {
            groupedSahaba[tag] = [];
        }
        // نحتفظ بالـ index الأصلي لكي تفتح القصة الصحيحة عند الضغط
        groupedSahaba[tag].push({ ...person, originalIndex: index });
    });

    let html = '';
    
    // بناء الواجهة لكل مجموعة
    for (const [tag, group] of Object.entries(groupedSahaba)) {
        // إضافة عنوان التصنيف (مثال: الخلفاء الراشدون)
        html += `
        <div class="col-12 mt-4 mb-3 inner-story-item">
            <h5 class="fw-bold text-success border-bottom border-success pb-2" style="font-family: 'Amiri Quran', serif;">
                <i class="fas fa-layer-group me-2 opacity-75"></i> ${tag}
            </h5>
        </div>
        <div class="row g-3 mb-4">
        `;

        // إضافة كروت الصحابة داخل هذا التصنيف
        group.forEach((person) => {
            html += `
            <div class="col-6 col-md-4 col-lg-3 story-card-item">
                <div class="card shadow-sm border-0 h-100 text-center hover-shadow" style="cursor: pointer; border-bottom: 4px solid #198754; border-radius: 12px; transition: transform 0.2s;" onclick="openPersonDetails('sahabi', ${person.originalIndex})">
                    <div class="card-body p-3 d-flex flex-column align-items-center justify-content-center">
                        <div class="text-success mb-2 fw-bold" style="font-size: 1.5rem;"><i class="fas fa-user-check"></i></div>
                        <h6 class="fw-bold text-dark mb-1" style="font-family: 'Amiri Quran', serif; font-size: 1.1rem;">${person.name}</h6>
                        <span class="badge bg-light text-secondary border rounded-pill px-2 py-1 mt-2 text-wrap lh-base" style="font-size: 0.75rem;">${person.title}</span>
                    </div>
                </div>
            </div>
            `;
        });
        
        html += `</div>`; // إغلاق صف الـ row للمجموعة
    }

    container.innerHTML = html;
};

// === 3. دالة فتح تفاصيل القصة (للنبي أو الصحابي) ===
window.openPersonDetails = function(type, index) {
    let data = type === 'prophet' ? window.quranInsights?.prophets?.[index] : window.quranInsights?.sahaba?.[index];
    if (!data) return;

    let icon = type === 'prophet' ? '<i class="fas fa-star-and-crescent me-2"></i>' : '<i class="fas fa-user-check me-2"></i>';
    let colorClass = type === 'prophet' ? 'text-warning' : 'text-success';
    let borderColor = type === 'prophet' ? 'warning' : 'success';
    
    // 💡 جلب التصنيف إن وُجد لعرضه أعلى القصة
    let categoryTag = data.category_tag || data.category;
    let categoryBadgeHtml = categoryTag ? `<span class="badge bg-secondary mb-3 shadow-sm"><i class="fas fa-bookmark me-1"></i> ${categoryTag}</span><br>` : '';

    // تغيير عنوان الصفحة ولونها حسب نوع الشخصية
    const titleEl = document.getElementById('surah-details-title');
    titleEl.innerHTML = `${icon} ${data.name}`;
    titleEl.className = `h4 mb-0 fw-bold ${colorClass} w-100`;
    
    // إخفاء شريط البحث الداخلي لأنه غير مطلوب هنا
    const innerSearch = document.getElementById('inner-surah-search');
    if(innerSearch) innerSearch.parentElement.style.display = 'none';

    // حقن المحتوى (القصة والدروس)
    let contentHtml = `
    <div class="p-4 mb-4 bg-light rounded border-start border-${borderColor} border-4 shadow-sm inner-story-item text-center">
        ${categoryBadgeHtml}
        <span class="badge bg-${borderColor} ${type==='prophet'?'text-dark':''} fs-6 px-3 py-2 rounded-pill shadow-sm mb-4">${data.title}</span>
        
        <div class="text-start">
            <h6 class="fw-bold text-dark border-bottom pb-2 mb-3"><i class="fas fa-book-open me-2 text-muted"></i> القصة والسيرة</h6>
            <p class="text-muted lh-lg mb-4" style="font-size: 1.05rem; white-space: pre-wrap;">${data.story}</p>
            
            <h6 class="fw-bold text-dark border-bottom pb-2 mb-3"><i class="fas fa-lightbulb me-2 text-warning"></i> الدروس المستفادة</h6>
            <p class="text-dark lh-lg mb-0" style="font-size: 0.95rem;">${data.lessons}</p>
        </div>
    </div>
    `;

    document.getElementById('surah-details-content').innerHTML = contentHtml;
    
    window.showSection('surah-details');
    setTimeout(() => { window.scrollTo(0, 0); }, 50);
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
 handleForm('verifyOTPFormPage', () => {
    const emailInput = document.getElementById('verify-email');
    const emailVal = emailInput ? emailInput.value : null;
    verifyOTP(emailVal, document.getElementById('verify-otp').value);
  });
 handleForm('verifyOTPForm', () => {
    const emailInput = document.getElementById('email'); // تأكد إن الـ ID ده مش متعارض مع الـ login
    const emailVal = emailInput ? emailInput.value : null;
    verifyOTP(emailVal, document.getElementById('otp').value);
  });
  const resendBtnPage = document.getElementById('resend-otp-btn-page');
  if (resendBtnPage) {
    resendBtnPage.addEventListener('click', (e) => {
      e.preventDefault();
      resendOTP(); // لا نحتاج تمرير الإيميل، ستجلبه الدالة من الـ localStorage
    });
  }

  const resendBtn = document.getElementById('resend-otp-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resendOTP(); 
    });
  }
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
          const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
        noiseSuppression: true,     
        echoCancellation: true,     
        autoGainControl: true,      
        sampleRate: 16000,          
        channelCount: 1             
    }
});
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
      if (typeof _sheikPlaybackActive !== 'undefined' && _sheikPlaybackActive) {
          if (typeof Swal !== 'undefined') {
              Swal.fire({ toast: true, position: 'bottom', icon: 'warning', title: 'أوقف تلاوة الشيخ أولاً', showConfirmButton: false, timer: 3000 });
          }
          return; // نوقف الدالة هنا، فمش هيفتح المايك
      }
      try {
liveStream = await navigator.mediaDevices.getUserMedia({ 
    audio: {
        noiseSuppression: true,     
        echoCancellation: true,     
        autoGainControl: true,      
        sampleRate: 16000,          
        channelCount: 1
    } 
});
        isLiveTracking = true;
        // lastMatchedIndex = -1; searchStartIndex = 0; accumulatedBuffer = '';
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
      // 1. إيقاف المايك والصوتيات (هذا هو السحر) 🌟
      if (typeof stopAllMedia === 'function') stopAllMedia();
      
      // إيقاف الـ Recorder والـ Timer
      if (typeof chunkRecorder !== 'undefined' && chunkRecorder && chunkRecorder.state !== 'inactive') {
          chunkRecorder.stop();
      }
      if (typeof chunkTimeout !== 'undefined') {
          clearTimeout(chunkTimeout);
      }

      // إغلاق سلك الميكروفون تماماً (لإخفاء اللمبة)
      if (typeof liveStream !== 'undefined' && liveStream) {
          liveStream.getTracks().forEach(track => track.stop());
          liveStream = null;
      }
      
      isLiveTracking = false; // تصفير المتغير

      // 2. تبديل الأزرار
      btnStartLive.classList.remove('d-none');
      btnStopLive.classList.add('d-none');
      if (liveStatus) { 
          liveStatus.innerText = 'تم التوقف.'; 
          liveStatus.className = 'text-muted small mt-1'; 
      }
      
      // 3. تنظيف الشاشة وتصفير العدادات
      if (typeof resetAyahsUI === 'function') resetAyahsUI();
      searchStartIndex = 0; 
      currentWordIndex = 0; 
    });
  }

  // Dark Mode
  const toggleBtn = document.getElementById('theme-toggle');
  const icon      = toggleBtn?.querySelector('i');
  if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    if (icon) { icon.classList.replace('fa-moon', 'fa-sun'); icon.classList.add('text-warning'); }
  }
 toggleBtn?.addEventListener('click', async () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.body.removeAttribute('data-theme');
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      if (icon) { icon.classList.remove('fa-sun', 'text-warning'); icon.classList.add('fa-moon'); }
      if (Capacitor.isNativePlatform()) {
       await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setBackgroundColor({ color: '#1e5f31' });
          await StatusBar.setStyle({ style: Style.Dark });
      }
    } else {
      document.body.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
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
// scheduleWebFridayReminder();






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

// ─── 🌟 دالة الترحيب الذكية (النسخة الاحترافية بـ 3 فترات) ───
function setWelcomeGreeting() {
  const greetingEl = document.getElementById('main-greeting');
  if (!greetingEl) return;

  greetingEl.classList.remove('display-6'); 
  greetingEl.style.fontSize = '1.4rem';     
  greetingEl.style.lineHeight = '1.6';

  const hour = new Date().getHours();
  let timeGreeting = '';

  // 🔥 التعديل هنا: تقسيم الوقت بذكاء لـ 3 فترات 🔥
  if (hour >= 4 && hour < 12) {
    timeGreeting = 'صباح معطر بذكر الله ☀️';  // من 4 الفجر لـ 12 الظهر
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = 'أسعد الله أوقاتك 🌿';      // من 12 الظهر لـ 5 المغرب (فترة الظهر والعصر)
  } else {
    timeGreeting = 'مساء تحرسه عناية الله 🌙'; // من 5 المغرب لـ 4 الفجر (الليل)
  }

  let userName = '';
  let userEmail = '';

  // الكشاف الشامل
  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    let value = localStorage.getItem(key);

    if (value && value.includes('{')) { 
      try {
        let obj = JSON.parse(value);
        if (obj.name && obj.name !== 'null') userName = obj.name;
        else if (obj.displayName && obj.displayName !== 'null') userName = obj.displayName;
        else if (obj.userName && obj.userName !== 'null') userName = obj.userName;
        if (obj.email) userEmail = obj.email;
      } catch(e) {}
    }
    if (userName) break; 
  }

  if (!userName) {
     userName = localStorage.getItem('name') || localStorage.getItem('user_name') || localStorage.getItem('userName');
  }

  // 2. معالجة الاسم والطباعة
  if (userName && userName !== 'null' && userName !== 'undefined') {
    let firstName = userName.trim().split(/\s+/)[0]; 
    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    greetingEl.innerHTML = `${timeGreeting} <span style="color:#d4af37; font-family: sans-serif;">${firstName}</span>`;
    
  } else if (userEmail) {
    let emailName = userEmail.split('@')[0];
    let firstName = emailName.split(/[\.\-_]/)[0]; 
    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    greetingEl.innerHTML = `${timeGreeting} <span style="color:#d4af37; font-family: sans-serif;">${firstName}</span>`;
    
  } else {
    greetingEl.innerHTML = `السلام عليكم ورحمة الله 🌿`; 
  }
}

document.addEventListener('DOMContentLoaded', setWelcomeGreeting);
setWelcomeGreeting();



//  منطق شاشات الافتتاحية (Onboarding) 
document.addEventListener('DOMContentLoaded', () => {
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    if (!onboardingOverlay) {
        // لو مفيش شاشة افتتاحية في الـ HTML أساساً، شغل الإشعارات بعد 3 ثواني
        setTimeout(() => { if(typeof checkAndPromptNotifications === 'function') checkAndPromptNotifications(); }, 3000);
        return;
    }

    // التحقق من التخزين المحلي (هل هذه أول زيارة؟)
    const hasSeenIntro = localStorage.getItem('aqra_has_seen_intro');

    if (!hasSeenIntro) {
        // إظهار الشاشة
        onboardingOverlay.classList.remove('d-none');
        
        const nextBtn = document.getElementById('next-onboarding');
        const startBtn = document.getElementById('start-onboarding');
        const skipBtn = document.getElementById('skip-onboarding');
        const carouselElement = document.getElementById('onboardingCarousel');
        
        // 🔥 تفعيل الـ Carousel الخاص بـ Bootstrap مع دعم اللمس (touch: true) 🔥
        const carousel = new bootstrap.Carousel(carouselElement, {
            interval: false, // تعطيل التقليب التلقائي
            wrap: false,     // تعطيل الدوران للبداية عند الوصول للنهاية
            touch: true      // 👈 تفعيل السحب باللمس (Swipe) إجبارياً
        });

        // متابعة تغيير الشاشات لتغيير الأزرار (إظهار زر "ابدأ الآن" في الشريحة الأخيرة)
        carouselElement.addEventListener('slide.bs.carousel', function (e) {
            if (e.to === 5) { // الشريحة السادسة والأخيرة (تبدأ من 0)
                nextBtn.classList.add('d-none');
                startBtn.classList.remove('d-none');
                skipBtn.classList.add('d-none');
            } else {
                nextBtn.classList.remove('d-none');
                startBtn.classList.add('d-none');
                skipBtn.classList.remove('d-none');
            }
        });

        // زر التالي
        nextBtn.addEventListener('click', () => {
            carousel.next();
        });

        // دالة الإنهاء (حفظ البيانات وإخفاء الشاشة بأنيميشن)
        const finishOnboarding = () => {
            localStorage.setItem('aqra_has_seen_intro', 'true'); // تسجيل إن المستخدم شاف الافتتاحية
            
            // تأثير خروج سلس
            onboardingOverlay.style.opacity = '0';
            onboardingOverlay.style.transform = 'scale(1.05)';
            
            setTimeout(() => {
                onboardingOverlay.classList.add('d-none');
                
                // 🌟 طلب صلاحية الإشعارات بعد اختفاء الافتتاحية بنصف ثانية 🌟
                setTimeout(() => { 
                    if(typeof checkAndPromptNotifications === 'function') checkAndPromptNotifications(); 
                }, 500);

            }, 400); // نفس مدة الـ transition في الـ CSS
        };

        // تفعيل أزرار التخطي والبدء
        startBtn.addEventListener('click', finishOnboarding);
        skipBtn.addEventListener('click', finishOnboarding);
    } else {
        // 🌟 لو المستخدم شاف الافتتاحية قبل كده (زيارة عادية للتطبيق) 🌟
        // نطلب الإشعارات بعد 3.5 ثواني من فتح التطبيق (عشان ياخد فرصته يقرأ آية اليوم براحته)
        setTimeout(() => { 
            if(typeof checkAndPromptNotifications === 'function') checkAndPromptNotifications(); 
        }, 3500);
    }
});

// ─── 1. الدخول الافتراضي للمصحف (المصحف النصي) ───
// هذه الدالة تعمل عند الضغط على سورة من الفهرس أو عند البحث
window.openQuranFullscreen = function(page, surah, ayah) {
    // 1. التأكد من إزالة كلاسات الصور (لضمان فتح المصحف النصي)
    document.body.classList.remove('fullscreen-reading', 'swipe-nav-active');
    
    // 2. إظهار النافبارات الأساسية
    const mainNavbar = document.getElementById('main-navbar');
    const bottomNav = document.querySelector('.bottom-nav');
    if (mainNavbar) mainNavbar.style.display = '';
    if (bottomNav) bottomNav.style.display = '';

    // 3. إظهار قسم المصحف وإخفاء باقي الأقسام
    if (typeof window.showSection === 'function') {
        window.showSection('quran');
    } else if (typeof showSection !== 'undefined') {
        showSection('quran');
    }

    // 4. تحميل وعرض الآيات النصية
    if (window.loadQuranPage) {
        window.loadQuranPage(page, surah, ayah);
    }
};

// ─── 2. التبديل إلى "المصحف المصور" (الشاشة الكاملة والصور) ───
// تعمل هذه الدالة عند الضغط على زر "القراءة من المصحف المصور"
window.startImageMushaf = function() {
    // 0. تفعيل علم وضع المصحف المصور
    window._imageMushafActive = true;
    window.history.pushState({ isImageMushaf: true }, '', window.location.pathname);

    // 1. إخفاء زر الترويج
    const promoBtn = document.getElementById('image-mushaf-promo');
    if (promoBtn) promoBtn.style.display = 'none';

    // 2. تفعيل كلاسات وضع الصور والشاشة الكاملة
    document.body.classList.add('fullscreen-reading', 'swipe-nav-active');

    // 3. إخفاء النافبارات بالقوة
    const mainNavbar = document.getElementById('main-navbar');
    const bottomNav = document.querySelector('.bottom-nav');
    if (mainNavbar) mainNavbar.style.setProperty('display', 'none', 'important');
    if (bottomNav) bottomNav.style.setProperty('display', 'none', 'important');

    // 4. طلب ملء الشاشة من المتصفح
    const el = document.documentElement;
    if (!document.fullscreenElement) {
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }

    // 5. ✅ الإصلاح: ابني هيكل الـ UI أولاً ثم حمّل الصور
    // _initSwipeUI و _setupTrack متاحتان الآن عبر window
    if (!document.getElementById('quran-pages-track-wrapper')) {
        if (typeof window._initSwipeUI === 'function') {
            window._initSwipeUI();
        }
    }

    // 6. نعطي المتصفح frame واحد عشان يرسم الـ wrapper الجديد، ثم نحمّل الصور
    setTimeout(() => {
        if (typeof window._setupTrack === 'function') {
            window._setupTrack(window.currentPage || 1);
        }
    }, 30);
};

// ─── 3. الخروج من "المصحف المصور" (العودة للمصحف النصي) ───
// تعمل هذه الدالة عند الضغط على زر "خروج" داخل المصحف المصور
// ─── دالة الخروج من وضع المصحف المصور والعودة للمصحف النصي ───
window.exitQuranMode = function() {
    // 0. إيقاف علم وضع المصحف المصور
    window._imageMushafActive = false;

    // 1. الخروج من وضع ملء الشاشة بتاع المتصفح
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }

    // 2. إزالة كلاسات الصور والشاشة الكاملة
    document.body.classList.remove('fullscreen-reading', 'swipe-nav-active');
    
    // 3. إعادة إظهار النافبارات الأساسية
    const mainNavbar = document.getElementById('main-navbar');
    const bottomNav = document.querySelector('.bottom-nav');
    if (mainNavbar) mainNavbar.style.display = '';
    if (bottomNav) bottomNav.style.display = '';

    // 4. إظهار زر الترويج للمصحف المصور مرة أخرى
    const promoBtn = document.getElementById('image-mushaf-promo');
    if (promoBtn) promoBtn.style.display = 'block';

    // 5. تنظيف swipe wrapper فوراً
    const wrapper = document.getElementById('quran-pages-track-wrapper');
    if (wrapper) wrapper.remove();

    // 6. التأكد إن قسم المصحف لسه مفتوح قدام المستخدم (المصحف النصي)
    const quranSec = document.getElementById('quran-section');
    if (quranSec) {
        quranSec.classList.remove('d-none');
        quranSec.scrollTop = 0;
    }

    // ✅ الإصلاح: نستنى frame واحد عشان الـ DOM يتحدث الأول، ثم نعمل scroll للأعلى
    requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        if (quranSec) quranSec.scrollTop = 0;
    });
};

// ─── الحل السحري الشامل لظهور أي نافذة/قائمة داخل الشاشة الكاملة ───
document.addEventListener('DOMContentLoaded', () => {
    
    // دالة لنقل النافذة إلى داخل الشاشة الكاملة عند فتحها
    const movePopupToFullscreen = (event) => {
        const popupElement = event.target;
        const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
        
        // لو إحنا في وضع الشاشة الكاملة والنافذة دي بره.. ادخلها جوه!
        if (fullscreenElement && !fullscreenElement.contains(popupElement)) {
            
            // 1. نقل النافذة وتعلية الـ z-index بتاعها
            fullscreenElement.appendChild(popupElement);
            popupElement.style.zIndex = "105005"; 
            
            // 2. نقل الغمامة السوداء (Backdrop) لتكون تحت النافذة مباشرة
            setTimeout(() => {
                // تحديد نوع الغمامة بناءً على نوع النافذة (Modal ولا Offcanvas)
                const backdropClass = event.type.includes('modal') ? '.modal-backdrop' : '.offcanvas-backdrop';
                const backdrops = document.querySelectorAll(backdropClass);
                
                backdrops.forEach(bg => {
                    if (!fullscreenElement.contains(bg)) {
                        fullscreenElement.appendChild(bg);
                        bg.style.zIndex = "105004";
                    }
                });
            }, 15); // تأخير بسيط جداً لضمان قيام Bootstrap بإنشاء الغمامة أولاً
        }
    };

    // دالة لإرجاع النافذة لمكانها الطبيعي عند إغلاقها عشان ماتعملش مشاكل بره
    const returnPopupToBody = (event) => {
        const popupElement = event.target;
        if (!document.fullscreenElement && popupElement.parentElement !== document.body) {
            document.body.appendChild(popupElement);
        }
    };

    // 🔥 مراقبة جميع النوافذ المنبثقة والقوائم السفلية في التطبيق أوتوماتيكياً 🔥
    ['show.bs.modal', 'show.bs.offcanvas'].forEach(eventType => {
        document.addEventListener(eventType, movePopupToFullscreen);
    });

    ['hidden.bs.modal', 'hidden.bs.offcanvas'].forEach(eventType => {
        document.addEventListener(eventType, returnPopupToBody);
    });
});
// ─── دوال الانتقال السريع في المصحف المصور ───

window.toggleQuickJump = function() {
    const jumpMenu = document.getElementById('mushaf-quick-jump');
    jumpMenu.classList.toggle('d-none');
    
    // تعبئة قائمة السور لأول مرة
    const select = document.getElementById('quick-surah-select');
    
    // استخدام surahNames الموجودة في constants
    const namesArray = typeof surahNames !== 'undefined' ? surahNames : window.surahNames;
    
    if (select && select.options.length <= 1 && namesArray) {
        namesArray.forEach((name, i) => {
            const opt = document.createElement('option');
            opt.value = i + 1; // رقم السورة الفعلي (من 1 إلى 114)
            opt.textContent = `${i + 1}. ${name}`;
            select.appendChild(opt);
        });
    }
};

window.jumpToSurah = function(surahNum) {
    if (!surahNum) return;
    
    const sNum = parseInt(surahNum);
    
    // 🌟 الإصلاح هنا: استخدام surahPageMap الخاصة بك، وطرح 1 لأن الاندكس يبدأ من 0 🌟
    const pageMapArray = typeof surahPageMap !== 'undefined' ? surahPageMap : window.surahPageMap;
    const page = pageMapArray ? pageMapArray[sNum - 1] : null; 
    
    if (page && window.loadQuranPage) {
        window.loadQuranPage(page, sNum); // تحميل الصفحة وإغلاق النافذة
        
        document.getElementById('mushaf-quick-jump').classList.add('d-none');
        document.getElementById('quick-surah-select').value = '';
    }
};

window.jumpToPage = function() {
    const p = parseInt(document.getElementById('quick-page-input').value);
    if (p >= 1 && p <= 604 && window.loadQuranPage) {
        window.loadQuranPage(p);
        
        document.getElementById('mushaf-quick-jump').classList.add('d-none');
        document.getElementById('quick-page-input').value = '';
    }
};