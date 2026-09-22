# CLAUDE.md — Central de Documentos

Os documentos e materiais úteis da Secretaria Municipal da Saúde de São Mateus do Sul (modelo
de memorando, ficha de ponto manual, solicitação de férias, formulários assistenciais…), num
endereço público onde qualquer profissional abre e **baixa**. Pedido do Paulo em 21/09/2026;
o desenho está em `docs/superpowers/specs/2026-09-21-central-de-documentos-design.md` e o plano
em `docs/superpowers/plans/2026-09-21-central-de-documentos.md`.

Endereço definitivo: **`central.saudesaomateusdosul.com.br`**. Provisório (sempre funciona):
`paulosgp.github.io/central-documentos`. Repositório público `paulosgp/central-documentos`,
branch `master`, GitHub Pages servindo a raiz.

## Infraestrutura compartilhada

**Lembrete permanente:** depois de qualquer mudança de comportamento, arquitetura ou fluxo
neste app, atualize este `CLAUDE.md` (e o da raiz, se for infraestrutura compartilhada) sem
esperar ser pedido — regra completa em `../CLAUDE.md`.

Este app **não tem banco, não tem login e não tem dado sensível** — as regras de RLS e LGPD da
pasta raiz não o alcançam. O que se aplica de lá: manter este arquivo atualizado, e o hook do
monorepo espelho (`CentralDocumentos` está no `PREFIX_MAP`; pushes devem ser feitos como
`cd "<pasta>" && git push` num único comando Bash).

## O que é, e o que deliberadamente NÃO é

**É** uma pasta na internet. Categorias, busca por nome, botão Baixar. Nada mais.

**Não é o Documentos Institucionais.** Aquele busca *dentro* dos protocolos, POPs e regimentos
assinados e responde "em qual documento e página está a resposta". Este entrega arquivos para a
pessoa preencher ou usar. O Paulo escolheu app novo, e não uma aba lá, justamente para não
misturar "consultar protocolo" com "baixar formulário".

**Não tem upload pela tela, login, contagem de downloads nem versões anteriores.** Quem publica
é só o Paulo, pela pasta (abaixo). Oferecidas e descartadas em 21/09/2026: Next.js na Vercel
(servidor sem necessidade, e exigiria importar no painel) e Supabase Storage com upload (banco,
login e RLS para um app sem nada sensível).

**Não converte Word em PDF.** O profissional baixa o arquivo como o Paulo colocou: Word fica
Word (editável), PDF fica PDF.

**Não usa a API da Anthropic, nem nenhuma chave.** Custo zero.

## A pasta `MATERIAIS PUBLICADOS` é o site

Fica **dentro do app** (`CentralDocumentos/MATERIAIS PUBLICADOS`), e vai para o repositório como
está: o GitHub Pages serve os arquivos dela diretamente. A primeira versão do desenho a punha
em `ESF\MATERIAIS PUBLICADOS`; o Paulo não quis nada disso na `ESF` e, entre "solta na raiz da
`.claude apps`" e "dentro do app", escolheu a segunda. Isso **eliminou** a etapa de cópia: não
há `arquivos/`, não há remoção de órfãos, não há slug de nome. Apagou da pasta e publicou,
sumiu do ar.

Regras (também no `LEIA-ME.txt` da pasta, para quem a abrir sem este arquivo):

- **Subpasta de primeiro nível = categoria.** Pasta nova = categoria nova, sem mexer em código.
  As três conhecidas têm nome bonito e ordem fixos no `NOMES` do `publicar.js`
  (`RH E SERVIDOR` → "RH e servidor", `OFICIOS E MEMORANDOS` → "Ofícios e memorandos",
  `FORMULARIOS ASSISTENCIAIS` → "Formulários assistenciais"); pasta fora do mapa entra depois,
  em ordem alfabética, com o nome da pasta como está.
- **Nome do arquivo sem extensão = título** exibido. Acento e espaço podem.
- **Ignorados**: `LEIA-ME.txt` e arquivos começando com `.` (em silêncio: são esperados — o
  `.gitkeep` segura cada categoria vazia no Git); arquivos começando com `_` ou `~$`
  (temporários do Office), subpastas dentro de categoria, arquivos vazios, acima de 95 MB
  (o GitHub recusa 100 MB) ou com `#`, `?` ou `%` no nome (o servidor não os serve) — todos
  **com aviso** no relatório, para nada sumir calado.
- **Categoria vazia** não vai ao JSON (e vira aviso).
- **O site é público, sem senha.** Só modelo em branco, ficha, orientação. Nada com dado de
  paciente ou de servidor.

A pasta `ESF\MATERIAIS UTEIS` não tem relação: é um depósito de material da 6ª Regional
(517 MB, fotos, vídeo, zips), sem curadoria.

## Como publicar

```bash
node publicar.js
```

Lê a pasta, grava `materiais.json` **só se a lista mudou** (o `geradoEm` não conta, senão todo
`node publicar.js` sujaria o commit) e imprime: quantos por categoria, o que **entrou / mudou /
saiu** em relação ao JSON anterior, e os **avisos**. Conferir o relatório — é a única validação
— e então:

```bash
cd "C:/Users/paulo/OneDrive/Desktop/.claude apps/CentralDocumentos" && git add -A && git commit -m "Materiais: <o que mudou>" && git push origin master
```

O Pages publica em um ou dois minutos. O script **não** faz commit nem push de propósito, como
o `npm run indexar` do Documentos Institucionais. Testes: `node --test` (10 testes, pasta
temporária; cobrem título, tipo, id, ordem, ignorados, categoria vazia, pasta inexistente e o
relatório de entrou/saiu/mudou). `--pasta="outra"` lê outra pasta para teste, mas o campo
`arquivo` do JSON sempre leva o prefixo `MATERIAIS PUBLICADOS/` — o site só conhece a pasta
padrão.

## Decisões de construção que não se veem no código

- **Nome de arquivo com acento vai para o Git e para a URL como está.** O Windows grava em
  NFC, o Git guarda os bytes que recebe, o `publicar.js` normaliza o caminho para NFC e a
  página aplica `encodeURI` ao montar o link. Um caminho como
  `MATERIAIS%20PUBLICADOS/RH%20E%20SERVIDOR/Ficha%20de%20f%C3%A9rias.docx` é feio mas correto,
  e ninguém compartilha o link do arquivo — compartilha a página (ou a categoria, por âncora).
- **`.nojekyll` na raiz.** Sem ele, o Jekyll do Pages ignora nomes que começam com `_` e pode
  processar o restante.
- **`<a download>` na linha inteira.** O atributo faz o navegador salvar em vez de tentar abrir
  o `.docx` (funciona porque o arquivo é do mesmo domínio). Linha com 56 px no mínimo: alvo de
  toque no celular; abaixo de 420 px o botão Baixar vira só o ícone.
- **Busca só por título**, sem acento e sem maiúscula, no navegador. Busca dentro do conteúdo é
  o Documentos Institucionais.
- **Sem service worker.** Não há motivo para funcionar off-line, e um SW guardaria arquivo
  velho depois de uma substituição. O `manifest.webmanifest` existe só para "adicionar à tela
  inicial", com `start_url: "./"` e ícones em caminho **relativo** (o Meu Uber já quebrou com
  caminho absoluto em `paulosgp.github.io/<repo>`).
- **`fetch('materiais.json', { cache: 'no-store' })`.** O Pages cacheia por 10 minutos de
  qualquer jeito; o `no-store` evita o cache do próprio navegador ficar com a lista velha por
  dias.
- **Identidade visual copiada do Guia Saúde**: fontes locais (subconjunto latino, SIL OFL),
  cores do logotipo da SMS, os mesmos logotipos e ícones PNG (o brasão da Secretaria). Só o
  `logo-central.svg` (pasta com seta para baixo, verde e azul do logotipo) é deste app; o
  mesmo arquivo é o ícone do cartão no Guia Saúde.
- **Colisão de nomes** (spec §2, item 3) não foi implementada: dois arquivos com o mesmo nome
  não coexistem na mesma pasta do Windows, então não há o que detectar.
- **O `CNAME` só entrou no repositório depois de o DNS publicar.** Com `CNAME` presente, o
  GitHub redireciona `paulosgp.github.io/central-documentos` para o domínio personalizado — e
  enquanto o DNS não existe, o redirecionamento leva a lugar nenhum. Roteiro de DNS e HTTPS
  (conferir no `nslookup`, nunca no painel; `https_certificate` pela API; `Enforce HTTPS` é um
  passo à parte) no `CLAUDE.md` do Guia Saúde, seção "A troca de endereço".

## Servidor local para conferir

`preview_start` com o nome `central-documentos` (`.claude apps/.claude/launch.json` →
`.claude/serve-central.js`, porta 4174). É um servidor estático só para o Claude olhar a página;
não faz parte do site.

## Pendências (22/09/2026)

1. **DNS**: criar o `CNAME` `central` → `paulosgp.github.io.` na zona de
   `saudesaomateusdosul.com.br`, no Registro.br. O Claude abriu o painel no Chrome do Paulo, mas
   a sessão estava deslogada e senha é coisa que só ele digita. Assim que ele entrar, o Claude
   cria o registro pelo Chrome (como fez para o Encaminha em 21/09/2026).
2. Depois que `nslookup central.saudesaomateusdosul.com.br 8.8.8.8` responder: `CNAME` no
   repositório, `https_certificate` pela API, `Enforce HTTPS`, e trocar o link do cartão no Guia
   Saúde do provisório para o definitivo (roteiro completo no `CLAUDE.md` do Guia Saúde).
3. A pasta tem só os dois arquivos que o Paulo colocou em RH; as outras duas categorias estão
   vazias e por isso não aparecem no site. Ele vai preenchendo; publicar é `node publicar.js` +
   commit + push.
