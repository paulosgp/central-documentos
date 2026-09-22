#!/usr/bin/env node
'use strict';
// Gera materiais.json a partir da pasta MATERIAIS PUBLICADOS. Sem dependências.
// Uso: node publicar.js [--pasta="outra pasta"] [--saida=materiais.json]
// Não faz commit nem push: conferir o relatório, depois commit + push.
const fs = require('node:fs');
const path = require('node:path');

const PASTA_PADRAO = 'MATERIAIS PUBLICADOS';
const SAIDA_PADRAO = 'materiais.json';
const LIMITE_BYTES = 95 * 1024 * 1024; // o GitHub recusa arquivo acima de 100 MB

// Nome bonito e ORDEM das categorias conhecidas. Pasta fora daqui entra depois, alfabética,
// com o nome da pasta como está — categoria nova não exige mexer aqui.
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
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function titulo(nomeArquivo) {
  const ext = path.extname(nomeArquivo);
  return nomeArquivo.slice(0, nomeArquivo.length - ext.length).replace(/\s+/g, ' ').trim();
}

function tipo(nomeArquivo) {
  const ext = path.extname(nomeArquivo).slice(1).toLowerCase();
  return TIPOS[ext] || 'outro';
}

// Só para a âncora (#rh-e-servidor); o caminho do arquivo NÃO passa por aqui.
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

// Devolve o motivo de ignorar o arquivo, ou null. 'silencioso' = esperado, não vale aviso.
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
  const pastas = [];
  for (const e of fs.readdirSync(raiz, { withFileTypes: true })) {
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
        // Caminho no SITE, com o nome original. Sempre com a pasta padrão como prefixo, mesmo
        // lendo outra pasta via --pasta (isso é só para teste; o site só conhece a padrão).
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

function lerJsonAnterior(saida) {
  try { return JSON.parse(fs.readFileSync(saida, 'utf8')); } catch { return null; }
}

function porArquivo(categorias) {
  const m = new Map();
  for (const c of categorias || []) for (const x of c.materiais) m.set(x.arquivo, x);
  return m;
}

// Lê a pasta, compara com o JSON anterior e grava só se as categorias mudaram
// (o geradoEm não conta: senão todo `node publicar.js` sujaria o commit).
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
