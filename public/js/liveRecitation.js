let fullRecorder;
let aiRecorder;   
let isRecording = false;
let currentAyahWords = []; 
let currentWordIndex = 0;
let fullSessionChunks = []; 
let currentPlayingIcon = null; 

const surahData = [
    { id: 1, name: "الفاتحة", count: 7 }, { id: 2, name: "البقرة", count: 286 }, { id: 3, name: "آل عمران", count: 200 },
    { id: 4, name: "النساء", count: 176 }, { id: 5, name: "المائدة", count: 120 }, { id: 6, name: "الأنعام", count: 165 },
    { id: 7, name: "الأعراف", count: 206 }, { id: 8, name: "الأنفال", count: 75 }, { id: 9, name: "التوبة", count: 129 },
    { id: 10, name: "يونس", count: 109 }, { id: 11, name: "هود", count: 123 }, { id: 12, name: "يوسف", count: 111 },
    { id: 13, name: "الرعد", count: 43 }, { id: 14, name: "إبراهيم", count: 52 }, { id: 15, name: "الحجر", count: 99 },
    { id: 16, name: "النحل", count: 128 }, { id: 17, name: "الإسراء", count: 111 }, { id: 18, name: "الكهف", count: 110 },
    { id: 19, name: "مريم", count: 98 }, { id: 20, name: "طه", count: 135 }, { id: 21, name: "الأنبياء", count: 112 },
    { id: 22, name: "الحج", count: 78 }, { id: 23, name: "المؤمنون", count: 118 }, { id: 24, name: "النور", count: 64 },
    { id: 25, name: "الفرقان", count: 77 }, { id: 26, name: "الشعراء", count: 227 }, { id: 27, name: "النمل", count: 93 },
    { id: 28, name: "القصص", count: 88 }, { id: 29, name: "العنكبوت", count: 69 }, { id: 30, name: "الروم", count: 60 },
    { id: 31, name: "لقمان", count: 34 }, { id: 32, name: "السجدة", count: 30 }, { id: 33, name: "الأحزاب", count: 73 },
    { id: 34, name: "سبأ", count: 54 }, { id: 35, name: "فاطر", count: 45 }, { id: 36, name: "يس", count: 83 },
    { id: 37, name: "الصافات", count: 182 }, { id: 38, name: "ص", count: 88 }, { id: 39, name: "الزمر", count: 75 },
    { id: 40, name: "غافر", count: 85 }, { id: 41, name: "فصلت", count: 54 }, { id: 42, name: "الشورى", count: 53 },
    { id: 43, name: "الزخرف", count: 89 }, { id: 44, name: "الدخان", count: 59 }, { id: 45, name: "الجاثية", count: 37 },
    { id: 46, name: "الأحقاف", count: 35 }, { id: 47, name: "محمد", count: 38 }, { id: 48, name: "الفتح", count: 29 },
    { id: 49, name: "الحجرات", count: 18 }, { id: 50, name: "ق", count: 45 }, { id: 51, name: "الذاريات", count: 60 },
    { id: 52, name: "الطور", count: 49 }, { id: 53, name: "النجم", count: 62 }, { id: 54, name: "القمر", count: 55 },
    { id: 55, name: "الرحمن", count: 78 }, { id: 56, name: "الواقعة", count: 96 }, { id: 57, name: "الحديد", count: 29 },
    { id: 58, name: "المجادلة", count: 22 }, { id: 59, name: "الحشر", count: 24 }, { id: 60, name: "الممتحنة", count: 13 },
    { id: 61, name: "الصف", count: 14 }, { id: 62, name: "الجمعة", count: 11 }, { id: 63, name: "المنافقون", count: 11 },
    { id: 64, name: "التغابن", count: 18 }, { id: 65, name: "الطلاق", count: 12 }, { id: 66, name: "التحريم", count: 12 },
    { id: 67, name: "الملك", count: 30 }, { id: 68, name: "القلم", count: 52 }, { id: 69, name: "الحاقة", count: 52 },
    { id: 70, name: "المعارج", count: 44 }, { id: 71, name: "نوح", count: 28 }, { id: 72, name: "الجن", count: 28 },
    { id: 73, name: "المزمل", count: 20 }, { id: 74, name: "المدثر", count: 56 }, { id: 75, name: "القيامة", count: 40 },
    { id: 76, name: "الإنسان", count: 31 }, { id: 77, name: "المرسلات", count: 50 }, { id: 78, name: "النبأ", count: 40 },
    { id: 79, name: "النازعات", count: 46 }, { id: 80, name: "عبس", count: 42 }, { id: 81, name: "التكوير", count: 29 },
    { id: 82, name: "الانفطار", count: 19 }, { id: 83, name: "المطففين", count: 36 }, { id: 84, name: "الانشقاق", count: 25 },
    { id: 85, name: "البروج", count: 22 }, { id: 86, name: "الطارق", count: 17 }, { id: 87, name: "الأعلى", count: 19 },
    { id: 88, name: "الغاشية", count: 26 }, { id: 89, name: "الفجر", count: 30 }, { id: 90, name: "البلد", count: 20 },
    { id: 91, name: "الشمس", count: 15 }, { id: 92, name: "الليل", count: 21 }, { id: 93, name: "الضحى", count: 11 },
    { id: 94, name: "الشرح", count: 8 }, { id: 95, name: "التين", count: 8 }, { id: 96, name: "العلق", count: 19 },
    { id: 97, name: "القدر", count: 5 }, { id: 98, name: "البينة", count: 8 }, { id: 99, name: "الزلزلة", count: 8 },
    { id: 100, name: "العاديات", count: 11 }, { id: 101, name: "القارعة", count: 11 }, { id: 102, name: "التكاثر", count: 8 },
    { id: 103, name: "العصر", count: 3 }, { id: 104, name: "الهمزة", count: 9 }, { id: 105, name: "الفيل", count: 5 },
    { id: 106, name: "قريش", count: 4 }, { id: 107, name: "الماعون", count: 7 }, { id: 108, name: "الكوثر", count: 3 },
    { id: 109, name: "الكافرون", count: 6 }, { id: 110, name: "النصر", count: 3 }, { id: 111, name: "المسد", count: 5 },
    { id: 112, name: "الإخلاص", count: 4 }, { id: 113, name: "الفلق", count: 5 }, { id: 114, name: "الناس", count: 6 }
];

document.addEventListener('DOMContentLoaded', () => {
    const surahSelect = document.getElementById('surah-select');
    if (surahSelect) {
        surahData.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.text = `${s.id}. ${s.name}`;
            surahSelect.appendChild(option);
        });
    }
});

function normalizeFrontend(text) {
    if (!text) return "";
    return text
        .replace(/[\u064B-\u065F\u06D6-\u06ED\u0670\u0640]/g, '') 
        .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
        .replace(/ئ/g, 'ي').replace(/ؤ/g, 'و')
        .replace(/الرحمان/g, 'الرحمن').replace(/الصلوة/g, 'الصلاة')
        .replace(/\s+/g, ' ').trim();
}

async function loadAyahs() {
    const surahId = document.getElementById('surah-select').value;
    let start = document.getElementById('start-ayah').value;
    let end = document.getElementById('end-ayah').value;

    if (!surahId) return alert("الرجاء اختيار السورة!");
    if (!start) start = 1;
    if (!end) {
        const s = surahData.find(x => x.id == surahId);
        end = s ? s.count : 200;
    }

    try {
        const btn = document.querySelector('button[onclick="loadAyahs()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'جارِ التحميل...';
        btn.disabled = true;

        const res = await axios.get(`/api/v1/quran/ayahs?surah=${surahId}&start=${start}&end=${end}`);
        const ayahs = res.data.data;
        
        if (!ayahs || ayahs.length === 0) {
            btn.innerHTML = originalText;
            btn.disabled = false;
            return alert("لا توجد بيانات");
        }

        const isMemorizeMode = document.getElementById('memorize-mode') ? document.getElementById('memorize-mode').checked : false;
        
        document.getElementById('session-player-area').classList.add('d-none');
        
        renderQuranText(ayahs, isMemorizeMode, surahId);
        
        document.getElementById('controls-area').classList.remove('d-none');
        document.getElementById('status-msg').innerText = "جاهز... اضغط ابدأ التسميع 🎤";
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
    } catch (err) {
        console.error(err);
        alert("فشل التحميل");
        const btn = document.querySelector('button[onclick="loadAyahs()"]');
        btn.innerHTML = 'تحميل';
        btn.disabled = false;
    }
}

function renderQuranText(ayahsData, isHidden, surahId) {
    const container = document.getElementById('quran-text-container');
    container.innerHTML = '';
    currentAyahWords = [];
    currentWordIndex = 0;
    
    ayahsData.forEach(ayah => {
        const words = ayah.text.trim().split(/\s+/).filter(w => w.length > 0);
        
        words.forEach(word => {
            const span = document.createElement('span');
            span.innerText = word + " ";
            span.className = isHidden ? "quran-word word-hidden mx-1" : "quran-word mx-1";
            container.appendChild(span);
            
            currentAyahWords.push({
                element: span,
                clean: normalizeFrontend(word)
            });
        });
        
        const markersContainer = document.createElement('span');
        markersContainer.className = "text-nowrap ms-2"; 

        const ayahNum = ayah.numberInSurah || ayah.number || ayah.ayahNumber; 

        const ayahSymbol = document.createElement('span');
        ayahSymbol.className = "ayah-symbol text-secondary";
        ayahSymbol.innerText = `(${ayahNum.toLocaleString('ar-EG')})`;
        
        const listenIcon = document.createElement('i');
        listenIcon.className = "fas fa-play-circle text-primary me-1 cursor-pointer";
        listenIcon.style.cursor = "pointer";
        listenIcon.title = "استمع للآية";
        
        listenIcon.onclick = function() {
            playAyahAudio(surahId, ayahNum, this);
        };

        markersContainer.appendChild(ayahSymbol);
        markersContainer.appendChild(listenIcon);
        
        container.appendChild(markersContainer);
        container.appendChild(document.createElement('br'));
    });
}

function playAyahAudio(surah, ayah, iconElement) {
    if (isRecording) {
        alert("⚠️ لا يمكن تشغيل الآيات أثناء التسجيل. يرجى إيقاف التسميع أولاً.");
        return;
    }

    const player = document.getElementById('correct-ayah-player');
    if (!player) return;

    // Play/Pause
    
    if (currentPlayingIcon === iconElement && !player.paused) {
        player.pause();
        player.currentTime = 0;
        iconElement.classList.remove('fa-pause-circle', 'text-danger');
        iconElement.classList.add('fa-play-circle', 'text-primary');
        currentPlayingIcon = null;
        return;
    }

    if (currentPlayingIcon) {
        const oldPlayer = document.getElementById('correct-ayah-player');
        oldPlayer.pause();
        currentPlayingIcon.classList.remove('fa-pause-circle', 'text-danger');
        currentPlayingIcon.classList.add('fa-play-circle', 'text-primary');
    }

    const padSurah = String(surah).padStart(3, '0');
    const padAyah = String(ayah).padStart(3, '0');
    const url = `https://everyayah.com/data/Husary_128kbps/${padSurah}${padAyah}.mp3`;
    
    player.src = url;
    player.play().catch(e => console.error("Audio Error:", e));

    iconElement.classList.remove('fa-play-circle', 'text-primary');
    iconElement.classList.add('fa-pause-circle', 'text-danger');
    currentPlayingIcon = iconElement;

    player.onended = () => {
        iconElement.classList.remove('fa-pause-circle', 'text-danger');
        iconElement.classList.add('fa-play-circle', 'text-primary');
        currentPlayingIcon = null;
    };
}

async function startLiveSession() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        document.getElementById('btn-start').classList.add('d-none');
        document.getElementById('btn-stop').classList.remove('d-none');
        document.getElementById('status-msg').innerText = "استمع إليك... 🗣️";
        document.getElementById('status-msg').className = "text-success fw-bold mt-2";
        document.getElementById('session-player-area').classList.add('d-none'); 

        const memorizeCheckbox = document.getElementById('memorize-mode');
        if (memorizeCheckbox) memorizeCheckbox.disabled = true;

        const player = document.getElementById('correct-ayah-player');
        if (!player.paused) {
            player.pause();
            if (currentPlayingIcon) {
                currentPlayingIcon.classList.remove('fa-pause-circle', 'text-danger');
                currentPlayingIcon.classList.add('fa-play-circle', 'text-primary');
                currentPlayingIcon = null;
            }
        }

        isRecording = true;
        fullSessionChunks = []; 

        fullRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        fullRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) fullSessionChunks.push(e.data);
        };
        fullRecorder.start(); 

        startAiRecordingLoop(stream);

    } catch (err) {
        alert("فشل الميكروفون: " + err.message);
    }
}

function startAiRecordingLoop(stream) {
    if (!isRecording) return;

    aiRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    let aiChunks = [];

    aiRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) aiChunks.push(e.data);
    };

    aiRecorder.onstop = async () => {
        if (aiChunks.length > 0) {
            const blob = new Blob(aiChunks, { type: 'audio/webm' });
            if (blob.size > 1000) { 
                await sendChunk(blob);
            }
        }
        if (isRecording) startAiRecordingLoop(stream);
    };

    aiRecorder.start();

    setTimeout(() => {
        if (aiRecorder && aiRecorder.state === 'recording') {
            aiRecorder.stop();
        }
    }, 4000);
}

function stopLiveSession() {
    isRecording = false;

    if (fullRecorder && fullRecorder.state !== 'inactive') fullRecorder.stop();
    if (aiRecorder && aiRecorder.state !== 'inactive') aiRecorder.stop();
    
    if (fullRecorder && fullRecorder.stream) {
        fullRecorder.stream.getTracks().forEach(t => t.stop());
    }

    setTimeout(() => {
        if (fullSessionChunks.length > 0) {
            const fullBlob = new Blob(fullSessionChunks, { type: 'audio/webm' });
            const audioURL = URL.createObjectURL(fullBlob);
            
            const player = document.getElementById('user-full-audio');
            if(player) {
                player.src = audioURL;
                document.getElementById('session-player-area').classList.remove('d-none');
            }
        }
    }, 500);

    document.getElementById('btn-start').classList.remove('d-none');
    document.getElementById('btn-stop').classList.add('d-none');
    document.getElementById('status-msg').innerText = "تم التوقف. استمع لتلاوتك بالأسفل 🎧";
    document.getElementById('status-msg').className = "text-muted mt-2";

    const memorizeCheckbox = document.getElementById('memorize-mode');
    if (memorizeCheckbox) memorizeCheckbox.disabled = false;
    
}

async function sendChunk(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'stream.webm'); 
    const nextWords = currentAyahWords.slice(currentWordIndex, currentWordIndex + 15)
                                      .map(w => w.clean).join(" ");
    
    const surahId = document.getElementById('surah-select').value;
    const surahObj = surahData.find(s => s.id == surahId);
    
    formData.append('expectedContext', nextWords);
    formData.append('surahName', surahObj ? surahObj.name : "");

    try {
        const res = await axios.post('/api/v1/quran/stream-check', formData);
        const spokenText = res.data.text;
        
        if (spokenText && spokenText.trim().length > 0) {
         //   console.log("AI Heard:", spokenText);
            processFeedback(spokenText);
        }
    } catch (err) {
        console.warn("Stream processing skipped:", err.message);
    }

}

function processFeedback(spokenText) {
    if (!spokenText) return;
    
    const cleanSpoken = normalizeFrontend(spokenText);
    const spokenWords = cleanSpoken.split(" ");
    
    spokenWords.forEach(word => {
        if (currentWordIndex >= currentAyahWords.length) return;

        let searchWindow = 3; 
        if (currentAyahWords.length - currentWordIndex < 3) searchWindow = currentAyahWords.length - currentWordIndex;

        for (let i = 0; i < searchWindow; i++) {
            const targetIndex = currentWordIndex + i;
            const targetObj = currentAyahWords[targetIndex];

            if (isCloseMatch(word, targetObj.clean)) {
                for (let j = currentWordIndex; j <= targetIndex; j++) {
                    const el = currentAyahWords[j].element;
                    el.classList.remove('word-hidden');
                    el.classList.add('word-visible');
                    el.classList.add('text-success');
                }

                currentWordIndex = targetIndex + 1;
                currentAyahWords[targetIndex].element.scrollIntoView({ behavior: "smooth", block: "center" });
                break; 
            }
        }
    });
}

function isCloseMatch(spoken, target) {
    if (!spoken || !target) return false;
    if (spoken === target) return true;
    if (spoken.includes(target)) return true;
    if (target.includes(spoken) && spoken.length > 2) return true;
    if (target.length > 4 && getEditDistance(spoken, target) <= 1) return true;
    return false;
}

function getEditDistance(a, b) {
    if(a.length == 0) return b.length; 
    if(b.length == 0) return a.length; 
    var matrix = [];
    var i;
    for(i = 0; i <= b.length; i++){ matrix[i] = [i]; }
    var j;
    for(j = 0; j <= a.length; j++){ matrix[0][j] = j; }
    for(i = 1; i <= b.length; i++){
        for(j = 1; j <= a.length; j++){
            if(b.charAt(i-1) == a.charAt(j-1)){
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}