---
title: "Agent Harness：让AI从聊天机器人变成真正的智能体 · 乔木博客"
source: "url"
source_file: "https://blog.qiaomu.ai/2026-04-18-JgypqM"
created: "2026-04-20T11:42:46Z"
source_url: "https://blog.qiaomu.ai/2026-04-18-JgypqM"
extract_method: "readability"
---

你可能已经搭建过聊天机器人，甚至接入了几个工具，做出了能演示的原型。

但当你想把它推向生产环境时，问题就来了：**模型会忘记三步之前做过什么，工具调用会失败，上下文窗口塞满了无用信息。**

问题不在模型本身，而在模型周围的一切。

LangChain 用一个实验证明了这点：

他们只改变了 LLM 的基础设施（模型和权重完全不变），在 TerminalBench 2.0 的排名就从 30 名开外跃升到第 5 名。

另一个研究项目让 LLM 自己优化基础设施，通过率达到 76.4%，超过了人工设计的系统。

这套基础设施现在有了正式名称：**Agent Harness**。

## 什么是 Agent Harness

这个术语在 2026 年初被正式确立，但概念早就存在。

Harness 是包裹 LLM 的完整软件基础设施：**编排循环、工具、记忆、上下文管理、状态持久化、错误处理和安全防护**。

Anthropic 的 Claude Code 文档直接说明：<u>SDK 就是"驱动 Claude Code 的 Agent harness"。</u>

OpenAI 的 Codex 团队也用同样的表述，明确把"Agent"和"Harness"等同起来，**指代让 LLM 真正有用的非模型基础设施。**

LangChain 的 Vivek Trivedy 给出了一个精准的公式：**"如果你不是模型，你就是 harness"**。

这里有个容易混淆的地方。

Agent 是涌现出来的行为：那个有目标、会用工具、能自我纠错的实体，用户看到的就是它。

Harness 是产生这种行为的“机械装置”。

<u>当有人说"我做了个 Agent"，实际意思是他做了个 Harness，然后把它指向了一个模型。</u>

![image. png](https://blog.qiaomu.ai/api/images/image/2026/04/a4826ffeec7bfaf6-image.png)

Beren Millidge 在 2023 年的文章《Scaffolded LLMs as Natural Language Computers》里给出了精确的类比：

原始 LLM 就像一个没有内存、没有硬盘、没有 I/O 的 CPU。

上下文窗口充当 RAM（快但有限），外部数据库充当硬盘（大但慢），工具集成相当于设备驱动，**Harness 就是操作系统。**

他写道：**"我们重新发明了冯·诺依曼架构"**，因为这是任何计算系统的自然抽象。

## 三层工程

模型周围有三个同心圆层次的工程：

**提示词工程**：精心制作模型接收的指令。

**上下文工程**：管理模型看到什么、何时看到。

**Harness 工程**：涵盖前两者，加上整个应用基础设施：工具编排、状态持久化、错误恢复、验证循环、安全执行和生命周期管理。

<u>Harness 不是提示词的包装器，它是让自主智能体行为成为可能的完整系统。</u>

## 生产级 Harness 的 12 个组件

综合 Anthropic、OpenAI、LangChain 和更广泛的实践者社区的经验，一个生产级 agent harness 有 12 个独立组件。

![image. png](https://blog.qiaomu.ai/api/images/image/2026/04/3cf0bff0a0b9203c-image.png) ### 1. 编排循环（Orchestration Loop）

这是心脏。

**它实现思考-行动-观察（TAO）循环，也叫 ReAct 循环。**

循环运行：组装提示词，调用 LLM，解析输出，执行工具调用，反馈结果，重复直到完成。

机械上看，通常就是个 while 循环。

复杂性在于循环管理的所有东西，而不是循环本身。

Anthropic 把他们的运行时描述为"**哑循环**"，所有智能都在模型里，harness 只管理回合。

### 2. 工具（Tools）

工具是 agent 的手。

它们被定义为模式（名称、描述、参数类型），注入到 LLM 的上下文中，让模型知道有什么可用。

工具层处理注册、模式验证、参数提取、沙盒执行、结果捕获，以及把结果格式化回 LLM 可读的观察。

Claude Code 提供六类工具：**文件操作、搜索、执行、网络访问、代码智能和子智能体生成。**

OpenAI 的 Agents SDK 支持函数工具（通过 @function_tool）、托管工具（WebSearch、CodeInterpreter、FileSearch）和 MCP 服务器工具。

### 3. 记忆（Memory）

**短期记忆**是单个会话内的对话历史，**长期记忆**跨会话持久化。

Anthropic 使用 [CLAUDE. md](http://CLAUDE.md) 项目文件和自动生成的 [MEMORY. md](http://MEMORY.md) 文件，LangGraph 使用命名空间组织的 JSON 存储，OpenAI 支持由 SQLite 或 Redis 支持的 Sessions。

Claude Code 实现了三层层次结构：**轻量级索引（每条约 150 字符，始终加载）、按需拉取的详细文件，以及仅通过搜索访问的原始记录。**

**一个关键设计原则**：Agent 把自己的记忆当作"提示"，在行动前会对照实际状态验证。

### 4. 上下文管理（Context Management）

这是许多 agent 失败的地方。

核心问题是**上下文腐烂**：<u>当关键内容落在窗口中间位置时，模型性能下降 30% 以上（Chroma 研究，斯坦福的"Lost in the Middle"发现也证实了这点）。</u>

即使是百万 token 窗口，随着上下文增长，指令遵循能力也会退化。

生产策略包括：

- **压缩**：在接近限制时总结对话历史（Claude Code 保留架构决策和未解决的 bug，丢弃冗余的工具输出）
- **观察遮蔽**：JetBrains 的 Junie 隐藏旧的工具输出，但保持工具调用可见
- **即时检索**：维护轻量级标识符，动态加载数据（Claude Code 使用 grep、glob、head、tail 而不是加载完整文件）
- **子智能体委托**：每个子智能体广泛探索，但只返回 1000 到 2000 token 的压缩摘要

Anthropic 的上下文工程指南说明了目标：**找到最小的高信号 token 集合，最大化期望结果的可能性**。

### 5. 提示词构建（Prompt Construction）

这是组装模型在每一步实际看到的内容。

它是分层的：**系统提示词、工具定义、记忆文件、对话历史和当前用户消息。**

OpenAI 的 Codex 使用严格的优先级栈：

服务器控制的系统消息（最高优先级）、工具定义、开发者指令、用户指令（级联 [AGENTS. md](http://AGENTS.md） 文件，32 KB 限制），然后是对话历史。

### 6. 输出解析（Output Parsing）

现代 harness 依赖原生工具调用，模型返回结构化的 tool_calls 对象，而不是必须解析的自由文本。

Harness 检查：有工具调用吗？执行它们并循环。

没有工具调用？那就是最终答案。

对于结构化输出，OpenAI 和 LangChain 都支持通过 Pydantic 模型进行模式约束响应。

像 RetryWithErrorOutputParser（把原始提示词、失败的完成和解析错误反馈给模型）这样的传统方法仍可用于边缘情况。

### 7. 状态管理（State Management）

LangGraph 将状态建模为流经图节点的类型化字典，用 reducer 合并更新。

检查点发生在超级步骤边界，支持中断后恢复和时间旅行调试。

OpenAI 提供四种互斥策略：应用程序内存、SDK 会话、服务器端 Conversations API，或轻量级 previous_response_id 链接。

Claude Code 采用不同方法：git 提交作为检查点，进度文件作为结构化草稿本。

### 8. 错误处理（Error Handling）

这就是为什么这很重要：一个 10 步流程，每步 99% 成功率，端到端成功率仍然只有约 90.4%。

错误会快速复合。

LangGraph 区分四种错误类型：瞬态（带退避重试）、LLM 可恢复（将错误作为 ToolMessage 返回，让模型调整）、用户可修复（中断等待人工输入）和意外（冒泡用于调试）。

Anthropic 在工具处理程序内捕获失败，并将它们作为错误结果返回以保持循环运行。

Stripe 的生产 harness 将重试尝试上限设为两次。

### 9. 防护栏和安全（Guardrails and Safety）

OpenAI 的 SDK 实现三个级别：

输入防护栏（在第一个 agent 上运行）、输出防护栏（在最终输出上运行）和工具防护栏（在每次工具调用时运行）。

"绊线"机制在触发时立即停止 agent。

**Anthropic 在架构上将权限执行与模型推理分离。**

模型决定尝试什么，工具系统决定允许什么。

Claude Code 独立管理约 40 个离散工具能力，分三个阶段：项目加载时建立信任、每次工具调用前权限检查、高风险操作的明确用户确认。

### 10. 验证循环（Verification Loops）

这是区分玩具演示和生产 agent 的关键。

Anthropic 推荐三种方法：基于规则的反馈（测试、linter、类型检查器）、视觉反馈（通过 Playwright 截图用于 UI 任务）和 LLM 作为评判者（单独的子智能体评估输出）。

<u>Claude Code 的创建者 Boris Cherny 指出，</u>**<u>给模型一种验证其工作的方法，质量提高 2 到 3 倍</u>**<u>。</u>

### 11. 子智能体编排（Subagent Orchestration）

Claude Code 支持三种执行模型：

- Fork（父上下文的字节相同副本）
- Teammate（带有基于文件的邮箱通信的单独终端窗格）
- Worktree（自己的 git 工作树，每个 agent 一个独立分支）。

OpenAI 的 SDK 支持智能体作为工具（专家处理有界子任务）和交接（专家获得完全控制）。

LangGraph 将子智能体实现为嵌套状态图。

## 循环运作：逐步演练

![image. png](https://blog.qiaomu.ai/api/images/image/2026/04/debb55fe9f55bf6b-image.png)

现在你知道了组件，让我们追踪它们如何在单个循环中协同工作。

**步骤 1（提示词组装）**：Harness 构建完整输入：系统提示词 + 工具模式 + 记忆文件 + 对话历史 + 当前用户消息。

**重要上下文放在提示词的开头和结尾（"Lost in the Middle"发现）。**

**步骤 2（LLM 推理）**：组装的提示词发送到模型 API。

模型生成输出 token：文本、工具调用请求，或两者都有。

**步骤 3（输出分类）**：如果模型产生了没有工具调用的文本，循环结束。

如果它请求了工具调用，继续执行。

如果请求了交接，更新当前 agent 并重启。

**步骤 4（工具执行）**：对于每个工具调用，harness 验证参数、检查权限、在沙盒环境中执行并捕获结果。

只读操作可以并发运行，变更操作串行运行。

**步骤 5（结果打包）**：工具结果格式化为 LLM 可读消息。

错误被捕获并作为错误结果返回，以便模型可以自我纠正。

**步骤 6（上下文更新）**：结果附加到对话历史。

如果接近上下文窗口限制，harness 触发压缩。

**步骤 7（循环）**：返回步骤 1，重复直到终止。

终止条件是分层的：模型产生没有工具调用的响应、超过最大回合限制、token 预算耗尽、防护栏绊线触发、用户中断，或返回安全拒绝。

一个简单问题可能需要 1 到 2 个回合。

复杂的重构任务可以在许多回合中链接数十次工具调用。

对于跨越多个上下文窗口的长期任务，Anthropic 开发了两阶段"Ralph Loop"模式：

初始化 Agent 设置环境（初始化脚本、进度文件、功能列表、初始 git 提交），然后编码 Agent 在每个后续会话中读取 git 日志和进度文件来定位自己，选择最高优先级的未完成功能，处理它，提交并写摘要。

**文件系统在上下文窗口之间提供连续性**。

## 真实框架如何实现这个模式

![image. png](https://blog.qiaomu.ai/api/images/image/2026/04/ad8e75910e2cdf7a-image.png)

**Anthropic 的 Claude Agent SDK** 通过单个 query() 函数暴露 harness，创建智能体循环并返回流式消息的异步迭代器。

运行时是"哑循环"，所有智能都在模型里。

Claude Code 使用收集-行动-验证循环：收集上下文（搜索文件、读代码）、采取行动（编辑文件、运行命令）、验证结果（运行测试、检查输出），重复。

**OpenAI 的 Agents SDK** 通过 Runner 类实现 harness，有三种模式：异步、同步和流式。

SDK 是"代码优先"：工作流逻辑用原生 Python 表达，而不是图 DSL。

Codex harness 用三层架构扩展了这一点：Codex Core（agent 代码 + 运行时）、App Server（双向 JSON-RPC API）和客户端界面（CLI、VS Code、web 应用）。

所有界面共享同一个 harness，这就是为什么"Codex 模型在 Codex 界面上比在通用聊天窗口中感觉更好"。

**LangGraph** 将 harness 建模为显式状态图。

两个节点（llm_call 和 tool_node）通过条件边连接：如果存在工具调用，路由到 tool_node，如果不存在，路由到 END。

LangGraph 从 LangChain 的 AgentExecutor 演变而来，后者在 v0.2 中被弃用，因为难以扩展且缺乏多智能体支持。

LangChain 的 Deep Agents 明确使用术语"agent harness"：内置工具、规划（write_todos 工具）、用于上下文管理的文件系统、子智能体生成和持久记忆。

**CrewAI** 实现基于角色的多智能体架构：

Agent（围绕 LLM 的 harness，由角色、目标、背景故事和工具定义）、Task（工作单元）和 Crew（智能体集合）。

CrewAI 的 Flows 层添加了"具有智能的确定性骨干"，管理路由和验证，而 Crews 处理自主协作。

**AutoGen**（演变为 Microsoft Agent Framework）开创了对话驱动的编排。

其三层架构（Core、AgentChat、Extensions）支持五种编排模式：

顺序、并发（扇出/扇入）、群聊、交接和 magentic（管理器 agent 维护动态任务分类账，协调专家）。

## 脚手架隐喻

![image. png](https://blog.qiaomu.ai/api/images/image/2026/04/76a1ba10344787e1-image.png)

建筑脚手架是临时基础设施，使工人能够建造他们无法触及的结构。

它不做建造，但没有它，工人无法到达上层。

**关键洞察**：建筑完成后，脚手架会被拆除。

随着模型改进，harness 复杂性应该降低。

Manus 在六个月内重建了五次，每次重写都删除了复杂性。

复杂的工具定义变成了通用 shell 执行，"管理 agent"变成了简单的结构化交接。

这指向协同进化原则：**模型现在在循环中使用特定 harness 进行后训练。**

Claude Code 的模型学会了使用它训练时使用的特定 harness。

改变工具实现可能会降低性能，因为这种紧密耦合。

Harness 设计的"未来验证测试"：**如果性能随着更强大的模型扩展而不增加 harness 复杂性，设计就是合理的**。

![image. png](https://blog.qiaomu.ai/api/images/image/2026/04/f5fa9b2d9647719a-image.png) ## 定义每个 Harness 的七个决策

![image. png](https://blog.qiaomu.ai/api/images/image/2026/04/052eed5a2b484b18-image.png)

每个 harness 架构师都面临七个选择：

**1. 单智能体 vs. 多智能体**。

**Anthropic 和 OpenAI 都说：首先最大化单个 agent。**

多智能体系统增加开销（路由的额外 LLM 调用、交接期间的上下文丢失）。

仅当工具过载超过约 10 个重叠工具或存在明显独立的任务域时才拆分。

**2. ReAct vs. 计划-执行**。

ReAct 在每一步交织推理和行动（灵活但每步成本更高）。

计划-执行将规划与执行分离。LLMCompiler 报告比顺序 ReAct 快 3.6 倍。

**3. 上下文窗口管理策略**。

五种生产方法：基于时间的清除、对话总结、观察遮蔽、结构化笔记和子智能体委托。

ACON 研究显示，通过优先考虑推理轨迹而不是原始工具输出，token 减少 26 到 54%，同时保持 95% 以上的准确性。

**4. 验证循环设计**。

计算验证（测试、linter）提供确定性真相。

推理验证（LLM 作为评判者）捕获语义问题但增加延迟。

Martin Fowler 的 Thoughtworks 团队将此框架化为指南（前馈，行动前引导）与传感器（反馈，行动后观察）。

**5. 权限和安全架构**。

宽松（快但有风险，自动批准大多数操作）与限制性（安全但慢，每个操作都需要批准）。选择取决于部署环境。

**6. 工具范围策略**。

更多工具通常意味着更差的性能。

<u>Vercel 从 v0 中删除了 80% 的工具，获得了更好的结果。</u>

Claude Code 通过延迟加载实现 95% 的上下文减少。

原则：**暴露当前步骤所需的最小工具集**。

**7. Harness 厚度**。

harness 与模型中有多少逻辑。

Anthropic 押注于薄 harness 和模型改进。

基于图的框架押注于显式控制。

**Anthropic 定期从 Claude Code 的 harness 中删除规划步骤，因为新模型版本内化了该能力。**

## Harness 就是产品

**使用相同模型的两个产品，仅基于 harness 设计就可以有截然不同的性能。**

TerminalBench 的证据很清楚：仅改变 harness 就使 agent 移动了 20 多个排名位置。

Harness 不是已解决的问题或商品层。

**这是艰苦工程的所在**：将上下文作为稀缺资源管理，设计在失败复合之前捕获失败的验证循环，构建提供连续性而不产生幻觉的记忆系统，以及在构建多少脚手架与留给模型多少之间做出架构押注。

该领域正朝着更薄的 harness 发展，因为模型在改进。

但 harness 本身不会消失。

即使是最有能力的模型也需要一些东西来管理其上下文窗口、执行其工具调用、持久化其状态并验证其工作。

下次你的 agent 失败时，别怪模型，看看 harness。
