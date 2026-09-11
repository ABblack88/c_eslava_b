const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    if (!fs.existsSync('screenshots')) {
        fs.mkdirSync('screenshots');
    }

    console.log('Navigating to login page...');
    await page.goto('https://c-eslava-b.pages.dev/index.html', { waitUntil: 'networkidle2' });
    
    console.log('Typing credentials...');
    await page.type('#login-user', 'qblackx@gmail.com');
    await page.type('#login-pass', 'Augusto451900');
    
    await page.screenshot({ path: `screenshots/debug_before_click.png` });
    console.log('Clicking login...');
    await page.click('#form-login button[type="submit"]');
    
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: `screenshots/debug_after_click.png` });

    console.log('Taking page screenshots...');
    const pages = [
        { name: 'calendario', url: 'https://c-eslava-b.pages.dev/html/calendario_dashboard_desktop.html' },
        { name: 'pacientes', url: 'https://c-eslava-b.pages.dev/html/gestion_pacientes_desktop.html' },
        { name: 'citas', url: 'https://c-eslava-b.pages.dev/html/citas_listado_desktop.html' },
        { name: 'facturacion', url: 'https://c-eslava-b.pages.dev/html/pagos_facturacion_desktop.html' }
    ];

    for (const p of pages) {
        await page.goto(p.url, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));
        
        // Blur sensitive information
        await page.evaluate(() => {
            const sensitiveTexts = [
                'qblackx@gmail.com', 
                'Augusto', 
                'Dev', 
                'Root',
                'ROOT',
                'Centro Eslava',
                'Centro',
                'Eslava'
            ];
            
            const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walk.nextNode()) {
                const text = node.nodeValue;
                if (sensitiveTexts.some(s => text.toLowerCase().includes(s.toLowerCase()))) {
                    if (node.parentElement && node.parentElement.tagName !== 'SCRIPT' && node.parentElement.tagName !== 'STYLE') {
                        node.parentElement.style.filter = 'blur(5px)';
                        node.parentElement.style.opacity = '0.7';
                    }
                }
            }
        });

        await page.screenshot({ path: `screenshots/${p.name}.png` });
        console.log(`Saved screenshot for ${p.name}`);
    }

    await browser.close();
    console.log("All screenshots captured.");
})();
