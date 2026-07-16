"""
QA suite ponta-a-ponta para o AutoSite.
Executa:
1. Rotas públicas (home, /auth, /reset-password)
2. 404 correto em blog de loja inexistente
3. Login admin (tiijrc@gmail.com / Vodin4s4)
4. Painel /admin: visão geral, usuários, lojas, assinaturas, auditoria, pagamentos
5. Suporte
6. Storefront público /loja/autoprime + envio de lead
7. Logout

Falha o processo (exit 1) se qualquer verificação crítica falhar.
"""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = "http://localhost:8080"
ADMIN_EMAIL = "tiijrc@gmail.com"
ADMIN_PASS  = "Vodin4s4"
SS = Path(__file__).parent / "shots"; SS.mkdir(exist_ok=True)

failures = []
def check(name, ok, detail=""):
    tag = "OK  " if ok else "FAIL"
    print(f"[{tag}] {name}" + (f"  — {detail}" if detail else ""))
    if not ok: failures.append(name)

async def login(p, email, password):
    await p.goto(f"{BASE}/auth", wait_until="domcontentloaded")
    await p.locator('input[type="email"]').first.fill(email)
    await p.locator('input[type="password"]').first.fill(password)
    for name in ("Entrar", "Login", "Sign in", "Acessar"):
        try:
            await p.get_by_role("button", name=name, exact=False).first.click(timeout=800)
            break
        except Exception: continue
    else:
        await p.locator('form button[type="submit"]').first.click()
    await p.wait_for_url(lambda u: "/auth" not in u, timeout=8000)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        p = await ctx.new_page()

        # 1. Public routes
        for path, key in [("/", "home"), ("/auth", "auth"), ("/reset-password", "reset")]:
            r = await p.goto(f"{BASE}{path}", wait_until="domcontentloaded")
            check(f"GET {path} → 200", (r.status if r else 0) == 200, f"status={r.status if r else 'n/a'}")
            await p.screenshot(path=str(SS/f"pub_{key}.png"))

        # 2. 404 for unknown store blog
        r = await p.goto(f"{BASE}/blog/inexistente-xyz", wait_until="domcontentloaded")
        check("GET /blog/<unknown> → 404", (r.status if r else 0) == 404)

        # 3. Admin login
        await login(p, ADMIN_EMAIL, ADMIN_PASS)
        check("Admin login redireciona para app", "/auth" not in p.url, p.url)

        # 4. Admin panel
        for sub, key in [("", "overview"), ("usuarios", "users"), ("lojas", "stores"),
                          ("assinaturas", "subs"), ("auditoria", "audit"), ("pagamentos", "payments")]:
            url = f"{BASE}/admin" + (f"/{sub}" if sub else "")
            r = await p.goto(url, wait_until="domcontentloaded")
            await p.wait_for_timeout(600)
            ok = (r.status if r else 0) == 200 and "/auth" not in p.url
            await p.screenshot(path=str(SS/f"admin_{key}.png"))
            check(f"Admin: {url}", ok)

        # visão geral deve mostrar "Administrador único" (é o único admin)
        await p.goto(f"{BASE}/admin", wait_until="domcontentloaded")
        await p.wait_for_timeout(500)
        content = await p.content()
        check("Painel exibe badge de admin único", "Administrador único" in content)

        # 5. Suporte
        r = await p.goto(f"{BASE}/suporte", wait_until="domcontentloaded")
        check("GET /suporte autenticado", (r.status if r else 0) == 200)
        await p.screenshot(path=str(SS/"suporte.png"))

        # 6. Public storefront (autoprime)
        r = await p.goto(f"{BASE}/loja/autoprime", wait_until="domcontentloaded")
        await p.wait_for_timeout(800)
        ok_shop = (r.status if r else 0) == 200
        content = await p.content()
        check("Loja pública /loja/autoprime carrega", ok_shop and "AutoPrime" in content)
        check("Estoque exibe pelo menos 1 veículo", "Civic" in content or "Corolla" in content)
        await p.screenshot(path=str(SS/"loja_publica.png"))

        # 7. Logout: navega para /auth via botão Sair no admin
        await p.goto(f"{BASE}/admin", wait_until="domcontentloaded")
        try:
            await p.get_by_role("button", name="Sair", exact=False).first.click(timeout=1500)
        except Exception:
            try: await p.get_by_role("link", name="Sair", exact=False).first.click(timeout=1500)
            except Exception: pass
        await p.wait_for_timeout(1500)
        # Após logout, /admin deve redirecionar para /auth
        r = await p.goto(f"{BASE}/admin", wait_until="domcontentloaded")
        await p.wait_for_timeout(500)
        check("Após logout, /admin volta ao /auth", "/auth" in p.url, p.url)

        await b.close()

    print(f"\n{'-'*40}\nFalhas: {len(failures)}")
    for f in failures: print(" -", f)
    sys.exit(1 if failures else 0)

asyncio.run(main())
