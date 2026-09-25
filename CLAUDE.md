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
  `FORMULARIOS ASSISTENCIAIS` → "Formulários assistenciais", e desde 22/09/2026 as duas que o
  Paulo criou: `ESTRATIFICAÇÕES DE RISCO` → "Estratificações de risco", `ANEXOS ADMINISTRATIVO`
  → "Anexos administrativos", e desde 25/09/2026 `INDICADORES APS` → "Indicadores da APS (fichas
  técnicas do Ministério)" e `CONDUTAS CLINICAS` → "Condutas clínicas"; também em 25/09,
  `OFICIOS E MEMORANDOS` passou a aparecer como "Ofícios, memorandos e atas", quando entrou a ata); pasta fora do mapa entra depois, em ordem alfabética, com o nome
  da pasta como está — o que, para pasta em maiúsculas, fica gritado ("ANEXOS ADMINISTRATIVO" foi
  assim na primeira publicação); quando ele criar pasta nova, acrescentar ao mapa.
- **Nome do arquivo sem extensão = título** exibido. Acento e espaço podem.
- **Arquivo solto na raiz não vai ao site** (vira aviso "fora de categoria"). **E isso virou um
  jeito de trabalhar, não um erro** (25/09/2026): o Paulo põe na raiz o que não sabe onde
  encaixar e pede ao Claude para organizar. Então, a cada publicação com arquivo solto: ler o
  conteúdo (`pdftotext -l 1`, ou o `word/document.xml` do .docx), propor a categoria de cada um
  pelo que o documento É, e não pelo nome, mover, e só então publicar. Foi assim com os 11 de
  25/09 (abaixo). Mostrar os soltos no site numa categoria "Outros" foi considerado e não feito:
  viraria o lugar onde tudo cai e ninguém organiza.
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

## Nada pessoal vai ao ar: conferir TODO arquivo antes de publicar (regra do Paulo, 25/09/2026)

O site é público e o repositório também. O Paulo pediu duas vezes no mesmo dia, para os arquivos que
ia pondo na pasta: *"se tiver alguma informação sensível nos documentos, apague"*. Vale como regra
permanente: **a cada publicação, antes do `node publicar.js`, ler o conteúdo de todo arquivo novo ou
alterado** e limpar o que for dado pessoal. Não é zelo teórico: dos 36 arquivos de 25/09, **quatro
vieram preenchidos com gente de verdade**:

| Arquivo | O que tinha |
|---|---|
| Estratificação de saúde mental (.xls) | **Uma paciente do CAPS**: nome completo, profissional, data e os 12 sintomas marcados, com escore 42 ("médio risco"). Dado de saúde mental: o pior caso da LGPD. Chegou nesse dia e não chegou a ir ao ar. |
| AVS e Relatório de viagem (.docx) | Os dados do próprio Paulo: **CPF, matrícula, conta bancária** e a viagem de 10/09 a União da Vitória. Saem assim das skills `preencher-avs` e `preencher-relatorio-viagem`, que já vêm com os dados dele. Também não chegaram a ir ao ar. |
| Anexo II, Termo de indicação de gestor e fiscal (.docx) | Duas servidoras com **nome e matrícula**, o e-mail de uma delas e um contrato específico. **Este estava no ar desde 22/09.** |

Além disso, quase todo `.docx` e `.xls` trazia nos **metadados** o nome de quem criou e de quem salvou
por último (servidoras do RH e do planejamento), que qualquer um vê em "Propriedades do arquivo".

**Como limpar sem estragar o modelo** (tudo pelo Word e pelo Excel desta máquina, via COM no
PowerShell, porque mexer no XML à mão quebra formatação):
- **Texto preenchido** vira linha em branco (`______`) por *Localizar e substituir* do próprio Word,
  que acha o texto mesmo partido em vários trechos de formatação. O valor da tabela oficial (diária
  de R$ 42,00, R$ 210,00) fica: é tabela, não dado de ninguém.
- **Planilha preenchida**: limpar as células de entrada e **voltar as respostas ao padrão do
  modelo**. Na de saúde mental, o padrão é "N" em tudo, e isso se descobre olhando as outras abas,
  que estavam em branco. Cuidado com célula mesclada: `MergeArea.ClearContents()`, senão o Excel
  recusa.
- **Metadados**: `RemoveDocumentInformation(4)` e `(8)` (dados pessoais e propriedades) no Word e no
  Excel. Não usar `(99)`, "tudo", que também mexe em revisões e comentários.
- **PDF**: `pdftotext` lê o texto; campos de formulário preenchidos só aparecem pelo pdf.js
  (`getAnnotations`, com `fieldValue`). PDF que é só desenho, sem texto (feito por "Imprimir como
  PDF"), precisa ser **olhado**: renderizar a página com o motor de PDF do Windows
  (`Windows.Data.Pdf` pelo PowerShell) e ver a imagem. O painel de navegador do Claude baixa PDF em
  vez de mostrar, e com o painel oculto o pdf.js nem desenha.
- **Arquivo `.xls` antigo**: o texto extraído do binário é lixo; ler célula por célula pelo Excel, em
  modo somente leitura, e só então decidir.
- **Depois de limpar, reler tudo** procurando os nomes e números achados: um resto nos metadados
  (a escala ainda tinha o nome do Paulo no "último a salvar") só apareceu na segunda passada.

**O que continua no histórico do Git.** Tirar o arquivo ou limpar o texto não apaga as versões já
enviadas: o repositório é público, e a versão do Termo com as duas servidoras está nos commits de
22/09 a 25/09. Apagar de lá exige reescrever o histórico e forçar o envio (`git filter-repo` +
`push --force`), o que é irreversível e mexe no espelho `paulosgp/apps`. **Não foi feito sem o
Paulo decidir.** Por isso a conferência tem de vir ANTES da primeira publicação, não depois.

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
- **Pré-visualização (22/09/2026).** O Paulo perguntou se dava para ver o arquivo antes de
  imprimir — e, na primeira versão (aba nova), corrigiu: *"no próprio site, sem precisar abrir
  uma nova aba"*. O nome do material abre um `<dialog>` sobre a página (tela inteira no celular,
  92% no computador) com um `<iframe>`, o Baixar e o Fechar no topo; o botão Baixar da linha
  continua salvando o original (dois links irmãos na linha; anchor aninhado não existe em HTML).
  Ctrl+clique ainda abre em aba nova, e dentro da janela há um link "abra em outra aba" para
  quando o iframe não carregar.
  **O Baixar da janela fica no rodapé, grande, com o texto "Baixar este documento"**, ao lado de
  um Fechar também com texto: o Paulo apontou que o visualizador da Microsoft não deixa claro
  como baixar — e a primeira versão tinha o Baixar no topo, que no celular herdava a regra da
  lista (abaixo de 420 px o rótulo some) e virava um círculo verde sem palavra. Ao fechar, o iframe vai para `about:blank` (para de carregar e
  não mostra o documento anterior na próxima abertura). PDF e
  imagem o navegador mostra sozinho. **Word, Excel e PowerPoint vão ao visualizador online do
  Office** (`view.officeapps.live.com/op/embed.aspx?src=<URL absoluta>` — `embed`, e não `view`: é a
  versão feita para iframe, sem a barra do Office), que renderiza com
  fidelidade, no celular, sem instalar nada — e só funciona porque o site é público (o
  visualizador busca o arquivo pela URL; em `localhost` ele não abre, de propósito). Ele
  escolheu isso, e não gerar PDF na publicação com o Word desta máquina (mais robusto, mas a
  publicação passaria a depender do Word e cada material viraria dois arquivos). Se a Microsoft
  desligar o visualizador, o caminho B está no plano: converter com o Word ao publicar. Tipos sem
  pré-visualização (`outro`) baixam pelo nome também. **PDF e imagem vão direto no iframe**: no
  computador o navegador renderiza; em Android o Chrome pode oferecer download em vez de mostrar —
  limitação conhecida, e o link "abra em outra aba" cobre. Hoje não há PDF na pasta.
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
- **O `CNAME` só entrou no repositório depois de o DNS publicar** (22/09/2026, minutos depois do registro no Registro.br; o certificado saiu `approved` sem empurrão e o `https_enforced` foi ligado pela API na sequência). Com `CNAME` presente, o
  GitHub redireciona `paulosgp.github.io/central-documentos` para o domínio personalizado — e
  enquanto o DNS não existe, o redirecionamento leva a lugar nenhum. Roteiro de DNS e HTTPS
  (conferir no `nslookup`, nunca no painel; `https_certificate` pela API; `Enforce HTTPS` é um
  passo à parte) no `CLAUDE.md` do Guia Saúde, seção "A troca de endereço".

## Servidor local para conferir

`preview_start` com o nome `central-documentos` (`.claude apps/.claude/launch.json` →
`.claude/serve-central.js`, porta 4174). É um servidor estático só para o Claude olhar a página;
não faz parte do site.

## Histórico

- **21/09/2026**: desenho, script, página, repositório e Pages; cartão no Guia Saúde apontando
  para o provisório.
- **22/09/2026**: o Paulo entrou no Registro.br e o Claude criou o CNAME `central` →
  `paulosgp.github.io.` pelo Chrome; DNS respondeu em 8.8.8.8 e 1.1.1.1 no primeiro minuto;
  `CNAME` no repositório, certificado `approved`, `https_enforced` ligado; cartão do Guia
  Saúde trocado para o definitivo. Entrou a pré-visualização (acima).
- **25/09/2026**: o Paulo deixou 11 arquivos soltos na raiz, sem saber onde encaixar. Lidos um
  a um: as **sete fichas técnicas de qualificação do Ministério da Saúde** (C1 a C7, os
  indicadores de qualidade do novo financiamento da APS) viraram a categoria nova
  `INDICADORES APS`, com o código na frente do nome ("C1 - Mais acesso…") para ficarem na
  ordem oficial e não na alfabética; **termos de laqueadura e de vasectomia e o relatório mensal
  de oxigênio domiciliar** foram para `FORMULARIOS ASSISTENCIAIS` (a pasta tinha sumido e foi
  recriada); a **requisição de EPI** foi para `RH E SERVIDOR` (é pedida pelo servidor, com nome
  e matrícula). Dois nomes corrigidos: "Relatorio de Oxigenio Mensal (1)" (o "(1)" é sobra de
  download) e "Termo Laqueadura". Ficaram 25 materiais em 5 categorias.
- **25/09/2026 (tarde)**: mais 8 arquivos; cinco estratificações de risco foram para a pasta que
  esperava vazia, e as condutas do citopatológico abriram `CONDUTAS CLINICAS` ("Condutas clínicas").
  O AVS e o relatório de viagem viraram modelos em branco em `RH E SERVIDOR`. A conferência de dado
  pessoal (seção acima) passou a ser regra. Entrou a **Ata de reunião** em `OFICIOS E MEMORANDOS`,
  cuja categoria passou a se chamar "Ofícios, memorandos e atas" (abaixo). Ficaram 34 materiais em
  7 categorias.
- **A Ata de reunião foi feita pelo Claude**, a pedido do Paulo ("um modelo de ATA de reuniões do
  município com espaço para assinaturas"). Parte do `Anexo VI - Memorando.docx`, copiado e com o
  corpo trocado, para herdar sem esforço o cabeçalho com o brasão, o rodapé com o endereço da
  Secretaria, Arial 12 e as margens oficiais (3 cm à esquerda, 2 cm nas demais). Três páginas:
  identificação (data, horário, local, unidade, tipo, quem conduz, quem redige) e pauta; registro,
  deliberações com responsável e prazo, encerramento com o texto formal de ata e as assinaturas de
  quem conduziu e de quem redigiu; e a lista de presença em página própria, 20 linhas, cabeçalho
  repetido se passar de página. Parágrafos de preencher ficaram alinhados à esquerda, e não
  justificados: justificado, cada lacuna `______` abria buracos no meio da linha.

## Pendências

- **A publicação não é automática, e o Paulo esperou que fosse** (22/09/2026: "já coloquei várias
  coisas na pasta e não aparecem no site"). Foi ele quem escolheu, em 21/09, "coloco na pasta e
  mando você publicar" em vez de uma tarefa agendada; se a espera virar incômodo, o caminho é a
  opção 2 daquela pergunta: tarefa no Agendador do Windows rodando `node publicar.js` + commit +
  push (como o backup diário do Planifica Fácil). Primeira publicação com conteúdo em 22/09/2026:
  14 materiais em 3 categorias; `FORMULARIOS ASSISTENCIAIS` e `ESTRATIFICAÇÕES DE RISCO` vazias.
