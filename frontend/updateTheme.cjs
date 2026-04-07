const fs = require('fs');

function processFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log('Skipping missing file:', filePath);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add imports if missing
    if (!content.includes('ThemeProvider')) {
        content = content.replace(/(import .* from 'react(-router-dom)?';\n)/, '\$1import { useTheme } from \'@/components/ThemeProvider\';\n');
    }
    if (!content.includes('Sun, Moon')) {
        if (content.includes('lucide-react')) {
            content = content.replace(/import {([^}]+)} from 'lucide-react';/, (match, p1) => {
                if (p1.includes('Sun')) return match;
                return `import {${p1}, Sun, Moon} from 'lucide-react';`;
            });
        } else {
            content = content.replace(/(import .* from 'react(-router-dom)?';\n)/, '\$1import { Sun, Moon } from \'lucide-react\';\n');
        }
    }

    // Add useTheme directly inside the component
    const componentRegex = /const ([A-Za-z]+) = \([^)]*\) => {\n/;
    content = content.replace(componentRegex, (match) => {
        if (content.includes('useTheme(')) return match;
        return match + '    const { theme, setTheme } = useTheme();\n    const isDarkMode = theme !== \'light\';\n    const toggleTheme = () => setTheme(theme === \'light\' ? \'dark\' : \'light\');\n';
    });

    // Replace default dark mode state in LandingPage if it exists
    if (content.includes('const [isDarkMode, setIsDarkMode] = useState(true);')) {
        content = content.replace('const [isDarkMode, setIsDarkMode] = useState(true);\n', '');
        content = content.replace('const toggleTheme = () => setIsDarkMode(!isDarkMode);\n', '');
    }

    // Replace background container logic
    const bgSearch1 = '<div className="min-h-screen bg-[#0A0A0A] text-white font-sans overflow-x-hidden selection:bg-primary/30 relative">';
    const bgReplace1 = '<div className={`min-h-screen font-sans overflow-x-hidden selection:bg-primary/30 relative transition-colors duration-500 ${isDarkMode ? \'bg-[#0A0A0A] text-white\' : \'bg-[#F8FCF6] text-slate-900\'}`}>';
    if (content.includes(bgSearch1)) content = content.replace(bgSearch1, bgReplace1);
    
    // Replace Login container logic
    const bgSearch2 = '<div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] relative overflow-hidden p-4">';
    const bgReplace2 = '<div className={`min-h-screen flex items-center justify-center relative overflow-hidden p-4 transition-colors duration-500 ${isDarkMode ? \'bg-[#0A0A0A]\' : \'bg-[#F8FCF6]\'}`}>';
    if (content.includes(bgSearch2)) content = content.replace(bgSearch2, bgReplace2);

    // Replace bg gradient block
    const gradientSearch = /{\/\* Background Gradient \*\/}\s*<div className="fixed inset-0 z-0(?: pointer-events-none)?">[\s\S]*?<\/div>/;
    const gradientReplace = `{/* Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className={\`absolute inset-0 transition-opacity duration-500 \${!isDarkMode ? 'bg-[url("data:image/svg+xml,%3Csvg width=\\'20\\' height=\\'20\\' viewBox=\\'0 0 20 20\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'%2348a111\\' fill-opacity=\\'0.05\\' fill-rule=\\'evenodd\\'%3E%3Ccircle cx=\\'3\\' cy=\\'3\\' r=\\'3\\'/%3E%3Ccircle cx=\\'13\\' cy=\\'13\\' r=\\'3\\'/%3E%3C/g%3E%3C/svg%3E")]' : ''}\`} />
                <div className={\`absolute inset-0 bg-gradient-to-br transition-all duration-500 \${isDarkMode ? 'from-[#102A04] via-[#050505] to-[#0A0A0A]' : 'from-[#DDF2D1]/80 via-[#F8FCF6]/90 to-[#E9F7E1]/80'}\`} />
                <div className={\`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 \${isDarkMode ? 'bg-primary/20' : 'bg-[#48A111]/15'}\`} />
                <div className={\`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full transition-all duration-500 \${isDarkMode ? 'bg-primary/5' : 'bg-[#48A111]/10'}\`} />
            </div>`;
    content = content.replace(gradientSearch, gradientReplace);

    // Replace Navigation bar to add toggle button (For full navbars)
    const navSearchFull = /<nav className="relative z-50[^>]+>([\s\S]*?)<\/nav>/;
    content = content.replace(navSearchFull, (match, innerNav) => {
        if (match.includes('Toggle Theme')) return match;
        
        let newNav = match.replace(/<span className="text-2xl font-black tracking-tight">TaskFlow<\/span>/g, 
          '<span className={`text-2xl font-black tracking-tight ${isDarkMode ? \'text-white\' : \'text-slate-900\'}`}>TaskFlow</span>'
        );
        
        // Add toggle button appropriately
        if (newNav.includes('flex items-center gap-4')) {
            // It has full nav action buttons (like LandingPage)
            newNav = newNav.replace('<div className="flex items-center gap-4">', 
            `<div className="flex items-center gap-4">
                    <button 
                        onClick={toggleTheme} 
                        className={\`p-2 rounded-full transition-all duration-300 \${isDarkMode ? 'text-white hover:bg-white/10' : 'text-[#48A111] bg-[#48A111]/10 hover:bg-[#48A111]/20 shadow-sm'}\`}
                        aria-label="Toggle Theme"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>`);
        } else {
            // Minimal nav, we need to add the button
            newNav = newNav.replace('</nav>', 
            `    <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleTheme} 
                        className={\`p-2 rounded-full transition-all duration-300 \${isDarkMode ? 'text-white hover:bg-white/10' : 'text-[#48A111] bg-[#48A111]/10 hover:bg-[#48A111]/20 shadow-sm'}\`}
                        aria-label="Toggle Theme"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                 </div>
            </nav>`);
        }
        return newNav;
    });

    // Theme adaptations for Typography & Cards
    // Update texts that shouldn't be white in light mode
    content = content.replace(/className="([^"]*?)text-white\/60([^"]*)"/g, 'className={`$1transition-colors ${isDarkMode ? \\\'text-white/60\\\' : \\\'text-slate-600\\\'}$2`}');
    content = content.replace(/className="([^"]*?)text-white\/40([^"]*)"/g, 'className={`$1transition-colors ${isDarkMode ? \\\'text-white/40\\\' : \\\'text-slate-500\\\'}$2`}');
    
    // Update plain text-white correctly
    content = content.replace(/className="([^"]*?)text-white([^"\/]*?)"/g, (match, p1, p2) => {
        if (match.includes('isDarkMode ?')) return match; 
        return `className={\`${p1}transition-colors \${isDarkMode ? 'text-white' : 'text-slate-900'}${p2}\`}`;
    });

    // Update dark card backgrounds
    content = content.replace(/className="([^"]*?)bg-white\/5([^"]*border-white\/10[^"]*)"/g, 'className={`$1transition-colors duration-500 \\${isDarkMode ? \\\'bg-white/5 border-white/10 text-white\\\' : \\\'bg-white border-[#48A111]/10 text-slate-900 shadow-sm\\\'}$2`}');
    content = content.replace(/className="([^"]*?)bg-black\/40([^"]*border-white\/10[^"]*)"/g, 'className={`$1transition-colors duration-500 \\${isDarkMode ? \\\'bg-black/40 border-white/10 text-white\\\' : \\\'bg-white/80 border-[#48A111]/10 text-slate-900 shadow-xl\\\'}$2`}');

    fs.writeFileSync(filePath, content);
    console.log('Processed:', filePath);
}

const files = [
    'c:/Users/Shweta/Desktop/Vishal/SSPL-TaskFlow-main/frontend/src/pages/LandingPage.jsx',
    'c:/Users/Shweta/Desktop/Vishal/SSPL-TaskFlow-main/frontend/src/pages/AboutUs.jsx',
    'c:/Users/Shweta/Desktop/Vishal/SSPL-TaskFlow-main/frontend/src/pages/HowItWorks.jsx',
    'c:/Users/Shweta/Desktop/Vishal/SSPL-TaskFlow-main/frontend/src/pages/Pricing.jsx',
    'c:/Users/Shweta/Desktop/Vishal/SSPL-TaskFlow-main/frontend/src/components/forms/auth/Login.jsx',
    'c:/Users/Shweta/Desktop/Vishal/SSPL-TaskFlow-main/frontend/src/components/forms/auth/Signup.jsx'
];

files.forEach(processFile);
