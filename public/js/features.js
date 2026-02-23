/* eslint-disable */
import localforage from 'localforage';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import axios from 'axios';
import { showAlert } from './auth';


let currentPage = 1;

const surahStartPages = {
  1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187, 10: 208,
  11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282, 18: 293, 19: 305, 20: 312,
  21: 322, 22: 332, 23: 342, 24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396, 30: 404,
  31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446, 38: 453, 39: 458, 40: 467,
  41: 477, 42: 483, 43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515, 50: 518,
  51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542, 59: 545, 60: 549,
  61: 551, 62: 553, 63: 554, 64: 556, 65: 558, 66: 560, 67: 562, 68: 564, 69: 566, 70: 568,
  71: 570, 72: 572, 73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583, 80: 585,
  81: 586, 82: 587, 83: 587, 84: 589, 85: 590, 86: 591, 87: 591, 88: 592, 89: 593, 90: 594,
  91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599, 100: 599,
  101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602, 107: 602, 108: 602, 109: 603,
  110: 603, 111: 603, 112: 604, 113: 604, 114: 604
};

const surahNames = ["الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس", "التكوير", "الإنفطار", "المطففين", "الإنشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس"];

// ─── بيانات الأجزاء ───────────────────────────────────────────────────────────
const juzData = [
  { juz: 1,  page: 1,   name: "الم" },
  { juz: 2,  page: 22,  name: "سَيَقُولُ" },
  { juz: 3,  page: 42,  name: "تِلْكَ الرُّسُلُ" },
  { juz: 4,  page: 62,  name: "لَنْ تَنَالُوا" },
  { juz: 5,  page: 82,  name: "وَالْمُحْصَنَاتُ" },
  { juz: 6,  page: 102, name: "لَا يُحِبُّ اللَّهُ" },
  { juz: 7,  page: 121, name: "وَإِذَا سَمِعُوا" },
  { juz: 8,  page: 142, name: "وَلَوْ أَنَّنَا" },
  { juz: 9,  page: 162, name: "قَالَ الْمَلَأُ" },
  { juz: 10, page: 182, name: "وَاعْلَمُوا" },
  { juz: 11, page: 201, name: "يَعْتَذِرُونَ" },
  { juz: 12, page: 221, name: "وَمَا مِنْ دَابَّةٍ" },
  { juz: 13, page: 241, name: "وَمَا أُبَرِّئُ" },
  { juz: 14, page: 261, name: "رُبَمَا" },
  { juz: 15, page: 281, name: "سُبْحَانَ الَّذِي" },
  { juz: 16, page: 301, name: "قَالَ أَلَمْ" },
  { juz: 17, page: 321, name: "اقْتَرَبَ لِلنَّاسِ" },
  { juz: 18, page: 341, name: "قَدْ أَفْلَحَ" },
  { juz: 19, page: 361, name: "وَقَالَ الَّذِينَ" },
  { juz: 20, page: 381, name: "أَمَّنْ خَلَقَ" },
  { juz: 21, page: 401, name: "اتْلُ مَا أُوحِيَ" },
  { juz: 22, page: 421, name: "وَمَنْ يَقْنُتْ" },
  { juz: 23, page: 441, name: "وَمَا لِيَ" },
  { juz: 24, page: 461, name: "فَمَنْ أَظْلَمُ" },
  { juz: 25, page: 481, name: "إِلَيْهِ يُرَدُّ" },
  { juz: 26, page: 501, name: "حم" },
  { juz: 27, page: 521, name: "قَالَ فَمَا خَطْبُكُمْ" },
  { juz: 28, page: 541, name: "قَدْ سَمِعَ اللَّهُ" },
  { juz: 29, page: 561, name: "تَبَارَكَ الَّذِي" },
  { juz: 30, page: 581, name: "عَمَّ يَتَسَاءَلُونَ" },
];

const getJuzByPage = (pageNum) => {
  let juz = 1;
  for (let i = 0; i < juzData.length; i++) {
    if (juzData[i].page <= pageNum) juz = juzData[i].juz;
    else break;
  }
  return juz;
};

const getHizbByPage = (pageNum) => {
  const hizb = Math.ceil(pageNum / (604 / 60));
  return Math.min(hizb, 60);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
// دالة لتحميل الملف الصوتي وحفظه للعمل أوفلاين
// window.downloadAudioOffline = async (url, buttonElement) => {
//     try {
//         // تغيير شكل الزر ليُظهر أنه جاري التحميل
//         buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
//         buttonElement.disabled = true;

//         // فتح (أو إنشاء) كاش مخصص للصوتيات
//         const audioCache = await caches.open('quran-audio-cache-v1');
        
//         // التحقق مما إذا كان الملف موجوداً بالفعل
//         const existingResponse = await audioCache.match(url);
//         if (existingResponse) {
//             Swal.fire('موجود مسبقاً', 'هذه السورة محفوظة بالفعل في جهازك للاستماع بدون إنترنت!', 'info');
//             buttonElement.innerHTML = '<i class="fas fa-check text-success"></i> محفوظة';
//             return;
//         }

//         // جلب الملف الصوتي من السيرفر
//         const response = await fetch(url);
//         if (!response.ok) throw new Error('Network response was not ok');

//         // حفظ الملف في الكاش
//         await audioCache.put(url, response.clone());

//         // نجاح العملية
//         buttonElement.innerHTML = '<i class="fas fa-check text-success"></i> تم الحفظ';
//         Swal.fire({
//             toast: true,
//             position: 'bottom-end',
//             icon: 'success',
//             title: 'تم حفظ السورة للعمل بدون إنترنت',
//             showConfirmButton: false,
//             timer: 3000
//         });

//     } catch (err) {
//         console.error('Audio download error:', err);
//         buttonElement.innerHTML = '<i class="fas fa-download"></i> فشل، أعد المحاولة';
//         buttonElement.disabled = false;
//     }
// };

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
    if (result.isConfirmed) window.showSection('login');
  });
};

// دالة فحص الإنترنت
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

const isUserLoggedIn = () => {
  const logoutBtn = document.getElementById('logoutBtn');
  const userLinks = document.querySelectorAll('.user-link:not(.d-none)');
  return (logoutBtn !== null) || (userLinks.length > 0);
};

window.calculateSimilarity = function(text1, text2) {
  if (!text1 || !text2) return 0;
  const words1 = new Set(text1.split(' ').filter(w => w.length > 1));
  const words2 = new Set(text2.split(' ').filter(w => w.length > 1));
  if (words1.size === 0 || words2.size === 0) return 0;
  let commonCount = 0;
  words1.forEach(word => { if (words2.has(word)) commonCount++; });
  return commonCount / Math.max(words1.size, words2.size);
};

let _loadingPage = null;
// 👈 إضافة الدالة المفقودة داخل features.js
const getSurahNameByPageLocal = (pageNum) => {
  const surahStartPages = { 1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187, 10: 208, 11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282, 18: 293, 19: 305, 20: 312, 21: 322, 22: 332, 23: 342, 24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396, 30: 404, 31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446, 38: 453, 39: 458, 40: 467, 41: 477, 42: 483, 43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515, 50: 518, 51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542, 59: 545, 60: 549, 61: 551, 62: 553, 63: 554, 64: 556, 65: 558, 66: 560, 67: 562, 68: 564, 69: 566, 70: 568, 71: 570, 72: 572, 73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583, 80: 585, 81: 586, 82: 587, 83: 587, 84: 589, 85: 590, 86: 591, 87: 591, 88: 592, 89: 593, 90: 594, 91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599, 100: 599, 101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602, 107: 602, 108: 602, 109: 603, 110: 603, 111: 603, 112: 604, 113: 604, 114: 604 };
  const surahNames = ["الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر", "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج", "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس", "التكوير", "الإنفطار", "المطففين", "الإنشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد", "الإخلاص", "الفلق", "الناس"];
  let sNum = 1;
  for (let i = 1; i <= 114; i++) {
    if (surahStartPages[i] <= pageNum) sNum = i; else break;
  }
  return surahNames[sNum - 1];
};


// ═══════════════════════════════════════════════════════════════════════════════
// ─── Bookmarks Session Cache ───────────────────────────────────────────────────
// بدل ما نطلب /bookmarks في كل صفحة بنفتحها في المصحف،
// بنحفظ النتيجة في الـ memory ونمسحها بس لما المستخدم يعمل تغيير فعلي
// ═══════════════════════════════════════════════════════════════════════════════
let _bookmarksCache    = null;  // null = لسه مش محملة
let _bookmarksFetching = false; // بنمنع طلبين يطلعوا في نفس الوقت

const getBookmarks = async () => {
  // ✅ لو الكاش موجود ارجعه فورًا
  if (_bookmarksCache !== null) {
    console.log('⚡ [BOOKMARKS CACHE] من الكاش بدون API');
    return _bookmarksCache;
  }
  // ✅ لو في request شغال دلوقتي، استنى وارجع الكاش لما يخلص
  if (_bookmarksFetching) {
    await new Promise(r => setTimeout(r, 300));
    return _bookmarksCache || [];
  }
  _bookmarksFetching = true;
  try {
    const res = await axios.get('/api/v1/bookmarks');
    _bookmarksCache = res.data.data.bookmarks;
    console.log(`✅ [BOOKMARKS] تم تحميل ${_bookmarksCache.length} علامة وحفظها في الكاش`);
    return _bookmarksCache;
  } catch (err) {
    console.warn('⚠️ [BOOKMARKS] فشل تحميل العلامات:', err.message);
    return [];
  } finally {
    _bookmarksFetching = false;
  }
};

// ✅ امسح الكاش لما المستخدم يضيف أو يحذف bookmark
const invalidateBookmarksCache = () => {
  _bookmarksCache = null;
  console.log('🗑️ [BOOKMARKS CACHE] تم مسح الكاش');
};

// ─── loadQuranPage Lock ────────────────────────────────────────────────────────


function updateNavButtons() {
  const nextBtn = document.getElementById('next-surah-btn');
  const prevBtn = document.getElementById('prev-surah-btn');

  if (nextBtn) {
    if (currentPage < 604) { nextBtn.classList.remove('d-none'); nextBtn.onclick = () => loadQuranPage(currentPage + 1); }
    else nextBtn.classList.add('d-none');
  }
  if (prevBtn) {
    if (currentPage > 1) { prevBtn.classList.remove('d-none'); prevBtn.onclick = () => loadQuranPage(currentPage - 1); }
    else prevBtn.classList.add('d-none');
  }
}

// 👈 أضف هذه الدالة هنا لكي تتعرف عليها loadQuranPage
const getSurahNameByPage = (pageNum) => {
  let sNum = 1;
  // البحث في كائن surahStartPages عن أقرب سورة للصفحة الحالية
  for (let i = 1; i <= 114; i++) {
    if (surahStartPages[i] <= pageNum) {
      sNum = i;
    } else {
      break;
    }
  }
  return surahNames[sNum - 1] || "الفاتحة";
};



export async function loadQuranPage(pageNumber, targetSurah = null, targetAyah = null) {
  const pageNum = parseInt(pageNumber);
  
  // تحديث عنوان السورة في الأعلى بناءً على الدالة المحلية
  const titleEl = document.getElementById('surah-title-display');
  if (titleEl) titleEl.textContent = `سورة ${getSurahNameByPage(pageNum)}`;

  // ✅ لو نفس الصفحة بتتحمل دلوقتي، اتجاهل الطلب التاني
  if (_loadingPage === pageNum) {
    console.log(`⏳ [SKIP] صفحة ${pageNum} بتتحمل خلاص - تم التجاهل`);
    return;
  }
  _loadingPage = pageNum;

  try {
    currentPage = pageNum;
    window.currentPage = pageNum;

    // ─── IndexedDB Cache ──────────────────────────────────────────────────────
    const _cacheGet = window['cacheGet'];
    const _cacheSet = window['cacheSet'];
    const _prefetch = window['prefetchPage'];

    let pageData;
    const cachedData = _cacheGet ? await _cacheGet(pageNum) : null;

    if (cachedData) {
      console.log(`⚡ [IDB HIT] صفحة ${pageNum} من IndexedDB - بدون API`);
      pageData = cachedData;
    } else {
      if (!navigator.onLine) {
         showAlert('error', 'لا يوجد اتصال بالإنترنت، وهذه الصفحة غير محفوظة على جهازك.');
         return; // وقف التنفيذ
      }
      console.log(`🌐 [API] جاري تحميل صفحة ${pageNum} من السيرفر`);
      const res = await axios.get(`/api/v1/quran/page/${pageNum}`);
      pageData = res.data.data;
      if (_cacheSet) await _cacheSet(pageNum, pageData);
    }

    // ✅ Prefetch الصفحات المجاورة في الخلفية
    setTimeout(() => {
      if (_prefetch) {
        _prefetch(pageNum + 1);
        _prefetch(pageNum - 1);
        _prefetch(pageNum + 2);
        _prefetch(pageNum - 2);
      }
    }, 800);

    const { ayahs } = pageData;
    let khatmah = await localforage.getItem('latest_khatmah');
    if (!khatmah && pageData.khatmah) {
        khatmah = pageData.khatmah;
    }

    // ─── Bookmarks من الكاش (طلب واحد بس طول الـ session) ────────────────────
    let userBookmarks = [];
    const loggedIn = isUserLoggedIn();
    if (loggedIn) {
      try {
        if (navigator.onLine) {
          const bookmarkRes = await axios.get('/api/v1/bookmarks');
          userBookmarks = bookmarkRes.data.data.bookmarks; 
          // ✅ حفظ العلامات المرجعية في الكاش للأوفلاين
          await localforage.setItem('offline_bookmarks', userBookmarks);
        } else {
          // ✅ جلب العلامات من الكاش لو مفيش نت
          userBookmarks = await localforage.getItem('offline_bookmarks') || [];
          console.log('⚡ [OFFLINE] تم تحميل العلامات المرجعية من الكاش');
        }
      } catch (err) {
        userBookmarks = await localforage.getItem('offline_bookmarks') || [];
        console.warn('Session expired or error fetching bookmarks, using cache');
      }
    }

    const container = document.getElementById('ayahs-container');
    if (!container) return;
    container.innerHTML = '';

    // ─── بناء الـ HTML والتوافق مع الـ API الأصلي ───────────────────────────────
    let fullTextHTML = '<div class="quran-page-content" style="text-align: justify; text-align-last: center; line-height: 2.8; font-family: \'Amiri\'; font-size: 22px; direction: rtl;">';

    if (ayahs.length > 0) {
      const firstAyah = ayahs[0];
      let sNameAr = firstAyah.surahNameAr || (firstAyah.surah && firstAyah.surah.name) || '...';
      if(sNameAr.startsWith("سُورَةُ ")) sNameAr = sNameAr.replace("سُورَةُ ", "سورة ");
      document.title = `${sNameAr} - صفحة ${pageNum}`;
      const titleElem = document.getElementById('surah-name');
      if (titleElem) titleElem.innerText = sNameAr;
    }

    const juzNum    = getJuzByPage(pageNum);
    const hizbNum   = getHizbByPage(pageNum);
    const juzInfoEl = document.getElementById('quran-juz-info');
    if (juzInfoEl) {
      juzInfoEl.innerHTML = `
        <span class="badge bg-success me-2">الجزء ${juzNum}</span>
        <span class="badge bg-outline-success border border-success text-success">الحزب ${hizbNum}</span>
      `;
    }

    // ─── Khatmah Scroll ───────────────────────────────
    if (khatmah) {
      const scrollSurah = targetSurah || khatmah.currentSurah;
      const scrollAyah  = targetAyah  || khatmah.currentAyah;
      setTimeout(() => {
        const khatmahIcon = document.querySelector(
          `.khatmah-icon-btn[data-surah="${khatmah.currentSurah}"][data-ayah="${khatmah.currentAyah}"]`
        );
        if (khatmahIcon) {
          khatmahIcon.classList.remove('far');
          khatmahIcon.classList.add('fas', 'khatmah-active-pulse');
          khatmahIcon.style.color     = '#198754';
          khatmahIcon.style.fontSize  = '1.1em';
          khatmahIcon.style.filter    = 'drop-shadow(0 0 5px #198754)';
          setTimeout(() => {
            khatmahIcon.classList.remove('khatmah-active-pulse');
            khatmahIcon.style.filter = 'drop-shadow(0 0 3px #198754)';
          }, 4000);
        }

        const scrollTarget = document.getElementById(`ayah-${scrollSurah}-${scrollAyah}`);
        if (scrollTarget) {
          scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
          scrollTarget.style.transition       = 'background 0.5s';
          scrollTarget.style.backgroundColor  = '#d1e7dd';
          setTimeout(() => { scrollTarget.style.backgroundColor = ''; }, 3000);
        }
      }, 500); 
    }

    ayahs.forEach(ayah => {
      let ayahText  = ayah.text;
      
      const ayahNum = ayah.ayahNumber || ayah.numberInSurah;
      const surahNum = ayah.surahNumber || (ayah.surah && ayah.surah.number);
      let surahName = ayah.surahNameAr || (ayah.surah && ayah.surah.name) || "";
      if(surahName.startsWith("سُورَةُ ")) surahName = surahName.replace("سُورَةُ ", "سورة ");

      if (ayahNum === 1) {
        if (surahNum !== 1 && surahNum !== 9) {
          fullTextHTML += `
            <div class="surah-separator text-center my-4 p-2" style="background: #f4f4f4; border: 1px solid #ddd; border-radius: 5px;">
              <h3 class="text-success m-0" style="font-family: 'Amiri';"> ${surahName}</h3>
            </div>
            <div class="bismillah text-center mb-3" style="font-family: 'Amiri'; font-size: 1.5rem;">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
          `;
          const bismillahRegex = /^\s*ب[\u064B-\u065F\u0670]*س[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*\s*[ٱا]لل[\u064B-\u065F\u0670]*ه[\u064B-\u065F\u0670]*\s*[ٱا]لر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*ٰ?ن[\u064B-\u065F\u0670]*\s*[ٱا]لر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*ي[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*/;
          ayahText = ayahText.replace(bismillahRegex, '').trim();
        } else if (surahNum === 1) {
          fullTextHTML += `<div class="surah-separator text-center my-4"><h3 class="text-success m-0" style="font-family: 'Amiri';">سورة الفاتحة</h3></div>`;
        } else if (surahNum === 9) {
          fullTextHTML += `<div class="surah-separator text-center my-4 p-2" style="background: #f4f4f4; border: 1px solid #ddd; border-radius: 5px;"><h3 class="text-success m-0" style="font-family: 'Amiri';">سورة التوبة</h3></div>`;
        }
      }

      const isBookmarked  = userBookmarks.some(b => parseInt(b.surah) === surahNum && parseInt(b.ayah) === ayahNum);
      const iconClass     = isBookmarked ? 'fas' : 'far';
      const iconColor     = isBookmarked ? '#d4af37' : '#ccc';

      const isKhatmahActive = khatmah &&
        parseInt(khatmah.currentSurah) == surahNum &&
        parseInt(khatmah.currentAyah)  == ayahNum;
      const khatmahClass  = isKhatmahActive ? 'fas' : 'far';
      const khatmahColor  = isKhatmahActive ? '#198754' : '#28a745';

      fullTextHTML += `
        <span id="ayah-${surahNum}-${ayahNum}" class="ayah-text ayah-clickable" data-surah="${surahNum}" data-ayah="${ayahNum}" title="تفسير الآية ${ayahNum}" style="cursor: pointer;">${ayahText}</span>
        <span class="ayah-end-wrapper" style="white-space: nowrap; display: inline-block;">
          <span class="ayah-end-symbol" style="color: #d4af37; font-family: sans-serif; margin: 0 5px; border: 1px solid #d4af37; border-radius: 50%; padding: 0 5px; font-size: 0.8em;">${ayahNum}</span>
          <i class="${iconClass} fa-bookmark bookmark-icon-btn" data-surah="${surahNum}" data-ayah="${ayahNum}" title="حفظ علامة مرجعية" style="cursor: pointer; color: ${iconColor}; font-size: 0.7em;"></i>
        </span>
        <i class="${khatmahClass} fa-flag khatmah-icon-btn mx-1" data-surah="${surahNum}" data-ayah="${ayahNum}" title="${isKhatmahActive ? 'أنت تتوقف هنا' : 'تحديث الختمة هنا'}" style="cursor: pointer; color: ${khatmahColor}; font-size: 0.8em;"></i>
      `;
    });

    fullTextHTML += '</div><div class="text-center mt-3 text-muted small">- ' + pageNum + ' -</div>';
    container.innerHTML = fullTextHTML;

    const duaBtnContainer = document.getElementById('khatmah-dua-btn-container');
    if (duaBtnContainer) {
      if (pageNum === 604) {
        duaBtnContainer.classList.remove('d-none');
      } else {
        duaBtnContainer.classList.add('d-none');
      }
    }

    document.querySelectorAll('.nav-prev, .nav-next, #prev-surah-mobile, #next-surah-mobile').forEach(btn => btn.classList.remove('d-none'));
    if (typeof updateNavButtons === 'function') updateNavButtons();

    if (!targetSurah || !targetAyah) {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#ayah-')) {
        const parts = hash.split('-');
        if (parts.length >= 3) { targetSurah = parts[1]; targetAyah = parts[2]; }
      }
    }

  } catch (err) {
    console.error(err);
    const container = document.getElementById('ayahs-container');
    if (container) container.innerHTML = '<p class="text-center text-danger">حدث خطأ أثناء تحميل الصفحة، يرجى إعادة المحاولة.</p>';
  } finally {
    _loadingPage = null; 
  }
}

export function startSurahReading(surahNumber) {
  const sNum = parseInt(surahNumber);
  loadQuranPage(surahStartPages[sNum] || 1);
}

export async function loadSurahs() {
  try {
    const res = await axios.get('/api/v1/quran/surahs');
    const container = document.getElementById('surahs-container');
    if (!container) return;
    container.innerHTML = '';
    const surahsList = res.data.data.surahs;
    surahsList.forEach(surah => {
      const surahNum  = surah.number || surah.surahNumber || (surahsList.indexOf(surah) + 1);
      const startPage = surahStartPages[surahNum] || 1;
      const html = `
        <div class="col-md-3 mb-3">
          <a href="/quran/${startPage}" class="text-decoration-none">
            <div class="card h-100 hover-shadow border-0 shadow-sm">
              <div class="card-body text-center">
                <div class="d-flex justify-content-center align-items-center mb-2">
                  <span class="badge bg-success rounded-circle p-2 me-2">${surahNum}</span>
                  <h5 class="card-title text-dark mb-0 fw-bold" style="font-family: 'Amiri', serif;"> ${surah.arabicName}</h5>
                </div>
                <p class="text-muted small mb-0">عدد الآيات: ${surah.ayahCount}</p>
              </div>
            </div>
          </a>
        </div>`;
      container.insertAdjacentHTML('beforeend', html);
    });
  } catch (err) { console.error(err); }
}

// ✅ toggleBookmark - بيمسح الكاش بعد كل تغيير
export async function toggleBookmark(surah, ayah, iconElement) {
  try {
    const isCurrentlyBookmarked = iconElement.classList.contains('fas');

    if (isCurrentlyBookmarked) {
      const res = await axios.post('/api/v1/bookmarks', { surahNumber: surah, ayahNumber: ayah });
      if (res.data.message === 'removed' || res.data.message === 'deleted') {
        iconElement.classList.replace('fas', 'far');
        iconElement.style.color = '#ccc';
        invalidateBookmarksCache(); // ✅ امسح الكاش
        showAlert('success', 'تم إزالة العلامة المرجعية');
      }
    } else {
      const { value: note, isConfirmed } = await Swal.fire({
        title: '🔖 حفظ علامة مرجعية',
        html: `
          <p class="text-muted small mb-3">يمكنك إضافة ملاحظة لهذه العلامة (اختياري)</p>
          <textarea
            id="swal-bookmark-note"
            class="swal2-textarea"
            placeholder="اكتب ملاحظتك هنا... (مثال: راجع هذه الآية للتدبر)"
            rows="3"
            maxlength="300"
            style="width:100%;font-family:'Amiri',serif;font-size:1rem;direction:rtl;text-align:right;resize:none;border:1px solid #dee2e6;border-radius:8px;padding:10px;outline:none;"
          ></textarea>
          <div class="text-muted small text-start mt-1" id="swal-note-counter">0 / 300</div>
        `,
        confirmButtonText: 'حفظ العلامة 🔖',
        cancelButtonText: 'إلغاء',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        focusConfirm: false,
        didOpen: () => {
          const textarea = document.getElementById('swal-bookmark-note');
          const counter  = document.getElementById('swal-note-counter');
          if (textarea && counter) {
            textarea.addEventListener('input', () => { counter.textContent = `${textarea.value.length} / 300`; });
            textarea.focus();
          }
        },
        preConfirm: () => {
          const textarea = document.getElementById('swal-bookmark-note');
          return textarea ? textarea.value.trim() : '';
        }
      });

      if (!isConfirmed) return;

      const payload = { surahNumber: surah, ayahNumber: ayah };
      if (note) payload.note = note;

      const res = await axios.post('/api/v1/bookmarks', payload);
      if (res.data.message === 'added') {
        iconElement.classList.replace('far', 'fas');
        iconElement.style.color = '#d4af37';
        invalidateBookmarksCache(); // ✅ امسح الكاش
        const msg = note ? 'تم حفظ العلامة مع ملاحظتك 🔖✨' : 'تم حفظ العلامة المرجعية 🔖';
        showAlert('success', msg);
      }
    }
  } catch (err) {
    console.error("Bookmark Error:", err);
    if (err.response && err.response.status === 401) requireLogin('حفظ العلامات المرجعية في المصحف الشريف');
    else showAlert('error', 'حدث خطأ غير متوقع أثناء حفظ العلامة.');
  }
}

// ✅ updateKhatmahProgress
export async function updateKhatmahProgress(surah, ayah) {
  if (!isUserLoggedIn()) {
    requireLogin('تتبع الختمة وحفظ التقدم');
    return;
  }

  try {
    let pageToSave = window.currentPage || 1;
    if (pageToSave === 1) {
      pageToSave = surahStartPages[parseInt(surah)] || 1;
    }
    const res = await axios.patch('/api/v1/khatmah', { surah, ayah, page: pageToSave });
    
    if (res.data.status === 'success') {
      
      // 1️⃣ حفظ أحدث موضع للختمة في كاش منفصل تماماً عن كاش الصفحة
      await localforage.setItem('latest_khatmah', { currentSurah: surah, currentAyah: ayah });

      // 2️⃣ إطفاء العلامة القديمة من كل الشاشة
      document.querySelectorAll('.khatmah-icon-btn').forEach(btn => {
        btn.classList.remove('fas', 'khatmah-active-pulse');
        btn.classList.add('far');
        btn.style.color = '#28a745';
        btn.title = 'تحديث الختمة هنا';
      });

      // 3️⃣ تنوير العلامة الجديدة اللي المستخدم ضغط عليها
      const newActiveBtn = document.querySelector(`.khatmah-icon-btn[data-surah="${surah}"][data-ayah="${ayah}"]`);
      if (newActiveBtn) {
        newActiveBtn.classList.remove('far');
        newActiveBtn.classList.add('fas', 'khatmah-active-pulse');
        newActiveBtn.style.color = '#198754';
        newActiveBtn.title = 'أنت تتوقف هنا';
      }

      showAlert('success', 'تم تحديث موقع الختمة! 🚩');

      // تحديث شريط التقدم
      const progressBar = document.getElementById('progress-bar');
      if (progressBar) {
        const newProgress = Math.round((parseInt(surah) / 114) * 100);
        progressBar.style.width = `${newProgress}%`;
        progressBar.innerText = `${newProgress}%`;
      }

      const dailyTarget = document.getElementById('daily-target');
      if (dailyTarget) {
        const targetMsg = (res.data.data && res.data.data.message) || "واصل تقدمك ✨";
        dailyTarget.innerText = targetMsg;
        dailyTarget.style.color = ""; 
        dailyTarget.classList.remove('text-danger'); 
      }

      const statusText = document.getElementById('khatmah-status-text');
      if (statusText) {
        const sIdx = parseInt(surah) - 1;
        const surahName = surahNames[sIdx] || `سورة رقم ${surah}`; 
        statusText.innerHTML = `أنت متوقف عند <strong>سورة ${surahName}</strong> - آية <strong>${ayah}</strong>`;
      }
    }
  } catch (err) { 
    console.error("❌ خطأ في التحديث:", err);
    if (err.response && err.response.status === 401) {
      requireLogin('تتبع الختمة وحفظ التقدم');
    } else {
      showAlert('error', 'حدث خطأ، يرجى المحاولة مرة أخرى.'); 
    }
  }
}

export async function loadBookmarks() {
  try {
    if (!isUserLoggedIn()) {
      const container = document.getElementById('bookmarks-container');
      if (container) {
        container.innerHTML = `
          <div class="col-12">
            <div class="text-center py-5">
              <i class="fas fa-lock fa-4x text-muted mb-4"></i>
              <h4 class="text-muted mb-3">يجب تسجيل الدخول أولاً</h4>
              <p class="text-muted mb-4">سجّل دخولك لتتمكن من رؤية علاماتك المرجعية المحفوظة</p>
              <button class="btn btn-success btn-lg px-5" onclick="window.showSection('login')">
                <i class="fas fa-sign-in-alt me-2"></i> تسجيل الدخول
              </button>
              <br>
              <a href="#" class="text-muted small mt-3 d-inline-block" onclick="window.showSection('signup')">
                ليس لديك حساب؟ أنشئ حساباً الآن
              </a>
            </div>
          </div>`;
      }
      return;
    }

    const container = document.getElementById('bookmarks-container');
    if (!container) return;
    
    // إظهار رسالة تحميل بسيطة لحد ما الداتا تيجي
    container.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-success"></div></div>';

    let bookmarks = [];

    // ✅ منطق الأوفلاين والأونلاين
    if (navigator.onLine) {
      try {
        // محاولة جلب أحدث العلامات من السيرفر
        const res = await axios.get('/api/v1/bookmarks');
        bookmarks = res.data.data.bookmarks;
        // حفظ العلامات المرجعية في الكاش للأوفلاين
        await localforage.setItem('offline_bookmarks', bookmarks);
        console.log('🌐 [API] تم جلب العلامات المرجعية من السيرفر وحفظها محلياً');
      } catch (apiErr) {
        // لو حصل خطأ في الاتصال بالسيرفر رغم وجود إنترنت، نستخدم الكاش
        console.warn('⚠️ فشل الاتصال بالسيرفر، جاري جلب العلامات من الكاش');
        bookmarks = await localforage.getItem('offline_bookmarks') || [];
      }
    } else {
      // ✅ لو مفيش نت نهائياً، نجيب من الكاش مباشرة
      console.log('⚡ [OFFLINE] تم تحميل العلامات المرجعية من الكاش');
      bookmarks = await localforage.getItem('offline_bookmarks') || [];
    }

    container.innerHTML = '';

    if (bookmarks.length === 0) {
      container.innerHTML = `<div class="text-center py-5"><i class="far fa-bookmark fa-4x text-muted mb-3"></i><p class="lead">لا توجد علامات محفوظة حالياً</p><a href="/quran" class="btn btn-success">اذهب للمصحف واحفظ أول علامة</a></div>`;
      return;
    }

    bookmarks.forEach(b => {
      const surahNum  = parseInt(b.surah);
      let targetPage  = b.page ? parseInt(b.page) : null;
      if (!targetPage || isNaN(targetPage)) targetPage = surahStartPages[surahNum] || 1;

      const noteHTML = b.note
        ? `<div class="mt-2 p-2 rounded bookmark-note-box">
             <small class="note-text"><i class="fas fa-sticky-note me-1 text-success"></i>${b.note}</small>
           </div>`
        : '';

      const html = `
        <div class="col-md-6 mb-3">
          <div class="card shadow-sm border-start border-success border-4 h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <h5 class="card-title text-success">${b.surahName}</h5>
                <button class="btn btn-sm btn-outline-danger delete-bookmark-btn" data-id="${b._id}" ${!navigator.onLine ? 'disabled title="تحتاج للإنترنت لحذف العلامة"' : ''}>
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              <p class="ayah-text text-dark mt-2" style="font-family: 'Amiri'; font-size: 1.2rem;">${b.ayahText}</p>
              ${noteHTML}
              <div class="mt-3 d-flex justify-content-between align-items-center">
                <span class="badge bg-light text-dark">آية رقم: ${b.ayah}</span>
                <button class="btn btn-sm btn-success"
                  onclick="window.showSection('quran'); window.loadQuranPage(${targetPage}, ${surahNum}, ${parseInt(b.ayah)});">
                  <i class="fas fa-book-open me-1"></i> انتقل للآية
                </button>
              </div>
            </div>
          </div>
        </div>`;
      container.insertAdjacentHTML('beforeend', html);
    });
  } catch (err) {
    console.error("خطأ عام في عرض العلامات:", err);
    if (err.response && err.response.status === 401) {
      const container = document.getElementById('bookmarks-container');
      if (container) {
        container.innerHTML = `
          <div class="col-12">
            <div class="text-center py-5">
              <i class="fas fa-lock fa-4x text-muted mb-4"></i>
              <h4 class="text-muted mb-3">انتهت الجلسة</h4>
              <p class="text-muted mb-4">يرجى تسجيل الدخول مرة أخرى لرؤية علاماتك.</p>
              <button class="btn btn-success btn-lg px-5" onclick="window.showSection('login')">
                <i class="fas fa-sign-in-alt me-2"></i> تسجيل الدخول
              </button>
            </div>
          </div>`;
      }
    }
  }
}

export async function deleteBookmark(id) {
  try {
    await axios.delete(`/api/v1/bookmarks/${id}`);
    invalidateBookmarksCache(); // ✅ امسح الكاش بعد الحذف
    showAlert('success', 'تم الحذف بنجاح');
    loadBookmarks();
  } catch (err) { showAlert('error', 'فشل الحذف'); }
}

export const scheduleDailyWird = async (khatmahName) => {
  try {
    try { await LocalNotifications.cancel({ notifications: [{ id: 999 }] }); } catch(e) {}

    const now              = new Date();
    const notificationTime = new Date();
    notificationTime.setHours(21, 0, 0, 0);
    notificationTime.setMilliseconds(0);
    if (notificationTime <= now) notificationTime.setDate(notificationTime.getDate() + 1);

    console.log(`📖 [KHATMAH] جدول تذكير الورد: ${notificationTime.toLocaleString('ar-EG')}`);

    await LocalNotifications.schedule({
      notifications: [{
        title: "وقت الورد اليومي 📖",
        body: `لا تنسَ قراءة وردك من ختمة "${khatmahName}" اليوم`,
        id: 999,
        schedule: { at: notificationTime, every: 'day', allowWhileIdle: true },
        channelId: 'khatmah-channel',
        smallIcon: 'ic_notification',
        actionTypeId: "OPEN_KHATMAH"
      }]
    });
    console.log('✅ تم جدولة تذكير الورد اليومي الساعة 9 مساءً بنجاح');
  } catch (error) { console.error('❌ خطأ في جدولة الورد:', error); }
};

// ✅ في ملف feature.js - تعديل دالة manageKhatmah
export async function manageKhatmah() {
  try {
    const activeDiv = document.getElementById('active-khatmah');
    const createDiv = document.getElementById('create-khatmah');
    const kNameEl = document.getElementById('khatmah-name');
    const kTargetEl = document.getElementById('daily-target');
    const statusText = document.getElementById('khatmah-status-text');
    const progressBar = document.getElementById('progress-bar');
    const surahSelect = document.getElementById('currentSurah');
    const currentAyahInput = document.getElementById('currentAyah');

    let k = null;

    if (navigator.onLine) {
        // لو في إنترنت، هاتها من السيرفر
        const res = await axios.get('/api/v1/khatmah');
        k = res.data.data.khatmah;
        
        // حفظها محلياً للأوفلاين
        await localforage.setItem('latest_khatmah', { currentSurah: k.currentSurah, currentAyah: k.currentAyah });
        await localforage.setItem('khatmah_meta', { name: k.name, targetMsg: res.data.data.message || "واصل تقدمك لختم القرآن الكريم ✨" });
    } else {
        // لو مفيش إنترنت، هاتها من الـ Offline Cache
        const offlineKhatmah = await localforage.getItem('latest_khatmah');
        const offlineMeta = await localforage.getItem('khatmah_meta');
        
        if (offlineKhatmah) {
             k = { 
                currentSurah: offlineKhatmah.currentSurah, 
                currentAyah: offlineKhatmah.currentAyah,
                name: offlineMeta ? offlineMeta.name : 'ختمتي الحالية'
            };
            if(kTargetEl && offlineMeta) kTargetEl.innerText = offlineMeta.targetMsg;
             console.log("⚡ [OFFLINE] تم تحميل الختمة من الجهاز");
        }
    }

    if (!k) {
        throw new Error("No active khatmah found");
    }

    if (activeDiv) activeDiv.classList.remove('d-none');
    if (createDiv) createDiv.classList.add('d-none'); 

    if (kNameEl) kNameEl.innerText = k.name;
    
    const sIdx = parseInt(k.currentSurah) - 1;
    const surahName = surahNames[sIdx] || `سورة ${k.currentSurah}`;
    
    if (statusText) {
      statusText.innerHTML = `أنت متوقف عند <strong>سورة ${surahName}</strong> - آية <strong>${k.currentAyah}</strong>`;
    }
    
    if (surahSelect) surahSelect.value = k.currentSurah;
    if (currentAyahInput) currentAyahInput.value = k.currentAyah;
    
    const progress = Math.round((parseInt(k.currentSurah) / 114) * 100);
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
      progressBar.innerText = `${progress}%`;
    }

    if (Capacitor.isNativePlatform() && k.name) {
      await scheduleDailyWird(k.name);
    }

  } catch (err) {
      // لو فشل تماماً ومفيش حاجة في الكاش
      const activeDiv = document.getElementById('active-khatmah');
      const createDiv = document.getElementById('create-khatmah');
      if (activeDiv) activeDiv.classList.add('d-none');
      if (createDiv) createDiv.classList.remove('d-none');
  }
}

export async function createKhatmah(name, durationDays) {
  try {
    const res = await axios.post('/api/v1/khatmah', { name, durationDays });
    if (res.data.status === 'success') await manageKhatmah();
  } catch (err) { showAlert('error', err.response.data.message); }
}

export async function deleteKhatmah() {
  try {
    const res = await axios.delete('/api/v1/khatmah');
    if (res.status === 204) {
      showAlert('success', 'تم إلغاء الختمة بنجاح 🗑️');
      const activeDiv = document.getElementById('active-khatmah');
      const createDiv = document.getElementById('create-khatmah');
      if (activeDiv) activeDiv.classList.add('d-none');
      if (createDiv) createDiv.classList.remove('d-none');
      const statusText = document.getElementById('khatmah-status-text');
      if (statusText) statusText.innerText = '';
    }
  } catch (err) { showAlert('error', 'فشل إلغاء الختمة'); }
}

let currentAudio = null;
let currentBtn   = null;

window.playCorrectAudio = function(surah, ayah, btnElement) {
  const s        = String(surah).padStart(3, '0');
  const a        = String(ayah).padStart(3, '0');
  const audioUrl = `https://everyayah.com/data/Minshawy_Murattal_128kbps/${s}${a}.mp3`;

  if (currentAudio && !currentAudio.paused && currentBtn === btnElement) {
    currentAudio.pause();
    btnElement.classList.remove('fa-stop-circle', 'text-danger');
    btnElement.classList.add('fa-volume-up', 'text-primary');
    return;
  }

  if (currentAudio) {
    currentAudio.pause(); currentAudio.currentTime = 0;
    if (currentBtn) { currentBtn.classList.remove('fa-stop-circle', 'text-danger'); currentBtn.classList.add('fa-volume-up', 'text-primary'); }
  }

  currentAudio = new Audio(audioUrl); currentBtn = btnElement;
  currentAudio.play();
  btnElement.classList.remove('fa-volume-up', 'text-primary');
  btnElement.classList.add('fa-stop-circle', 'text-danger');

  currentAudio.onended = function() {
    btnElement.classList.remove('fa-stop-circle', 'text-danger');
    btnElement.classList.add('fa-volume-up', 'text-primary');
    currentAudio = null; currentBtn = null;
  };
  currentAudio.onerror = function() {
    alert("عذراً، ملف الصوت غير متاح حالياً");
    btnElement.classList.remove('fa-stop-circle', 'text-danger');
    btnElement.classList.add('fa-volume-up', 'text-primary');
  };
};

export async function checkRecitation(file, surah, startAyah, endAyah, userAudioUrl) {
  const formData = new FormData();
  formData.append('audio', file);
  formData.append('surah', surah);
  if (startAyah) formData.append('startAyah', startAyah);
  if (endAyah)   formData.append('endAyah', endAyah);

  try {
    const feedbackElem = document.getElementById('ai-feedback');
    feedbackElem.innerHTML = `<div class="py-5 text-center"><div class="spinner-border text-success mb-3"></div><p>جارى تصحيح التلاوه..</p></div>`;
    document.getElementById('result-container').classList.remove('d-none');

    const res  = await axios.post('/api/v1/quran/check-recitation', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    const { analysis, score } = res.data;

    let resultHTML = `
      <div class="mb-4 text-center">
        <h3 class="fw-bold">دقة التلاوة: ${score}%</h3>
        <div class="progress mx-auto mb-3" style="height: 12px; width: 70%; border-radius: 10px;">
          <div class="progress-bar bg-success" style="width: ${score}%"></div>
        </div>
        <div class="audio-playback-container p-3 bg-light rounded-pill d-inline-block shadow-sm mb-3">
          <p class="small text-success fw-bold mb-2"><i class="fas fa-play-circle me-1"></i> استمع إلى تلاوتك:</p>
          <audio controls src="${userAudioUrl}" class="custom-audio-player" style="height: 35px; width: 100%;"></audio>
        </div>
        <div id="volume-control-ai" class="d-none mt-3 text-center">
          <label class="form-label fw-bold text-muted small"><i class="fas fa-volume-up me-1"></i> مستوى الصوت</label>
          <input type="range" class="form-range" id="volume-slider-ai" min="0" max="1" step="0.1" value="1" style="width: 200px; accent-color: #198754;">
        </div>
      </div>
      <div class="ai-result-box p-3 bg-white border rounded shadow-sm mb-4">
    `;

    analysis.forEach(item => {
      if (item.status === 'ayah_marker') {
        resultHTML += `
          <div class="ayah-marker-wrapper d-inline-flex align-items-center align-middle">
            <span class="ayah-circle">${item.text}</span>
            <i class="fas fa-volume-up text-primary ms-1 listen-icon"
               onclick="window.playCorrectAudio(${item.surah}, ${item.ayah}, this)"
               style="cursor: pointer; font-size: 1rem;" title="استمع للنطق الصحيح"></i>
          </div>`;
      } else {
        const className = item.status === 'Correct' ? 'word-correct' : (item.status === 'missing' ? 'word-missing' : 'word-wrong');
        resultHTML += `<span class="${className}">${item.text}</span>`;
      }
    });

    resultHTML += `</div><div class="text-center"><button id="btn-retry" class="btn btn-success px-5">محاولة جديدة</button></div>`;
    feedbackElem.innerHTML = resultHTML;
    document.getElementById('btn-retry').addEventListener('click', () => resetRecitationUI());

  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      requireLogin('تصحيح التلاوة');
      setTimeout(() => { window.showSection('login'); }, 1500);
    } else {
      showAlert('error', 'عذراً، تعذر الاتصال بالشبكة. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.');
    }
    document.getElementById('result-container').classList.add('d-none');
  }
}

function resetRecitationUI() {
  const feedbackElem    = document.getElementById('ai-feedback');
  const resultContainer = document.getElementById('result-container');
  feedbackElem.innerHTML = '';
  resultContainer.classList.add('d-none');
  const audioPlayer = document.querySelector('audio');
  if (audioPlayer) { audioPlayer.pause(); audioPlayer.src = ''; }
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) fileInput.value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export async function loadReciters() {
  try {
    const res = await axios.get('/api/v1/audio/reciters');
    const container = document.getElementById('reciters-container');
    if (!container) return;
    container.innerHTML = '';

    const recitersList = res.data.data.reciters;
    if (!recitersList || recitersList.length === 0) {
      container.innerHTML = '<p class="text-center">لا يوجد قراء متاحون حالياً.</p>';
      return;
    }

    const reciterSurahNames = ["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الإنفطار","المطففين","الإنشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"];
    const reciterNamesAr = { "Mishary Rashid Alafasy": "مشاري راشد العفاسي", "Maher Al Muaiqly": "ماهر المعيقلي", "Mahmoud Khalil Al-Hussary": "محمود خليل الحصري", "Saud Al-Shuraim": "سعود الشريم", "Abdelbasset Abdessamad": "عبد الباسط عبد الصمد" };
    
    const reciterImages = {
      "Mishary Rashid Alafasy": "/img/reciters/mishary.jpg",
      "Maher Al Muaiqly": "/img/reciters/maher.jpg",
      "Mahmoud Khalil Al-Hussary": "/img/reciters/hussary.jpg",
      "Saud Al-Shuraim": "/img/reciters/shuraim.jpg",
      "Abdelbasset Abdessamad": "/img/reciters/abdelbasset.jpg"
    };

    let optionsHTML = '';
    reciterSurahNames.forEach((name, index) => { optionsHTML += `<option value="${index + 1}">${index + 1}. ${name}</option>`; });

    recitersList.forEach(reciter => {
      const displayName = reciterNamesAr[reciter.name] || reciter.name;
      const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=198754&color=fff&size=128&font-size=0.33`;
      const imageUrl = reciterImages[reciter.name] || fallbackImage;
      const serverUrl = reciter.server.endsWith('/') ? reciter.server.slice(0, -1) : reciter.server;
      
      container.insertAdjacentHTML('beforeend', `
        <div class="col-md-4 col-sm-6">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body text-center">
              <div class="mb-3">
                <img src="${imageUrl}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackImage}';" alt="${displayName}" class="rounded-circle shadow-sm" style="width: 100px; height: 100px; object-fit: cover; border: 3px solid #198754;">
              </div>
              <h5 class="card-title fw-bold text-dark">${displayName}</h5>
              <p class="small text-muted mb-3">رواية حفص عن عاصم</p>
              <div class="form-group mb-3">
                <select class="form-select surah-select" style="font-family: 'Amiri'" data-server="${serverUrl}">${optionsHTML}</select>
              </div>
              
              <audio controls class="w-100 mt-2 quran-player" preload="none" data-url="${serverUrl}/001.mp3"></audio>
              
              <button class="btn btn-sm btn-outline-secondary mt-2 download-audio-btn" onclick="window.downloadAudioOffline('${serverUrl}/001.mp3', this)">
                  <i class="fas fa-download"></i> حفظ للاستماع أوفلاين
              </button>
            </div>
          </div>
        </div>`);
    });

    // 🚀 التحديث الديناميكي لرابط التحميل عند تغيير السورة
    document.querySelectorAll('.surah-select').forEach(select => {
      select.addEventListener('change', function() {
        const paddedSurah = this.value.toString().padStart(3, '0');
        const cardBody = this.parentElement.parentElement;
        const newUrl = `${this.dataset.server}/${paddedSurah}.mp3`;
        
        const audioPlayer = cardBody.querySelector('audio');
        if (audioPlayer) { 
            audioPlayer.dataset.url = newUrl; // تحديث الرابط فقط دون تشغيل
            audioPlayer.src = ''; // تصفير المشغل
        }
        
        const downloadBtn = cardBody.querySelector('.download-audio-btn');
        if (downloadBtn) {
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> حفظ للاستماع أوفلاين';
            downloadBtn.disabled = false;
            downloadBtn.setAttribute('onclick', `window.downloadAudioOffline('${newUrl}', this)`);
            caches.open('quran-audio-cache-v1').then(cache => {
                cache.match(newUrl).then(response => {
                    if(response) downloadBtn.innerHTML = '<i class="fas fa-check text-success"></i> محفوظة أوفلاين';
                });
            });
        }
      });
    });

    // 🚀 السحر الحقيقي: اعتراض زر الـ Play لقراءة الكاش أوفلاين
    document.querySelectorAll('.quran-player').forEach(player => {
        player.addEventListener('play', async function(e) {
            // إيقاف أي مقطع آخر يعمل
            document.querySelectorAll('audio').forEach(a => { if (a !== this) a.pause(); });

            const targetUrl = this.dataset.url;
            
            // إذا كان المشغل لا يحتوي على الملف بعد
            if (this.src !== targetUrl && !this.src.startsWith('blob:')) {
                e.preventDefault(); // إيقاف التشغيل مؤقتاً
                this.pause();
                
                try {
                    const cache = await caches.open('quran-audio-cache-v1');
                    const cachedRes = await cache.match(targetUrl);
                    
                    if (cachedRes) {
                        // 🟢 السورة موجودة في الجهاز: تشغيل فوري أوفلاين!
                        const blob = await cachedRes.blob();
                        this.src = URL.createObjectURL(blob);
                        this.play();
                    } else {
                        // 🔴 السورة غير موجودة
                        if (!navigator.onLine) {
                            Swal.fire('تنبيه', 'أنت غير متصل بالإنترنت، وهذه السورة لم تقم بحفظها مسبقاً للاستماع أوفلاين.', 'warning');
                            return;
                        }
                        // 🌐 تشغيل من الإنترنت
                        this.src = targetUrl;
                        this.play();
                    }
                } catch(err) {
                    console.error("Audio Play Error:", err);
                }
            }
        });
    });

  } catch (err) {
    console.error("Error loading reciters:", err);
    const container = document.getElementById('reciters-container');
    if (container) container.innerHTML = '<p class="text-danger text-center">حدث خطأ في تحميل القراء.</p>';
  }
}

// دالة التحميل (كما هي في كودك تماماً)
window.downloadAudioOffline = async (url, buttonElement) => {
    try {
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
        buttonElement.disabled = true;

        const audioCache = await caches.open('quran-audio-cache-v1');
        
        const existingResponse = await audioCache.match(url);
        if (existingResponse) {
            Swal.fire('موجود مسبقاً', 'هذه السورة محفوظة بالفعل في جهازك للاستماع بدون إنترنت!', 'info');
            buttonElement.innerHTML = '<i class="fas fa-check text-success"></i> محفوظة أوفلاين';
            return;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');

        await audioCache.put(url, response.clone());

        buttonElement.innerHTML = '<i class="fas fa-check text-success"></i> محفوظة أوفلاين';
        Swal.fire({
            toast: true,
            position: 'bottom-end',
            icon: 'success',
            title: 'تم حفظ السورة بنجاح للعمل أوفلاين ✅',
            showConfirmButton: false,
            timer: 3000
        });

    } catch (err) {
        console.error('Audio download error:', err);
        buttonElement.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> فشل، أعد المحاولة';
        buttonElement.disabled = false;
        Swal.fire('خطأ', 'فشل تحميل السورة، تأكد من اتصالك بالإنترنت.', 'error');
    }
};

export const scheduleAllPrayers = async (prayerTimes) => {
  try {
    try { await LocalNotifications.cancel({ notifications: [{ id: 101 }, { id: 102 }, { id: 103 }, { id: 104 }, { id: 105 }] }); } catch(e) {}

    console.log('📋 [PRAYERS RAW]', JSON.stringify(prayerTimes));

    const notifications = [];
    const targetPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const prayerNamesAr = { 'Fajr': 'الفجر', 'Dhuhr': 'الظهر', 'Asr': 'العصر', 'Maghrib': 'المغرب', 'Isha': 'العشاء' };
    const prayerIds     = { 'Fajr': 101, 'Dhuhr': 102, 'Asr': 103, 'Maghrib': 104, 'Isha': 105 };

    targetPrayers.forEach((key) => {
      const timeStr = prayerTimes[key];
      if (!timeStr) return;

      const cleanTime = timeStr.trim();
      const isPM      = cleanTime.toUpperCase().includes('PM');
      const isAM      = cleanTime.toUpperCase().includes('AM');
      const parts     = cleanTime.split(' ')[0].split(':');
      if (parts.length < 2) return;

      let hours   = parseInt(parts[0], 10);
      let minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return;

      if (isPM && hours !== 12) hours += 12;
      if (isAM && hours === 12) hours  = 0;

      const nowRef     = new Date();
      const prayerDate = new Date(nowRef.getFullYear(), nowRef.getMonth(), nowRef.getDate(), hours, minutes, 0, 0);

      if (prayerDate <= nowRef) {
        prayerDate.setDate(prayerDate.getDate() + 1);
        console.log(`⏭️ [${key}] وقت فات - مجدول بكرة: ${prayerDate.toLocaleString('ar-EG')}`);
      } else {
        console.log(`✅ [${key}] مجدول النهارده: ${prayerDate.toLocaleString('ar-EG')}`);
      }

      notifications.push({
        title: `حان موعد صلاة ${prayerNamesAr[key]} 🕌`,
        body: `أرحنا بها يا بلال.. حان وقت صلاة ${prayerNamesAr[key]}`,
        id: prayerIds[key],
        schedule: { at: prayerDate, allowWhileIdle: true },
        channelId: 'azan-channel',
        smallIcon: 'ic_notification',
        sound: 'azan_short.mp3',
        actionTypeId: 'OPEN_PRAYERS',
      });
    });

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log(`✅ تم جدولة ${notifications.length} إشعارات صلاة بنجاح`);
    }
  } catch (error) { console.error('❌ خطأ في جدولة إشعارات الصلاة:', error); }
};

export function loadPrayers() {
  const container  = document.getElementById('prayers-list');
  const locationEl = document.getElementById('location-name');
  const hijriEl    = document.getElementById('hijri-date');

  if (locationEl) locationEl.innerText = 'جارى تحديد موقعك...';

  // ─── دالة استرجاع المواقيت المحفوظة محلياً ───
  const renderOfflinePrayers = async () => {
    try {
      const cachedData = await localforage.getItem('offline_prayers');
      if (cachedData && cachedData.timings) {
        if (locationEl) locationEl.innerText = `${cachedData.cityName} (محدثة)`;
        if (hijriEl) hijriEl.innerText = cachedData.hijri;
        if (container) {
          container.innerHTML = '';
          const prayerNamesAr = { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
          for (const [key, value] of Object.entries(cachedData.timings)) {
            container.insertAdjacentHTML('beforeend', `
              <div class="list-group-item d-flex justify-content-between align-items-center">
                <span class="fw-bold text-muted">${prayerNamesAr[key] || key}</span>
                <span class="badge bg-secondary rounded-pill" style="font-family: sans-serif">${value}</span>
              </div>`);
          }
          // رسالة صغيرة توضح أن هذه البيانات محفوظة
          container.insertAdjacentHTML('beforeend', `
            <div class="w-100 text-center mt-2">
               <small class="text-muted"><i class="fas fa-history me-1"></i> تم عرض آخر مواقيت محفوظة لعدم توفر الإنترنت</small>
            </div>
          `);
        }
        return true; // نجح العرض من الكاش
      }
    } catch (e) { console.warn("خطأ في جلب المواقيت من الكاش", e); }
    return false; // فشل العرض من الكاش (لا توجد بيانات)
  };

  // ─── دالة إظهار رسالة الخطأ النهائية ───
  const showOfflineMessage = async () => {
    // نحاول أولاً عرض البيانات المحفوظة، إذا لم نجدها نعرض رسالة الخطأ
    const isCached = await renderOfflinePrayers();
    if (!isCached) {
        if (locationEl) locationEl.innerText = 'مواقيت الصلاة';
        if (hijriEl) hijriEl.innerText = '';
        if (container) {
          container.innerHTML = `
            <div class="col-12">
              <div class="alert alert-warning text-center py-3 mb-0" style="border-radius:12px;">
                <i class="fas fa-wifi-slash fa-2x mb-2 d-block text-warning"></i>
                <p class="mb-1 fw-bold">لا يمكن تحميل مواقيت الصلاة</p>
                <p class="mb-0 small text-muted">تحقق من اتصالك بالإنترنت وسيتم العرض تلقائياً</p>
              </div>
            </div>`;
        }
    }
  };

  if (!navigator.geolocation) { showOfflineMessage(); return; }

  // ─── جلب الموقع من الهاتف ───
  navigator.geolocation.getCurrentPosition(
    async position => {
      // ⛔ إذا لم يكن هناك إنترنت، لا نحاول الاتصال بالسيرفر، نلجأ للكاش فوراً
      if (!navigator.onLine) {
         await showOfflineMessage();
         return;
      }

      try {
        const { latitude, longitude } = position.coords;
        const res     = await axios.get(`/api/v1/prayers?lat=${latitude}&lng=${longitude}`);
        const timings = res.data.data.timings;
        const hijri   = res.data.data.hijri;
        if (!container) return;

        if (hijriEl) hijriEl.innerText = hijri;

        let cityName = 'موقعك الحالي';
        try {
          const cityRes  = await axios.get(`/api/v1/prayers/get-location?lat=${latitude}&lon=${longitude}`);
          const address  = cityRes.data.data.address;
          cityName = address.city || address.town || address.village || address.state || 'موقعك الحالي';
          if (locationEl) locationEl.innerText = `مواقيت الصلاة في ${cityName}`;
        } catch { if (locationEl) locationEl.innerText = 'مواقيت الصلاة حسب موقعك الحالي'; }

        container.innerHTML = '';
        const prayerNamesAr = { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };

        for (const [key, value] of Object.entries(timings)) {
          container.insertAdjacentHTML('beforeend', `
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <span class="fw-bold">${prayerNamesAr[key] || key}</span>
              <span class="badge bg-success rounded-pill" style="font-family: sans-serif">${value}</span>
            </div>`);
        }

        // ✅ حفظ البيانات محلياً للرجوع إليها عند انقطاع الإنترنت
        await localforage.setItem('offline_prayers', {
            timings: timings,
            hijri: hijri,
            cityName: cityName,
            savedAt: Date.now()
        });

        if (Capacitor.isNativePlatform()) {
          try { await scheduleAllPrayers(timings); console.log('Prayer notifications updated successfully'); }
          catch (notifyErr) { console.error('Failed to schedule notifications:', notifyErr); }
        }

      } catch (err) { 
          console.error('فشل جلب مواقيت الصلاة:', err); 
          await showOfflineMessage(); 
      }
    },
    async (geoErr) => {
      console.warn('Geolocation error:', geoErr.message);
      if (geoErr.code === 1) {
        Swal.fire({
          icon: 'info', title: '📍 نحتاج إذن الموقع',
          html: `<p class="mb-2">لعرض مواقيت الصلاة في مدينتك، نحتاج إذنك للوصول للموقع</p><p class="text-muted small mb-0"><i class="fas fa-lock me-1"></i> لتفعيله: إعدادات المتصفح ← الموقع ← السماح</p>`,
          confirmButtonText: 'حسناً', confirmButtonColor: '#198754',
        });
      }
      await showOfflineMessage();
    },
    { timeout: 10000, maximumAge: 300000 }
  );
}

export const initBookmarksSearch = () => {
  const searchInput = document.getElementById('bookmarks-search-input');
  if (!searchInput) return;
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    document.querySelectorAll('#bookmarks-container .col-md-6').forEach(card => {
      card.style.display = card.innerText.toLowerCase().includes(query) ? '' : 'none';
    });
  });
};

export const initSearch = () => {
  const searchInput      = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');
  if (!searchInput || !resultsContainer) return;

  let timeoutId;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) { resultsContainer.classList.add('d-none'); resultsContainer.innerHTML = ''; return; }

    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      try {
        resultsContainer.innerHTML = '<div class="list-group-item text-center">جاري البحث...</div>';
        resultsContainer.classList.remove('d-none');

        const res   = await axios.get(`/api/v1/quran/search?q=${query}`);
        const ayahs = res.data.data.ayahs;
        resultsContainer.innerHTML = '';

        if (ayahs.length === 0) { resultsContainer.innerHTML = '<div class="list-group-item text-center text-muted">لا توجد نتائج</div>'; return; }

        ayahs.forEach(ayah => {
          const item        = document.createElement('a');
          item.className    = 'list-group-item list-group-item-action';
          item.style.cursor = 'pointer';
          const realAyahNum = ayah.ayahNumber || ayah.numberInSurah;

          item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-bold text-success small">${ayah.surahNameAr} - آية ${realAyahNum}</span>
              <span class="badge bg-light text-dark border">ص ${ayah.page}</span>
            </div>
            <p class="mb-0 mt-1 small text-muted text-end" style="font-family: 'Amiri'; font-size: 1.1em;">${ayah.text.substring(0, 60)}...</p>
          `;

          item.addEventListener('click', (e) => {
            e.preventDefault();
            resultsContainer.classList.add('d-none');
            searchInput.value = '';
            document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
            const quranSection = document.getElementById('quran-section');
            if (quranSection) quranSection.classList.remove('d-none');
            window.scrollTo(0, 0);
            window.history.pushState({ section: 'quran' }, '', `/quran/${ayah.page}`);
            if (window.loadQuranPage) window.loadQuranPage(ayah.page, ayah.surahNumber, ayah.ayahNumber || ayah.numberInSurah);
            else loadQuranPage(ayah.page, ayah.surahNumber, ayah.ayahNumber || ayah.numberInSurah);
          });

          resultsContainer.appendChild(item);
        });

      } catch (err) {
        console.error(err);
        resultsContainer.innerHTML = '<div class="list-group-item text-danger text-center">حدث خطأ في البحث</div>';
      }
    }, 500);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.classList.add('d-none');
    }
  });
};