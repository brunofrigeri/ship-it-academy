# python3 tools/deep/smoke.py <day> [<lessons>]  -- renders each lesson of a day (or extras with x:<id>) and reports parts/cases/errors
import sys
from playwright.sync_api import sync_playwright
args = sys.argv[1:]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:4173/course/'); pg.wait_for_timeout(800)
    hashes = []
    for a in args:
        if a.startswith('x:'): hashes.append('#x-' + a[2:])
        else: hashes += [f'#t-{a}-{i}' for i in range(8)]
    for h in hashes:
        pg.goto('http://localhost:4173/course/' + h); pg.wait_for_timeout(350)
        if not pg.locator('.prose').count(): continue
        if h.startswith('#t-') and pg.evaluate('location.hash') != h: continue
        print(h, pg.inner_text('h1')[:50], '| parts', pg.locator('h3.lpart').count(), 'cases', pg.locator('.case').count(), 'code', pg.locator('.prose pre').count(), 'steps', pg.locator('ul.steps li').count())
    print('errors', errs); b.close()
