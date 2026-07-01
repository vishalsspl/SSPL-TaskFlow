const fs = require('fs');
const files = [
    'src/pages/LandingPage.jsx',
    'src/pages/AboutUs.jsx',
    'src/pages/HowItWorks.jsx',
    'src/pages/Pricing.jsx',
    'src/components/forms/auth/Login.jsx',
    'src/components/forms/auth/Signup.jsx'
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    // Replace all instances of \\' with ' (since the JS AST contains literal backslash-quote pairs)
    content = content.replace(/\\'/g, "'");
    fs.writeFileSync(file, content);
    console.log('Fixed:', file);
});
