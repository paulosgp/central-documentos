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

// Monta uma pasta temporária a partir de um objeto { 'CATEGORIA/arquivo.ext': 'conteúdo' }.
// Valor null cria uma subpasta.
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
