const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const levenshtein = require('fast-levenshtein');
const diff = require("diff");
const Recitation = require("../models/recitationModel");
const Ayah = require("../models/Ayah");
const catchAsync = require("../utils/catchAsync");

// 🌟 1. إعداد مصفوفة مفاتيح Groq 🌟
const groqClients = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY02,
    process.env.GROQ_API_KEY03
].filter(Boolean).map(key => new Groq({ apiKey: key }));

let currentGroqIndex = 0; 
async function executeGroqWithFallback(filePath, options) {
    for (let attempts = 0; attempts < groqClients.length; attempts++) {
        const currentClient = groqClients[currentGroqIndex];
        
        try {
            // ملاحظة هامة: يجب إنشاء الـ Stream داخل الـ Try عشان لو فشل نفتح واحد جديد للمحاولة اللي بعدها
            const fileStream = fs.createReadStream(filePath);
            
            const response = await currentClient.audio.transcriptions.create({
                file: fileStream,
                ...options
            });
            
            return response; // لو نجح، رجع النتيجة واخرج من اللوب

        } catch (error) {
            // قراءة كود الخطأ (سواء جاء من SDK أو من الشبكة)
            const statusCode = error?.status || error?.response?.status;
            
            if (statusCode === 429) {
                console.warn(`⚠️ Groq Key ${currentGroqIndex + 1} Rate Limited. Switching to next key...`);
                // تبديل للمفتاح التالي في المصفوفة
                currentGroqIndex = (currentGroqIndex + 1) % groqClients.length;
            } else {
                // لو الخطأ مش 429 (يعني مثلاً الملف الصوتي بايظ)، ارمي الخطأ فوراً
                throw error;
            }
        }
    }
    
    // لو اللوب خلص وكل المفاتيح جابت 429
    throw new Error('عذراً، يوجد ضغط عالي جداً على خوادم التصحيح حالياً. يرجى المحاولة بعد دقيقة.');
}

const surahAyahCounts = {
    1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
    11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98, 20: 135,
    21: 112, 22: 78, 23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88, 29: 69, 30: 60,
    31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83, 37: 182, 38: 88, 39: 75, 40: 85,
    41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35, 47: 38, 48: 29, 49: 18, 50: 45,
    51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96, 57: 29, 58: 22, 59: 24, 60: 13,
    61: 14, 62: 11, 63: 11, 64: 18, 65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44,
    71: 28, 72: 28, 73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42,
    81: 29, 82: 19, 83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20,
    91: 15, 92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11,
    101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3, 109: 6, 110: 3,
    111: 5, 112: 4, 113: 5, 114: 6
};

// --- القائمة السحرية: تحويل الرسم العثماني وأخطاء Whisper إلى إملائي موحد ---
const standardMapping = {
    // الرسم العثماني -> الإملائي
    "الصلوة": "الصلاة", "الزكوة": "الزكاة", "الحيوة": "الحياة", "الربوا": "الربا",
    "السموات": "السماوات", "مشكوة": "مشكاة", "النجوة": "النجاة", "الغدوة": "الغداة",
    "منوة": "مناة", "ايت": "آيات", "ءايت": "آيات", "بايت": "بآيات",
    "لئيكة": "الأيكة", "الايكة": "الأيكة", "الرحمان": "الرحمن",
    "إبرهم": "إبراهيم", "إبرهيم": "إبراهيم", "إسمعيل": "إسماعيل",
    "يحي": "يحيى", "طحيها": "طحاها", "سجى": "سجي", "قلى": "قلي",
    "الكفرون": "الكافرون", "عبدون": "عابدون", "داوود": "داود",
    "ملكي": "مالك", "ملك": "مالك", "الصراط": "الصراط", "الصرط": "الصراط",
    "بمسيطر": "بمصيطر", "المسيطرون": "المصيطرون", "يبصط": "يبسط",    
    "الظالين": "الضالين", "مغضوب": "المغضوب", "نستعين": "نستعين",
    "قل": "قل", "يايها": "ياأيها", "ياايها": "ياأيها"
};

function normalization(text) {
    if (!text) return "";
    
    text = text
        .replace(/[\u0670]/g, 'ا') 
        .replace(/[\u064B-\u065F\u06D6-\u06ED]/g, '') 
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\u0640/g, '') 
        .replace(/ئ/g, 'ي').replace(/ؤ/g, 'و')
        .replace(/\s+/g, ' ')
        .trim();

    return text.split(" ").map(word => {
        if (standardMapping[word]) return standardMapping[word];
        for (const [key, value] of Object.entries(standardMapping)) {
            if (word.includes(key)) {
                return word.replace(key, value);
            }
        }
        return word;
    }).join(" ");
}

function isPhoneticallyClose(uWord, oWord) {
    if (!uWord || !oWord) return false;
    const dist = levenshtein.get(uWord, oWord);
    const threshold = oWord.length <= 3 ? 1 : Math.floor(oWord.length * 0.40); 
    return dist <= threshold;
}

exports.check_recitation = catchAsync(async (req, res, next) => {
    const startTime = Date.now();

    if (!req.file) return res.status(400).json({ status: 'fail', error: "لم يتم استلام ملف صوتي" });
    if (!req.file.path) return res.status(400).json({ status: 'fail', error: "خطأ: يجب استخدام التخزين المحلي (DiskStorage)" });

    const surah = parseInt(req.body.surah);
    const startAyah = parseInt(req.body.startAyah) || 1;
    const endAyah = parseInt(req.body.endAyah) || surahAyahCounts[surah];

    try {
        const newRecitation = await Recitation.create({
            user: req.user.id,
            audioUrl: req.file.path, 
            surah, startAyah, endAyah, score: 0
        });

        let originalAyahs = await Ayah.find({ 
            surahNumber: surah, 
            ayahNumber: { $gte: startAyah, $lte: endAyah } 
        }).sort({ ayahNumber: 1 });

        let displayWords = [];    
        let comparisonWords = []; 
        let ayahEndIndices = [];

        originalAyahs.forEach((ayah) => {
            const originalTextSplitted = ayah.text.trim().split(/\s+/);
            displayWords.push(...originalTextSplitted);

            const cleanText = normalization(ayah.text);
            const cleanWords = cleanText.split(" ").filter(Boolean);
            comparisonWords.push(...cleanWords);

            ayahEndIndices.push({ index: displayWords.length - 1, number: ayah.ayahNumber });
        });

        const fullReferenceText = comparisonWords.join(" ");

        // 🌟 استدعاء الدالة السحرية بدلاً من الاستدعاء المباشر
        const transcription = await executeGroqWithFallback(req.file.path, {
            model: "whisper-large-v3", 
            language: "ar",
            temperature: 0, 
            prompt: `تلاوة قرآنية دقيقة. القارئ يقرأ: ${fullReferenceText}`
        });

        let rawUserText = normalization(transcription.text);

        if (startAyah === 1 && surah !== 9) {
            const basmalaStandard = "بسم الله الرحمن الرحيم";
            const userWordsArr = rawUserText.split(" ");
            const foundBasmalaStart = userWordsArr.slice(0, 4).some(w => 
                isPhoneticallyClose(w, "بسم") || isPhoneticallyClose(w, "الله") || isPhoneticallyClose(w, "الرحمن")
            );

            if (foundBasmalaStart) {
                let cutIndex = 4;
                if (userWordsArr.length < 4) cutIndex = userWordsArr.length;
                const restOfText = userWordsArr.slice(cutIndex).join(" ");
                rawUserText = basmalaStandard + " " + restOfText;
            } else {
                 rawUserText = basmalaStandard + " " + rawUserText;
            }
        }

        const userWords = rawUserText
            .replace(/الله/g, ' الله ') 
            .split(" ")
            .filter(Boolean);

        const diffResults = diff.diffArrays(comparisonWords, userWords); 
        
        let resultAnalysis = [];
        let oIdx = 0; 
        let correctCount = 0;

        diffResults.forEach((part, i) => {
            if (part.removed) {
                part.value.forEach((oWord) => {
                    let status = "missing";
                    const nextPart = diffResults[i + 1];
                    if (nextPart && nextPart.added) {
                        const currentCleanWord = comparisonWords[oIdx];
                        const matchIdx = nextPart.value.findIndex(uW => isPhoneticallyClose(uW, currentCleanWord));
                        
                        if (matchIdx !== -1) {
                            status = "wrong"; 
                            nextPart.value.splice(matchIdx, 1); 
                        }
                    }
                    
                    const wordToDisplay = displayWords[oIdx]; 
                    const marker = ayahEndIndices.find(m => m.index === oIdx);
                    
                    resultAnalysis.push({ 
                        text: wordToDisplay || oWord, 
                        status, 
                        surah, 
                        ayah: (ayahEndIndices.find(m => m.index >= oIdx) || {}).number 
                    });
                    
                    if (marker) resultAnalysis.push({ text: marker.number, status: "ayah_marker", surah, ayah: marker.number });
                    oIdx++;
                });
            } else if (!part.added) {
                part.value.forEach(() => {
                    const wordToDisplay = displayWords[oIdx];
                    const marker = ayahEndIndices.find(m => m.index === oIdx);
                    
                    resultAnalysis.push({ 
                        text: wordToDisplay || "---", 
                        status: "Correct",
                        surah, 
                        ayah: (ayahEndIndices.find(m => m.index >= oIdx) || {}).number 
                    });
                    
                    correctCount++;
                    if (marker) resultAnalysis.push({ text: marker.number, status: "ayah_marker", surah, ayah: marker.number });
                    oIdx++;
                });
            }
        });

        const score = Math.round((correctCount / comparisonWords.length) * 100);
        await Recitation.findByIdAndUpdate(newRecitation._id, { score: Math.min(score, 100) });

        setTimeout(() => {
            if (req.file.path && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
        }, 1000);

        res.status(200).json({
            success: true,
            recitation: newRecitation,
            analysis: resultAnalysis,
            score: Math.min(score, 100),
            stats: { processingTime: `${(Date.now() - startTime) / 1000}s` }
        });

    } catch (error) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("💥 Error:", error);
        
        // لو الخطأ بسبب إن كل المفاتيح خلصت (نبعت 429 للفرونت عشان يطلع الـ Alert اللي إنت عامله)
        if (error.message.includes('ضغط عالي')) {
            return res.status(429).json({ status: 'fail', message: error.message });
        }
        
        res.status(500).json({ error: error.message });
    }
});


exports.stream_check = catchAsync(async (req, res, next) => {
    if (!req.file || !req.file.path) {
        return res.status(400).json({ error: "No audio file" });
    }

    try {
        const startTime = Date.now();
        const expectedContext = req.body.expectedContext || ""; 
        const surahName = req.body.surahName || "";
        const promptText = `تلاوة قرآنية للشيخ محمود خليل الحصري سورة ${surahName}. النص: ${expectedContext}`;

        // 🌟 استدعاء الدالة السحرية هنا أيضاً
        const transcription = await executeGroqWithFallback(req.file.path, {
            model: "whisper-large-v3",
            language: "ar",
            temperature: 0,
            prompt: promptText 
        });

        let text = normalization(transcription.text); 

        const hallucinations = [
            "اشترك في القناة", "رابط القناة", "سيدي محمد رسول الله", 
            "شرح", "تفسير", "السياق الحالي", "المترجم", "يتبع", "صلى الله عليه وسلم"
        ];

        hallucinations.forEach(h => {
            if (text.includes(normalization(h))) {
                text = ""; 
            }
        });

        fs.unlink(req.file.path, () => {});

        res.status(200).json({
            status: 'success',
            text: text, 
            latency: Date.now() - startTime
        });

    } catch (error) {
        if (req.file.path && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
        console.error("Stream Error:", error);
        
        if (error.message.includes('ضغط عالي')) {
            return res.status(429).json({ message: error.message });
        }
        res.status(500).json({ error: "Processing failed" });
    }
});

exports.getAyahs = catchAsync(async (req, res, next) => {
    const { surah, start, end } = req.query;
    
    const ayahs = await Ayah.find({
        surahNumber: surah,
        ayahNumber: { $gte: start, $lte: end }
    }).sort({ ayahNumber: 1 });

    res.status(200).json({
        status: 'success',
        data: ayahs
    });
});