# 业务 Context 索引

> 先读本索引，再按需加载具体业务文档。
> 不要默认把整个 `context/business/` 一次性读完。

## 建议的最小集合

优先补这几份文档：
- `product-overview.md`：产品目标、目标用户、核心价值
- `user-journey.md`：关键用户路径和触发点
- `domain-model.md`：核心实体、关系和边界
- `glossary.md`：业务术语表

## 何时补业务文档

- 新项目接入时，先补 `product-overview.md`
- 新需求落地前，补或更新相关用户路径和业务规则
- 发现术语歧义时，补 `glossary.md`

## 文档要求

每份业务文档应尽量回答：
- 这个概念或流程解决什么问题
- 参与角色是谁
- 关键业务规则是什么
- 哪些情况属于异常或边界条件
- 与哪些 REQ 或模块有关

## 命名建议

- `product-overview.md`
- `user-journey.md`
- `domain-model.md`
- `process-<name>.md`
- `glossary.md`
