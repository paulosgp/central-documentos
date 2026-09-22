# Central de Documentos — desenho (21/09/2026)

Acervo dos documentos e materiais úteis da Secretaria Municipal de Saúde de São Mateus do
Sul (modelo de memorando, ficha de solicitação de férias, formulários assistenciais…), num
endereço público onde qualquer profissional abre e baixa. Pedido do Paulo em 21/09/2026.

## Decisões tomadas com o Paulo

| Pergunta | Resposta |
|---|---|
| Quem publica | Só o Paulo. Ele coloca o arquivo numa pasta e pede ao Claude para publicar. |
| Acesso | Público, sem senha. Só modelos em branco e materiais sem dado de paciente ou de servidor. |
| Onde mora | App novo, só para isso. Não entra no Documentos Institucionais (que é busca dentro de protocolos assinados, uso diferente). |
| Categorias iniciais | RH e servidor · Ofícios e memorandos · Formulários assistenciais. |
| Formato entregue | O arquivo original: Word fica Word, PDF fica PDF. Sem conversão. |
| Arquitetura | Site estático no GitHub Pages, gerado desta máquina (opção A). |
| Nome | **Central de Documentos**, em `central.saudesaomateusdosul.com.br`. |
| Guia Saúde | Ganha um cartão na seção "Documentos" (aprovado junto com o desenho). |

Descartados: Next.js na Vercel (servidor sem necessidade, e exige importar no painel) e Supabase
Storage com upload (banco, login e RLS para um app sem nada sensível).

## 1. A pasta `MATERIAIS PUBLICADOS`

`.claude apps\CentralDocumentos\MATERIAIS PUBLICADOS`, **dentro do próprio app**, criada em
21/09/2026 com as três subpastas e um `LEIA-ME.txt` que repete as regras abaixo para quem abrir a
pasta sem este desenho. A primeira versão do desenho a punha em `ESF\MATERIAIS PUBLICADOS`; o
Paulo não quis nada disso dentro da `ESF` e escolheu, entre "solta na raiz da `.claude apps`" e
"dentro do app", a segunda.

Consequência que simplifica tudo: **a pasta é o próprio conteúdo publicado.** Ela vai para o
repositório como está, e o GitHub Pages serve os arquivos dela diretamente. Não há cópia para
`arquivos/`, não há remoção de órfãos, não há slug: apagar da pasta e publicar já tira do site.

Regras (a fonte da verdade é a pasta, o site é ela):

- Cada subpasta de primeiro nível é uma **categoria**. Pasta nova = categoria nova, sem mexer
  em código.
- O **nome do arquivo sem extensão é o título** exibido. Acento e espaço são permitidos.
- Arquivo apagado da pasta some do site na próxima publicação. Arquivo substituído (mesmo nome)
  passa a ser o entregue.
- Ignorados, com aviso no relatório da publicação: `LEIA-ME.txt`; arquivos começando com `_`,
  `.` ou `~$` (temporários do Office); subpastas dentro de uma categoria; arquivos acima de 95 MB
  (limite do GitHub é 100 MB); arquivos de 0 bytes. O `.gitkeep` que segura cada categoria
  vazia no Git cai na regra do `.`, em silêncio (sem aviso: é esperado).
- Nome de exibição das categorias conhecidas vem de um mapa fixo no script (`RH E SERVIDOR` →
  "RH e servidor", `OFICIOS E MEMORANDOS` → "Ofícios e memorandos", `FORMULARIOS ASSISTENCIAIS`
  → "Formulários assistenciais"), na **ordem** desse mapa. Categoria fora do mapa entra depois,
  em ordem alfabética, com o nome da pasta como está.

A pasta `ESF\MATERIAIS UTEIS`, que já existia, **não tem relação**: é um depósito de material da
6ª Regional (517 MB, com fotos, vídeo e zips), sem curadoria.

## 2. Publicação — `publicar.js`

Script Node **sem dependências** na raiz do repositório. Ele só **gera a lista**
(`materiais.json`) a partir da pasta; os arquivos ficam onde estão. Passos:

1. Falha alto se `MATERIAIS PUBLICADOS` não existir.
2. Lista as categorias e, em cada uma, os arquivos válidos.
3. Para cada arquivo, calcula: `titulo` (nome sem extensão, espaços colapsados), `arquivo`
   (caminho relativo à raiz do site, com o nome original: `MATERIAIS PUBLICADOS/RH E
   SERVIDOR/Ficha de solicitação de férias.docx` — a página aplica `encodeURI` ao montar o
   link), `tipo` (`word`, `excel`, `powerpoint`, `pdf`, `imagem`, `outro`, pela extensão),
   `tamanho` (bytes), `atualizadoEm` (data de modificação, `AAAA-MM-DD`). O `id` da categoria é
   um slug do nome da pasta (sem acento, hífens, ASCII), usado só como âncora `#rh-e-servidor`.
   Dois arquivos que diferem só por maiúscula/acento na mesma categoria é erro (o script para e
   diz quais): o Windows os trata como iguais e o servidor não.
4. Escreve `materiais.json`, só se mudou (o commit fica limpo):
   ```json
   { "geradoEm": "2026-09-21T23:40:00.000Z",
     "categorias": [ { "id": "rh-e-servidor", "nome": "RH e servidor",
       "materiais": [ { "titulo": "Ficha de solicitação de férias",
         "arquivo": "MATERIAIS PUBLICADOS/RH E SERVIDOR/Ficha de solicitação de férias.docx",
         "tipo": "word", "tamanho": 45210, "atualizadoEm": "2026-09-21" } ] } ] }
   ```
5. Imprime o relatório: o que entrou, saiu ou mudou em relação ao `materiais.json` anterior, e o
   que foi ignorado (com o motivo). Categoria vazia é listada como aviso e **não** vai ao JSON.

Nomes de arquivo com acento vão para o Git e para a URL como estão. O Windows grava em NFC e o
Git guarda os bytes que recebe, então o `encodeURI` da página bate com o que o servidor tem.
O script rejeita nome com caractere que o GitHub Pages não serve (`#`, `?`, `%`) e avisa.

O script **não** faz commit nem push: o Claude confere o relatório e faz os dois, como no
Documentos Institucionais (`npm run indexar` lá também para antes do commit). Comando:
`node publicar.js` (aceita `--pasta="outra pasta"` para testes).

Testes: `node --test` sobre `publicar.test.js`, usando pasta temporária — descoberta de
categorias e ordem, título e id (acento, espaço, maiúscula, extensão), tipo por extensão,
arquivos ignorados, colisão de nomes, caracteres proibidos, mapa de nomes, categoria vazia.

## 3. O site — `index.html`

HTML único, sem framework nem build, no padrão do Guia Saúde (fontes locais, cores do logotipo
da SMS, tema claro e escuro). Carrega `materiais.json` por `fetch` com `cache: "no-store"` e
renderiza:

- **Cabeçalho**: logotipos da Prefeitura e da SMS (copiados do Guia Saúde), "Central de
  Documentos", uma linha dizendo o que é ("Modelos, fichas e formulários da Secretaria de Saúde.
  Toque para baixar.").
- **Busca**: um campo no topo, filtra por título ignorando acento e maiúscula, ao digitar.
  Categoria sem resultado some; sem nenhum resultado, mensagem "Nada com esse nome. Fale com a
  coordenação da APS se precisar de um documento que não está aqui."
- **Categorias**: uma seção por categoria (`<h2>` com o nome e a contagem), na ordem do JSON.
  Chips no topo levam à seção (`#rh-e-servidor`), e o link com a âncora pode ser mandado no
  WhatsApp abrindo direto na categoria.
- **Material**: uma linha por arquivo: ícone do tipo (Word azul, Excel verde, PowerPoint
  laranja, PDF vermelho, genérico cinza — SVG inline, sem imagem externa), título, linha menor
  com "Word · 45 KB · 21/09/2026", e botão **Baixar** (`<a href="<encodeURI(arquivo)>"
  download>`: o atributo faz o navegador salvar em vez de abrir, e o nome já é o original). A
  linha inteira tem 56 px de altura mínima: alvo de toque para celular.
- **Rodapé**: "Atualizado em <geradoEm>" e "Para incluir um documento, fale com a coordenação da
  APS."
- **Falhas**: se o `fetch` falhar, a página mostra "Não deu para carregar a lista. Tente de
  novo." em vez de ficar em branco. JSON vazio mostra "Ainda não há documentos publicados."
- **PWA mínimo**: `manifest.webmanifest` com `start_url: "./"` e ícones com caminho
  **relativo** (o Meu Uber já ensinou: caminho absoluto quebra em `paulosgp.github.io/<repo>`).
  Sem service worker — não há motivo para funcionar off-line, e um SW guardaria arquivo velho.
- Metatags `og:` com o endereço definitivo, para a prévia no WhatsApp.

Sem JavaScript o `<noscript>` diz para abrir num navegador com JavaScript; não vale a pena gerar
o HTML da lista no script só para isso.

## 4. Repositório e hospedagem

- Pasta local: `.claude apps\CentralDocumentos`. Repositório **público** `paulosgp/central-documentos`,
  branch `master`, GitHub Pages servindo a raiz. Público porque o Pages de conta free só serve
  repositório público, e o conteúdo é público por decisão.
- Conteúdo versionado: `index.html`, `materiais.json`, `MATERIAIS PUBLICADOS/`, `publicar.js`,
  `publicar.test.js`, `manifest.webmanifest`, ícones e logotipos, `CNAME`, `CLAUDE.md`,
  `docs/`. A pasta de materiais **fica no repositório**: é o que o Pages serve. Um `.nojekyll`
  na raiz, para o Pages servir a pasta como está (sem ele, o Jekyll ignora nomes que começam com
  `_` e pode mexer no restante).
- Endereço provisório imediato: `paulosgp.github.io/central-documentos`. Definitivo:
  `central.saudesaomateusdosul.com.br`, com um `CNAME` `central` → `paulosgp.github.io.` na
  zona do Registro.br (criado pelo Chrome com o Paulo logado, como o do Encaminha). Conferir
  publicação por `nslookup` em 8.8.8.8, não no painel; depois `Enforce HTTPS` pela API
  (`gh api … /pages`), seguindo o roteiro do `CLAUDE.md` do Guia Saúde.
- Entra no `PREFIX_MAP` do hook de sincronização do monorepo (`CentralDocumentos` →
  `CentralDocumentos`), como o Encaminha.

## 5. Guia Saúde

Cartão novo na seção "Documentos", rótulo "Toda a equipe", ícone próprio (`logo-central.svg`,
pasta com seta para baixo, nas cores do logotipo), apontando para o endereço definitivo. Enquanto
o DNS não publicar, o cartão aponta para o provisório e é trocado depois, como foi com o
Encaminha.

## 6. O que fica de fora, de propósito

- Busca dentro do conteúdo dos arquivos (é o Documentos Institucionais).
- Upload pela tela, login, contagem de downloads, versões anteriores.
- Conversão de Word para PDF.
- Descrição por arquivo além do título. Se fizer falta, o caminho é um `descricoes.json` na
  pasta de origem — não uma tela.

## 7. Ordem de construção

1. `publicar.js` + testes, rodando sobre `MATERIAIS PUBLICADOS` (vazia hoje) e sobre uma pasta
   de exemplo para ver o JSON sair certo.
2. `index.html` + manifest + ícones; conferido no navegador em largura de celular, com JSON de
   exemplo e com JSON vazio.
3. Repositório no GitHub, Pages ligado, endereço provisório respondendo.
4. `CLAUDE.md` do app, linha no `CLAUDE.md` raiz, `PREFIX_MAP` do hook.
5. Cartão no Guia Saúde.
6. DNS e HTTPS.
