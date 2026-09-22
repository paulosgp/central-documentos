# Central de Documentos — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar em `central.saudesaomateusdosul.com.br` a pasta `MATERIAIS PUBLICADOS` (modelos, fichas e formulários da SMS), com busca por nome e botão Baixar, sem servidor.

**Architecture:** A pasta `MATERIAIS PUBLICADOS` dentro do repositório é o conteúdo publicado (subpasta = categoria, nome do arquivo = título). Um script Node sem dependências (`publicar.js`) lê a pasta e gera `materiais.json`; um `index.html` único lê o JSON e monta a lista. GitHub Pages serve tudo; o Claude publica com commit + push.

**Tech Stack:** Node 20+ (`node:test`, `node:fs`), HTML/CSS/JS sem framework, GitHub Pages, `gh` CLI. Fontes e logotipos copiados do Guia Saúde.

Spec: `docs/superpowers/specs/2026-09-21-central-de-documentos-design.md`.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `publicar.js` | Lê `MATERIAIS PUBLICADOS`, gera `materiais.json`, imprime relatório. Exporta as funções puras para teste. |
| `publicar.test.js` | Testes do script (`node --test`). |
| `materiais.json` | Saída do script; a página lê daqui. |
| `index.html` | A página inteira: estilo, busca, lista, download. |
| `manifest.webmanifest`, `logo-central.svg`, `icone-192.png`, `icone-512.png`, `apple-touch-icon.png`, `favicon*.png`, `favicon.ico`, `logo-prefeitura.png`, `logo-sms.png`, `fontes/*.woff2` | Identidade visual. Ícones e fontes copiados do Guia Saúde; o `logo-central.svg` é novo. |
| `.nojekyll`, `CNAME` | Pages serve a pasta como está; domínio. |
| `CLAUDE.md` | Decisões do app. |
| `../GuiaSaude/index.html`, `../GuiaSaude/logo-central.svg` | Cartão novo na seção Documentos. |
| `../CLAUDE.md`, `../.claude/scripts/sync-apps-monorepo.js` | Linha do app novo e `PREFIX_MAP`. |

Todos os caminhos abaixo são relativos a `C:\Users\paulo\OneDrive\Desktop\.claude apps\CentralDocumentos`, salvo indicação.

---

### Task 1: `publicar.js` — funções puras (título, tipo, id, nome de categoria, ordem)

**Files:**
- Create: `publicar.js`
- Test: `publicar.test.js`

- [ ] **Step 1: Escrever os testes que falham**

```js
// publicar.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const P = require('./publicar.js');

test('titulo: tira a extensão e colapsa espaços', () => {
  assert.equal(P.titulo('Ficha de  solicitação de férias.docx'), 'Ficha de solicitação de férias');
  assert.equal(P.titulo('Memorando modelo.DOCX'), 'Memorando modelo');
  assert.equal(P.titulo('sem-extensao'), 'sem-extensao');
});

test('tipo: pela extensão, minúscula, e "outro" para o resto', () => {
  assert.equal(P.tipo('a.docx'), 'word');
  assert.equal(P.tipo('a.DOC'), 'word');
  assert.equal(P.tipo('a.odt'), 'word');
  assert.equal(P.tipo('a.xlsx'), 'excel');
  assert.equal(P.tipo('a.pptx'), 'powerpoint');
  assert.equal(P.tipo('a.pdf'), 'pdf');
  assert.equal(P.tipo('a.png'), 'imagem');
  assert.equal(P.tipo('a.zip'), 'outro');
  assert.equal(P.tipo('semext'), 'outro');
});

test('idCategoria: slug ASCII sem acento', () => {
  assert.equal(P.idCategoria('RH E SERVIDOR'), 'rh-e-servidor');
  assert.equal(P.idCategoria('Ofícios e Memorandos'), 'oficios-e-memorandos');
  assert.equal(P.idCategoria('  Saúde Bucal (2026) '), 'saude-bucal-2026');
});

test('nomeCategoria: mapa fixo para as conhecidas, pasta como está para as outras', () => {
  assert.equal(P.nomeCategoria('RH E SERVIDOR'), 'RH e servidor');
  assert.equal(P.nomeCategoria('OFICIOS E MEMORANDOS'), 'Ofícios e memorandos');
  assert.equal(P.nomeCategoria('FORMULARIOS ASSISTENCIAIS'), 'Formulários assistenciais');
  assert.equal(P.nomeCategoria('Saúde Bucal'), 'Saúde Bucal');
});

test('ordemCategorias: conhecidas na ordem do mapa, depois as outras em ordem alfabética', () => {
  const ordem = P.ordemCategorias(['Vacinas', 'FORMULARIOS ASSISTENCIAIS', 'Agenda', 'RH E SERVIDOR']);
  assert.deepEqual(ordem, ['RH E SERVIDOR', 'FORMULARIOS ASSISTENCIAIS', 'Agenda', 'Vacinas']);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test publicar.test.js`
Expected: falha com `Cannot find module './publicar.js'`.

- [ ] **Step 3: Implementar as funções puras**

```js
// publicar.js
#!/usr/bin/env node
'use strict';
// Gera materiais.json a partir da pasta MATERIAIS PUBLICADOS. Sem dependências.
// Uso: node publicar.js [--pasta="outra pasta"] [--saida=materiais.json]
const fs = require('node:fs');
const path = require('node:path');

const PASTA_PADRAO = 'MATERIAIS PUBLICADOS';
const SAIDA_PADRAO = 'materiais.json';
const LIMITE_BYTES = 95 * 1024 * 1024; // o GitHub recusa arquivo acima de 100 MB

// Nome bonito e ORDEM das categorias conhecidas. Pasta fora daqui entra depois, alfabética.
const NOMES = new Map([
  ['RH E SERVIDOR', 'RH e servidor'],
  ['OFICIOS E MEMORANDOS', 'Ofícios e memorandos'],
  ['FORMULARIOS ASSISTENCIAIS', 'Formulários assistenciais'],
]);

const TIPOS = {
  doc: 'word', docx: 'word', dot: 'word', dotx: 'word', odt: 'word', rtf: 'word',
  xls: 'excel', xlsx: 'excel', xlsm: 'excel', ods: 'excel', csv: 'excel',
  ppt: 'powerpoint', pptx: 'powerpoint', odp: 'powerpoint',
  pdf: 'pdf',
  png: 'imagem', jpg: 'imagem', jpeg: 'imagem', gif: 'imagem', svg: 'imagem', webp: 'imagem',
};

function semAcento(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function titulo(nomeArquivo) {
  const ext = path.extname(nomeArquivo);
  return nomeArquivo.slice(0, nomeArquivo.length - ext.length).replace(/\s+/g, ' ').trim();
}

function tipo(nomeArquivo) {
  const ext = path.extname(nomeArquivo).slice(1).toLowerCase();
  return TIPOS[ext] || 'outro';
}

function idCategoria(pasta) {
  return semAcento(pasta).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function nomeCategoria(pasta) {
  return NOMES.get(pasta) || pasta;
}

function ordemCategorias(pastas) {
  const conhecidas = [...NOMES.keys()].filter((p) => pastas.includes(p));
  const outras = pastas.filter((p) => !NOMES.has(p)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return [...conhecidas, ...outras];
}

module.exports = { titulo, tipo, idCategoria, nomeCategoria, ordemCategorias, PASTA_PADRAO, SAIDA_PADRAO, LIMITE_BYTES };
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test publicar.test.js`
Expected: `# pass 5`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add publicar.js publicar.test.js
git commit -m "publicar.js: título, tipo, id e ordem das categorias"
```

---

### Task 2: `publicar.js` — ler a pasta (ignorados, avisos, categorias vazias)

**Files:**
- Modify: `publicar.js`
- Test: `publicar.test.js`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `publicar.test.js`:

```js
// Monta uma pasta temporária a partir de um objeto { 'CATEGORIA/arquivo.ext': 'conteúdo' }.
function pastaTemporaria(arquivos) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'central-'));
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    const abs = path.join(raiz, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (conteudo === null) fs.mkdirSync(abs, { recursive: true });
    else fs.writeFileSync(abs, conteudo);
  }
  return raiz;
}

test('lerPasta: categorias na ordem certa, materiais em ordem alfabética, com título/tipo/tamanho/data', () => {
  const raiz = pastaTemporaria({
    'RH E SERVIDOR/Ficha de férias.docx': 'abc',
    'RH E SERVIDOR/Atestado.pdf': 'abcd',
    'Vacinas/Cartão.xlsx': 'x',
    'LEIA-ME.txt': 'regras',
  });
  const r = P.lerPasta(raiz);
  assert.deepEqual(r.categorias.map((c) => c.id), ['rh-e-servidor', 'vacinas']);
  assert.equal(r.categorias[0].nome, 'RH e servidor');
  assert.deepEqual(r.categorias[0].materiais.map((m) => m.titulo), ['Atestado', 'Ficha de férias']);
  const m = r.categorias[0].materiais[1];
  assert.equal(m.arquivo, 'MATERIAIS PUBLICADOS/RH E SERVIDOR/Ficha de férias.docx');
  assert.equal(m.tipo, 'word');
  assert.equal(m.tamanho, 3);
  assert.match(m.atualizadoEm, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(r.avisos, []);
});

test('lerPasta: ignora LEIA-ME, temporários, ocultos, subpastas, vazios, caractere proibido — com aviso', () => {
  const raiz = pastaTemporaria({
    'RH E SERVIDOR/ok.docx': 'abc',
    'RH E SERVIDOR/~$ok.docx': 'lixo',
    'RH E SERVIDOR/_rascunho.docx': 'abc',
    'RH E SERVIDOR/.gitkeep': '',
    'RH E SERVIDOR/vazio.pdf': '',
    'RH E SERVIDOR/tem#cerquilha.pdf': 'abc',
    'RH E SERVIDOR/Subpasta': null,
    'solto-na-raiz.pdf': 'abc',
  });
  const r = P.lerPasta(raiz);
  assert.deepEqual(r.categorias[0].materiais.map((m) => m.titulo), ['ok']);
  const texto = r.avisos.join('\n');
  assert.match(texto, /~\$ok\.docx.*tempor/);
  assert.match(texto, /_rascunho\.docx.*tempor/);
  assert.match(texto, /vazio\.pdf.*vazio/);
  assert.match(texto, /tem#cerquilha\.pdf.*proibido/);
  assert.match(texto, /Subpasta.*subpasta/);
  assert.match(texto, /solto-na-raiz\.pdf.*fora de categoria/);
  assert.doesNotMatch(texto, /\.gitkeep/); // oculto é esperado: sem aviso
});

test('lerPasta: categoria vazia sai do JSON e vira aviso', () => {
  const raiz = pastaTemporaria({ 'RH E SERVIDOR/.gitkeep': '', 'Vacinas/a.pdf': 'abc' });
  const r = P.lerPasta(raiz);
  assert.deepEqual(r.categorias.map((c) => c.id), ['vacinas']);
  assert.match(r.avisos.join('\n'), /RH E SERVIDOR.*vazia/);
});

test('lerPasta: pasta inexistente é erro', () => {
  assert.throws(() => P.lerPasta(path.join(os.tmpdir(), 'nao-existe-' + Date.now())), /não existe/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test publicar.test.js`
Expected: os 4 testes novos falham com `P.lerPasta is not a function`.

- [ ] **Step 3: Implementar `lerPasta`**

Inserir em `publicar.js`, antes do `module.exports`, e acrescentar `lerPasta` ao export:

```js
// Devolve o motivo de ignorar o arquivo, ou null. 'silencioso' = não vale aviso (esperado).
function motivoIgnorar(nome, stat) {
  if (nome.startsWith('.')) return { motivo: 'oculto', silencioso: true };
  if (nome === 'LEIA-ME.txt') return { motivo: 'LEIA-ME', silencioso: true };
  if (stat.isDirectory()) return { motivo: 'subpasta dentro de categoria não é publicada' };
  if (nome.startsWith('_') || nome.startsWith('~$')) return { motivo: 'temporário ou rascunho (começa com _ ou ~$)' };
  if (/[#?%]/.test(nome)) return { motivo: 'caractere proibido no nome (# ? %) — o site não consegue servir' };
  if (stat.size === 0) return { motivo: 'arquivo vazio' };
  if (stat.size > LIMITE_BYTES) return { motivo: 'acima de 95 MB' };
  return null;
}

function dataISO(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// Lê a pasta e devolve { categorias, avisos }. Lança se a pasta não existir.
function lerPasta(raiz) {
  if (!fs.existsSync(raiz) || !fs.statSync(raiz).isDirectory()) {
    throw new Error(`A pasta "${raiz}" não existe.`);
  }
  const avisos = [];
  const entradas = fs.readdirSync(raiz, { withFileTypes: true });
  const pastas = [];
  for (const e of entradas) {
    if (e.isDirectory()) { if (!e.name.startsWith('.')) pastas.push(e.name); continue; }
    if (e.name === 'LEIA-ME.txt' || e.name.startsWith('.')) continue;
    avisos.push(`"${e.name}": arquivo fora de categoria (coloque dentro de uma subpasta)`);
  }
  const categorias = [];
  for (const pasta of ordemCategorias(pastas)) {
    const dir = path.join(raiz, pasta);
    const materiais = [];
    for (const nome of fs.readdirSync(dir)) {
      const stat = fs.statSync(path.join(dir, nome));
      const ign = motivoIgnorar(nome, stat);
      if (ign) { if (!ign.silencioso) avisos.push(`"${pasta}/${nome}": ${ign.motivo}`); continue; }
      materiais.push({
        titulo: titulo(nome),
        arquivo: `${PASTA_PADRAO}/${pasta}/${nome}`.normalize('NFC'),
        tipo: tipo(nome),
        tamanho: stat.size,
        atualizadoEm: dataISO(stat.mtimeMs),
      });
    }
    if (materiais.length === 0) { avisos.push(`"${pasta}": categoria vazia, não vai para o site`); continue; }
    materiais.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
    categorias.push({ id: idCategoria(pasta), nome: nomeCategoria(pasta), materiais });
  }
  return { categorias, avisos };
}
```

Observação: `arquivo` usa sempre `MATERIAIS PUBLICADOS/` como prefixo (o caminho no site), mesmo quando o script lê outra pasta via `--pasta` — o `--pasta` existe para teste, e o site só conhece a pasta padrão.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test publicar.test.js`
Expected: `# pass 9`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add publicar.js publicar.test.js
git commit -m "publicar.js: leitura da pasta, ignorados e avisos"
```

---

### Task 3: `publicar.js` — gravar o JSON só se mudou, relatório, linha de comando

**Files:**
- Modify: `publicar.js`
- Test: `publicar.test.js`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `publicar.test.js`:

```js
test('gerar: grava o JSON, relata o que entrou/saiu/mudou, e não regrava sem mudança', () => {
  const raiz = pastaTemporaria({ 'RH E SERVIDOR/a.pdf': 'abc', 'RH E SERVIDOR/b.pdf': 'abc' });
  const saida = path.join(raiz, 'materiais.json');

  const r1 = P.gerar(raiz, saida);
  assert.equal(r1.gravou, true);
  assert.deepEqual(r1.entraram.map((m) => m.titulo), ['a', 'b']);
  const json1 = JSON.parse(fs.readFileSync(saida, 'utf8'));
  assert.equal(json1.categorias.length, 1);
  assert.match(json1.geradoEm, /^\d{4}-\d{2}-\d{2}T/);

  const r2 = P.gerar(raiz, saida);
  assert.equal(r2.gravou, false);
  assert.deepEqual(r2.entraram, []);
  assert.equal(fs.readFileSync(saida, 'utf8'), JSON.stringify(json1, null, 2) + '\n');

  fs.unlinkSync(path.join(raiz, 'RH E SERVIDOR/b.pdf'));
  fs.writeFileSync(path.join(raiz, 'RH E SERVIDOR/a.pdf'), 'abcdef');
  const r3 = P.gerar(raiz, saida);
  assert.equal(r3.gravou, true);
  assert.deepEqual(r3.sairam.map((m) => m.titulo), ['b']);
  assert.deepEqual(r3.mudaram.map((m) => m.titulo), ['a']);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test publicar.test.js`
Expected: falha com `P.gerar is not a function`.

- [ ] **Step 3: Implementar `gerar` e a linha de comando**

Inserir em `publicar.js` antes do `module.exports`; acrescentar `gerar` ao export; e o bloco `if (require.main === module)` depois do export:

```js
function lerJsonAnterior(saida) {
  try { return JSON.parse(fs.readFileSync(saida, 'utf8')); } catch { return null; }
}

function porArquivo(categorias) {
  const m = new Map();
  for (const c of categorias || []) for (const x of c.materiais) m.set(x.arquivo, x);
  return m;
}

// Lê a pasta, compara com o JSON anterior e grava só se as categorias mudaram.
function gerar(raiz, saida) {
  const { categorias, avisos } = lerPasta(raiz);
  const anterior = lerJsonAnterior(saida);
  const antes = porArquivo(anterior && anterior.categorias);
  const agora = porArquivo(categorias);

  const entraram = [], sairam = [], mudaram = [];
  for (const [arq, m] of agora) {
    const a = antes.get(arq);
    if (!a) entraram.push(m);
    else if (a.tamanho !== m.tamanho || a.atualizadoEm !== m.atualizadoEm) mudaram.push(m);
  }
  for (const [arq, m] of antes) if (!agora.has(arq)) sairam.push(m);

  const mudou = !anterior || JSON.stringify(anterior.categorias) !== JSON.stringify(categorias);
  if (mudou) {
    const json = { geradoEm: new Date().toISOString(), categorias };
    fs.writeFileSync(saida, JSON.stringify(json, null, 2) + '\n');
  }
  return { gravou: mudou, categorias, avisos, entraram, sairam, mudaram };
}

module.exports = { titulo, tipo, idCategoria, nomeCategoria, ordemCategorias, lerPasta, gerar, PASTA_PADRAO, SAIDA_PADRAO, LIMITE_BYTES };

if (require.main === module) {
  const arg = (nome, padrao) => {
    const a = process.argv.find((x) => x.startsWith(`--${nome}=`));
    return a ? a.slice(nome.length + 3).replace(/^"|"$/g, '') : padrao;
  };
  const raiz = path.resolve(__dirname, arg('pasta', PASTA_PADRAO));
  const saida = path.resolve(__dirname, arg('saida', SAIDA_PADRAO));
  let r;
  try { r = gerar(raiz, saida); }
  catch (e) { console.error(`ERRO: ${e.message}`); process.exit(1); }

  const total = r.categorias.reduce((n, c) => n + c.materiais.length, 0);
  console.log(`${r.categorias.length} categoria(s), ${total} material(is).`);
  for (const c of r.categorias) console.log(`  ${c.nome}: ${c.materiais.length}`);
  const lista = (rotulo, xs) => { if (xs.length) { console.log(`\n${rotulo}:`); for (const m of xs) console.log(`  + ${m.arquivo}`); } };
  lista('Entraram', r.entraram);
  lista('Mudaram', r.mudaram);
  lista('Saíram', r.sairam);
  if (r.avisos.length) { console.log('\nAvisos:'); for (const a of r.avisos) console.log(`  ! ${a}`); }
  console.log(r.gravou ? `\n${path.basename(saida)} gravado.` : `\nNada mudou; ${path.basename(saida)} mantido.`);
}
```

- [ ] **Step 4: Rodar e ver passar; rodar o script de verdade**

Run: `node --test publicar.test.js`
Expected: `# pass 10`, `# fail 0`.

Run: `node publicar.js`
Expected (pasta ainda vazia):
```
0 categoria(s), 0 material(is).

Avisos:
  ! "FORMULARIOS ASSISTENCIAIS": categoria vazia, não vai para o site
  ! "OFICIOS E MEMORANDOS": categoria vazia, não vai para o site
  ! "RH E SERVIDOR": categoria vazia, não vai para o site

materiais.json gravado.
```
(a ordem dos avisos segue a ordem do mapa: RH, Ofícios, Formulários.)

- [ ] **Step 5: `package.json` mínimo e commit**

```json
{
  "name": "central-documentos",
  "private": true,
  "description": "Central de Documentos da SMS de São Mateus do Sul — site estático no GitHub Pages",
  "scripts": { "publicar": "node publicar.js", "test": "node --test" }
}
```

```bash
git add publicar.js publicar.test.js package.json materiais.json
git commit -m "publicar.js: gera materiais.json, relatório e linha de comando"
```

---

### Task 4: Identidade visual — copiar do Guia Saúde e desenhar o ícone

**Files:**
- Create: `logo-central.svg`, `manifest.webmanifest`, `.nojekyll`, `CNAME`
- Copy from `../GuiaSaude/`: `logo-prefeitura.png`, `logo-sms.png`, `icone-192.png`, `icone-512.png`, `apple-touch-icon.png`, `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `fontes/archivo-latin.woff2`, `fontes/sourcesans3-latin.woff2`

- [ ] **Step 1: Copiar os arquivos**

```bash
cd "C:/Users/paulo/OneDrive/Desktop/.claude apps/CentralDocumentos"
mkdir -p fontes
for f in logo-prefeitura.png logo-sms.png icone-192.png icone-512.png apple-touch-icon.png favicon.ico favicon-16.png favicon-32.png; do cp "../GuiaSaude/$f" .; done
cp ../GuiaSaude/fontes/*.woff2 fontes/
touch .nojekyll
printf 'central.saudesaomateusdosul.com.br\n' > CNAME
```

- [ ] **Step 2: Criar `logo-central.svg`** (pasta com seta para baixo, verde e azul do logotipo)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#0e8c4a"/>
  <path d="M12 20a4 4 0 0 1 4-4h11l4 4h17a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#ffffff"/>
  <path d="M12 28h40v18a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#e8f2eb"/>
  <path d="M32 31v13M26 38l6 6 6-6" fill="none" stroke="#1a5fa8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 3: Criar `manifest.webmanifest`** (caminhos relativos: o Meu Uber já quebrou com absolutos)

```json
{
  "name": "Central de Documentos — SMS São Mateus do Sul",
  "short_name": "Central",
  "description": "Modelos, fichas e formulários da Secretaria de Saúde, para baixar.",
  "lang": "pt-BR",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f4f6f3",
  "theme_color": "#0e8c4a",
  "icons": [
    { "src": "icone-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icone-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Identidade visual, manifest, CNAME e .nojekyll"
```

---

### Task 5: `index.html`

**Files:**
- Create: `index.html`

- [ ] **Step 1: Escrever a página**

```html
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Modelos, fichas e formulários da Secretaria Municipal da Saúde de São Mateus do Sul, para baixar: memorando, solicitação de férias, formulários assistenciais.">
<meta name="theme-color" content="#0e8c4a">
<link rel="icon" href="favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/svg+xml" href="logo-central.svg">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="manifest.webmanifest">
<meta property="og:type" content="website">
<meta property="og:title" content="Central de Documentos — SMS São Mateus do Sul">
<meta property="og:description" content="Modelos, fichas e formulários da Secretaria de Saúde. Toque para baixar.">
<meta property="og:image" content="https://central.saudesaomateusdosul.com.br/logo-sms.png">
<meta property="og:url" content="https://central.saudesaomateusdosul.com.br/">
<meta property="og:locale" content="pt_BR">
<title>Central de Documentos</title>
<style>
/* Fontes locais, como no Guia Saúde: nos postos com sinal ruim, buscar no Google custava duas
   conexões antes de o texto assentar. Subconjunto latino, licença SIL OFL. */
@font-face{font-family:'Archivo';font-style:normal;font-weight:600 700;font-stretch:100%;
  font-display:swap;src:url(fontes/archivo-latin.woff2) format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2122,U+2191,U+2193,U+2212,U+FEFF,U+FFFD}
@font-face{font-family:'Source Sans 3';font-style:normal;font-weight:400 600;
  font-display:swap;src:url(fontes/sourcesans3-latin.woff2) format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2122,U+2191,U+2193,U+2212,U+FEFF,U+FFFD}

/* Cores do logotipo da Secretaria (verde do "SAÚDE", azul do "SECRETARIA DE"), iguais ao Guia Saúde. */
:root{
  color-scheme:light dark;
  --verde:#0e8c4a; --verde-forte:#0a6e3a; --azul:#1a5fa8;
  --bg:#f4f6f3; --ink:#16211c; --muted:#5b6a62; --line:#dde2dc; --card:#ffffff;
  --chip:#e8f2eb; --chip-ink:#0a6e3a; --sombra:0 1px 2px rgba(20,40,30,.06),0 8px 24px rgba(20,40,30,.06);
  --word:#2b579a; --excel:#217346; --powerpoint:#d24726; --pdf:#c62828; --imagem:#6a1b9a; --outro:#5b6a62;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --verde:#5cc98d; --verde-forte:#7ad6a3; --azul:#7fb2ea;
  --bg:#101512; --ink:#e9efea; --muted:#93a29a; --line:#27322c; --card:#182019;
  --chip:#16301f; --chip-ink:#7ad6a3; --sombra:none;
}}
:root[data-theme="dark"]{
  --verde:#5cc98d; --verde-forte:#7ad6a3; --azul:#7fb2ea;
  --bg:#101512; --ink:#e9efea; --muted:#93a29a; --line:#27322c; --card:#182019;
  --chip:#16301f; --chip-ink:#7ad6a3; --sombra:none;
}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);margin:0;padding:0;
  font:17px/1.55 "Source Sans 3","Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:860px;margin:0 auto;padding:28px 16px 64px}

.marca{display:inline-flex;align-items:center;flex-wrap:wrap;gap:10px 24px;line-height:0;margin-bottom:22px}
.marca img{height:clamp(40px,8.6vw,56px);width:auto;display:block}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .marca{background:#fff;padding:12px 16px;border-radius:14px}}
:root[data-theme="dark"] .marca{background:#fff;padding:12px 16px;border-radius:14px}

h1{font-family:Archivo,"Segoe UI",system-ui,sans-serif;font-weight:700;font-size:clamp(34px,7vw,50px);
  line-height:1.02;letter-spacing:-.025em;margin:0 0 10px}
h1 span{color:var(--verde)}
.linha{width:64px;height:4px;background:var(--verde);border-radius:2px;margin:16px 0 14px}
.chamada{font-size:clamp(17px,2.2vw,19px);color:var(--muted);max-width:56ch;margin:0 0 20px}

/* A busca fica grudada no topo ao rolar: com dezenas de arquivos, é o que evita voltar lá em cima. */
.busca{position:sticky;top:0;z-index:2;background:var(--bg);padding:8px 0 12px}
.busca label{position:absolute;left:-9999px}
.busca input{width:100%;font:inherit;font-size:18px;color:var(--ink);background:var(--card);
  border:1.5px solid var(--line);border-radius:14px;padding:14px 16px 14px 46px;outline:none;
  box-shadow:var(--sombra);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235b6a62' stroke-width='2.2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.5-3.5'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:15px center;background-size:20px}
.busca input:focus{border-color:var(--verde)}

.chips{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 8px}
.chips a{display:inline-flex;align-items:center;min-height:36px;background:var(--chip);color:var(--chip-ink);
  font-weight:600;font-size:14.5px;text-decoration:none;padding:4px 14px;border-radius:999px;
  border:1px solid transparent}
.chips a:hover,.chips a:focus-visible{border-color:var(--verde)}
.chips small{font-weight:400;margin-left:6px;opacity:.8}

h2{font-family:Archivo,"Segoe UI",system-ui,sans-serif;font-weight:600;font-size:13px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:28px 0 10px;scroll-margin-top:84px}
h2 small{letter-spacing:0;text-transform:none;font-weight:400;margin-left:8px}

.lista{display:flex;flex-direction:column;gap:8px;list-style:none;margin:0;padding:0}
/* Uma linha por arquivo, 56 px no mínimo: o alvo de toque no celular. A linha inteira é o link. */
.item{display:flex;align-items:center;gap:12px;min-height:56px;background:var(--card);
  border:1px solid var(--line);border-radius:14px;padding:10px 12px 10px 12px;text-decoration:none;
  color:inherit;box-shadow:var(--sombra);transition:border-color .14s ease}
.item:hover,.item:focus-visible{border-color:var(--verde)}
.item:focus-visible{outline:3px solid var(--verde);outline-offset:3px}
.icone{width:40px;height:40px;flex:0 0 auto;border-radius:10px;display:grid;place-items:center;
  color:#fff;font-family:Archivo,"Segoe UI",system-ui,sans-serif;font-weight:700;font-size:12px;letter-spacing:.02em}
.icone.word{background:var(--word)}.icone.excel{background:var(--excel)}.icone.powerpoint{background:var(--powerpoint)}
.icone.pdf{background:var(--pdf)}.icone.imagem{background:var(--imagem)}.icone.outro{background:var(--outro)}
.texto{flex:1;min-width:0}
.titulo{font-weight:600;font-size:17px;line-height:1.3;overflow-wrap:anywhere}
.meta{font-size:13.5px;color:var(--muted);margin-top:2px}
.baixar{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;background:var(--verde);color:#fff;
  font-weight:700;font-size:14.5px;padding:9px 14px;border-radius:999px}
.baixar svg{width:16px;height:16px}
@media (max-width:420px){.baixar span{display:none}.baixar{padding:9px 11px}}

.vazio,.erro{background:var(--card);border:1px dashed var(--line);border-radius:14px;padding:18px;color:var(--muted);margin-top:16px}
.erro{border-style:solid;border-color:#e0a0a0;color:#8a2a2a}
[hidden]{display:none!important}

footer{margin-top:52px;padding-top:22px;border-top:1px solid var(--line);color:var(--muted);font-size:14.5px}
footer b{color:var(--ink)}
.zap{display:inline-flex;align-items:center;gap:8px;margin-top:10px;background:var(--chip);
  color:var(--chip-ink);font-weight:600;font-size:15px;text-decoration:none;
  padding:8px 14px;border-radius:999px;border:1px solid transparent}
.zap:hover,.zap:focus-visible{border-color:var(--verde)}
.zap svg{width:17px;height:17px;flex:0 0 auto}
.atalho{margin-top:26px;padding:16px 18px;background:var(--card);border:1px solid var(--line);border-radius:14px;max-width:62ch}
.atalho b{display:block;font-family:Archivo,"Segoe UI",system-ui,sans-serif;font-size:16px;color:var(--ink);margin-bottom:6px}
.atalho p{margin:6px 0 0;font-size:14.5px;line-height:1.5}
.atalho span{color:var(--chip-ink);font-weight:600}
</style>
</head>
<body>
<main>
  <span class="marca">
    <img src="logo-prefeitura.png" alt="Prefeitura de São Mateus do Sul" width="345" height="100">
    <img src="logo-sms.png" alt="Secretaria de Saúde — São Mateus do Sul" width="673" height="202">
  </span>

  <h1>Central de <span>Documentos</span></h1>
  <div class="linha"></div>
  <p class="chamada">Modelos, fichas e formulários da Secretaria de Saúde, num lugar só. Toque em <b>Baixar</b> e o arquivo vai para o seu celular ou computador.</p>

  <div class="busca">
    <label for="q">Buscar documento pelo nome</label>
    <input id="q" type="search" placeholder="Buscar pelo nome: férias, memorando…" autocomplete="off" hidden>
  </div>

  <nav class="chips" id="chips" aria-label="Categorias"></nav>
  <div id="conteudo" aria-live="polite"></div>
  <noscript><p class="erro">Esta página precisa de JavaScript para mostrar a lista. Abra no Chrome, no Safari ou no Edge.</p></noscript>

  <footer>
    <b>Secretaria Municipal da Saúde de São Mateus do Sul — Paraná.</b><br>
    <span id="atualizado"></span>
    Para incluir ou corrigir um documento, fale com a coordenação da Atenção Primária.<br>
    <a class="zap" href="https://wa.me/5542988724354" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      WhatsApp (42) 98872-4354
    </a>
    <div class="atalho">
      <b>Coloque na tela do seu celular</b>
      <p><span>No Android:</span> abra esta página no Chrome, toque nos três pontinhos do canto e escolha <b style="display:inline;font-size:inherit">Adicionar à tela inicial</b>.</p>
      <p><span>No iPhone:</span> abra no Safari, toque no quadradinho com a seta para cima e escolha <b style="display:inline;font-size:inherit">Adicionar à Tela de Início</b>.</p>
    </div>
  </footer>
</main>

<script>
(function () {
  'use strict';
  var ROTULO = { word: 'Word', excel: 'Excel', powerpoint: 'PowerPoint', pdf: 'PDF', imagem: 'Imagem', outro: 'Arquivo' };
  var SIGLA = { word: 'W', excel: 'X', powerpoint: 'P', pdf: 'PDF', imagem: 'IMG', outro: '…' };
  var $ = function (id) { return document.getElementById(id); };
  var conteudo = $('conteudo'), chips = $('chips'), campo = $('q'), atualizado = $('atualizado');
  var dados = null;

  function normalizar(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function tamanho(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  }
  function dataBR(iso) { // AAAA-MM-DD → DD/MM/AAAA
    var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0];
  }
  function el(tag, attrs, filhos) {
    var e = document.createElement(tag);
    for (var k in attrs) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    (filhos || []).forEach(function (f) { e.appendChild(f); });
    return e;
  }
  function svgSeta() {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2.6'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M12 4v12M6 11l6 6 6-6M5 20h14'); s.appendChild(p); return s;
  }

  function item(m) {
    var a = el('a', { class: 'item', href: encodeURI(m.arquivo), download: '' });
    a.appendChild(el('span', { class: 'icone ' + m.tipo, text: SIGLA[m.tipo] || '…', 'aria-hidden': 'true' }));
    a.appendChild(el('span', { class: 'texto' }, [
      el('span', { class: 'titulo', text: m.titulo }),
      el('span', { class: 'meta', text: (ROTULO[m.tipo] || 'Arquivo') + ' · ' + tamanho(m.tamanho) + ' · ' + dataBR(m.atualizadoEm) })
    ]));
    var b = el('span', { class: 'baixar' }, [svgSeta(), el('span', { text: 'Baixar' })]);
    a.appendChild(b);
    return a;
  }

  function render(filtro) {
    conteudo.textContent = '';
    var q = normalizar(filtro || '').trim();
    var total = 0;
    dados.categorias.forEach(function (c) {
      var lista = c.materiais.filter(function (m) { return !q || normalizar(m.titulo).indexOf(q) !== -1; });
      if (!lista.length) return;
      total += lista.length;
      var sec = el('section', { id: c.id });
      sec.appendChild(el('h2', { text: c.nome }, [el('small', { text: lista.length === 1 ? '1 documento' : lista.length + ' documentos' })]));
      var ul = el('ul', { class: 'lista' });
      lista.forEach(function (m) { ul.appendChild(el('li', {}, [item(m)])); });
      sec.appendChild(ul);
      conteudo.appendChild(sec);
    });
    if (!total) {
      conteudo.appendChild(el('p', { class: 'vazio', text: q
        ? 'Nada com esse nome. Fale com a coordenação da APS se precisar de um documento que não está aqui.'
        : 'Ainda não há documentos publicados.' }));
    }
  }

  function renderChips() {
    chips.textContent = '';
    dados.categorias.forEach(function (c) {
      chips.appendChild(el('a', { href: '#' + c.id, text: c.nome }, [el('small', { text: String(c.materiais.length) })]));
    });
  }

  function carregar() {
    fetch('materiais.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (json) {
        dados = json;
        if (dados.categorias.length) { campo.hidden = false; renderChips(); }
        render('');
        if (json.geradoEm) atualizado.textContent = 'Lista atualizada em ' + dataBR(json.geradoEm.slice(0, 10)) + '. ';
        if (location.hash) { var alvo = document.getElementById(location.hash.slice(1)); if (alvo) alvo.scrollIntoView(); }
      })
      .catch(function () {
        conteudo.textContent = '';
        conteudo.appendChild(el('p', { class: 'erro', text: 'Não deu para carregar a lista. Tente de novo em instantes.' }));
      });
  }

  campo.addEventListener('input', function () { render(campo.value); });
  carregar();
})();
</script>
</body>
</html>
```

- [ ] **Step 2: Conferir no navegador com um JSON de exemplo**

Criar `materiais.exemplo.json` (não commitado) e servir a pasta com `npx serve` ou abrir via preview; testar: busca "feria" acha "Ficha de solicitação de férias"; busca "zzz" mostra a mensagem; JSON vazio (`{"geradoEm":"…","categorias":[]}`) mostra "Ainda não há documentos publicados." e esconde o campo; largura 375 px sem rolagem horizontal; tema escuro.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Página da Central de Documentos"
```

---

### Task 6: Repositório no GitHub e Pages

- [ ] **Step 1: Criar o repositório público e enviar**

```bash
cd "C:/Users/paulo/OneDrive/Desktop/.claude apps/CentralDocumentos"
gh repo create paulosgp/central-documentos --public --source=. --remote=origin --description "Central de Documentos da SMS de São Mateus do Sul" --push
```

- [ ] **Step 2: Ligar o Pages na raiz da `master`**

```bash
gh api -X POST repos/paulosgp/central-documentos/pages -f "source[branch]=master" -f "source[path]=/"
```
Expected: JSON com `"status":"building"` ou similar. Se o `CNAME` estiver no repositório, o Pages já lê o domínio dele.

- [ ] **Step 3: Conferir o endereço provisório**

Run: `curl -sI https://paulosgp.github.io/central-documentos/ | head -1` (repetir após 1–2 min)
Expected: `HTTP/2 200` — ou `301` para o domínio personalizado, se o Pages já aplicou o `CNAME` (nesse caso o provisório deixa de servir a página e só o domínio responde, depois do DNS).

Atenção: com `CNAME` no repositório, o GitHub **redireciona** `paulosgp.github.io/central-documentos` para o domínio personalizado. Enquanto o DNS não existir, o redirecionamento leva a lugar nenhum. Por isso o `CNAME` só entra no repositório **na Task 9**, depois de o DNS publicar — na Task 4 o arquivo é criado, mas este passo o remove do commit: `git rm --cached CNAME` e adicionar `CNAME` ao `.gitignore` temporariamente, ou simplesmente não criar o arquivo até a Task 9. **Decisão: não criar o `CNAME` na Task 4; criar na Task 9.**

---

### Task 7: `CLAUDE.md` do app, `CLAUDE.md` raiz, `PREFIX_MAP`

**Files:**
- Create: `CLAUDE.md`
- Modify: `../CLAUDE.md` (bullet novo em "Infraestrutura compartilhada" e linha na tabela de repositórios)
- Modify: `../.claude/scripts/sync-apps-monorepo.js:19-29` (`PREFIX_MAP`)

- [ ] **Step 1: `CLAUDE.md` do app** — seções: o que é e o que não é; a pasta `MATERIAIS PUBLICADOS` e as regras; como publicar (`node publicar.js`, conferir o relatório, commit, push); decisões (pasta dentro do app e por quê; sem cópia; nomes com acento na URL; `.nojekyll`; sem service worker; busca só por título); hospedagem e DNS; infraestrutura compartilhada apontando para `../CLAUDE.md`.

- [ ] **Step 2: `../CLAUDE.md`** — bullet "**Central de Documentos** (desde 21/09/2026)" na lista de infraestrutura, no mesmo estilo dos outros; linha `Central de Documentos | paulosgp/central-documentos | Público (Pages)...` na tabela de repositórios; acrescentar à lista "Onde essa regra também está documentada".

- [ ] **Step 3: `PREFIX_MAP`** — acrescentar `CentralDocumentos: 'CentralDocumentos',` depois de `Encaminha`.

- [ ] **Step 4: Commit e push do app** (num único comando, com `cd` explícito, para o hook do monorepo agir)

```bash
cd "C:/Users/paulo/OneDrive/Desktop/.claude apps/CentralDocumentos" && git add -A && git commit -m "CLAUDE.md da Central de Documentos" && git push origin master
```

---

### Task 8: Cartão no Guia Saúde

**Files:**
- Modify: `../GuiaSaude/index.html` (seção "Documentos", depois do cartão Protocolos Institucionais)
- Create: `../GuiaSaude/logo-central.svg` (cópia do `logo-central.svg` do app)

- [ ] **Step 1: Inserir o cartão**

```html
    <a class="app" href="https://central.saudesaomateusdosul.com.br" target="_blank" rel="noopener">
      <div class="topo">
        <img src="logo-central.svg" alt="" width="34" height="34">
        <span class="nome">Central de Documentos</span>
        <svg class="seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>
      </div>
      <p class="oque">Modelos de memorando, ficha de solicitação de férias, formulários assistenciais e outros materiais da Secretaria, para baixar.</p>
      <span class="quem">Toda a equipe</span>
      <span class="end">central.saudesaomateusdosul.com.br</span>
    </a>
```

Enquanto o DNS não publicar, o `href` e o `.end` apontam para `https://paulosgp.github.io/central-documentos/` e são trocados na Task 9. A seção "Documentos" passa a ter dois cartões: o `.duplas` (1/3 e 2/3) continua funcionando, mas conferir no navegador se os dois cartões cabem; se ficar apertado, mudar `.duplas` para `1fr 1fr`. Atualizar o `CLAUDE.md` do Guia Saúde (seção "Documentos") com o cartão novo e a razão.

- [ ] **Step 2: Commit e push**

```bash
cd "C:/Users/paulo/OneDrive/Desktop/.claude apps/GuiaSaude" && git add -A && git commit -m "Cartão da Central de Documentos" && git push origin master
```

---

### Task 9: DNS, `CNAME` e HTTPS

- [ ] **Step 1: CNAME no Registro.br** — zona `saudesaomateusdosul.com.br`, registro `CNAME` `central` → `paulosgp.github.io.`. Pelo Chrome com o Paulo logado (Claude in Chrome), como foi feito para o Encaminha; se não houver sessão, pedir a ele.

- [ ] **Step 2: Conferir no DNS, não no painel**

Run: `nslookup central.saudesaomateusdosul.com.br 8.8.8.8`
Expected: `canonical name = paulosgp.github.io`.

- [ ] **Step 3: Só então o `CNAME` no repositório**

```bash
cd "C:/Users/paulo/OneDrive/Desktop/.claude apps/CentralDocumentos" && printf 'central.saudesaomateusdosul.com.br\n' > CNAME && git add CNAME && git commit -m "Domínio central.saudesaomateusdosul.com.br" && git push origin master
```

- [ ] **Step 4: HTTPS pela API** (roteiro do Guia Saúde)

Run: `gh api repos/paulosgp/central-documentos/pages --jq '.https_certificate.state'`
- ausente → `gh api -X PUT repos/paulosgp/central-documentos/pages -f cname=` e depois `-f cname=central.saudesaomateusdosul.com.br`
- `authorization_pending` → esperar
- `approved` → `gh api -X PUT repos/paulosgp/central-documentos/pages -F https_enforced=true`

- [ ] **Step 5: Trocar o link do cartão no Guia Saúde para o definitivo, commit e push.**

---

## Auto-revisão

- Cobertura da spec: §1 pasta e regras → Tasks 2; §2 script → Tasks 1–3; §3 página → Task 5; §4 hospedagem → Tasks 4, 6, 9; §5 Guia Saúde → Task 8; `PREFIX_MAP` e CLAUDE.md → Task 7.
- Divergência resolvida: o `CNAME` não entra na Task 4 (o Pages redirecionaria o provisório para um domínio que ainda não resolve); entra na Task 9.
- Colisão de nomes (spec §2, item 3): não implementada — dois arquivos com o mesmo nome não coexistem na mesma pasta do Windows, então não há o que detectar. Registrar no `CLAUDE.md` do app.
