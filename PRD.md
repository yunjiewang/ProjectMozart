# Project Mozart PRD（High-Level）

## 1. 产品定位
Project Mozart 是一个**纯前端、无需后端**的旋律创作与练习工作台，面向需要快速产出单线条音乐素材的创作者（学习者、编曲初学者、即兴练习者）。

核心价值：
- 在同一界面完成「生成 → 编辑 → 组织 → 练习 → 导出」。
- 用可解释、可控的参数化生成，替代纯黑盒随机。
- 通过 motif / phrase / practice 三层工作流，降低从灵感到可练习素材的转换成本。

## 2. 目标用户
- 初中级乐理用户：希望快速做出可用旋律片段。
- 练习导向用户：希望从已有素材自动生成训练任务。
- 轻量工作流用户：希望本地打开即用，不依赖服务端。

## 3. 核心使用场景
1. **灵感起步**：用户在 Generator Forge 调参数，一键生成 motif 草案。
2. **结构组织**：用户把多个 motif 加入 Phrase Builder，做变形、重排、冻结引用。
3. **定向练习**：用户将当前 phrase/motif 生成 drill pack，按难度循环练习。
4. **结果导出**：用户导出 MIDI 进入 DAW 或分享给他人继续编配。

## 4. 功能域（High-Level Requirements）

### A. Pattern Sequencer（基础编辑）
- 网格编辑单线条音符。
- 支持时值、力度、articulation、音高微分偏移（cents）。
- 支持播放预听与基础编辑操作（删除、转调、反向、拉伸等）。

### B. Generator Forge（可控生成）
- 参数化生成：密度、跳进上限、重复率、惊喜度、张力曲线。
- 生成模式：new / variation / continuation / response / tail / cadence。
- 支持 Form / Cell / Surprise Zone 锁定与 cadence target 终止偏好控制。
- 提供可理解的上下文提示（mode hint）降低参数理解门槛。

### C. Motif Library（资产复用）
- motif 的保存、检索、编辑、复制、删除。
- 支持标签、风格、难度、来源等元信息过滤。
- motif 可一键加载、加入 phrase、桥接至 generator 参数。

### D. Phrase Builder（结构化编排）
- 以 block 为单位拼装 phrase。
- block 级变换（顺阶/半音位移、翻转、拉伸、重排、复制）。
- reference / frozen 关系模式：允许“跟随源 motif”或“冻结快照”。
- 支持插槽式拖放、移动端 tap 重排、拖拽 auto-scroll（纵向/横向）。

### E. Practice Mode（训练闭环）
- 基于当前素材生成练习包。
- 支持不同训练模式、循环次数与节奏抬升。
- 目标是将创作结果转化为可执行训练动作。

### F. 数据与工程能力
- 本地状态持久化、导入导出、撤销重做、历史记录。
- 无后端部署：静态资源即可运行。
- MIDI 导出满足单旋律线传递需求。

## 5. 非功能需求（High-Level）
- **可用性**：新用户应在 10 分钟内完成“生成-保存-组合-导出”首个闭环。
- **可解释性**：关键生成参数和模式具备可视化或提示文案。
- **稳定性**：核心生成与变换流程应有自动化测试覆盖。
- **性能**：中等规模 motif/phrase 列表下保持可交互流畅。

## 6. 成功指标（建议）
- 首次会话完成一次 MIDI 导出的用户占比。
- motif 保存后被复用（加入 phrase / bridge）的比例。
- practice 模式使用率与重复会话率。
- 关键操作（生成、拖拽、导出）失败率。
