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
    
    // Exact broken string with single quotes
    const searchStringBroken = "bg-[url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2348a111' fill-opacity='0.05' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E\")]";

    // Replaced URL-encoded string
    const replaceString = "bg-[url(\"data:image/svg+xml,%3Csvg width=%2720%27 height=%2720%27 viewBox=%270 0 20 20%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27%2348a111%27 fill-opacity=%270.05%27 fill-rule=%27evenodd%27%3E%3Ccircle cx=%273%27 cy=%273%27 r=%273%27/%3E%3Ccircle cx=%2713%27 cy=%2713%27 r=%273%27/%3E%3C/g%3E%3C/svg%3E\")]";

    if (content.includes(searchStringBroken)) {
        content = content.split(searchStringBroken).join(replaceString);
        fs.writeFileSync(file, content);
        console.log('Fixed broken SVG quotes in:', file);
    } else {
        console.log('Already fixed or not found in:', file);
    }
});
