# 讲师与维护人说明

仓库：`ShineLabTech/chanjet-inventory-training`，保持 Private。

## 培训访问

为已确认的培训成员或培训团队授予本仓库 Write 权限，他们才能手动触发 GitHub Actions。不要仅为培训扩大整个组织的默认权限。

Write 成员可修改代码和工作流，因此必须作为受信任的只读 API 调用者管理。GitHub Secret 防止密钥进入 Git 历史，不会阻止有写权限的人构造工作流提取凭证。需要真正隔离不受信任学员时，应由未来的 OpenAPI 平台提供按人签发、细粒度权限或受控代理。

## 独立培训凭证

调用身份约定为 `chanjet-inventory-training-20261124`，权限仅为 `inventory:read`。不复用采购、妙搭或同步服务的 Key。该 scope 可查询物料主数据，服务端当前不将权限限制到单个编码字段或某个分类。

Key 放在本仓库 Actions Secret `SHINELAB_INVENTORY_API_KEY`。仅手动查询工作流的查询步骤注入它；普通 CI 不使用它。需要本机查询时，应为具体使用人配置受控凭证，不从 Actions 导出共享 Key。

维护人可通过公司服务已有的 `manage_api_client.py` 生命周期命令对独立身份执行创建、停用或轮换。操作需在既有受控管理环境中完成；不要将管理员凭证、服务器登录方式或上游畅捷通授权材料写入本仓库。

更新仓库 Secret 时使用安全输入渠道，例如将值通过标准输入交给 `gh secret set SHINELAB_INVENTORY_API_KEY --repo ShineLabTech/chanjet-inventory-training`，不要把 Key 放在命令行参数中。

## 范围与保留

- 客户端只使用 `https://open.shinelabtech.cn` 的 inventory GET 路径，不跟随重定向。
- 不给培训身份增加采购订单、库存余额或其他能力。后续平台开放后再单独设计。
- 查询结果可能出现在私有仓库日志和 Summary；仓库读者可以查看。JSON artifact 保留一天；日志使用仓库自己的保留策略，不能把 artifact 的一天误解为全部数据一天后消失。
- 不提交真实查询结果。`.env`、`output/` 已忽略。
- 当前查询工作流只在 main 执行，没有定时任务，不在 push / PR 上调用真实 API。
- 培训结束后可停用该调用身份，并按实际需要调整仓库成员权限与结果保留。

## 交付检查

1. 确认仓库私有、Secret 已设置、API 身份只有 inventory:read。
2. 本地自动测试及 GitHub CI 通过。
3. 手动运行一次实际查询，核对结果、请求编号与运行链接。
4. 用该 Key 对另一个只读能力进行权限检查，应被 403 拒绝；不要用写接口试探权限。
5. 正式开课前用一个学员账号验证仓库访问和工作流权限。管理员成功运行不能替代学员账号验收。

实际联调状态与运行证据见 [verification.md](verification.md)。
