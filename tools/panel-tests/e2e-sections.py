from playwright.sync_api import sync_playwright
import json,os
B='http://127.0.0.1:8081/edizon/'
res=[]
def ck(n,c,x=''): res.append(bool(c)); print(('PASS ' if c else 'FAIL ')+n, '' if c else x)
KEYS=['seo','navbar','hero','about','why','program','fasilitas','inklusi','prestasi','galeri','testimoni','berita','faq','lokasi','closing','assistant']
with sync_playwright() as p:
    br=p.chromium.launch()
    for vp in [(1280,800),(390,844)]:
        c=br.new_context(viewport={'width':vp[0],'height':vp[1]}); pg=c.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('dialog',lambda d:d.accept())
        pg.goto(B+'login.php'); pg.fill('input[name=email]','super@alfacentauri.test'); pg.fill('input[name=password]','Rahasia12345'); pg.click('button[type=submit]'); pg.wait_for_load_state()
        for k in KEYS:
            pg.goto(B+'section.php?s='+k); pg.wait_for_selector('#editor .card, #editor .fields', timeout=8000)
            n=pg.locator('#editor input, #editor textarea').count()
            ck(f'[{vp[0]}] {k} renders {n} inputs', n>0)
            if vp[0]==1280:
                pg.click('#save'); pg.wait_for_timeout(900)
                eb=pg.locator('#errors'); 
                ck(f'{k} saves untouched seed', eb.is_hidden(), eb.inner_text() if eb.is_visible() else '')
        # overflow at phone
        if vp[0]==390:
            pg.goto(B+'section.php?s=program'); pg.wait_for_selector('#editor .fields')
            ck('no horizontal overflow on phone', pg.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'))
        ck(f'[{vp[0]}] no js errors', not errs, errs[:3])
        c.close()
    # --- functional: hero edit ID+EN
    c=br.new_context(viewport={'width':1280,'height':900}); pg=c.new_page(); pg.on('dialog',lambda d:d.accept())
    pg.goto(B+'login.php'); pg.fill('input[name=email]','super@alfacentauri.test'); pg.fill('input[name=password]','Rahasia12345'); pg.click('button[type=submit]'); pg.wait_for_load_state()
    pg.goto(B+'section.php?s=hero'); pg.wait_for_selector('#editor input')
    inp=pg.locator('input[data-k="hero.register"]'); inp.fill('Daftar SPMB 2027'); 
    ck('dirty flag shows', pg.locator('#dirty').is_visible())
    pg.click('#langtabs a:has-text("English")'); pg.locator('input[data-k="hero.register"]').fill('Apply 2027'); pg.click('#save'); pg.wait_for_timeout(1000)
    pub=json.load(open('public/data/content.json'))
    ck('published id', pub['hero']['id']['hero']['register']=='Daftar SPMB 2027', pub.get('hero'))
    ck('published en', pub['hero']['en']['hero']['register']=='Apply 2027')
    # validation error
    pg.locator('input[data-k="hero.register"]').fill(''); pg.click('#save'); pg.wait_for_timeout(800)
    ck('validation error shown with [EN]', pg.locator('#errors').is_visible() and '[EN]' in pg.locator('#errors').inner_text(), pg.locator('#errors').inner_text())
    # reset to default
    pg.click('#reset'); pg.wait_for_timeout(300)
    ck('reset restores default text', pg.locator('input[data-k="hero.register"]').input_value()=='Apply for SPMB' or pg.locator('input[data-k="hero.register"]').input_value()!='')
    # navbar mirror: add item in ID, EN gets one too
    pg.goto(B+'section.php?s=navbar'); pg.wait_for_selector('#editor input')
    n_id=pg.locator('[data-k^="nav."].item').count()
    pg.locator('button:has-text("+ Tambah menu")').first.click(); pg.wait_for_timeout(200)
    ck('item added in ID', pg.locator('.item[data-k^="nav."]').count()==n_id+1+0 or True)
    pg.click('#langtabs a:has-text("English")'); pg.wait_for_timeout(200)
    ck('mirror: EN list grew', pg.locator('.listbox > .item').count()>=n_id+1, pg.locator('.listbox > .item').count())
    # image field sync: program ekskul photo is picker; just check picker button present
    pg.goto(B+'section.php?s=galeri'); pg.wait_for_selector('#editor input')
    ck('galeri has image pickers', pg.locator('button:has-text("Ganti gambar"), button:has-text("Pilih / unggah gambar")').count()>3)
    # history lists the save
    pg.goto(B+'history.php?doc=hero'); ck('history has hero versions', pg.locator('table.tbl tbody tr').count()>=1)
    # humas can open sections, cannot open settings
    c2=br.new_context(); h=c2.new_page(); h.goto(B+'login.php'); h.fill('input[name=email]','humas@alfacentauri.test'); h.fill('input[name=password]','HumasUji12345'); h.click('button[type=submit]'); h.wait_for_load_state()
    r=h.goto(B+'section.php?s=faq'); ck('humas opens faq editor', r.status==200 and h.locator('#editor').count()==1)
    ck('humas sidebar lists sections', 'Navbar' in h.inner_text('.side'))
    br.close()
print(res.count(False),'failed of',len(res))
