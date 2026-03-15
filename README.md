# Project Mozart

一个无需后端即可直接打开的 Web 原型，用来生成、编辑、堆叠、练习单线条旋律。

## 功能

- `Pattern Sequencer`
  - 点击网格编辑单线条旋律。
  - 支持音符时值、力度、articulation、每音 cents 偏移。
- `Motif Library`
  - 将当前 pattern 保存为 motif。
  - motif 可以载入、加入 phrase、转调、生成尾句。
- `Generator Forge`
  - 基于音阶约束、密度、最大跳进、重复率、惊喜度、张力曲线生成旋律。
  - 支持新 motif、变体、续写、call/response。
- `Practice Mode`
  - 从当前素材生成难度递进、转调、限制条件和 call/response 练习包。
- `Playback + MIDI`
  - 浏览器内置 Web Audio 回放。
  - 导出标准 `.mid` 文件。

## 使用方式

1. 直接在浏览器打开 [index.html](./index.html)。
2. 或者在当前目录启动任意静态文件服务器后访问首页。

## MIDI 导出策略

- 使用单轨、单声部 MIDI。
- 每个音符的 `offsetCents` 会编码为该音符开始前的 pitch bend，结束后重置到中心值。
- 导出假定 pitch bend range 为 `±2 semitones`，适合当前单线条旋律工作流。

## 测试

在当前目录运行：

```powershell
node --test .\tests\core.test.js
```
