# REQ-2026-088 设计稿：第二项目实验 3 缺陷修复

> 关联 REQ：`requirements/in-progress/REQ-2026-088-second-project-defects.md`
> 实验来源：`requirements/observations/2026-06-22-second-project-experiment.md`

## 1. 缺陷 #2：标题精确匹配脆弱

### 现状
`req-validation.mjs:200-213` `hasExemption`:
```js
const constraintSection = getSection(reqContent, '### 约束（Scope Control，可选）');
```
`getSection` 精确匹配标题。用户写 `### 约束（Scope Control）`（漏"，可选"）→ constraintSection 为空 → checkbox 检测 false → 豁免失效。

### 方案
改 `hasExemption`：若精确标题取不到 section，回退用 `### 约束` 前缀匹配（兼容 `### 约束（Scope Control）` / `### 约束（Scope Control，可选）` / `### 约束`）。

```js
function hasExemption(reqContent, exemptionId) {
  let constraintSection = getSection(reqContent, '### 约束（Scope Control，可选）');
  if (!constraintSection) {
    // 宽松回退：匹配 ### 约束 前缀（兼容漏写"，可选"）
    constraintSection = getSectionByPrefix(reqContent, '### 约束');
  }
  const checkboxPattern = new RegExp(`- \\[x\\]\\s*${exemptionId}`, 'i');
  if (checkboxPattern.test(constraintSection)) return true;
  if (exemptionId === 'skip-design-validation') {
    return constraintSection.includes('设计文档豁免');
  }
  return false;
}
```

`getSectionByPrefix`：匹配 `^### 约束` 开头的标题行，取其到下一 `## ` 的内容。（需确认 `getSection` 是否支持前缀；若不支持，新增辅助函数。）

### 风险
- 误识别其他 `### 约束` 段（罕见，REQ 模板只有一个约束段）。对冲：仍要求"约束"关键词。

## 2. 缺陷 #3：install 不配 .gitignore

### 现状
`harness-install.mjs` `configureHook`/安装流程不碰目标 `.gitignore`。harness 运行时状态文件（.claude/.xxx-status / events/ / worktrees/）污染目标 git status。

### 方案
`harness-install.mjs` 新增 `appendGitignore(targetDir)`：若目标 `.gitignore` 不含 `# Harness Lab` 标记段，追加 harness-lab/.gitignore line 32-43 的运行时忽略段（幂等，不重复追加）。在安装流程末尾调用。

```js
function appendGitignore(targetDir) {
  const gitignorePath = path.join(targetDir, '.gitignore');
  const marker = '# Harness Lab 运行时状态（不提交）';
  let existing = '';
  if (fs.existsSync(gitignorePath)) existing = fs.readFileSync(gitignorePath, 'utf8');
  if (existing.includes(marker)) return; // 幂等
  const block = `\n${marker}\n.claude/.docs-verify-status\n... (参照 harness-lab/.gitignore line 32-43)\n`;
  fs.writeFileSync(gitignorePath, existing + block, 'utf8');
}
```

## 3. 缺陷：doctor 不传播

### 现状
`harness-install.mjs` `modules.cli.files`（line 100-110）不含 `harness-doctor.mjs`。目标项目无 doctor → OPT-1B 三自检不可用。

### 方案
`modules.cli.files` 加入 `scripts/harness-doctor.mjs`。+ package.json scripts 绑定 `harness:doctor`（若目标有 package.json；无则 README 说明 `node scripts/harness-doctor.mjs`）。

> 实施前确认 `modules.cli.files` 数组结构 + `testHarnessInstallArtifacts` 是否断言 file 列表（若断言需同步）。

## 4. 测试矩阵

| # | 场景 | 期望 |
|---|------|------|
| T1 | REQ 标题 `### 约束（Scope Control）`（无"，可选"）+ skip-design checkbox | hasExemption true（宽松匹配）|
| T2 | fixture install → 读目标 .gitignore | 含 `# Harness Lab` 标记 + 运行时忽略 |
| T3 | fixture install → 读目标 scripts/ | 含 harness-doctor.mjs |
| T4 | install 幂等：二次 install 不重复追加 .gitignore | .gitignore 标记段只一份 |

## 5. 实施顺序
1. req-validation hasExemption 宽松匹配 + getSectionByPrefix
2. harness-install appendGitignore + modules 加 doctor
3. tests T1-T4
4. README install 行为说明
5. npm test + docs:verify + check:governance 全绿
