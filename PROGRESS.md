# Project Mozart PROGRESS（已实现需求记录）

> 本文记录“已经交付”的能力与阶段性成果；详细待办请看 `TODO.md`。

## Phase 1 — 基础创作闭环（已完成）
- Pattern Sequencer：单线条网格编辑、播放、MIDI 导出。
- 音符级控制：duration / velocity / articulation / cents 偏移。
- 基础编辑操作：转调、反向、拉伸、清空等。

## Phase 2 — 素材资产化（已完成）
- Motif Library：保存、加载、复制、删除、搜索与过滤。
- 元信息体系：tags / style / difficulty / provenance。
- 项目级导入导出与历史记录机制。

## Phase 3 — 参数化生成（已完成）
- Generator Forge：
  - 参数：密度、跳进、重复率、惊喜度、张力曲线。
  - 模式：new / variation / continuation / response / tail / cadence。
  - 锁定：form、cell family、surprise zone。
- cadence target：root / third / fifth / color-tone 终止目标控制。
- mode contextual hints：短时提示、常驻显示、手动临时隐藏、会话静默。

## Phase 4 — 预设与可复用策略（已完成）
- Generator Preset：save/apply/duplicate/edit/overwrite/delete/pin。
- 预设检索：名称搜索、标签过滤、quick-tag chips 一键筛选。
- 预设信息展示：notes、diff、当前选择状态标签。

## Phase 5 — Phrase 结构化编排（已完成）
- Phrase block 变换：顺阶/半音位移、flip、stretch、左右重排、复制。
- reference/frozen 双模式：
  - reference 跟随 motif 更新。
  - frozen 保留快照并可手动刷新。
- 拖拽体验：插槽式插入预览、Alt 复制拖拽、移动端 tap 重排。
- 长时间线支持：拖拽过程纵向+横向 auto-scroll。
- 选中状态可视：Phrase Builder 显示当前选中 block/区间标签。

## Phase 6 — 创作到练习（已完成）
- Practice Mode：按模式与难度生成练习包。
- 支持循环与 tempo lift，形成“创作-练习”闭环。

## 持续工程化（已完成部分）
- 自动化测试：核心生成与变换逻辑已有单元测试。
- 核心能力（如 frozen block、cadence target）已有回归测试样例。
- 新增 `io-utils.js` 共享 JSON 导入导出工具，统一 generator preset / project 状态的序列化与解析路径。
- 新增 generator preset bundle 与 JSON 解析错误处理测试，降低导入导出回归风险。

## 2026-03 迭代补充（工程化）
- 将重复的 JSON 导入导出逻辑抽离为 `io-utils.js`，统一 preset/project 的序列化与解析入口。
- 为 IO 工具补充回归测试：bundle 深拷贝、导入归一化过滤、JSON 异常处理、extract 过程防止源数据被 mapper 污染。
- 调整文档流程：TODO 恢复为纯 pending 清单，并新增下一重大版本（v0.8 候选）里程碑规划。

## 2026-03 迭代补充（UX）
- 新增可选紧凑布局开关（Compact Layout），适配小屏笔记本查看与操作密度。
- 新增轻量 onboarding tips：覆盖 generator 模式、motif provenance、morph trail、preset 工作流，并支持逐条隐藏与重置。
- Motif Library 新增收藏（star）能力与「仅收藏」筛选视图，提升常用素材回访效率。
- Motif 编辑改为 in-app dialog（名称/风格/标签），不再依赖该流程的 `window.prompt`，并保持对 phrase 引用块名称同步。
- Motif Library 新增多选与批量动作：全选当前筛选、批量加入 Phrase、批量收藏、批量删除。
- 稳定化 `cadence` 随机测试：将回归断言改为显式 `cadenceTarget: root` 并进行多轮采样，修复首次运行偶发失败。
