f='C:/Users/Shweta/Desktop/Vishal/SSPL-TaskFlow-main/frontend/src/pages/Tasks.jsx'
c=open(f, encoding='utf-8').read()
c=c.replace('justify-between gap-3 min-w-0', 'justify-between gap-3 min-w-0 overflow-x-auto no-scrollbar')
open(f,'w',encoding='utf-8').write(c)
