const mongoose = require("mongoose")

const ayahSchema = new mongoose.Schema({
    surahNumber:{
        type:Number,
        required:true,
        index:true,
        index: true
    },
    ayahNumber:{
        type:Number,
        required:true,
        index: true
    },
    text:{
        type:String,
        required:true
    },
    surahNameAr:{
        type:String
    },
    simpleText: String,
    tafseer: String,
    page: {
        type: Number,
        index: true 
    }
})
ayahSchema.index({ simpleText: "text" });
ayahSchema.index({surahNumber:1,ayahNumber:1},{unique:true})

module.exports=mongoose.model('Ayah',ayahSchema)