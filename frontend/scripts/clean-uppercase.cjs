const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const dir = '/home/vishal/Vishal/SSPL-TaskFlow/frontend/src/superadmin';
const files = walkDir(dir);

let totalChanged = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace 'uppercase' class.
  const original = content;
  content = content.replace(/\buppercase\b/g, '');
  
  // Replace 'tracking-something' classes because tracking is often paired with uppercase.
  content = content.replace(/\btracking-(tighter|tight|normal|wide|wider|widest|\[.*?\])\b/g, '');
  
  // Clean up any double spaces generated inside classNames
  content = content.replace(/  +/g, ' ');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalChanged++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Total files updated: ${totalChanged}`);
