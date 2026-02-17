/* eslint-disable */
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


export async function loadQuranPage(pageNumber) {
  try {
    const res = await axios.get(`/api/v1/quran/page/${pageNumber}`);
    const { ayahs, khatmah } = res.data.data;
    
    const pageNum = parseInt(pageNumber);
    currentPage = pageNum; 
    let userBookmarks = [];
    const isLoggedIn = document.getElementById('logoutBtn') !== null;
    if (isLoggedIn) {
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
    
    const container = document.getElementById('ayahs-container');
    if (!container) return;
    container.innerHTML = '';

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
            <span class="ayah-text ayah-clickable" data-surah="${ayah.surahNumber}" data-ayah="${ayahNum}" title="تفسير الآية ${ayahNum}" style="cursor: pointer;">${ayahText}</span>
            <span class="ayah-end-wrapper" style="white-space: nowrap; display: inline-block;">
                <span class="ayah-end-symbol" style="color: #d4af37; font-family: sans-serif; margin: 0 5px; border: 1px solid #d4af37; border-radius: 50%; padding: 0 5px; font-size: 0.8em;">${ayahNum}</span>
                <i class="${iconClass} fa-bookmark bookmark-icon-btn" data-surah="${ayah.surahNumber}" data-ayah="${ayahNum}" title="حفظ علامة مرجعية" style="cursor: pointer; color: ${iconColor}; font-size: 0.7em;"></i>
            </span>
            <i class="${khatmahClass} fa-flag khatmah-icon-btn mx-1" data-surah="${ayah.surahNumber}" data-ayah="${ayah.ayahNumber}" title="${isKhatmahActive ? 'أنت تتوقف هنا' : 'تحديث الختمة هنا'}" style="cursor: pointer; color: ${khatmahColor}; font-size: 0.8em;"></i>
        `;
    });

    fullTextHTML += '</div><div class="text-center mt-3 text-muted small">- ' + pageNum + ' -</div>';
    container.innerHTML = fullTextHTML;
    
    const navButtons = document.querySelectorAll('.nav-prev, .nav-next, #prev-surah-mobile, #next-surah-mobile');
    navButtons.forEach(btn => btn.classList.remove('d-none'));
    
    if (typeof updateNavButtons === 'function') {
        updateNavButtons();
    }

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
          <a href="/quran/${startPage}" class="text-decoration-none"> <div class="card h-100 hover-shadow border-0 shadow-sm">
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
  const isLoggedIn = document.getElementById('logoutBtn') !== null;
  if (!isLoggedIn) {
    return showAlert('error', 'يجب تسجيل الدخول أولاً لحفظ العلامات المرجعية');
  }
  try {
    const res = await axios.post('/api/v1/bookmarks', { surahNumber: surah, ayahNumber: ayah });
    if (res.data.message === 'added') {
      iconElement.classList.replace('far', 'fas');
      iconElement.style.color = '#d4af37';
      showAlert('success', 'تم حفظ العلامة المرجعية 🔖');
    } else {
      iconElement.classList.replace('fas', 'far');
      iconElement.style.color = '#ccc';
      showAlert('success', 'تم إزالة العلامة المرجعية');
    }
  } catch (err) { showAlert('error', 'يرجى تسجيل الدخول لتتمكن من حفظ موضعك في المصحف الشريف. '); }
}

export async function loadBookmarks() {
  try {
    const res = await axios.get('/api/v1/bookmarks');
    const container = document.getElementById('bookmarks-container');
    if (!container) return;
    
    container.innerHTML = '';
    const { bookmarks } = res.data.data;
    
    // console.log("Bookmarks Loaded:", bookmarks); 

    if (bookmarks.length === 0) {
      container.innerHTML = `<div class="text-center py-5"><i class="far fa-bookmark fa-4x text-muted mb-3"></i><p class="lead">لا توجد علامات محفوظة حالياً</p><a href="/quran" class="btn btn-success">اذهب للمصحف واحفظ أول علامة</a></div>`;
      return;
    }

    bookmarks.forEach(b => {
      const surahNum = parseInt(b.surah);
      
      let targetPage = b.page ? parseInt(b.page) : null;

      if (!targetPage || isNaN(targetPage)) {
         if (surahStartPages[surahNum]) {
            //  console.warn(`⚠️ Missing page for Surah ${surahNum}, using fallback: ${surahStartPages[surahNum]}`);
             targetPage = surahStartPages[surahNum];
         } else {
             targetPage = 1;  
         }
      }

      const html = `
        <div class="col-md-6 mb-3">
          <div class="card shadow-sm border-start border-success border-4 h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <h5 class="card-title text-success">${b.surahName}</h5>
                <button class="btn btn-sm btn-outline-danger delete-bookmark-btn" data-id="${b._id}"><i class="fas fa-trash"></i></button>
              </div>
              <p class="ayah-text text-dark mt-2" style="font-family: 'Amiri'; font-size: 1.2rem;">${b.ayahText}</p>
              <div class="mt-3 d-flex justify-content-between align-items-center">
                <span class="badge bg-light text-dark">آية رقم: ${b.ayah}</span>
                
                <a href="/quran/${targetPage}" class="btn btn-sm btn-success">
                   <i class="fas fa-book-open me-1"></i> انتقل للآية
                </a>
                
              </div>
            </div>
          </div>
        </div>`;
      container.insertAdjacentHTML('beforeend', html);
    });
  } catch (err) { console.error(err); }
}

export async function deleteBookmark(id) {
  try {
    await axios.delete(`/api/v1/bookmarks/${id}`);
    showAlert('success', 'تم الحذف بنجاح');
    loadBookmarks(); 
  } catch (err) { showAlert('error', 'فشل الحذف'); }
}

export async function manageKhatmah() {
  try {
    const res = await axios.get('/api/v1/khatmah');
    const activeDiv = document.getElementById('active-khatmah');
    if (!activeDiv) return;
    activeDiv.classList.remove('d-none');
    
    const k = res.data.data.khatmah;
    
    document.getElementById('khatmah-name').innerText = k.name;
    
    const msg = res.data.data.message || "واصل تقدمك لختم القرآن الكريم ✨";
    document.getElementById('daily-target').innerText = msg;

    const sIdx = parseInt(k.currentSurah) - 1;
    const surahName = surahNames[sIdx] || `سورة ${k.currentSurah}`;
    
    const statusText = document.getElementById('khatmah-status-text');
    if (statusText) {
        statusText.innerHTML = `أنت متوقف عند <strong>سورة ${surahName}</strong> - آية <strong>${k.currentAyah}</strong>`;
    }
    
    if(document.getElementById('currentSurah')) document.getElementById('currentSurah').value = k.currentSurah;
    if(document.getElementById('currentAyah')) document.getElementById('currentAyah').value = k.currentAyah;
    
    const progress = Math.round(((parseInt(k.currentSurah) / 114) * 100)); 
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.innerText = `${progress}%`;
    }

  } catch (err) {
    const createDiv = document.getElementById('create-khatmah');
    if (createDiv) createDiv.classList.remove('d-none');
  }
}

export async function createKhatmah(name, durationDays) {
  try {
    const res = await axios.post('/api/v1/khatmah', { name, durationDays });
    if (res.data.status === 'success') location.reload();
  } catch (err) { showAlert('error', err.response.data.message); }
}



export async function updateKhatmahProgress(surah, ayah) {
    try {
    const res = await axios.patch('/api/v1/khatmah', { surah, ayah });
    
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
      showAlert('error', 'حدث خطأ، يرجى المحاولة مرة أخرى.'); 
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
  } catch (err) { showAlert('error', 'فشل إلغاء الختمة'); }
}
window.playCorrectAudio = (surah, ayah) => {
    const s = surah.toString().padStart(3, '0');
    const a = ayah.toString().padStart(3, '0');
    
    const audioUrl = `https://everyayah.com/data/Husary_Muallim_128kbps/${s}${a}.mp3`;
    
    const audio = new Audio(audioUrl);
    audio.play().catch(() => showAlert('error', 'عذراً، فشل تشغيل الصوت التعليمي'));
};

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
    
    document.getElementById('btn-retry').addEventListener('click', () => location.reload());

  } catch (err) {
    showAlert('error', 'عذراً، تعذر الاتصال بالشبكة. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.');
    document.getElementById('result-container').classList.add('d-none');
  }
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
    const reciterNamesAr = {
    "Mishary Rashid Alafasy": "مشاري راشد العفاسي",
    "Maher Al Muaiqly": "ماهر المعيقلي",
    "Mahmoud Khalil Al-Hussary": "محمود خليل الحصري",
    "Saud Al-Shuraim": "سعود الشريم",
    "Abdelbasset Abdessamad": "عبد الباسط عبد الصمد"
};

    let optionsHTML = '';
    surahNames.forEach((name, index) => {
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
              <p class="small text-muted mb-3">${'رواية حفص عن عاصم'}</p>
              
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
                    // audio.currentTime = 0; 
                }
            });
        }
    }, true);

  } catch (err) {
    console.error("Error loading reciters:", err);
    const container = document.getElementById('reciters-container');
    if(container) container.innerHTML = '<p class="text-danger text-center">حدث خطأ في تحميل القراء.</p>';
  }
}

export function loadPrayers() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const { latitude, longitude } = position.coords;

        const res = await axios.get(`/api/v1/prayers?lat=${latitude}&lng=${longitude}`);
        const timings = res.data.data.timings;
        const container = document.getElementById('prayers-list');
        
        if (!container) return;

        document.getElementById('hijri-date').innerText = res.data.data.hijri; 
        
       
        try {
            const cityRes = await axios.get(`/api/v1/prayers/get-location?lat=${latitude}&lon=${longitude}`);
            const address = cityRes.data.data.address;
            const cityName = address.city || address.town || address.village || address.state || "موقعك الحالي";
            document.getElementById('location-name').innerText = `مواقيت الصلاة في ${cityName}`;
        } catch (cityErr) {
            document.getElementById('location-name').innerText = 'مواقيت الصلاة حسب موقعك الحالي';
        }

        container.innerHTML = '';
        const prayerNamesAr = {
          Fajr: "الفجر", Sunrise: "الشروق", Dhuhr: "الظهر",
          Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء"
        };

        for (const [key, value] of Object.entries(timings)) {
          const name = prayerNamesAr[key] || key;
          const html = `
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <span class="fw-bold">${name}</span>
              <span class="badge bg-success rounded-pill" style="font-family: sans-serif">${value}</span>
            </div>`;
          container.insertAdjacentHTML('beforeend', html);
        }
      } catch (err) { 
        console.error(err);
        alert('فشل جلب المواقيت'); 
      }
    });
  }
}




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
          console.log(ayah);
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
    
    if (window.location.pathname.includes('/quran/')) {
        loadQuranPage(targetPage);
        window.history.pushState({}, '', `/quran/${targetPage}`);
    } else {
        window.location.assign(`/quran/${targetPage}`);
    }

    resultsContainer.classList.add('d-none'); 
    searchInput.value = '';
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