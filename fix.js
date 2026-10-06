const fs = require('fs');
const file = 'C:/Users/Shweta/Desktop/Vishal/SSPL-TaskFlow-main/frontend/src/pages/TaskKanban.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('className=\"flex-1 min-w-[140px] sm:w-[200px] sm:flex-none h-11 rounded-xl\"', 'className=\"flex-1 min-w-[140px] sm:min-w-[200px] sm:max-w-[400px] sm:flex-none h-11 rounded-xl\"');
fs.writeFileSync(file, content, 'utf8');
