const { execSync } = require('child_process');
const levenshtein = require('fast-levenshtein');
const diff = require("diff");
const path = require("path");
const fs = require("fs");
const Groq = require("groq-sdk");
const Ayah = require("../models/Ayah");
const catchAsync = require("../utils/catchAsync");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

    const { surah, startAyah, endAyah } = req.body;
    if (!surah) return res.status(400).json({ error: "رقم السورة مطلوب" });

    try {
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

        const tempPath = req.file.path;
        const finalTempPath = `${tempPath}${path.extname(req.file.originalname) || ".webm"}`;
        fs.renameSync(tempPath, finalTempPath);

        processedPath = `${tempPath}_clean.wav`;
        try {
            execSync(`ffmpeg -i "${finalTempPath}" -af "afftdn=nf=-25, highpass=f=200, lowpass=f=3000, loudnorm" -ar 16000 -ac 1 "${processedPath}"`);
            filePathForGroq = processedPath;
        } catch (e) { filePathForGroq = finalTempPath; }

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePathForGroq),
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
        [finalTempPath, processedPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });

        res.status(200).json({
            success: true,
            analysis: resultAnalysis,
            score: Math.min(score, 100),
            stats: { processingTime: `${(Date.now() - startTime) / 1000}s` }
        });

    } catch (error) {
        console.error("💥 Error:", error);
        res.status(500).json({ error: error.message });
    }
});