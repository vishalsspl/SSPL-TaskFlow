import fs from 'fs';

export const errorHandler = (err, req, res, next) => {
  try {
    const timestamp = new Date().toISOString();
    const logMsg = `${timestamp} [GLOBAL_ERROR] ${err.message}\nStack: ${err.stack}\nPath: ${req.path}\nUser: ${req.user?.id}\n---\n`;
    fs.appendFileSync('server_errors.log', logMsg);
  } catch (logErr) {
    console.error('Failed to log to file:', logErr);
  }

  console.error('Error:', err);

  // Ensure CORS headers are present even in error responses
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  if (err.code === 'P2002') {
    return res.status(400).json({ error: 'Record already exists' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
};
