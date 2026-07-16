# QA e2e — AutoSite

Suite de testes ponta-a-ponta usando Playwright (Python).

Pré-requisitos:
- `pip install playwright && playwright install chromium`
- App rodando em `http://localhost:8080`
- Usuário admin no banco: `tiijrc@gmail.com` / `Vodin4s4`
- Loja demo `autoprime` publicada (criada pelo seed inicial)

Executar:

    python3 e2e/qa_suite.py

Screenshots são gravados em `e2e/shots/`.
