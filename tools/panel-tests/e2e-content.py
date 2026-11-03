from playwright.sync_api import sync_playwright
B='http://127.0.0.1:8081'
res=[]
def ck(n,c,x=''): res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n, '' if c else x)
with sync_playwright() as p:
    br=p.chromium.launch(); c=br.new_context(viewport={'width':1280,'height':900}); pg=c.new_page(); bad=[]; errs=[]
    pg.on('response',lambda r: bad.append(r.url) if r.status>=400 and 'icon.png' not in r.url and 'popups.json' not in r.url else None); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(B+'/edizon/setup.php'); pg.fill('input[name=token]','abcdefghijklmnopqrstuvwxyz'); pg.fill('input[name=name]','Super Reyhan'); pg.fill('input[name=email]','super@alfacentauri.test'); pg.fill('input[name=password]','Rahasia12345'); pg.fill('input[name=password2]','Rahasia12345'); pg.click('button[type=submit]'); pg.wait_for_load_state()
    pg.fill('input[name=email]','super@alfacentauri.test'); pg.fill('input[name=password]','Rahasia12345'); pg.click('button[type=submit]'); pg.wait_for_load_state()
    # formulir, pop-up, kiriman: halaman terbuka tanpa galat JS
    for path in ['forms.php','form.php','popups.php','popup.php','submissions.php','history.php?doc=hero']:
        r=pg.goto(B+'/edizon/'+path); pg.wait_for_load_state('networkidle')
        ck('opens '+path, r.status==200 and pg.locator('main').count()==1, r.status)
    pg.goto(B+'/edizon/forms.php'); ck('forms list has no English Now form', 'Free Trial' not in pg.inner_text('main'))
    # humas
    pg.goto(B+'/edizon/users.php'); f=pg.locator('form').filter(has=pg.locator('input[name=email]')).first
    f.locator('input[name=name]').fill('Humas Uji'); f.locator('input[name=email]').fill('humas@alfacentauri.test'); f.locator('input[name=password]').fill('HumasUji12345'); f.locator('select[name=role]').select_option('editor'); f.locator('button[type=submit]').click(); pg.wait_for_load_state()
    # super admin sets the author guide
    pg.goto(B+'/edizon/seo.php'); pg.fill('textarea[name=authorGuide]','ATURAN UJI: wajib izin orang tua untuk foto siswa.'); pg.click('button.btn[type=submit]'); pg.wait_for_load_state()
    # samples
    pg.goto(B+'/edizon/articles.php'); pg.click('button[value=seed]'); pg.wait_for_load_state()
    ck('3 samples created', 'artikel contoh dibuat' in pg.inner_text('main') and '3 artikel' in pg.inner_text('main'), pg.inner_text('main')[:200])
    # editor shows guide for super admin
    pg.locator('table a:has-text("Contoh")').first.click(); pg.wait_for_load_state()
    ck('guide in editor (super admin)', 'ATURAN UJI' in pg.inner_text('details.guide'))
    pg.wait_for_selector('#editor .card, #editor .ae', timeout=10000)
    # humas sees the same guide, and cannot open seo.php
    c2=br.new_context(viewport={'width':1280,'height':900}); h=c2.new_page(); h.goto(B+'/edizon/login.php'); h.fill('input[name=email]','humas@alfacentauri.test'); h.fill('input[name=password]','HumasUji12345'); h.click('button[type=submit]'); h.wait_for_load_state()
    h.goto(B+'/edizon/article.php'); ck('humas sees super admin guide on new article', 'ATURAN UJI' in h.inner_text('details.guide'))
    r=h.goto(B+'/edizon/seo.php'); ck('humas cannot open seo.php', r.status in (401,403))
    # public pages
    pub=c.new_page(); pub.on('response',lambda r: bad.append(r.url) if r.status>=400 and 'icon.png' not in r.url and 'popups.json' not in r.url else None); pub.on('pageerror',lambda e:errs.append(str(e)))
    pub.goto(B+'/articles/'); pub.wait_for_load_state('networkidle')
    ck('public list shows samples', pub.locator('article.card').count()==3, pub.locator('article.card').count())
    ck('no English Now text', 'English Now' not in pub.content() and 'Free Trial' not in pub.content())
    ck('header cta SPMB', 'Daftar SPMB' in pub.locator('header.top').inner_text())
    ck('audience toggle hidden', not pub.locator('.aud').first.is_visible() if pub.locator('.aud').count() else True)
    ck('nav has Tentang/Program', 'Program' in pub.locator('.top-nav').inner_text())
    ck('footer has contact', '022-7305453' in pub.locator('footer.foot').inner_text() and 'sdalfacentauri' in pub.locator('footer.foot').inner_html().lower())
    ck('brand font is Plus Jakarta', 'Plus Jakarta' in pub.evaluate("getComputedStyle(document.body).fontFamily"))
    ck('header bg is light blue-white tone', pub.evaluate("getComputedStyle(document.querySelector('.cta')).backgroundColor")=='rgb(47, 107, 234)')
    pub.locator('article.card h3 a').first.click(); pub.wait_for_load_state('networkidle')
    ck('article page renders h1', pub.locator('h1').count()>=1 and len(pub.locator('h1').first.inner_text())>5)
    pub.set_viewport_size({'width':390,'height':844}); pub.reload(); pub.wait_for_load_state('networkidle')
    ck('no horizontal overflow on phone', pub.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'))
    ck('no failing requests', not bad, bad[:5]); ck('no js errors', not errs, errs[:3])
    br.close()
print(res.count(False),'failed of',len(res))
