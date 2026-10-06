f='C:/Users/Shweta/Desktop/Vishal/SSPL-TaskFlow-main/frontend/src/pages/Tasks.jsx'
c=open(f, encoding='utf-8').read()
c=c.replace('xl:w-auto xl:flex-1 xl:min-w-[105px]', 'xl:w-[130px] xl:flex-none')
open(f,'w',encoding='utf-8').write(c)
