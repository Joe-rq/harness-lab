# Environment Contract

## 目标

说明项目运行和验证所需的环境变量、配置来源和风险边界。

## 建议模板

| Name | Required | Scope | Example | Owner | Notes |
|------|----------|-------|---------|-------|-------|
| `EXAMPLE_API_KEY` | Yes | local / ci / prod | `<secret>` | Team A | 用于调用示例服务 |

## 需要明确的内容

- 哪些变量是本地开发必需的
- 哪些变量只在 CI / staging / prod 需要
- 是否存在默认值
- 密钥由谁负责提供和轮换
- 缺失时系统会怎样失败

## 验证要求

- 新增环境变量时，必须同步更新本文件
- 改动会影响验证链路时，必须同步更新 `testing-strategy.md`
