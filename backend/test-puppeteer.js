import puppeteer from 'puppeteer';

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        console.log('Browser launched successfully');
        const page = await browser.newPage();
        await page.setContent('<h1>Hello World</h1>');
        const pdf = await page.pdf({ format: 'A4' });
        console.log('PDF generated successfully, size:', pdf.length);
        await browser.close();
        console.log('Browser closed');
    } catch (error) {
        console.error('Puppeteer Test Failed:', error);
        process.exit(1);
    }
})();
