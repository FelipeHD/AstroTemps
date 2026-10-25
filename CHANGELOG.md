# AstroTemps v1.3.6 — 25/10/2026

## Atualização de produção

- Zoom pelos ícones e roda do mouse nos previews de Curves, RangeSelection, HDR, NBN e StarStretch.
- RangeSelection, HDR e StarStretch com parâmetros à esquerda e Preview integrado à direita.
- Lighthouse: Apply → Skip Lighthouse → Apply & Continue, sem botão Cancel.
- Seleção de todas as etapas, rolagem vertical, altura inicial e monitor do PixInsight.
- Open New Image, interface não modal experimental e controles internos de minimizar/restaurar.
- Removido o rótulo TESTE R3; Redux com versão sincronizada, sem alterações funcionais.
- Testes automatizados e integridade do pacote verificados; validação nativa não executada neste ambiente.

## Histórico da preparação

# Lista de atualizações — AstroTemps

### Histórico de testes — TESTE R3

- Narrowband Normalization usa o mesmo preview do Masks: botões de zoom, roda do mouse e arraste.
- Lighthouse: Apply, Skip Lighthouse, Apply & Continue; botão Cancel removido do painel integrado.
- StarStretch e NB to RGB Stars: parâmetros à esquerda, centralizados verticalmente, e preview integrado à direita, com zoom do Masks.
- Mantidas resolução de cálculo da prévia, execução completa e alterações anteriores.
- Testes automatizados simulados; validação visual nativa no PixInsight pendente.

### Histórico de testes — entrega consolidada TESTE R2

- Reconstituída a entrega a partir da versão AbrirImagem_InterfaceLivre, reaplicando somente o cabeçalho compacto e removendo o rótulo lateral.
- Conferidos botão Open New Image, seleção automática da imagem e chamada de abertura não modal no arquivo final. Esses recursos também constavam no TXT anterior; causa do comportamento relatado ainda não reproduzida no PixInsight.
- Barra de título identifica TESTE R2 para diferenciar o arquivo em execução.


### Histórico de testes — cabeçalho compacto

- Removido o texto AstroTemps Full da faixa interna superior.
- Ícones de minimizar/restaurar reduzidos para 20 px lógicos, alinhados à direita, com espaçamento de 2 px.
- Reduzido o espaço entre a faixa e o conteúdo. Controles continuam internos, abaixo da barra de título nativa.


### Histórico de testes — abrir imagem e interface não modal (experimental)

- Open New Image em Settings abre o seletor de imagens do PixInsight, mostra o arquivo e seleciona sua primeira imagem como alvo. Cancelamento mantém o alvo anterior.
- Interface principal exibida com show e ciclo de eventos que aceita entrada do usuário, em vez de execute modal. Recursos do PixInsight precisam ser verificados no ambiente real; não há garantia de execução simultânea de outros scripts/processos.
- Lista de imagens atualizada quando imagens são abertas, fechadas ou renomeadas externamente.
- Ícones de minimizar para barra compacta e restaurar no cabeçalho interno. A minimização é interna ao AstroTemps, não para a barra de tarefas do Windows.
- Execução inicia após encerrar a interface; fechar, idioma e reset mantêm o fluxo de configurações.
- Testes simulados de abertura/cancelamento/erro, término não modal, limpeza após exceção e restauração de geometria passaram, juntamente com as regressões anteriores.
- Validação nativa no PixInsight pendente, inclusive foco/monitor, ferramentas externas e minimização.


### Histórico de testes — posicionamento no monitor do PixInsight

- Removido posicionamento manual anterior à exibição do diálogo principal.
- Posicionamento inicial delegado ao PixInsight; altura e centralização ajustadas após a exibição, usando o monitor do diálogo já posicionado.
- Temporizador cancelado se o diálogo for ocultado antes do ajuste; ajuste inicial executado uma única vez.
- Validação em ambiente real com múltiplos monitores pendente.


### Histórico de testes — altura inicial e direção da rolagem

- Full inicia ocupando a altura disponível da tela, reservando 40 px para a moldura/título da janela. Removido o limite anterior de 820 px.
- Corrigido o sentido da rodinha na rolagem principal: cima sobe, baixo desce.
- Mantidos rodapé fixo, zoom dos previews e demais alterações.


### Histórico de testes — rolagem da interface principal

- Conteúdo do Full em área com barra de rolagem vertical; Executar, Fechar e Validar ficam no rodapé fixo.
- Altura inicial limitada à área disponível da tela, com margem para bordas do sistema.
- Expansão das etapas recalcula a rolagem, sem aumentar a janela além da tela.
- Ajustes anteriores de RangeSelection, HDR, zoom e seleção em lote preservados.
- Testes automatizados passaram; validação de layout no PixInsight pendente.


### Histórico de testes — alinhamento vertical de parâmetros

- RangeSelection e HDR: espaços flexíveis iguais acima e abaixo dos parâmetros centralizam verticalmente o conjunto na coluna esquerda.
- Preview à direita e controles anteriores preservados.


### Histórico de testes — RangeSelection e HDR integrados

- Parâmetros à esquerda e Preview à direita em uma janela redimensionável para cada processo.
- RangeSelection mostra a máscara reduzida; HDR mostra a imagem processada com a máscara vinculada.
- Botões +/−, rodinha centrada no cursor e arraste reutilizam o controle de Masks and Curves.
- Enquadramento preservado ao recalcular. Prévias temporárias deixam de ser posicionadas em janelas externas.
- Limpeza ao fechar e proteção contra recálculos simultâneos.
- Mantidas seleção de todas as etapas e melhorias anteriores de zoom.
- Testes automatizados com controles simulados; validação visual e nativa no PixInsight pendente.


### Histórico de testes — seleção de etapas do Full

- Adicionados botões Selecionar todas e Desmarcar todas acima das 15 etapas.
- Sincronização dos checkboxes internos e dos cabeçalhos.
- Preservação de parâmetros e ordem; dependência de geração de estrelas aplicada ao selecionar Star Stretch.
- Zoom anterior mantido, com funcionamento confirmado pelo usuário no PixInsight.
- Seleção em lote: validação visual no PixInsight pendente.

### Histórico de testes — 2026-10-23

Base: development@66b997b6c9815dd1d9a16b55476bf1cbecc22b78 (v1.3.5).
Implementação isolada em feature/curves-preview-zoom; ainda não integra a distribuição.

### Preview de CurvesTransformation
- Ícones de Zoom In e Zoom Out no cabeçalho.
- Zoom pela rodinha centrado no cursor; botões usam o centro do Preview.
- Passos de ampliação de 25%, limitados a 12,5%–400% da prévia reduzida.
- Arraste com botão esquerdo limitado à imagem e sincronizado com as barras de rolagem.
- Zoom e deslocamento preservados ao recalcular curvas.
- Bitmap reutilizado durante o arraste.

### Validação
- Teste Node de ponto de referência, rodinha, arraste, limites, resize, atualização e limpeza passou.
- Os quatro scripts Python existentes passaram, incluindo geração local de pacote.
- Artefatos temporários de pacote removidos/restaurados; nada publicado.
- Pendente: teste visual no PixInsight (Windows), incluindo direção física da rodinha, ícones, redimensionamento, atualização de curvas e troca de máscaras.

O zoom amplia a prévia reduzida existente; não acrescenta resolução nem altera pixels da imagem de trabalho.
