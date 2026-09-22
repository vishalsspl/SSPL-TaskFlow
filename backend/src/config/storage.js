import path from 'path';
import fs from 'fs';

/**
 * Resolves the upload directory path.
 * If UPLOAD_DIR is configured in environment variables, resolves it.
 * Supports absolute paths (e.g. 'D:/Storage' or 'C:/uploads')
 * or relative paths (e.g. '../uploads' to place outside the backend folder).
 * Defaults to 'uploads' inside the current working directory.
 */
export const getUploadDir = () => {
  const envDir = process.env.UPLOAD_DIR;
  const targetDir = envDir
    ? (path.isAbsolute(envDir) ? envDir : path.resolve(process.cwd(), envDir))
    : path.join(process.cwd(), 'uploads');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return targetDir;
};

export const uploadDir = getUploadDir();
