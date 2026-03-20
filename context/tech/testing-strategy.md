# Testing Strategy

## 目标

描述目标项目的真实验证链路，让任何接手的人或 agent 都知道应该运行什么、看到什么结果才算通过。

## 最低要求

- 列出真实可执行的命令
- 说明每个命令验证的范围
- 说明哪些验证需要本地环境、测试数据或外部依赖
- 说明哪些检查是阻塞项

## 建议模板

### Command Matrix
| Command | Purpose | Blocking | Notes |
|---------|---------|----------|-------|
| `npm run lint` | 静态检查 | Yes | |
| `npm run test` | 自动化测试 | Yes | |
| `npm run build` | 生产构建 | Yes | |
| `npm run verify` | 完整验证链路 | Yes | |

### Environment Prerequisites
- 需要的环境变量：
- 需要的测试数据：
- 需要启动的服务：

### Manual Verification
- 需要人工确认的流程：
- 验证方法：
- 通过标准：

## 注意

如果项目当前没有真实命令，先补命令或明确记录缺口，不要把占位脚本当成验证链路。
