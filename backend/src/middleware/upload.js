const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

function ensureUploadsDir() {
  const baseDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

function createStorage(subfolder) {
  const baseDir = ensureUploadsDir();
  const dest = path.join(baseDir, subfolder);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 40) || 'file';
      const ts = Date.now();
      cb(null, `${name}-${ts}${ext}`);
    }
  });
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Only JPG, PNG and PDF files are allowed'));
  }
  cb(null, true);
}

const uploadCNIC = multer({
  storage: createStorage('cnic'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

const uploadReceipts = multer({
  storage: createStorage('receipts'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

const uploadDisasterPhotos = multer({
  storage: createStorage('disasters'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

module.exports = {
  uploadCNIC,
  uploadReceipts,
  uploadDisasterPhotos
};

