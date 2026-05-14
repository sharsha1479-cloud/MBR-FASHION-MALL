const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const targetBytes = 350 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const uploadLimits = {
  fileSize: 5 * 1024 * 1024,
  files: 20,
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: uploadLimits,
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, WebP, and GIF image uploads are allowed.'));
      return;
    }
    cb(null, true);
  },
});

const safeName = (name) => path.parse(name).name.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'image';

const compressImage = async (file) => {
  await fs.mkdir(uploadsDir, { recursive: true });

  let width = 1400;
  let bestBuffer = null;

  for (const maxWidth of [1400, 1200, 1000, 800, 650, 500, 400, 320]) {
    width = maxWidth;
    for (const quality of [82, 74, 66, 58, 50, 42, 34, 26, 18, 12]) {
      const buffer = await sharp(file.buffer, { animated: file.mimetype === 'image/gif' })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toBuffer();

      bestBuffer = buffer;
      if (buffer.length <= targetBytes) {
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName(file.originalname)}.webp`;
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, buffer);
        return {
          ...file,
          filename,
          path: filepath,
          destination: uploadsDir,
          size: buffer.length,
          mimetype: 'image/webp',
        };
      }
    }
  }

  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName(file.originalname)}.webp`;
  const filepath = path.join(uploadsDir, filename);
  await fs.writeFile(filepath, bestBuffer);
  return {
    ...file,
    filename,
    path: filepath,
    destination: uploadsDir,
    size: bestBuffer.length,
    mimetype: 'image/webp',
  };
};

const compressUploadedFiles = async (req, res, next) => {
  try {
    if (Array.isArray(req.files)) {
      req.files = await Promise.all(req.files.map(compressImage));
    } else if (req.files && typeof req.files === 'object') {
      const entries = await Promise.all(Object.entries(req.files).map(async ([field, files]) => [
        field,
        await Promise.all(files.map(compressImage)),
      ]));
      req.files = Object.fromEntries(entries);
    }

    if (req.file) {
      req.file = await compressImage(req.file);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  compressedAny: [upload.any(), compressUploadedFiles],
  compressedSingle: (fieldName) => [upload.single(fieldName), compressUploadedFiles],
};
