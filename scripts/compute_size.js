const fs = require('fs');
const path = require('path');
const root = process.argv[2] || '.';
function dirSize(p){
  let sum = 0;
  const entries = fs.readdirSync(p, { withFileTypes: true });
  for(const e of entries){
    const fp = path.join(p, e.name);
    try{
      if(e.isDirectory()) sum += dirSize(fp);
      else sum += fs.statSync(fp).size;
    }catch(e){}
  }
  return sum;
}
const bytes = dirSize(path.resolve(root));
console.log(bytes);
console.log((bytes/1024/1024).toFixed(2));
