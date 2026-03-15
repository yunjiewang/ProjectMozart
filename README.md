# Project Mozart

一个可直接本地打开的 Web 音乐创作原型：聚焦单线条旋律的**生成、编辑、编排、练习与导出**。

## 给新人的 60 秒 onboarding
1. 安装 Node.js（建议 18+）。
2. 在仓库根目录启动静态服务：
   - `python -m http.server 4173`
3. 浏览器打开 `http://127.0.0.1:4173`。
4. 首次建议路径：
   - 在 **Generator Forge** 点击“生成旋律”。
   - 在 **Motif Library** 保存当前 pattern。
   - 把 motif 加入 **Phrase Builder**，尝试 block 变换。
   - 导出 MIDI 到 DAW。

## 文档地图（先看这个）
- `PRD.md`：高层功能需求（why + what）。
- `PROGRESS.md`：已实现需求与阶段进展（what done）。
- `TODO.md`：当前待办（what next）。
- `README.md`（本文）：新人上手与开发协作入口。

## 本地开发
### 目录结构（核心）
- `index.html`：页面结构与模板。
- `styles.css`：样式与布局。
- `app.js`：UI 状态、交互编排、事件绑定。
- `core.js`：生成/变换核心算法与纯逻辑函数。
- `tests/core.test.js`：核心逻辑测试。

### 常用命令
- 语法检查：
  - `node --check app.js`
  - `node --check core.js`
- 运行测试：
  - `node --test tests/core.test.js`

## 协作约定（建议）
- 功能讨论先更新 `PRD.md`（高层需求）。
- 功能落地后更新 `PROGRESS.md`（记录已完成）。
- 新迭代只在 `TODO.md` 维护待办，不在 TODO 中混写 done 历史。
- 新人提 PR 前至少跑一遍 core tests。
