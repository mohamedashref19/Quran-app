/* eslint-disable */
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

// ─── بيانات الأجزاء والأحزاب ─────────────────────────────────────────────────
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

const getSurahByPage = (pageNum) => {
  const surahPageMap = [
    1,2,50,77,106,128,151,177,187,208,221,235,249,255,262,267,282,293,305,312,
    322,332,342,350,359,367,377,385,396,404,411,415,418,428,434,440,446,453,458,467,
    477,483,489,496,499,502,507,511,515,518,520,523,526,528,531,534,537,542,545,549,
    551,553,554,556,558,560,562,564,566,568,570,572,574,575,577,578,580,582,583,585,
    586,587,587,589,590,591,591,592,593,594,595,596,596,597,597,598,598,599,599,600,
    600,601,601,601,602,602,602,603,603,603,604,604,604,604
  ];
  let idx = 0;
  for (let i = 0; i < surahPageMap.length; i++) {
    if (surahPageMap[i] <= pageNum) idx = i; else break;
  }
  return { index: idx, name: surahNames[idx] };
};

//Login function Help
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
  words1.forEach(word => {
    if (words2.has(word)) commonCount++;
  });
  return commonCount / Math.max(words1.size, words2.size);
};


function updateNavButtons() {
  const nextBtn = document.getElementById('next-surah-btn'); 
  const prevBtn = document.getElementById('prev-surah-btn');

  if (nextBtn) {
    if (currentPage < 604) {
      nextBtn.classList.remove('d-none');
      nextBtn.onclick = () => loadQuranPage(currentPage + 1);
    } else {
      nextBtn.classList.add('d-none');
    }
  }

  if (prevBtn) {
    if (currentPage > 1) {
      prevBtn.classList.remove('d-none');
      prevBtn.onclick = () => loadQuranPage(currentPage - 1);
    } else {
      prevBtn.classList.add('d-none');
    }
  }
}


export async function loadQuranPage(pageNumber, targetSurah = null, targetAyah = null) {
  try {

 const pageNum = parseInt(pageNumber);
    currentPage = pageNum;
    window.currentPage = pageNum;

    let pageData;
    const _cache    = window['quranCache'];
const _cacheSet = window['cacheSet'];
const _prefetch = window['prefetchPage'];
    if (_cache?.has(pageNum)) {
  console.log(`⚡ [CACHE HIT] صفحة ${pageNum} من الـ cache`);
  pageData = _cache.get(pageNum);
} else {
  console.log(`🌐 [API] جاري تحميل صفحة ${pageNum}`);
  const res = await axios.get(`/api/v1/quran/page/${pageNum}`);
  pageData = res.data.data;
  _cacheSet?.(pageNum, pageData);
}

    const { ayahs, khatmah } = pageData;
    setTimeout(() => {
  _prefetch?.(pageNum + 1);
  _prefetch?.(pageNum - 1);
  _prefetch?.(pageNum + 2);
}, 500);


    // const res = await axios.get(`/api/v1/quran/page/${pageNumber}`);
    //   const { ayahs, khatmah } = res.data.data;
    // const pageNum = parseInt(pageNumber);

    currentPage = pageNum; 
    window.currentPage = pageNum;
    let userBookmarks = [];
    
    const loggedIn = isUserLoggedIn();
    if (loggedIn) {
      try {
        const bookmarkRes = await axios.get('/api/v1/bookmarks');
        userBookmarks = bookmarkRes.data.data.bookmarks; 
      } catch (err) {
        console.warn('Session expired or error fetching bookmarks');
      }
    } 
    
    if (ayahs.length > 0) {
      document.title = `${ayahs[0].surahNameAr} - صفحة ${pageNum}`;
    }

    const titleElem = document.getElementById('surah-name');
    if (titleElem) titleElem.innerText = `${ayahs[0].surahNameAr || '...'}`; 

    const juzNum  = getJuzByPage(pageNum);
    const hizbNum = getHizbByPage(pageNum);
    const juzInfoEl = document.getElementById('quran-juz-info');
    if (juzInfoEl) {
      juzInfoEl.innerHTML = `
        <span class="badge bg-success me-2">الجزء ${juzNum}</span>
        <span class="badge bg-outline-success border border-success text-success">الحزب ${hizbNum}</span>
      `;
    }
    
    const container = document.getElementById('ayahs-container');
    if (!container) return;
    container.innerHTML = '';

if (khatmah ) {
    const scrollSurah = targetSurah || khatmah.currentSurah;
  const scrollAyah  = targetAyah  || khatmah.currentAyah;
  setTimeout(() => {
    const khatmahIcon = document.querySelector(
      `.khatmah-icon-btn[data-surah="${khatmah.currentSurah}"][data-ayah="${khatmah.currentAyah}"]`
    );
    if (khatmahIcon) {
      khatmahIcon.classList.remove('far');
      khatmahIcon.classList.add('fas', 'khatmah-active-pulse');
      khatmahIcon.style.color = '#198754';
      khatmahIcon.style.fontSize = '1.1em';
      khatmahIcon.style.filter = 'drop-shadow(0 0 5px #198754)';
      setTimeout(() => {
        khatmahIcon.classList.remove('khatmah-active-pulse');
        khatmahIcon.style.filter = 'drop-shadow(0 0 3px #198754)';
      }, 4000);
    }

    const scrollTarget = document.getElementById(`ayah-${scrollSurah}-${scrollAyah}`);
    if (scrollTarget) {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // ✅ highlight للآية
      scrollTarget.style.transition = 'background 0.5s';
      scrollTarget.style.backgroundColor = '#d1e7dd';
      setTimeout(() => { scrollTarget.style.backgroundColor = ''; }, 3000);
      console.log(`✅ [KHATMAH SCROLL] وصلنا لـ ayah-${scrollSurah}-${scrollAyah}`);
    } else {
      console.warn(`⚠️ [KHATMAH SCROLL] مش لاقي ayah-${scrollSurah}-${scrollAyah}`);
    }
  }, 2000); 
}

    let fullTextHTML = '<div class="quran-page-content" style="text-align: justify; text-align-last: center; line-height: 2.8; font-family: \'Amiri\'; font-size: 22px; direction: rtl;">';

    ayahs.forEach(ayah => {
      let ayahText = ayah.text; 
      const ayahNum = ayah.ayahNumber;

      if (ayahNum === 1) {
        if (ayah.surahNumber !== 1 && ayah.surahNumber !== 9) {
          fullTextHTML += `
            <div class="surah-separator text-center my-4 p-2" style="background: #f4f4f4; border: 1px solid #ddd; border-radius: 5px;">
              <h3 class="text-success m-0" style="font-family: 'Amiri';"> ${ayah.surahNameAr}</h3>
            </div>
            <div class="bismillah text-center mb-3" style="font-family: 'Amiri'; font-size: 1.5rem;">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
          `;
          const bismillahRegex = /^\s*ب[\u064B-\u065F\u0670]*س[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*\s*[ٱا]لل[\u064B-\u065F\u0670]*ه[\u064B-\u065F\u0670]*\s*[ٱا]لر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*ٰ?ن[\u064B-\u065F\u0670]*\s*[ٱا]لر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*ي[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*/;
          ayahText = ayahText.replace(bismillahRegex, '').trim();
        } else if (ayah.surahNumber === 1) {
          fullTextHTML += `<div class="surah-separator text-center my-4"><h3 class="text-success m-0" style="font-family: 'Amiri';">سورة الفاتحة</h3></div>`;
        } else if (ayah.surahNumber === 9) {
          fullTextHTML += `<div class="surah-separator text-center my-4 p-2" style="background: #f4f4f4; border: 1px solid #ddd; border-radius: 5px;"><h3 class="text-success m-0" style="font-family: 'Amiri';">سورة التوبة</h3></div>`;
        }
      }

      const isBookmarked = userBookmarks.some(b => parseInt(b.surah) === ayah.surahNumber && parseInt(b.ayah) === ayahNum);
      const iconClass = isBookmarked ? 'fas' : 'far';
      const iconColor = isBookmarked ? '#d4af37' : '#ccc';
      
      let isKhatmahActive = false;
      if (khatmah && parseInt(khatmah.currentSurah) == ayah.surahNumber && parseInt(khatmah.currentAyah) == ayah.ayahNumber) {
        isKhatmahActive = true;
      }
      const khatmahClass = isKhatmahActive ? 'fas' : 'far';
      const khatmahColor = isKhatmahActive ? '#198754' : '#28a745';

      fullTextHTML += `
        <span id="ayah-${ayah.surahNumber}-${ayahNum}" class="ayah-text ayah-clickable" data-surah="${ayah.surahNumber}" data-ayah="${ayahNum}" title="تفسير الآية ${ayahNum}" style="cursor: pointer;">${ayahText}</span>
        <span class="ayah-end-wrapper" style="white-space: nowrap; display: inline-block;">
          <span class="ayah-end-symbol" style="color: #d4af37; font-family: sans-serif; margin: 0 5px; border: 1px solid #d4af37; border-radius: 50%; padding: 0 5px; font-size: 0.8em;">${ayahNum}</span>
          <i class="${iconClass} fa-bookmark bookmark-icon-btn" data-surah="${ayah.surahNumber}" data-ayah="${ayahNum}" title="حفظ علامة مرجعية" style="cursor: pointer; color: ${iconColor}; font-size: 0.7em;"></i>
        </span>
        <i class="${khatmahClass} fa-flag khatmah-icon-btn mx-1" data-surah="${ayah.surahNumber}" data-ayah="${ayah.ayahNumber}" title="${isKhatmahActive ? 'أنت تتوقف هنا' : 'تحديث الختمة هنا'}" style="cursor: pointer; color: ${khatmahColor}; font-size: 0.8em;"></i>
      `;
    });

    fullTextHTML += '</div><div class="text-center mt-3 text-muted small">- ' + pageNum + ' -</div>';
    container.innerHTML = fullTextHTML;
    console.log(`📄 [DOM] ayahs في الـ container: ${container.querySelectorAll('[id^="ayah-"]').length}`);
console.log(`🔍 [DOM] هل ayah-${targetSurah}-${targetAyah} موجود:`, !!document.getElementById(`ayah-${targetSurah}-${targetAyah}`));
    
    const navButtons = document.querySelectorAll('.nav-prev, .nav-next, #prev-surah-mobile, #next-surah-mobile');
    navButtons.forEach(btn => btn.classList.remove('d-none'));
    
    if (typeof updateNavButtons === 'function') {
      updateNavButtons();
    }

    if (!targetSurah || !targetAyah) {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#ayah-')) {
        const parts = hash.split('-'); 
        if (parts.length >= 3) {
          targetSurah = parts[1];
          targetAyah = parts[2];
        }
      }
    }

    // if (targetSurah && targetAyah) {
    //   setTimeout(() => {
    //     const elementId = `ayah-${targetSurah}-${targetAyah}`;
    //     const targetElement = document.getElementById(elementId);
        
    //     if (targetElement) {
    //       targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    //       targetElement.classList.add('highlight-ayah');

    //       const bookmarkIcon = document.querySelector(
    //         `.bookmark-icon-btn[data-surah="${targetSurah}"][data-ayah="${targetAyah}"]`
    //       );
    //       if (bookmarkIcon) {
    //         bookmarkIcon.classList.remove('far');
    //         bookmarkIcon.classList.add('fas', 'bookmark-arrived');
    //         bookmarkIcon.style.color = '#d4af37';
    //         bookmarkIcon.style.fontSize = '1em';
    //         bookmarkIcon.style.filter = 'drop-shadow(0 0 4px #d4af37)';
    //       }
    //       window.history.replaceState(null, null, ' '); 

    //       setTimeout(() => {
    //         targetElement.classList.remove('highlight-ayah');
    //         if (bookmarkIcon) {
    //           bookmarkIcon.classList.remove('bookmark-arrived');
    //           bookmarkIcon.style.filter = '';
    //           bookmarkIcon.style.fontSize = '';
    //         }
    //       }, 4000);
    //     }
    //   }, 1500);
    // }



  } catch (err) {
    console.error(err);
  }
}

export function startSurahReading(surahNumber) {
  const sNum = parseInt(surahNumber);
  const startPage = surahStartPages[sNum] || 1;
  loadQuranPage(startPage);
}

export async function loadSurahs() {
  try {
    const res = await axios.get('/api/v1/quran/surahs');
    const container = document.getElementById('surahs-container');
    if (!container) return;
    container.innerHTML = ''; 
    const surahsList = res.data.data.surahs;
    surahsList.forEach(surah => {
      const surahNum = surah.number || surah.surahNumber || (surahsList.indexOf(surah) + 1);
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

export async function toggleBookmark(surah, ayah, iconElement) {
  try {
    const isCurrentlyBookmarked = iconElement.classList.contains('fas');

    if (isCurrentlyBookmarked) {
      // ─── إزالة مباشرة بدون popup ───
      const res = await axios.post('/api/v1/bookmarks', { surahNumber: surah, ayahNumber: ayah });
      if (res.data.message === 'removed' || res.data.message === 'deleted') {
        iconElement.classList.replace('fas', 'far');
        iconElement.style.color = '#ccc';
        showAlert('success', 'تم إزالة العلامة المرجعية');
      }
    } else {
      // ─── إضافة مع popup اختياري للملاحظة ───
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
            style="
              width: 100%;
              font-family: 'Amiri', serif;
              font-size: 1rem;
              direction: rtl;
              text-align: right;
              resize: none;
              border: 1px solid #dee2e6;
              border-radius: 8px;
              padding: 10px;
              outline: none;
            "
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
            textarea.addEventListener('input', () => {
              counter.textContent = `${textarea.value.length} / 300`;
            });
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
        const msg = note ? 'تم حفظ العلامة مع ملاحظتك 🔖✨' : 'تم حفظ العلامة المرجعية 🔖';
        showAlert('success', msg);
      }
    }
  } catch (err) { 
    console.error("Bookmark Error:", err);
    if (err.response && err.response.status === 401) {
      requireLogin('حفظ العلامات المرجعية في المصحف الشريف');
    } else {
      showAlert('error', 'حدث خطأ غير متوقع أثناء حفظ العلامة.');
    }
  }
}

export async function updateKhatmahProgress(surah, ayah) {
  if (!isUserLoggedIn()) {
    requireLogin('تتبع الختمة وحفظ التقدم');
    return;
  }

  try {
      //  const currentPage = window.currentPage || 1;
           let pageToSave = window.currentPage || 1;
  if (pageToSave === 1) {
      pageToSave = surahStartPages[parseInt(surah)] || 1;
    }
    const res = await axios.patch('/api/v1/khatmah', { surah, ayah,page: pageToSave });
    
    if (res.data.status === 'success') {
      showAlert('success', 'تم تحديث موقع الختمة! 🚩');

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
    // ✅ تحقق من تسجيل الدخول أولاً
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

    const res = await axios.get('/api/v1/bookmarks');
    const container = document.getElementById('bookmarks-container');
    if (!container) return;
    
    container.innerHTML = '';
    const { bookmarks } = res.data.data;

    if (bookmarks.length === 0) {
      container.innerHTML = `<div class="text-center py-5"><i class="far fa-bookmark fa-4x text-muted mb-3"></i><p class="lead">لا توجد علامات محفوظة حالياً</p><a href="/quran" class="btn btn-success">اذهب للمصحف واحفظ أول علامة</a></div>`;
      return;
    }

    bookmarks.forEach(b => {
      const surahNum = parseInt(b.surah);
      let targetPage = b.page ? parseInt(b.page) : null;
//  console.log(b);
      if (!targetPage || isNaN(targetPage)) {
        if (surahStartPages[surahNum]) {
          targetPage = surahStartPages[surahNum];
        } else {
          targetPage = 1;  
        }
      }
     

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
                <button class="btn btn-sm btn-outline-danger delete-bookmark-btn" data-id="${b._id}">
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
    console.error(err);
    if (err.response && err.response.status === 401) {
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
            </div>
          </div>`;
      }
    }
  }
}

export async function deleteBookmark(id) {
  try {
    await axios.delete(`/api/v1/bookmarks/${id}`);
    showAlert('success', 'تم الحذف بنجاح');
    loadBookmarks(); 
  } catch (err) { showAlert('error', 'فشل الحذف'); }
}

export const scheduleDailyWird = async (khatmahName) => {
  try {
    // ✅ إلغاء إشعار الختمة القديم
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 999 }] });
    } catch(e) { /* تجاهل */ }

    const now = new Date();
    const notificationTime = new Date();
    notificationTime.setHours(21, 0, 0, 0); // الساعة 9 مساءً
    notificationTime.setMilliseconds(0);

    // ✅ لو الساعة 9 مساءً فاتت النهارده → جدول لبكرة
    if (notificationTime <= now) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    console.log(`📖 [KHATMAH] جدول تذكير الورد: ${notificationTime.toLocaleString('ar-EG')}`);

    await LocalNotifications.schedule({
      notifications: [{
        title: "وقت الورد اليومي 📖",
        body: `لا تنسَ قراءة وردك من ختمة "${khatmahName}" اليوم`,
        id: 999,   
        schedule: { 
          at: notificationTime,
          every: 'day',
          allowWhileIdle: true
        },
        channelId: 'khatmah-channel', 
        smallIcon: 'ic_notification',
        actionTypeId: "OPEN_KHATMAH"
      }]
    });
    console.log('✅ تم جدولة تذكير الورد اليومي الساعة 9 مساءً بنجاح');
  } catch (error) {
    console.error('❌ خطأ في جدولة الورد:', error);
  }
};

export async function manageKhatmah() {
  try {
    const res = await axios.get('/api/v1/khatmah');
    const activeDiv = document.getElementById('active-khatmah');
    const createDiv = document.getElementById('create-khatmah');
    
    if (activeDiv) activeDiv.classList.remove('d-none');
    if (createDiv) createDiv.classList.add('d-none'); 

    const k = res.data.data.khatmah;
    
    if (document.getElementById('khatmah-name'))
      document.getElementById('khatmah-name').innerText = k.name;
    
    const msg = res.data.data.message || "واصل تقدمك لختم القرآن الكريم ✨";
    if (document.getElementById('daily-target'))
      document.getElementById('daily-target').innerText = msg;

    const sIdx = parseInt(k.currentSurah) - 1;
    const surahName = surahNames[sIdx] || `سورة ${k.currentSurah}`;
    
    const statusText = document.getElementById('khatmah-status-text');
    if (statusText) {
      statusText.innerHTML = `أنت متوقف عند <strong>سورة ${surahName}</strong> - آية <strong>${k.currentAyah}</strong>`;
    }
    
    const surahSelect = document.getElementById('currentSurah');
    if (surahSelect) surahSelect.value = k.currentSurah;
    if (document.getElementById('currentAyah'))
      document.getElementById('currentAyah').value = k.currentAyah;
    
    const progress = Math.round((parseInt(k.currentSurah) / 114) * 100);
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
      progressBar.innerText = `${progress}%`;
    }

    if (Capacitor.isNativePlatform()) {
      await scheduleDailyWird(k.name);
    }

  } catch (err) {
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
let currentBtn = null;

window.playCorrectAudio = function(surah, ayah, btnElement) {
  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  
  const audioUrl = `https://everyayah.com/data/Minshawy_Murattal_128kbps/${s}${a}.mp3`;

  if (currentAudio && !currentAudio.paused && currentBtn === btnElement) {
    currentAudio.pause();
    btnElement.classList.remove('fa-stop-circle', 'text-danger');
    btnElement.classList.add('fa-volume-up', 'text-primary');
    return;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0; 
    if (currentBtn) {
      currentBtn.classList.remove('fa-stop-circle', 'text-danger');
      currentBtn.classList.add('fa-volume-up', 'text-primary');
    }
  }

  currentAudio = new Audio(audioUrl);
  currentBtn = btnElement; 
  currentAudio.play();

  btnElement.classList.remove('fa-volume-up', 'text-primary');
  btnElement.classList.add('fa-stop-circle', 'text-danger');

  currentAudio.onended = function() {
    btnElement.classList.remove('fa-stop-circle', 'text-danger');
    btnElement.classList.add('fa-volume-up', 'text-primary');
    currentAudio = null;
    currentBtn = null;
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
  if (endAyah) formData.append('endAyah', endAyah);

  try {
    const feedbackElem = document.getElementById('ai-feedback');
    feedbackElem.innerHTML = `<div class="py-5 text-center"><div class="spinner-border text-success mb-3"></div><p>جارى تصحيح التلاوه..</p></div>`;
    document.getElementById('result-container').classList.remove('d-none');

    const res = await axios.post('/api/v1/quran/check-recitation', formData, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    });
    
    const { analysis, score, stats } = res.data;

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
  <label class="form-label fw-bold text-muted small">
    <i class="fas fa-volume-up me-1"></i> مستوى الصوت
  </label>
  <input type="range" class="form-range" id="volume-slider-ai" 
         min="0" max="1" step="0.1" value="1" 
         style="width: 200px; accent-color: #198754;">
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
               style="cursor: pointer; font-size: 1rem;" 
               title="استمع للنطق الصحيح"></i>
          </div>`;
      } else {
        let className = item.status === 'Correct' ? 'word-correct' : (item.status === 'missing' ? 'word-missing' : 'word-wrong');
        resultHTML += `<span class="${className}">${item.text}</span>`;
      }
    });
    
    resultHTML += `</div><div class="text-center"><button id="btn-retry" class="btn btn-success px-5">محاولة جديدة</button></div>`;
    feedbackElem.innerHTML = resultHTML;
    
    document.getElementById('btn-retry').addEventListener('click', () => {
      resetRecitationUI();
    });

  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      requireLogin('تصحيح التلاوة');
      setTimeout(() => {
        window.showSection('login');
      }, 1500);
    } else {
      showAlert('error', 'عذراً، تعذر الاتصال بالشبكة. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.');
    }

    document.getElementById('result-container').classList.add('d-none');
  }
}

function resetRecitationUI() {
  const feedbackElem = document.getElementById('ai-feedback');
  const resultContainer = document.getElementById('result-container');

  feedbackElem.innerHTML = '';
  resultContainer.classList.add('d-none');

  const audioPlayer = document.querySelector('audio');
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.src = '';
  }

  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.value = '';
  }

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

    const reciterSurahNames = [
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

    const reciterNamesAr = {
      "Mishary Rashid Alafasy": "مشاري راشد العفاسي",
      "Maher Al Muaiqly": "ماهر المعيقلي",
      "Mahmoud Khalil Al-Hussary": "محمود خليل الحصري",
      "Saud Al-Shuraim": "سعود الشريم",
      "Abdelbasset Abdessamad": "عبد الباسط عبد الصمد"
    };

    let optionsHTML = '';
    reciterSurahNames.forEach((name, index) => {
      optionsHTML += `<option value="${index + 1}">${index + 1}. ${name}</option>`;
    });

    recitersList.forEach(reciter => {
      const displayName = reciterNamesAr[reciter.name] || reciter.name;
      const serverUrl = reciter.server.endsWith('/') ? reciter.server.slice(0, -1) : reciter.server;

      const html = `
        <div class="col-md-4 col-sm-6">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body text-center">
              <div class="mb-3">
                <i class="fas fa-user-circle fa-3x text-success"></i>
              </div>
              <h5 class="card-title fw-bold text-dark">${displayName}</h5>
              <p class="small text-muted mb-3">رواية حفص عن عاصم</p>
              <div class="form-group mb-3">
                <select class="form-select surah-select" style="font-family: 'Amiri'" data-server="${serverUrl}">
                  ${optionsHTML}
                </select>
              </div>
              <audio controls class="w-100 mt-2 quran-player" preload="none">
                <source src="${serverUrl}/001.mp3" type="audio/mpeg">
                متصفحك لا يدعم تشغيل الصوت.
              </audio>
            </div>
          </div>
        </div>`;
      container.insertAdjacentHTML('beforeend', html);
    });

    document.querySelectorAll('.surah-select').forEach(select => {
      select.addEventListener('change', function() {
        const surahNum = this.value;
        const server = this.dataset.server;
        const paddedSurah = surahNum.toString().padStart(3, '0');
        const newAudioUrl = `${server}/${paddedSurah}.mp3`;
        const audioPlayer = this.parentElement.parentElement.querySelector('audio');
        if (audioPlayer) {
          audioPlayer.src = newAudioUrl;
          audioPlayer.play(); 
        }
      });
    });

    document.addEventListener('play', function(e) {
      if (e.target.tagName.toLowerCase() === 'audio') {
        const allAudios = document.querySelectorAll('audio');
        allAudios.forEach(audio => {
          if (audio !== e.target) {
            audio.pause();
          }
        });
      }
    }, true);

  } catch (err) {
    console.error("Error loading reciters:", err);
    const container = document.getElementById('reciters-container');
    if (container) container.innerHTML = '<p class="text-danger text-center">حدث خطأ في تحميل القراء.</p>';
  }
}

export const scheduleAllPrayers = async (prayerTimes) => {
  try {
    try {
      await LocalNotifications.cancel({ notifications: [
        { id: 101 }, { id: 102 }, { id: 103 }, { id: 104 }, { id: 105 }
      ]});
    } catch(e) {}

    // ✅ اطبع الأوقات الخام من الـ API للـ debugging
    console.log('📋 [PRAYERS RAW]', JSON.stringify(prayerTimes));

    const notifications = [];
    const targetPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const prayerNamesAr = {
      'Fajr': 'الفجر', 'Dhuhr': 'الظهر', 'Asr': 'العصر',
      'Maghrib': 'المغرب', 'Isha': 'العشاء'
    };
    const prayerIds = {
      'Fajr': 101, 'Dhuhr': 102, 'Asr': 103, 'Maghrib': 104, 'Isha': 105
    };

    targetPrayers.forEach((key) => {
      const timeStr = prayerTimes[key];
      if (!timeStr) return;


  const cleanTime = timeStr.trim();
  // ✅ التحقق من وجود AM/PM
  const isPM = cleanTime.toUpperCase().includes('PM');
  const isAM = cleanTime.toUpperCase().includes('AM');
    const timePart = cleanTime.split(' ')[0]; // "05:51"
  const parts = timePart.split(':');
  if (parts.length < 2) return;

  let hours   = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return;

  // ✅ تحويل 12-hour إلى 24-hour
  if (isPM && hours !== 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  

      // ✅ بناء الـ date بـ local time صريح بدون أي تحويل
      const nowRef = new Date();
      const prayerDate = new Date(
        nowRef.getFullYear(),
        nowRef.getMonth(),
        nowRef.getDate(),
        hours,   // 24-hour كما هو من الـ API
        minutes,
        0, 0
      );

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
  } catch (error) {
    console.error('❌ خطأ في جدولة إشعارات الصلاة:', error);
  }
};

export function loadPrayers() {
  const container = document.getElementById('prayers-list');
  const locationEl = document.getElementById('location-name');
  const hijriEl = document.getElementById('hijri-date');

  // ✅ رسالة static أثناء التحميل
  if (locationEl) locationEl.innerText = 'جارى تحديد موقعك...';

  const showOfflineMessage = () => {
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
  };

  if (!navigator.geolocation) {
    showOfflineMessage();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async position => {
      try {
        const { latitude, longitude } = position.coords;
        const res = await axios.get(`/api/v1/prayers?lat=${latitude}&lng=${longitude}`);
        const timings = res.data.data.timings;
        if (!container) return;

        if (hijriEl) hijriEl.innerText = res.data.data.hijri;

        try {
          const cityRes = await axios.get(`/api/v1/prayers/get-location?lat=${latitude}&lon=${longitude}`);
          const address = cityRes.data.data.address;
          const cityName = address.city || address.town || address.village || address.state || 'موقعك الحالي';
          if (locationEl) locationEl.innerText = `مواقيت الصلاة في ${cityName}`;
        } catch {
          if (locationEl) locationEl.innerText = 'مواقيت الصلاة حسب موقعك الحالي';
        }

        container.innerHTML = '';
        const prayerNamesAr = {
          Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر',
          Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء'
        };

        for (const [key, value] of Object.entries(timings)) {
          const name = prayerNamesAr[key] || key;
          container.insertAdjacentHTML('beforeend', `
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <span class="fw-bold">${name}</span>
              <span class="badge bg-success rounded-pill" style="font-family: sans-serif">${value}</span>
            </div>`);
        }

        if (Capacitor.isNativePlatform()) {
          try {
            await scheduleAllPrayers(timings);
            console.log('Prayer notifications updated successfully');
          } catch (notifyErr) {
            console.error('Failed to schedule notifications:', notifyErr);
          }
        }

      } catch (err) {
        console.error('فشل جلب مواقيت الصلاة:', err);
        showOfflineMessage();
      }
    },
(geoErr) => {
  console.warn('Geolocation error:', geoErr.message);
  
  if (geoErr.code === 1) { 
    Swal.fire({
      icon: 'info',
      title: '📍 نحتاج إذن الموقع',
      html: `
        <p class="mb-2">لعرض مواقيت الصلاة في مدينتك، نحتاج إذنك للوصول للموقع</p>
        <p class="text-muted small mb-0">
          <i class="fas fa-lock me-1"></i>
          لتفعيله: إعدادات المتصفح ← الموقع ← السماح
        </p>
      `,
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#198754',
    });
  }
  
  showOfflineMessage();
},
    { timeout: 10000, maximumAge: 300000 }
  );
}

export const initBookmarksSearch = () => {
  const searchInput = document.getElementById('bookmarks-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    const bookmarkCards = document.querySelectorAll('#bookmarks-container .col-md-6');
    bookmarkCards.forEach(card => {
      const text = card.innerText.toLowerCase();
      card.style.display = text.includes(query) ? '' : 'none';
    });
  });
};

export const initSearch = () => {
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');

  if (!searchInput || !resultsContainer) return;

  let timeoutId;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      resultsContainer.classList.add('d-none');
      resultsContainer.innerHTML = '';
      return;
    }

    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      try {
        resultsContainer.innerHTML = '<div class="list-group-item text-center">جاري البحث...</div>';
        resultsContainer.classList.remove('d-none');

        const res = await axios.get(`/api/v1/quran/search?q=${query}`);
        const ayahs = res.data.data.ayahs;

        resultsContainer.innerHTML = '';

        if (ayahs.length === 0) {
          resultsContainer.innerHTML = '<div class="list-group-item text-center text-muted">لا توجد نتائج</div>';
          return;
        }

        ayahs.forEach(ayah => {
          const item = document.createElement('a');
          item.className = 'list-group-item list-group-item-action';
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
            const targetPage = ayah.page;
            const surahNum = ayah.surahNumber; 
            const ayahNum = ayah.ayahNumber || ayah.numberInSurah;
            
            // ✅ الانتقال لصفحة المصحف أولاً ثم تحميل الآية - يعمل من أي صفحة
            resultsContainer.classList.add('d-none'); 
            searchInput.value = '';
            
            // إخفاء كل الأقسام وإظهار المصحف
            document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
            const quranSection = document.getElementById('quran-section');
            if (quranSection) quranSection.classList.remove('d-none');
            window.scrollTo(0, 0);
            window.history.pushState({ section: 'quran' }, '', `/quran/${targetPage}`);
            
            // تحميل الصفحة مع تحديد الآية
            if (window.loadQuranPage) {
              window.loadQuranPage(targetPage, surahNum, ayahNum);
            } else {
              loadQuranPage(targetPage, surahNum, ayahNum);
            }
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