import puppeteer from 'puppeteer';

export const exportToPDF = async (req, res) => {
  const { projectId } = req.params;
  const { html } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content required' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();

    res.contentType('application/pdf');
    res.send(pdf);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const exportToPNG = async (req, res) => {
  const { projectId } = req.params;
  const { html } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content required' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png',
    });

    await browser.close();

    res.contentType('image/png');
    res.send(screenshot);
  } catch (error) {
    console.error('PNG generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PNG',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
