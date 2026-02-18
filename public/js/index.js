/* eslint-disable */
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const initNativeFeatures = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
        
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
                console.log('🗑️ Service Worker Unregistered');
            }
            const keys = await caches.keys();
            for (let key of keys) {
                await caches.delete(key);
                console.log('🗑️ Cache Deleted:', key);
            }
        }

       
        await LocalNotifications.cancel({ notifications: [{ id: 101 }] });
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel(pending);
        }
        console.log('✅ تم تنظيف جميع الإشعارات القديمة والكاش');


        await App.removeAllListeners();
        await App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) window.history.back();
            else App.exitApp();
        });

        const perm = await LocalNotifications.requestPermissions();
        if (perm.display === 'granted') {
            
            await LocalNotifications.createChannel({
                id: 'azan-channel',
                name: 'تنبيهات الصلاة',
                importance: 5,
                description: 'قناة تنبيهات تطبيق اقرأ',
                sound: 'azan_short.mp3', 
                visibility: 1,
                vibration: true
            });
            await LocalNotifications.createChannel({
                id: 'khatmah-channel',
                name: 'تنبيهات الورد اليومي',
                importance: 4, 
                visibility: 1,
                vibration: true
            });
            
            console.log('✅ Notification Channels Ready!');
        }
    } catch (err) {
        console.error('❌ Native Init Error:', err);
    }
};

document.addEventListener('DOMContentLoaded', initNativeFeatures);







import axios from 'axios';
import '@babel/polyfill';
import { login, logout, signup, verifyOTP, updateSettings, forgotPassword, resetPassword, deleteUser, showAlert } from './auth';
import { 
  loadSurahs, 
  startSurahReading, 
  manageKhatmah, 
  createKhatmah, 
  updateKhatmahProgress,
  checkRecitation, 
  loadReciters, 
  loadPrayers, 
  loadBookmarks,
  loadQuranPage,
  toggleBookmark, 
  deleteBookmark, 
  deleteKhatmah,
  initSearch  ,
  initBookmarksSearch
} from './features';

let currentPage = parseInt(window.location.pathname.split('/').pop()) || 1;
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

const goToNextPage = () => {
    if (currentPage < 604) { 
        currentPage++;
        loadQuranPage(currentPage);
        window.history.pushState({}, '', `/quran/${currentPage}`);
    }
};

const goToPrevPage = () => {
    if (currentPage > 1) {
        currentPage--;
        loadQuranPage(currentPage);
        window.history.pushState({}, '', `/quran/${currentPage}`);
    }
};

const path = window.location.pathname;
if (path.startsWith('/quran/')) {
    const page = path.split('/')[2]; 
    if (page) {
        loadQuranPage(page);
    }
}

document.addEventListener('click', (e) => {
    if (e.target.closest('.nav-next')) {
        goToNextPage();
    }
    if (e.target.closest('.nav-prev')) {
        goToPrevPage();
        
    }
});

const ayahsContainer = document.getElementById('ayahs-container');

if (ayahsContainer) {
    let touchstartX = 0;
    let touchendX = 0;

    const handleGesture = () => {
        const swipeThreshold = 60;
        if (touchstartX - touchendX > swipeThreshold) goToPrevPage();
        if (touchendX - touchstartX > swipeThreshold)  goToNextPage();
    };

    ayahsContainer.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, { passive: true });
    ayahsContainer.addEventListener('touchend', e => { touchendX = e.changedTouches[0].screenX; handleGesture(); }, { passive: true });

    ayahsContainer.addEventListener('click', (e) => {
        const tafseerTarget = e.target.closest('.ayah-clickable');
        if (tafseerTarget) window.showTafseer(tafseerTarget.dataset.surah, tafseerTarget.dataset.ayah);

        const bookmarkBtn = e.target.closest('.bookmark-icon-btn');
        if (bookmarkBtn) toggleBookmark(bookmarkBtn.dataset.surah, bookmarkBtn.dataset.ayah, bookmarkBtn);

        const khatmahBtn = e.target.closest('.khatmah-icon-btn');
        if (khatmahBtn) {
            khatmahBtn.classList.replace('far', 'fas'); 
            updateKhatmahProgress(khatmahBtn.dataset.surah, khatmahBtn.dataset.ayah);
        }
    });
}

const loginForm = document.querySelector('#loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    login(document.getElementById('email').value, document.getElementById('password').value);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const logOutBtn = document.getElementById('logoutBtn');
  if (logOutBtn) {
    logOutBtn.addEventListener('click', (e) => {
      e.preventDefault(); 
      logout();
    });
  } 
});

const signupForm = document.querySelector('#signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', e => {
    e.preventDefault();
    signup(
      document.getElementById('name').value,
      document.getElementById('email').value,
      document.getElementById('password').value,
      document.getElementById('passwordConfirm').value
    );
  });
}

const verifyOTPForm = document.querySelector('#verifyOTPForm');
if (verifyOTPForm) {
  verifyOTPForm.addEventListener('submit', e => {
    e.preventDefault();
    verifyOTP(document.getElementById('email').value, document.getElementById('otp').value);
  });
}

const userDataForm = document.querySelector('#updateUserForm');
if (userDataForm) {
  userDataForm.addEventListener('submit', e => {
    e.preventDefault();
    updateSettings({ name: document.getElementById('name').value, email: document.getElementById('email').value }, 'data');
  });
}

const userPasswordForm = document.querySelector('#updatePasswordForm');
if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    document.querySelector('.btn-save-password').textContent = 'جاري التحديث...'; 
    await updateSettings({ 
      passwordCurrent: document.getElementById('passwordCurrent').value, 
      password: document.getElementById('password').value, 
      passwordConfirm: document.getElementById('passwordConfirm').value 
    }, 'password');
    document.querySelector('.btn-save-password').textContent = 'تحديث كلمة المرور';
    document.getElementById('passwordCurrent').value = '';
    document.getElementById('password').value = '';
    document.getElementById('passwordConfirm').value = '';
  });
}

const forgotPasswordForm = document.querySelector('#forgotPasswordForm');
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = document.querySelector('button[type="submit"]');
    btn.textContent = 'جاري الإرسال...';
    forgotPassword(document.getElementById('email').value).then(() => { btn.textContent = 'إرسال الرابط'; });
  });
}

const resetPasswordForm = document.querySelector('#resetPasswordForm');
if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', e => {
    e.preventDefault();
    const token = window.location.pathname.split('/')[2];
    const btn = document.querySelector('.btn-reset');
    btn.textContent = 'جاري التحديث...';
    resetPassword(token, document.getElementById('password').value, document.getElementById('passwordConfirm').value).then(() => {
        btn.textContent = 'تغيير كلمة المرور';
    });
  });
}

const deleteBtns = document.querySelectorAll('.delete-user-btn');
if (deleteBtns) {
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (confirm('هل أنت متأكد أنك تريد حذف هذا المستخدم نهائياً؟')) {
        const originalText = btn.textContent;
        btn.textContent = 'جاري الحذف...';
        deleteUser(btn.dataset.id).catch(() => { btn.textContent = originalText; });
      }
    });
  });
}



const currentSurahSelect = document.getElementById('currentSurah');
if (currentSurahSelect && currentSurahSelect.tagName === 'SELECT') {
  surahNames.forEach((name, index) => {
    const opt = document.createElement('option');
    opt.value = index + 1; 
    opt.innerHTML = `${index + 1}. ${name}`; 
    currentSurahSelect.appendChild(opt);
  });
}

if (document.getElementById('active-khatmah')) {
  manageKhatmah();

  const createForm = document.getElementById('createKhatmahForm');
  if (createForm) {
    createForm.addEventListener('submit', e => {
      e.preventDefault();
      createKhatmah(document.getElementById('planName').value, document.getElementById('duration').value);
    });
  }

  const deleteBtn = document.getElementById('deleteKhatmahBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm('هل أنت متأكد أنك تريد إلغاء هذه الختمة نهائياً؟')) {
        deleteKhatmah();
      }
    });
  }

  const updateForm = document.getElementById('updateProgressForm');
  if (updateForm) {
    updateForm.addEventListener('submit', e => {
      e.preventDefault();
      const surah = document.getElementById('currentSurah').value;
      const ayah = document.getElementById('currentAyah').value;
      updateKhatmahProgress(surah, ayah); 
    });
  }
}

if (document.getElementById('surahs-container')) loadSurahs();

if (document.getElementById('surah-name')) {
  const fullPath = window.location.pathname; 
  const pathParts = fullPath.split('/');
  const param = pathParts.pop();

  if (!isNaN(param)) {
    if (fullPath.includes('/quran/')) {
        loadQuranPage(parseInt(param));
    } else {
        startSurahReading(parseInt(param));
    }
  }
}

if (document.getElementById('bookmarks-container')) {
  loadBookmarks();
  if (typeof initBookmarksSearch === 'function') {
      initBookmarksSearch();
  }
}

const bookmarksList = document.getElementById('bookmarks-container');
if (bookmarksList) {
  bookmarksList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-bookmark-btn');
    if (deleteBtn) {
      if (confirm('هل أنت متأكد من حذف هذه العلامة؟')) {
        deleteBookmark(deleteBtn.dataset.id);
      }
    }
  });
}

if (document.getElementById('reciters-container')) loadReciters();
if (document.getElementById('prayers-list')) loadPrayers();

const aiSurahSelect = document.getElementById('ai-surah-select');
if (aiSurahSelect) {
    aiSurahSelect.innerHTML = '<option value="" selected disabled>اختر السورة...</option>';
    surahNames.forEach((name, index) => {
        const opt = document.createElement('option');
        opt.value = index + 1;
        opt.textContent = `${index + 1}. ${name}`;
        aiSurahSelect.appendChild(opt);
    });
}

const triggerUpload = document.getElementById('triggerUpload');
const audioFile = document.getElementById('audioFile');
const uploadBtn = document.getElementById('uploadBtn');

if (triggerUpload && audioFile) {
    triggerUpload.addEventListener('click', () => audioFile.click());
    audioFile.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            uploadBtn.classList.remove('d-none'); 
            triggerUpload.innerText = `تم اختيار: ${this.files[0].name}`;
        }
    });
}

if (uploadBtn) {
    uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const surahValue = aiSurahSelect ? aiSurahSelect.value : null;
        const startAyah = document.getElementById('ai-start-ayah')?.value || null;
        const endAyah = document.getElementById('ai-end-ayah')?.value || null;

        if (!audioFile.files[0]) return showAlert('error', 'يرجى اختيار ملف أولاً');
        if (!surahValue) return showAlert('error', 'يرجى اختيار السورة من القائمة');

        const audioUrl = URL.createObjectURL(audioFile.files[0]);
        checkRecitation(audioFile.files[0], surahValue, startAyah, endAyah, audioUrl);
    });
}

let mediaRecorder;
let audioChunks = [];
const recordBtn = document.getElementById('recordBtn');
const recordStatus = document.getElementById('recordStatus');

if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            const surahValue = aiSurahSelect ? aiSurahSelect.value : null;
            if (!surahValue) return showAlert('error', 'يرجى اختيار السورة أولاً');

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: { sampleRate: 48000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                });
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
                audioChunks = [];
                mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    
                    checkRecitation(
                        new File([audioBlob], "rec.webm", { type: "audio/webm" }), 
                        aiSurahSelect.value, 
                        document.getElementById('ai-start-ayah')?.value || null,
                        document.getElementById('ai-end-ayah')?.value || null,
                        audioUrl
                    );
                };
                mediaRecorder.start();
                recordBtn.classList.replace('btn-outline-success', 'btn-danger');
                recordBtn.classList.add('pulse-red');
                recordStatus.innerText = 'جاري التسجيل... انقر للإيقاف';
            } catch (err) { showAlert('error', 'يرجى تفعيل الميكروفون'); }
        } else {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(t => t.stop());
            recordBtn.classList.remove('btn-danger', 'pulse-red');
            recordStatus.innerText = 'تم الانتهاء! جاري التحليل...';
        }
    });
}

window.showTafseer = async (surahId, ayahId) => {
  try {
    Swal.fire({ title: 'جاري جلب التفسير...', didOpen: () => { Swal.showLoading(); } });
    const res = await axios.get(`/api/v1/quran/tafseer/${surahId}/${ayahId}`);
    const data = res.data.data;
    
    Swal.fire({
      title: `<span class="text-success" style="font-family: 'Amiri'">تفسير الآية ${ayahId}</span>`,
      
      html: `
        <p class="lead" style="line-height: 1.8; text-align: justify; direction: rtl; margin-bottom: 20px;">
          ${data.tafseer}
        </p>
        <hr style="border-top: 1px dashed #ccc;">
        <p class="text-muted small" style="text-align: center; margin-top: 10px;">
          📚 المصدر: التفسير الميسر
        </p>
      `,
      
      confirmButtonText: 'إغلاق',
      confirmButtonColor: '#1e5f31',
    });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'خطأ', text: 'عذراً، لم نتمكن من جلب التفسير حالياً.' });
  }
};

initSearch()


//DarkMode
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('theme-toggle');
    const icon = toggleBtn ? toggleBtn.querySelector('i') : null;
    const body = document.body;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun', 'text-warning'); 
        }
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isDark = body.getAttribute('data-theme') === 'dark';

            if (isDark) {
                body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                if (icon) {
                    icon.classList.remove('fa-sun', 'text-warning');
                    icon.classList.add('fa-moon');
                }
            } else {
                body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                if (icon) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun', 'text-warning');
                }
            }
        });
    }
});


