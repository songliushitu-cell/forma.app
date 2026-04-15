---
description: 将文档分析结果落地到 index.html，按优先级逐条实施评估逻辑和报告内容的改进
---

## 使用场景
已通过 read-resource-docs 或 analyze-single-doc 整理出改进清单，现在需要逐条实施到代码中。

## 步骤

1. 列出当前待实施的改进清单（从上一步的文档分析结果中获取），按以下优先级排序：
   - P1：评估逻辑/分类判断（影响结果准确性）
   - P2：训练阶段提示（影响训练指导价值）
   - P3：报告文字内容（影响用户理解）

2. 针对 P1 类改进，先定位相关函数：
   - 阈值/分型逻辑 → `buildAssessmentMetrics` / `buildCompressionIsolationResult` / `buildRotationIsolationResult`（约在第 1458-1635 行）
   - 训练阶段入口 → `buildRouteIsolationAssessment`（约在第 1601-1633 行）
   - 读取对应代码段后再修改，确保改动最小化

3. 针对 P2 类改进，定位 `STAGE_TIP` 常量（约在第 4279-4290 行），按阶段和 subType 更新。

4. 针对 P3 类改进，定位 `REPORT` 对象（约在第 4172-4239 行），修改对应分型的 what / feel / avoid / direction 字段。

5. 每次修改后，在回复中说明：
   - 修改了哪个函数/常量的哪个字段
   - 改动前后的核心差异是什么
   - 该改动对应文档中的哪段原文

6. 所有改动完成后，执行提交：使用 `/commit-changes` workflow。
