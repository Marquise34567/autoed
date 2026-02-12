const fs = require('fs');
const path = require('path');
const root = process.argv[2] || '.';
const names = new Set(['api','server','backend','express','fastify','routes','controllers','prisma','database','firebase-admin']);
function walk(dir){
  const results=[];
  for(const name of fs.readdirSync(dir, {withFileTypes:true})){
    const full = path.join(dir, name.name);
    if(name.isDirectory()){
      if(names.has(name.name)) results.push(full);
      try{ results.push(...walk(full)); }catch(e){}
    }
  }
  return results;
}
const found = walk(path.resolve(root));
if(found.length){ console.log(found.join('\n')); } else { console.log('NONE'); }
