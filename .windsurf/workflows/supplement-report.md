---
description: 扫描资料文件夹，自动识别新文档并直接补充到评估逻辑和报告内容中，全程无需手动确认
---

## 使用场景
向资料文件夹添加了新文档后，用此命令一键完成：扫描 → 分析 → 写代码 → 提交。已读过的旧文档自动跳过。

## 步骤

// turbo
1. 运行扫描脚本（哈希比对，只处理新增/变化文档）：
```
python3 /Users/songxuan/Desktop/jichuban/scripts/read_docs.py
```

// turbo
2. 查看扫描结果：
```
cat /tmp/doc_summary.txt
```

3. 读取 `/tmp/doc_summary.txt`，判断是否有新文档：

   **情况A：无新文档**（输出含 `>>> 无新增或变化的文档`）
   → 回复用户「资料文件夹无更新，报告内容已是最新。」，结束。

   **情况B：有新文档**（输出含 `[NEW]` 或 `[UPDATED]`）
   → 继续执行步骤 4–8。

4. 分析新文档提取内容，按以下四类归类所有发现：

   **A. 评估逻辑改进**（数值阈值、分型判断规则）
   → 目标函数：`buildAssessmentMetrics` / `buildCompressionIsolationResult` / `buildRotationIsolationResult` / `buildRouteIsolationAssessment`（约第 1458–1635 行）

   **B. 训练阶段提示改进**（进出条件、各分型训练方向）
   → 目标位置：`STAGE_TIP` 常量（约第 4279–4290 行）

   **C. 报告内容补充**（体态描述、日常感受、应避免动作、处理方向）
   → 目标位置：`REPORT` 对象中对应分型的 `what` / `feel` / `avoid` / `direction` 字段（约第 4172–4239 行）

   **D. 暂不实施**（记录到 `改进历史.md` 的"备用"区）

5. 按 A → B → C 优先级，逐条直接修改 `/Users/songxuan/Desktop/jichuban/index.html`。
   每次修改后记录：改动位置、改动内容、来源文档名。

6. 将本次所有改动追加记录到 `/Users/songxuan/Desktop/jichuban/改进历史.md`：
   ```
   ## YYYY-MM-DD  来源：[文件名]
   - [A] 评估逻辑：xxx
   - [B] 训练提示：xxx
   - [C] 报告内容：xxx
   - [D] 备用：xxx
   ```

// turbo
7. 暂存 index.html：
```
git -C /Users/songxuan/Desktop/jichuban add index.html 改进历史.md
```

8. 生成中文 commit message（格式：`[补充] 来源文档名 · 改动摘要`），然后提交并推送：
```
git -C /Users/songxuan/Desktop/jichuban commit -m "[补充] <自动生成的描述>"
```
```
git -C /Users/songxuan/Desktop/jichuban push
```

9. 回复用户：本次从哪些新文档中提取了哪些改进，以及改动了 index.html 的哪些位置。
