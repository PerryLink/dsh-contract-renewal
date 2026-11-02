# 故障排查 — dsh-contract-renewal

每条按「症状 / 原因 / 动作」写。报错原文都是 `<一句人话>（E_XXX）｜下一步：<动作>`，
把 `E_XXX` 和这句话一起发到 issue 即可定位。不要把真实合同或客户金额贴进 issue。

## 1. 日期不是有效的 ISO 日期（E_CONTRACT_DATE_INVALID）

- **症状**：`日期不是有效的 ISO 日期（YYYY-MM-DD）（E_CONTRACT_DATE_INVALID）｜下一步：改成 2026-12-01 这种格式，并确认日期真实存在`
- **原因**：用了 `2026/12/01`、`2026-1-1`、带时间的 ISO 串，或写了不存在的日期（`2026-02-30`、`2026-13-01`）。
- **动作**：改成严格的 `YYYY-MM-DD`；月份 01–12、日期不超过当月天数。`as_of` 和 `within_days` 也按同一规则校验。

## 2. 合同编号重复（E_CONTRACT_DUPLICATE）

- **症状**：`这个合同编号已经登记过了（E_CONTRACT_DUPLICATE）｜下一步：先查登记表；要更新请换一个合同版本号`
- **原因**：同一登记表里已经有这个编号；比较时不区分大小写，`DEMO-001` 与 `demo-001` 视为同一份。
- **动作**：先跑 `contract.upcoming` 或看 `contracts.jsonl` 确认已有记录。续签/改签请用新编号（如 `-v2`）登记，保留历史；不要手工删除旧行来“修复”。

## 3. 到期日早于起始日（E_CONTRACT_DATE_RANGE）

- **症状**：`合同到期日早于起始日（E_CONTRACT_DATE_RANGE）｜下一步：检查 start_date 和 end_date 是否写反`
- **原因**：两个日期写反，或起始日用了续签后的日期。
- **动作**：交换 `start_date` / `end_date`；如果是续签，新周期用新编号单独登记。

## 4. 续签窗口或统计天数不合法（E_CONTRACT_WINDOW_INVALID）

- **症状**：`续签窗口或统计天数不是 0–3650 之间的整数（E_CONTRACT_WINDOW_INVALID）｜下一步：传 0 到 3650 的整数`
- **原因**：传了负数、小数、字符串（`"60"`）或超过 3650 的值。
- **动作**：`renewal_window_days` 和 `within_days` 都传 0–3650 的整数。`renewal_window_days: 0` 表示只在到期当天算进入窗口。

## 5. 金额不合法（E_CONTRACT_AMOUNT_INVALID）

- **症状**：`金额不是非负数字，或超过两位小数（E_CONTRACT_AMOUNT_INVALID）｜下一步：金额写成 128000 或 128000.50`
- **原因**：带了货币符号、千分位、负数、`NaN`，或小数超过两位。
- **动作**：改成纯数字，最多两位小数；没有金额就写 `0`。本包不做币种换算。

## 6. 字段缺失或含控制字符（E_CONTRACT_FIELD_REQUIRED / E_CONTRACT_FIELD_INVALID）

- **症状**：`合同字段缺失：编号、对方、起止日、续签窗口、负责人和金额都要填（E_CONTRACT_FIELD_REQUIRED）` 或 `合同字段内容不合法（E_CONTRACT_FIELD_INVALID）`
- **原因**：`contract_no`、`counterparty`、`owner` 为空，或名称里带了换行/制表符/超长文本。
- **动作**：补齐字段；名称去掉换行和制表符，对方名称 ≤200 字、负责人 ≤120 字。CSV 里的逗号和引号是允许的（会被正确转义），但请用双引号包住整个字段。

## 7. 登记表读不出来或写不进去（E_CONTRACT_STORE_FAILED）

- **症状**：`本地合同登记表读不出来或写不进去（E_CONTRACT_STORE_FAILED）｜下一步：确认 $DSH_HOME/storages/dsh-contract-renewal 可写`
- **原因**：`$DSH_HOME` 不存在/只读/磁盘满；或 `contracts.jsonl` 被手工改成了非 JSON 行。
- **动作**：确认目录可写（测试时用 `DSH_CONTRACT_HOME` 指向临时目录）；如果 JSONL 损坏，先备份原文件，再逐行修成合法 JSON。不要用删用户数据的方式“修复”。

## 8. CSV 没写出去或文件名不安全（E_CONTRACT_EXPORT_FAILED / E_CONTRACT_PATH_INVALID / E_CONTRACT_PATH_NOT_ALLOWED）

- **症状**：`导出文件名不安全（E_CONTRACT_PATH_INVALID）` 或 `导出路径越过了导出目录（E_CONTRACT_PATH_NOT_ALLOWED）`
- **原因**：`filename` 带了 `../`、`/`、反斜杠、空格、中文或超过 120 字符；或解析后的路径跳出了 `exports/`。
- **动作**：只传一个由 `[A-Za-z0-9._-]` 组成的文件名，例如 `contracts-2026-12-01.csv`；不要传绝对路径。目录固定为 `$DSH_HOME/storages/dsh-contract-renewal/exports/`。
- **写失败**（`E_CONTRACT_EXPORT_FAILED`）：确认 `exports/` 可写、磁盘未满后重试。

## 还不行

```sh
node samples/quickstart/run.mjs --check   # 自带样例必须通过
node --test test/*.test.mjs               # 23 项测试
node scripts/gate.mjs                     # 元数据 + 验收门
```

仍失败时请在 <https://github.com/PerryLink/dsh-contract-renewal/issues> 附上：包版本、最小合成登记表（或脱敏后的表头）、
完整报错行、Node 与 DSH 版本。**不要附真实合同、真实对方名称或未脱敏金额。**
