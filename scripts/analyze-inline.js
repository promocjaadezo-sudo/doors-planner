const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(filePath, 'utf8');

const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
let match;
let index = 0;
const targets = [];
while ((match = scriptRegex.exec(html)) !== null) {
  const content = match[1];
  if (content.includes('Magazyn: Inicjalizacja systemu zarządzania magazynem')) {
    targets.push({ index, content, start: match.index });
  }
  index += 1;
}

if (targets.length === 0) {
  console.error('No inline script found containing the marker.');
  process.exit(1);
}

const target = targets[0];
console.log('Found inline script at index', target.index, 'starting at char', target.start);

try {
  const vm = require('vm');
  const script = new vm.Script(target.content, { filename: 'inline-script.js' });
  script.runInNewContext({});
  console.log('No syntax errors detected when evaluating script.');
} catch (err) {
  console.error('Syntax error:', err.message);
  if (err.stack) {
    console.error(err.stack.split('\n').slice(0, 5).join('\n'));
  }
  const lineMatch = /inline-script\.js:(\d+)/.exec(err.stack || '');
  if (lineMatch) {
    const lineNumber = Number(lineMatch[1]);
    const lines = target.content.split(/\r?\n/);
    const startLine = Math.max(0, lineNumber - 3);
    const endLine = Math.min(lines.length, lineNumber + 2);
    console.log('Context around line', lineNumber, ':');
    for (let i = startLine; i < endLine; i += 1) {
      const marker = i + 1 === lineNumber ? '>>' : '  ';
      console.log(marker, (i + 1).toString().padStart(6, ' '), lines[i]);
    }
  }
}
