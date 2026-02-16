const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const AppError = require('./appError');
const path = require('path');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/audio/uploads/');
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split('/')[1];
        cb(null, `recitation-${req.user.id}-${Date.now()}.${ext}`);
    }
});

const s3Storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    key: (req, file, cb) => {
        const ext = file.mimetype.split('/')[1];
        cb(null, `recitations/user-${req.user.id}-${Date.now()}.${ext}`);
    }
});

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('audio')) cb(null, true);
    else cb(new AppError('Not an audio file!', 400), false);
};

const storage = process.env.STORAGE_MODE === 's3' ? s3Storage : diskStorage;

const upload = multer({
    storage: storage,
    fileFilter: multerFilter
});

exports.uploadRecitation = upload.single('audio');