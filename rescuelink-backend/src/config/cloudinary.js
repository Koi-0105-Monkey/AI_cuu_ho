const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Check if Cloudinary URL is configured properly
const isCloudinaryConfigured = process.env.CLOUDINARY_URL && 
  process.env.CLOUDINARY_URL !== 'cloudinary://key:secret@name';

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloudinary_build_url: process.env.CLOUDINARY_URL
  });
}

let storage;

if (isCloudinaryConfigured) {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'rescuelink_incidents',
      allowed_formats: ['jpg', 'jpeg', 'png'],
    },
  });
} else {
  // Fallback to local storage for development/testing
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = {
  cloudinary,
  upload,
  isCloudinaryConfigured
};
