const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const rootDir = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = Number(process.env.PORT) || 4173;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function safeResolve(relativePath) {
  const cleaned = relativePath.replace(/^\/+/, '');
  const potentialPath = path.join(rootDir, cleaned);
  if (!potentialPath.startsWith(rootDir)) {
    return null;
  }
  return potentialPath;
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const stream = fs.createReadStream(filePath);
  stream.on('open', () => {
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    stream.pipe(res);
  });

  stream.on('error', (err) => {
    if (err && err.code === 'ENOENT') {
      res.statusCode = 404;
      res.end('Not found');
    } else {
      res.statusCode = 500;
      res.end('Server error');
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url || '/');
  let pathname = decodeURIComponent(parsedUrl.pathname || '/');

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const filePath = safeResolve(pathname);
  if (!filePath) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    if (stats.isDirectory()) {
      const indexPath = safeResolve(path.join(pathname, 'index.html'));
      if (indexPath) {
        fs.stat(indexPath, (indexErr) => {
          if (indexErr) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }
          serveFile(res, indexPath);
        });
      } else {
        res.statusCode = 403;
        res.end('Forbidden');
      }
      return;
    }

    serveFile(res, filePath);
  });
});

server.listen(port, host, () => {
  console.log(`Static test server running at http://${host}:${port}`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
