const fs = require('fs');
const path = require('path');

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const getFileSize = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (err) {
    return 0;
  }
};

const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

const getUniqueFilePath = (dirPath, originalName) => {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  const sanitizedName = sanitizeFilename(nameWithoutExt);

  let counter = 0;
  let filename = `${sanitizedName}${ext}`;
  let fullPath = path.join(dirPath, filename);

  while (fs.existsSync(fullPath)) {
    counter++;
    filename = `${sanitizedName}_${counter}${ext}`;
    fullPath = path.join(dirPath, filename);
  }

  return { filename, fullPath };
};

module.exports = {
  ensureDirectoryExists,
  deleteFile,
  getFileSize,
  sanitizeFilename,
  getUniqueFilePath
};