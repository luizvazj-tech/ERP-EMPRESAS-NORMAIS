import asyncio, json, sys
from playwright.async_api import async_playwright
URL='http://localhost:8765/index.html'
PW='Senha-Forte-2026!'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); c=await b.new_context(viewport={'width':1280,'height':800}); pg=await c.new_page()
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append('CSP/console: '+m.text) if m.type=='error' else None)
        await pg.goto(URL); await pg.wait_for_selector('#ckb'); await pg.wait_for_selector('#gate')
        print('banner+gate ok; fonte externa antes do consentimento:', await pg.evaluate("document.getElementById('brandfont').getAttribute('href')"))
        await pg.screenshot(path='/tmp/s1.png')
        await pg.click('[data-act=ckNec]'); assert await pg.query_selector('#ckb') is None
        print('consent', await pg.evaluate("localStorage.getItem('folhaPro.consent.v1')"))
        await pg.fill('#g1','curta'); await pg.fill('#g2','curta'); await pg.click('#gok'); print('fraca ->', await pg.inner_text('#gmsg'))
        await pg.fill('#g1',PW); await pg.fill('#g2',PW); await pg.click('#gok'); await pg.wait_for_selector('#main h1', timeout=15000)
        print('entrou; menu itens:', await pg.evaluate("document.querySelectorAll('#side a').length"))
        await pg.evaluate("seedDemo('lp');audit('teste');saveDB()"); await pg.evaluate("vaultFlush()")
        ls=await pg.evaluate("({v:localStorage.getItem('folhaPro.vault.v1'),p:localStorage.getItem('folhaPro.v1')})")
        print('vault gravado', len(ls['v']), 'plaintext legado', ls['p'], 'contém razão em claro?', 'DEMONSTRA' in ls['v'])
        await pg.evaluate("go('privacidade')"); await pg.screenshot(path='/tmp/s2.png',full_page=True)
        await pg.evaluate("go('cookies')"); await pg.evaluate("go('seguranca')"); await pg.evaluate("go('auditoria')")
        print('auditoria linhas', await pg.evaluate("DB.audit.length"))
        # titular
        await pg.reload(); await pg.wait_for_selector('#gate')
        await pg.fill('#g1','errada-errada-1!'); await pg.click('#gok'); await pg.wait_for_function("document.getElementById('gmsg').textContent.length>0"); print('senha errada ->', await pg.inner_text('#gmsg'))
        await pg.fill('#g1',PW); await pg.click('#gok'); await pg.wait_for_selector('#main h1',timeout=15000)
        print('persistiu após reload:', await pg.evaluate("DB.empresa&&DB.empresa.razao"), 'empregados', await pg.evaluate("DB.empregados.length"))
        # CNPJ alfanumérico pela UI
        await pg.evaluate("go('empresa')"); await pg.fill('[name=cnpj]','12abc34501de35'); await pg.focus('[name=razao]'); print('máscara:', await pg.input_value('[name=cnpj]'))
        # bloqueio manual
        await pg.evaluate("ACT.lock()"); await pg.wait_for_selector('#gate'); print('bloqueou; DB', await pg.evaluate("DB"))
        await pg.fill('#g1',PW); await pg.click('#gok'); await pg.wait_for_selector('#main h1',timeout=15000)
        # consentimento aceitar todos -> fonte
        await pg.evaluate("ACT.ckReopen()"); await pg.click('[data-act=ckAll]'); await pg.evaluate("BRAND.fonte='Inter';applyBrand()"); print('fonte após consentir:', (await pg.evaluate("document.getElementById('brandfont').getAttribute('href')"))[:48])
        # mobile
        await pg.set_viewport_size({'width':390,'height':800}); await pg.evaluate("go('home')"); print('mnav visível', await pg.is_visible('#mnav')); await pg.screenshot(path='/tmp/s3.png')
        print('ERROS:',errs)
        await b.close()
asyncio.run(main())
