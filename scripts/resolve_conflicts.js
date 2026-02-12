const fs = require('fs').promises;
const path = require('path');
const IGNORES = ['.git', 'node_modules', 'ae-frontend-clean/.next', 'ae-frontend-clean/node_modules', 'outputs', 'public'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (IGNORES.some(i => full.includes(path.normalize(i)))) continue;
    if (e.isDirectory()) await walk(full);
    else await processFile(full);
  }
}

async function processFile(filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size === 0 || stat.size > MAX_BYTES) return;
    const buf = await fs.readFile(filePath);
    // Skip binary files
    if (buf.includes(0)) return;
    const content = buf.toString('utf8');
    if (!content.includes('<<<<<<<')) return;
    const lines = content.split(/\r?\n/);
    const out = [];
    let i = 0;
    let changed = false;
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('<<<<<<<')) {
        changed = true;
        // skip the <<<<<<< line
        i++;
        // keep local (HEAD) lines until =======
        while (i < lines.length && !lines[i].startsWith('=======')) {
          out.push(lines[i]);
          i++;
        }
        // skip the ======= line
        if (i < lines.length && lines[i].startsWith('=======')) i++;
        // skip the remote section until >>>>>>>
        while (i < lines.length && !lines[i].startsWith('>>>>>>>')) i++;
        // skip the >>>>>>> line
        if (i < lines.length && lines[i].startsWith('>>>>>>>')) i++;
      } else {
        out.push(line);
        i++;
      }
    }
    if (changed) {
      await fs.writeFile(filePath, out.join('\n'), 'utf8');
      console.log('Fixed:', filePath);
    }
  } catch (err) {
    // Ignore errors for permissions or binary files
  }
}

(async () => {
  const root = process.cwd();
  await walk(root);
  console.log('Resolver finished.');
})();
