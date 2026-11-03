from playwright.sync_api import sync_playwright
B='http://127.0.0.1:8081/edizon/'
res=[]
def ck(n,c): res.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n)
with sync_playwright() as p:
    br=p.chromium.launch(); 
    def newctx(): return br.new_context(viewport={'width':1280,'height':800})
    errs=[]
    c=newctx(); pg=c.new_page(); pg.on('response',lambda r: errs.append('404 '+r.url) if r.status==404 else None); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto(B+'setup.php')
    pg.fill('input[name=token]','abcdefghijklmnopqrstuvwxyz'); pg.fill('input[name=name]','Super Reyhan'); pg.fill('input[name=email]','super@alfacentauri.test'); pg.fill('input[name=password]','Rahasia12345'); pg.fill('input[name=password2]','Rahasia12345')
    pg.click('button[type=submit]'); pg.wait_for_load_state()
    ck('setup lands on login or index', 'login' in pg.url or pg.url.endswith('index.php') or pg.url.endswith('/edizon/'))
    if 'login' in pg.url:
        pg.fill('input[name=email]','super@alfacentauri.test'); pg.fill('input[name=password]','Rahasia12345'); pg.click('button[type=submit]'); pg.wait_for_load_state()
    ck('title brand', 'SD Alfa Centauri' in pg.title())
    side=pg.inner_text('.side').lower()
    for w in ['Homepage content','Make Content','Submission','Setting','Pengaturan Situs','SEO','Riwayat','Pengguna','Artikel','Formulir','Pop-up']: ck('super sidebar has '+w, w.lower() in side)
    ck('no quiz/chatbot', 'Kuis' not in side and 'Chatbot' not in side and 'English' not in side)
    # settings
    pg.goto(B+'settings.php'); pg.wait_for_selector('#editor .card')
    ck('settings seeded name', pg.input_value('#editor input >> nth=0')=='SD Alfa Centauri')
    pg.fill('#editor input >> nth=1','Tagline Uji'); pg.click('#save'); pg.wait_for_timeout(1200)
    ck('settings saved', 'Tagline Uji' in open('/home/claude/sd-alfa-centauri/storage/data/content.json').read() if __import__('os').path.exists('/home/claude/sd-alfa-centauri/storage/data/content.json') else __import__('os').path.exists('/home/claude/sd-alfa-centauri/public/data/content.json') and 'Tagline Uji' in open('/home/claude/sd-alfa-centauri/public/data/content.json').read())
    pg.goto(B+'history.php'); ck('history shows versions', 'Pengaturan situs' in pg.inner_text('main'))
    pg.goto(B+'seo.php'); ck('seo page', 'SEO' in pg.inner_text('h1'))
    pg.click('button.btn[type=submit]'); pg.wait_for_load_state(); ck('seo saved flash', 'disimpan' in pg.inner_text('main').lower())
    # users: add humas
    pg.goto(B+'users.php'); 
    ck('role options', 'Super Admin' in pg.content() and 'Admin (Humas)' in pg.content() and 'Customer Service' not in pg.content()); print(pg.locator('select[name=role]').first.inner_text())
    f=pg.locator('form').filter(has=pg.locator('input[name=email]')).first
    f.locator('input[name=name]').fill('Humas Uji'); f.locator('input[name=email]').fill('humas@alfacentauri.test'); f.locator('input[name=password]').fill('HumasUji12345')
    f.locator('select[name=role]').select_option('editor'); f.locator('button[type=submit]').click(); pg.wait_for_load_state()
    ck('humas added', 'humas@alfacentauri.test' in pg.inner_text('main'))
    pg.goto(B+'articles.php'); ck('super opens articles', pg.url.endswith('articles.php'))
    pg.goto(B+'forms.php'); ck('super opens forms', pg.url.endswith('forms.php'))
    pg.goto(B+'popups.php'); ck('super opens popups', pg.url.endswith('popups.php'))
    pg.goto(B+'submissions.php'); ck('super opens submissions', pg.url.endswith('submissions.php') and pg.inner_text('body').strip()!='')
    # humas
    c2=newctx(); h=c2.new_page(); h.goto(B+'login.php')
    h.fill('input[name=email]','humas@alfacentauri.test'); h.fill('input[name=password]','HumasUji12345'); h.click('button[type=submit]'); h.wait_for_load_state()
    s2=h.inner_text('.side')
    ck('humas role label', 'Admin (Humas)' in s2)
    ck('humas sees content+articles+history', all(w.lower() in s2.lower() for w in ['Artikel','Riwayat','Make Content']))
    ck('humas hides users/settings/seo/submission', not any(w in s2 for w in ['Pengguna','Pengaturan Situs','SEO','Submission']))
    for pth in ['users.php','settings.php','seo.php','submissions.php']:
        r=h.goto(B+pth); ck('humas blocked '+pth, r.status in (403,401) or 'hanya untuk Super Admin' in h.inner_text('body'))
    r=h.goto(B+'history.php'); ck('humas history ok', r.status==200 and 'Pengaturan situs' not in h.inner_text('main'))
    r=h.goto(B+'articles.php'); ck('humas articles ok', r.status==200)
    ck('no js errors', not [e for e in errs if 'favicon' not in e]); print(errs[:5])
    br.close()
print(sum(1 for _,c in res if not c),'failed of',len(res))
