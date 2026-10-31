// Real-browser acceptance. Install Chromium once: npx playwright install chromium.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startServer } from './serve.mjs';
import { chromium } from 'playwright';

const server = await startServer({ port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
const slugs = ['adapt-to-china', 'meetfolio', 'abtrace', 'supplier-document-intelligence', 'fanscope'];
const places = ['about', 'life'];
const results = [];
let browser;
// Read real pixels back from a screenshot: a build can pass with a blank canvas.
const sampleWater = async page => {
  const shot = (await page.screenshot()).toString('base64');
  const frame = await page.locator('.pool__frame').boundingBox();
  return page.evaluate(async ({shot,frame,dpr}) => {
    const img = new Image(); img.src = `data:image/png;base64,${shot}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img,0,0);
    const mean = (x,y,w,h) => {
      const d = g.getImageData(x*dpr,y*dpr,w*dpr,h*dpr).data; let r=0,gr=0,b=0;
      for (let i=0;i<d.length;i+=4){r+=d[i];gr+=d[i+1];b+=d[i+2];}
      const n=d.length/4; return [r/n,gr/n,b/n];
    };
    const luma = ([r,gr,b]) => .2126*r+.7152*gr+.0722*b;
    const {x,y,width:w,height:h} = frame;
    // Open water away from the floats and the name.
    const portrait = h > w;
    const water = portrait ? mean(x+w*.3,y+h*.74,w*.16,h*.05) : mean(x+w*.42,y+h*.3,w*.16,h*.06);
    // Brightness spread of open water just above the name. Neon caustics are
    // bright cyan, not white, so a white-pixel count misses them; this does not.
    // Measured: neon build 60, reference image 46, current water 33-37.
    const d = g.getImageData((x+w*.3)*dpr,(y+h*.29)*dpr,w*.4*dpr,h*.1*dpr).data;
    const lumas = [];
    for (let i=0;i<d.length;i+=4) lumas.push(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]);
    const avg = lumas.reduce((a,b)=>a+b,0)/lumas.length;
    const spread = Math.sqrt(lumas.reduce((a,b)=>a+(b-avg)**2,0)/lumas.length);
    // Dark ink: the darkest small patch across the centre of the pool.
    let ink = 255;
    for (let i=0;i<30;i++) for (const row of [.42,.46,.5]) ink = Math.min(ink, luma(mean(x+w*(.22+i*.019),y+h*row,6,6)));
    return { water, waterLuma: luma(water), ink, spread, portrait };
  },{shot,frame,dpr:await page.evaluate(()=>devicePixelRatio)});
};
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
    await page.waitForFunction(()=>['live','unsupported'].includes(document.documentElement.dataset.pool),null,{timeout:90000});
    await page.waitForTimeout(4000);
    const mode=await page.locator('html').getAttribute('data-pool');
    const canvas=await page.locator('.pool__frame').boundingBox();
    await page.mouse.move(canvas.x+canvas.width*.35,canvas.y+canvas.height*.5);
    await page.mouse.move(canvas.x+canvas.width*.65,canvas.y+canvas.height*.5,{steps:12});
    await page.waitForTimeout(400);
    await checkLabels(page);
    for(const slug of slugs) assert(await page.locator(`a[href="/work/${slug}/"]`).count());
    for(const place of places) assert.equal(await page.locator(`.pool__objects a[href="/${place}/"]`).count(),1,`Pool link missing: ${place}`);
    // Compare to the device width: on phones, innerWidth grows with wide content.
    const fits=()=>page.evaluate(w=>document.documentElement.scrollWidth<=w+1,viewport.width);
    assert(await fits(),'Horizontal overflow');
    assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),`Home should fit one screen at ${viewport.width}`);
    const fonts=await page.evaluate(async()=>{await document.fonts.ready;await document.fonts.load('400 16px "Special Elite"');return ['400 40px Piedra','400 20px Geo','400 20px "Cherry Cream Soda"','400 16px "Special Elite"'].filter(f=>document.fonts.check(f)).length;});
    assert.equal(fonts,4,'A brand font failed to load');
    if(mode==='live'){
      const px=await sampleWater(page);
      const [r,g,b]=px.water;
      assert(b>g*.95&&g>r*1.25&&r<190,`Water is not turquoise: ${px.water.map(Math.round)}`);
      assert(px.waterLuma>120&&px.waterLuma<235,`Water is too dark or blown out: ${Math.round(px.waterLuma)}`);
      assert(px.ink<px.waterLuma*.62,`Name not visible on the pool floor: ink ${Math.round(px.ink)} vs water ${Math.round(px.waterLuma)}`);
      console.log(`  water spread ${px.spread.toFixed(1)} at ${viewport.width}px`);
      if(!px.portrait) assert(px.spread<52,`Caustics look neon: brightness spread ${px.spread.toFixed(1)}`);
    }
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
    await page.waitForTimeout(900);
    await page.screenshot({path:`test-results/about-${viewport.width}.png`,fullPage:true});
    assert(await page.locator('text=YBBE TECH').count());
    assert(await fits(),'Horizontal overflow on About');
    await page.goto(`${origin}/life/`,{waitUntil:'networkidle'});
    await page.locator('#gallery').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.screenshot({path:`test-results/life-${viewport.width}.png`,fullPage:true});
    assert.equal(await page.locator('img[src*="group"]').count(),2, 'Preserve the approved running and hiking photographs');
    assert.equal(await page.locator('.about-v6__gallery img').count(),5);
    assert(await fits(),'Horizontal overflow on Life');
    // Primary navigation reaches all four pages and marks where you are.
    for(const [label,path] of [['About','/about/'],['Work','/work/'],['Life','/life/'],['Home','/']]) {
      await page.locator('.site-header nav a',{hasText:label}).click();
      await page.waitForURL(`${origin}${path}`);
      assert.equal(await page.locator('.site-header nav a[aria-current="page"]').textContent(),label);
    }
    await page.goto(`${origin}/work/adapt-to-china/`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('[data-testimonial][data-consent="true"]').count(),2);
    for(const slug of slugs) {
      await page.goto(`${origin}/work/${slug}/`,{waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('strong').filter({hasText:/^Status & limits\.?$/}).count(),1, `Expected one status/limits section: ${slug}`);
      await page.evaluate(()=>document.fonts.ready);
      assert(await fits(),`Horizontal overflow on ${slug} at ${viewport.width}`);
    }
    assert.deepEqual(failures,[],`Browser/shader errors at ${viewport.width}px`);
    results.push({viewport,mode,labels:'pass',routes:'pass'});
    console.log(`✓ ${viewport.width}×${viewport.height}: ${mode}, labels, content, routes, console`);
    await context.close();
  }
  // The floats themselves: hover shows the caption, a real click dives and navigates.
  const live=await browser.newContext({viewport:{width:1440,height:900}});
  const lp=await live.newPage(); await lp.goto(origin,{waitUntil:'networkidle'});
  await lp.waitForFunction(()=>document.documentElement.dataset.pool==='live',null,{timeout:90000});
  await lp.waitForTimeout(2500);
  const centre=async sel=>lp.locator(sel).evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y};});
  for(const [sel,url] of [['.pool__objects a[href="/work/meetfolio/"]','**/work/meetfolio/'],['.pool__objects a[href="/life/"]','**/life/'],['.pool__objects a[href="/about/"]','**/about/']]) {
    const c=await centre(sel);
    await lp.mouse.move(c.x,c.y,{steps:4});
    await lp.waitForTimeout(250);
    assert.equal(await lp.locator(`${sel}.is-active`).count(),1,`Hover did not reach ${sel}`);
    await lp.mouse.click(c.x,c.y);
    await lp.waitForURL(url,{timeout:15000});
    await lp.goto(origin,{waitUntil:'networkidle'});
    await lp.waitForFunction(()=>document.documentElement.dataset.pool==='live',null,{timeout:90000});
    await lp.waitForTimeout(1500);
  }
  await live.close();
  console.log('✓ Hovering and clicking floats in the live pool navigates');
  // The header fits the smallest phones, and old homepage links still land.
  const narrow=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
  const np=await narrow.newPage(); await np.goto(`${origin}/?pool=static`,{waitUntil:'networkidle'});
  assert(await np.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow at 320px');
  assert.equal(await np.locator('.site-header nav a').count(),4);
  for(const path of ['about','work','life',...slugs.map(s=>`work/${s}`)]) {
    await np.goto(`${origin}/${path}/`,{waitUntil:'networkidle'});
    await np.evaluate(()=>document.fonts.ready);
    assert(await np.evaluate(()=>document.documentElement.scrollWidth<=321),`Horizontal overflow on /${path}/ at 320px`);
  }
  for(const [from,to] of [['/#projects','/work/'],['/#outside','/life/'],['/#contact','/about/#contact'],['/about/#outside','/life/']]) {
    await np.goto("about:blank"); await np.goto(`${origin}${from}`); await np.waitForURL(`${origin}${to}`);
  }
  await narrow.close();
  console.log('✓ 320px header, and legacy homepage links redirect');
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
  assert.equal(await staticPage.locator('.pool__objects a').count(),slugs.length+places.length);
  for (const slug of slugs) assert.equal(await staticPage.locator(`.pool__objects a[href="/work/${slug}/"]`).count(),1, `No-JS pool link missing: ${slug}`);
  await nojs.close();
  const page=await browser.newPage(); await page.goto(`${origin}/?pool=static`); await page.waitForSelector('.pool--unsupported');
  await page.locator('.pool__list-link').click(); await page.waitForURL('**/work/');
  await page.locator('.cards a[href="/work/meetfolio/"]').click(); await page.waitForURL('**/work/meetfolio/');
  await page.goto(`${origin}/work/`); await page.locator('[data-filter="client"]').click();
  assert.equal(await page.locator('[data-filter-list] > li:visible').count(),2);
  const response=await page.goto(`${origin}/does-not-exist/`); assert.equal(response.status(),404);
  await page.close();
  await writeFile('test-results/browser-results.json',JSON.stringify(results,null,2));
  console.log('✓ Reduced motion, keyboard, no-JS, forced-static navigation, filters and 404');
  assert(results.every(r=>r.mode==='live'),'WebGL2 unavailable: fallback checks passed, but live pool acceptance remains unverified');
} finally { if(browser)await browser.close(); await new Promise(resolve=>server.close(resolve)); }
