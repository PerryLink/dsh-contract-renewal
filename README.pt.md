<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-contract-renewal-hero-en-dark.webp">
  <img src="docs/assets/dsh-contract-renewal-hero-en-light.webp" width="100%" alt="Banner do dsh-contract-renewal: uma barra de janela de renovação por contrato do quickstart (largura = renewal_window_days daquele contrato) sobre um eixo de days_left, com as_of 2026-12-01 como linha vertical — DEMO-MSA-2026-001 venceu há 16 dias (janela de 60), DEMO-NDA-2026-002 vence hoje e está na janela, DEMO-SAAS-2026-003 19 dias restantes numa janela de 60, DEMO-LEASE-2026-004 45 dias restantes mas a janela de 30 já passou, então entra em «N dias», DEMO-SUPPORT-2026-005 a 120 dias e apenas contado (later); contagem 1 / 2 / 1 / 1 de samples/quickstart/expected/result.json">
</picture>

# dsh-contract-renewal

**Registra contratos → vê vencidos / janela de renovação / a vencer em N dias numa data → exporta CSV.**

Uma ferramenta de registro de vencimentos de contratos puramente local para o DeepSeek Harness: sete campos por linha, três grupos mutuamente exclusivos e os dias restantes num relance — só aritmética de datas e do registro, sem analisar o texto do contrato, sem lembretes e sem rede.

[Instalar](#instalação-em-três-passos) · [Configuração](#configuração) · [FAQ](#faq) · [简体中文](README.md) · [English](README.en.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

[![License](https://img.shields.io/badge/license-Apache--2.0-3366CC?style=flat-square&labelColor=2B3245)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%E2%89%A50.2.1%20%3C0.4.0-4B67B4?style=flat-square&labelColor=2B3245)](#compatibilidade)
[![npm](https://img.shields.io/npm/v/dsh-contract-renewal?style=flat-square&labelColor=2B3245&color=CB3837)](https://www.npmjs.com/package/dsh-contract-renewal)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-contract-renewal/ci.yml?branch=main&label=CI&style=flat-square&labelColor=2B3245)](https://github.com/PerryLink/dsh-contract-renewal/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%E2%89%A524.9%20%3C25-339933?style=flat-square&labelColor=2B3245)](#compatibilidade)

[![Stars](https://img.shields.io/github/stars/PerryLink/dsh-contract-renewal?style=flat-square&labelColor=2B3245)](https://github.com/PerryLink/dsh-contract-renewal/stargazers)
[![npm downloads](https://img.shields.io/npm/dm/dsh-contract-renewal?style=flat-square&labelColor=2B3245&color=CB3837)](https://www.npmjs.com/package/dsh-contract-renewal)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-contract-renewal?metric=downloads)](https://dshfind.com/plugins/PerryLink/dsh-contract-renewal?ref=badge)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-C71D23?style=flat-square&labelColor=2B3245&logo=gitee)](https://gitee.com/perrylink/dsh-contract-renewal)

```sh
dsh plugin --profile <profile> add dsh-contract-renewal
```

</div>

<sub>Plugin da comunidade, não afiliado à DeepSeek. Repositório canônico: <https://github.com/PerryLink/dsh-contract-renewal> (o Gitee é um espelho); repositórios com o mesmo nome em outras contas não têm relação.</sub>

<sub>Status: alpha / público sintético / partial / not counted / não GA — sem dados de clientes, sem evidência de clientes e sem alegação de disponibilidade em produção.</sub>

## O que é

Em uma frase: mantém um registro local de metadados de contratos (número, contraparte, datas de início e fim, dias da janela de renovação, responsável e valor), projeta-o sobre uma data `as_of` em três grupos — vencidos, na janela de renovação e a vencer em N dias — com os dias restantes, e então exporta CSV.

> Só faz aritmética de datas e do registro. **Não** analisa o texto do contrato, não julga cláusulas, não envia lembretes e não substitui orientação jurídica.

- **Serve**: um time jurídico, de compras ou administrativo com um lote de contratos que precisa de uma visão única de «o que já venceu e o que precisa ser renovado»; uma lista de vencimentos para entregar a um revisor; um CSV local para analisar ou carregar em outro sistema.
- **Não serve**: analisar PDF/Word de contratos (use `dsh-legal-clause`); receber e deduplicar e-mail (use `dsh-legal-intake`); enviar automaticamente e-mails de renovação ou chamar um OA/CLM; um sistema de contratos multi-inquilino com aprovações e permissões por papel; decidir se um contrato deve ser renovado.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-contract-renewal-flow-v5-dark.svg">
  <img src="docs/assets/dsh-contract-renewal-flow-v5-light.svg" width="100%" alt="Estrutura do dsh-contract-renewal: o lado de escrita (contract_ingest) valida os 7 campos de contracts.csv — datas ISO estritas, número único sem diferenciar maiúsculas, janela 0–3650, valor com no máximo duas casas — e acrescenta a $DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl (R1, append-only); o lado de leitura calcula days_left = end_date − as_of em dias UTC e aplica quatro testes exclusivos em ordem: days_left < 0 → expired, 0 ≤ days_left ≤ w (renewal_window_days) → in_renewal_window, w < days_left ≤ N (within_days, 90 por padrão) → expiring_soon, > N → apenas counts.later; duas saídas: contract_upcoming devolve os três grupos mais counts (R0) e contract_report grava as 5 linhas em CSV com sha256 / rows / bytes em exports/ (R1)">
</picture>

## Instalação em três passos

1. **Instale** (escolha um canal):

   ```sh
   # canal npm (recomendado, versões publicadas)
   dsh plugin --profile <profile> add dsh-contract-renewal
   # canal git (main mais recente; equivale a git+https://github.com/PerryLink/dsh-contract-renewal.git)
   dsh plugin --profile <profile> add github:PerryLink/dsh-contract-renewal
   # canal tarball: pnpm pack neste repositório e depois
   dsh plugin --profile <profile> add ./dsh-contract-renewal-<version>.tgz
   ```

2. **Configuração mínima** (não há chaves de Config; o `cordis.patch.yml` insere esta única linha):

   ```yaml
   - insert:
       - id: dsh-contract-renewal
         name: dsh-contract-renewal
   ```

3. **Verifique que monta**:

   ```sh
   dsh --profile <profile> --dump-config | grep dsh-contract-renewal
   node samples/quickstart/run.mjs --check
   ```

**Desinstalar**: `dsh plugin --profile <profile> remove dsh-contract-renewal` (ou remova a linha do patch do perfil).

## Recursos principais

Os nomes das ferramentas são uma API estável; as descrições permanecem em inglês para coincidir com a saída em tempo de execução. Os nomes usam apenas letras ASCII, dígitos e sublinhados, e seguem a validação `^[a-zA-Z0-9_-]+$` do provedor sobre `tools[].name`.

| Ferramenta | Para que serve | Risco |
|---|---|---|
| `contract_ingest` | Registra um contrato em `contracts.jsonl`; códigos estáveis para datas inválidas e duplicatas | R1 local write |
| `contract_upcoming` | Agrupa por `as_of` com `days_left`; padrão hoje (UTC) e 90 dias | R0 |
| `contract_report` | Exporta um CSV com aspas escapadas e devolve caminho, sha256, linhas e bytes | R1 local write |

- **Três grupos exclusivos, uma linha por contrato** — `expired`, `in_renewal_window` e `expiring_soon` (a vencer em N dias mas ainda fora da janela); o restante só é contado em `counts.later`, sem contagem dupla.
- **Registro local somente de adição** — um objeto JSON por linha em `$DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl`; os arquivos de contrato nunca são lidos nem alterados, e uma renovação é registrada com número novo para preservar o histórico.
- **Dias de calendário UTC** — toda data vira número de dia UTC antes da subtração, então o fuso local, o horário de verão e `TZ` não podem deslocar um resultado.
- **Exportação CSV verificável** — aspas RFC 4180 mais `sha256`, contagem de linhas e de bytes; o nome do arquivo deve ser um único componente seguro e caminhos que escapam são rejeitados.
- **Falha fechada** — datas inválidas, duplicatas, janelas fora do intervalo e caminhos inseguros devolvem `<frase humana>（E_CONTRACT_XXX）｜Next: <uma ação>` em vez de falhar em silêncio.

### Limites exatos dos grupos

1. `end_date < as_of` → `expired`, com `days_left` negativo.
2. `0 ≤ days_left ≤ renewal_window_days` → `in_renewal_window`; tanto 0 (vence hoje) quanto o tamanho da janela estão dentro.
3. Fora da janela e `days_left ≤ within_days` → `expiring_soon`; exatamente `within_days` está dentro, `within_days + 1` não.
4. Todo o resto → `later`, contado mas não devolvido.

## Entrada

- Um CSV de registro ou uma chamada a `contract_ingest` por contrato. Cada linha tem sete campos:
  `contract_no` (único), `counterparty`, `start_date`, `end_date` (estrito `YYYY-MM-DD`), `renewal_window_days` (inteiro 0–3650), `owner`, `amount` (não negativo, no máximo duas casas decimais).
- As datas precisam ser datas ISO reais. `2026-02-30`, `2026-13-01` e `2026/12/01` falham com `E_CONTRACT_DATE_INVALID`.
- Os números de contrato são únicos sem diferenciar maiúsculas dentro de um mesmo registro; uma duplicata falha com `E_CONTRACT_DUPLICATE`.
- O registro fica em `$DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl` (um objeto JSON por linha). Os arquivos de contrato nunca são lidos nem alterados.

## Saída

- `contract_ingest`: `{ contract_no, counterparty, start_date, end_date, renewal_window_days, owner, amount, total }`, em que `total` é o número de linhas do registro.
- `contract_upcoming`: `{ as_of, within_days, expired, in_renewal_window, expiring_soon, counts }`; cada item traz `days_left` (negativo = vencido) e `status`.
- `contract_report`: caminho, nome do arquivo, `sha256`, número de linhas, bytes e `as_of`; o CSV é gravado em `$DSH_HOME/storages/dsh-contract-renewal/exports/`.

Os três grupos são **mutuamente exclusivos**: um contrato aparece no máximo uma vez para um dado `as_of`:

| Grupo | Regra | Observação |
|---|---|---|
| `expired` | `days_left < 0` | Sempre listado, por mais antigo que seja o vencimento |
| `in_renewal_window` | `0 ≤ days_left ≤ renewal_window_days` | A janela de renovação tem prioridade sobre o grupo «N dias» |
| `expiring_soon` | fora da janela e `days_left ≤ within_days` | Vence em N dias mas ainda não está na janela |
| não devolvido | todo o resto | Só é contado em `counts.later` |

`as_of` por padrão é **hoje (UTC)**; `within_days` por padrão é 90. Toda a aritmética usa dias de calendário UTC, então o fuso local, o horário de verão e `TZ` não podem deslocar um resultado.

## Exemplo

Copie esta frase:

> Registre estes 5 contratos e, com data de 2026-12-01, mostre quais estão vencidos, quais estão na janela de renovação e quais vencem em 90 dias; depois exporte um CSV.

### Chamadas às ferramentas

```sh
# 1) registre um contrato
#    superfície de ferramentas: contract_ingest({ contract_no: "DEMO-MSA-2026-001",
#                  counterparty: "…", start_date: "2026-01-01", end_date: "2026-11-15",
#                  renewal_window_days: 60, owner: "王敏", amount: 128000 })

# 2) veja uma data
#    superfície de ferramentas: contract_upcoming({ as_of: "2026-12-01", within_days: 90 })

# 3) exporte CSV
#    superfície de ferramentas: contract_report({ as_of: "2026-12-01", filename: "contracts-2026-12-01.csv" })
```

Execute a amostra incluída e confira o arquivo dourado:

```sh
node samples/quickstart/run.mjs --check
```

![Saída real de terminal do quickstart do dsh-contract-renewal](docs/assets/quickstart.png)

A amostra são cinco contratos sintéticos `DEMO-*` com `as_of=2026-12-01` e `within_days=90`:

```text
expired: DEMO-MSA-2026-001 2026-11-15 (-16 days)
window:  DEMO-NDA-2026-002 2026-12-01 (0 days, window 30)
window:  DEMO-SAAS-2026-003 2026-12-20 (19 days, window 60)
soon:    DEMO-LEASE-2026-004 2027-01-15 (45 days, window 30)
later:   DEMO-SUPPORT-2026-005 2027-03-31 (120 days) — só em counts.later
```

`samples/quickstart/expected/result.json` é a saída real de `node samples/quickstart/run.mjs --json`, não escrita à mão; a captura é a saída real de terminal de `--check` (log original em [`docs/assets/quickstart.log`](docs/assets/quickstart.log)).

Duas contrapartes da amostra contêm de propósito uma vírgula e uma aspa — `Northwind "APAC" Ltd.` e um nome de empresa chinês com vírgula embutida — para exercitar os dois escapes de CSV; registrar novamente o primeiro contrato devolve `E_CONTRACT_DUPLICATE`.

## Configuração

Este plugin **não tem chaves de Config**: o `cordis.patch.yml` só insere a linha acima e as três ferramentas ficam disponíveis assim que ele monta. Tudo o que é ajustável está nos parâmetros de chamada:

| Ferramenta | Parâmetro | Obrigatório | Padrão | Significado |
|---|---|---|---|---|
| `contract_ingest` | os sete campos do contrato | sim | — | número, contraparte, datas de início e fim, janela de renovação, responsável, valor |
| `contract_upcoming` | `as_of` | não | hoje (UTC) | data de referência, `YYYY-MM-DD`; passe explicitamente para reproduzir «hoje» |
| `contract_upcoming` | `within_days` | não | `90` | o N de «vence em N dias», inteiro 0–3650 |
| `contract_report` | `as_of` | não | hoje (UTC) | data de referência usada na exportação |
| `contract_report` | `within_days` | não | `90` | o N usado na exportação |
| `contract_report` | `filename` | não | `contracts-<as_of>.csv` | apenas `[A-Za-z0-9._-]`; sem caminhos |

Exemplo de profile patch (sem bloco config, só a linha de identidade):

```yaml
- insert:
    - id: dsh-contract-renewal
      name: dsh-contract-renewal
```

Os testes podem sobrescrever a raiz de escrita local com a variável de ambiente `DSH_CONTRACT_HOME`; o padrão é exatamente `$DSH_HOME/storages/dsh-contract-renewal`.

## FAQ

<details>
<summary>Por que contratos vencidos antigos continuam aparecendo?</summary>

Expor renovações esquecidas é justamente o objetivo do grupo `expired`, então ele não é cortado por `within_days`. Os itens são ordenados por `days_left`, o mais vencido primeiro.

</details>

<details>
<summary>Um contrato pode aparecer ao mesmo tempo em «vence em N dias» e «janela de renovação»?</summary>

Não. Os grupos são mutuamente exclusivos: primeiro vencidos, depois janela de renovação e por último o grupo de N dias. Se `within_days=30` mas um contrato tem janela de 60 dias, ele continua em `in_renewal_window` mesmo com 45 dias restantes.

</details>

<details>
<summary>Um fuso horário pode deslocar uma data em um dia?</summary>

Não. As datas são convertidas em números de dia UTC antes da subtração; não há aritmética de hora local nem de horário de verão. Quando `as_of` é omitido, usa-se o hoje UTC. A suíte de testes roda os mesmos dados com `TZ=UTC`, `America/Los_Angeles` e `Pacific/Kiritimati` e compara a saída byte a byte.

</details>

<details>
<summary>Como atualizo um contrato renovado?</summary>

O registro é somente de adição. Registre um número novo, por exemplo `DEMO-MSA-2026-001-v2`, e mantenha a linha antiga como histórico. Não edite `contracts.jsonl` à mão.

</details>

<details>
<summary>Ele lê o PDF, envia lembretes ou envia algo para fora?</summary>

Não. Só calcula datas e valores do registro: sem analisar o corpo do contrato, sem e-mail nem OA, sem rede e sem chamada de modelo. Para cobertura de cláusulas use `dsh-legal-clause`.

</details>

## Permissões e dados

Leitura: o CSV de registro de contratos indicado pelo usuário (amostra: `samples/quickstart/input/contracts.csv`); nenhum outro diretório, nenhum arquivo de corpo de contrato.  
Escrita: `$DSH_HOME/storages/dsh-contract-renewal/` (`contracts.jsonl` e `exports/*.csv`); os arquivos originais não são tocados.  
Rede: não.  
Sistemas externos: nenhum.

`contract_upcoming` é **R0** (somente leitura); `contract_ingest` e `contract_report` são **R1** (escrita local, restrita ao diretório acima). `DSH_CONTRACT_HOME` sobrescreve a raiz de escrita local para testes; o padrão é exatamente `$DSH_HOME/storages/dsh-contract-renewal`.

## Códigos de erro

| Código | Quando aparece | Próximo passo |
|---|---|---|
| `E_CONTRACT_DATE_INVALID` | uma data não é um `YYYY-MM-DD` real (por exemplo `2026-02-30`, `2026/12/01` ou uma string ISO com hora) | use `YYYY-MM-DD` estrito e uma data que exista |
| `E_CONTRACT_DUPLICATE` | o número já existe no registro (sem diferenciar maiúsculas) | registre um número novo para a renovação (por exemplo `-v2`) e preserve o histórico |
| `E_CONTRACT_DATE_RANGE` | a data de fim é anterior à de início | verifique se `start_date` / `end_date` estão trocadas |
| `E_CONTRACT_WINDOW_INVALID` | a janela de renovação ou o limite de N dias não é um inteiro 0–3650 | passe um inteiro 0–3650, por exemplo `renewal_window_days: 60` |
| `E_CONTRACT_AMOUNT_INVALID` | o valor é negativo, tem mais de duas casas decimais ou passa de 1e12 | use um número simples com no máximo duas casas; escreva `0` se não houver |
| `E_CONTRACT_FIELD_REQUIRED` / `E_CONTRACT_FIELD_INVALID` | um campo obrigatório está vazio, ou um nome tem quebras de linha/tabulações ou é longo demais | preencha o campo; contraparte ≤200 caracteres, responsável ≤120 |
| `E_CONTRACT_NO_INVALID` | o número não começa com letra/dígito ou contém outros caracteres (máx. 64) | reescreva-o, por exemplo `DEMO-MSA-2026-001` |
| `E_CONTRACT_STORE_FAILED` | o registro não pode ser lido ou gravado | verifique se `$DSH_HOME/storages/dsh-contract-renewal` é gravável |
| `E_CONTRACT_EXPORT_FAILED` / `E_CONTRACT_PATH_INVALID` / `E_CONTRACT_PATH_NOT_ALLOWED` | a gravação do CSV falhou, o nome não é seguro ou o caminho escapa do diretório de exportação | passe apenas `[A-Za-z0-9._-]` como `filename` |

Formato do erro: `<frase humana>（E_CONTRACT_XXX）｜Next: <uma ação>`. O diagnóstico completo está em [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Evidência de aceitação

Os fixtures públicos/sintéticos ficam em `samples/quickstart/`; o `ACCEPTANCE.csv` registra as verificações (tudo, exceto a linha do quickstart, é `counted=false`).

| req_id | metric | threshold | actual | pass | source | counted |
|---|---|---|---|---|---|---|
| CR-A03 | upcoming groups | 1 expired / 2 window / 1 soon / 1 later | 1/2/1/1 | true | public/synthetic | false |
| CR-A04 | window boundary days_left | -16\|0/30 | -16\|0/30 | true | public/synthetic | false |
| CR-A07 | CSV quoting | comma+quote escaped | escaped | true | public/synthetic | false |
| CR-QS01 | quickstart golden | 1/1 | 1 | true | synthetic/quickstart | true |

*Linhas de aceitação respaldadas por fixtures, não uma execução de cliente; nenhuma saída é inventada.*

## Limites e limitações conhecidas

- Só registro e aritmética de datas; sem analisar o corpo do contrato, sem revisão de cláusulas nem julgamento jurídico.
- Sem aviso automático de renovação; sem e-mail, OA, CLM, assinatura eletrônica ou sistema externo.
- JSONL somente de adição: não há atualização nem exclusão no local. Registre um número novo para uma renovação.
- A unicidade não diferencia maiúsculas (`toUpperCase()`); acrescente um sufixo se a sua numeração diferenciar.
- A validação do valor é não negativo, ≤ 2 casas decimais e ≤ 1e12; sem câmbio, impostos ou conversão de moeda.
- As datas ficam limitadas aos anos 1000–9999; as janelas e `within_days` são inteiros 0–3650.
- O CSV é apenas RFC 4180; prefixos de fórmula não são removidos. Não abra CSV de origem desconhecida no Excel.
- Apenas amostras públicas/sintéticas; alpha/partial, not counted, não é uma alegação de GA ou de produção.

## Compatibilidade

| Dimensão | Status |
|---|---|
| Harness | `dsh >=0.2.1-rc.3 <0.4.0` |
| Node | `>=24.9.0 <25` |
| Plataformas | Todas; apenas arquivos locais |
| Dados | Sem rede, sem chamada de modelo, sem upload |

Versão atual `0.2.0`, 24 testes passando (`node --test test/*.test.mjs`).

## Ecossistema e qualidade

- [Espelho no Gitee](https://gitee.com/perrylink/dsh-contract-renewal) (espelho sincronizado; o GitHub é o canônico)
- [Página do plugin no dshfind](https://dshfind.com/plugins/PerryLink/dsh-contract-renewal) (instalações e ranking)
- **Canal da loja 1024**: rode `npm i -g dsh1024` e depois `dsh1024 plugin --profile <profile> add dsh-contract-renewal` (conta para o ranking de instalações do [deepseek1024.com](https://deepseek1024.com))
- [Guia de campo do ecossistema](https://perrylink.github.io/dsh-plugin-guide/): guia de desenvolvimento de plugins · dados de seleção medidos · critérios de manutenção

## Projetos relacionados

- [dsh-legal-intake](https://github.com/PerryLink/dsh-legal-intake) — recepção, deduplicação e classificação de e-mail jurídico
- [dsh-legal-clause](https://github.com/PerryLink/dsh-legal-clause) — árvore de cláusulas e cobertura de 12 chaves
- [dsh-contract-pack](https://github.com/PerryLink/dsh-contract-pack) — os três plugins como um cenário de ponta a ponta

## Desenvolvimento

```sh
pnpm install
pnpm build && pnpm lint && pnpm typecheck
node --test test/*.test.mjs
node scripts/gate.mjs
```

As imagens do README são geradas por [`scripts/gen-readme-assets.py`](scripts/gen-readme-assets.py): o hero desenha os cinco contratos de exemplo como faixas de janela de renovação com Pillow, a figura de estrutura é SVG escrito à mão com a escada de quatro grupos, e cada número vem do golden do quickstart `samples/quickstart/expected/result.json`; as versões clara e escura podem ser regeradas quando necessário. `docs/assets/quickstart.png` é uma execução real capturada e é mantida junto com `docs/assets/quickstart.log`.

Topics: `dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `contract`, `renewal`, `expiry`, `legal`, `csv`, `perrylink`

## Família e agradecimentos

Este projeto é membro da família de plugins do DeepSeek Harness mantida pela [PerryLink](https://github.com/PerryLink) (todos Apache-2.0). Se este plugin ajudar você, **dê uma estrela**: não desbloqueia nada, mas ajuda a próxima pessoa a encontrá-lo.

- [@PerryLink](https://github.com/PerryLink) — criador e mantenedor: registro de contratos e motor de datas UTC, os três grupos exclusivos, exportação CSV e segurança de caminhos, a amostra dourada do quickstart e a documentação em cinco idiomas.

## Licença

[LICENSE](LICENSE) (Apache License 2.0) © 2026 dsh-contract-renewal contributors. Veja também `NOTICE`.

<p align="center"><sub>Apache-2.0 · Plugin da comunidade, não afiliado à DeepSeek.</sub></p>
