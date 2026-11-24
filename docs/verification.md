# 验证记录

日期：2026-11-24。

已验证代码提交：`6a9f1e2fe95137c7020da59cd2271fefc638080a`。

| 检查 | 结果 |
|---|---|
| 仓库可见性 | Private |
| 独立调用身份 | `chanjet-inventory-training-20261124`，启用，仅 `inventory:read` |
| Key 存储 | 已设置 Actions Secret；本地 `.env` 被 Git 忽略，未进入提交 |
| 本地真实查询 | `0602` 分类返回 253 条，存货编码均为字符串 |
| 权限负向验证 | 同一 Key 对 `GET /api/v1/erp/chanjet/status` 返回 403 |
| GitHub 实际查询 | 成功，查询 253 条并展示 10 条，结果已从运行日志回读 |
| 自动测试 | 17 项通过；GitHub Windows、Ubuntu 两个平台均通过 |
| 独立代码审查 | Markdown 文本转义问题已修复，复核无剩余阻塞项 |

[真实查询运行记录](https://github.com/ShineLabTech/chanjet-inventory-training/actions/runs/45319499914)

[Windows / Linux CI 记录](https://github.com/ShineLabTech/chanjet-inventory-training/actions/runs/45319498537)

查询时间：2026-11-24 04:26，Europe/Berlin（03:26 UTC）。请求编号：`9028fe6d-d52f-476c-8c5c-0db62d1eaec6`。253 是这次查询的实际计数，不是固定业务总量。真实物料明细保留在有权限的运行记录中，没有复制进源码。

首轮查询已成功取得数据，但 artifact 上传受到组织存储配额限制；最终版本去掉附件上传，用 Summary 和日志交付结果，完整工作流已重新验证成功。

尚未验证：学员账号访问。当前成功证据使用管理员账号；开课前需要为指定培训成员授予本仓库 Write 权限，并由一位学员完成一次运行。没有调整组织的默认成员权限。
