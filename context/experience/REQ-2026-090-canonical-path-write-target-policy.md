# 2026-07-11 路径门禁必须共享分类、canonical containment 与全目标决策

## 场景

同一套 PreToolUse 治理由 REQ 门禁与 scope 门禁分别执行。若二者各自解析 Bash，或只检查首个目标，就会出现“一个 Hook 认为是治理写入、另一个 Hook 看见不同目标”的策略漂移。

## 关联材料

- REQ: `requirements/completed/REQ-2026-090-p0-canonical-path-multi-target-guard.md`
- Design: `docs/plans/REQ-2026-090-design.md`
- Code Review: `requirements/reports/REQ-2026-090-code-review.md`
- QA: `requirements/reports/REQ-2026-090-qa.md`

## 问题 / 模式

- 字符串前缀不是目录 containment：`/repo-x` 不能被当成 `/repo` 内部。
- lexical normalize 不能识别现有符号链接祖先；不存在目标也要先 realpath 最近现有祖先再拼接尾部。
- 写命令可能包含多个目标；`tee allowed forbidden`、多重重定向或复合命令必须 all-targets-must-pass。
- 动态变量、glob 和缺少 operand 是“无法确定”，不是“纯读”。
- 事件 cwd 可能是仓库子目录、已删除目录或不可信文本；git root 查找必须参数化、可回退且不可通过 shell 拼接。

## 关键决策

- 建立共享、非求值的写目标策略，输出结构化 `targets` 与 `unresolved`，两个 Hook 只消费该结果。
- canonicalization 使用分隔符归一化、绝对解析、nearest-existing-ancestor realpath 和 `path.relative` containment。
- req-check 白名单要求全部目标均为治理路径；scope-guard 在显式 scope/只读边界下对 unresolved 或任一失败目标 fail closed。
- 无 scope 的历史 REQ 保持兼容；global/worktree exemption 是唯一显式放行入口。

## 复用建议

- 安全相关策略不要在多个消费者中复制 parser；共享结构化结果比共享正则片段更可靠。
- 对“支持的语法”建立正向、错误和对抗三组 fixture，并明确不支持的能力，避免把 best-effort 写成强安全保证。
- 路径安全测试至少包含 traversal、前缀碰撞、反斜杠、绝对路径、符号链接祖先和不存在目标。
- Hook 判定若依赖 cwd，应测试嵌套 cwd、无效 cwd 与 worktree，而不只测试仓库根目录 happy path。
