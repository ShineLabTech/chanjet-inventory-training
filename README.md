# 用 AI 查询畅捷通存货编码

把这个仓库交给 AI，让它运行一次真实查询：按分类或关键词，找出畅捷通中的存货编码和名称。

代码来自食验室畅捷通项目的公司 API 客户端，并裁剪成教学版本。你可以读懂、运行和修改它。查询只发送 `GET`，没有修改畅捷通或写入飞书的功能。

2026-11-24 已完成真实查询与 Windows / Linux 测试，见[验证记录](docs/verification.md)。

## 第一次体验

把下面这段话发给能操作 GitHub 的 AI：

> 请读取 ShineLabTech/chanjet-inventory-training 的 README 和 AGENTS.md。通过仓库里的 inventory-query.yml 工作流，查询分类 0602 的前 10 条存货编码，显示编码、名称和状态。为本次查询生成唯一 query_id，等待对应运行完成后读取结果；给我运行链接和查询时间。如果失败，请告诉我实际原因。

需要你的 GitHub 账号有本仓库 **Write** 或更高权限，并且 AI 已能通过 GitHub CLI 或相应工具使用该账号。管理员会单独授予培训成员权限；加入组织不一定自动获得仓库访问权。

培训 Key 保存在仓库的 GitHub Actions Secret 中，查询时自动注入。你不需要复制 Key。结果显示在本次运行的 Summary 和日志中，日志中另有 `INVENTORY_RESULT_JSON=` 开头的机器可读结果。真实结果不会提交进代码仓库；仓库有读取权限的人可以看到运行结果。

多个培训查询会串行运行；GitHub Actions 可能合并尚未开始的排队任务。AI 应检查自己那一次运行是否成功，取消时再按需发起。

### AI 使用 GitHub CLI 的例子

```bash
gh workflow run inventory-query.yml --repo ShineLabTech/chanjet-inventory-training --ref main -f classes=0602 -f keyword=外箱 -f limit=10 -f query_id=classroom-unique-id
gh run list --repo ShineLabTech/chanjet-inventory-training --workflow inventory-query.yml --limit 20 --json databaseId,displayTitle,status,conclusion,url
```

将 `classroom-unique-id` 换成本次唯一标识，在列表中查找 `inventory-query-你的标识`。取到对应 `databaseId` 后：

```bash
gh run watch RUN_ID --repo ShineLabTech/chanjet-inventory-training --exit-status
gh run view RUN_ID --repo ShineLabTech/chanjet-inventory-training --log
```

`RUN_ID` 是实际运行编号。不要直接选“最近一次”，同学可能同时发起查询。AI 可解析日志中 `INVENTORY_RESULT_JSON=` 后的 JSON；只提取该前缀后紧接 `{` 的结果行，忽略打印工作流命令的行。

## 在自己的电脑上运行

需要 Node.js 22.9+；推荐 Node.js 22 LTS 或更新的 LTS。程序没有第三方依赖，不需要 `npm install`。

```bash
git clone https://github.com/ShineLabTech/chanjet-inventory-training.git
cd chanjet-inventory-training
npm run query -- --help
npm test
```

如果讲师为你的本机配置了独立 Key，把 `.env.example` 复制成 `.env`，通过本机受控方式填入 `SHINELAB_INVENTORY_API_KEY`。不要让 AI 打印 `.env`，也不要把 Key 粘贴到聊天、Issue 或 PR。

```bash
npm run query -- --classes 0602 --limit 10
npm run query -- --classes 0101,0102 --keyword 粉 --limit 20
npm run query -- --classes 0602 --keyword 001 --json
```

`--keyword` 同时匹配编码和名称。`--limit` 限制展示条数，范围为 1 到 100；公司 API 会先完整查询选定分类，再由客户端筛选。编码始终按文本处理，保留前导零。没有 Key 时程序会明确提示，不会用样例冒充实时结果。

## 可以查哪些分类

| 编码 | 分类 |
|---|---|
| `0101` | 原料 |
| `0102` | 调味粉 |
| `03` | 半成品 |
| `0403` | 其他产品系列 |
| `060101` | 卷膜类 |
| `060102` | 包装袋类 |
| `0602` | 外箱包材，默认分类 |
| `0603` | 其他包材 |

具体名称以源端为准。这里只查询物料主数据，不包含库存数量、价格、采购订单或供应商资料。更多 OpenAPI 能力由平台后续准备，本仓库不会自动扩大权限。

## 顺着代码看一次查询

```text
你的自然语言要求
  → AI 选择分类、关键词和展示条数
  → CLI / GitHub Actions
  → 公司 API（inventory:read）
  → 畅捷通存货查询
  → 校验数据、筛选并展示编码
```

| 文件 | 看什么 |
|---|---|
| [src/company-chanjet.mjs](src/company-chanjet.mjs) | 如何带着只读凭证调用接口，以及怎样检查返回数据 |
| [src/inventory-cli.mjs](src/inventory-cli.mjs) | 如何把参数变成查询，再把数据整理成人能读的结果 |
| [.github/workflows/inventory-query.yml](.github/workflows/inventory-query.yml) | GitHub 如何运行同一段代码，并临时注入 Secret |
| [test](test) | 缺凭证、范围错误、重复 ID、前导零和异常响应怎样测试 |
| [docs/training.md](docs/training.md) | 从场景、节点和接口理解这次体验，以及课后练习 |
| [docs/maintainer.md](docs/maintainer.md) | 讲师如何管理访问、配置凭证和处理失败 |

可以让 AI 完成一个小练习：“加一个只展示正常物料的选项，先写测试，在新分支提交 PR。”测试使用虚构数据，不调用真实接口。真实查询仅由手动工作流发起。

## 查询失败时

| 现象 | 处理 |
|---|---|
| 找不到仓库或无法运行工作流 | 检查 GitHub 登录账号及本仓库 Write 权限 |
| 缺少 `SHINELAB_INVENTORY_API_KEY` | 本机使用方式请找讲师配置；GitHub 方式由管理员检查 Secret |
| HTTP 401 / 403 | 由维护人检查 Key 的状态和 `inventory:read` 权限 |
| HTTP 429 | 等待限流窗口结束后再试，不反复循环请求 |
| `CHANJET_AUTH_OPERATOR_RECONCILE` 等授权错误 | 由接口维护人检查上游授权；不要自行重签或清空服务状态 |
| 无匹配项 | 查看本次分类和关键词，确认是否查错范围 |
| 其他错误 | 保存本次运行链接、时间、错误码和请求编号，交维护人排查 |

能看到真实查询结果，才算完成这次体验；单元测试通过或工作流开始运行都不能代替它。
