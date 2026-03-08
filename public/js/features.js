/* eslint-disable */
import localforage from 'localforage';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import {  Capacitor } from '@capacitor/core';
import axios from 'axios';
import { showAlert } from './auth';
import { surahNames, surahStartPages, juzData, getJuzByPage, getHizbByPage, getSurahNameByPage ,SAJDAH_WORDS_COUNT, SAJDAH_WORDS, SAJDAH_AYAH_END, UTHMANI_FIXES} from './constants';




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

const showOfflineAudioMessage = (surahName) => {
  Swal.fire({
    icon: 'info',
    title: `<span style="font-family:'Amiri'; font-size:1.3rem;">📵 ${surahName || 'هذه السورة'} غير محفوظة</span>`,
    html: `
      <div style="font-family:'Amiri'; direction:rtl; text-align:right; line-height:1.9;">
        <p class="mb-2">أنت حالياً غير متصل بالإنترنت، وهذه السورة لم تُحفظ على جهازك بعد.</p>
        <div class="alert alert-light border-start border-success border-3 p-3 mt-3 mb-0 text-end" style="border-radius:10px;">
          <p class="mb-1 fw-bold text-success"><i class="fas fa-lightbulb me-2"></i>كيف تحفظ السور للاستماع أوفلاين؟</p>
          <p class="mb-0 text-muted small">اضغط على زر <strong>"حفظ للاستماع أوفلاين"</strong> أسفل المشغّل وأنت متصل بالإنترنت</p>
        </div>
      </div>`,
    confirmButtonText: 'حسناً',
    confirmButtonColor: '#198754',
    customClass: { popup: 'text-end' }
  });
};

// const requireLogin = (featureName = 'هذه الميزة') => {
//   Swal.fire({
//     icon: 'warning',
//     title: 'يجب تسجيل الدخول أولاً',
//     text: `سجّل دخولك لتتمكن من استخدام ${featureName}`,
//     confirmButtonText: 'تسجيل الدخول',
//     cancelButtonText: 'لاحقاً',
//     showCancelButton: true,
//     confirmButtonColor: '#198754',
//     cancelButtonColor: '#6c757d',
//   }).then((result) => {
//     if (result.isConfirmed) window.showSection('login');
//   });
// };

// const requireLogin = window.requireLogin;

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


// ── رسم القالب على الـ Canvas ──
const drawTemplate = (ctx, templateId, ayahText, surahName, ayahNum) => {
  const W = 1080, H = 1080;
  ctx.clearRect(0, 0, W, H);

  if (templateId === 1) {
    // قالب 1: خلفية خضراء داكنة + إطار ذهبي
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a4a2e'); g.addColorStop(1, '#0d2b1a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, 1000, 1000);
    ctx.strokeStyle = 'rgba(212,175,55,0.3)'; ctx.lineWidth = 2;
    ctx.strokeRect(58, 58, 964, 964);
    [[68,68],[1012,68],[68,1012],[1012,1012]].forEach(([x,y]) => {
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y+(y<540?50:-50)); ctx.lineTo(x,y); ctx.lineTo(x+(x<540?50:-50),y);
      ctx.stroke();
    });
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 40px serif'; ctx.textAlign = 'center'; ctx.direction = 'rtl';
    ctx.fillText(surahName + ' - آية ' + ayahNum, W/2, 165);
    ctx.strokeStyle = 'rgba(212,175,55,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(180,205); ctx.lineTo(900,205); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '50px serif'; ctx.direction = 'rtl';
    wrapText(ctx, ayahText, W/2, 320, 880, 78);
    ctx.beginPath(); ctx.moveTo(180,880); ctx.lineTo(900,880); ctx.stroke();
    ctx.fillStyle = 'rgba(212,175,55,0.75)';
    ctx.font = '34px serif'; ctx.fillText('📖 تطبيق اقرأ', W/2, 940);

  } else if (templateId === 2) {
    // قالب 2: أبيض نظيف + خط أخضر
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1e5f31'; ctx.fillRect(0, 0, W, 18);
    ctx.fillRect(0, H-18, W, 18);
    ctx.fillRect(0, 0, 18, H);
    ctx.fillRect(W-18, 0, 18, H);
    ctx.fillStyle = '#1e5f31';
    ctx.font = 'bold 40px serif'; ctx.textAlign = 'center'; ctx.direction = 'rtl';
    ctx.fillText(surahName + ' - آية ' + ayahNum, W/2, 165);
    ctx.strokeStyle = '#1e5f31'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(160,205); ctx.lineTo(920,205); ctx.stroke();
    ctx.fillStyle = '#222222';
    ctx.font = '50px serif'; ctx.direction = 'rtl';
    wrapText(ctx, ayahText, W/2, 320, 880, 78);
    ctx.beginPath(); ctx.moveTo(160,880); ctx.lineTo(920,880); ctx.stroke();
    ctx.fillStyle = '#1e5f31';
    ctx.font = '34px serif'; ctx.fillText('📖 تطبيق اقرأ', W/2, 940);

  } else if (templateId === 3) {
    // قالب 3: بني ذهبي كلاسيكي
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#2c1810'); g.addColorStop(0.5, '#3d2314'); g.addColorStop(1, '#1a0e08');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // زخرفة هندسية
    ctx.strokeStyle = 'rgba(212,175,55,0.15)'; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 60) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    }
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 6;
    ctx.strokeRect(35, 35, W-70, H-70);
    ctx.strokeStyle = 'rgba(212,175,55,0.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, W-100, H-100);
    // نجمة مركزية صغيرة في الأعلى
    drawStar(ctx, W/2, 120, 5, 30, 14, '#d4af37');
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 38px serif'; ctx.textAlign = 'center'; ctx.direction = 'rtl';
    ctx.fillText(surahName + ' - آية ' + ayahNum, W/2, 185);
    ctx.strokeStyle = 'rgba(212,175,55,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(180,220); ctx.lineTo(900,220); ctx.stroke();
    ctx.fillStyle = '#f5e6c8';
    ctx.font = '50px serif'; ctx.direction = 'rtl';
    wrapText(ctx, ayahText, W/2, 335, 860, 78);
    ctx.beginPath(); ctx.moveTo(180,875); ctx.lineTo(900,875); ctx.stroke();
    drawStar(ctx, W/2, 930, 5, 18, 8, '#d4af37');
    ctx.fillStyle = 'rgba(212,175,55,0.7)';
    ctx.font = '32px serif'; ctx.fillText('تطبيق اقرأ', W/2, 975);

  } else if (templateId === 4) {
    // قالب 4: أزرق ليلي
    const g = ctx.createRadialGradient(W/2, H/2, 100, W/2, H/2, 760);
    g.addColorStop(0, '#0a2744'); g.addColorStop(1, '#020c1b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // نجوم عشوائية
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    [[120,80],[300,50],[500,90],[700,40],[900,75],[80,200],[980,180],
     [150,900],[400,950],[650,980],[850,920],[1000,850]].forEach(([x,y]) => {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
    });
    ctx.strokeStyle = 'rgba(100,160,255,0.5)'; ctx.lineWidth = 5;
    ctx.strokeRect(38, 38, W-76, H-76);
    ctx.strokeStyle = 'rgba(100,160,255,0.2)'; ctx.lineWidth = 1;
    ctx.strokeRect(52, 52, W-104, H-104);
    ctx.fillStyle = '#7eb8ff';
    ctx.font = 'bold 40px serif'; ctx.textAlign = 'center'; ctx.direction = 'rtl';
    ctx.fillText(surahName + ' - آية ' + ayahNum, W/2, 165);
    ctx.strokeStyle = 'rgba(100,160,255,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(180,205); ctx.lineTo(900,205); ctx.stroke();
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '50px serif'; ctx.direction = 'rtl';
    wrapText(ctx, ayahText, W/2, 320, 880, 78);
    ctx.beginPath(); ctx.moveTo(180,880); ctx.lineTo(900,880); ctx.stroke();
    ctx.fillStyle = 'rgba(126,184,255,0.75)';
    ctx.font = '34px serif'; ctx.fillText('📖 تطبيق اقرأ', W/2, 940);
  }
};

// wrap text helper
const wrapText = (ctx, text, x, startY, maxW, lineH) => {
  const words = text.split(' ');
  let line = '';
  let y = startY;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); y += lineH; line = word;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, x, y);
};

const drawStar = (ctx, cx, cy, spikes, outerR, innerR, color) => {
  let rot = (Math.PI / 2) * 3, step = Math.PI / spikes;
  ctx.beginPath(); ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR); rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR); rot += step;
  }
  ctx.lineTo(cx, cy - outerR); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
};

const showTemplateChooser = (ayahText, surahName, ayahNum) => {
  return new Promise((resolve) => {
    const templates = [
      { id: 1, label: 'أخضر ذهبي',  bg: 'linear-gradient(135deg,#1a4a2e,#0d2b1a)', color: '#d4af37' },
      { id: 2, label: 'أبيض أنيق',   bg: '#ffffff',                                  color: '#1e5f31' },
      { id: 3, label: 'بني كلاسيكي', bg: 'linear-gradient(135deg,#2c1810,#1a0e08)', color: '#d4af37' },
      { id: 4, label: 'أزرق ليلي',   bg: 'linear-gradient(135deg,#0a2744,#020c1b)', color: '#7eb8ff' },
    ];

    // ارسم المعاينات الصغيرة
    const previewsHTML = templates.map(t => `
      <div onclick="this.parentNode.querySelectorAll('.tpl-card').forEach(c=>c.classList.remove('selected')); this.classList.add('selected'); this.parentNode.dataset.chosen='${t.id}';"
           class="tpl-card" data-id="${t.id}"
           style="cursor:pointer; border-radius:12px; overflow:hidden; border:3px solid transparent; transition:border .2s; width:130px; text-align:center;">
        <div style="height:130px; background:${t.bg}; display:flex; align-items:center; justify-content:center; border-radius:9px;">
          <span style="color:${t.color}; font-size:13px; padding:6px; direction:rtl; font-family:serif;">${surahName}<br><small style="font-size:11px; opacity:.8;">آية ${ayahNum}</small></span>
        </div>
        <div style="font-size:12px; margin-top:5px; color:#555;">${t.label}</div>
      </div>
    `).join('');

    Swal.fire({
      title: 'اختر شكل البطاقة',
      html: `
        <div id="tpl-grid" data-chosen="1"
             style="display:flex; flex-wrap:wrap; gap:14px; justify-content:center; padding:10px;">
          ${previewsHTML}
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'مشاركة ✨',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#1e5f31',
      didOpen: () => {
        // اختر الأول افتراضياً
        const first = Swal.getPopup().querySelector('.tpl-card');
        if (first) first.classList.add('selected');
        // CSS للتحديد
        const style = document.createElement('style');
        style.textContent = '.tpl-card.selected { border-color: #1e5f31 !important; }';
        Swal.getPopup().appendChild(style);
      },
      preConfirm: () => {
        const grid = Swal.getPopup().querySelector('#tpl-grid');
        return parseInt(grid?.dataset.chosen || '1');
      }
    }).then(result => {
      resolve(result.isConfirmed ? result.value : null);
    });
  });
};

export const shareAyah = async (ayahText, surahName, ayahNum) => {
  const cleanSurahName = surahName.replace(/سورة /g, '').replace(/سُورَةُ /g, '').trim();

  const card = document.createElement('div');
  card.style.cssText = `
    width: 1080px; 
    padding: 80px; 
    background: linear-gradient(135deg, #0d1b0f 0%, #1e5f31 100%); 
    color: #fff; 
    font-family: 'Amiri Quran', 'Amiri', serif; 
    text-align: center; 
    position: fixed; 
    left: -9999px; 
    top: 0; 
    direction: rtl;
  `;
  
  card.innerHTML = `
    <div style="border: 3px solid #d4af37; padding: 70px 50px; border-radius: 40px; background: rgba(0,0,0,0.45); box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
      <div style="margin-bottom: 40px;">
         <i class="fas fa-book-open" style="font-size: 55px; color: #d4af37;"></i>
      </div>
      <p style="font-size: 65px; line-height: 2.2; margin-bottom: 50px; color: #fdf5e6; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
        "${ayahText}"
      </p>
      <div style="color: #d4af37; font-size: 40px; font-family: 'Tajawal', sans-serif; font-weight: bold;">
        سورة ${cleanSurahName} - آية ${ayahNum}
      </div>
      <div style="margin-top: 50px; font-size: 26px; color: #a5d6a7; font-family: 'Tajawal', sans-serif; opacity: 0.8;">
        تطبيق اقرأ 📖
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
    const canvas = await html2canvas(card, { scale: 2, backgroundColor: '#0d1b0f', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    document.body.removeChild(card); // تنظيف الشاشة

    const blob = await (await fetch(imgData)).blob();
    const file = new File([blob], `ayah_${cleanSurahName}_${ayahNum}.png`, { type: 'image/png' });

    Swal.close(); // قفل اللودنج

    if (Capacitor.isNativePlatform()) {
       const base64Data = imgData.split(',')[1];
       const fileName = `ayah_share_${Date.now()}.png`;
       await Filesystem.writeFile({ path: fileName, data: base64Data, directory: Directory.Cache });
       const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
       
       await Share.share({
         title: `سورة ${cleanSurahName} - آية ${ayahNum}`,
         text: `"${ayahText}"\n\n[سورة ${cleanSurahName} - آية ${ayahNum}]\n\nتمت المشاركة من تطبيق اقرأ 📖`,
         url: uri,
         dialogTitle: 'مشاركة الآية',
       });
    } else if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
       await navigator.share({
         title: 'تطبيق اقرأ',
         text: `سورة ${cleanSurahName} - آية ${ayahNum}\n\nتمت المشاركة من تطبيق اقرأ 📖`,
         files: [file]
       });
    } else {
       const link = document.createElement('a');
       link.download = `ayah_${cleanSurahName}_${ayahNum}.png`;
       link.href = imgData;
       link.click();
    }
  } catch(e) {
    console.error('خطأ في توليد الصورة:', e);
    Swal.fire('خطأ', 'تعذر إنشاء الصورة، تأكد من اتصالك بالإنترنت', 'error');
    if (document.body.contains(card)) document.body.removeChild(card);
  }
};

export async function loadQuranPage(pageNumber, targetSurah = null, targetAyah = null) {
  const pageNum = parseInt(pageNumber);

  const titleEl = document.getElementById('surah-title-display');
  if (titleEl) titleEl.textContent = `سورة ${getSurahNameByPage(pageNum)}`;

  if (_loadingPage === pageNum) {
    console.log(`⏳ [SKIP] صفحة ${pageNum} بتتحمل خلاص - تم التجاهل`);
    return;
  }
  _loadingPage = pageNum;

  try {
    currentPage = pageNum;
    window.currentPage = pageNum;

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
        return;
      }
      console.log(`🌐 [API] جاري تحميل صفحة ${pageNum} من السيرفر`);
      const res = await axios.get(`/api/v1/quran/page/${pageNum}`);
      pageData = res.data.data;
      if (_cacheSet) await _cacheSet(pageNum, pageData);
    }

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

    let userBookmarks = [];
    const loggedIn = isUserLoggedIn();
    if (loggedIn) {
      userBookmarks = await localforage.getItem('offline_bookmarks') || [];

      if (navigator.onLine && localStorage.getItem('auth_token')) {
        axios.get('/api/v1/bookmarks').then(async (res) => {
          const freshBookmarks = res.data.data.bookmarks;
          await localforage.setItem('offline_bookmarks', freshBookmarks);
          console.log(`🔄 [BOOKMARKS] تم تحديث الكاش (${freshBookmarks.length} علامة)`);
        }).catch((err) => {
          console.warn('⚠️ [BOOKMARKS] فشل تحديث الكاش:', err.message);
        });
      }
    }

    const container = document.getElementById('ayahs-container');
    if (!container) return;
    container.innerHTML = '';

    let fullTextHTML = '<div class="quran-page-content" style="text-align: justify; text-align-last: center; line-height: 2.4; font-family: \'Amiri Quran\', \'Amiri\', serif; font-size: 28px; direction: rtl;">';
    
    if (ayahs.length > 0) {
      const firstAyah = ayahs[0];
      let sNameAr = firstAyah.surahNameAr || (firstAyah.surah && firstAyah.surah.name) || '...';
      if (sNameAr.startsWith("سُورَةُ ")) sNameAr = sNameAr.replace("سُورَةُ ", "سورة ");
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

    if (khatmah) {
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
      }, 500);
    }

    ayahs.forEach(ayah => {
      let ayahText = ayah.text;

      Object.keys(UTHMANI_FIXES).forEach(wrongWord => {
        ayahText = ayahText.split(wrongWord).join(UTHMANI_FIXES[wrongWord]);
      });

      const ayahNum  = ayah.ayahNumber || ayah.numberInSurah;
      const surahNum = ayah.surahNumber || (ayah.surah && ayah.surah.number);
      const sajdahKey = `${surahNum}_${ayahNum}`;

      ayahText = ayahText.replace(/۩/g, '').trim();

      const sajdahWord = SAJDAH_WORDS[sajdahKey];
      if (sajdahWord) {
        const regex = new RegExp(`(${sajdahWord})`, 'g');
        ayahText = ayahText.replace(regex, `<span class="sajdah-word" style="border-top: 2px solid #198754; padding-top: 2px;">$1</span>`);
      }

      const hasSajdahSymbol = SAJDAH_AYAH_END.includes(sajdahKey);
      const sajdahSymbolHTML = hasSajdahSymbol ? ' <span class="sajdah-icon text-success ms-1 fs-5" title="موضع سجود">۩</span>' : '';

      let surahName = ayah.surahNameAr || (ayah.surah && ayah.surah.name) || "";
      if (surahName.startsWith("سُورَةُ ")) surahName = surahName.replace("سُورَةُ ", "سورة ");

      // إضافة الـ IDs لرؤوس السور
      if (ayahNum === 1) {
        if (surahNum !== 1 && surahNum !== 9) {
          fullTextHTML += `
            <div id="surah-header-${surahNum}" class="surah-separator text-center my-4 p-2" style="background: #f4f4f4; border: 1px solid #ddd; border-radius: 5px;">
              <h3 class="text-success m-0" style="font-family: 'Amiri';"> ${surahName}</h3>
            </div>
            <div class="bismillah text-center mb-3" style="font-family: 'Amiri'; font-size: 1.5rem;">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
          `;
          const bismillahRegex = /^\s*ب[\u064B-\u065F\u0670]*س[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*\s*[ٱا]لل[\u064B-\u065F\u0670]*ه[\u064B-\u065F\u0670]*\s*[ٱا]لر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*ٰ?ن[\u064B-\u065F\u0670]*\s*[ٱا]لر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*ي[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*/;
          ayahText = ayahText.replace(bismillahRegex, '').trim();
        } else if (surahNum === 1) {
          fullTextHTML += `<div id="surah-header-1" class="surah-separator text-center my-4"><h3 class="text-success m-0" style="font-family: 'Amiri';">سورة الفاتحة</h3></div>`;
        } else if (surahNum === 9) {
          fullTextHTML += `<div id="surah-header-9" class="surah-separator text-center my-4 p-2" style="background: #f4f4f4; border: 1px solid #ddd; border-radius: 5px;"><h3 class="text-success m-0" style="font-family: 'Amiri';">سورة التوبة</h3></div>`;
        }
      }

      const isBookmarked = userBookmarks.some(b => parseInt(b.surah) === surahNum && parseInt(b.ayah) === ayahNum);
      const isKhatmahActive = khatmah && parseInt(khatmah.currentSurah) == surahNum && parseInt(khatmah.currentAyah) == ayahNum;

      const bookmarkIcon = isBookmarked ? `<i class="fas fa-bookmark mx-1" style="color: #d4af37; font-size: 0.7em;"></i>` : '';
      const khatmahIcon = isKhatmahActive ? `<i class="fas fa-flag mx-1" style="color: #198754; font-size: 0.8em;"></i>` : '';

      fullTextHTML += `
        <span class="verse-wrapper" data-surah="${surahNum}" data-ayah="${ayahNum}" data-surahname="${surahName}" data-bookmarked="${isBookmarked}" style="cursor: pointer; display: inline; border-radius: 5px; padding: 2px; transition: background 0.2s;">
          <span id="ayah-${surahNum}-${ayahNum}" class="ayah-text">${ayahText}${sajdahSymbolHTML}</span>
          <span class="ayah-end-wrapper" style="white-space: nowrap; display: inline-block;">
            <span class="ayah-end-symbol" style="color: #d4af37; font-family: sans-serif; margin: 0 5px; border: 1px solid #d4af37; border-radius: 50%; padding: 0 5px; font-size: 0.8em;">${ayahNum}</span>
            ${bookmarkIcon}
            ${khatmahIcon}
          </span>
        </span>
      `;
    });

    fullTextHTML += '</div><div class="text-center mt-3 text-muted small">- ' + pageNum + ' -</div>';
    
    // رسم الآيات في الشاشة أولاً
    container.innerHTML = fullTextHTML;

    const duaBtnContainer = document.getElementById('khatmah-dua-btn-container');
    if (duaBtnContainer) {
      if (pageNum === 604) { duaBtnContainer.classList.remove('d-none'); }
      else { duaBtnContainer.classList.add('d-none'); }
    }

    document.querySelectorAll('.nav-prev, .nav-next, #prev-surah-mobile, #next-surah-mobile').forEach(btn => btn.classList.remove('d-none'));
    if (typeof updateNavButtons === 'function') updateNavButtons();

   // =========================================================
    // 🚀 كود النزول الذكي الموحد (بدون Hash وبدعم الهيدر الثابت)
    // =========================================================
    setTimeout(() => {
      const scrollSurah = targetSurah || (khatmah ? khatmah.currentSurah : null);
      const scrollAyah  = targetAyah  || (khatmah ? khatmah.currentAyah : null);

      if (scrollSurah && scrollAyah) {
        
        // 1. لو كانت الآية رقم 1 (يعني جاي من الفهرس أو بداية سورة)
        if (parseInt(scrollAyah) === 1) {
          const headerTarget = document.getElementById(`surah-header-${scrollSurah}`);
          if (headerTarget) {
            // حساب المسافة لترك مساحة للهيدر الأخضر العلوي (حوالي 100 بيكسل)
            const offset = 100; 
            const elementPosition = headerTarget.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - offset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
            return; // خروج لعدم تظليل الآية
          }
        }

        // 2. لو آية عادية في النص (جاي من الختمة أو البحث أو العلامات)
        const scrollTarget = document.getElementById(`ayah-${scrollSurah}-${scrollAyah}`);
        if (scrollTarget) {
          scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
          scrollTarget.style.transition      = 'background 0.5s';
          scrollTarget.style.backgroundColor = '#d1e7dd';
          setTimeout(() => { scrollTarget.style.backgroundColor = ''; }, 3000);
        }
      }
    }, 600);

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
          <div onclick="window.showSection('quran'); window.loadQuranPage(${startPage}, ${surahNum}, 1);"
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



// ─── toggleBookmark ────────────────────────────────────────────────────────────

export async function toggleBookmark(surah, ayah, iconElement) {
    if (!isUserLoggedIn()) {
    requireLogin('حفظ العلامات المرجعية في المصحف الشريف');
    return;
  }
  const isCurrentlyBookmarked = iconElement.classList.contains('fas');

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
      await addToOfflineQueue('ADD_BOOKMARK', { surahNumber: surah, ayahNumber: ayah });
      let offlineBookmarks = await localforage.getItem('offline_bookmarks') || [];
      const ayahEl = document.getElementById(`ayah-${surah}-${ayah}`);
      const ayahText = ayahEl ? ayahEl.textContent.trim() : '';
      offlineBookmarks.push({ surah, ayah, surahName: surahNames[parseInt(surah) - 1] || '', ayahText });
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
        const ayahElOnline = document.getElementById(`ayah-${surah}-${ayah}`);
        const ayahTextOnline = ayahElOnline ? ayahElOnline.textContent.trim() : '';
        let offlineBookmarks = await localforage.getItem('offline_bookmarks') || [];
        offlineBookmarks.push({
          surah,
          ayah,
          surahName: surahNames[parseInt(surah) - 1] || '',
          ayahText: ayahTextOnline,
          note: note || ''
        });
        await localforage.setItem('offline_bookmarks', offlineBookmarks);
        invalidateBookmarksCache();
        const msg = note ? 'تم حفظ العلامة مع ملاحظتك 🔖✨' : 'تم حفظ العلامة المرجعية 🔖';
        showAlert('success', msg);
      }
    }
  } catch (err) {
    console.error("Bookmark Error:", err);
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
        await addToOfflineQueue('ADD_BOOKMARK', { surahNumber: surah, ayahNumber: ayah });
        let offlineBookmarks = await localforage.getItem('offline_bookmarks') || [];
        const ayahElCatch = document.getElementById(`ayah-${surah}-${ayah}`);
        const ayahTextCatch = ayahElCatch ? ayahElCatch.textContent.trim() : '';
        offlineBookmarks.push({ surah, ayah, surahName: surahNames[parseInt(surah) - 1] || '', ayahText: ayahTextCatch });
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

  let currentPageForKhatmah = 0;
  const quranSection = document.getElementById('quran-section');
  if (quranSection && !quranSection.classList.contains('d-none')) {
    currentPageForKhatmah = window.currentPage || 1;
  }

  if (!navigator.onLine) {
    await addToOfflineQueue('UPDATE_KHATMAH', {
      surah,
      ayah,
      page: currentPageForKhatmah  
    });

    await localforage.setItem('latest_khatmah', {
      currentSurah: surah,
      currentAyah: ayah,
      page: currentPageForKhatmah,  
      updatedAt: Date.now()
    });

    document.querySelectorAll('.khatmah-icon-btn').forEach(btn => {
      btn.classList.remove('fas', 'khatmah-active-pulse');
      btn.classList.add('far');
      btn.style.color = '#28a745';
      btn.title = 'تحديث الختمة هنا';
    });
    const newActiveBtn = document.querySelector(
      `.khatmah-icon-btn[data-surah="${surah}"][data-ayah="${ayah}"]`
    );
    if (newActiveBtn) {
      newActiveBtn.classList.remove('far');
      newActiveBtn.classList.add('fas', 'khatmah-active-pulse');
      newActiveBtn.style.color = '#198754';
      newActiveBtn.title = 'أنت تتوقف هنا';
    }

    const statusText = document.getElementById('khatmah-status-text');
    if (statusText) {
      const surahName = surahNames[parseInt(surah) - 1] || `سورة ${surah}`;
      statusText.innerHTML = `أنت متوقف عند <strong>سورة ${surahName}</strong> - آية <strong>${ayah}</strong>`;
    }

    Swal.fire({
      toast: true, position: 'top-end', icon: 'success',
      title: `📖 تم حفظ موقعك 🚩`,
      text: 'سيتم المزامنة تلقائياً عند عودة الإنترنت',
      showConfirmButton: false, timer: 3000
    });
    return;
  }

  try {
    const res = await axios.patch('/api/v1/khatmah', { surah, ayah, page: currentPageForKhatmah });  

    if (res.data.status === 'success') {
      await localforage.setItem('latest_khatmah', {
        currentSurah: surah,
        currentAyah: ayah,
        page: currentPageForKhatmah,  
        updatedAt: Date.now()
      });

      document.querySelectorAll('.khatmah-icon-btn').forEach(btn => {
        btn.classList.remove('fas', 'khatmah-active-pulse');
        btn.classList.add('far');
        btn.style.color = '#28a745';
        btn.title = 'تحديث الختمة هنا';
      });

      const newActiveBtn = document.querySelector(
        `.khatmah-icon-btn[data-surah="${surah}"][data-ayah="${ayah}"]`
      );
      if (newActiveBtn) {
        newActiveBtn.classList.remove('far');
        newActiveBtn.classList.add('fas', 'khatmah-active-pulse');
        newActiveBtn.style.color = '#198754';
        newActiveBtn.title = 'أنت تتوقف هنا';
      }

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
    if (!navigator.onLine || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
      
      await addToOfflineQueue('UPDATE_KHATMAH', { surah, ayah, page: currentPageForKhatmah });  
      
      await localforage.setItem('latest_khatmah', {
        currentSurah: surah,
        currentAyah: ayah,
        page: currentPageForKhatmah,  
        updatedAt: Date.now()
      });

      document.querySelectorAll('.khatmah-icon-btn').forEach(btn => {
        btn.classList.remove('fas', 'khatmah-active-pulse');
        btn.classList.add('far');
        btn.style.color = '#28a745';
        btn.title = 'تحديث الختمة هنا';
      });
      const newActiveBtn = document.querySelector(
        `.khatmah-icon-btn[data-surah="${surah}"][data-ayah="${ayah}"]`
      );
      if (newActiveBtn) {
        newActiveBtn.classList.remove('far');
        newActiveBtn.classList.add('fas', 'khatmah-active-pulse');
        newActiveBtn.style.color = '#198754';
        newActiveBtn.title = 'أنت تتوقف هنا';
      }

      const statusText = document.getElementById('khatmah-status-text');
      if (statusText) {
        const surahName = surahNames[parseInt(surah) - 1] || `سورة ${surah}`;
        statusText.innerHTML = `أنت متوقف عند <strong>سورة ${surahName}</strong> - آية <strong>${ayah}</strong>`;
      }

      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: `📖 تم حفظ موقعك محلياً 🚩`,
        text: 'سيتم المزامنة تلقائياً عند عودة الإنترنت',
        showConfirmButton: false, timer: 3000
      });
    } else if (err.response && err.response.status === 401) {
      requireLogin('تتبع الختمة وحفظ التقدم');
    } else {
      showAlert('error', 'حدث خطأ، يرجى المحاولة مرة أخرى.');
    }
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
        // 🛠️ تم التصحيح هنا لاستخدام المتغير الصحيح surahPageMap الخاص بك
        // if (!targetPage || isNaN(targetPage)) targetPage = surahPageMap[surahNum - 1] || 1;
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
                  <button class="btn btn-sm btn-outline-danger delete-bookmark-btn" data-id="${b._id}" ${!navigator.onLine ? 'disabled title="تحتاج للإنترنت لحذف العلامة"' : ''}>
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
                <p class="ayah-text text-dark mt-2" style="font-family: 'Amiri'; font-size: 1.2rem;">${b.ayahText || b.text || ""}</p>
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
      });
      container.innerHTML = html;
    };

    // ─── 1. عرض فوري من الكاش (0 ثانية انتظار) ───────────────────────────────
    const cachedBookmarks = await localforage.getItem('offline_bookmarks');
    if (cachedBookmarks) {
      renderBookmarksToUI(cachedBookmarks);
    } else {
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

export const scheduleDailyWird = async (khatmahName) => {
  try {
    try { await LocalNotifications.cancel({ notifications: [{ id: 999 }] }); } catch(e) {}
    const now              = new Date();
    const notificationTime = new Date();
    notificationTime.setHours(21, 0, 0, 0);
    notificationTime.setMilliseconds(0);
    if (notificationTime <= now) notificationTime.setDate(notificationTime.getDate() + 1);
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
  } catch (error) { console.error('❌ خطأ في جدولة الورد:', error); }
};

export async function manageKhatmah() {
  const activeDiv       = document.getElementById('active-khatmah');
  const createDiv       = document.getElementById('create-khatmah');
  
  if (!await isUserLoggedIn()) {
    if (activeDiv) activeDiv.classList.add('d-none');
    if (createDiv) createDiv.classList.remove('d-none');
    return;
  }
  
  const kNameEl          = document.getElementById('khatmah-name');
  const kTargetEl        = document.getElementById('daily-target');
  const statusText       = document.getElementById('khatmah-status-text');
  const progressBar      = document.getElementById('progress-bar');
  const surahSelect      = document.getElementById('currentSurah');
  const currentAyahInput = document.getElementById('currentAyah');

  // ─── قراءة الكاش ─────────────────────────────────────────────────────────
  const loadFromCache = async () => {
    const offlineKhatmah = await localforage.getItem('latest_khatmah');
    const offlineMeta    = await localforage.getItem('khatmah_meta');
    if (!offlineKhatmah) return null;
    if (kTargetEl && offlineMeta) kTargetEl.innerText = offlineMeta.targetMsg || "واصل تقدمك ✨";
    return {
      currentSurah: offlineKhatmah.currentSurah,
      currentAyah:  offlineKhatmah.currentAyah,
      page:         offlineKhatmah.page || null,
      name:         offlineMeta ? offlineMeta.name : 'ختمتي الحالية'
    };
  };

  // ─── رسم الختمة في الشاشة ────────────────────────────────────────────────
  const renderKhatmah = async (k) => {
    if (activeDiv) activeDiv.classList.remove('d-none');
    if (createDiv) createDiv.classList.add('d-none');
    if (kNameEl) kNameEl.innerText = k.name || 'ختمتي';
    
    const sIdx      = parseInt(k.currentSurah) - 1;
    const surahName = surahNames[sIdx] || `سورة ${k.currentSurah}`;
    
    if (statusText) {
      statusText.innerHTML = `أنت متوقف عند <strong>سورة ${surahName}</strong> - آية <strong>${k.currentAyah}</strong>`;
    }
    if (surahSelect)       surahSelect.value      = k.currentSurah;
    if (currentAyahInput)  currentAyahInput.value = k.currentAyah;
    
    const progress = Math.round((parseInt(k.currentSurah) / 114) * 100);
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
      progressBar.innerText   = `${progress}%`;
    }
    
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform() && k.name && typeof scheduleDailyWird === 'function') {
      await scheduleDailyWird(k.name);
    }
  };

  // ─── 1. عرض فوري من الكاش (0 ثانية انتظار) ───────────────────────────────
  const cachedKhatmah = await loadFromCache();
  if (cachedKhatmah) {
    await renderKhatmah(cachedKhatmah);
  }

  // ─── 2. مزامنة صامتة في الخلفية ──────────────────────────────────────────
  if (navigator.onLine) {
    axios.get('/api/v1/khatmah')
      .then(async (res) => {
        const freshK = res.data.data.khatmah;
        await localforage.setItem('latest_khatmah', {
          currentSurah: freshK.currentSurah,
          currentAyah:  freshK.currentAyah,
          page:         freshK.page || null
        });
        await localforage.setItem('khatmah_meta', {
          name:      freshK.name,
          targetMsg: res.data.data.message || "واصل تقدمك لختم القرآن الكريم ✨"
        });
        
        if (kTargetEl) kTargetEl.innerText = res.data.data.message || "واصل تقدمك لختم القرآن الكريم ✨";
        
        await renderKhatmah({
          currentSurah: freshK.currentSurah,
          currentAyah:  freshK.currentAyah,
          page:         freshK.page,
          name:         freshK.name
        });
      })
      .catch(async (apiErr) => {
        console.warn('⚠️ [KHATMAH] فشل المزامنة الخلفية:', apiErr.message);
        // لو الختمة اتمسحت من جهاز تاني → نمسح الكاش ونظهر فورم الإنشاء
        if (apiErr.response?.status === 404) {
          await localforage.removeItem('latest_khatmah');
          await localforage.removeItem('khatmah_meta');
          if (activeDiv) activeDiv.classList.add('d-none');
          if (createDiv) createDiv.classList.remove('d-none');
        } else if (!cachedKhatmah) {
          if (activeDiv) activeDiv.classList.add('d-none');
          if (createDiv) createDiv.classList.remove('d-none');
        }
      });
  } else if (!cachedKhatmah) {
    if (activeDiv) activeDiv.classList.add('d-none');
    if (createDiv) createDiv.classList.remove('d-none');
  }
}

export async function createKhatmah(name, durationDays) {
  try {
    const res = await axios.post('/api/v1/khatmah', { name, durationDays });
    if (res.data.status === 'success') await manageKhatmah();
  } catch (err) {
    if (err.response?.status === 401) {
      requireLogin('إنشاء ختمة');
    } else {
      showAlert('error', err.response?.data?.message || 'حدث خطأ، حاول مرة أخرى');
    }
  }
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
  } catch (err) {
    if (err.response?.status === 401) {
      requireLogin('حذف الختمة');
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
          ${userAudioUrl ? `<audio controls src="${userAudioUrl}" class="custom-audio-player" style="height: 35px; width: 100%;"></audio>` : '<p class="text-muted small">لا يوجد تسجيل صوتي</p>'}
        </div>
        <div id="volume-control-ai" class="d-none mt-3 text-center">
          <label class="form-label fw-bold text-muted small"><i class="fas fa-volume-up me-1"></i> مستوى الصوت</label>
          <input type="range" class="form-range" id="volume-slider-ai" min="0" max="1" step="0.1" value="1" style="width: 200px; accent-color: #198754;">
        </div>
      </div>
      <div class="ai-result-box p-4 bg-white border rounded shadow-sm mb-4" style="font-family: 'Amiri Quran', 'Amiri', serif; font-size: 28px; line-height: 2.4; direction: rtl; text-align: right;">
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

    resultHTML += `</div><div class="text-center"><button id="btn-retry" class="btn btn-success px-5">محاولة جديدة</button></div>`;
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
  const audioPlayer = document.querySelector('audio');
  if (audioPlayer) { audioPlayer.pause(); audioPlayer.src = ''; }
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) fileInput.value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ─── loadReciters ─────────────────────────────────────────────────────────────

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

    // ─── أونلاين: جلب من API ───────────────────────────────────────────────────
    const res = await axios.get('/api/v1/audio/reciters');
    const container = document.getElementById('reciters-container');
    if (!container) return;

    const recitersList = res.data.data.reciters || [];

    // 🌟 إضافة الشيخ عبد الرحمن الزواوي يدوياً إلى القائمة القادمة من الـ API
    recitersList.push({
      name: "Abdelrahman Elzwawy",
      server: "https://archive.org/download/Abdelrahman-Elzwawy-Quran-App-2026" 
    });

    if (!recitersList || recitersList.length === 0) {
      container.innerHTML = '<p class="text-center">لا يوجد قراء متاحون حالياً.</p>';
      return;
    }

    // حفظ بيانات القراء (بما فيهم الزواوي) للاستخدام أوفلاين لاحقاً
    await localforage.setItem('cached_reciters', recitersList);

    container.innerHTML = '';
    await renderReciters(recitersList, container);

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





async function renderReciters(recitersList, container) {
  if (!container) return;
  container.innerHTML = '';
  const reciterSurahNames = surahNames;
  const reciterNamesAr = {
    "Mishary Rashid Alafasy": "مشاري راشد العفاسي",
    "Maher Al Muaiqly": "ماهر المعيقلي",
    "Mahmoud Khalil Al-Hussary": "محمود خليل الحصري",
    "Saud Al-Shuraim": "سعود الشريم",
    "Abdelbasset Abdessamad": "عبد الباسط عبد الصمد",
    "Abdelrahman Elzwawy": "عبد الرحمن الزواوي" 
  };
  const reciterImages = {
    "Mishary Rashid Alafasy": "/img/reciters/mishary.jpg",
    "Maher Al Muaiqly": "/img/reciters/maher.jpg",
    "Mahmoud Khalil Al-Hussary": "/img/reciters/hussary.jpg",
    "Saud Al-Shuraim": "/img/reciters/shuraim.jpg",
    "Abdelbasset Abdessamad": "/img/reciters/abdelbasset.jpg",
    "Abdelrahman Elzwawy": "/img/reciters/elzwawy.jpg" 
  };

  let optionsHTML = '';
  reciterSurahNames.forEach((name, index) => {
    optionsHTML += `<option value="${index + 1}">${index + 1}. ${name}</option>`;
  });

  for (const reciter of recitersList) {
    const displayName = reciterNamesAr[reciter.name] || reciter.name;
    const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=198754&color=fff&size=128&font-size=0.33`;
    const imageUrl = reciterImages[reciter.name] || fallbackImage;
    const serverUrl = reciter.server.endsWith('/') ? reciter.server.slice(0, -1) : reciter.server;
    const defaultUrl = `${serverUrl}/001.mp3`;

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
      } catch(e) { console.error("Cache blob error during render", e); }
    }

    container.insertAdjacentHTML('beforeend', `
      <div class="col-md-4 col-sm-6">
        <div class="card h-100 shadow-sm border-0" style="border-radius: 16px; overflow: hidden;">
          <div class="card-body text-center p-4">
            <div class="mb-3 position-relative d-inline-block">
              <img src="${imageUrl}" loading="lazy"
                onerror="this.onerror=null; this.src='${fallbackImage}';"
                alt="${displayName}"
                class="rounded-circle shadow-sm"
                style="width: 100px; height: 100px; object-fit: cover; border: 3px solid #198754;">
            </div>
            <h5 class="card-title fw-bold text-dark mb-1">${displayName}</h5>
            <p class="small text-muted mb-3">رواية حفص عن عاصم</p>

            <div class="form-group mb-2">
              <select class="form-select surah-select" style="font-family: 'Amiri'; border-radius: 10px;" data-server="${serverUrl}">${optionsHTML}</select>
            </div>

            <div class="audio-loading-indicator d-none text-success small fw-bold mb-1" style="transition: opacity 0.3s;">
              <i class="fas fa-circle-notch fa-spin me-1"></i> جاري التحميل...
            </div>

            <audio controls class="w-100 mt-1 quran-player" preload="metadata"
              src="${audioSrc}"  
              data-url="${defaultUrl}"
              data-reciter="${displayName}"
              style="border-radius: 30px;">
            </audio>

            <button class="btn btn-sm mt-2 download-audio-btn w-100 ${isDefaultCached ? 'btn-outline-success' : 'btn-outline-secondary'}"
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

  // ─── Event Listeners ───────────────────────────────────────────────────────
  
  document.querySelectorAll('.surah-select').forEach(select => {
    if (window.transformSelectToSearchable) window.transformSelectToSearchable(select);
    select.addEventListener('change', async function() {
      const paddedSurah = this.value.toString().padStart(3, '0');
      const cardBody = this.closest('.card-body');
      const newUrl = `${this.dataset.server}/${paddedSurah}.mp3`;
      const audioPlayer = cardBody.querySelector('audio');
      const downloadBtn = cardBody.querySelector('.download-audio-btn');
      const loadingIndicator = cardBody.querySelector('.audio-loading-indicator');

      if (audioPlayer) {
        // إظهار التحميل فوراً عند تغيير السورة من القائمة
        loadingIndicator.classList.remove('d-none');
        audioPlayer.dataset.url = newUrl;
        audioPlayer.src = newUrl;
      }

      const isCached = await isAudioCached(newUrl);
      if (downloadBtn) {
        if (isCached) {
          downloadBtn.innerHTML = '<i class="fas fa-check-circle text-success"></i> محفوظة أوفلاين ✓';
          downloadBtn.className = 'btn btn-sm mt-2 download-audio-btn w-100 btn-outline-success';
          
          try {
            const cache = await caches.open('quran-audio-cache-v1');
            const cachedRes = await cache.match(newUrl);
            if (cachedRes) {
              const blob = await cachedRes.blob();
              if (audioPlayer) audioPlayer.src = URL.createObjectURL(blob);
            }
          } catch(e) { console.error("Cache blob error", e); }
          
        } else {
          downloadBtn.innerHTML = '<i class="fas fa-download me-1"></i> حفظ للاستماع أوفلاين';
          downloadBtn.className = 'btn btn-sm mt-2 download-audio-btn w-100 btn-outline-secondary';
        }
        downloadBtn.disabled = false;
        downloadBtn.setAttribute('onclick', `window.downloadAudioOffline('${newUrl}', this)`);
      }
    });
  });

  document.querySelectorAll('.quran-player').forEach(player => {
    const cardBody = player.closest('.card-body');
    const loadingIndicator = cardBody.querySelector('.audio-loading-indicator');

    player.addEventListener('loadstart', () => loadingIndicator.classList.remove('d-none'));
    player.addEventListener('waiting',   () => loadingIndicator.classList.remove('d-none')); 
    player.addEventListener('playing',   () => loadingIndicator.classList.add('d-none'));
    player.addEventListener('canplay',   () => loadingIndicator.classList.add('d-none')); 
    player.addEventListener('pause',     () => loadingIndicator.classList.add('d-none'));
    player.addEventListener('error',     () => {
        loadingIndicator.classList.add('d-none');
        
        if (navigator.onLine && player.offsetParent !== null) {
            Swal.fire({ 
              toast: true, 
              position: 'top', 
              icon: 'error', 
              title: 'عذراً، فشل تحميل المقطع الصوتي', 
              showConfirmButton: false, 
              timer: 3000 
            });
        }
    });

    player.addEventListener('play', function(e) {
      // إيقاف باقي المشغلات
      document.querySelectorAll('audio').forEach(a => { if (a !== this) a.pause(); });

      if (!navigator.onLine && !this.src.startsWith('blob:')) {
        e.preventDefault();
        this.pause();
        loadingIndicator.classList.add('d-none'); // إخفاء التحميل لو مفيش نت
        
        const select = cardBody?.querySelector('.surah-select');
        const surahName = select ? select.options[select.selectedIndex]?.text.replace(/^\d+\.\s*/, '') : '';
        showOfflineAudioMessage(surahName || this.dataset.reciter);
      }
    });
  });
}

export const scheduleAllPrayers = async (prayerTimes) => {
  try {
    try { await LocalNotifications.cancel({ notifications: [{ id: 101 }, { id: 102 }, { id: 103 }, { id: 104 }, { id: 105 }] }); } catch(e) {}
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
      
      if (prayerDate <= nowRef) prayerDate.setDate(prayerDate.getDate() + 1);
      
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

      console.log(`⏰ تم جدولة ${prayerNamesAr[key]} على الساعة: ${prayerDate.toLocaleTimeString('ar-EG')}`);
    });

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log('✅ [PRAYERS] تم جدولة جميع الصلوات الخمس بنجاح!');
    }
  } catch (error) { 
      console.error('❌ خطأ في جدولة إشعارات الصلاة:', error); 
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
        await localforage.setItem('offline_prayers', { timings, hijri, cityName, savedAt: Date.now() });
        if (Capacitor.isNativePlatform()) {
          const lastScheduled = await localforage.getItem('prayers_last_scheduled');
          const today = new Date().toDateString();
          if (lastScheduled !== today) {
              await scheduleAllPrayers(timings);
              await localforage.setItem('prayers_last_scheduled', today);
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
        // لو مشكلة تانية (مثلاً الـ GPS مقفول في الموبايل أو تايم أوت)
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

const stripTashkeel = (text) => {
  if (!text) return '';
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/۩/g, '')
    .trim();
};

const searchInCachedPages = async (query) => {
  const _cacheGet = window['cacheGet'];
  if (!_cacheGet) return [];

  const results = [];
  const q = stripTashkeel(query); // تجريد كلمة البحث من التشكيل

  for (let page = 1; page <= 604; page++) {
    const pageData = await _cacheGet(page);
    if (!pageData || !pageData.ayahs) continue;

    for (const ayah of pageData.ayahs) {
      const text = ayah.text || ayah.ayahText || '';
      const cleanText = stripTashkeel(text); // تجريد الآية المحفوظة لتطابق كلمة البحث

      if (cleanText.includes(q)) {
        results.push({
          text, // نرجع النص الأصلي بالتشكيل عشان يظهر بشكل جميل
          surahNameAr: ayah.surahNameAr || (ayah.surah?.name) || '',
          surahNumber: ayah.surahNumber || ayah.surah?.number || 0,
          ayahNumber:  ayah.numberInSurah || ayah.ayahNumber || 0,
          page:        ayah.page || page,
        });
        if (results.length >= 30) return results; // زودناها لـ 30 عشان تدي نتائج كافية
      }
    }
  }
  return results;
};

const renderSearchResults = (ayahs, resultsContainer, searchInput) => {
  resultsContainer.innerHTML = '';
  if (ayahs.length === 0) {
    resultsContainer.innerHTML = '<div class="list-group-item text-center text-muted">لا توجد نتائج</div>';
    return;
  }
  
  const query = searchInput.value.trim();
  
  ayahs.forEach(ayah => {
    const item        = document.createElement('a');
    item.className    = 'list-group-item list-group-item-action';
    item.style.cursor = 'pointer';
    const realAyahNum = ayah.ayahNumber || ayah.numberInSurah;

    // تلوين كلمة البحث باللون الأخضر (اختياري)
    const highlightText = ayah.text.replace(new RegExp(query, 'gi'), match => `<span class="text-success fw-bold">${match}</span>`);

    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <span class="fw-bold text-success small">${ayah.surahNameAr} - آية ${realAyahNum}</span>
        <span class="badge bg-light text-dark border">ص ${ayah.page}</span>
      </div>
      <p class="mb-0 mt-1 small text-muted text-end" style="font-family: 'Amiri'; font-size: 1.1em;">${highlightText}...</p>
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
      if (window.loadQuranPage) window.loadQuranPage(ayah.page, ayah.surahNumber, realAyahNum);
      else loadQuranPage(ayah.page, ayah.surahNumber, realAyahNum);
    });

    resultsContainer.appendChild(item);
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
      resultsContainer.innerHTML = '<div class="list-group-item text-center">جاري البحث...</div>';
      resultsContainer.classList.remove('d-none');

      const doOfflineSearch = async () => {
        try {
          resultsContainer.innerHTML = '<div class="list-group-item text-center text-muted small">🔌 وضع أوفلاين - البحث في المصحف المحفوظ...</div>';
          const ayahs = await searchInCachedPages(query);

          if (ayahs.length === 0) {
            const lastSearch = await localforage.getItem('last_search_results');
            if (lastSearch && lastSearch.query === query && lastSearch.ayahs?.length > 0) {
              resultsContainer.innerHTML = '<div class="list-group-item text-center text-warning small">📦 نتائج محفوظة مسبقاً</div>';
              renderSearchResults(lastSearch.ayahs, resultsContainer, searchInput);
            } else {
              resultsContainer.innerHTML = '<div class="list-group-item text-center text-muted">لا توجد نتائج في المصحف المحفوظ</div>';
            }
          } else {
            renderSearchResults(ayahs, resultsContainer, searchInput);
          }
        } catch (err) {
          console.error('[SEARCH OFFLINE] خطأ:', err);
          resultsContainer.innerHTML = '<div class="list-group-item text-danger text-center">حدث خطأ في البحث المحلي</div>';
        }
      };

    if (navigator.onLine) {
        try {
           const res = await axios.get(`/api/v1/quran/search?q=${encodeURIComponent(query)}`, { timeout: 5000 });
          const ayahs = res.data.data.ayahs;
          
          if (!ayahs || ayahs.length === 0) {
             console.log('لم يجد السيرفر نتائج، جاري التشغيل البحث المحلي الذكي...');
             await doOfflineSearch();
          } else {
             await localforage.setItem('last_search_results', { query, ayahs, cachedAt: Date.now() });
             renderSearchResults(ayahs, resultsContainer, searchInput);
          }
        } catch (err) {
          // 2. لو السيرفر واقع أو فيه خطأ
          console.warn('⚠️ فشل البحث أونلاين، جاري التحويل للبحث الأوفلاين...');
          await doOfflineSearch();
        }
      } else {
        // 3. لو الجهاز عارف إنه أوفلاين من البداية
        resultsContainer.innerHTML = '<div class="list-group-item text-center text-muted small">🔌 وضع أوفلاين - البحث في المصحف المحفوظ...</div>';
        await doOfflineSearch();
      }
    }, 500);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.classList.add('d-none');
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


// ─── ✅ الأذكار - Azkar Data & Loader ─────────────────────────────────────────


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
    // إلغاء أي تنبيه قديم بنفس الـ ID
    try { await LocalNotifications.cancel({ notifications: [{ id: 777 }] }); } catch (e) {}

    const now = new Date();

    // إيجاد الجمعة القادمة
    const daysUntilFriday = (5 - now.getDay() + 7) % 7; // 5 = الجمعة
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    nextFriday.setHours(10, 0, 0, 0); // الساعة 10 صباحاً

    await LocalNotifications.schedule({
      notifications: [
        {
          id:    777,
          title: 'سورة الكهف 📖 - يوم الجمعة',
          body:  'من قرأ سورة الكهف يوم الجمعة أضاء له النور ما بين الجمعتين',
          schedule: {
            at:              nextFriday,
            every:           'week',   // يتكرر كل أسبوع
            allowWhileIdle:  true,
          },
          channelId:    'khatmah-channel',
          smallIcon:    'ic_notification',
          actionTypeId: 'OPEN_KAHF',  // سيُعالج في index.js
        }
      ]
    });

    console.log(`✅ [FRIDAY] تنبيه سورة الكهف مجدول: ${nextFriday.toLocaleString('ar-EG')}`);
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