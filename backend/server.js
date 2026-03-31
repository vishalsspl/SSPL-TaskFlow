// IIS iisnode entry point — CommonJS wrapper for ESM backend
// iisnode only supports CommonJS, so this wrapper dynamically imports the real ESM server

// iisnode sets the PORT via a named pipe, not a number.
// We capture it here before the ESM module loads.
const port = process.env.PORT;

async function start() {
  try {
    // Set PORT to iisnode's named pipe
    if (port) {
      process.env.PORT = port;
    }
    // Dynamically import the real ESM server entry point
    await import('./src/server.js');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
