const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const querystring = require('querystring');
const url = require('url');

const sessions = {};

function isLoggedIn(req) {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  return sid && sessions[sid];
}


function serveFile(res, filePath, contentType, status = 200) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
    const notFoundPath = path.join(__dirname, '404.html');
      fs.readFile(notFoundPath, (nfErr, nfData) => {
        if (nfErr) {
          res.writeHead(404, {'Content-Type': 'text/plain'});
          res.end('Not found');
        } else {
          res.writeHead(404, {'Content-Type': 'text/html'});
          res.end(nfData);
        }
      });
    } else {
      res.writeHead(status, {'Content-Type': contentType});
      res.end(data);
    }
  });
}

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

function handleLogin(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const params = querystring.parse(body);
    const email = (params.email || '').toLowerCase();
    if (email.endsWith('@wyomingarea.org') || email === 'teacheronly') {
      const sid = crypto.randomBytes(16).toString('hex');
      sessions[sid] = { email };
      const target = email === 'teacheronly' ? '/teacher.html' : '/';
      res.writeHead(302, {
        'Set-Cookie': `sid=${sid}; HttpOnly; path=/`,
        'Location': target
      });
      res.end();
    } else {
      res.writeHead(302, { 'Location': '/login?error=1' });
      res.end();
    }
  });
}

function handleLogout(req, res) {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (sid) delete sessions[sid];
  res.writeHead(302, {
    'Set-Cookie': 'sid=; HttpOnly; Path=/; Max-Age=0',
    'Location': '/'
  });
  res.end();
}

function handleSession(req, res) {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  const session = sid && sessions[sid];
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({ loggedIn: !!session, email: session ? session.email : null }));
}
const assignmentsPath = path.join(__dirname, 'teacherAssignments.json');

function readAssignments() {
  try {
    return JSON.parse(fs.readFileSync(assignmentsPath, 'utf8'));
  } catch {
    return [];
  }
}

function writeAssignments(data) {
  fs.writeFileSync(assignmentsPath, JSON.stringify(data, null, 2));
}

function handleAddAssignment(req, res) {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  const session = sid && sessions[sid];
  if (!session || session.email !== 'teacheronly') {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const item = JSON.parse(body);
      if (!item.title || !item.dueDate || !item.dueTime) throw new Error('bad');
      const items = readAssignments();
      items.push(item);
      writeAssignments(items);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400);
      res.end('Invalid');
    }
  });
}

function handleGetAssignments(req, res) {
  const items = readAssignments();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(items));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  if (req.method === 'POST' && pathname === '/login') {
    handleLogin(req, res);
  } else if (pathname === '/logout') {
    handleLogout(req, res);
  } else if (pathname === '/session') {
    handleSession(req, res);
  } else if (req.method === 'POST' && pathname === '/add-assignment') {
    handleAddAssignment(req, res);
  } else if (pathname === '/teacher-assignments') {
    handleGetAssignments(req, res);
  } else if (pathname === '/login' || pathname === '/login.html') {
    serveFile(res, path.join(__dirname, 'login.html'), 'text/html');
  } else {
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.csv': 'text/csv'
    };
     if (ext === '.html' && path.basename(filePath) !== 'login.html' && !isLoggedIn(req)) {
      res.writeHead(302, { 'Location': '/login.html' });
      res.end();
      return;
    }
    const contentType = types[ext] || 'text/plain';
    fs.access(filePath, fs.constants.F_OK, err => {
      if (err) {
        serveFile(res, path.join(__dirname, '404.html'), 'text/html', 404);
      } else {
        serveFile(res, filePath, contentType);
      }
    });
  }
});

server.listen(8080, () => {
  console.log('Server running on http://localhost:8080');
});