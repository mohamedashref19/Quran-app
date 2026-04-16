/* eslint-disable */
import localforage from 'localforage';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import {  Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import axios from 'axios';
import { showAlert } from './auth';
import { surahNames, surahStartPages, juzData, getJuzByPage, getHizbByPage, getSurahNameByPage , SAJDAH_WORDS, SAJDAH_AYAH_END, UTHMANI_FIXES,surahAyahCounts} from './constants';




// ─── Offline Queue Helpers 
const OFFLINE_QUEUE_KEY = 'offline_actions_queue';

const addToOfflineQueue = async (type, payload) => {
  try {
    const existing = await localforage.getItem(OFFLINE_QUEUE_KEY) || [];
    existing.push({ type, payload, createdAt: Date.now() });
    await localforage.setItem(OFFLINE_QUEUE_KEY, existing);
    console.log(`📥 [OFFLINE QUEUE] تم حفظ العملية: ${type}`);
  } catch (e) {
    console.error('❌ [OFFLINE QUEUE] فشل الحفظ:', e);
  }
};

let currentPage = 1;


// ─── Helpers 
window.downloadAudioOffline = async (url, buttonElement) => {
    try {
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
        buttonElement.disabled = true;

        const audioCache = await caches.open('quran-audio-cache-v1');
        
        const existingResponse = await audioCache.match(url);
        if (existingResponse) {
            Swal.fire('موجود مسبقاً', 'هذه السورة محفوظة بالفعل في جهازك للاستماع بدون إنترنت!', 'info');
            buttonElement.innerHTML = '<i class="fas fa-check-circle text-success"></i> محفوظة أوفلاين ✓';
            buttonElement.classList.replace('btn-outline-secondary', 'btn-outline-success');
            buttonElement.disabled = false;
            return;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('فشل التحميل من السيرفر');
        
        await audioCache.put(url, response.clone());

        buttonElement.innerHTML = '<i class="fas fa-check-circle text-success"></i> محفوظة أوفلاين ✓';
        buttonElement.classList.replace('btn-outline-secondary', 'btn-outline-success');
        buttonElement.disabled = false; 

        Swal.fire({
            toast: true,
            position: 'bottom-end',
            icon: 'success',
            title: '✅ تم حفظ السورة للاستماع بدون إنترنت',
            showConfirmButton: false,
            timer: 3000
        });

    } catch (err) {
        console.error('🔴 [DOWNLOAD ERROR]:', err);
        buttonElement.innerHTML = '<i class="fas fa-download me-1"></i> فشل، أعد المحاولة';
        buttonElement.disabled = false;
        
        let errorTitle = 'فشل التحميل';
        let errorMessage = 'حدث خطأ أثناء التحميل، تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى.';

        if (err.name === 'QuotaExceededError' || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('space')) {
            errorTitle = 'مساحة التخزين ممتلئة!';
            errorMessage = 'عفواً، لا توجد مساحة كافية في هاتفك لحفظ السورة. يرجى تفريغ بعض المساحة والمحاولة مجدداً.';
        }

        Swal.fire({
            icon: 'error',
            title: errorTitle,
            text: errorMessage,
            confirmButtonText: 'حسناً',
            confirmButtonColor: '#198754'
        });
    }
};

const isAudioCached = async (url) => {
  try {
    const cache = await caches.open('quran-audio-cache-v1');
    const response = await cache.match(url);
    return !!response;
  } catch { return false; }
};



const requireLogin = (...args) => {
  if (window.requireLogin) {
    window.requireLogin(...args);
  } else {
    Swal.fire({
      icon: 'warning',
      title: 'يجب تسجيل الدخول أولاً',
      text: `سجّل دخولك لتتمكن من ${args[0] || 'هذه الميزة'}`,
      confirmButtonText: 'تسجيل الدخول',
      cancelButtonText: 'لاحقاً',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
    }).then((result) => {
      if (result.isConfirmed) window.showSection('login');
    });
  }
};

function checkConnection() {
  if (!navigator.onLine) {
    Swal.fire({
      icon: 'warning',
      title: 'أنت غير متصل بالإنترنت 📶',
      text: 'يرجى التحقق من اتصالك بالواي فاي أو بيانات الهاتف والمحاولة مرة أخرى.',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#1e5f31'
    });
    return false;
  }
  return true;
}

const isUserLoggedIn = () => {
  if (axios.defaults.headers.common['Authorization']) return true;
  if (localStorage.getItem('auth_token')) return true; 
  const userLinks = document.querySelectorAll('.user-link:not(.d-none)');
  return userLinks.length > 0;
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




// ─── Bookmarks Session Cache 

let _bookmarksCache    = null;
let _bookmarksFetching = false;

const getBookmarks = async () => {
  if (!isUserLoggedIn()) return []; 
  if (_bookmarksCache !== null) return _bookmarksCache;
  if (_bookmarksFetching) {
    await new Promise(r => setTimeout(r, 300));
    return _bookmarksCache || [];
  }
  _bookmarksFetching = true;
  try {
    const res = await axios.get('/api/v1/bookmarks');
    _bookmarksCache = res.data.data.bookmarks;
    console.log(`✅ [BOOKMARKS] تم تحميل ${_bookmarksCache.length} علامة`);
    return _bookmarksCache;
  } catch (err) {
    if (err.response?.status === 401) {
      _bookmarksCache = [];
      return []; // جلسة منتهية - لا تقرأ من كاش قديم
    }
    // أي خطأ تاني (Network Error وغيره) → اقرأ من الكاش المحلي
    console.warn('⚠️ [BOOKMARKS] فشل تحميل العلامات:', err.message);
    return await localforage.getItem('offline_bookmarks') || [];
  } finally {
    _bookmarksFetching = false;
  }
};

const invalidateBookmarksCache = () => {
  _bookmarksCache = null;
  console.log('🗑️ [BOOKMARKS CACHE] تم مسح الكاش');
};

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





// ─── loadQuranPage 






export const shareAyah = async (ayahText, surahName, ayahNum) => {
  // تنظيف اسم السورة ونص الآية
  const cleanSurahName = surahName.replace(/سورة /g, '').replace(/سُورَةُ /g, '').trim();
  const toArabicNum = (n) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const cleanAyahText = ayahText.replace(/\s*[\u06DD۝]\s*\d+$/, '').replace(/\s*﴿\s*\d+\s*﴾\s*$/, '').trim();

  // ١. اكتشاف حالة التطبيق
  const isDarkMode = document.body.getAttribute('data-theme') === 'dark' || 
                     document.body.getAttribute('data-reading') === 'night';

  // ٢. تحديد الألوان بناءً على الوضع الحالي
  const theme = isDarkMode ? {
    bgOuter: '#151515',
    bgInner: '#1a1a1a',
    textMain: '#ffffff',
    textSurah: '#e0e0e0',
    borderOuter: '#333333',
    borderOutline: '#555555',
    borderSurah: '#777777', // لون الزخرفة الداكن
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
    borderSurah: '#c5a028', // لون الزخرفة الذهبي
    surahBg: '#ffffff',
    watermark: '#198754',     
    ayahNum: '#d4af37'        
  };

  // 🌟 كود الـ SVG للزخرفة (يحاكي الأرابيسك في الصورة الأولى)
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
            font-size: 2.8rem;
            color: ${theme.textSurah};
            white-space: nowrap;
          ">سُورَةُ ${cleanSurahName}</div>
        </div>
      </div>

      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 10px;">
        <div style="font-family: 'Amiri Quran', 'Amiri', serif; font-size: 4.2rem; line-height: 2.3; color: ${theme.textMain}; text-align: center;">
          ${cleanAyahText}
          <span style="display: inline-block; margin-right: 15px; color: ${theme.ayahNum}; font-size: 3.5rem;">
            ﴿${toArabicNum(ayahNum)}﴾
          </span>
        </div>
      </div>

      <div style="margin-top: 40px; text-align: center;">
        <span style="font-family: 'Amiri', serif; font-size: 1.8rem; color: ${theme.watermark};">
           تطبيق اقرأ — نور يومك بالقرآن الكريم
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

    const shareTitle = `سورة ${cleanSurahName} - آية ${ayahNum}`;
    const shareMessage = `${cleanAyahText} ﴿${toArabicNum(ayahNum)}﴾\n\n✨ تمت المشاركة عبر تطبيق اقرأ`;

    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const Filesystem = window.Capacitor.Plugins.Filesystem;
      const Share = window.Capacitor.Plugins.Share;

      const base64Data = imgData.split(',')[1];
      const fileName = `ayah_share_${Date.now()}.png`;

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
        title: shareTitle,
        text: shareMessage,
        url: uri,
        dialogTitle: 'مشاركة الآية',
      });

    } else {
      const blob = await (await fetch(imgData)).blob();
      const file = new File([blob], `ayah_${cleanSurahName}_${ayahNum}.png`, { type: 'image/png' });

      Swal.close();

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'تطبيق اقرأ 📖',
          text: shareMessage,
          files: [file]
        });
      } else {
        const link = document.createElement('a');
        link.download = `ayah_${cleanSurahName}_${ayahNum}.png`;
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



export async function loadQuranPage(pageNumber, targetSurah = null, targetAyah = null) {
  const pageNum = parseInt(pageNumber);

  // تحديث مبدئي لاسم السورة في الخلفية
  const _quickNavName = targetSurah
    ? (typeof surahNames !== 'undefined' ? `سورة ${surahNames[parseInt(targetSurah) - 1]}` : getSurahNameByPage(pageNum))
    : `سورة ${getSurahNameByPage(pageNum)}`;

  const titleEl = document.getElementById('surah-title-display');
  if (titleEl) titleEl.textContent = _quickNavName;
  document.title = `${_quickNavName} - صفحة ${pageNum}`;

  if (window._loadingPage === pageNum) return;
  window._loadingPage = pageNum;

  try {
    window.currentPage = pageNum;

    // ─── قراءة الكاش (الختمة والعلامات) ───
    let khatmah       = window._cachedKhatmah   ?? null;
    let userBookmarks = window._cachedBookmarks  ?? [];

    if (!window._cacheLoadedAt) {
      try {
        khatmah       = await localforage.getItem('latest_khatmah');
        userBookmarks = await localforage.getItem('offline_bookmarks') || [];
        window._cachedKhatmah   = khatmah;
        window._cachedBookmarks = userBookmarks;
        window._cacheLoadedAt   = Date.now();
      } catch(e) { console.warn('Cache init error:', e); }
    }

    // ─── تحديث العلامات في الخلفية ───
    const loggedIn = typeof isUserLoggedIn === 'function' ? isUserLoggedIn() : false;
    if (loggedIn && navigator.onLine && localStorage.getItem('auth_token')) {
      axios.get('/api/v1/bookmarks').then(async (res) => {
        const freshBookmarks = res.data.data.bookmarks;
        await localforage.setItem('offline_bookmarks', freshBookmarks);
        window._cachedBookmarks = freshBookmarks; 
      }).catch(() => {});
    }

    // ─── تحديث بيانات الجزء والحزب ───
    if (typeof getJuzByPage === 'function' && typeof getHizbByPage === 'function') {
        const juzNum    = getJuzByPage(pageNum);
        const hizbNum   = getHizbByPage(pageNum);
        
        const mhSurah = document.getElementById('mh-surah');
        const mhJuz = document.getElementById('mh-juz');
        const mhHizb = document.getElementById('mh-hizb');
        if (mhSurah) mhSurah.innerText = _quickNavName;
        if (mhJuz) mhJuz.innerText = `الجزء ${juzNum}`;
        if (mhHizb) mhHizb.innerText = `الحزب ${hizbNum}`;

        const juzInfoEl = document.getElementById('quran-juz-info');
        if (juzInfoEl) {
          juzInfoEl.innerHTML = `
            <span class="badge bg-success me-2">الجزء ${juzNum}</span>
            <span class="badge bg-outline-success border border-success text-success">الحزب ${hizbNum}</span>
          `;
        }
    }

    // ─── زر دعاء الختمة ───
    const duaBtnContainer = document.getElementById('khatmah-dua-btn-container');
    if (duaBtnContainer) {
      if (pageNum === 604) duaBtnContainer.classList.remove('d-none');
      else duaBtnContainer.classList.add('d-none');
    }

    document.querySelectorAll('.nav-prev, .nav-next, #prev-surah-mobile, #next-surah-mobile').forEach(btn => btn.classList.remove('d-none'));
    if (typeof updateNavButtons === 'function') updateNavButtons();

    // 1. جلب الآيات من ملفات الـ JSON
    const response = await fetch(`/assets/quran_pages/${pageNum}.json`);
    if (!response.ok) throw new Error(`لم يتم العثور على ملف الصفحة ${pageNum}`);
    const pageData = await response.json();
    const ayahs = pageData.ayahs || pageData.data?.ayahs || [];

    const container = document.getElementById('ayahs-container');
    if (!container) return;
    
    container.style.display = 'block'; 
    
    // 2. إظهار زر التبديل للمصحف المصور
    const promoBtn = document.getElementById('image-mushaf-promo');
    if (promoBtn) promoBtn.style.display = 'block';

    let fullTextHTML = '<div class="quran-page-content">';

    const SURAH_AYAH_COUNTS = [0, 7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6];

    // 3. بناء الـ HTML لكل آية
    ayahs.forEach(ayah => {
        let ayahText = ayah.text || ayah.ayahText;
        const ayahNum = ayah.ayahNumber || ayah.numberInSurah;
        const surahNum = ayah.surahNumber || (ayah.surah && ayah.surah.number);
        let surahName = ayah.surahNameAr || (ayah.surah && ayah.surah.name) || "";
        if (surahName.startsWith("سُورَةُ ")) surahName = surahName.replace("سُورَةُ ", "سورة ");

        const totalAyahs = SURAH_AYAH_COUNTS[surahNum] || "";
        const arabicTotalAyahs = totalAyahs.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
        
        // تحويل رقم الآية الحالي لأرقام عربية
        const arabicAyahNum = ayahNum.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

        // أيقونات الختمة والعلامة المرجعية
        const isBookmarked = userBookmarks.some(b => parseInt(b.surah) === surahNum && parseInt(b.ayah) === ayahNum);
        const isKhatmahActive = khatmah && parseInt(khatmah.currentSurah) === surahNum && parseInt(khatmah.currentAyah) === ayahNum;

        const bookmarkIcon = isBookmarked ? `<i class="fas fa-bookmark mx-1" style="color: #d4af37; font-size: 0.8em;"></i>` : '';
        const khatmahIcon = isKhatmahActive ? `<i class="fas fa-flag mx-1" style="color: #198754; font-size: 0.8em;"></i>` : '';

        // البسملة ورأس السورة
        if (ayahNum === 1) {
            // 🔥 الهيكل الجديد: اسم السورة سطر وتحته عدد الآيات سطر 🔥
          const separatorHTML = `
    <div class="surah-separator">
        <div class="surah-name">${surahName}</div>
        <div class="ayah-count">آياتها ${arabicTotalAyahs}</div>
    </div>
`;

            if (surahNum !== 1 && surahNum !== 9) {
                fullTextHTML += separatorHTML + `<div class="bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>`;
                ayahText = ayahText.replace(/^\s*ب[\u064B-\u065F\u0670]*س[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*\s*[ٱا]لل[\u064B-\u065F\u0670]*ه[\u064B-\u065F\u0670]*\s*[ٱا]لر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*ٰ?ن[\u064B-\u065F\u0670]*\s*[ٱا]لر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*ي[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*/, '').trim();
            } else {
                fullTextHTML += separatorHTML;
            }
        }

        // بناء الآية مع الزخرفة
        fullTextHTML += `
            <span class="verse-wrapper" data-surah="${surahNum}" data-ayah="${ayahNum}" data-surahname="${surahName}" data-bookmarked="${isBookmarked}" style="cursor: pointer; display: inline;">
                <span id="ayah-${surahNum}-${ayahNum}" class="ayah-text">${ayahText}</span>
                <span class="ayah-end-wrapper" style="display: inline-flex; align-items: center; white-space: nowrap; margin: 0 4px; user-select: none;">
                    <span class="ayah-marker">
                        <span class="ayah-end-symbol">${arabicAyahNum}</span>
                    </span>
                    <span class="ayah-icons" style="display: inline-flex; gap: 2px;">
                        ${bookmarkIcon}
                        ${khatmahIcon}
                    </span>
                </span>
            </span>
        `;
    });

    fullTextHTML += `</div><div class="text-center mt-3 text-muted small">- ${pageNum} -</div>`;
    container.innerHTML = fullTextHTML;

    // 4. التمرير للآية المطلوبة
    setTimeout(() => {
        if (targetSurah && targetAyah) {
            const targetEl = document.getElementById(`ayah-${targetSurah}-${targetAyah}`);
            const qs = document.getElementById('quran-section');
            const navEl = qs && qs.querySelector('nav, .navbar, .quran-navbar');
            const navOffset = navEl ? (navEl.getBoundingClientRect().height + 10) : 110;

            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const scrollTop = rect.top + window.scrollY - navOffset;
                window.scrollTo({ top: scrollTop, behavior: 'smooth' });
                
                targetEl.style.backgroundColor = 'rgba(25, 135, 84, 0.2)';
                setTimeout(() => targetEl.style.backgroundColor = 'transparent', 3000);
            }
        } else {
            window.scrollTo({ top: 0, behavior: 'instant' }); 
        }
    }, 300);

  } catch (err) {
    console.error("❌ خطأ في تهيئة الصفحة:", err);
  } finally {
    window._loadingPage = null;
  }
}

export function startSurahReading(surahNumber) {
  const sNum = parseInt(surahNumber);
  const startPage = typeof surahStartPages !== 'undefined' ? (surahStartPages[sNum - 1] || 1) : 1; 
  if(typeof window.openQuranFullscreen === 'function') window.openQuranFullscreen(startPage, sNum, 1);
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
      const startPage = typeof surahStartPages !== 'undefined' ? (surahStartPages[surahNum - 1] || 1) : 1;
      
      const html = `
        <div class="col-md-3 mb-3">
          <div onclick="window.openQuranFullscreen(${startPage}, ${surahNum}, 1);"
               class="text-decoration-none" style="cursor: pointer; display: block;">
            <div class="card h-100 hover-shadow border-0 shadow-sm">
              <div class="card-body text-center">
                <div class="d-flex justify-content-center align-items-center mb-2">
                  <span class="badge bg-success rounded-circle p-2 me-2">${surahNum}</span>
                  <h5 class="card-title text-dark mb-0 fw-bold" style="font-family: 'Amiri', serif;"> ${surah.arabicName}</h5>
                </div>
                <p class="text-muted small mb-0">عدد الآيات: ${surah.ayahCount}</p>
              </div>
            </div>
          </div>
        </div>`;
      container.insertAdjacentHTML('beforeend', html);
    });
  } catch (err) { console.error(err); }
}



// ─── toggleBookmark 

export async function toggleBookmark(surah, ayah, iconElement) {
  if (!isUserLoggedIn()) {
    requireLogin('حفظ العلامات المرجعية في المصحف الشريف');
    return;
  }
  const isCurrentlyBookmarked = iconElement.classList.contains('fas');

  let userNote = "";

  // 🔥 التعديل هنا: نسأل عن الملاحظة الأول (أونلاين أو أوفلاين) طالما إحنا بنضيف علامة جديدة 🔥
  if (!isCurrentlyBookmarked) {
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

    // لو المستخدم ضغط إلغاء، نوقف العملية
    if (!isConfirmed) return;
    
    // حفظ الملاحظة اللي المستخدم كتبها
    userNote = note || "";
  }

  // 📴 1. حالة الأوفلاين 📴
  if (!navigator.onLine) {
    if (isCurrentlyBookmarked) {
      await addToOfflineQueue('DELETE_BOOKMARK', { surah, ayah });
      let offlineBookmarks = await localforage.getItem('offline_bookmarks') || [];
      offlineBookmarks = offlineBookmarks.filter(
        b => !(parseInt(b.surah) === parseInt(surah) && parseInt(b.ayah) === parseInt(ayah))
      );
      await localforage.setItem('offline_bookmarks', offlineBookmarks);
      invalidateBookmarksCache();
      iconElement.classList.replace('fas', 'far');
      iconElement.style.color = '#ccc';
    } else {
      // 🔥 دمج الملاحظة مع طابور الأوفلاين والمحفوظات المحلية 🔥
      await addToOfflineQueue('ADD_BOOKMARK', { surahNumber: surah, ayahNumber: ayah, note: userNote });
      let offlineBookmarks = await localforage.getItem('offline_bookmarks') || [];
      const ayahEl = document.getElementById(`ayah-${surah}-${ayah}`);
      const ayahText = ayahEl ? ayahEl.textContent.trim() : '';
      offlineBookmarks.push({ 
        surah, 
        ayah, 
        surahName: surahNames[parseInt(surah) - 1] || '', 
        ayahText,
        note: userNote // حفظ الملاحظة في الكاش
      });
      await localforage.setItem('offline_bookmarks', offlineBookmarks);
      invalidateBookmarksCache();
      iconElement.classList.replace('far', 'fas');
      iconElement.style.color = '#d4af37';
    }

    Swal.fire({
      toast: true, position: 'top-end', icon: 'info',
      title: isCurrentlyBookmarked
        ? '🔖 تم حذف العلامة (سيُزامَن عند عودة الإنترنت)'
        : '🔖 تم حفظ العلامة (سيُزامَن عند عودة الإنترنت)',
      showConfirmButton: false, timer: 2500
    });
    return;
  }

  // 🌐 2. حالة الأونلاين 🌐
  try {
    if (isCurrentlyBookmarked) {
      const res = await axios.post('/api/v1/bookmarks', { surahNumber: surah, ayahNumber: ayah });
      if (res.data.message === 'removed' || res.data.message === 'deleted') {
        iconElement.classList.replace('fas', 'far');
        iconElement.style.color = '#ccc';
        let offlineBookmarks = await localforage.getItem('offline_bookmarks') || [];
        offlineBookmarks = offlineBookmarks.filter(
          b => !(parseInt(b.surah) === parseInt(surah) && parseInt(b.ayah) === parseInt(ayah))
        );
        await localforage.setItem('offline_bookmarks', offlineBookmarks);
        invalidateBookmarksCache();
        showAlert('success', 'تم إزالة العلامة المرجعية');
      }
    } else {
      const payload = { surahNumber: surah, ayahNumber: ayah };
      if (userNote) payload.note = userNote; // إرسال الملاحظة للباك إند

      const res = await axios.post('/api/v1/bookmarks', payload);
      if (res.data.message === 'added') {
        iconElement.classList.replace('far', 'fas');
        iconElement.style.color = '#d4af37';
        const ayahElOnline = document.getElementById(`ayah-${surah}-${ayah}`);
        const ayahTextOnline = ayahElOnline ? ayahElOnline.textContent.trim() : '';
        let offlineBookmarks = await localforage.getItem('offline_bookmarks') || [];
        offlineBookmarks.push({
          surah,
          ayah,
          surahName: surahNames[parseInt(surah) - 1] || '',
          ayahText: ayahTextOnline,
          note: userNote || ''
        });
        await localforage.setItem('offline_bookmarks', offlineBookmarks);
        invalidateBookmarksCache();
        const msg = userNote ? 'تم حفظ العلامة مع ملاحظتك 🔖✨' : 'تم حفظ العلامة المرجعية 🔖';
        showAlert('success', msg);
      }
    }
  } catch (err) {
    console.error("Bookmark Error:", err);
    // لو النت فصل أثناء الطلب (Network Error)، نحولها لعملية أوفلاين مع الملاحظة
    if (!navigator.onLine || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
      if (isCurrentlyBookmarked) {
        await addToOfflineQueue('DELETE_BOOKMARK', { surah, ayah });
        let offlineBookmarks = await localforage.getItem('offline_bookmarks') || [];
        offlineBookmarks = offlineBookmarks.filter(
          b => !(parseInt(b.surah) === parseInt(surah) && parseInt(b.ayah) === parseInt(ayah))
        );
        await localforage.setItem('offline_bookmarks', offlineBookmarks);
        iconElement.classList.replace('fas', 'far');
        iconElement.style.color = '#ccc';
      } else {
        // 🔥 إضافة الملاحظة في حالة خطأ الاتصال 🔥
        await addToOfflineQueue('ADD_BOOKMARK', { surahNumber: surah, ayahNumber: ayah, note: userNote });
        let offlineBookmarks = await localforage.getItem('offline_bookmarks') || [];
        const ayahElCatch = document.getElementById(`ayah-${surah}-${ayah}`);
        const ayahTextCatch = ayahElCatch ? ayahElCatch.textContent.trim() : '';
        offlineBookmarks.push({ 
          surah, 
          ayah, 
          surahName: surahNames[parseInt(surah) - 1] || '', 
          ayahText: ayahTextCatch,
          note: userNote 
        });
        await localforage.setItem('offline_bookmarks', offlineBookmarks);
        iconElement.classList.replace('far', 'fas');
        iconElement.style.color = '#d4af37';
      }
      invalidateBookmarksCache();
      Swal.fire({
        toast: true, position: 'top-end', icon: 'info',
        title: isCurrentlyBookmarked
          ? '🔖 تم حذف العلامة (سيُزامَن عند عودة الإنترنت)'
          : '🔖 تم حفظ العلامة (سيُزامَن عند عودة الإنترنت)',
        showConfirmButton: false, timer: 2500
      });
    } else if (err.response && err.response.status === 401) {
      requireLogin('حفظ العلامات المرجعية في المصحف الشريف');
    } else {
      showAlert('error', 'حدث خطأ غير متوقع أثناء حفظ العلامة.');
    }
  }
}



// ─── updateKhatmahProgress 

export async function updateKhatmahProgress(surah, ayah) {
  if (!isUserLoggedIn()) {
    requireLogin('تتبع الختمة وحفظ التقدم');
    return;
  }

  // 🔥 سحب البيانات القديمة عشان منضيعش تاريخ النهاية (endDate) 🔥
  const existingKhatmah = await localforage.getItem('latest_khatmah') || {};
  
  // 🌟 جلب رقم الصفحة الحالية المفتوحة في المصحف 🌟
  const pageToSave = window.currentPage || currentPage || 1;

  if (!navigator.onLine) {
    await addToOfflineQueue('UPDATE_KHATMAH', { surah, ayah });

    await localforage.setItem('latest_khatmah', {
      ...existingKhatmah, // الحفاظ على البيانات القديمة
      currentSurah: surah,
      currentAyah: ayah,
      page: pageToSave, // 🌟 التعديل: حفظ رقم الصفحة
      updatedAt: Date.now()
    });

    updateKhatmahUI(surah, ayah); // دالة مساعدة لتحديث الأزرار
    
    Swal.fire({
      toast: true, position: 'top-end', icon: 'success',
      title: `📖 تم حفظ موقعك 🚩`,
      text: 'سيتم المزامنة تلقائياً عند عودة الإنترنت',
      showConfirmButton: false, timer: 3000
    });
    
    await manageKhatmah();
    return;
  }

  try {
    const res = await axios.patch('/api/v1/khatmah', { surah, ayah });  

    if (res.data.status === 'success') {
      await localforage.setItem('latest_khatmah', {
        ...existingKhatmah, // الحفاظ على البيانات القديمة
        currentSurah: surah,
        currentAyah: ayah,
        page: pageToSave, // 🌟 التعديل: حفظ رقم الصفحة
        updatedAt: Date.now()
      });

      updateKhatmahUI(surah, ayah);
      showAlert('success', 'تم تحديث موقع الختمة! 🚩');
      await manageKhatmah();
    }
  } catch (err) {
    console.error("❌ خطأ في التحديث:", err);
    if (!navigator.onLine || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
      
      await addToOfflineQueue('UPDATE_KHATMAH', { surah, ayah });  
      
      await localforage.setItem('latest_khatmah', {
        ...existingKhatmah,
        currentSurah: surah,
        currentAyah: ayah,
        page: pageToSave, // 🌟 التعديل: حفظ رقم الصفحة
        updatedAt: Date.now()
      });

      updateKhatmahUI(surah, ayah);

      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: `📖 تم حفظ موقعك محلياً 🚩`,
        text: 'سيتم المزامنة تلقائياً عند عودة الإنترنت',
        showConfirmButton: false, timer: 3000
      });

      await manageKhatmah();

    } else if (err.response && err.response.status === 401) {
      requireLogin('تتبع الختمة وحفظ التقدم');
    } else if (err.response && err.response.status === 404) {
      if (typeof window.showAlert === 'function') {
        window.showAlert('info', 'ليس لديك ختمة نشطة حالياً. يمكنك البدء بإنشاء ختمة جديدة من قسم "ختمتي" 📖');
      } else {
        alert('ليس لديك ختمة نشطة حالياً. يرجى إنشاء ختمة أولاً.');
      }
    } else {
      showAlert('error', 'حدث خطأ، يرجى المحاولة مرة أخرى.');
    }
  }
}

// دالة مساعدة لتنظيف كود تحديث الأزرار
function updateKhatmahUI(surah, ayah) {
    document.querySelectorAll('.khatmah-icon-btn').forEach(btn => {
      btn.classList.remove('fas', 'khatmah-active-pulse');
      btn.classList.add('far');
      btn.style.color = '#28a745';
      btn.title = 'تحديث الختمة هنا';
    });
    const newActiveBtn = document.querySelector(`.khatmah-icon-btn[data-surah="${surah}"][data-ayah="${ayah}"]`);
    if (newActiveBtn) {
      newActiveBtn.classList.remove('far');
      newActiveBtn.classList.add('fas', 'khatmah-active-pulse');
      newActiveBtn.style.color = '#198754';
      newActiveBtn.title = 'أنت تتوقف هنا';
    }
    const statusText = document.getElementById('khatmah-status-text');
    if (statusText) {
      const surahName = (typeof surahNames !== 'undefined' && surahNames[parseInt(surah) - 1]) ? surahNames[parseInt(surah) - 1] : `سورة ${surah}`;
      statusText.innerHTML = `أنت متوقف عند <strong>سورة ${surahName}</strong> - آية <strong>${ayah}</strong>`;
    }
}

export async function loadBookmarks() {
  try {
    if (!await isUserLoggedIn()) {
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

    // ─── دالة رسم العلامات (تُستخدم مرتين: كاش + API) ────────────────────────
    const renderBookmarksToUI = (bookmarksList) => {
  container.innerHTML = '';
  if (!bookmarksList || bookmarksList.length === 0) {
    container.innerHTML = `<div class="text-center py-5"><i class="far fa-bookmark fa-4x text-muted mb-3"></i><p class="lead">لا توجد علامات محفوظة حالياً</p><a href="#" onclick="window.showSection('quran'); return false;" class="btn btn-success">اذهب للمصحف واحفظ أول علامة</a></div>`;
    return;
  }
  let html = '';
  bookmarksList.forEach(b => {
    const surahNum  = parseInt(b.surah);
    let targetPage  = b.page ? parseInt(b.page) : null;
    if (!targetPage || isNaN(targetPage)) targetPage = surahStartPages[surahNum] || 1;

    const noteHTML = b.note
      ? `<div class="mt-2 p-2 rounded bookmark-note-box">
           <small class="note-text"><i class="fas fa-sticky-note me-1 text-success"></i>${b.note}</small>
         </div>`
      : '';

    html += `
      <div class="col-md-6 mb-3">
        <div class="card shadow-sm border-start border-success border-4 h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <h5 class="card-title text-success">${b.surahName}</h5>
              <button class="btn btn-sm btn-outline-danger delete-bookmark-btn" 
                data-id="${b._id || ''}" 
                ${!b._id || !navigator.onLine ? 'disabled title="تحتاج للإنترنت لحذف العلامة"' : ''}>
                <i class="fas fa-trash"></i>
              </button>
            </div>
            <p class="ayah-text text-dark mt-2" style="font-family: 'Amiri'; font-size: 1.2rem;">${b.ayahText || b.text || ""}</p>
            ${noteHTML}
            <div class="mt-3 d-flex justify-content-between align-items-center">
              <span class="badge bg-light text-dark">آية رقم: ${b.ayah}</span>
              <button class="btn btn-sm btn-success"
                onclick="window.openQuranFullscreen(${targetPage}, ${surahNum}, ${parseInt(b.ayah)});">
                <i class="fas fa-book-open me-1"></i> انتقل للآية
              </button>
            </div>
          </div>
        </div>
      </div>`;
  });
  container.innerHTML = html;
};

    // ─── 1. عرض فوري من الكاش (0 ثانية انتظار) ───────────────────────────────
    const cachedBookmarks = await localforage.getItem('offline_bookmarks');
    if (cachedBookmarks) {
      renderBookmarksToUI(cachedBookmarks);
    } else if (!navigator.onLine) {
  // أوفلاين وما فيش كاش → رسالة واضحة
  container.innerHTML = `
    <div class="col-12 text-center py-5">
      <i class="fas fa-wifi-slash fa-3x text-muted mb-3"></i>
      <p class="lead text-muted">لا يوجد اتصال بالإنترنت</p>
      <p class="text-muted small">سيتم عرض علاماتك عند الاتصال مرة أخرى</p>
    </div>`;
} 
    else {
      container.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-success"></div></div>';
    }

    // ─── 2. مزامنة صامتة في الخلفية ──────────────────────────────────────────
    if (navigator.onLine) {
      axios.get('/api/v1/bookmarks')
        .then(async (res) => {
          const freshBookmarks = res.data.data.bookmarks;
          await localforage.setItem('offline_bookmarks', freshBookmarks);
          renderBookmarksToUI(freshBookmarks); // تحديث الشاشة لو فيه جديد
        })
       .catch(apiErr => {
  console.warn('⚠️ فشل المزامنة الخلفية للعلامات:', apiErr.message);
  
  if (apiErr.response?.status === 401) {
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
  } else {
    // أي error تاني (500, network, etc.) → عرض الكاش لو موجود
    localforage.getItem('offline_bookmarks').then(cached => {
      if (cached) {
        renderBookmarksToUI(cached);
      } else {
        container.innerHTML = `
          <div class="col-12 text-center py-5">
            <i class="fas fa-exclamation-circle fa-3x text-muted mb-3"></i>
            <p class="lead text-muted">تعذر تحميل العلامات</p>
            <button class="btn btn-outline-success btn-sm" onclick="window.loadBookmarks()">
              إعادة المحاولة
            </button>
          </div>`;
      }
    });
  }
});
    }
  } catch (err) {
    console.error("خطأ عام في عرض العلامات:", err);
  }
}

export async function deleteBookmark(id) {
  try {
    await axios.delete(`/api/v1/bookmarks/${id}`);
    invalidateBookmarksCache();
    showAlert('success', 'تم الحذف بنجاح');
    loadBookmarks();
  } catch (err) { showAlert('error', 'فشل الحذف'); }
}

// features.js

export const scheduleDailyWird = async (khatmahName = null) => {
  try {
    if (!Capacitor.isNativePlatform()) return;

    // مسح أي جدولة سابقة لنفس المعرف لضمان التحديث
    try { 
        await LocalNotifications.cancel({ notifications: [{ id: 999 }] }); 
    } catch(e) {}

    const now = new Date();
    const notificationTime = new Date();
    notificationTime.setHours(21, 0, 0, 0); // الساعة 9 مساءً
    notificationTime.setMilliseconds(0);

    if (notificationTime <= now) {
        notificationTime.setDate(notificationTime.getDate() + 1);
    }

    // تحديد نص الرسالة بناءً على وجود ختمة أو لا
    const notifBody = khatmahName 
        ? `لا تنسَ قراءة وردك من ختمة "${khatmahName}" اليوم 📖`
        : "اجعل لنفسك نصيباً من القرآن اليوم.. اقرأ ولو صفحة واحدة ✨";

    await LocalNotifications.schedule({
      notifications: [{
        title: "وقت الورد اليومي 📖",
        body: notifBody,
        id: 999,
        schedule: { at: notificationTime, every: 'day', allowWhileIdle: true },
        channelId: 'khatmah-channel',
        smallIcon: 'ic_notification',
        actionTypeId: "OPEN_KHATMAH"
      }]
    });
    
    console.log(`✅ [REMINDER] تم جدولة إشعار الورد بنجاح (${khatmahName ? 'مخصص' : 'عام'})`);
  } catch (error) { 
    console.error('❌ خطأ في جدولة الورد:', error); 
  }
};

// دالة تحسب أنت قرأت كام آية من إجمالي 6236 آية
function calculateGlobalAyah(surahNum, ayahNum) {
    let total = 0;
    for (let i = 1; i < surahNum; i++) {
       total += surahAyahCounts[i - 1];
    }
    total += Number(ayahNum);
   
    return total;
}

export async function manageKhatmah() {
  const activeDiv      = document.getElementById('active-khatmah');
  const createDiv      = document.getElementById('create-khatmah');
  
  // 🌟 1. إذا لم يكن مسجلاً، نعرض واجهة الإنشاء ونجدول إشعاراً عاماً للتشجيع
  if (!await isUserLoggedIn()) {
    if (activeDiv) activeDiv.classList.add('d-none');
    if (createDiv) createDiv.classList.remove('d-none');
    await scheduleDailyWird(null); 
    return;
  }
  
  const kNameEl          = document.getElementById('khatmah-name');
  const kTargetEl        = document.getElementById('daily-target');
  const statusText       = document.getElementById('khatmah-status-text');
  const progressBar      = document.getElementById('progress-bar');
  const surahSelect      = document.getElementById('currentSurah');
  const currentAyahInput = document.getElementById('currentAyah');

  const loadFromCache = async () => {
    const offlineKhatmah = await localforage.getItem('latest_khatmah');
    const offlineMeta    = await localforage.getItem('khatmah_meta');
    if (!offlineKhatmah) return null;
    return {
      currentSurah: offlineKhatmah.currentSurah,
      currentAyah:  offlineKhatmah.currentAyah,
      page:         offlineKhatmah.page || null, // 🌟 استرجاع الصفحة لو موجودة
      endDate:      offlineKhatmah.endDate || null,
      name:         offlineMeta ? offlineMeta.name : 'ختمتي الحالية',
      targetMsg:    offlineMeta ? offlineMeta.targetMsg : ''
    };
  };

  const renderKhatmah = async (k) => {
    if (activeDiv) activeDiv.classList.remove('d-none');
    if (createDiv) createDiv.classList.add('d-none');
    if (kNameEl) kNameEl.innerText = k.name || 'ختمتي';
    
    const sIdx      = parseInt(k.currentSurah) - 1;
    const surahName = (typeof surahNames !== 'undefined' && surahNames[sIdx]) ? surahNames[sIdx] : `سورة ${k.currentSurah}`;
    
    if (statusText) {
      statusText.innerHTML = `أنت متوقف عند <strong>سورة ${surahName}</strong> - آية <strong>${k.currentAyah}</strong>`;
    }
    if (surahSelect)       surahSelect.value      = k.currentSurah;
    if (currentAyahInput)  currentAyahInput.value = k.currentAyah;
    
    const currentAyahGlobal = calculateGlobalAyah(k.currentSurah, k.currentAyah);
    const totalAyahs = 6236;
    const progressRaw = (currentAyahGlobal / totalAyahs) * 100;
    const progress = Math.min(Math.max(progressRaw, 0), 100).toFixed(1);

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
      progressBar.innerText   = `${progress}%`;
    }

    if (k.endDate && kTargetEl) {
        const endDate = new Date(k.endDate);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        let daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 0) daysLeft = 1; 
        
      const remainingAyahs = totalAyahs - currentAyahGlobal;
        const dailyTargetAyahs = Math.ceil(remainingAyahs / daysLeft);

        // 🔥 التعديل السحري: الحساب الدقيق للصفحات المتبقية من إجمالي 604 صفحة 🔥
        let currentPageNum = k.page || (typeof surahStartPages !== 'undefined' ? surahStartPages[k.currentSurah] : 1);
        if (!currentPageNum) currentPageNum = 1; // حماية إضافية

        // حساب إجمالي الصفحات المتبقية بدقة
        let remainingPages = 604 - currentPageNum;
        if (remainingPages < 0) remainingPages = 0;

        // حساب الورد اليومي بالصفحات
        let dailyTargetPages = Math.ceil(remainingPages / daysLeft);
        
        // لو باقي آيات في نفس الصفحة الأخيرة، نعتبرها صفحة واحدة لتشجيع المستخدم
        if (dailyTargetPages < 1 && remainingAyahs > 0) dailyTargetPages = 1;

        kTargetEl.innerHTML = `
            تبقّى <strong class="mx-1" style="color: #d97706; font-size: 1.1rem;">${daysLeft}</strong> أيام <br>
            وردك اليومي: <strong class="text-success mx-1">${dailyTargetPages}</strong> صفحة <span class="text-muted small">(حوالي ${dailyTargetAyahs} آية)</span>
        `;
    } else if (kTargetEl && k.targetMsg) {
        kTargetEl.innerText = k.targetMsg;
    }
    
    // 🌟 2. جدولة الإشعار المخصص باسم الختمة
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform() && typeof scheduleDailyWird === 'function') {
      await scheduleDailyWird(k.name);
    }
  };

  const cachedKhatmah = await loadFromCache();
  if (cachedKhatmah) {
    await renderKhatmah(cachedKhatmah);
  }

  if (navigator.onLine) {
    axios.get('/api/v1/khatmah')
      .then(async (res) => {
        const freshK = res.data.data.khatmah;
        
        // 🌟 التأكد إننا بنحافظ على رقم الصفحة لو هي نفس الآية 🌟
        let syncedPage = null;
        if (cachedKhatmah && cachedKhatmah.currentSurah == freshK.currentSurah && cachedKhatmah.currentAyah == freshK.currentAyah) {
            syncedPage = cachedKhatmah.page || null;
        }

        await localforage.setItem('latest_khatmah', {
          currentSurah: freshK.currentSurah,
          currentAyah:  freshK.currentAyah,
          page:         syncedPage, // 🌟 الحفاظ على الصفحة
          endDate:      freshK.endDate 
        });
        await localforage.setItem('khatmah_meta', {
          name:      freshK.name,
          targetMsg: res.data.data.message || "واصل تقدمك لختم القرآن الكريم ✨"
        });
        
        if (!cachedKhatmah || cachedKhatmah.currentAyah !== freshK.currentAyah || cachedKhatmah.currentSurah !== freshK.currentSurah) {
           await renderKhatmah({
             currentSurah: freshK.currentSurah,
             currentAyah:  freshK.currentAyah,
             endDate:      freshK.endDate,
             name:         freshK.name,
             targetMsg:    res.data.data.message
           });
        }
      })
      .catch(async (apiErr) => {
        console.warn('⚠️ [KHATMAH] فشل المزامنة الخلفية:', apiErr.message);
        
        // 🌟 3. إذا لم توجد ختمة (حُذفت من الخادم)، نجدول إشعاراً عاماً
        if (apiErr.response?.status === 404) {
          await localforage.removeItem('latest_khatmah');
          await localforage.removeItem('khatmah_meta');
          if (activeDiv) activeDiv.classList.add('d-none');
          if (createDiv) createDiv.classList.remove('d-none');
          await scheduleDailyWird(null); 
        } else if (!cachedKhatmah) {
          if (activeDiv) activeDiv.classList.add('d-none');
          if (createDiv) createDiv.classList.remove('d-none');
          await scheduleDailyWird(null);
        }
      });
  } else if (!cachedKhatmah) {
    if (activeDiv) activeDiv.classList.add('d-none');
    if (createDiv) createDiv.classList.remove('d-none');
    await scheduleDailyWird(null); // إذا كان أوفلاين ولم يجد كاش
  }
}

export async function createKhatmah(name, durationDays) {
  // ─── أوفلاين: حفظ الختمة محلياً وإضافتها للـ Queue ───
  if (!navigator.onLine) {
    const endDate = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await localforage.setItem('latest_khatmah', {
      currentSurah: 1, currentAyah: 1, page: 1, endDate, updatedAt: Date.now()
    });
    await localforage.setItem('khatmah_meta', {
      name: name || 'ختمتي',
      targetMsg: 'واصل تقدمك لختم القرآن الكريم ✨'
    });
    await addToOfflineQueue('CREATE_KHATMAH', { name, durationDays });

    Swal.fire({
      toast: true, position: 'top-end', icon: 'success',
      title: '📖 تم إنشاء الختمة محلياً',
      text: 'ستتم المزامنة تلقائياً عند عودة الإنترنت',
      showConfirmButton: false, timer: 3000
    });

    await manageKhatmah();
    return;
  }

  // ─── أونلاين: الطريقة العادية ───
  try {
    const res = await axios.post('/api/v1/khatmah', { name, durationDays });
    if (res.data.status === 'success') await manageKhatmah();
  } catch (err) {
    if (!navigator.onLine || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
      const endDate = durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      await localforage.setItem('latest_khatmah', {
        currentSurah: 1, currentAyah: 1, page: 1, endDate, updatedAt: Date.now()
      });
      await localforage.setItem('khatmah_meta', {
        name: name || 'ختمتي',
        targetMsg: 'واصل تقدمك لختم القرآن الكريم ✨'
      });
      await addToOfflineQueue('CREATE_KHATMAH', { name, durationDays });

      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: '📖 تم إنشاء الختمة محلياً',
        text: 'سيتم المزامنة تلقائياً عند عودة الإنترنت',
        showConfirmButton: false, timer: 3000
      });
      await manageKhatmah();
    } else if (err.response?.status === 401) {
      if (typeof requireLogin === 'function') requireLogin('إنشاء ختمة');
    } else {
      showAlert('error', err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى');
    }
  }
}

export async function deleteKhatmah() {
  try {
    const result = await Swal.fire({
      title: 'إلغاء الختمة؟',
      text: "هل أنت متأكد أنك تريد إلغاء خطة الختمة الحالية؟",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، إلغاء',
      cancelButtonText: 'تراجع'
    });

    if (!result.isConfirmed) return;

    // 1. تحديث الواجهة فوراً (إخفاء الختمة الحالية وإظهار زر الإنشاء)
    const activeDiv = document.getElementById('active-khatmah');
    const createDiv = document.getElementById('create-khatmah');
    if (activeDiv) activeDiv.classList.add('d-none');
    if (createDiv) createDiv.classList.remove('d-none');
    const statusText = document.getElementById('khatmah-status-text');
    if (statusText) statusText.innerText = '';

    // 2. تصفير الكاش المحلي
    await localforage.removeItem('latest_khatmah');
    await localforage.removeItem('khatmah_meta');

    // 3. مسح من السيرفر لو فيه نت، أو حفظ في الأوفلاين
    if (navigator.onLine) {
      const res = await axios.delete('/api/v1/khatmah');
      if (res.status === 204 || res.status === 200) {
        Swal.fire({ title: 'تم', text: 'تم إلغاء الختمة بنجاح', icon: 'success', timer: 2000, showConfirmButton: false });
      }
    } else {
      if (typeof addToOfflineQueue === 'function') {
        await addToOfflineQueue('DELETE_KHATMAH', {});
      }
      Swal.fire({ title: 'تم محلياً', text: 'تم الإلغاء (أوفلاين)، ستتم المزامنة عند عودة الإنترنت', icon: 'success', timer: 3000, showConfirmButton: false });
    }
  } catch (err) {
    if (err.response?.status === 401) {
      if (typeof requireLogin === 'function') requireLogin('حذف الختمة');
    } else {
      showAlert('error', err.response?.data?.message || 'فشل إلغاء الختمة');
    }
  }
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

window.playUserRecitation = function(audioUrl, btnElement) {
  if (typeof stopAllMedia === 'function') stopAllMedia();

  if (window.currentUserRecitationAudio && !window.currentUserRecitationAudio.paused) {
    window.currentUserRecitationAudio.pause();
    btnElement.innerHTML = '<i class="fas fa-play me-2"></i> تشغيل التلاوة';
    btnElement.classList.replace('btn-danger', 'btn-outline-success');
    return;
  }

  window.currentUserRecitationAudio = new Audio(audioUrl);

  window.currentUserRecitationAudio.play().then(() => {
    btnElement.innerHTML = '<i class="fas fa-stop me-2"></i> إيقاف التلاوة';
    btnElement.classList.replace('btn-outline-success', 'btn-danger');
  }).catch((err) => {
    console.error("خطأ في تشغيل صوت المستخدم:", err);
    showAlert('error', 'عذراً، تعذر تشغيل التسجيل الصوتي على جهازك.');
  });

  window.currentUserRecitationAudio.onended = function() {
    btnElement.innerHTML = '<i class="fas fa-play me-2"></i> تشغيل التلاوة';
    btnElement.classList.replace('btn-danger', 'btn-outline-success');
    window.currentUserRecitationAudio = null;
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
      <div class="score-card mb-3">
        <div class="score-number">${score}%</div>
        <div class="score-label">دقة التلاوة</div>
        <div class="score-bar-wrap mt-2">
          <div class="score-bar-fill" style="width: ${score}%"></div>
        </div>
      </div>
      <div class="text-center mb-3">
        <div class="d-inline-block p-3 rounded-4" style="background: rgba(25,135,84,0.06); border: 1px solid rgba(25,135,84,0.12);">
          <p class="small text-success fw-bold mb-2"><i class="fas fa-play-circle me-1"></i> استمع إلى تلاوتك:</p>
         ${userAudioUrl ? `
  <button id="btn-play-user-recitation" class="btn btn-outline-success btn-sm rounded-pill w-100" onclick="window.playUserRecitation('${userAudioUrl}', this)">
    <i class="fas fa-play me-2"></i> تشغيل التلاوة
  </button>
` : '<p class="text-muted small mb-0">لا يوجد تسجيل صوتي</p>'}
        </div>
        <div id="volume-control-ai" class="d-none mt-3 text-center">
          <label class="form-label fw-bold text-muted small"><i class="fas fa-volume-up me-1"></i> مستوى الصوت</label>
          <input type="range" class="form-range" id="volume-slider-ai" min="0" max="1" step="0.1" value="1" style="width: 200px; accent-color: #198754;">
        </div>
      </div>
      <div class="ai-result-box p-4 mb-4" style="font-family: 'Amiri Quran', 'Amiri', serif; font-size: 28px; line-height: 2.8; direction: rtl; text-align: right; background: linear-gradient(180deg,#fdfbf5 0%,#faf7ee 100%); border-radius: 16px; border: 1px solid rgba(197,165,90,0.25); box-shadow: 0 2px 10px rgba(0,0,0,0.06); position: relative; overflow: hidden;">
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
        const safeText = item.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        resultHTML += `<span class="${className}">${safeText}</span> `;
      }
    });

    resultHTML += `</div><div class="text-center mt-3"><button id="btn-retry" class="btn btn-success px-5 py-2 rounded-pill fw-bold shadow-sm"><i class="fas fa-redo me-2"></i>محاولة جديدة</button></div>`;
    feedbackElem.innerHTML = resultHTML;
    document.getElementById('btn-retry').addEventListener('click', () => resetRecitationUI());

  } catch (err) {
     document.getElementById('result-container').classList.add('d-none');
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      requireLogin('تصحيح التلاوة');
      setTimeout(() => { window.showSection('login'); }, 1500);
    } else if (!navigator.onLine) {
      showAlert('error', 'لا يوجد اتصال بالإنترنت، تحقق من الشبكة وحاول مرة أخرى.');
    }
   else if (err.response && err.response.status === 429) {
    Swal.fire({
      icon: 'info',
      title: 'مهلاً!',
      text: err.response.data.message || 'يرجى المحاولة لاحقاً.',
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#198754' // لون التطبيق الأخضر
    });
    
    // إيقاف التسجيل أو إعادة الأزرار لحالتها الطبيعية هنا
    resetUIButtons(); 
    return;
  }
     else {
      showAlert('error', 'حدث خطأ في السيرفر، حاول مرة أخرى.');
    }
   
  }
}

function resetRecitationUI() {
  const feedbackElem    = document.getElementById('ai-feedback');
  const resultContainer = document.getElementById('result-container');
  feedbackElem.innerHTML = '';
  resultContainer.classList.add('d-none');
  // const audioPlayer = document.querySelector('audio');
  // if (audioPlayer) { audioPlayer.pause(); audioPlayer.src = ''; }
  if (window.currentUserRecitationAudio) {
    window.currentUserRecitationAudio.pause();
    window.currentUserRecitationAudio = null;
}
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) fileInput.value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ─── loadReciters 

export async function loadReciters() {
  try {
    // ─── أوفلاين: نشوف لو في بيانات قراء محفوظة ──────────────────────────────
    if (!navigator.onLine) {
      const container = document.getElementById('reciters-container');
      const cachedRecitersData = await localforage.getItem('cached_reciters');

      if (cachedRecitersData) {
        await renderReciters(cachedRecitersData, container);
        container.insertAdjacentHTML('afterbegin', `
          <div class="col-12 mb-3">
            <div class="alert mb-0 text-end d-flex align-items-center gap-3"
              style="background: linear-gradient(135deg, #e8f5e9, #f1f8e9); border: 1px solid #a5d6a7; border-radius: 14px; direction: rtl;">
              <i class="fas fa-wifi-slash fa-lg text-success"></i>
              <div>
                <div class="fw-bold text-success" style="font-size: 0.95rem;">وضع بدون إنترنت</div>
                <div class="text-muted small">يمكنك الاستماع للسور المحفوظة مسبقاً على جهازك فقط</div>
              </div>
            </div>
          </div>`);
      } else {
        if (container) {
          container.innerHTML = `
            <div class="col-12">
              <div class="text-center py-5">
                <div class="mb-4" style="font-size: 4rem;">📵</div>
                <h4 class="fw-bold text-dark mb-2">أنت غير متصل بالإنترنت</h4>
                <p class="text-muted mb-4" style="font-family:'Amiri'; font-size: 1.1rem;">
                  لم تقم بتحميل أي سور للاستماع بدون إنترنت بعد
                </p>
                <div class="alert alert-light border border-success-subtle p-4 mx-auto text-end" style="max-width: 420px; border-radius: 16px; direction: rtl;">
                  <p class="fw-bold text-success mb-2"><i class="fas fa-lightbulb me-2"></i>كيف تستمع أوفلاين؟</p>
                  <p class="text-muted small mb-0">
                    عند الاتصال بالإنترنت، افتح صفحة القراء واضغط
                    <strong>"حفظ للاستماع أوفلاين"</strong> أسفل أي سورة تريدها
                  </p>
                </div>
              </div>
            </div>`;
        }
      }
      return;
    }

    const res = await axios.get('/api/v1/audio/reciters');
    const container = document.getElementById('reciters-container');
    if (!container) return;

    const recitersList = res.data.data.reciters || [];

   

    if (!recitersList || recitersList.length === 0) {
      container.innerHTML = '<p class="text-center">لا يوجد قراء متاحون حالياً.</p>';
      return;
    }

   

    // حفظ القائمة المترتبة عشان تشتغل أوفلاين بنفس الترتيب
    await localforage.setItem('cached_reciters', recitersList);

    container.innerHTML = '';
    await renderReciters(recitersList, container);
    container.insertAdjacentHTML('afterbegin', `
      <div class="col-12 mb-3 text-end">
        <button onclick="window.showRecitersTip()" class="btn btn-sm btn-outline-warning rounded-pill px-3 shadow-sm" style="font-family: 'Amiri', serif; font-weight: bold; border-color: #ffc107; color: #d39e00;">
          <i class="fas fa-lightbulb me-1"></i> نصيحة هامة للاستماع
        </button>
      </div>`);

    if (!window.showRecitersTip) {
        window.showRecitersTip = function() {
            Swal.fire({
                title: '<span style="color:#d39e00; font-family:\'Amiri\';"><i class="fas fa-lightbulb fa-lg mb-2"></i><br>نصيحة لاستقرار التلاوة</span>',
                html: `
                    <div style="font-family:'Amiri'; font-size: 1.1rem; line-height: 1.8; color: #555; text-align: center; direction: rtl;">
                        لضمان عدم انقطاع الصوت أثناء الاستماع للسور الطويلة (مثل سورة البقرة)، يُفضل دائماً استخدام زر <br>
                        <span class="badge bg-success mt-2 p-2 fs-6"><i class="fas fa-download me-1"></i> حفظ للاستماع أوفلاين</span>
                    </div>
                `,
                confirmButtonText: 'حسناً، شكراً لك',
                confirmButtonColor: '#198754',
                customClass: { popup: 'rounded-4' }
            });
        };
    }

  } catch (err) {
    console.error("Error loading reciters:", err);
    const container = document.getElementById('reciters-container');
    if (container) container.innerHTML = '<p class="text-danger text-center">حدث خطأ في تحميل القراء.</p>';
  }
}

//   Custom Searchable Dropdown 
window.transformSelectToSearchable = (selectElement) => {
  if (!selectElement || selectElement.dataset.searchableInit === 'true') return;
  selectElement.dataset.searchableInit = 'true';
  
  selectElement.style.display = 'none';
  
  const styleId = 'custom-dropdown-style';
  if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
          .custom-surah-dropdown .dropdown-item:hover { background-color: rgba(25, 135, 84, 0.1) !important; color: #198754 !important; font-weight: bold; }
          [data-theme="dark"] .custom-surah-dropdown .dropdown-menu { border: 1px solid #444 !important; background-color: #1a2e1f !important; }
          [data-theme="dark"] .custom-surah-dropdown .dropdown-item { color: #e8f5e9 !important; border-bottom: 1px solid #2d4a35 !important; }
          [data-theme="dark"] .custom-surah-dropdown .surah-search-input { background-color: #0d1b0f !important; color: #fff !important; border-color: #2d4a35 !important; }
          [data-theme="dark"] .custom-surah-dropdown .sticky-top { background-color: #1a2e1f !important; }
      `;
      document.head.appendChild(style);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-surah-dropdown w-100 position-relative mb-2';
  
  const initialSelected = selectElement.options[selectElement.selectedIndex];
  const initialText = initialSelected ? initialSelected.textContent : 'اختر السورة';
  
  wrapper.innerHTML = `
    <button class="btn border w-100 d-flex justify-content-between align-items-center shadow-sm" 
            type="button" data-bs-toggle="dropdown" aria-expanded="false" 
            style="font-family: 'Amiri', serif; border-radius: 10px; padding: 10px 15px; background-color: var(--card-bg, #fff); color: var(--text-color, #333); border-color: var(--border-color, #ced4da) !important;">
        <span class="selected-text">${initialText}</span>
        <i class="fas fa-chevron-down text-success" style="font-size: 0.8rem;"></i>
    </button>
    <ul class="dropdown-menu w-100 shadow border-0 p-0" 
        style="max-height: 320px; overflow-y: auto; text-align: right; direction: rtl; border-radius: 12px; z-index: 1050;">
        <div class="p-2 sticky-top" style="border-bottom: 1px solid #f1f1f1;">
            <input type="text" class="form-control surah-search-input" placeholder="🔍 ابحث عن سورة..." 
                   style="font-family: sans-serif; font-size: 0.95rem; border-radius: 8px; border: 1px solid #198754; padding: 10px;">
        </div>
        <div class="surah-items-container pb-2"></div>
    </ul>
  `;
  
  const itemsContainer = wrapper.querySelector('.surah-items-container');
  const searchInput = wrapper.querySelector('.surah-search-input');
  const btnText = wrapper.querySelector('.selected-text');
  
  Array.from(selectElement.options).forEach(opt => {
      if (!opt.value) return; 
      const li = document.createElement('li');
      li.innerHTML = `<a class="dropdown-item" href="#" data-value="${opt.value}" 
                         style="font-family: 'Amiri', serif; padding: 10px 15px; border-bottom: 1px solid #f9f9f9; font-size: 1.1rem;">
                         ${opt.textContent}
                      </a>`;
      itemsContainer.appendChild(li);
      
      li.querySelector('a').addEventListener('click', (e) => {
          e.preventDefault();
          btnText.textContent = opt.textContent;
          selectElement.value = opt.value;
          searchInput.value = ''; // تصفير البحث
          itemsContainer.querySelectorAll('li').forEach(i => i.style.display = 'block');
          
          selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      });
  });
  
  searchInput.addEventListener('click', e => e.stopPropagation());
  
  searchInput.addEventListener('input', (e) => {
      const term = e.target.value.replace(/[أإآٱ]/g, 'ا').toLowerCase();
      itemsContainer.querySelectorAll('li').forEach(li => {
          const text = li.textContent.replace(/[أإآٱ]/g, 'ا').toLowerCase();
          li.style.display = text.includes(term) ? 'block' : 'none';
      });
  });

  selectElement.addEventListener('change', () => {
     const selectedOpt = selectElement.options[selectElement.selectedIndex];
     if (selectedOpt) btnText.textContent = selectedOpt.textContent;
  });
  
  selectElement.parentNode.insertBefore(wrapper, selectElement.nextSibling);
};




export async function renderReciters(recitersList, container) {
    if (!container) return;
    container.innerHTML = '';
    
    // 1. تجهيز قائمة السور
    let optionsHTML = '';
    if (typeof surahNames !== 'undefined') {
        surahNames.forEach((name, index) => {
            optionsHTML += `<option value="${index + 1}">${index + 1}. ${name}</option>`;
        });
    }

    // 🌟 [تعديل] تجهيز وتفريغ قائمة اختيار القراء (Select)
    const searchSelect = document.getElementById('reciter-search-select');
    if (searchSelect) {
        searchSelect.innerHTML = '<option value="" disabled selected>-- اضغط هنا لفتح قائمة القراء --</option>'; 
    }

    // 2. التأكد من وجود ستايلات المشغل المخصص
    if (!document.getElementById('custom-audio-styles')) {
        const style = document.createElement('style');
        style.id = 'custom-audio-styles';
        style.innerHTML = `
            .custom-range { -webkit-appearance: none; height: 4px !important; background: rgba(150, 150, 150, 0.2) !important; border-radius: 5px; outline: none; padding: 0; }
            .custom-range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #198754; cursor: pointer; transition: transform 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
            .custom-range::-webkit-slider-thumb:hover { transform: scale(1.2); }
            .play-pause-btn:active { transform: scale(0.92); background-color: rgba(25, 135, 84, 0.2) !important; }
        `;
        document.head.appendChild(style);
    }

    const formatTime = (time) => {
        if (isNaN(time) || time === Infinity) return "00:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // 3. رسم كروت القراء بناءً على بيانات الباك إيند
    for (let i = 0; i < recitersList.length; i++) {
        const reciter = recitersList[i];
        const displayName = reciter.nameAr || reciter.name;
        
        // 🌟 [تعديل] إضافة اسم القارئ لقائمة الاختيار (Select)
        if (searchSelect) {
            searchSelect.insertAdjacentHTML('beforeend', `<option value="${displayName}">${displayName}</option>`);
        }

        const imageUrl = reciter.image; 
        const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=198754&color=fff&size=128&font-size=0.33`;
        
        const serverUrl = reciter.server.endsWith('/') ? reciter.server.slice(0, -1) : reciter.server;
        const defaultUrl = `${serverUrl}/001.mp3`;

        // فحص حالة الكاش
        const isDefaultCached = await isAudioCached(defaultUrl);
        let audioSrc = defaultUrl;
        
        if (isDefaultCached) {
            try {
                const cache = await caches.open('quran-audio-cache-v1');
                const cachedRes = await cache.match(defaultUrl);
                if (cachedRes) {
                    const blob = await cachedRes.blob();
                    audioSrc = URL.createObjectURL(blob); 
                }
            } catch(e) { console.error("Cache error", e); }
        }

        container.insertAdjacentHTML('beforeend', `
            <div class="col-md-4 col-sm-6 mb-4 reciter-wrapper" data-reciter-name="${displayName}">
                <div class="card h-100 shadow-sm border-0 reciter-card" style="border-radius: 16px; overflow: hidden; background-color: transparent; transition: background-color 0.5s ease;">
                    <div class="card-body text-center p-4">
                        <div class="mb-3 position-relative d-inline-block">
                            <img src="${imageUrl}" loading="lazy"
                                onerror="this.onerror=null; this.src='${fallbackImage}';"
                                alt="${displayName}"
                                class="rounded-circle shadow-sm"
                                style="width: 100px; height: 100px; object-fit: cover; border: 3px solid #198754;">
                        </div>
                        <h5 class="card-title fw-bold mb-1">${displayName}</h5>
                        <p class="small text-muted mb-3">${reciter.rewaya || 'رواية حفص عن عاصم'}</p>

                        <div class="form-group mb-2">
                            <select class="form-select surah-select bg-transparent" style="font-family: 'Amiri'; border-radius: 10px; text-align: right;" data-server="${serverUrl}">
                                ${optionsHTML}
                            </select>
                        </div>

                        <div class="audio-loading-indicator d-none text-success small fw-bold mb-1">
                            <i class="fas fa-circle-notch fa-spin me-1"></i> جاري التحميل...
                        </div>

                        <audio class="quran-player d-none" preload="none" crossorigin="anonymous"
                            src="${audioSrc}" data-url="${defaultUrl}" data-reciter="${displayName}">
                        </audio>

                        <div class="custom-audio-player mt-4 pt-3" style="border-top: 1px solid rgba(150, 150, 150, 0.15);">
                            <div class="d-flex align-items-center justify-content-between mb-3" style="font-size: 0.8rem; color: #888; direction: ltr; font-family: monospace;">
                                <span class="current-time" style="min-width: 40px;">00:00</span>
                                <input type="range" class="form-range progress-slider flex-grow-1 mx-2 custom-range" min="0" max="100" value="0">
                                <span class="total-time" style="min-width: 40px;">00:00</span>
                            </div>
                            
                            <div class="d-flex align-items-center justify-content-between" style="direction: ltr;">
                                <div class="d-flex align-items-center" style="width: 30%;">
                                    <i class="fas fa-volume-up vol-icon me-2" style="font-size: 0.85rem; color: #888;"></i>
                                    <input type="range" class="form-range volume-slider w-100 custom-range" min="0" max="1" step="0.05" value="1">
                                </div>
                                
                                <button class="btn play-pause-btn shadow-none" style="width: 50px; height: 50px; border-radius: 50%; background-color: rgba(25, 135, 84, 0.1); border: 1px solid rgba(25, 135, 84, 0.15); color: #198754; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;">
                                    <i class="fas fa-play" style="margin-left: 3px; font-size: 1.2rem;"></i>
                                </button>
                                
                                <div style="width: 30%;"></div>
                            </div>
                        </div>

                        <button class="btn btn-sm mt-3 download-audio-btn w-100 ${isDefaultCached ? 'btn-outline-success' : 'btn-outline-secondary'}"
                            style="border-radius: 10px; transition: all 0.3s;"
                            onclick="window.downloadAudioOffline('${defaultUrl}', this)">
                            ${isDefaultCached
                                ? '<i class="fas fa-check-circle text-success"></i> محفوظة أوفلاين ✓'
                                : '<i class="fas fa-download me-1"></i> حفظ للاستماع أوفلاين'
                            }
                        </button>
                    </div>
                </div>
            </div>`);
    }

    // 4. تفعيل منطق التشغيل والتحكم بعد انتهاء الرسم تماماً
    container.querySelectorAll('.reciter-wrapper').forEach(wrapper => {
        const card = wrapper.querySelector('.reciter-card');
        const select = card.querySelector('.surah-select');
        const audioPlayer = card.querySelector('.quran-player');
        const downloadBtn = card.querySelector('.download-audio-btn');
        const loadingIndicator = card.querySelector('.audio-loading-indicator');
        const playPauseBtn = card.querySelector('.play-pause-btn');
        const playIcon = playPauseBtn.querySelector('i');
        const progressSlider = card.querySelector('.progress-slider');
        const volumeSlider = card.querySelector('.volume-slider');
        const volIcon = card.querySelector('.vol-icon');
        const currentTimeEl = card.querySelector('.current-time');
        const totalTimeEl = card.querySelector('.total-time');

        if (window.transformSelectToSearchable) window.transformSelectToSearchable(select);

        select.addEventListener('change', async function() {
            const paddedSurah = this.value.toString().padStart(3, '0');
            const newUrl = `${this.dataset.server}/${paddedSurah}.mp3`;

            loadingIndicator.classList.remove('d-none');
            playIcon.className = 'fas fa-play';
            playIcon.style.marginLeft = '3px';
            progressSlider.value = 0;
            currentTimeEl.textContent = "00:00";
            totalTimeEl.textContent = "00:00";

            audioPlayer.pause();
            audioPlayer.src = newUrl;
            audioPlayer.dataset.url = newUrl;
            audioPlayer.load();

            const isCached = await isAudioCached(newUrl);
            if (downloadBtn) {
                if (isCached) {
                    downloadBtn.innerHTML = '<i class="fas fa-check-circle text-success"></i> محفوظة أوفلاين ✓';
                    downloadBtn.className = 'btn btn-sm mt-3 download-audio-btn w-100 btn-outline-success';
                    try {
                        const cache = await caches.open('quran-audio-cache-v1');
                        const cachedRes = await cache.match(newUrl);
                        if (cachedRes) {
                            const blob = await cachedRes.blob();
                            audioPlayer.src = URL.createObjectURL(blob);
                        }
                    } catch(e) { console.error("Cache error", e); }
                } else {
                    downloadBtn.innerHTML = '<i class="fas fa-download me-1"></i> حفظ للاستماع أوفلاين';
                    downloadBtn.className = 'btn btn-sm mt-3 download-audio-btn w-100 btn-outline-secondary';
                }
                downloadBtn.setAttribute('onclick', `window.downloadAudioOffline('${newUrl}', this)`);
            }
        });

        playPauseBtn.addEventListener('click', () => {
            if (audioPlayer.paused) {
                document.querySelectorAll('.quran-player').forEach(a => { if (a !== audioPlayer && !a.paused) a.pause(); });
                audioPlayer.play();
            } else {
                audioPlayer.pause();
            }
        });

        audioPlayer.addEventListener('timeupdate', () => {
            if (!isNaN(audioPlayer.duration) && audioPlayer.duration > 0) {
                progressSlider.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
                currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
            }
        });

        audioPlayer.addEventListener('loadedmetadata', () => { totalTimeEl.textContent = formatTime(audioPlayer.duration); });

        progressSlider.addEventListener('input', (e) => {
            if (!isNaN(audioPlayer.duration)) audioPlayer.currentTime = (e.target.value / 100) * audioPlayer.duration;
        });

        volumeSlider.addEventListener('input', (e) => {
            audioPlayer.volume = e.target.value;
            volIcon.className = e.target.value == 0 ? 'fas fa-volume-mute text-muted me-2 vol-icon' : (e.target.value > 0.5 ? 'fas fa-volume-up text-muted me-2 vol-icon' : 'fas fa-volume-down text-muted me-2 vol-icon');
        });

        audioPlayer.addEventListener('waiting', () => loadingIndicator.classList.remove('d-none')); 
        audioPlayer.addEventListener('playing', () => { loadingIndicator.classList.add('d-none'); playIcon.className = 'fas fa-pause'; playIcon.style.marginLeft = '0'; });
        audioPlayer.addEventListener('pause', () => { loadingIndicator.classList.add('d-none'); playIcon.className = 'fas fa-play'; playIcon.style.marginLeft = '3px'; });
        audioPlayer.addEventListener('ended', () => { playIcon.className = 'fas fa-play'; progressSlider.value = 0; currentTimeEl.textContent = "00:00"; });
        
        audioPlayer.addEventListener('error', () => {
            loadingIndicator.classList.add('d-none');
            playIcon.className = 'fas fa-play';
            if (navigator.onLine && audioPlayer.currentTime > 0 && !audioPlayer.src.startsWith('blob:')) {
                const savedTime = audioPlayer.currentTime;
                audioPlayer.src = audioPlayer.dataset.url + '?retry=' + Date.now();
                audioPlayer.load();
                audioPlayer.onloadedmetadata = () => { audioPlayer.currentTime = savedTime; audioPlayer.play(); audioPlayer.onloadedmetadata = null; };
            }
        });
    });

    // 5. تفعيل الاختيار بعد تحميل القراء
    initReciterSearch();
}


// 🌟 دوال التمرير (Scroll) عند اختيار القارئ من الـ Select

function initReciterSearch() {
    const searchSelect = document.getElementById('reciter-search-select');
    if (searchSelect) {
        // نستخدم حدث 'change' بدلاً من 'input' لأننا نتعامل مع Select
        searchSelect.removeEventListener('change', handleReciterSearch);
        searchSelect.addEventListener('change', handleReciterSearch);
    }
}

function handleReciterSearch(e) {
    const selectedName = e.target.value;
    if (!selectedName) return;

    // العثور على الكرت الذي يحمل اسم القارئ المختار
    const targetWrapper = document.querySelector(`[data-reciter-name="${selectedName}"]`);

    if (targetWrapper) {
        // 1. النزول بسلاسة لمكان الكرت
        targetWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 2. عمل وميض (Highlight) للكرت لتمييزه
        const cardInner = targetWrapper.querySelector('.reciter-card');
        const originalBg = cardInner.style.backgroundColor;
        
        cardInner.style.backgroundColor = 'rgba(25, 135, 84, 0.15)'; // لون أخضر فاتح
        
        setTimeout(() => {
            cardInner.style.backgroundColor = originalBg;
        }, 1500);

        // 3. إعادة القائمة للوضع الافتراضي عشان يقدر يختار نفس الشيخ تاني لو حب
        setTimeout(() => {
            e.target.value = ""; 
            e.target.blur(); // إخفاء الفوكس
        }, 800);
    }
}

// ─── الجدولة الدقيقة لجميع الصلوات ──────────────────────────────────────────
export const scheduleAllPrayers = async (prayerData) => {
    try {
        if (!Capacitor.isNativePlatform()) return;

        // 1. مسح الإشعارات السابقة المعلقة لمنع التراكم
        const pending = await LocalNotifications.getPending();
        const allPendingIds = pending.notifications.map(n => ({ id: n.id }));
        
        const idsToCancel = [];
        // نمسح النطاق الخاص بالصلوات (من 1000 لـ 7000 مثلاً حسب طريقتك)
        for (let p = 1; p <= 5; p++) {
            for (let d = 0; d <= 6; d++) {
                idsToCancel.push({ id: p * 1000 + 1000 + d });
            }
        }
        
        const combined = [...idsToCancel, ...allPendingIds.filter(p => p.id >= 1000 && p.id <= 7000)];
        if (combined.length > 0) {
            try { await LocalNotifications.cancel({ notifications: combined }); } catch(e) { console.warn('Cancel Old Notifications:', e); }
        }

        const notifications = [];
        const targetPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        const prayerNamesAr = { 'Fajr': 'الفجر', 'Dhuhr': 'الظهر', 'Asr': 'العصر', 'Maghrib': 'المغرب', 'Isha': 'العشاء' };
        const prayerIds     = { 'Fajr': 1, 'Dhuhr': 2, 'Asr': 3, 'Maghrib': 4, 'Isha': 5 };

        // الحصول على التوقيتات الدقيقة (Timestamps) من الباك إند
        // إذا لم تكن موجودة (مثلاً كاش قديم)، نستخدم الـ timings القديمة كحل بديل مؤقت
        const timestamps = prayerData.rawTimestamps || null;
        const nowRefTime = Date.now() + (30 * 1000); // 30 ثانية Buffer لمنع جدولة إشعار في الماضي فوراً

        targetPrayers.forEach((key) => {
            let baseTimeMs;

            if (timestamps && timestamps[key]) {
                // 🌟 الحل السحري: استخدام الوقت الدقيق بالملي ثانية 🌟
                baseTimeMs = timestamps[key];
            } else {
                // Fallback للطريقة القديمة إذا لم يتم تحديث الباك إند بعد
                const timeStr = prayerData.timings[key];
                if (!timeStr) return;
                const cleanTime = timeStr.trim();
                const isPM = cleanTime.toUpperCase().includes('PM');
                const isAM = cleanTime.toUpperCase().includes('AM');
                const parts = cleanTime.split(' ')[0].split(':');
                if (parts.length < 2) return;

                let hours = parseInt(parts[0], 10);
                let minutes = parseInt(parts[1], 10);
                if (isNaN(hours) || isNaN(minutes)) return;

                if (isPM && hours !== 12) hours += 12;
                if (isAM && hours === 12) hours = 0;
                
                const d = new Date();
                baseTimeMs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes, 0, 0).getTime();
            }

            // الجدولة لمدة 7 أيام قادمة
            for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
                // نضيف 24 ساعة (بالملي ثانية) لكل يوم إضافي
                const scheduleTimeMs = baseTimeMs + (dayOffset * 24 * 60 * 60 * 1000);
                const prayerDate = new Date(scheduleTimeMs);

                // 🌟 منع جدولة إشعار في الماضي 🌟
                if (prayerDate.getTime() <= nowRefTime) continue;

                const uniqueId = prayerIds[key] * 1000 + 1000 + dayOffset;

                notifications.push({
                    title: `حان موعد صلاة ${prayerNamesAr[key]} 🕌`,
                    body: `أرحنا بها يا بلال.. حان وقت صلاة ${prayerNamesAr[key]}`,
                    id: uniqueId,
                    schedule: { at: prayerDate, allowWhileIdle: true },
                    channelId: 'azan-channel',
                    smallIcon: 'ic_notification',
                    sound: 'azan_short.mp3',
                    actionTypeId: 'OPEN_PRAYERS',
                });
            }
        });

        if (notifications.length > 0) {
            await LocalNotifications.schedule({ notifications });
            console.log(`✅ [PRAYER] تم جدولة ${notifications.length} إشعار دقيق.`);
        }
    } catch (e) {
        console.error('❌ [PRAYER] خطأ في جدولة الإشعارات:', e);
    }
};

export function loadPrayers() {
  const container  = document.getElementById('prayers-list');
  const locationEl = document.getElementById('location-name');
  const hijriEl    = document.getElementById('hijri-date');

  if (locationEl) locationEl.innerText = 'جارى تحديد موقعك...';

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
          container.insertAdjacentHTML('beforeend', `
            <div class="w-100 text-center mt-2">
              <small class="text-muted"><i class="fas fa-history me-1"></i> تم عرض آخر مواقيت محفوظة لعدم توفر الإنترنت</small>
            </div>
          `);
        }
        
        // 🔥 التعديل الثاني: التحقق الذكي (كل 6 أيام) في وضع الأوفلاين
        if (Capacitor.isNativePlatform()) {
          const lastScheduled = await localforage.getItem('prayers_last_scheduled');
          const lastScheduledTime = lastScheduled ? new Date(lastScheduled).getTime() : 0;
          const daysSinceLastSchedule = (Date.now() - lastScheduledTime) / (1000 * 60 * 60 * 24);
          
          if (daysSinceLastSchedule >= 1) {
              await scheduleAllPrayers({ timings: cachedData.timings, rawTimestamps: cachedData.rawTimestamps });

              await localforage.setItem('prayers_last_scheduled', new Date().toISOString());
          }
        }

        return true;
      }
    } catch (e) { console.warn("خطأ في جلب المواقيت من الكاش", e); }
    return false;
  };

  const showOfflineMessage = async () => {
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

  navigator.geolocation.getCurrentPosition(
    async position => {
      if (!navigator.onLine) { await showOfflineMessage(); return; }
      try {
        const { latitude, longitude } = position.coords;
        const res     = await axios.get(`/api/v1/prayers?lat=${latitude}&lng=${longitude}`);
        const timings = res.data.data.timings;
        const hijri   = res.data.data.hijri;
        if (!container) return;
        if (hijriEl) hijriEl.innerText = hijri;
        let cityName = 'موقعك الحالي';
        try {
          const cityRes = await axios.get(`/api/v1/prayers/get-location?lat=${latitude}&lon=${longitude}`);
          const address = cityRes.data.data.address;
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
      //  const hijri = res.data.data.hijri;
const rawTimestamps = res.data.data.rawTimestamps;
await localforage.setItem('offline_prayers', { timings, rawTimestamps, hijri, cityName, savedAt: Date.now() });
        
        // 🔥 التحقق الذكي (كل 6 أيام) في وضع الأونلاين
        if (Capacitor.isNativePlatform()) {
          const lastScheduled = await localforage.getItem('prayers_last_scheduled');
          const lastScheduledTime = lastScheduled ? new Date(lastScheduled).getTime() : 0;
          const daysSinceLastSchedule = (Date.now() - lastScheduledTime) / (1000 * 60 * 60 * 24);
          
          if (daysSinceLastSchedule >= 1) {
              await scheduleAllPrayers({ timings, rawTimestamps: res.data.data.rawTimestamps });
              await localforage.setItem('prayers_last_scheduled', new Date().toISOString());
          }
        }
      } catch (err) {
        console.error('فشل جلب مواقيت الصلاة:', err);
        await showOfflineMessage(); 
      }
    },
    async (geoErr) => {
      console.warn('Geolocation error:', geoErr.message);
      const isPermissionDenied = geoErr.code === 1 || 
      (geoErr.message && (geoErr.message.toLowerCase().includes('permission') || geoErr.message.toLowerCase().includes('denied')));

      if (isPermissionDenied) {
        if (locationEl) locationEl.innerText = 'مواقيت الصلاة';
        if (hijriEl) hijriEl.innerText = '';
        if (container) {
          container.innerHTML = `
            <div class="col-12">
              <div class="alert alert-danger text-center py-3 mb-0" style="border-radius:12px;">
                <i class="fas fa-map-marker-alt fa-2x mb-2 d-block text-danger"></i>
                <p class="mb-1 fw-bold">إذن الموقع مطلوب</p>
                <p class="mb-0 small text-muted">يرجى السماح بالوصول للموقع لحساب أوقات الصلاة</p>
              </div>
            </div>`;
        }
        Swal.fire({
          icon: 'warning', title: '📍 نحتاج إذن الموقع',
          html: `<p class="mb-2">لعرض مواقيت الصلاة في مدينتك، نحتاج إذنك للوصول للموقع.</p><p class="text-muted small mb-0"><i class="fas fa-lock me-1"></i> لتفعيله: إعدادات المتصفح ← الموقع ← السماح</p>`,
          confirmButtonText: 'حسناً', confirmButtonColor: '#198754',
        });
      } else {
        await showOfflineMessage();
      }
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

// ─── تطبيع النص العربي للبحث الذكي 
// نفس المنطق بالضبط زي الـ Backend عشان النتائج تتطابق
const stripTashkeel = (text) => {
  if (!text) return '';
  return text
    // إزالة التشكيل والحركات كاملاً (تنوين، شدة، مد، وصلة...)
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g, '')
    // توحيد أشكال الألف (أ، إ، آ، ٱ) → ا
    .replace(/[أإآٱ]/g, 'ا')
    // توحيد الألف المقصورة → ي
    .replace(/ى/g, 'ي')
    // توحيد الواو بهمزة → و
    .replace(/ؤ/g, 'و')
    // توحيد الياء بهمزة → ي
    .replace(/ئ/g, 'ي')
    // إزالة علامة الوقف
    .replace(/۩/g, '')
    .trim();
};

let globalSearchIndex = null;

const loadSearchIndex = async () => {
  if (globalSearchIndex) return globalSearchIndex; 

  // 1. ندور عليه في الـ Local Storage
  const cachedIndex = await localforage.getItem('quran_search_index');
  if (cachedIndex) {
    globalSearchIndex = cachedIndex;
    return cachedIndex;
  }

  // 2. لو مش موجود خالص، نحمله مرة واحدة بس من السيرفر
  try {
    console.log('⏳ جاري تحميل فهرس البحث لأول مرة...');
    const res = await fetch('/assets/quran_search_index.json');
    const data = await res.json();
    
    // نحفظه عشان منكلمش السيرفر تاني أبداً
    await localforage.setItem('quran_search_index', data);
    globalSearchIndex = data;
    return data;
  } catch (err) {
    console.error('❌ فشل تحميل فهرس البحث', err);
    return null;
  }
};

// ─── البحث في الفهرس (أوفلاين - صاروخ) ────────
const searchInCachedPages = async (query) => {
  const normalizedQuery = stripTashkeel(query);
  if (!normalizedQuery) return [];

  // جلب الفهرس
  const index = await loadSearchIndex();
  if (!index) return [];

  const results = [];

  // الدوران داخل مصفوفة الفهرس في الميموري (بياخد 2 مللي ثانية بالظبط)
  for (const ayah of index) {
    const cleanText = stripTashkeel(ayah.t);

    if (cleanText.includes(normalizedQuery)) {
      results.push({
        text: ayah.t,
        surahNameAr: ayah.s,
        surahNumber: ayah.sn,
        ayahNumber: ayah.an,
        page: ayah.p,
      });

      // لو لقينا 30 نتيجة، نوقف بحث عشان الأداء
      if (results.length >= 30) break;
    }
  }

  // ترتيب النتائج عشان اللي بتبدأ بالكلمة تظهر الأول
  results.sort((a, b) => {
    const aIdx = stripTashkeel(a.text).indexOf(normalizedQuery);
    const bIdx = stripTashkeel(b.text).indexOf(normalizedQuery);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return (a.surahNumber - b.surahNumber) || (a.ayahNumber - b.ayahNumber);
  });

  return results;
};

// ─── تلوين كلمة البحث في النص (يشتغل حتى مع وجود تشكيل) ────────────────────
const highlightQuery = (originalText, query) => {
  if (!query || !originalText) return originalText;

  const normalizedQuery = stripTashkeel(query);
  if (!normalizedQuery) return originalText;

  // نبني خريطة: index في النص المطبّع (بدون تشكيل) → index في النص الأصلي
  const cleanChars = [];  // الأحرف الحقيقية فقط بعد التطبيع
  const indexMap   = [];  // indexMap[i] = موضع الحرف i في النص الأصلي

  for (let j = 0; j < originalText.length; j++) {
    const c = stripTashkeel(originalText[j]);
    if (c.length > 0) {   // حرف حقيقي (مش تشكيل/حركة)
      cleanChars.push(c);
      indexMap.push(j);
    }
  }

  const cleanText = cleanChars.join('');

  // نجمع كل مواضع ظهور الـ query في النص المطبّع
  const ranges = [];
  let from = 0;
  while (from <= cleanText.length - normalizedQuery.length) {
    const idx = cleanText.indexOf(normalizedQuery, from);
    if (idx === -1) break;

    const origStart = indexMap[idx];
    const lastClean = idx + normalizedQuery.length - 1;
    // نهاية النطاق = بداية الحرف المطبّع التالي (يشمل أي تشكيل لاحق)
    const origEnd = lastClean + 1 < indexMap.length
      ? indexMap[lastClean + 1]
      : originalText.length;

    ranges.push({ start: origStart, end: origEnd });
    from = idx + normalizedQuery.length;
  }

  if (ranges.length === 0) return originalText;

  // نبني النص النهائي بإدخال mark tags
  let result = '';
  let cursor = 0;
  for (const { start, end } of ranges) {
    result += originalText.slice(cursor, start);
    result += `<mark class="search-highlight">${originalText.slice(start, end)}</mark>`;
    cursor = end;
  }
  result += originalText.slice(cursor);
  return result;
};

const renderSearchResults = (ayahs, resultsContainer, searchInput) => {
  resultsContainer.innerHTML = '';
  if (ayahs.length === 0) {
    resultsContainer.innerHTML = '<div class="list-group-item text-center text-muted py-3"><i class="fas fa-search me-2"></i>لا توجد نتائج</div>';
    return;
  }
  
  const query = searchInput.value.trim();
  
  ayahs.forEach(ayah => {
    const item        = document.createElement('a');
    item.className    = 'list-group-item list-group-item-action search-result-item';
    item.style.cursor = 'pointer';
    const realAyahNum = ayah.ayahNumber || ayah.numberInSurah;

    // تلوين ذكي يشتغل حتى لو البحث بدون تشكيل والنص بالتشكيل
// 🌟 تنظيف النص وإضافة الكشيدة قبل التلوين
    let cleanText = ayah.text || '';
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    if (typeof UTHMANI_FIXES !== 'undefined' && UTHMANI_FIXES) {
      Object.entries(UTHMANI_FIXES).forEach(([wrong, correct]) => {
        cleanText = cleanText.split(wrong).join(correct);
      });
    }

    // تلوين ذكي للنص النظيف
    const highlightedText = highlightQuery(cleanText, query);
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="fw-bold text-success small">
          <i class="fas fa-book-open me-1" style="font-size:0.75em;"></i>
          ${ayah.surahNameAr} - آية ${realAyahNum}
        </span>
        <span class="badge bg-light text-dark border">ص ${ayah.page}</span>
      </div>
     <p class="mb-0 small text-end quran-result-text" style="font-family: 'KFGQPC', 'Amiri Quran', serif; font-size: 1.3em; line-height: 1.8;">${highlightedText}</p>
    `;

    item.addEventListener('click', (e) => {
      e.preventDefault();
      resultsContainer.classList.add('d-none');
      searchInput.value = '';
      // استخدام showSection للتنقل الصحيح - هييجي بدون fullscreen-reading
      if (typeof window.showSection === 'function') {
        window._imageMushafActive = false; // تأكد إننا في المصحف النصي
        window.showSection('quran');
      } else {
        document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('d-none'));
        const quranSection = document.getElementById('quran-section');
        if (quranSection) quranSection.classList.remove('d-none');
        document.body.classList.remove('fullscreen-reading', 'swipe-nav-active');
        window.scrollTo(0, 0);
      }
      window.history.pushState({ section: 'quran' }, '', `/quran/${ayah.page}`);
      setTimeout(() => {
        if (window.loadQuranPage) window.loadQuranPage(ayah.page, ayah.surahNumber, realAyahNum);
      }, 80);
    });

    resultsContainer.appendChild(item);
  });
};

export const initSearch = () => {
  const searchInput      = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');
  if (!searchInput || !resultsContainer) return;

  let timeoutId;

  // ─── دالة البحث الأوفلاين الداخلية ─────────────────────────────────────────
 const doOfflineSearch = async (query) => {
    try {
      const ayahs = await searchInCachedPages(query);

      if (ayahs.length === 0) {
        resultsContainer.innerHTML = '<div class="list-group-item text-center text-muted py-3"><i class="fas fa-search me-2"></i>لا توجد نتائج مطابقة</div>';
      } else {
        // لو لقى نتايج، هيبعتها للدالة اللي بتنظف النص وترسمه (اللي ظبطناها المرة اللي فاتت)
        renderSearchResults(ayahs, resultsContainer, searchInput);
      }
    } catch (err) {
      console.error('[SEARCH] خطأ في البحث المحلي:', err);
      resultsContainer.innerHTML = '<div class="list-group-item text-danger text-center">حدث خطأ أثناء البحث</div>';
    }
  };

 searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    // مسح النتائج لو المستخدم مسح الكتابة
    if (query.length < 2) {
      resultsContainer.classList.add('d-none');
      resultsContainer.innerHTML = '';
      return;
    }

    clearTimeout(timeoutId);
    
    // تقليل الـ debounce لـ 200ms عشان سرعة الاستجابة
    timeoutId = setTimeout(async () => {
      resultsContainer.innerHTML = '<div class="list-group-item text-center"><div class="spinner-border spinner-border-sm text-success me-2" role="status"></div>جاري البحث...</div>';
      resultsContainer.classList.remove('d-none');

      // 🌟 الاعتماد الكلي على البحث المحلي (أوفلاين) وتجاهل الـ API تماماً
      await doOfflineSearch(query);
      
    }, 200);
  });

  // إغلاق النتائج عند الضغط خارجها
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.classList.add('d-none');
    }
  });

  // مسح البحث عند الضغط على Escape
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      resultsContainer.classList.add('d-none');
      resultsContainer.innerHTML = '';
    }
  });
};



// Qibla Compass 
const calculateQiblaBearing = (lat, lng) => {
  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;

  const lat1 = (lat * Math.PI) / 180;
  const lat2 = (KAABA_LAT * Math.PI) / 180;
  const dLng = ((KAABA_LNG - lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

let _qiblaWatchId      = null;
let _qiblaBearing      = null;
let _compassHeading    = 0;
let _orientationActive = false;

const cleanupQibla = () => {
  window.removeEventListener('deviceorientationabsolute', _handleOrientation);
  window.removeEventListener('deviceorientation',         _handleOrientation);
  _orientationActive = false;
};

// 🧭 معالج البوصلة وتوجيه المستخدم
const _handleOrientation = (event) => {
  let heading = null;

  // دعم iOS Safari
  if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
    heading = event.webkitCompassHeading;
  }
  // دعم Android absolute (أدق)
  else if (event.absolute === true && event.alpha !== null) {
    heading = (360 - event.alpha) % 360;
  }
  // Fallback لأجهزة الأندرويد الأقدم
  else if (event.alpha !== null) {
    heading = (360 - event.alpha) % 360;
  }

  if (heading === null || isNaN(heading)) return;

  // 🌟 [اللمسة السحرية]: تعويض ميل الشاشة عشان البوصلة تفضل دقيقة لو الموبايل مال
  let screenOrientation = 0;
  if (window.screen && window.screen.orientation && window.screen.orientation.angle !== undefined) {
      screenOrientation = window.screen.orientation.angle;
  } else if (typeof window.orientation !== 'undefined') {
      screenOrientation = window.orientation;
  }
  heading = (heading + screenOrientation) % 360;

  _compassHeading = heading;

  const dial   = document.getElementById('qibla-dial');
  const text   = document.getElementById('qibla-angle-text');
  const status = document.getElementById('qibla-status');

  if (!dial || _qiblaBearing === null) return;

  // الكعبة في الـ CSS مصممة عند الساعة 12 (بدون الحاجة لإضافة 180 درجة)
  const rotation = (_qiblaBearing - _compassHeading + 360) % 360;
  dial.style.transform = `rotate(${rotation}deg)`;

  const diff = Math.abs((_qiblaBearing - _compassHeading + 360) % 360);
  const normalizedDiff = diff > 180 ? 360 - diff : diff;

  // تحديد الاتجاه (يميناً أو يساراً) بشكل ذكي
  let directionText = '';
  if (normalizedDiff > 5) {
      directionText = diff < 180 ? 'يميناً ↻' : 'يساراً ↺';
  }

  if (text) text.innerText = `${Math.round(_qiblaBearing)}°`;

  if (status) {
    if (normalizedDiff <= 5) {
      status.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-kaaba me-1"></i> أنت تواجه القبلة الآن ✅</span>`;
      if (navigator.vibrate) navigator.vibrate(50); // فايبريشن خفيف
    } else {
      status.innerText = `أدر الهاتف ${Math.round(normalizedDiff)}° ${directionText}`;
    }
  }
};

window._qiblaOrientationHandler = _handleOrientation;


// 🌍 التهيئة - نظام 3 طبقات عبقري: GPS دقيق -> GPS تقريبي -> IP Location
window.initQibla = async () => {
  const statusEl = document.getElementById('qibla-status');
  const textEl   = document.getElementById('qibla-angle-text');

  if (typeof cleanupQibla === 'function') cleanupQibla();
  if (statusEl) statusEl.innerText = 'جاري التهيئة...';

  // طلب صلاحيات الحساس في الـ iOS
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm !== 'granted') {
        if (statusEl) statusEl.innerText = '⚠️ يرجى السماح بالوصول للحساس من إعدادات المتصفح';
        return;
      }
    } catch (err) { console.warn('Orientation permission error:', err); }
  }

  // دالة تشغيل البوصلة بمجرد توفر الموقع الجغرافي
  const startCompassEngine = (lat, lng, sourceMsg) => {
    _qiblaBearing = calculateQiblaBearing(lat, lng);
    console.log(`📍 الموقع (${sourceMsg}): ${lat}, ${lng} | 🕋 القبلة: ${_qiblaBearing}°`);

    if (textEl)   textEl.innerText = `${Math.round(_qiblaBearing)}°`;
    if (statusEl) statusEl.innerText = 'ضع الهاتف بشكل مسطح وحركه ببطء لمعايرة البوصلة...';

    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', _handleOrientation, { passive: true });
    } else {
      window.addEventListener('deviceorientation', _handleOrientation, { passive: true });
    }
    _orientationActive = true;
  };

  if (!navigator.geolocation) {
    if (statusEl) statusEl.innerText = 'جهازك لا يدعم تحديد الموقع';
    return;
  }

  if (statusEl) statusEl.innerText = 'جاري تحديد الموقع (دقة عالية)...';

  // 🥇 الطبقة الأولى: محاولة جلب موقع عالي الدقة (8 ثوانٍ كحد أقصى)
  navigator.geolocation.getCurrentPosition(
    (pos) => startCompassEngine(pos.coords.latitude, pos.coords.longitude, 'GPS دقيق'),
    (err) => {
      console.warn('GPS دقيق فشل، جاري المحاولة بدقة أقل...', err.message);
      if (statusEl) statusEl.innerText = 'جاري البحث عن موقع تقريبي...';

      // 🥈 الطبقة الثانية: محاولة جلب موقع منخفض الدقة / متكيش (5 ثوانٍ كحد أقصى)
      navigator.geolocation.getCurrentPosition(
        (pos) => startCompassEngine(pos.coords.latitude, pos.coords.longitude, 'GPS تقريبي'),
        async (err2) => {
          const isPermissionDenied = err2.code === 1;

          // لو المستخدم هو اللي رفض يدي صلاحية الموقع
          if (isPermissionDenied) {
            if (statusEl) statusEl.innerText = '⚠️ يرجى السماح بتحديد الموقع لعرض اتجاه القبلة';
            Swal.fire({
              icon: 'warning',
              title: 'صلاحية الموقع مطلوبة',
              text: 'لحساب اتجاه القبلة، يجب السماح للتطبيق بالوصول إلى موقعك الجغرافي.',
              confirmButtonText: 'حسناً',
              confirmButtonColor: '#198754'
            });
            return;
          }

          // 🥉 الطبقة الثالثة: لو الـ GPS مقفول أو جوه مبنى، نجيب الموقع بالـ IP (إنترنت)
          console.warn('GPS فشل تماماً، جاري استخدام IP location...', err2.message);
          if (statusEl) statusEl.innerText = 'جاري تحديد الموقع عبر الإنترنت...';

          try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            if (data.latitude && data.longitude) {
              startCompassEngine(data.latitude, data.longitude, 'شبكة الإنترنت');
            } else {
              throw new Error('Invalid IP data');
            }
          } catch (ipErr) {
            console.error('IP fallback failed', ipErr);
            if (statusEl) statusEl.innerText = '❌ تعذّر تحديد موقعك، تأكد من تشغيل الـ GPS أو الإنترنت.';
          }
        },
        { timeout: 5000, maximumAge: 60000, enableHighAccuracy: false } // إعدادات الطبقة الثانية
      );
    },
    { timeout: 8000, maximumAge: 0, enableHighAccuracy: true } // إعدادات الطبقة الأولى
  );
};


// ─── ✅ الأذكار - Azkar Data & Loader 


const AZKAR_DATA = {
 morning: {
    title: 'أذكار الصباح',
    icon: 'fas fa-sun',
    color: '#f59e0b',
    items: [
      { 
        text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ، اللَّهُ لاَ إِلَـهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ، لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ، مَن ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلاَّ بِإِذْنِهِ، يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ، وَلاَ يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاَّ بِمَا شَاء، وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالأَرْضَ، وَلاَ يَؤُودُهُ حِفْظُهُمَا، وَهُوَ الْعَلِيُّ الْعَظِيمُ', 
        count: 1, 
        label: 'آية الكرسي' 
      },
      { 
        text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم، قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', 
        count: 3, 
        label: 'سورة الإخلاص' 
      },
      { 
        text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم، قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ، مِن شَرِّ مَا خَلَقَ، وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ، وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', 
        count: 3, 
        label: 'سورة الفلق' 
      },
      { 
        text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم، قُلْ أَعُوذُ بِرَبِّ النَّاسِ، مَلِكِ النَّاسِ، إِلَـهِ النَّاسِ، مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ، الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ، مِنَ الْجِنَّةِ وَالنَّاسِ', 
        count: 3, 
        label: 'سورة الناس' 
      },
      { 
        text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ', 
        count: 1, 
        label: 'دعاء الصباح' 
      },
      { 
        text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ', 
        count: 1, 
        label: '' 
      },
      { 
        text: 'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ', 
        count: 1, 
        label: 'سيد الاستغفار' 
      },
      { 
        text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي', 
        count: 1, 
        label: '' 
      },
      { 
        text: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لاَ إِلَهَ إِلاَّ أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لاَ إِلَهَ إِلاَّ أَنْتَ', 
        count: 3, 
        label: '' 
      },
      { 
        text: 'بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', 
        count: 3, 
        label: '' 
      },
      { 
        text: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالإِسْلاَمِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا', 
        count: 3, 
        label: '' 
      },
      { 
        text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلاَ تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ', 
        count: 1, 
        label: '' 
      },
      { 
        text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ: فَتْحَهُ، وَنَصْرَهُ، وَنُورَهُ، وَبَرَكَتَهُ، وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ', 
        count: 1, 
        label: '' 
      },
      { 
        text: 'أَصْبَحْنَا عَلَى فِطْرَةِ الإِسْلاَمِ، وَعَلَى كَلِمَةِ الإِخْلاَصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ', 
        count: 1, 
        label: '' 
      },
      { 
        text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ', 
        count: 3, 
        label: '' 
      },
      { 
        text: 'اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ، فَمِنْكَ وَحْدَكَ لاَ شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ', 
        count: 1, 
        label: '' 
      },
      { 
        text: 'حَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ', 
        count: 7, 
        label: '' 
      },
      { 
        text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلاً مُتَقَبَّلاً', 
        count: 1, 
        label: '' 
      },
      { 
        text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', 
        count: 100, 
        label: '' 
      },
      { 
        text: 'لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', 
        count: 10, 
        label: '' 
      },
      { 
        text: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', 
        count: 100, 
        label: '' 
      },
      { 
        text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', 
        count: 10, 
        label: '' 
      }
    ]
  },
evening: {
    title: 'أذكار المساء',
    icon: 'fas fa-moon',
    color: '#1e293b',
    items: [
      {
        text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ، اللَّهُ لاَ إِلَـهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلاَّ بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلاَ يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاَّ بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالأَرْضَ وَلاَ يَؤُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ',
        count: 1,
        label: 'آية الكرسي'
      },
        { 
        text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم، قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', 
        count: 3, 
        label: 'سورة الإخلاص' 
      },
      { 
        text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم، قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ، مِن شَرِّ مَا خَلَقَ، وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ، وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', 
        count: 3, 
        label: 'سورة الفلق' 
      },
      { 
        text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم، قُلْ أَعُوذُ بِرَبِّ النَّاسِ، مَلِكِ النَّاسِ، إِلَـهِ النَّاسِ، مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ، الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ، مِنَ الْجِنَّةِ وَالنَّاسِ', 
        count: 3, 
        label: 'سورة الناس' 
      },
      {
        text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
        count: 1,
        label: 'دعاء المساء'
      },
      {
        text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
        count: 1,
        label: ''
      },
      {
        text: 'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ',
        count: 1,
        label: 'سيد الاستغفار'
      },
      {
        text: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لاَ إِلَهَ إِلاَّ أَنْتَ',
        count: 3,
        label: ''
      },
      {
        text: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لاَ إِلَهَ إِلاَّ أَنْتَ',
        count: 3,
        label: ''
      },
      {
        text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي',
        count: 1,
        label: 'دعاء العافية'
      },
      {
        text: 'اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ',
        count: 1,
        label: ''
      },
      {
        text: 'بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
        count: 3,
        label: ''
      },
      {
        text: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالإِسْلاَمِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا',
        count: 3,
        label: ''
      },
      {
        text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلاَ تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
        count: 1,
        label: ''
      },
      {
        text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذِهِ اللَّيْلَةِ فَتْحَهَا وَنَصْرَهَا وَنُورَهَا وَبَرَكَتَهَا وَهُدَاهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهَا وَشَرِّ مَا بَعْدَهَا',
        count: 1,
        label: ''
      },
      {
        text: 'أَمْسَيْنَا عَلَى فِطْرَةِ الإِسْلاَمِ، وَعَلَى كَلِمَةِ الإِخْلاَصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ',
        count: 1,
        label: ''
      },
      {
        text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        count: 100,
        label: ''
      },
      {
        text: 'لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        count: 10, 
        label: ''
      },
      {
        text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
        count: 3,
        label: ''
      },
      {
        text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
        count: 10,
        label: 'الصلاة على النبي'
      }
    ]
  },
post_prayer: {
    title: 'أذكار بعد الصلاة',
    icon: 'fas fa-mosque',
    color: '#1d4ed8',
    items: [
      { text: 'أَسْتَغْفِرُ اللَّهَ', count: 3, label: '' },
      { text: 'اللَّهُمَّ أَنْتَ السَّلاَمُ، وَمِنْكَ السَّلاَمُ، تَبَارَكْتَ يَا ذَا الْجَلاَلِ وَالإِكْرَامِ', count: 1, label: '' },
      { text: 'لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لاَ مَانِعَ لِمَا أَعْطَيْتَ، وَلاَ مُعْطِيَ لِمَا مَنَعْتَ، وَلاَ يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ', count: 1, label: '' },
      { text: 'لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ، وَلاَ نَعْبُدُ إِلاَّ إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ، لاَ إِلَهَ إِلاَّ اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ', count: 1, label: '' },
      { text: 'سُبْحَانَ اللَّهِ', count: 33, label: '' },
      { text: 'الْحَمْدُ لِلَّهِ', count: 33, label: '' },
      { text: 'اللَّهُ أَكْبَرُ', count: 33, label: '' },
      { text: 'لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', count: 1, label: 'تتمة المائة' },
      { text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ، وَشُكْرِكَ، وَحُسْنِ عِبَادَتِكَ', count: 1, label: 'دعاء معاذ بن جبل' },
      { text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ، اللَّهُ لاَ إِلَـهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ، لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ، مَن ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلاَّ بِإِذْنِهِ، يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ، وَلاَ يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاَّ بِمَا شَاء، وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالأَرْضَ، وَلاَ يَؤُودُهُ حِفْظُهُمَا، وَهُوَ الْعَلِيُّ الْعَظِيمُ', count: 1, label: 'آية الكرسي' },
      { text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ، قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', count: 1, label: 'سورة الإخلاص' },
      { text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ، قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ، مِن شَرِّ مَا خَلَقَ، وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ، وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ', count: 1, label: 'سورة الفلق' },
      { text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ، قُلْ أَعُوذُ بِرَبِّ النَّاسِ، مَلِكِ النَّاسِ، إِلَـهِ النَّاسِ، مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ، الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ، مِنَ الْجِنَّةِ وَالنَّاسِ', count: 1, label: 'سورة الناس' },
      { text: 'اللَّهُمَّ أَجِرْنِي مِنَ النَّارِ', count: 7, label: 'بعد صلاة الفجر والمغرب' },
      { text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلاً مُتَقَبَّلاً', count: 1, label: 'بعد صلاة الفجر' }
    ]
  },
  sleep: {
    title: 'أذكار النوم',
    icon: 'fas fa-bed',
    color: '#6b7280',
    items: [
      { text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ، قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ. (يجمع كفيه وينفث فيهما ثم يمسح بهما ما استطاع من جسده)', count: 3, label: 'سورة الإخلاص' },
      { text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ، قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ، مِن شَرِّ مَا خَلَقَ، وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ، وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ.', count: 3, label: 'سورة الفلق' },
      { text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ، قُلْ أَعُوذُ بِرَبِّ النَّاسِ، مَلِكِ النَّاسِ، إِلَـهِ النَّاسِ، مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ، الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ، مِنَ الْجِنَّةِ وَالنَّاسِ.', count: 3, label: 'سورة الناس' },
      { text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ، اللَّهُ لاَ إِلَـهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ، لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ، مَن ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلاَّ بِإِذْنِهِ، يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ، وَلاَ يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلاَّ بِمَا شَاء، وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالأَرْضَ، وَلاَ يَؤُودُهُ حِفْظُهُمَا، وَهُوَ الْعَلِيُّ الْعَظِيمُ', count: 1, label: 'آية الكرسي' },
      { text: 'ءَامَنَ ٱلرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَٱلْمُؤْمِنُونَ ۚ كُلٌّ ءَامَنَ بِٱللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رَّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ ٱلْمَصِيرُ * لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا ٱكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى ٱلَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَٱعْفُ عَنَّا وَٱغْفِرْ لَنَا وَٱرْحَمْنَا ۚ أَنتَ مَوْلَانَا فَٱنصُرْنَا عَلَى ٱلْقَوْمِ ٱلْكَافِرِينَ', count: 1, label: 'خواتيم سورة البقرة' },
      { text: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا، بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ', count: 1, label: '' },
      { text: 'اللَّهُمَّ إِنَّكَ خَلَقْتَ نَفْسِي وَأَنْتَ تَوَفَّاهَا، لَكَ مَمَاتُهَا وَمَحْيَاهَا، إِنْ أَحْيَيْتَهَا فَاحْفَظْهَا، وَإِنْ أَمَتَّهَا فَاغْفِرْ لَهَا. اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ', count: 1, label: '' },
      { text: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', count: 3, label: '' },
      { text: 'بِسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', count: 1, label: '' },
      { text: 'سُبْحَانَ اللَّهِ', count: 33, label: '' },
      { text: 'الْحَمْدُ لِلَّهِ', count: 33, label: '' },
      { text: 'اللَّهُ أَكْبَرُ', count: 34, label: '' },
      { text: 'اللَّهُمَّ رَبَّ السَّمَاوَاتِ السَّبْعِ وَرَبَّ الأَرْضِ، وَرَبَّ الْعَرْشِ الْعَظِيمِ، رَبَّنَا وَرَبَّ كُلِّ شَيْءٍ، فَالِقَ الْحَبِّ وَالنَّوَى، وَمُنْزِلَ التَّوْرَاةِ وَالإِنْجِيلِ، وَالْفُرْقَانِ، أَعُوذُ بِكَ مِنْ شَرِّ كُلِّ شَيْءٍ أَنْتَ آخِذٌ بِنَاصِيَتِهِ. اللَّهُمَّ أَنْتَ الأَوَّلُ فَلَيْسَ قَبْلَكَ شَيْءٌ، وَأَنْتَ الآخِرُ فَلَيْسَ بَعْدَكَ شَيْءٌ، وَأَنْتَ الظَّاهِرُ فَلَيْسَ فَوْقَكَ شَيْءٌ، وَأَنْتَ الْبَاطِنُ فَلَيْسَ دُونَكَ شَيْءٌ، اقْضِ عَنَّا الدَّيْنَ وَأَغْنِنَا مِنَ الْفَقْرِ', count: 1, label: '' },
      { text: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا، وَكَفَانَا، وَآوَانَا، فَكَمْ مِمَّنْ لاَ كَافِيَ لَهُ وَلاَ مُؤْوِيَ', count: 1, label: '' },
      { text: 'اللَّهُمَّ عَالِمَ الغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءاً أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ', count: 1, label: '' },
      { text: 'اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لاَ مَلْجَأَ وَلاَ مَنْجَأَ مِنْكَ إِلاَّ إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ', count: 1, label: 'يُجعل هذا الدعاء آخر ما يقال قبل النوم' },
    ]
  },
};

/**
 * تحميل وعرض قائمة أذكار بالتصميم الجديد
 * @param {string} category - morning | evening | post_prayer | sleep
 */
window.loadAzkarList = async (category) => {
  const data = AZKAR_DATA[category];
  if (!data) return;

  const titleEl     = document.getElementById('azkar-detail-title');
  const containerEl = document.getElementById('azkar-detail-container');
  if (!titleEl || !containerEl) return;

  // 🔴 التعديل السحري: إزالة الخلفية البيضاء للعنوان برمجياً ليتوافق مع الـ Dark Mode 🔴
  const headerDiv = titleEl.closest('.sticky-top');
  if (headerDiv) {
    headerDiv.classList.remove('bg-white');
    headerDiv.style.backgroundColor = 'var(--bg-color)';
    headerDiv.style.transition = 'background-color 0.3s ease';
  }

  // تحديث العنوان
  titleEl.innerHTML = `<i class="${data.icon} me-2" style="color:${data.color}"></i>${data.title}`;

  // تحميل حالة الإنجاز (تدعم الأرقام أو 'done' أو true للبيانات القديمة)
  const savedProgress = await localforage.getItem(`azkar_progress_${category}`) || {};
  const totalItems = data.items.length;
  
  // دالة لحساب المكتمل
  const getDoneCount = () => Object.values(savedProgress).filter(v => v === 'done' || v === true).length;

  // 1. بناء الهيكل الأساسي وشريط التقدم
  let html = `
    <div class="progress-wrap">
      <div class="progress-row">
        <span class="progress-label" style="color: var(--text-muted)">التقدم</span>
        <span class="progress-count" id="prog-text">0 / ${totalItems}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" id="prog-fill" style="width:0%">
          <div class="progress-thumb"></div>
        </div>
      </div>
    </div>
    <div class="cards-list" id="cards-list">
  `;

  // 2. بناء كروت الأذكار (تمت إضافة inline styles لضمان قراءة ألوان الـ Dark Mode)
  data.items.forEach((item, idx) => {
    const s = savedProgress[idx];
    const isDone = s === 'done' || s === true;
    const cur = typeof s === 'number' ? s : (isDone ? item.count : 0);
    const MAX_DOTS = 15;

    let dotsHtml = '';
    if (item.count > 1 && item.count <= MAX_DOTS) {
      dotsHtml = Array.from({length: item.count}, (_, i) =>
        `<div class="dot ${i < cur ? 'lit' : ''} azkar-dot" data-idx="${idx}" data-target="${i+1}"></div>`
      ).join('');
    } else if (item.count > MAX_DOTS) {
      dotsHtml = `<span class="count-frac" id="frac-${idx}" style="color: var(--text-muted);">${cur}/${item.count}</span>`;
    }

    const btnClass = item.count === 1 ? 'tap-btn once' : 'tap-btn';
    const btnLabel = item.count === 1
      ? 'تم الذكر &nbsp;<i class="fas fa-check"></i>'
      : `<i class="fas fa-plus" style="font-size:0.75rem;margin-left:4px;"></i> تسبيح`;

    html += `
      <div class="zikr-card ${isDone ? 'done' : ''} ${cur > 0 && !isDone ? 'in-progress' : ''}" id="card-${idx}" style="animation-delay: ${Math.min(idx * 0.04, 0.5)}s; background-color: var(--card-bg); border-color: var(--border-color);">
        <div class="card-top" style="border-bottom: 1px solid var(--border-color);">
          <span class="card-chip ${item.label ? '' : 'hidden'}">${item.label || '-'}</span>
          <span class="card-num" id="num-${idx}" style="color: ${isDone ? 'var(--green)' : 'var(--text-muted)'};">${isDone ? '<i class="fas fa-check" style="color:var(--green)"></i>' : (item.count === 1 ? '١ مرة' : `${cur}/${item.count}`)}</span>
        </div>
        <p class="zikr-text" style="color: ${isDone ? '#888' : 'var(--text-color)'};">${item.text}</p>
        <div class="card-bottom">
          <div class="dots-wrap" id="dots-${idx}">${dotsHtml}</div>
          ${item.count > 1 && item.count <= MAX_DOTS ? `<span class="count-frac" id="frac-${idx}" style="color: var(--text-muted);">${cur}/${item.count}</span>` : ''}
          <button class="${btnClass} azkar-tap-btn" id="btn-${idx}" data-idx="${idx}">${btnLabel}</button>
        </div>
        <div class="done-row">
          <i class="fas fa-check-circle" style="font-size:1rem;"></i>
          <span>أُنجز</span>
        </div>
      </div>
    `;
  });

  html += `</div>`; // إغلاق قائمة الكروت

  // 3. رسالة الإنجاز وزر إعادة التعيين
  const isAllDone = getDoneCount() === totalItems;
  html += `
    <div class="completion ${isAllDone ? 'show' : ''}" id="completion">
      <div class="completion-inner">
        <span class="completion-stars">✦ ✦ ✦</span>
        <div class="completion-title">أتممت جميع الأذكار</div>
        <div class="completion-sub" style="color: var(--text-muted);">تقبّل الله منك وبارك في يومك</div>
      </div>
    </div>
    <div class="reset-wrap mb-5">
      <button class="reset-btn" id="reset-azkar-btn" data-category="${category}" style="color: var(--text-color);">
        <i class="fas fa-redo-alt" style="margin-left:6px;font-size:0.8rem;"></i>إعادة تعيين الأذكار
      </button>
    </div>
  `;

  containerEl.innerHTML = html;

  // --- دوال مساعدة للتفاعل والتحديث ---

  const updateProgressUI = () => {
    const d = getDoneCount();
    const pct = totalItems ? (d / totalItems) * 100 : 0;
    document.getElementById('prog-fill').style.width = pct + '%';
    document.getElementById('prog-text').textContent = `${d} / ${totalItems}`;
    document.getElementById('completion').classList.toggle('show', d === totalItems && totalItems > 0);
  };
  updateProgressUI();

  const shootConfetti = () => {
    const colors = ['#2ea85a','#c9a84c','#4ade80','#fcd34d','#a3e635'];
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = 5 + Math.random() * 7;
      p.style.cssText = `
        width:${size}px;height:${size}px;
        left:${10+Math.random()*80}vw;
        top:${10+Math.random()*30}vh;
        background:${colors[i%colors.length]};
        animation: fall ${0.8+Math.random()*0.7}s ${Math.random()*0.3}s linear forwards;
        transform: rotate(${Math.random()*360}deg);
      `;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  };

  const markDoneUI = (idx) => {
    const card = document.getElementById(`card-${idx}`);
    if (!card) return;
    card.classList.remove('in-progress');
    void card.offsetWidth; // Reflow
    card.classList.add('done');
    
    // تغيير لون الخط عند الإنجاز
    const p = card.querySelector('p.zikr-text');
    if (p) p.style.color = '#888';

    const num = document.getElementById(`num-${idx}`);
    if (num) num.innerHTML = '<i class="fas fa-check" style="color:var(--green)"></i>';
  };

  const updateCardUI = (idx, cur, maxCount) => {
    const card = document.getElementById(`card-${idx}`);
    if (!card) return;
    card.classList.add('in-progress');
    card.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('lit', i < cur));
    
    const frac = document.getElementById(`frac-${idx}`);
    if (frac) frac.textContent = `${cur}/${maxCount}`;
    
    const num = document.getElementById(`num-${idx}`);
    if (num) num.textContent = `${cur}/${maxCount}`;
    
    const btn = document.getElementById(`btn-${idx}`);
    if (btn) {
      btn.style.transform = 'scale(0.85)';
      setTimeout(() => btn.style.transform = '', 130);
    }
  };

  const handleFinishAzkar = () => {
    if (getDoneCount() === totalItems) {
      setTimeout(() => {
        Swal.fire({
          icon: 'success',
          title: '🌟 تقبل الله!',
          text: `لقد أتممت ${data.title} بالكامل.`,
          confirmButtonColor: '#198754',
          timer: 3000,
          timerProgressBar: true
        });
      }, 500);
    }
  };

  // --- الأحداث (Events) ---

  // Event: زر التسبيح/التم
  containerEl.querySelectorAll('.azkar-tap-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(btn.dataset.idx);
      if (savedProgress[idx] === 'done' || savedProgress[idx] === true) return;
      
      const item = data.items[idx];
      const cur = typeof savedProgress[idx] === 'number' ? savedProgress[idx] : 0;
      const next = cur + 1;

      // تأثير الـ Ripple
      if (e) {
        const r = document.createElement('div');
        r.className = 'ripple-effect';
        const rect = btn.getBoundingClientRect();
        const offsetX = e.clientX ? e.clientX - rect.left : rect.width / 2;
        const offsetY = e.clientY ? e.clientY - rect.top : rect.height / 2;
        r.style.cssText = `width:30px;height:30px;left:${offsetX-15}px;top:${offsetY-15}px;`;
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.appendChild(r);
        setTimeout(() => r.remove(), 500);
      }

      if (next >= item.count) {
        savedProgress[idx] = 'done';
        markDoneUI(idx);
        shootConfetti();
        if (navigator.vibrate) navigator.vibrate([25, 15, 50]);
        handleFinishAzkar();
      } else {
        savedProgress[idx] = next;
        updateCardUI(idx, next, item.count);
        if (navigator.vibrate) navigator.vibrate(18);
      }

      await localforage.setItem(`azkar_progress_${category}`, savedProgress);
      updateProgressUI();
    });
  });

  // Event: الضغط على النقاط (Dots)
  containerEl.querySelectorAll('.azkar-dot').forEach(dot => {
    dot.addEventListener('click', async () => {
      const idx = parseInt(dot.dataset.idx);
      const target = parseInt(dot.dataset.target);
      if (savedProgress[idx] === 'done' || savedProgress[idx] === true) return;
      
      const item = data.items[idx];
      if (target >= item.count) {
        savedProgress[idx] = 'done';
        markDoneUI(idx);
        shootConfetti();
        handleFinishAzkar();
      } else {
        savedProgress[idx] = target;
        updateCardUI(idx, target, item.count);
      }
      
      await localforage.setItem(`azkar_progress_${category}`, savedProgress);
      updateProgressUI();
    });
  });

  // Event: زر إعادة التعيين
  document.getElementById('reset-azkar-btn')?.addEventListener('click', () => {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'سيتم مسح تقدمك الحالي في هذه الأذكار.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، إعادة تعيين',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await localforage.removeItem(`azkar_progress_${category}`);
        window.loadAzkarList(category); // إعادة التحميل لتهيئة الواجهة
      }
    });
  });

  // Intersection Observer لظهور الكروت بتأثير الانزلاق
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  containerEl.querySelectorAll('.zikr-card').forEach(c => io.observe(c));
};

// ─── ✅ المسبحة الإلكترونية - Tasbeeh with localforage (العداد الذكي) ──────────

const TASBEEH_SMART_KEY = 'tasbeeh_smart_data';

let _tasbeehData = {
  currentType: 'سُبْحَانَ اللَّهِ',
  counts: {} // هنا هنحفظ كل ذكر ورقمه بشكل منفصل
};

/**
 * تحميل حالة المسبحة من localforage عند فتح القسم
 */
window.loadTasbeeh = async () => {
  try {
    const saved = await localforage.getItem(TASBEEH_SMART_KEY);
    if (saved && saved.counts) {
      _tasbeehData = saved;
    }
    
    // تهيئة العداد للذكر الحالي لو مش موجود
    if (!_tasbeehData.counts[_tasbeehData.currentType]) {
      _tasbeehData.counts[_tasbeehData.currentType] = 0;
    }
    
    _updateTasbeehUI();
  } catch (e) {
    console.warn('tasbeeh load error:', e);
  }
};

const _saveTasbeeh = async () => {
  try {
    await localforage.setItem(TASBEEH_SMART_KEY, _tasbeehData);
  } catch (e) {}
};

const _updateTasbeehUI = () => {
  const counterEl = document.getElementById('tasbeeh-counter-btn');
  const typeBtn   = document.getElementById('tasbeeh-type-btn');
  
  if (counterEl) counterEl.innerText = _tasbeehData.counts[_tasbeehData.currentType] || 0;
  if (typeBtn)   typeBtn.innerText   = _tasbeehData.currentType;
};

/**
 * زيادة العداد - مربوطة بـ onclick في HTML
 */
window.incrementTasbeeh = async () => {
  if (!_tasbeehData.counts[_tasbeehData.currentType]) {
    _tasbeehData.counts[_tasbeehData.currentType] = 0;
  }
  
  // زيادة عداد الذكر الحالي فقط
  _tasbeehData.counts[_tasbeehData.currentType]++;
  _updateTasbeehUI();
  await _saveTasbeeh();

  // اهتزاز خفيف (Haptic) على الجوال
  if (navigator.vibrate) navigator.vibrate(30);

  const currentCount = _tasbeehData.counts[_tasbeehData.currentType];

  // إشعار عند إكمال 33 و 99
  if (currentCount === 33 || currentCount === 99) {
    Swal.fire({
      toast: true, position: 'top', icon: 'success',
      title: currentCount === 33 ? '33 تسبيحة 🌿' : '99 تسبيحة 🌟 الحمد لله!',
      showConfirmButton: false, timer: 2000, timerProgressBar: true
    });
  }
};

/**
 * إعادة تعيين العداد (للذكر الحالي فقط)
 */
window.resetTasbeeh = async () => {
  _tasbeehData.counts[_tasbeehData.currentType] = 0;
  _updateTasbeehUI();
  await _saveTasbeeh();
};

/**
 * تغيير نوع التسبيح (بدون تصفير العداد)
 */
window.changeTasbeehType = async (type) => {
  _tasbeehData.currentType = type;
  
  // لو الذكر الجديد ملوش عداد، خليه يبدأ من الصفر
  if (!_tasbeehData.counts[_tasbeehData.currentType]) {
    _tasbeehData.counts[_tasbeehData.currentType] = 0;
  }
  
  // تحديث الشاشة بالرقم الخاص بالذكر المختار فقط
  _updateTasbeehUI();
  await _saveTasbeeh();
};



// ─── ✅ تنبيه سورة الكهف - Friday Kahf Notification 


/**
 */
export const scheduleFridayKahfNotification = async () => {
  try {
    try { 
      const pending = await LocalNotifications.getPending();
      const oldNotifications = pending.notifications.filter(n => n.id >= 777 && n.id <= 780);
      if (oldNotifications.length > 0) {
        await LocalNotifications.cancel({ notifications: oldNotifications }); 
      }
    } catch (e) {}

    const now = new Date();
    const daysUntilFriday = (5 - now.getDay() + 7) % 7;
    let notificationsToSchedule = [];

    for (let i = 0; i < 4; i++) {
      const nextFriday = new Date(now);
      
      if (daysUntilFriday === 0 && now.getHours() < 10 && i === 0) {
        nextFriday.setHours(10, 0, 0, 0);
      } else {
        let baseDays = (daysUntilFriday === 0 && i === 0) ? 7 : daysUntilFriday;
        nextFriday.setDate(now.getDate() + baseDays + (i * 7));
        nextFriday.setHours(10, 0, 0, 0);
      }

      notificationsToSchedule.push({
        id: 777 + i,
        title: 'سورة الكهف 📖 - يوم الجمعة',
        body: 'من قرأ سورة الكهف يوم الجمعة أضاء له النور ما بين الجمعتين',
        schedule: { at: nextFriday, allowWhileIdle: true },
        channelId: 'khatmah-channel',
        smallIcon: 'ic_notification',
        // 🔥 التعديل هنا: إضافة بيانات سورة الكهف للرجوع إليها عند الضغط
        extra: {
            target: 'kahf',
            surah: 18,
            ayah: 1,
            page: 293
        }
      });
    }

    await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    console.log(`✅ [FRIDAY] تم تأمين إشعارات سورة الكهف لـ 4 أسابيع قادمة`);
  } catch (err) {
    console.error('❌ [FRIDAY] خطأ في جدولة تنبيه الكهف:', err);
  }
};

// ─── ✅ تنبيه صلاة الضحى - Daily Duha Notification 

export const scheduleDuhaNotification = async () => {
  try {
    try { await LocalNotifications.cancel({ notifications: [{ id: 888 }] }); } catch (e) {}

    const now = new Date();
    const duhaTime = new Date(now);
    duhaTime.setHours(11, 0, 0, 0);

    if (now.getTime() > duhaTime.getTime()) {
      duhaTime.setDate(now.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 888,
          title: 'صلاة الضحى ☀️',
          body: '«وَيُجْزِئُ مِنْ ذَلِكَ رَكْعَتَانِ يَرْكَعُهُمَا مِنَ الضُّحَى» - صلاة الأوابين.',
          schedule: {
            at: duhaTime,
            every: 'day',   
            allowWhileIdle: true 
          },
          smallIcon: 'ic_notification', 
          channelId: 'azan-channel', 
          
        }
      ]
    });

    console.log('✅ [NOTIFICATIONS] تم جدولة تنبيه صلاة الضحى يومياً الساعة 11:00 ص');
  } catch (error) {
    console.error('❌ [NOTIFICATIONS] خطأ في جدولة تنبيه الضحى:', error);
  }
};

// ─── دالة مساعدة لغلق الشاشة الكاملة فقط ──────────────────────────────
const closeFullScreenUI = async () => {
  const body = document.body;
  const quranBook = document.getElementById('quran-book');
  const btn = document.getElementById('btn-fullscreen');

  // مسح علم المصحف المصور إن كان شغالاً
  window._imageMushafActive = false;

  if (quranBook) quranBook.classList.add('no-transition');
  body.classList.remove('fullscreen-reading');
  
  if (btn) {
    btn.classList.remove('active');
    btn.style.background = 'linear-gradient(135deg,#1e5f31,#145a28)';
    btn.style.color = '#fff';
    btn.innerHTML = '<i class="fas fa-expand me-1"></i> شاشة كاملة';
  }
  
  if (window.Capacitor && window.Capacitor.isNativePlatform() && window.StatusBar) {
      try { await window.StatusBar.show(); } catch(e){}
  }
  
  setTimeout(() => { if (quranBook) quranBook.classList.remove('no-transition'); }, 50);
};

// ─── وضع القراءة بملء الشاشة (Full Screen) السريع ──────────────────────────────
window.toggleQuranFullScreen = async () => {
  const body = document.body;
  const isFullScreen = body.classList.contains('fullscreen-reading');
  const btn = document.getElementById('btn-fullscreen');
  const isImageMushafState = event.state && event.state.isImageMushaf;
const isInImageMushaf = window._imageMushafActive === true;
const isInFullscreen = body.classList.contains('fullscreen-reading');
  if (isFullScreen || isImageMushafState || isInImageMushaf || isInFullscreen) {
    // 🔙 الخروج عبر الضغط على الزر (X أو زرار الشاشة الكاملة)
    if (window.history.state && window.history.state.isFullscreen) {
        // لو ضغط على الزرار، نرجع خطوة لورا في الهيستوري عشان نمسح الخطوة الوهمية (ده هيشغل الـ popstate تلقائياً)
        window.history.back();
    } else {
        // لو لسبب ما مفيش خطوة وهمية، نقفل الشاشة مباشرة
        closeFullScreenUI();
    }
  } else {
    // 🔲 الدخول في الشاشة الكاملة
    // 🔥 السر هنا: إضافة خطوة "وهمية" في سجل المتصفح 🔥
    window.history.pushState({ isFullscreen: true }, '', window.location.pathname);

    body.classList.add('fullscreen-reading');
    if (btn) {
      btn.classList.add('active');
      btn.style.background = 'rgba(220,53,69,0.9)';
      btn.style.color = '#fff';
      btn.innerHTML = '<i class="fas fa-compress me-1"></i> خروج';
    }
    if (window.Capacitor && window.Capacitor.isNativePlatform() && window.StatusBar) {
        try { await window.StatusBar.hide(); } catch(e){}
    }
  }
};

// 🌟 التقاط حركة السحب للرجوع (Swipe Back) أو زر الرجوع في الموبايل 🌟
window.addEventListener('popstate', (event) => {
  const body = document.body;
  // ✅ الإصلاح: نشوف أي من العلامات الثلاث عشان نعرف لو إحنا في المصحف المصور
  const isImageMushafState = event.state && event.state.isImageMushaf;
  const isInImageMushaf    = window._imageMushafActive === true;
  const isInFullscreen     = body.classList.contains('fullscreen-reading');

  if (isImageMushafState || isInImageMushaf || isInFullscreen) {
      if (typeof window.exitQuranMode === 'function') {
          window.exitQuranMode();
      } else {
          closeFullScreenUI();
          // fallback يدوي لو exitQuranMode مش محملة لسه
          const mainNavbar = document.getElementById('main-navbar');
          const bottomNav = document.querySelector('.bottom-nav');
          if (mainNavbar) mainNavbar.style.display = '';
          if (bottomNav) bottomNav.style.display = '';
          const promoBtn = document.getElementById('image-mushaf-promo');
          if (promoBtn) promoBtn.style.display = 'block';
      }
  }
});


// ─── ميزة الضغطة المطولة لفتح التفسير (Long Press) ───
document.addEventListener('DOMContentLoaded', () => {
    let pressTimer;
    let isScrolling = false;
    window.isLongPress = false; // علم (Flag) عشان نفرق بين الضغطة العادية والمطولة

    const ayahsContainer = document.getElementById('ayahs-container');

    if (ayahsContainer) {
        // 1. بداية اللمس
        ayahsContainer.addEventListener('touchstart', function(e) {
            const ayahElement = e.target.closest('.ayah-text'); 
            if (!ayahElement) return;

            isScrolling = false; 
            window.isLongPress = false; 

            // استخراج رقم السورة والآية بمرونة
            let surahNum, ayahNum;
            if (ayahElement.id && ayahElement.id.includes('-')) {
                const idParts = ayahElement.id.split('-');
                surahNum = idParts[1];
                ayahNum = idParts[2];
            } else {
                surahNum = ayahElement.getAttribute('data-surah');
                ayahNum = ayahElement.getAttribute('data-ayah');
            }

            if (!surahNum || !ayahNum) return;

            // نبدأ العداد (600 مللي ثانية)
            pressTimer = setTimeout(() => {
                if (!isScrolling) {
                    window.isLongPress = true; // 🔥 تفعيل وضع الضغطة المطولة 🔥
                    
                    // 🌟 الإضافة الجديدة: مسح أي تحديد للنص (الهايلايت الأزرق) عمله المتصفح بالغلط 🌟
                    if (window.getSelection) {
                        window.getSelection().removeAllRanges();
                    }
                    
                    if (navigator.vibrate) navigator.vibrate(50); // هزة خفيفة للموبايل
                    
                    // استدعاء دالة التفسير 
                    if (typeof window.showTafseerModal === 'function') {
                        window.showTafseerModal(surahNum, ayahNum);
                    } else if (typeof window.showTafseer === 'function') {
                        window.showTafseer(surahNum, ayahNum);
                    } else if (typeof window.openTafseer === 'function') {
                        window.openTafseer(surahNum, ayahNum);
                    } else {
                        alert(`الضغطة المطولة نجحت للآية ${ayahNum}! راجع اسم دالة التفسير.`);
                    }
                }
            }, 600); 

        }, { passive: true });

        // 2. إلغاء الضغطة لو المستخدم بيعمل سكرول
        ayahsContainer.addEventListener('touchmove', function() {
            isScrolling = true;
            clearTimeout(pressTimer);
        }, { passive: true });

        // 3. إلغاء الضغطة لو شال صباعه بسرعة
        ayahsContainer.addEventListener('touchend', function() {
            clearTimeout(pressTimer);
        });

        ayahsContainer.addEventListener('touchcancel', function() {
            clearTimeout(pressTimer);
        });

        // 🔥 السطر السحري: منع القائمة العادية من الظهور لو المستخدم عمل ضغطة مطولة 🔥
        ayahsContainer.addEventListener('click', function(e) {
            if (window.isLongPress) {
                e.preventDefault();
                e.stopPropagation(); // بيوقف ظهور القائمة اللي في الصورة تماماً
                window.isLongPress = false; // تصفير للضغطة اللي بعدها
            }
        }, { capture: true }); // capture: true بتصطاد الكليك قبل ما توصل للقائمة
        
        // منع قائمة المتصفح الافتراضية للنسخ
        ayahsContainer.addEventListener('contextmenu', function(e) {
            if (e.target.closest('.ayah-text')) {
                e.preventDefault();
            }
        });
    }
});

// ─── دالة طلب تفعيل الإشعارات مع خيار عدم الإظهار مجدداً ───
export async function checkAndPromptNotifications() {
    // 1. نتأكد الأول هل المستخدم طلب عدم إظهار الرسالة قبل كده؟
    const dontShowAgain = localStorage.getItem('hide_notification_prompt');
    if (dontShowAgain === 'true') return; // لو طلب، نخرج من الدالة فوراً

    try {
        // 2. نفحص حالة الصلاحيات الحالية
        const check = await LocalNotifications.checkPermissions();
        
        // لو متفعلة أصلاً، نخرج
        if (check.display === 'granted') return;

        // 3. لو مش متفعلة، نظهر رسالة SweetAlert الشيك
        const result = await Swal.fire({
            title: 'تفعيل الإشعارات 🔔',
            html: `
                <p style="font-family: 'Tajawal', 'Amiri', sans-serif; font-size: 1.1rem; color: #555;">
                    عشان نقدر نفكرك بمواعيد الصلاة، وقراءة وردك اليومي، والأذكار.. محتاجين إذنك لتفعيل الإشعارات.
                </p>
                <div class="form-check mt-4 d-flex align-items-center justify-content-center gap-2" style="direction: rtl; background: #f8f9fa; padding: 10px; border-radius: 8px;">
                    <input class="form-check-input m-0" type="checkbox" id="dontShowAgainCheckbox" style="cursor: pointer;">
                    <label class="form-check-label text-muted small" for="dontShowAgainCheckbox" style="cursor: pointer; padding-top: 3px;">
                        لا تظهر هذه الرسالة مرة أخرى
                    </label>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-bell me-1"></i> تفعيل الآن',
            cancelButtonText: 'ليس الآن',
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            reverseButtons: true,
            // 4. الدالة دي بتشتغل وأنت بتقفل النافذة عشان تسجل حالة الـ Checkbox
            willClose: () => {
                const checkbox = document.getElementById('dontShowAgainCheckbox');
                if (checkbox && checkbox.checked) {
                    localStorage.setItem('hide_notification_prompt', 'true');
                }
            }
        });

        // 5. لو المستخدم داس "تفعيل الآن"
        if (result.isConfirmed) {
            const request = await LocalNotifications.requestPermissions();
            if (request.display === 'granted') {
                Swal.fire({
                    title: 'تم التفعيل بنجاح! 🎉', 
                    text: 'ستصلك التنبيهات في وقتها إن شاء الله.', 
                    icon: 'success',
                    confirmButtonColor: '#198754'
                });
            } else {
                Swal.fire({
                    title: 'عذراً', 
                    text: 'تم رفض الصلاحية. يمكنك تفعيلها لاحقاً من إعدادات المتصفح أو الهاتف.', 
                    icon: 'warning',
                    confirmButtonColor: '#198754'
                });
            }
        }
    } catch (error) {
        console.error('Error prompting for notifications:', error);
    }
}

// 🚀 دالة سحرية لمتابعة الختمة وفتح الصفحة الصحيحة مباشرة (بالمللي) 🚀
window.continueActiveKhatmah = async () => {
    const k = await localforage.getItem('latest_khatmah');
    if (!k || !k.currentSurah) {
        showAlert('error', 'ليس لديك ختمة نشطة');
        return;
    }

    let targetPage = k.page;

    // 🔍 لو الصفحة مش متسجلة (لو ختمة قديمة)، هندور عليها محلياً بسرعة الصاروخ
    if (!targetPage) {
        const startPage = surahStartPages[k.currentSurah] || 1;
        targetPage = startPage; 

        // بنبحث في نطاق 10 صفحات بعد بداية السورة لضمان إيجاد الآية
        for (let p = startPage; p <= startPage + 10; p++) { 
            try {
                const res = await fetch(`/assets/quran_pages/${p}.json`);
                if (!res.ok) continue;
                const data = await res.json();
                
                const ayahExists = data.ayahs.some(a => 
                    (a.numberInSurah == k.currentAyah || a.ayahNumber == k.currentAyah) && 
                    (a.surahNumber == k.currentSurah || (a.surah && a.surah.number == k.currentSurah))
                );
                
                if (ayahExists) {
                    targetPage = p;
                    break; // لقينا الصفحة! نوقف البحث
                }
            } catch (e) { break; }
        }
    }

    // الانتقال لقسم المصحف وفتح الصفحة الصحيحة والنزول الذكي للآية
    if (window.showSection) window.showSection('quran');
    if (window.loadQuranPage) window.loadQuranPage(targetPage, k.currentSurah, k.currentAyah);
    else loadQuranPage(targetPage, k.currentSurah, k.currentAyah);
};

// ─── معالجة الـ Offline Queue لما يرجع النت ───
const processOfflineQueue = async () => {
  const queue = await localforage.getItem('offline_actions_queue') || [];
  if (queue.length === 0) return;

  console.log(`🔄 [OFFLINE QUEUE] معالجة ${queue.length} عملية معلقة...`);
  const remaining = [];

  for (const action of queue) {
    try {
      if (action.type === 'CREATE_KHATMAH') {
        const res = await axios.post('/api/v1/khatmah', action.payload);
        if (res.data.status === 'success') {
          const freshK = res.data.data?.khatmah;
          if (freshK) {
            await localforage.setItem('latest_khatmah', {
              currentSurah: freshK.currentSurah || 1,
              currentAyah:  freshK.currentAyah  || 1,
              page:         freshK.page         || 1,
              endDate:      freshK.endDate       || null,
              updatedAt:    Date.now()
            });
            await localforage.setItem('khatmah_meta', {
              name:      freshK.name      || action.payload.name || 'ختمتي',
              targetMsg: 'واصل تقدمك لختم القرآن الكريم ✨'
            });
          }
          console.log('✅ [OFFLINE QUEUE] تم إنشاء الختمة على السيرفر');
        }

      } else if (action.type === 'UPDATE_KHATMAH') {
        await axios.patch('/api/v1/khatmah', action.payload);
        console.log('✅ [OFFLINE QUEUE] تم تحديث الختمة على السيرفر');

      } else if (action.type === 'DELETE_KHATMAH') {
        await axios.delete('/api/v1/khatmah');
        console.log('✅ [OFFLINE QUEUE] تم حذف الختمة من السيرفر');
      }else if (action.type === 'ADD_BOOKMARK') {
  await axios.post('/api/v1/bookmarks', {
    surahNumber: action.payload.surahNumber,
    ayahNumber:  action.payload.ayahNumber,
    note:        action.payload.note || ''
  });
  const bookmarksRes = await axios.get('/api/v1/bookmarks');
  const freshBookmarks = bookmarksRes.data.data.bookmarks;
  await localforage.setItem('offline_bookmarks', freshBookmarks);
  console.log('✅ [OFFLINE QUEUE] تم مزامنة العلامة المضافة');

} else if (action.type === 'DELETE_BOOKMARK') {
  const bookmarks = await localforage.getItem('offline_bookmarks') || [];
  const target = bookmarks.find(
    b => parseInt(b.surah) === parseInt(action.payload.surah) && 
         parseInt(b.ayah)  === parseInt(action.payload.ayah)
  );
  if (target?._id) {
    await axios.delete(`/api/v1/bookmarks/${target._id}`);
    console.log('✅ [OFFLINE QUEUE] تم مزامنة حذف العلامة');
  }
}

    } catch (err) {
      if (err.response) {
        console.warn(`⚠️ [OFFLINE QUEUE] تم حذف عملية فاشلة (${action.type}):`, err.response.status);
      } else {
        remaining.push(action);
      }
    }
  }

  await localforage.setItem('offline_actions_queue', remaining);

  if (remaining.length === 0) {
    console.log('✅ [OFFLINE QUEUE] تم معالجة كل العمليات المعلقة');
    await manageKhatmah();
  }
};

// ─── استمع لحدث عودة الإنترنت ───
window.addEventListener('online', () => {
  console.log('🌐 عاد الاتصال بالإنترنت - بدء المزامنة...');
  processOfflineQueue();
});



export const scheduleIslamicEvents = async () => {
  if (!Capacitor.isNativePlatform()) return;

  const hijriEvents = [
    { name: 'رمضان المبارك',  m: 9,  d: 1,  icon: '🌙', type: 'ramadan' },
    { name: 'عيد الفطر',      m: 10, d: 1,  icon: '🎉', type: 'eid' },
    { name: 'يوم عرفة',       m: 12, d: 9,  icon: '🕋', type: 'arafah' },
    { name: 'عيد الأضحى',     m: 12, d: 10, icon: '🐑', type: 'eid' },
    { name: 'رأس السنة الهجرية', m: 1, d: 1, icon: '📅', type: 'newyear' },
  ];

  const messages = {
    ramadan:  { title: 'رمضان كريم 🌙', body: 'تقبّل الله منّا ومنكم.. أهلاً بشهر القرآن والرحمة والمغفرة 🤲' },
    eid:      { title: 'عيد مبارك سعيد 🎉', body: 'كل عام وأنتم بخير.. تقبّل الله طاعتكم وأعاد عليكم هذه الأيام بالخير واليُمن 🌸' },
    arafah:   { title: 'يوم عرفة المبارك 🕋', body: 'أفضل يوم طلعت فيه الشمس.. أكثر من الدعاء والذكر فهذا يوم مغفرة وعتق من النار 🤲' },
    newyear:  { title: 'عام هجري جديد 📅', body: 'بارك الله لنا في العام الجديد.. عام مليء بالخير والبركة والطاعة إن شاء الله ✨' },
  };

  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric'
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // إلغاء الإشعارات القديمة للمناسبات (IDs: 200-210)
    const idsToCancel = [];
    for (let i = 200; i <= 210; i++) idsToCancel.push({ id: i });
    try { await LocalNotifications.cancel({ notifications: idsToCancel }); } catch(e) {}

    const notifications = [];
    let notifId = 200;

    for (const event of hijriEvents) {
      // نبحث عن تاريخ المناسبة في الـ 360 يوم القادمة
      for (let i = 0; i <= 360; i++) {
        const checkDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
        const parts = formatter.formatToParts(checkDate);
        const hDay   = parseInt(parts.find(p => p.type === 'day').value);
        const hMonth = parseInt(parts.find(p => p.type === 'month').value);

        if (hMonth === event.m && hDay === event.d) {
          // نبعت إشعار لو باقي 3 أيام أو أقل أو يوم المناسبة نفسه
          if (i <= 3) {
            const msg = messages[event.type] || {
              title: `${event.icon} ${event.name}`,
              body: `أهلاً بـ${event.name}.. تقبّل الله منّا ومنكم 🤲`
            };

            // وقت الإشعار: يوم المناسبة الساعة 8 الصبح
            const notifDate = new Date(checkDate);
            notifDate.setHours(8, 0, 0, 0);
            if (notifDate <= new Date()) break; // لو فات موعده متجدلوش

            notifications.push({
              id: notifId++,
              title: msg.title,
              body: msg.body,
              schedule: { at: notifDate, allowWhileIdle: true },
              smallIcon: 'ic_notification',
              actionTypeId: 'OPEN_HOME',
            });
          }
          break;
        }
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log(`✅ [ISLAMIC EVENTS] تم جدولة ${notifications.length} إشعار للمناسبات القريبة`);
    }
  } catch (err) {
    console.error('❌ خطأ في جدولة إشعارات المناسبات:', err);
  }
};


// ─── تبديل التابات في المصحح الذكي ───
window.switchRecitationTab = function(tab) {
    const recordPane = document.getElementById('ai-record-pane');
    const historyPane = document.getElementById('ai-history-pane');
    const btns = document.querySelectorAll('#ai-correction-tabs .nav-link');

    if (tab === 'record') {
        recordPane?.classList.remove('d-none');
        historyPane?.classList.add('d-none');
        if (btns[0]) btns[0].classList.add('active');
        if (btns[1]) btns[1].classList.remove('active');
    } else {
        recordPane?.classList.add('d-none');
        historyPane?.classList.remove('d-none');
        if (btns[0]) btns[0].classList.remove('active');
        if (btns[1]) btns[1].classList.add('active');
    }
};

// ─── جلب وعرض تسجيلات المستخدم ───
window.loadMyRecitations = async function() {
    const container = document.getElementById('my-recitations-list');
    if (!container) return;

    // 🌟 التعديل الجديد: فحص الإنترنت قبل أي حاجة 🌟
    if (!navigator.onLine) {
        container.innerHTML = `
            <div class="text-center w-100 py-5">
                <i class="fas fa-wifi fa-3x text-muted mb-3 opacity-50"></i>
                <h5 class="fw-bold text-muted mb-1">لا يوجد اتصال بالإنترنت</h5>
                <p class="text-muted small mb-3">تحتاج إلى الاتصال بالإنترنت لعرض وسماع تسجيلاتك السابقة.</p>
                <button class="btn btn-outline-success rounded-pill px-4" onclick="window.loadMyRecitations()">
                    <i class="fas fa-sync-alt me-1"></i> إعادة المحاولة
                </button>
            </div>`;
        return;
    }

    const surahsList = [
        '', 'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام',
        'الأعراف', 'الأنفال', 'التوبة', 'يونس', 'هود', 'يوسف', 'الرعد',
        'إبراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه',
        'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء',
        'النمل', 'القصص', 'العنكبوت', 'الروم', 'لقمان', 'السجدة', 'الأحزاب',
        'سبأ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر', 'فصلت',
        'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح',
        'الحجرات', 'ق', 'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن',
        'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة', 'الصف',
        'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك',
        'القلم', 'الحاقة', 'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر',
        'القيامة', 'الإنسان', 'المرسلات', 'النبأ', 'النازعات', 'عبس',
        'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق',
        'الأعلى', 'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل', 'الضحى',
        'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات',
        'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون',
        'الكوثر', 'الكافرون', 'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس'
    ];

    container.innerHTML = `
        <div class="text-center w-100 py-5">
            <div class="spinner-border text-success" role="status"></div>
            <p class="text-muted mt-2">جاري تحميل التسجيلات...</p>
        </div>`;

    try {
        const res = await axios.get('/api/v1/quran/my-recitations');
        const recitations = res.data.data.recitations;

        if (!recitations || recitations.length === 0) {
            container.innerHTML = `
                <div class="text-center w-100 py-5">
                    <i class="fas fa-microphone-slash fa-3x text-muted mb-3 opacity-50"></i>
                    <p class="text-muted fw-bold">لا توجد تسجيلات بعد</p>
                    <p class="text-muted small">سجّل تلاوتك من تاب "تسميع جديد" وستحفظ هنا تلقائياً</p>
                </div>`;
            return;
        }

        const html = recitations.map(r => {
            const surahName = surahsList[r.surah] || `سورة ${r.surah}`;
            const date = new Date(r.createdAt).toLocaleDateString('ar-EG', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const ayahsText = (r.startAyah && r.endAyah)
                ? `الآيات ${r.startAyah} – ${r.endAyah}`
                : `الآية ${r.startAyah || 1}`;

            const scoreColor = r.score >= 80 ? 'success' : r.score >= 50 ? 'warning' : 'danger';
            const scoreLabel = r.score >= 80 ? 'ممتاز' : r.score >= 50 ? 'جيد' : 'يحتاج تحسين';

            return `
                <div class="col-md-6 mb-3">
                    <div class="card shadow-sm h-100 border-0 rounded-4 border-start border-${scoreColor} border-4">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h6 class="fw-bold mb-1" style="font-family:'Amiri',serif; font-size:1.2rem;">
                                        <i class="fas fa-book-open text-${scoreColor} me-2"></i>${surahName}
                                    </h6>
                                    <small class="text-muted d-block">
                                        <i class="fas fa-list-ol me-1"></i>${ayahsText}
                                    </small>
                                    <small class="text-muted d-block">
                                        <i class="fas fa-calendar-alt me-1"></i>${date}
                                    </small>
                                </div>
                                <div class="text-center">
                                    <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-1 bg-${scoreColor} bg-opacity-10 border border-${scoreColor}"
                                         style="width:50px; height:50px;">
                                        <span class="fw-bold text-${scoreColor}" style="font-size:1.1rem;">${Math.round(r.score)}%</span>
                                    </div>
                                    <small class="text-${scoreColor} fw-bold" style="font-size:0.7rem;">${scoreLabel}</small>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                                ${r.audioUrl ? `
                                <button class="btn btn-sm btn-outline-${scoreColor} rounded-pill px-3 fw-bold"
                                        onclick="window.playRecitationAudio('${r._id}', '${r.audioUrl}', this)">
                                    <i class="fas fa-play me-1"></i> تشغيل
                                </button>` : '<span class="badge bg-light text-muted border">الصوت غير متاح</span>'}
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');

        container.innerHTML = html;

    } catch (err) {
        console.error('Error loading recitations:', err);
        if (err.response?.status === 401) {
            container.innerHTML = '<div class="alert alert-warning text-center w-100 rounded-4">يرجى تسجيل الدخول أولاً لعرض تسجيلاتك.</div>';
        } else {
            // تصميم رسالة الخطأ العام بشكل ألطف
            container.innerHTML = `
                <div class="text-center w-100 py-4">
                    <i class="fas fa-exclamation-circle fa-2x text-danger mb-2 opacity-75"></i>
                    <p class="text-muted">عذراً، حدث خطأ أثناء جلب التسجيلات.</p>
                    <button class="btn btn-outline-secondary btn-sm rounded-pill px-3" onclick="window.loadMyRecitations()">إعادة المحاولة</button>
                </div>`;
        }
    }
};

window.playRecitationAudio = function(id, url, btn) {
    if (!navigator.onLine) {
        if (typeof showAlert === 'function') showAlert('error', 'تحتاج إلى اتصال بالإنترنت لتشغيل التسجيل');
        return;
    }

    const stopExistingPlayer = () => {
        if (window.currentPlayingAudio) {
            window.currentPlayingAudio.pause();
            window.currentPlayingAudio = null;
        }
        if (window.currentPlayingContainer) {
            window.currentPlayingContainer.remove();
            window.currentPlayingContainer = null;
        }
        if (window.currentPlayingBtn) {
            window.currentPlayingBtn.style.display = 'inline-block';
            window.currentPlayingBtn = null;
        }
        if (window.currentPlayingTimer) {
            clearInterval(window.currentPlayingTimer);
            window.currentPlayingTimer = null;
        }
    };

    stopExistingPlayer();

    let cleanUrl = url.replace(/^\/public\//, '/');
    if (!cleanUrl.startsWith('/')) cleanUrl = '/' + cleanUrl;
    
    const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
    const isLocal = !isNative && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
    const baseURL = isLocal ? 'http://127.0.0.1:3000' : 'https://aqraapp.com';
    const finalUrl = cleanUrl.startsWith('http') ? cleanUrl : baseURL + cleanUrl;

    const playerContainer = document.createElement('div');
    playerContainer.className = 'aqra-player-container';
    
    playerContainer.innerHTML = `
        <button class="aqra-player-btn" id="aqra-player-play-pause">
            <i class="fas fa-play"></i> </button>
        <input type="range" class="aqra-player-seekbar" id="aqra-player-seekbar" value="0" min="0" max="100">
        <span class="aqra-player-timer" id="aqra-player-timer">0:00 / 0:00</span>
    `;

    btn.style.display = 'none';
    btn.parentNode.insertBefore(playerContainer, btn.nextSibling);

    // const audio = new Audio(finalUrl);
    // audio.crossOrigin = 'anonymous';
    const audio = new Audio(finalUrl);
if (!isNative) {
    audio.crossOrigin = 'anonymous';
}

    const playPauseBtn = playerContainer.querySelector('#aqra-player-play-pause');
    const seekbar = playerContainer.querySelector('#aqra-player-seekbar');
    const timer = playerContainer.querySelector('#aqra-player-timer');
    
    window.currentPlayingAudio = audio;
    window.currentPlayingContainer = playerContainer;
    window.currentPlayingBtn = btn;

    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds === Infinity) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return minutes + ":" + (secs < 10 ? "0" : "") + secs;
    };

    // 🌟 تحديث الوقت الكلي بمجرد تحميل بيانات الملف 🌟
    audio.onloadedmetadata = () => {
        timer.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    };

    audio.play().catch(e => {
        if (isLocal && !finalUrl.includes('aqraapp.com')) {
            audio.src = 'https://aqraapp.com' + cleanUrl;
            audio.play().catch(finalError => {
                stopExistingPlayer();
            });
            return;
        }
        stopExistingPlayer(); 
    });

    audio.onplay = () => {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    };

    audio.onpause = () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    };

    playPauseBtn.onclick = () => {
        if (audio.paused) audio.play();
        else audio.pause();
    };

    audio.ontimeupdate = () => {
        // 🌟 التعديل هنا لعرض الوقت الحالي والوقت الكلي معاً 🌟
        const current = formatTime(audio.currentTime);
        const total = formatTime(audio.duration);
        timer.textContent = `${current} / ${total}`;

        if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            seekbar.value = progress;
        }
    };

    seekbar.oninput = () => {
        if (audio.duration) {
            const seekTo = (seekbar.value / 100) * audio.duration;
            audio.currentTime = seekTo;
        }
    };

    audio.onended = () => {
        stopExistingPlayer();
    };
};



// ─── المسابقة اليومية ──────────────────────────────────────────────────────────
export const loadDailyQuiz = async () => {
  const container = document.getElementById('quiz-container');
  if (!container) return;

  // 🌟 التعديل هنا: جلب التاريخ بالتوقيت المحلي للمستخدم (عشان تتحدث 12 بليل بالظبط عنده)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
// const mockLeaders = [
//       { name: 'محمد أشرف', score: 5, total: 5, time: '10:00 ص' },
//       { name: 'محب القرآن', score: 4, total: 5, time: '11:30 ص' },
//       { name: 'فاعل خير', score: 4, total: 5, time: '01:15 م' },
//       { name: 'أحمد', score: 3, total: 5, time: '09:00 ص' },
//       { name: 'ضيف', score: 2, total: 5, time: '02:00 م' }
//   ];
try {
      // إظهار اللوحة بشكل فارغ أو Loading (اختياري) قبل ما الداتا تيجي
      
      const leaderRes = await axios.get(`/api/v1/quiz/leaderboard?date=${today}`);
      const realLeaders = leaderRes.data.data.leaders;
      
      renderLeaderboard(realLeaders);
  } catch (error) {
      console.error("خطأ في جلب لوحة الشرف:", error);
      // لو في مشكلة في النت أو السيرفر، بنرسم لوحة فاضية عشان شكل الصفحة ميبوظش
      renderLeaderboard([]); 
  }
  // 1. التأكد من اكتمال المسابقة اليوم
  const isCompleted = localStorage.getItem(`quiz_completed_${today}`);
  const savedScore = localStorage.getItem(`quiz_score_${today}`);

  if (isCompleted === 'true') {
    container.innerHTML = `
      <div class="text-center py-5 fade-in">
        <div style="font-size:4.5rem; margin-bottom:15px; text-shadow: 0 4px 15px rgba(25,135,84,0.3);">🌟</div>
        <h3 class="fw-bold text-success mb-3">لقد أتممت مسابقة اليوم!</h3>
        <div class="d-inline-block bg-light rounded-pill px-4 py-2 border mb-3">
            <span class="text-muted fs-6">نتيجتك كانت: </span>
            <strong class="text-dark fs-5">${savedScore}</strong>
        </div>
        <div class="alert alert-success bg-success bg-opacity-10 border-0 rounded-4 mx-auto" style="max-width: 400px;">
            <p class="small text-dark fw-bold mb-0"><i class="fas fa-clock me-2 text-success"></i>تتجدد الأسئلة يومياً في منتصف الليل، ننتظرك غداً!</p>
        </div>
        <button class="btn btn-success px-4 mt-3 rounded-pill shadow-sm" onclick="showSection('home')">
            <i class="fas fa-home me-2"></i>العودة للرئيسية
        </button>
      </div>`;
    return; 
  }

  // 2. جلب الأسئلة
  const cached = await localforage.getItem(`daily_quiz_${today}`);
  if (cached) return renderQuiz(cached, container, today);

  if (navigator.onLine) {
    try {
      
const res = await axios.get(`/api/v1/quiz/today?tz=${timezone}`);
      const quiz = res.data.data.quiz;
      await localforage.setItem(`daily_quiz_${today}`, quiz);
      renderQuiz(quiz, container, today);
    } catch (err) {
      if (!cached) container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="fas fa-question-circle fa-4x mb-3 text-success opacity-50"></i>
          <h5 class="fw-bold">لا تتوفر أسئلة اليوم</h5>
          <p class="small">الرجاء التأكد من اتصالك بالإنترنت للمزامنة.</p>
        </div>`;
    }
  } else if (!cached) {
      container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="fas fa-wifi-slash fa-4x mb-3 text-secondary opacity-50"></i>
          <h5 class="fw-bold">أنت في وضع عدم الاتصال</h5>
          <p class="small">يجب الاتصال بالإنترنت لتحميل مسابقة اليوم لأول مرة.</p>
        </div>`;
  }
};

const renderQuiz = (quiz, container, todayStr) => {
  let score = 0;
  let answered = 0;

  // 🌟 استرجاع الإجابات المحفوظة جزئياً
  let savedAnswers = {};
  try {
      savedAnswers = JSON.parse(localStorage.getItem(`quiz_answers_${todayStr}`)) || {};
  } catch(e) {}

  const html = `
    <div class="quiz-header text-center mb-4">
      <div class="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-success bg-opacity-10 mb-2">
        <i class="fas fa-star text-warning fa-2x"></i>
      </div>
      <h4 class="fw-bold text-success mb-1">المسابقة الدينية</h4>
      <p class="text-muted small mb-2">${new Date().toLocaleDateString('ar-EG', { weekday:'long', day:'numeric', month:'long' })}</p>
      <span class="badge bg-light text-success border rounded-pill px-3 py-2 shadow-sm"><i class="fas fa-sync-alt me-1"></i> تتجدد الأسئلة يومياً منتصف الليل</span>
    </div>
    
    <div id="quiz-questions">
      ${quiz.questions.map((q, qi) => `
        <div class="card mb-4 border-0 shadow-sm rounded-4 overflow-hidden" id="q-card-${qi}">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-4" style="font-family:'Amiri', serif; line-height: 1.6; color: var(--text-color, #212529);">
              <span class="text-success me-1">${qi + 1}.</span> ${q.question}
            </h5>
            <div class="d-grid gap-3">
              ${q.options.map((opt, oi) => `
                <button class="btn btn-light text-end rounded-3 quiz-option border p-3 fw-semibold"
                  data-q="${qi}" data-o="${oi}" data-correct="${q.correctAnswer}"
                  data-explanation="${q.explanation || ''}" id="btn-opt-${qi}-${oi}">
                  ${opt}
                </button>
              `).join('')}
            </div>
            <div id="explanation-${qi}" class="mt-3 d-none"></div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div id="quiz-result" class="d-none text-center py-4 mb-4"></div>`;

  container.innerHTML = html;

  const handleAnswer = (btn, isRestoring = false) => {
      const qi = parseInt(btn.dataset.q);
      const oi = parseInt(btn.dataset.o);
      const correct = parseInt(btn.dataset.correct);
      const card = document.getElementById(`q-card-${qi}`);

      if (card.getAttribute('data-answered') === 'true') return;

      card.setAttribute('data-answered', 'true');
      card.querySelectorAll('.quiz-option').forEach(b => {
          b.disabled = true;
          b.classList.remove('btn-light', 'border'); 
      });

      if (oi === correct) {
        btn.classList.add('btn-success', 'text-white');
        score++;
      } else {
        btn.classList.add('btn-danger', 'text-white');
        card.querySelectorAll('.quiz-option')[correct].classList.add('btn-success', 'text-white');
      }

      const expDiv = document.getElementById(`explanation-${qi}`);
      if (btn.dataset.explanation) {
        expDiv.innerHTML = `
          <div class="p-3 border-0 bg-success bg-opacity-10 small text-end rounded-3 mb-0" style="color: var(--text-color, #198754);">
            <i class="fas fa-lightbulb text-warning me-2"></i><strong>توضيح: </strong>${btn.dataset.explanation}
          </div>`;
        expDiv.classList.remove('d-none');
      }

      answered++;

      if (!isRestoring) {
          savedAnswers[qi] = oi;
          localStorage.setItem(`quiz_answers_${todayStr}`, JSON.stringify(savedAnswers));
      }

      if (answered === quiz.questions.length) {
        const result = document.getElementById('quiz-result');
        const pct = Math.round((score / quiz.questions.length) * 100);
        let icon, msg, bgClass;
        
        if (pct >= 80) { icon = '🏆'; msg = 'ممتاز! معلوماتك الدينية رائعة'; bgClass = 'bg-success text-white'; }
        else if (pct >= 50) { icon = '👍'; msg = 'جيد! واصل التعلم'; bgClass = 'bg-info text-white'; }
        else { icon = '📚'; msg = 'لا بأس، راجع وحاول مجدداً غداً'; bgClass = 'bg-light text-dark'; }

        localStorage.setItem(`quiz_completed_${todayStr}`, 'true');
        localStorage.setItem(`quiz_score_${todayStr}`, `${score} / ${quiz.questions.length}`);
        
        localStorage.removeItem(`quiz_answers_${todayStr}`);
        const savedNickname = localStorage.getItem('quiz_nickname') || localStorage.getItem('name') || '';

        result.innerHTML = `
          <div class="card border-0 shadow-lg rounded-4 ${bgClass} mb-4">
            <div class="card-body p-5">
              <div style="font-size:4rem" class="mb-3">${icon}</div>
              <h2 class="fw-bold mb-1 display-4">${score} / ${quiz.questions.length}</h2>
              <p class="mb-4 fs-5">${msg}</p>
              <div class="p-2 rounded bg-white bg-opacity-25 d-inline-block mb-3">
                 <small><i class="fas fa-clock me-1"></i> تتجدد الأسئلة منتصف الليل، نراك غداً!</small>
              </div>
            </div>
          </div>

          <div class="card border-1 border-success shadow-sm rounded-4 text-center">
            <div class="card-body p-4">
                <h5 class="fw-bold text-success mb-3"><i class="fas fa-trophy me-2 text-warning"></i> لوحة الشرف اليومية</h5>
                <p class="text-muted small mb-3">سجل نتيجتك ونافس أصدقائك على المركز الأول اليوم!</p>
                
                <div class="input-group mb-3 mx-auto" style="max-width: 300px; direction: ltr;">
                    <button class="btn btn-success px-4 fw-bold" type="button" id="submit-score-btn" onclick="submitToLeaderboard(${score}, ${quiz.questions.length}, '${todayStr}')">شارك</button>
                    <input type="text" id="leaderboard-name" class="form-control text-end" placeholder="اكتب اسمك هنا..." value="${savedNickname}" maxlength="20" style="direction: rtl;">
                </div>
                <div id="leaderboard-status" class="small mt-2"></div>
            </div>
          </div>
        `;
        
        result.classList.remove('d-none');
        if (!isRestoring) {
           setTimeout(() => result.scrollIntoView({ behavior: 'smooth', block: 'end' }), 300);
        }
      }
  };

  container.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(btn, false));
  });

  Object.keys(savedAnswers).forEach(qi => {
      const oi = savedAnswers[qi];
      const targetBtn = document.getElementById(`btn-opt-${qi}-${oi}`);
      if (targetBtn) {
          handleAnswer(targetBtn, true);
      }
  });
};

// ─── 🌟 دالة رسم لوحة الشرف (UI فقط حالياً) ───
export const renderLeaderboard = (leaders) => {
    const container = document.getElementById('leaderboard-container');
    if (!container) return;

    // حالة: لوحة الشرف فارغة (بداية اليوم)
    if (!leaders || leaders.length === 0) {
        container.innerHTML = `
            <div class="card border-1 border-success shadow-sm rounded-4 bg-white" style="border-style: dashed !important;">
                <div class="card-body text-center p-4">
                    <i class="fas fa-trophy fa-3x text-warning mb-3 opacity-50"></i>
                    <h5 class="fw-bold text-success mb-1">لوحة الشرف فارغة اليوم</h5>
                    <p class="text-muted small mb-0">كن أول من يشارك واحتل المركز الأول! 🥇</p>
                </div>
            </div>
        `;
        container.classList.remove('d-none');
        return;
    }

    // حالة: يوجد متسابقين
    const listHtml = leaders.slice(0, 5).map((user, index) => { // نعرض أفضل 5 فقط عشان منطولش الصفحة
        let medal = '';
        let bgClass = 'bg-white';
        let textClass = 'text-dark';
        let borderClass = 'border-bottom';

        // تنسيق المراكز الثلاثة الأولى
        if (index === 0) { medal = '<span style="font-size: 1.8rem;">🥇</span>'; bgClass = 'bg-warning bg-opacity-10'; textClass = 'text-warning fw-bold'; }
        else if (index === 1) { medal = '<span style="font-size: 1.8rem;">🥈</span>'; bgClass = 'bg-secondary bg-opacity-10'; textClass = 'text-secondary fw-bold'; }
        else if (index === 2) { medal = '<span style="font-size: 1.8rem;">🥉</span>'; bgClass = 'bg-danger bg-opacity-10'; textClass = 'text-danger fw-bold'; }
        else { medal = `<span class="badge bg-light text-muted border fs-6 px-2 py-1">${index + 1}</span>`; }

        // إزالة الخط السفلي من آخر عنصر
        if (index === leaders.length - 1 || index === 4) borderClass = '';

        return `
            <div class="d-flex align-items-center justify-content-between p-3 ${borderClass} ${bgClass}">
                <div class="d-flex align-items-center">
                    <div class="me-3 text-center" style="min-width: 40px;">${medal}</div>
                    <div>
                        <h6 class="mb-0 fw-bold ${textClass}" style="font-family: 'Amiri', serif; font-size: 1.1rem;">${user.name}</h6>
                        <small class="text-muted" style="font-size: 0.75rem;"><i class="fas fa-clock me-1"></i>${user.time}</small>
                    </div>
                </div>
                <div class="text-end">
                    <span class="badge bg-success rounded-pill px-3 py-2 fs-6 shadow-sm">${user.score} / ${user.total}</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div class="card-header bg-success text-white text-center py-3 border-0">
                <h5 class="mb-0 fw-bold"><i class="fas fa-crown me-2 text-warning"></i> أبطال مسابقة اليوم</h5>
            </div>
            <div class="card-body p-0">
                ${listHtml}
            </div>
            <div class="card-footer bg-light text-center border-0 py-2">
                <small class="text-muted">يتم تحديث الترتيب يومياً ⏳</small>
            </div>
        </div>
    `;
    container.classList.remove('d-none');
};

// ─── 🌟 إشعار المسابقة الدينية اليومية - Daily Quiz Notification ───
export const scheduleDailyQuizNotification = async () => {
  try {
    if (!Capacitor.isNativePlatform()) return;

    const pending = await LocalNotifications.getPending();
    // 🌟 التعديل: تغيير النطاق للـ IDs الجديدة (من 20000 لـ 20030)
    const quizNotifs = pending.notifications.filter(n => n.id >= 20000 && n.id <= 20030);

    // التحقق من الرصيد المتبقي
    if (quizNotifs.length > 10) {
        console.log(`⏳ [QUIZ NOTIF] متبقي ${quizNotifs.length} إشعار للمسابقة، لا حاجة لإعادة الجدولة الآن.`);
        return; 
    }

    if (quizNotifs.length > 0) {
        await LocalNotifications.cancel({ notifications: quizNotifs.map(n => ({ id: n.id })) });
    }

    // مسح الإشعارات بالـ IDs القديمة (من 10000 لـ 10030) إن وجدت عشان ما تضربش أذان
    const oldQuizNotifs = pending.notifications.filter(n => n.id >= 10000 && n.id <= 10030);
    if (oldQuizNotifs.length > 0) {
        await LocalNotifications.cancel({ notifications: oldQuizNotifs.map(n => ({ id: n.id })) });
    }

    const messages = [
      { title: '🕌 مسابقة اليوم الدينية جاهزة!', body: 'اختبر معلوماتك الإسلامية وسجّل أعلى نتيجة.. هل أنت مستعد؟' },
      { title: '📖 سؤال ديني ينتظرك!', body: 'أسئلة جديدة في المسابقة الدينية.. شارك واحرص على ثوابك 🌙' },
      { title: '🌟 حان وقت المسابقة الدينية!', body: 'أسئلة جديدة تُجدَّد كل يوم.. ادخل وجاوب الآن!' },
      { title: '✨ مسابقتك اليومية بدأت!', body: 'عُدّلت الأسئلة الدينية للجديدة.. جرّب حظك واربح أجراً 🤲' },
    ];

    const notifications = [];
    const now = new Date();

    // الجدولة لـ 30 يوم
    for (let i = 0; i <= 30; i++) {
      // الساعة 20 تعني 8:00 مساءً بالتوقيت المحلي
      const notifTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0, 0);
      notifTime.setDate(notifTime.getDate() + i);

      if (notifTime.getTime() <= now.getTime()) continue;

      const msg = messages[i % messages.length];

      notifications.push({
        id: 20000 + i, // 🌟 التعديل: استخدام IDs جديدة تماماً
        title: msg.title,
        body: msg.body,
        schedule: { at: notifTime, allowWhileIdle: true },
        channelId: 'quiz-channel-silent', // 🌟 التعديل الأهم: استخدام قناة جديدة
        smallIcon: 'ic_notification',
        extra: { target: 'quiz' }
      });
    }

    if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
        console.log(`✅ [QUIZ NOTIF] تم تجديد رصيد إشعارات المسابقة لـ ${notifications.length} يوم (الساعة 8:00 مساءً)`);
    }

  } catch (err) {
    console.error('❌ [QUIZ NOTIF] خطأ في جدولة إشعار المسابقة:', err);
  }
};

// دالة جلب الإذاعات من الباك إيند
export async function loadRadioStations() {
    const select = document.getElementById('radio-station-select');
    if (!select) return;

    try {
        const res = await axios.get('/api/v1/radio'); // اللينك اللي عملناه في الباك
        const stations = res.data.data.stations;

        // 1. تجميع المحطات حسب الفئة (Category)
        const groups = {};
        stations.forEach(station => {
            if (!groups[station.category]) {
                groups[station.category] = [];
            }
            groups[station.category].push(station);
        });

        // 2. بناء الـ HTML ديناميكياً
        let html = '<option value="" disabled selected>اختر المحطة الإذاعية</option>';
        
        for (const category in groups) {
            html += `<optgroup label="${category}">`;
            groups[category].forEach(s => {
                html += `<option value="${s.url}" data-backup="${s.backupUrl || ''}">${s.name}</option>`;
            });
            html += `</optgroup>`;
        }

        // 3. حقن البيانات في السليكت
        select.innerHTML = html;

    } catch (err) {
        console.error("❌ Error loading radio stations:", err);
        select.innerHTML = '<option value="" disabled>فشل تحميل الإذاعات</option>';
    }
}