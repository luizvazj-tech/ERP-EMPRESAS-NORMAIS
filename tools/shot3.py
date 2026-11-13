import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1280,'height':800})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/folha/index.html')
        await pg.evaluate("seedDemo('lp');go('home')")
        await pg.screenshot(path='/tmp/b_home.png')
        await pg.evaluate("go('marca')")
        await pg.screenshot(path='/tmp/b_marca.png')
        print(errs, await pg.title())
        await b.close()
asyncio.run(main())
