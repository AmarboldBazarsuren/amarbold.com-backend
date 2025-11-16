// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Uploads folder үүсгэх
const uploadDir = 'uploads';
const coursesDir = path.join(uploadDir, 'courses');
const profilesDir = path.join(uploadDir, 'profiles');
const bannersDir = path.join(uploadDir, 'banners');

[uploadDir, coursesDir, profilesDir, bannersDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ✅ Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // fieldname дээр үндэслэн folder сонгох
    if (file.fieldname === 'thumbnail') {
      cb(null, coursesDir);
    } else if (file.fieldname === 'profile_image') {
      cb(null, profilesDir);
    } else if (file.fieldname === 'profile_banner') {
      cb(null, bannersDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// ✅ File filter - зөвхөн зураг
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Зөвхөн зураг файл (.jpg, .png, .gif, .webp) upload хийх боломжтой'));
  }
};

// ✅ Multer config
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// ✅ Exports
module.exports = {
  upload,
  // Нэг зураг
  uploadSingle: (fieldName) => upload.single(fieldName),
  // Олон зураг
  uploadMultiple: (fieldName, maxCount) => upload.array(fieldName, maxCount),
  // Өөр өөр field-үүд
  uploadFields: (fields) => upload.fields(fields)
};