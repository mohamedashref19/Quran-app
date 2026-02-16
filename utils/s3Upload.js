const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AppError = require("./appError")

const s3= new S3Client({
    region:process.env.AWS_REGION,
    credentials:{
        accessKeyId:process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY
    }
})

const multerFilter = (req,file,cb)=>{
    if(file.mimetype.startsWith('audio')){
        cb(null,true)
    }else{
        cb(new AppError("Not an audio file! Please upload only audio",400),false)
    }
}

const upload = multer({
    storage:multerS3({
        s3:s3,
        bucket:process.env.AWS_BUCKET_NAME,
        contentType:multerS3.AUTO_CONTENT_TYPE,
        metadata:function(req,file,cb){
            cb(null,{ fieldName: file.fieldname })
        },
        key: function(req,file,cb){
            const ext = file.mimetype.split("/")[1]
            const filename = `recitations/user-${req.user.id}-${Date.now()}.${ext}`
            cb(null,filename)

        }
    }),
    fileFilter:multerFilter
})

exports.uploadRecitation = upload.single("audio")