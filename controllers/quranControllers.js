const { execSync } = require('child_process');
const levenshtein = require('fast-levenshtein');
const diff = require("diff");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const Groq = require("groq-sdk");
const Ayah = require("../models/Ayah");
const Recitation = require("../models/recitationModel");
const catchAsync = require("../utils/catchAsync");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

function normalization(text) {
    if (!text) return "";
    return text
        .replace(/[\u064B-\u06ED]/g, '') 
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\u0640/g, '') 
        .replace(/ئ/g, 'ي').replace(/ؤ/g, 'و') 
        .replace(/[^\u0600-\u06FF\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function isPhoneticallyClose(uWord, oWord) {
    if (!uWord || !oWord) return false;
    const dist = levenshtein.get(uWord, oWord);
    const threshold = oWord.length <= 3 ? 1 : Math.floor(oWord.length * 0.48); 
    return dist <= threshold;
}

exports.check_recitation = catchAsync(async (req, res, next) => {
    const startTime = Date.now();
    let filePathForGroq = "";
    let processedPath = "";

    if (!req.file) return res.status(400).json({ status: 'fail', error: "لم يتم استلام ملف صوتي" });

    const surah = parseInt(req.body.surah);
    const startAyah = parseInt(req.body.startAyah) || 1;
    const endAyah = parseInt(req.body.endAyah) || surahAyahCounts[surah];
    if (!surah) return res.status(400).json({ error: "رقم السورة مطلوب" });

    try {

        const newRecitation = await Recitation.create({
            user:req.user.id,
            audioUrl: req.file.location,
            surah: surah,
            startAyah: startAyah,
            endAyah: endAyah,
            score: 0
        })
        let originalAyahs = await Ayah.find({ 
            surahNumber: surah, 
            ayahNumber: { $gte: startAyah || 1, $lte: endAyah || 286 } 
        }).sort({ ayahNumber: 1 });

        if (originalAyahs.length === 0) throw new Error("الآيات غير موجودة");

        let originalWords = [];
        let ayahEndIndices = [];
        originalAyahs.forEach((ayah) => {
            const words = ayah.text.split(" ").filter(Boolean);
            originalWords.push(...words);
            ayahEndIndices.push({ index: originalWords.length - 1, number: ayah.ayahNumber });
        });

        const normalizedOriginalWords = originalWords.map(w => normalization(w));
        

        const fullReferenceText = normalizedOriginalWords.join(" ");

        // const tempPath = req.file.path;
        // const finalTempPath = `${tempPath}${path.extname(req.file.originalname) || ".webm"}`;

        const tempFileName = `temp-${req.user.id}-${Date.now()}.webm`;
        localFilePath = path.join(__dirname, '../public/audio/uploads', tempFileName);
 const dir = path.dirname(localFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const response = await axios({
            url: req.file.location,
            method: 'GET',
            responseType: 'stream'
        });
        const writer = fs.createWriteStream(localFilePath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
         

        // fs.renameSync(tempPath, finalTempPath);

        processedPath = localFilePath.replace('.webm', '_clean.wav');
        try {
            execSync(`ffmpeg -i "${localFilePath}" -af "afftdn=nf=-25, highpass=f=200, lowpass=f=3000, loudnorm" -ar 16000 -ac 1 "${processedPath}"`);
            // filePathForGroq = processedPath;
        } catch (e) { processedPath = localFilePath }

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(processedPath),
            model: "whisper-large-v3",
            language: "ar",
            temperature: 0,
            prompt: `تلاوة قرآنية مجودة برواية حفص عن عاصم. النص: ${fullReferenceText}`
        });

        const userWords = normalization(transcription.text).replace(/الله/g, ' الله ').split(" ").filter(Boolean);

        const diffResults = diff.diffArrays(normalizedOriginalWords, userWords);
        let resultAnalysis = [];
        let oIdx = 0;
        let correctCount = 0;

        diffResults.forEach((part, i) => {
            if (part.removed) {
                part.value.forEach((oWord) => {
                    let status = "missing";
                    
                    const nextPart = diffResults[i + 1];
                    if (nextPart && nextPart.added) {
                        const matchIdx = nextPart.value.findIndex(uW => isPhoneticallyClose(uW, oWord));
                        if (matchIdx !== -1) {
                            status = "wrong";
                            nextPart.value.splice(matchIdx, 1); 
                        }
                    }

                    const originalWithHarakat = originalWords[oIdx];
                    resultAnalysis.push({ 
                        text: originalWithHarakat, 
                        status,
                        surah: surah,
                        ayah: (ayahEndIndices.find(m => m.index >= oIdx) || {}).number
                    });

                    const marker = ayahEndIndices.find(m => m.index === oIdx);
                    if (marker) resultAnalysis.push({ text: marker.number, status: "ayah_marker", surah, ayah: marker.number });
                    
                    oIdx++;
                });
            } else if (!part.added) {
                part.value.forEach(() => {
                    const originalWithHarakat = originalWords[oIdx];
                    resultAnalysis.push({ 
                        text: originalWithHarakat, 
                        status: "Correct",
                        surah: surah,
                        ayah: (ayahEndIndices.find(m => m.index >= oIdx) || {}).number
                    });
                    correctCount++;

                    const marker = ayahEndIndices.find(m => m.index === oIdx);
                    if (marker) resultAnalysis.push({ text: marker.number, status: "ayah_marker", surah, ayah: marker.number });
                    
                    oIdx++;
                });
            }
        });

        const score = Math.round((correctCount / normalizedOriginalWords.length) * 100);
       
        [localFilePath, processedPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
        await Recitation.findByIdAndUpdate(newRecitation._id, { score: Math.min(score, 100) });

        res.status(200).json({
            success: true,
            recitation: newRecitation,  
            analysis: resultAnalysis,
            score: Math.min(score, 100),
            stats: { processingTime: `${(Date.now() - startTime) / 1000}s` }
        });

    } catch (error) {
        if (localFilePath && fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
        if (processedPath && fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
        console.error("💥 Error:", error);
        res.status(500).json({ error: error.message });
    }
});