import asyncio
from playwright.async_api import async_playwright
URL='http://localhost:8765/index.html';PW='Senha-Forte-2026!'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();c=await b.new_context(viewport={'width':1280,'height':800});pg=await c.new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL);await pg.wait_for_selector('#ckb');await pg.click('[data-act=ckNec]')
        await pg.fill('#g1',PW);await pg.fill('#g2',PW);await pg.click('#gok');await pg.wait_for_selector('#main h1',timeout=15000)
        await pg.evaluate("seedDemo('lp')");await pg.evaluate("go('empresa',{})");await pg.wait_for_timeout(300)
        # 1) cancelar
        await pg.click('#btnSair');print('modal:',(await pg.inner_text('#modal')).replace('\n',' ')[:110])
        await pg.click('#sairNao');assert not await pg.evaluate("document.getElementById('modal').classList.contains('on')");print('cancelar mantém a sessão: ok', await pg.evaluate("!!DB"))
        # 2) alteração pendente na tela + salvar e sair
        await pg.fill('[name=fantasia]','Fantasia Alterada Sair');print('DIRTY:',await pg.evaluate("DIRTY"))
        await pg.click('#btnSair');print('aviso de tela suja:', 'não gravadas' in await pg.inner_text('#modal'), '| botão:', await pg.inner_text('#sairSim'))
        await pg.click('#sairSim');await pg.wait_for_selector('#gate',timeout=8000);print('após sair ->',(await pg.inner_text('#gate p')).strip()[:75],'| DB nulo:',await pg.evaluate("DB===null"))
        # 3) reabrir e conferir persistência
        await pg.reload();await pg.wait_for_selector('#gate');await pg.fill('#g1',PW);await pg.click('#gok');await pg.wait_for_selector('#main h1',timeout=15000)
        print('fantasia gravada:',await pg.evaluate("DB.empresa&&DB.empresa.fantasia"),'| auditoria sair:',await pg.evaluate("DB.audit.some(a=>/sessao.sair/.test(JSON.stringify(a)))"))
        # 4) sair simples
        await pg.click('#btnSair');await pg.click('#sairSim');await pg.wait_for_selector('#gate',timeout=8000);print('saída simples ok')
        print('ERROS:',errs or 'nenhum');await b.close()
asyncio.run(main())
