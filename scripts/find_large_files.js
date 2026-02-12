const fs = require('fs');
const path = require('path');
const root = process.argv[2] || '.';
const MIN = 5 * 1024 * 1024;
function walk(dir, results=[]) {
  for(const d of fs.readdirSync(dir, { withFileTypes: true })){
    const full = path.join(dir, d.name);
    try{
      if(d.isDirectory()) walk(full, results);
      else {
        const s = fs.statSync(full);
        if(s.size > MIN) results.push({path: full, bytes: s.size, mb: +(s.size/1024/1024).toFixed(2)});
      }
    }catch(e){}
  }
  return results;
}
const found = walk(path.resolve(root)).sort((a,b)=>b.bytes-a.bytes);
if(found.length===0) {
  console.log('NONE');
} else {
  console.log(found.map(f=>`${f.mb} MB	${f.path}`).join('\n'));
}
