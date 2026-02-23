/* eslint-disable */
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import localforage from 'localforage';


import axios from 'axios';
import '@babel/polyfill';
import { login, logout, signup, verifyOTP, updateSettings, forgotPassword, resetPassword, deleteUser, showAlert, changePassword } from './auth';
import { 
  loadSurahs, startSurahReading, manageKhatmah, createKhatmah, updateKhatmahProgress,
  checkRecitation, loadReciters, loadPrayers, loadBookmarks, loadQuranPage,
  toggleBookmark, deleteBookmark, deleteKhatmah, initSearch, initBookmarksSearch
} from './features';

// ─── 1. Config ────────────────────────────────────────────────────────────────
axios.defaults.baseURL = 'https://aqra-app.serveftp.com';
axios.defaults.withCredentials =  Capacitor.isNativePlatform();

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // التحقق هل الخطأ بسبب انقطاع الإنترنت؟
    if (!navigator.onLine || error.message === 'Network Error') {
      Swal.fire({
        icon: 'error',
        title: 'لا يوجد اتصال بالإنترنت',
        text: 'يرجى التحقق من اتصالك بالشبكة والمحاولة مرة أخرى.',
        confirmButtonText: 'فهمت',
        confirmButtonColor: '#1e5f31'
      });
    }
    return Promise.reject(error);
  }
);

window.addEventListener('offline', () => {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'warning',
    title: 'انقطع الاتصال بالإنترنت',
    showConfirmButton: false,
    timer: 3000
  });
});

window.addEventListener('online', () => {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: 'عاد الاتصال بالإنترنت',
    showConfirmButton: false,
    timer: 3000
  });
});

// ─── 2. Global State ──────────────────────────────────────────────────────────
window.currentAudio = null;
let aiMediaRecorder = null;
window.currentPage  = 1;

//  متغيرات التلاوة المباشرة
let liveStream = null;
let isLiveTracking = false;
let chunkRecorder = null;
let chunkTimeout = null;
let lastMatchedIndex = -1;   
let searchStartIndex = 0;    
let accumulatedBuffer = '';

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

// ✅ حفظ صفحة في IndexedDB
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

// ✅ قراءة صفحة من IndexedDB
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

// ✅ Prefetch صفحة في الخلفية وحفظها في IndexedDB
const prefetchPage = async (pageNum) => {
  if (pageNum < 1 || pageNum > 604) return;
  if (!navigator.onLine) return;
  try {
    const cached = await cacheGet(pageNum);
    if (cached) return; // موجودة خلاص
    const res = await axios.get(`/api/v1/quran/page/${pageNum}`);
    await cacheSet(pageNum, res.data.data);
    console.log(`🔄 [PREFETCH] صفحة ${pageNum} اتحفظت في IndexedDB`);
  } catch (e) { /* تجاهل أخطاء الـ prefetch */ }
};

// ✅ تعرض الدوال على الـ window عشان features.js يقدر يستخدمها
Object.assign(window, {
  cacheSet,
  cacheGet,
  prefetchPage,
});

// ─── تهيئة قاعدة البيانات فور تحميل الصفحة ───────────────────────────────
initQuranDB().catch(e => console.warn('IDB init failed:', e));

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

// ─── 4. Data ──────────────────────────────────────────────────────────────────
const surahNames = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
  "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
  "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
  "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
  "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
  "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
  "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
  "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
  "التكوير","الإنفطار","المطففين","الإنشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
  "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
  "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
  "المسد","الإخلاص","الفلق","الناس"
];

const surahPageMap = [
  1,2,50,77,106,128,151,177,187,208,221,235,249,255,262,267,282,293,305,312,
  322,332,342,350,359,367,377,385,396,404,411,415,418,428,434,440,446,453,458,467,
  477,483,489,496,499,502,507,511,515,518,520,523,526,528,531,534,537,542,545,549,
  551,553,554,556,558,560,562,564,566,568,570,572,574,575,577,578,580,582,583,585,
  586,587,587,589,590,591,591,592,593,594,595,596,596,597,597,598,598,599,599,600,
  600,601,601,601,602,602,602,603,603,603,604,604,604,604
];

// بيانات الأجزاء
const juzData = [
  { juz: 1,  page: 1,   name: "الم",                surahs: "الفاتحة - البقرة" },
  { juz: 2,  page: 22,  name: "سَيَقُولُ",           surahs: "البقرة" },
  { juz: 3,  page: 42,  name: "تِلْكَ الرُّسُلُ",    surahs: "البقرة - آل عمران" },
  { juz: 4,  page: 62,  name: "لَنْ تَنَالُوا",      surahs: "آل عمران - النساء" },
  { juz: 5,  page: 82,  name: "وَالْمُحْصَنَاتُ",    surahs: "النساء - المائدة" },
  { juz: 6,  page: 102, name: "لَا يُحِبُّ اللَّهُ", surahs: "المائدة - الأنعام" },
  { juz: 7,  page: 121, name: "وَإِذَا سَمِعُوا",    surahs: "الأنعام - الأعراف" },
  { juz: 8,  page: 142, name: "وَلَوْ أَنَّنَا",     surahs: "الأعراف - الأنفال" },
  { juz: 9,  page: 162, name: "قَالَ الْمَلَأُ",     surahs: "الأنفال - التوبة" },
  { juz: 10, page: 182, name: "وَاعْلَمُوا",         surahs: "التوبة - هود" },
  { juz: 11, page: 201, name: "يَعْتَذِرُونَ",       surahs: "هود - يوسف" },
  { juz: 12, page: 221, name: "وَمَا مِنْ دَابَّةٍ", surahs: "هود - يوسف - الرعد" },
  { juz: 13, page: 241, name: "وَمَا أُبَرِّئُ",     surahs: "يوسف - إبراهيم - الحجر" },
  { juz: 14, page: 261, name: "رُبَمَا",             surahs: "الحجر - النحل" },
  { juz: 15, page: 281, name: "سُبْحَانَ الَّذِي",   surahs: "الإسراء - الكهف" },
  { juz: 16, page: 301, name: "قَالَ أَلَمْ",        surahs: "الكهف - طه" },
  { juz: 17, page: 321, name: "اقْتَرَبَ",           surahs: "الأنبياء - الحج" },
  { juz: 18, page: 341, name: "قَدْ أَفْلَحَ",       surahs: "المؤمنون - الفرقان" },
  { juz: 19, page: 361, name: "وَقَالَ الَّذِينَ",   surahs: "الفرقان - النمل" },
  { juz: 20, page: 381, name: "أَمَّنْ خَلَقَ",      surahs: "النمل - العنكبوت" },
  { juz: 21, page: 401, name: "اتْلُ مَا أُوحِيَ",   surahs: "العنكبوت - الأحزاب" },
  { juz: 22, page: 421, name: "وَمَنْ يَقْنُتْ",     surahs: "الأحزاب - يس" },
  { juz: 23, page: 441, name: "وَمَا لِيَ",          surahs: "يس - الزمر" },
  { juz: 24, page: 461, name: "فَمَنْ أَظْلَمُ",     surahs: "الزمر - فصلت" },
  { juz: 25, page: 481, name: "إِلَيْهِ يُرَدُّ",    surahs: "فصلت - الجاثية" },
  { juz: 26, page: 501, name: "حم",                  surahs: "الأحقاف - الذاريات" },
  { juz: 27, page: 521, name: "قَالَ فَمَا خَطْبُكُمْ", surahs: "الذاريات - الحديد" },
  { juz: 28, page: 541, name: "قَدْ سَمِعَ اللَّهُ", surahs: "المجادلة - التحريم" },
  { juz: 29, page: 561, name: "تَبَارَكَ الَّذِي",   surahs: "الملك - المرسلات" },
  { juz: 30, page: 581, name: "عَمَّ يَتَسَاءَلُونَ", surahs: "النبأ - الناس" },
];

const getSurahNameByPage = (pageNum) => {
  let idx = 0;
  for (let i = 0; i < surahPageMap.length; i++) {
    if (surahPageMap[i] <= pageNum) idx = i; else break;
  }
  return surahNames[idx];
};

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
                </tr>
            `;
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">فشل في تحميل البيانات. تأكد من صلاحيات الإدارة.</td></tr>';
        console.error("Admin Load Users Error:", err);
    }
};

window.deleteUserHandler = async (id) => {
    const result = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: "سيتم حذف هذا المستخدم نهائياً!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'تراجع'
    });

    if (result.isConfirmed) {
        try {
            await axios.delete(`/api/v1/users/${id}`);
            
            Swal.fire({
                icon: 'success',
                title: 'تم الحذف',
                text: 'تم حذف المستخدم بنجاح.',
                timer: 1500,
                showConfirmButton: false
            });
            
            window.loadAllUsers(); 
        } catch (err) {
            Swal.fire('خطأ', 'فشل حذف المستخدم، قد لا تمتلك الصلاحية', 'error');
        }
    }
};

// دالة التحميل الصامت للمصحف كاملاً في الخلفية
window.downloadEntireQuranOffline = async () => {
    const isFullyCached = await localforage.getItem('quran_fully_cached');
    if (isFullyCached) {
        console.log('✅ المصحف كاملاً موجود بالفعل في الذاكرة (Offline Ready)');
        return;
    }

    console.log('🔄 جاري تحميل المصحف في الخلفية للعمل بدون إنترنت...');
    let successCount = 0;

    for (let page = 1; page <= 604; page++) {
        // 👈 التعديل هنا: استخدمنا cacheGet الخاصة بقاعدة بيانات المصحف
        const pageExists = await window.cacheGet(page);

        if (!pageExists) {
            try {
                const response = await fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`);
                if (!response.ok) throw new Error('Network Error');
                
                const data = await response.json();
                
                // 👈 التعديل هنا: استخدمنا cacheSet الخاصة بقاعدة بيانات المصحف
                await window.cacheSet(page, data.data);
                successCount++;

                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (err) {
                console.warn(`⚠️ توقف التحميل عند صفحة ${page} بسبب مشكلة في الاتصال، سيتم الإكمال لاحقاً.`);
                break; 
            }
        }
    }

    if (successCount > 0) {
        let allSaved = true;
        for(let i=1; i<=604; i++){
            // 👈 التعديل هنا: للتحقق النهائي
            if(!(await window.cacheGet(i))) { allSaved = false; break; }
        }
        
        if(allSaved) {
            await localforage.setItem('quran_fully_cached', true);
            console.log('🎉 تمت بنجاح! المصحف متاح الآن للعمل 100% بدون إنترنت.');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        downloadEntireQuranOffline();
    }, 3000);
});



function checkConnection() {
  if (!navigator.onLine) {
    Swal.fire({
      icon: 'warning',
      title: 'أنت غير متصل بالإنترنت 📶',
      text: 'يرجى التحقق من اتصالك بالواي فاي أو بيانات الهاتف والمحاولة مرة أخرى.',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#1e5f31' // لون تطبيق اقرأ
    });
    return false; // معناه مفيش نت
  }
  return true; // معناه النت شغال
}

// ─── 5. دالة مساعدة موحدة لطلب تسجيل الدخول ─────────────────────────────────
const requireLogin = (featureName = 'هذه الميزة') => {
  Swal.fire({
    icon: 'warning',
    title: 'يجب تسجيل الدخول أولاً',
    text: `سجّل دخولك لتتمكن من استخدام ${featureName}`,
    confirmButtonText: 'تسجيل الدخول',
    cancelButtonText: 'لاحقاً',
    showCancelButton: true,
    confirmButtonColor: '#198754',
    cancelButtonColor: '#6c757d',
  }).then((result) => {
    if (result.isConfirmed) {
      window.showSection('login');
    }
  });
};

// ─── 6. التحقق من تسجيل الدخول ───────────────────────────────────────────────
const isUserLoggedIn = () => {
  if (axios.defaults.headers.common['Authorization']) return true;
  const userLinks = document.querySelectorAll('.user-link:not(.d-none)');
  return userLinks.length > 0;
};

// ─── 7. Stop All Media ────────────────────────────────────────────────────────
const stopAllMedia = () => {
  console.log("🔴 [SYSTEM] Stopping all media...");
  //  console.trace(); 
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

  resetUIButtons();
};

const resetUIButtons = () => {
  document.querySelectorAll('.live-play-btn').forEach(b => {
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

// ─── 8. Auth & Routing ──────────────────────────────────────────────────────────
window.checkAuth = async () => {
  const savedToken = localStorage.getItem('auth_token');
  if (savedToken && !axios.defaults.headers.common['Authorization']) {
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
    // 🚀 التعديل هنا: حماية الكود من الإيقاف عند عدم تسجيل الدخول
    if (!navigator.onLine || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
      const wasLoggedIn = await localforage.getItem('is_logged_in');
      const cachedRole = await localforage.getItem('user_role'); // 👈 نجلب الدور من الكاش بدلاً من المتغير الوهمي

      if (wasLoggedIn) {
        document.querySelectorAll('.auth-link').forEach(el => el.classList.add('d-none'));
        document.querySelectorAll('.user-link').forEach(el => el.classList.remove('d-none'));
        if (cachedRole === 'admin') { // 👈 الآن المتغير معرف ولن يسبب خطأ
            document.querySelectorAll('.admin-link').forEach(el => el.classList.remove('d-none'));
        }
        console.log('⚡ [OFFLINE] المستخدم مسجل دخول (من الكاش)');
        return true;
      }
    }
    
    // إذا لم يكن هناك إنترنت وكان غير مسجل دخول، أو رُفض الطلب من السيرفر (401)
    document.querySelectorAll('.auth-link').forEach(el => el.classList.remove('d-none'));
    document.querySelectorAll('.user-link, .admin-link').forEach(el => el.classList.add('d-none'));
    await localforage.removeItem('is_logged_in');
    await localforage.removeItem('user_role');
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

// ✅ تحميل فهرس الأجزاء والأحزاب
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
        <div>
          <h5><i class="fas fa-book-open me-2"></i>الجزء ${juz.juz}</h5>
          <small style="opacity:0.85">${juz.name}</small>
        </div>
        <div class="text-end">
          <div class="juz-badge mb-1">ص ${juz.page}</div>
          <small style="opacity:0.8; font-size:0.75rem">${juz.surahs}</small>
        </div>
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
    Swal.fire({ title: 'جاري جلب التفسير...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = await axios.get(`/api/v1/quran/tafseer/${surahId}/${ayahId}`);
    Swal.fire({
      title: `<span class="text-success" style="font-family:'Amiri'">تفسير الآية ${ayahId}</span>`,
      html: `<div style="font-family:'Amiri';font-size:1.2rem;line-height:1.8;text-align:justify;direction:rtl">${res.data.data.tafseer}</div>`,
      confirmButtonText: 'إغلاق', confirmButtonColor: '#198754',
    });
  } catch { Swal.fire({ icon: 'error', title: 'خطأ', text: 'تعذر جلب التفسير.' }); }
};

window.showSection = (sectionName) => {
stopAllMedia();
    document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
    const target = document.getElementById(`${sectionName}-section`);
    if (!target) return;

    target.classList.remove('d-none');
    window.scrollTo(0, 0);
  
  const newPath = sectionName === 'home' ? '/' : `/${sectionName}`;
  const titles = {
        'home': 'Aqra | اقرأ📖',
        'surah-index': 'المصحف الشريف',
        'reciters': 'القراء والمشايخ',
        'bookmarks': 'علاماتي المرجعية',
        'khatmah': 'ختمتي الحالية',
        'profile': 'إعدادات الحساب',
        'live-recitation': 'تتبع التلاوة المباشر',
        'ai-correction': 'المصحح الذكي'
    };
    if (sectionName !== 'quran') {
        document.title = titles[sectionName] || "تطبيق اقرأ";
    }
    if (window.location.pathname !== newPath) {
        window.history.pushState({ section: sectionName }, '', newPath);
    }
   if (sectionName === 'home') {
      window.checkAuth();
        loadPrayers();
        if (document.getElementById('active-khatmah')) manageKhatmah().catch(() => { });
   
  }
  // if (sectionName === 'home') { window.checkAuth(); loadPrayers(); if (document.getElementById('active-khatmah')) manageKhatmah().catch(() => {}); }
  if (sectionName === 'surah-index') window.loadSurahIndex();
  if (sectionName === 'reciters') loadReciters();
  if (sectionName === 'bookmarks') loadBookmarks();
  if (sectionName === 'khatmah') {
    manageKhatmah().catch(() => {});
    const sel = document.getElementById('currentSurah');
    if (sel && sel.options.length <= 1) surahNames.forEach((n, i) => { const o = document.createElement('option'); o.value = i + 1; o.textContent = `${i + 1}. ${n}`; sel.appendChild(o); });
  }
  if (sectionName === 'profile') {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }

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
          console.log('⚡ [OFFLINE] تم عرض بيانات الحساب من الكاش');
          return;
        }
      }
      if (err.response?.status === 401) {
        window.showSection('login');
      }
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
};

window.openQuranAtCurrentKhatmah = async () => {
  try {
    if (!isUserLoggedIn()) { requireLogin('متابعة الختمة'); return; }

    // ✅ رسالة تحميل فورية قبل أي حاجة
    Swal.fire({
      title: '📖 جاري فتح ختمتك...',
      html: `
        <div class="text-center py-2">
          <div class="spinner-border text-success mb-3" style="width: 3rem; height: 3rem;"></div>
          <p class="text-muted mb-0">جاري البحث عن موضع الختمة</p>
        </div>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    const res = await axios.get('/api/v1/khatmah');
    const k = res.data.data.khatmah;

    if (!k || !k.currentSurah || !k.currentAyah) {
      Swal.close();
      window.showSection('khatmah');
      return;
    }

    const currentSurah   = parseInt(k.currentSurah);
    const currentAyah    = parseInt(k.currentAyah);
    const surahFirstPage = surahPageMap[currentSurah - 1] || 1;

    const savedPage      = k.page ? parseInt(k.page) : 0;
    const isSavedPageValid = savedPage > surahFirstPage;

    let targetPage;

    if (isSavedPageValid) {
      targetPage = savedPage;
      console.log(`✅ [KHATMAH] صفحة من DB: ${targetPage}`);
    } else {
      console.log(`🔍 [KHATMAH] بنبحث عن سورة ${currentSurah} آية ${currentAyah}`);
      const nextSurahPage = surahPageMap[currentSurah] || 604;
      targetPage = surahFirstPage;

      for (let p = surahFirstPage; p <= nextSurahPage && p <= 604; p++) {
        try {
          // ✅ جرب من IndexedDB أولاً
          let ayahs;
          const cached = await cacheGet(p);
          if (cached) {
            ayahs = cached.ayahs;
          } else {
            const pageRes = await axios.get(`/api/v1/quran/page/${p}`);
            ayahs = pageRes.data.data.ayahs;
            await cacheSet(p, pageRes.data.data);
          }
          const matched = ayahs.find(a =>
            parseInt(a.surahNumber) === currentSurah &&
            parseInt(a.ayahNumber)  === currentAyah
          );
          if (matched) {
            targetPage = p;
            console.log(`✅ [KHATMAH] وجدنا الآية في صفحة ${p}`);
            try {
              await axios.patch('/api/v1/khatmah', {
                surah: currentSurah,
                ayah: currentAyah,
                page: p
              });
            } catch(e) { /* تجاهل */ }
            break;
          }
        } catch (e) { break; }
      }
    }

    console.log(`✅ [KHATMAH] سورة ${currentSurah} آية ${currentAyah} صفحة ${targetPage}`);

    // ✅ إغلاق الـ Swal وفتح المصحف
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
    else showAlert('error', 'تعذر تحميل الختمة');
  }
};


// ─── الدالة المصححة ───────────────────────────────────────────
// window.loadQuranPage = async (pageNum, targetSurah = null, targetAyah = null) => {  
//   window.currentPage = pageNum;
  
//   const titleEl = document.getElementById('surah-title-display');
//   if (titleEl) titleEl.textContent = `سورة ${getSurahNameByPage(pageNum)}`;

//   try {
//       const cachedData = await cacheGet(pageNum);
      
//       if (cachedData) {
//           console.log(`⚡ [OFFLINE] جاري عرض صفحة ${pageNum} من الذاكرة المحلية`);
//           // نفترض أن دالة loadQuranPage المستوردة من features.js يمكنها استقبال البيانات مباشرة
//           // أو أنك ستستدعي دالة الرسم الخاصة بك هنا. 
//           // إذا كانت دالة loadQuranPage القديمة (المستوردة) هي التي ترسم، فيجب تمرير البيانات لها.
          
//           // (سنفترض هنا أنك تستدعي دالة الرسم الموجودة في features.js)
//           if(typeof renderQuranPage === 'function'){
//              renderQuranPage(cachedData, targetSurah, targetAyah);
//              return;
//           }
//       }

//       // 2. إذا لم تكن في الذاكرة، اجلبها من الـ API باستخدام الدالة الأصلية المستوردة
//       // ⚠️ ملاحظة: بما أنك قمت باستيراد loadQuranPage من features، لا تعيد تسميتها بـ window.loadQuranPage
//       // لتجنب الـ Infinite Loop. سنكتفي هنا بتحديث الـ State.
      
//       if(typeof loadQuranPage === 'function') {
//          await loadQuranPage(pageNum, targetSurah, targetAyah); // هذه هي الدالة المستوردة من features.js
//       }

//   } catch (err) {
//       console.error('خطأ في تحميل صفحة القرآن:', err);
//       showAlert('error', 'تعذر تحميل الصفحة.');
//   }
// };
window.loadQuranPage = loadQuranPage;
window.startSurahReading = startSurahReading;

// ✅ تعريض دوال المصادقة على الـ window للاستخدام من HTML
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

// ─── 10. Seamless Backend Chunking Logic ────────────────────────────────────────
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

        console.log(`📤 [UPLOAD] Sending 4-sec chunk...`);
        const res = await axios.post('/api/v1/quran/stream-check', formData, config);
        
        if (res.data.status === 'success' && res.data.text) {
            highlightSpokenAyah(res.data.text);
        }
    } catch (e) {
        console.error("🔴 [CHUNK ERROR]", e.message);
    }
}

function startChunkLoop() {
    if (!isLiveTracking || !liveStream) return;

    try {
        chunkRecorder = new MediaRecorder(liveStream, { mimeType: 'audio/webm' });
    } catch (e) {
        chunkRecorder = new MediaRecorder(liveStream); 
    }
    
    let chunks = [];
    chunkRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    chunkRecorder.onstop = () => {
        if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            sendChunkToAPI(blob);
        }
        if (isLiveTracking) {
            startChunkLoop();
        }
    };

    chunkRecorder.start();
    console.log(`🎙️ [REC LOOP] Capturing 4 seconds...`);

    chunkTimeout = setTimeout(() => {
        if (chunkRecorder && chunkRecorder.state === 'recording') {
            chunkRecorder.stop(); 
        }
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
  
  console.log(`🧠 [AI BUFFER]: "${recent}"`);

  let bestEl    = null;
  let bestScore = 0;
  let newMatchedIndex = -1;

  const from = searchStartIndex;
  const to   = Math.min(ayahEls.length, from + 3);

  for (let i = from; i < to; i++) {
    const el    = ayahEls[i];
    const clean = el.dataset.clean;
    if (!clean) continue;

    let score = 0;
    
    if (clean === recent) {
        score = 1.0;
    } else if (clean.includes(recent) && recent.split(' ').length > 2) {
        score = 0.8;
    } else if (recent.includes(clean)) {
        score = 1.0;
    } else {
        score = calculateSimilarity(recent, clean);
    }

    if (score > bestScore && score >= 0.35) {
      bestScore       = score;
      bestEl          = el;
      newMatchedIndex = i;
      if (score >= 0.85) break; 
    }
  }

  if (bestEl && bestScore >= 0.35) {
    console.log(`🟢 [MATCH] Ayah Index: ${newMatchedIndex} (Score: ${bestScore.toFixed(2)})`);

    const isMemMode = document.getElementById('memorize-mode')?.checked;

    document.querySelectorAll('.live-ayah-item').forEach((el, idx) => {
      el.classList.remove('ayah-active');
      const td = el.querySelector('.live-ayah-text');
      if (!td) return;
      
      td.style.backgroundColor = '';
      td.style.color           = '';
      td.style.borderRadius    = '';
      td.style.padding         = '';

      if (idx <= newMatchedIndex) {
        td.classList.remove('blurred-text');
      } else {
        if (isMemMode) td.classList.add('blurred-text');
        else           td.classList.remove('blurred-text');
      }
    });

    bestEl.classList.add('ayah-active');
    const curTd = bestEl.querySelector('.live-ayah-text');
    if (curTd) {
      curTd.classList.remove('blurred-text');
      curTd.style.backgroundColor = '#d1e7dd';
      curTd.style.color           = '#0f5132';
      curTd.style.borderRadius    = '10px';
      curTd.style.padding         = '10px';
    }

    bestEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    lastMatchedIndex = newMatchedIndex;
    
    if (bestScore >= 0.7 || recent.includes(bestEl.dataset.clean)) {
        searchStartIndex = newMatchedIndex + 1;
        accumulatedBuffer = '';
        console.log(`➡️ [ADVANCE] Ready for Ayah Index: ${searchStartIndex}`);
    } else {
        searchStartIndex = newMatchedIndex;
    }
  } else {
      console.log(`🟡 [NO MATCH] Chunk didn't match adequately.`);
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
    if (!filteredAyahs.length) { container.innerHTML = '<p class="text-muted">لا توجد آيات في هذا النطاق.</p>'; return; }
    

    lastMatchedIndex = -1;
    searchStartIndex = 0;
    accumulatedBuffer = '';

    filteredAyahs.forEach(ayah => {
      const s         = String(surah).padStart(3, '0');
      const a         = String(ayah.numberInSurah).padStart(3, '0');
      const audioUrl  = `https://everyayah.com/data/Husary_128kbps/${s}${a}.mp3`;
      const btnId     = `btn-play-${s}-${a}`;
      const blurClass = isBlur ? 'blurred-text' : '';
      const cleanText = normalizeArabic(ayah.text);

      container.insertAdjacentHTML('beforeend', `
        <div class="live-ayah-item" data-clean="${cleanText}"
          style="border-bottom:1px solid #eee;padding:10px 0;display:flex;align-items:center;justify-content:space-between;transition:all 0.3s ease;">
          <button id="${btnId}" class="btn live-play-btn btn-outline-success rounded-circle"
            style="width:40px;height:40px;padding:0;flex-shrink:0"
            onclick="playLiveAudio('${audioUrl}','${btnId}')">
            <i class="fas fa-play"></i>
          </button>
          <div class="live-ayah-text ${blurClass}" id="text-${btnId}"
            style="flex-grow:1;text-align:right;margin-right:15px;font-family:'Amiri';font-size:1.3rem;line-height:2;transition:all 0.3s ease;">
            ${ayah.text}
            <span class="badge bg-light text-dark ms-1 rounded-circle border">${ayah.numberInSurah}</span>
          </div>
        </div>`);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="text-danger">حدث خطأ في تحميل الآيات.</p>';
  }
};

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
    else if (isBlur)             td.classList.add('blurred-text');
    else                         td.classList.remove('blurred-text');
  });
});

// ─── 13. Global Click Listener ────────────────────────────────────────────────
document.addEventListener('click', async (e) => {
  const bookmarkBtn = e.target.closest('.bookmark-icon-btn');
  if (bookmarkBtn) { e.preventDefault(); e.stopPropagation(); await toggleBookmark(bookmarkBtn.dataset.surah, bookmarkBtn.dataset.ayah, bookmarkBtn); return; }
  
  // ✅ زر الختمة - التحقق من تسجيل الدخول قبل التحديث
  const khatmahBtn = e.target.closest('.khatmah-icon-btn');
  if (khatmahBtn) {
    e.preventDefault(); e.stopPropagation();
    if (!isUserLoggedIn()) {
      requireLogin('تتبع الختمة وحفظ التقدم');
      return;
    }
    // التحديث والتأثيرات البصرية هتم بالكامل داخل هذه الدالة
    await updateKhatmahProgress(khatmahBtn.dataset.surah, khatmahBtn.dataset.ayah);
    return;
  }
  // ✅ حذف العلامات المرجعية
  const deleteBookmarkBtn = e.target.closest('.delete-bookmark-btn');
  if (deleteBookmarkBtn) {
    e.preventDefault(); e.stopPropagation();
    const id = deleteBookmarkBtn.dataset.id;
    if (id) await deleteBookmark(id);
    return;
  }
  if (e.target.closest('button') || e.target.closest('a')) return;
  const verse = e.target.closest('[data-surah][data-ayah]');
  if (verse) { e.preventDefault(); window.showTafseer(verse.dataset.surah, verse.dataset.ayah); }
});

// ─── 14. Swipe ────────────────────────────────────────────────────────────────
let touchstartX = 0;
let touchstartY = 0;
let startTime = 0;

document.addEventListener('touchstart', e => {
  const qs = document.getElementById('quran-section');
  if (qs && !qs.classList.contains('d-none')) {
    const touchObj = e.changedTouches[0];
    touchstartX = touchObj.screenX;
    touchstartY = touchObj.screenY;
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

  // ⚙️ إعدادات الحساسية (يمكنك تعديلها حسب رغبتك)
  const minSwipeDistance = 90;     
  const maxVerticalTolerance = 60;  
  const maxSwipeTime = 400;       

  // التأكد أن السحبة كانت سريعة
  if (elapsedTime <= maxSwipeTime) {
    if (Math.abs(distX) >= minSwipeDistance && Math.abs(distY) <= maxVerticalTolerance) {
      if (distX > 0) {
        document.getElementById('btn-prev-page')?.click();
      } else {
        document.getElementById('btn-next-page')?.click();
      }
    }
  }
}, { passive: true });


// ─── 15. Nav Buttons ───────
document.getElementById('btn-prev-page')?.addEventListener('click', () => {
  if (window.currentPage < 604) {
    window.currentPage++;
    window.loadQuranPage(window.currentPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    prefetchPage(window.currentPage + 1);
    prefetchPage(window.currentPage + 2);
  }
});
document.getElementById('btn-next-page')?.addEventListener('click', () => {
  if (window.currentPage > 1) {
    window.currentPage--;
    window.loadQuranPage(window.currentPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    prefetchPage(window.currentPage - 1);
    prefetchPage(window.currentPage - 2);
  }
});

// ─── 16. Popstate & Body Links ────────────────────────────────────────────────
window.addEventListener('popstate', (event) => {
  stopAllMedia();
  const path = window.location.pathname;
  if (path === '/' || path === '/index.html') {
    document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
    document.getElementById('home-section').classList.remove('d-none');
  } else if (event.state?.section) {
    document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
    document.getElementById(`${event.state.section}-section`)?.classList.remove('d-none');
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
    else if (href.includes('quran'))      { window.showSection('surah-index'); window.loadSurahIndex(); }
    else if (href.includes('reciters'))     window.showSection('reciters');
    else if (href.includes('my-bookmarks')) window.showSection('bookmarks');
  }
});

// ─── 17. Native Init ──────────────────────────────────────────────────────────
const initNativeFeatures = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (let r of regs) await r.unregister();
      const keys = await caches.keys();
      for (let k of keys) await caches.delete(k);
    }
    await LocalNotifications.cancel({ notifications: [{ id: 101 }] });
    await App.removeAllListeners();
    await App.addListener('backButton', ({ canGoBack }) => {
      const home = document.getElementById('home-section');
      if (home && !home.classList.contains('d-none')) { stopAllMedia(); canGoBack ? window.history.back() : App.exitApp(); }
      else window.showSection('home');
    });
    const notifs = await LocalNotifications.requestPermissions();
    if (notifs.display === 'granted') {
      await LocalNotifications.createChannel({ id: 'azan-channel', name: 'تنبيهات الصلاة', importance: 5, sound: 'azan_short.mp3', visibility: 1, vibration: true });
      await LocalNotifications.createChannel({ id: 'khatmah-channel', name: 'تنبيهات الورد', importance: 4, visibility: 1, vibration: true });
    }
    try { await Geolocation.requestPermissions(); } catch (e) { console.log('Geo permission:', e); }
  } catch (err) { console.error('Native Init Error:', err); }
};

// ─── 18. DOMContentLoaded ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

try {
  if (Capacitor.isNativePlatform()) {
    const { value: token } = await Preferences.get({ key: 'auth_token' });
    if (token) { 
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; 
    }
  } else {
    const token = localStorage.getItem('auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('✅ Token restored from localStorage');
    }
  }
} catch { console.log('No saved token'); }

  initNativeFeatures();
  if (typeof initSearch === 'function') initSearch();
  window.checkAuth();
  if (document.getElementById('prayers-list')) loadPrayers();
  if (document.getElementById('active-khatmah')) manageKhatmah().catch(() => {});
  // (Initial Route Handler)
  const initialPath = window.location.pathname;
  
  if (initialPath === '/' || initialPath === '/index.html') {
      window.showSection('home');
  } else if (initialPath.startsWith('/quran')) {
      window.showSection('quran');
      const parts = initialPath.split('/');
      const pageToLoad = (parts.length > 2 && !isNaN(parts[2])) ? parseInt(parts[2]) : window.currentPage || 1;
      
      setTimeout(() => {
          if (window.loadQuranPage) window.loadQuranPage(pageToLoad);
      }, 100);
      
  } else if (initialPath.includes('admin') || initialPath.includes('manage-users')) {
      window.showSection('admin');
      if (window.loadAllUsers) window.loadAllUsers();
  } else {
      const sectionName = initialPath.replace('/', '');
      if (document.getElementById(`${sectionName}-section`)) {
          window.showSection(sectionName);
      } else {
          window.showSection('home');
      }
  }

// دالة مساعدة لربط الفورم مع منع التحديث التلقائي
const handleForm = (id, action) => { 
    const f = document.getElementById(id); 
    if (f) {
        // نتأكد أننا لم نضف المستمع سابقاً لتجنب التكرار
        f.removeEventListener('submit', f._handler);
        f._handler = (e) => { 
            e.preventDefault(); 
            action(); 
        };
        f.addEventListener('submit', f._handler);
    }
};

// 1. معالجة تسجيل الدخول (يدعم الأسماء الجديدة والقديمة)
// المحاولة الأولى: الأسماء الجديدة (index.html)
handleForm('loginFormPage', () => {
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    if (emailEl && passEl) login(emailEl.value, passEl.value);
});

handleForm('loginForm', () => {
    const emailEl = document.getElementById('email');
    const passEl = document.getElementById('password');
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
handleForm('verifyOTPForm', () => verifyOTP(document.getElementById('email').value, document.getElementById('otp').value));

handleForm('updateUserForm', () => {
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    updateSettings({ name, email }, 'data');
});

document.getElementById('logoutBtnProfile')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
document.getElementById('logoutBtn')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  // AI Upload
  const triggerUpload = document.getElementById('triggerUpload');
  const audioFile     = document.getElementById('audioFile');
  const uploadBtn     = document.getElementById('uploadBtn');
  if (triggerUpload && audioFile) {
    triggerUpload.addEventListener('click', () => audioFile.click());
    audioFile.addEventListener('change', function () {
      if (this.files?.[0]) { if (uploadBtn) uploadBtn.classList.remove('d-none'); triggerUpload.innerText = `تم اختيار: ${this.files[0].name}`; }
    });
  }
  if (uploadBtn) {
    uploadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const surahVal  = document.getElementById('ai-surah-select')?.value;
      const startAyah = document.getElementById('ai-start-ayah')?.value || null;
      const endAyah   = document.getElementById('ai-end-ayah')?.value   || null;
      if (!audioFile.files[0]) return showAlert('error', 'يرجى اختيار ملف أولاً');
      if (!surahVal)             return showAlert('error', 'يرجى اختيار السورة');
      checkRecitation(audioFile.files[0], surahVal, startAyah, endAyah, URL.createObjectURL(audioFile.files[0]));
    });
  }

  // ✅ AI Recording - التحقق من تسجيل الدخول قبل الضغط على المايك
  const aiRecordBtn    = document.getElementById('recordBtn');
  const aiRecordStatus = document.getElementById('recordStatus');
  if (aiRecordBtn) {
    aiRecordBtn.addEventListener('click', async () => {
      if (!isUserLoggedIn()) {
        requireLogin('المصحح الذكي للتلاوة');
        return;
      }

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
            checkRecitation(new File([blob], 'rec.webm', { type: 'audio/webm' }), surahVal,
              document.getElementById('ai-start-ayah').value, document.getElementById('ai-end-ayah').value, URL.createObjectURL(blob));
          };
          aiMediaRecorder.start();
          aiRecordBtn.classList.replace('btn-outline-danger', 'btn-danger');
          aiRecordBtn.innerHTML = '<i class="fas fa-stop fa-3x"></i>';
          if (aiRecordStatus) aiRecordStatus.innerText = 'جاري التسجيل... انقر للإيقاف';
        } catch (err) { console.error(err); showAlert('error', 'يرجى السماح بصلاحية الميكروفون'); }
      } else {
        aiMediaRecorder.stop(); aiMediaRecorder.stream.getTracks().forEach(t => t.stop());
        aiRecordBtn.classList.replace('btn-danger', 'btn-outline-danger');
        aiRecordBtn.innerHTML = '<i class="fas fa-microphone fa-2x"></i>';
        if (aiRecordStatus) aiRecordStatus.innerText = 'تم الانتهاء! جاري التحليل...';
      }
    });
  }

  // ── Live Tracking Buttons ──────────────────────────────────────────────────
  const btnStartLive = document.getElementById('btn-start-live');
  const btnStopLive  = document.getElementById('btn-stop-live');
  const liveStatus   = document.getElementById('live-status');

  if (btnStartLive && btnStopLive) {

    btnStartLive.addEventListener('click', async () => {
      if (!isUserLoggedIn()) {
        requireLogin('تتبع التلاوة المباشر');
        return;
      }

      try {
        liveStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        isLiveTracking = true;
        lastMatchedIndex = -1;
        searchStartIndex = 0;   
        accumulatedBuffer = '';

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
    </div>
  `;
}
        startChunkLoop();

      } catch (err) { 
          showAlert('error', 'يرجى السماح بصلاحية الميكروفون'); 
      }
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
  toggleBtn?.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) { document.body.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); if (icon) { icon.classList.remove('fa-sun', 'text-warning'); icon.classList.add('fa-moon'); } }
    else        { document.body.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun', 'text-warning'); } }
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

  // ─── Volume Control للمصحح الذكي ────────────────────────
  const volumeSliderAi = document.getElementById('volume-slider-ai');
  const volumeControlAi = document.getElementById('volume-control-ai');

  if (volumeSliderAi) {
    volumeSliderAi.addEventListener('input', function() {
      document.querySelectorAll('#result-container audio').forEach(audio => {
        audio.volume = parseFloat(this.value);
      });
    });
  }

  const resultContainer = document.getElementById('result-container');
  if (resultContainer) {
    const observer = new MutationObserver(() => {
      if (!resultContainer.classList.contains('d-none')) {
        if (volumeControlAi) volumeControlAi.classList.remove('d-none');
      } else {
        if (volumeControlAi) volumeControlAi.classList.add('d-none');
      }
    });
    observer.observe(resultContainer, { attributes: true, attributeFilter: ['class'] });
  }

  document.getElementById('volume-slider-live')?.addEventListener('input', function() {
    if (window.currentAudio) {
      window.currentAudio.volume = parseFloat(this.value);
    }
    document.querySelectorAll('#live-quran-container audio').forEach(a => {
      a.volume = parseFloat(this.value);
    });
  });
// ─── (Fix Reload) ───
  const path = window.location.pathname;
  
  const initAppRouting = () => {
      
      if (path.startsWith('/quran')) {
          const parts = path.split('/');
          const page = (parts.length > 2 && !isNaN(parts[2])) ? parseInt(parts[2]) : 1;
          
          // 1. أظهر واجهة المصحف فوراً (لكي لا تبقى الشاشة بيضاء)
          window.showSection('quran');
          
          // 2. انتظر ثانية واحدة فقط لضمان تهيئة الذاكرة وكل شيء، ثم ارسم الصفحة
          setTimeout(() => {
              if (window.loadQuranPage) {
                  window.loadQuranPage(page);
              }
          }, 300);
          
      } else if (path !== '/' && path !== '/index.html') {
          const section = path.replace('/', '');
          if (document.getElementById(`${section}-section`)) {
              window.showSection(section);
          } else {
              window.showSection('home');
          }
      } else {
          window.showSection('home');
      }
  };

  // تشغيل الموجه بدون await لكي لا نوقف المتصفح
  initAppRouting();

  console.log(Capacitor.isNativePlatform() ? '📱 Mobile Mode Active' : '🌐 Web Mode Active');
});