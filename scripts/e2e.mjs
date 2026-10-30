// Real-browser acceptance. Install Chromium once: npx playwright install chromium.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startServer } from './serve.mjs';
import { chromium } from 'playwright';

const server = await startServer({ port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
const slugs = ['adapt-to-china', 'meetfolio', 'abtrace', 'supplier-document-intelligence', 'fanscope'];
const results = [];
let browser;
const checkLabels = async page => {
  const boxes = await page.locator('.pool-obj__label').evaluateAll(els => els.map(el => {
    const r=el.getBoundingClientRect(); return {text:el.textContent,x:r.x,y:r.y,w:r.width,h:r.height};
  }));
  for (let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) {
    const a=boxes[i],b=boxes[j];
    assert(!(a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y), `Overlapping labels: ${a.text}/${b.text}`);
  }
};
try {
  try { browser = await chromium.launch({ headless:true, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] }); }
  catch(e) { throw new Error('Chromium unavailable. Run npx playwright install chromium. '+e.message); }
  await mkdir('test-results',{recursive:true});
  for (const viewport of [{width:1440,height:900},{width:1024,height:768},{width:390,height:844}]) {
    const context=await browser.newContext({viewport,isMobile:viewport.width===390,hasTouch:viewport.width===390});
    const page=await context.newPage(), failures=[];
    page.on('pageerror',err=>failures.push(err.message));
    page.on('console',m=>{if(m.type()==='error')failures.push(m.text());});
    await page.goto(origin,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>['live','unsupported'].includes(document.documentElement.dataset.pool));
    await page.waitForTimeout(4000);
    const mode=await page.locator('html').getAttribute('data-pool');
    const canvas=await page.locator('.pool__frame').boundingBox();
    await page.mouse.move(canvas.x+canvas.width*.35,canvas.y+canvas.height*.5);
    await page.mouse.move(canvas.x+canvas.width*.65,canvas.y+canvas.height*.5,{steps:12});
    await page.waitForTimeout(400);
    await checkLabels(page);
    for(const slug of slugs) assert(await page.locator(`a[href="/work/${slug}/"]`).count());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
    await page.screenshot({path:`test-results/pool-${viewport.width}.png`});
    if(viewport.width===1440) {
      for(const [name,slug] of [['adapt-icon','adapt-to-china'],['meetfolio-icon','meetfolio']]) {
        const box=await page.locator(`.pool__objects a[href="/work/${slug}/"]`).evaluate(el=>{
          const r=el.getBoundingClientRect();const radius=parseFloat(el.style.getPropertyValue('--r'))||100;
          return {x:r.x-radius-12,y:r.y-radius-12,width:radius*2+24,height:radius*2+24};
        });
        const shot=await page.screenshot({clip:box,scale:'css'});
        // Store source pixels; 2× capture comes from a fresh DPR2 context below.
        await writeFile(`test-results/${name}-detail.png`,shot);
      }
    }
    await page.goto(`${origin}/about/`,{waitUntil:'networkidle'});
    await page.locator('#outside').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.screenshot({path:`test-results/about-${viewport.width}.png`,fullPage:true});
    assert(await page.locator('text=YBBE TECH').count());
    assert.equal(await page.locator('img[src*="group"]').count(),0);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.goto(`${origin}/work/adapt-to-china/`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('[data-testimonial][data-consent="true"]').count(),2);
    for(const slug of slugs) {
      await page.goto(`${origin}/work/${slug}/`,{waitUntil:'domcontentloaded'});
      assert(await page.locator('h2').filter({hasText:'Status & limits'}).count());
    }
    assert.deepEqual(failures,[],`Browser/shader errors at ${viewport.width}px`);
    results.push({viewport,mode,labels:'pass',routes:'pass'});
    console.log(`✓ ${viewport.width}×${viewport.height}: ${mode}, labels, content, routes, console`);
    await context.close();
  }
  // Genuine DPR2 detail captures, rather than upscaling a screenshot.
  const detail=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});
  const d=await detail.newPage(); await d.goto(origin,{waitUntil:'networkidle'}); await d.waitForTimeout(4000);
  for(const [name,slug] of [['adapt-icon','adapt-to-china'],['meetfolio-icon','meetfolio']]) {
    const box=await d.locator(`.pool__objects a[href="/work/${slug}/"]`).evaluate(el=>{
      const r=el.getBoundingClientRect(), radius=parseFloat(el.style.getPropertyValue('--r'))||100;
      return {x:r.x-radius-12,y:r.y-radius-12,width:radius*2+24,height:radius*2+24};
    });
    await d.screenshot({path:`test-results/${name}-2x.png`,clip:box});
  }
  await detail.close();
  const reduced=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});
  const rm=await reduced.newPage(); await rm.goto(origin,{waitUntil:'networkidle'}); await rm.waitForTimeout(1000);
  await checkLabels(rm);
  await rm.keyboard.press('Tab'); assert(await rm.locator(':focus-visible').count());
  const before=await rm.locator('.pool-obj').evaluateAll(els=>els.map(e=>e.getAttribute('style')));
  await rm.waitForTimeout(600);
  assert.deepEqual(await rm.locator('.pool-obj').evaluateAll(els=>els.map(e=>e.getAttribute('style'))),before,'Reduced-motion floats drifted');
  await reduced.close();
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const staticPage=await nojs.newPage(); await staticPage.goto(origin); await checkLabels(staticPage);
  assert.equal(await staticPage.locator('.pool__objects a').count(),6); await nojs.close();
  const page=await browser.newPage(); await page.goto(`${origin}/?pool=static`); await page.waitForSelector('.pool--unsupported');
  await page.locator('.pool__objects a[href="/work/meetfolio/"]').click(); await page.waitForURL('**/work/meetfolio/');
  await page.goto(`${origin}/work/`); await page.locator('[data-filter="client"]').click();
  assert.equal(await page.locator('[data-filter-list] > li:visible').count(),2);
  const response=await page.goto(`${origin}/does-not-exist/`); assert.equal(response.status(),404);
  await page.close();
  await writeFile('test-results/browser-results.json',JSON.stringify(results,null,2));
  console.log('✓ Reduced motion, keyboard, no-JS, forced-static navigation, filters and 404');
  assert(results.every(r=>r.mode==='live'),'WebGL2 unavailable: fallback checks passed, but live pool acceptance remains unverified');
} finally { if(browser)await browser.close(); await new Promise(resolve=>server.close(resolve)); }
