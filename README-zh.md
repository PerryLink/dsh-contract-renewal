<div align="center">

# dsh-contract-renewal

> **官方仓库。** 本包唯一官方仓库，由 PerryLink 维护；其他账号下的同名仓库与本项目无关。Apache-2.0。

[![npm](https://img.shields.io/npm/v/dsh-contract-renewal)](https://www.npmjs.com/package/dsh-contract-renewal)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

**登记合同 → 按指定日期看已过期 / 续签窗口 / N 天内到期 → 导出 CSV。**

> **状态：alpha / 公开合成 / partial / not counted / 非 GA。** 不含客户数据、客户证据，也不作生产可用声明。

[English](README.md) · [简体中文](README-zh.md)

```sh
dsh plugin --profile <profile> add dsh-contract-renewal
```

</div>

## 一句话

把合同的编号、对方、起止日、续签窗口天数、负责人和金额登记到本地，按某个 `as_of` 日期分成「已过期 / 已进入续签窗口 / N 天内到期」三组并给出剩余天数，再导出 CSV。

> 只做日期与登记表计算，**不解析合同正文、不判断条款、不发提醒、不替代法务意见**。

## 适合 / 不适合

- **适合**：法务/采购/行政手里有一批合同，需要按统一口径看“哪些已经过期、哪些该续签了”；要把登记表和到期清单交给同事复核；要把本地台账导出 CSV 再做透视或入库。
- **不适合**：解析合同 PDF/Word 正文、抽取条款（请用 `dsh-legal-clause`）；收邮件、去重、分派（请用 `dsh-legal-intake`）；自动发续签邮件或调用 OA/CLM；需要多租户、审批流、权限分级的生产合同系统；替代律师判断某份合同能不能续。

## 输入

- 一个合同登记表（CSV）或逐条调用 `contract.ingest`；每行 7 个字段：
  `contract_no`（唯一编号）、`counterparty`（对方名称）、`start_date`、`end_date`（严格 `YYYY-MM-DD`）、`renewal_window_days`（0–3650 的整数）、`owner`（负责人）、`amount`（非负数字，最多两位小数）。
- 日期必须是真实存在的 ISO 日期；`2026-02-30`、`2026-13-01`、`2026/12/01` 都会报 `E_CONTRACT_DATE_INVALID`。
- 合同编号在同一登记表内**不区分大小写**唯一；重复登记报 `E_CONTRACT_DUPLICATE`。
- 登记表存放在 `$DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl`，一行一份合同；原合同文件不读、不改。

## 输出

- `contract.ingest`：`{ contract_no, counterparty, start_date, end_date, renewal_window_days, owner, amount, total }`，`total` 是登记表当前条数。
- `contract.upcoming`：`{ as_of, within_days, expired, in_renewal_window, expiring_soon, counts }`；每条含 `days_left`（负数=已过期）和 `status`。
- `contract.report`：CSV 文件路径、文件名、`sha256`、行数、字节数与 `as_of`；文件写到 `$DSH_HOME/storages/dsh-contract-renewal/exports/`。

三组**互斥**，每份合同在一个 `as_of` 下只出现一次：

| 分组 | 条件 | 说明 |
|---|---|---|
| `expired` | `days_left < 0` | 已过期，无论过期多久都会列出 |
| `in_renewal_window` | `0 ≤ days_left ≤ renewal_window_days` | 已进入续签窗口，窗口优先于“N 天内” |
| `expiring_soon` | 不在窗口内，且 `days_left ≤ within_days` | N 天内到期但还没进窗口 |
| 不返回 | 其余 | 只在 `counts.later` 计数 |

`as_of` 默认取**今天（UTC）**，`within_days` 默认 90。日期运算全部使用 UTC 日历天，不受本机时区、夏令时或 `TZ` 影响。

## 示例

直接复制下面这句：

> 把这 5 份合同登记进来，按 2026-12-01 看哪些已过期、哪些进了续签窗口、90 天内到期，再导出一份 CSV。

用自带样例复跑并核对金标：

```sh
node samples/quickstart/run.mjs --check
```

![dsh-contract-renewal quickstart 真实运行输出](docs/assets/quickstart.png)

样例是 5 份合成合同（`DEMO-*`，无真实主体/金额），`as_of=2026-12-01`、`within_days=90`：

```text
expired: DEMO-MSA-2026-001 2026-11-15 (-16 days)
window:  DEMO-NDA-2026-002 2026-12-01 (0 days, window 30)
window:  DEMO-SAAS-2026-003 2026-12-20 (19 days, window 60)
soon:    DEMO-LEASE-2026-004 2027-01-15 (45 days, window 30)
later:   DEMO-SUPPORT-2026-005 2027-03-31 (120 days) — 只在 counts.later
```

金标 `samples/quickstart/expected/result.json` 由 `node samples/quickstart/run.mjs --json` 真实产生，不是手写；截图就是 `--check` 的真实终端输出。

样例里的对方名称故意包含逗号和引号（`华东合成制造有限公司, 上海分公司`、`Northwind "APAC" Ltd.`），用来验证 CSV 两种转义；重复登记第一份合同会返回 `E_CONTRACT_DUPLICATE`。

## 权限

读：用户指定的合同登记 CSV；不读其他目录、不读合同正文文件。
写：`$DSH_HOME/storages/dsh-contract-renewal/`（`contracts.jsonl` 与 `exports/*.csv`）；不改原文件。
联网：否。
外部系统：无。

`contract.upcoming` 标 **R0**（只读）；`contract.ingest` 与 `contract.report` 标 **R1**（本地写，只写上面的目录）。可用 `DSH_CONTRACT_HOME` 覆盖本地写根目录（测试用），默认严格等于 `$DSH_HOME/storages/dsh-contract-renewal`。

## FAQ

### 1. 为什么已过期的合同还会出现在列表里？

`expired` 分组就是要暴露漏续签的合同，所以不按 `within_days` 截断，过期多久都会列出。按 `days_left` 从最负开始排序，最严重的排在最前。

### 2. “N 天内到期”和“续签窗口”会不会重复算？

不会。三组互斥，先判过期，再判续签窗口，最后才判 N 天。即使 `within_days=30` 而某合同的续签窗口是 60 天，只要它还有 45 天到期，也归 `in_renewal_window`，不会同时进 `expiring_soon`。

### 3. 日期会不会因为时区差一天？

不会。所有日期先转成 UTC 日序号再相减，不做本地时间/DST 运算；`as_of` 省略时也取 UTC 今天。测试用 `TZ=UTC`、`America/Los_Angeles`、`Pacific/Kiritimati` 三个时区跑同一组数据，结果逐字节一致。

### 4. 合同续签了怎么更新？

登记表是追加式（append-only），不覆盖历史。请用新的合同编号登记，例如 `DEMO-MSA-2026-001-v2`，保留旧记录用于追溯；不要手工改 `contracts.jsonl`。

### 5. 会读合同 PDF、发提醒或上传数据吗？

都不会。它只算登记表里的日期和金额，不读合同正文、不发邮件/OA、不联网、不调用模型。条款覆盖请配合 `dsh-legal-clause` 使用。

## 版本

`0.1.0` · 23 项测试通过（`node --test test/*.test.mjs`）。

## 安装

```sh
dsh plugin --profile <profile> add dsh-contract-renewal
dsh --profile <profile> --dump-config | grep dsh-contract-renewal
```

卸载：

```sh
dsh plugin --profile <profile> remove dsh-contract-renewal
```

### 安装通道

- **npm（推荐）:** `dsh plugin --profile <profile> add dsh-contract-renewal`
- **git 通道:** `dsh plugin --profile <profile> add github:PerryLink/dsh-contract-renewal`
- **tarball:** `pnpm pack`，然后 `dsh plugin --profile <profile> add ./dsh-contract-renewal-<version>.tgz`

## 工具

工具名是稳定 API；说明保留英文以匹配运行时输出。

| 工具 | 用途 | 风险 |
|---|---|---|
| `contract.ingest` | 登记一份合同，写 `contracts.jsonl`；非法日期 / 重复编号有稳定错误码 | R1 local write |
| `contract.upcoming` | 按 `as_of` 分组并返回 `days_left`；默认今天（UTC）、90 天 | R0 |
| `contract.report` | 导出带引号转义的 CSV，返回路径、sha256、行数、字节数 | R1 local write |

### 分组与边界的精确定义

1. `end_date < as_of` → `expired`，`days_left` 为负。
2. `0 ≤ days_left ≤ renewal_window_days` → `in_renewal_window`。`days_left = 0`（今天到期）和 `days_left = renewal_window_days`（窗口第一天）都算窗口内。
3. 不在窗口内且 `days_left ≤ within_days` → `expiring_soon`；`days_left = within_days` 恰好算 N 天内，`within_days + 1` 不算。
4. 其余 → `later`，只进 `counts.later`，不出现在三组里。

## 快速开始

```sh
# 1) 登记一份合同
#    工具面：contract.ingest({ contract_no: "DEMO-MSA-2026-001", counterparty: "…",
#             start_date: "2026-01-01", end_date: "2026-11-15",
#             renewal_window_days: 60, owner: "王敏", amount: 128000 })

# 2) 看某一天的三组
#    工具面：contract.upcoming({ as_of: "2026-12-01", within_days: 90 })

# 3) 导出 CSV
#    工具面：contract.report({ as_of: "2026-12-01", filename: "contracts-2026-12-01.csv" })
```

用样例直接跑：

```sh
node samples/quickstart/run.mjs --check
```

## 验收证据

公开/合成 fixture 在 `samples/quickstart/`；`ACCEPTANCE.csv` 记录检查，除 quickstart 行外均为 `counted=false`。

| req_id | metric | threshold | actual | pass | source | counted |
|---|---|---|---|---|---|---|
| CR-A03 | upcoming groups | 1 expired / 2 window / 1 soon / 1 later | 1/2/1/1 | true | public/synthetic | false |
| CR-A04 | window boundary days_left | -16\|0/30 | -16\|0/30 | true | public/synthetic | false |
| CR-A07 | CSV quoting | comma+quote escaped | escaped | true | public/synthetic | false |
| CR-QS01 | quickstart golden | 1/1 | 1 | true | synthetic/quickstart | true |

*这是 fixture 支撑的验收行，不是客户运行；没有编造输出。*

## 边界与已知限制

- 只做登记表与日期计算，不解析合同正文、不校验条款、不做法律判断。
- 不自动发送续签提醒，不调用邮件、OA、CLM、电子签或任何外部系统。
- 登记表是追加式 JSONL，不提供原地更新/删除；续签请用新编号登记，避免丢历史。
- 编号唯一性按 `toUpperCase()` 比较；如果你的编号体系区分大小写，请在命名时自行加后缀区分。
- 金额只校验非负、最多两位小数和上限 1e12，不做币种换算、汇率或税务处理。
- 日期范围限定 1000–9999 年；`renewal_window_days` 与 `within_days` 限定 0–3650 的整数。
- CSV 只做 RFC 4180 引号转义，不做 Excel 公式前缀清洗；不要用 Excel 直接打开来源不明的 CSV。
- 仅公开/合成样例；alpha/partial、not counted，不作 GA 或生产可用声明。

## 开发

```sh
pnpm install
pnpm build && pnpm lint && pnpm typecheck
node --test test/*.test.mjs
node scripts/gate.mjs
```

## 兼容性

| 维度 | 状态 |
|---|---|
| Harness | `dsh >=0.2.1-rc.3 <0.4.0` |
| Node | `>=24.9.0 <25` |
| Platforms | All; local files only |
| 数据 | No network, no model call, no upload |

## 相关项目

- [dsh-legal-intake](https://github.com/PerryLink/dsh-legal-intake) — 法务邮件收件、去重、分类
- [dsh-legal-clause](https://github.com/PerryLink/dsh-legal-clause) — 条款树与 12 项条款覆盖
- [合同包 dsh-contract-pack](../dsh-contract-pack/README-zh.md) — 把三个插件串成端到端场景

## 许可证

Apache-2.0. See `LICENSE`, `NOTICE`.
