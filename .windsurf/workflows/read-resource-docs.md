---
description: 批量读取资料文件夹内所有文档（doc/docx/pdf），提取与评估和报告相关的关键内容
---

## 使用场景
资料文件夹内有新增/更新文档时，用此 workflow 快速提取所有文档的评估相关内容，并整理出可落地的改进建议。

## 步骤

// turbo
1. 运行提取脚本，生成汇总文件：
```
python3 /Users/songxuan/Desktop/jichuban/scripts/read_docs.py
```

// turbo
2. 查看汇总结果：
```
cat /tmp/doc_summary.txt
```

3. 阅读 /tmp/doc_summary.txt 全文，按以下四类整理所有发现：

   **A. 评估逻辑改进**（影响 buildAssessmentMetrics / buildCompressionIsolationResult / buildRotationIsolationResult / buildRouteIsolationAssessment）
   - 新阈值（角度数值）
   - 新的分型或判断规则
   - 需要调整的判断逻辑顺序

   **B. 训练阶段/方向补充**（影响 STAGE_TIP / trainingStage 逻辑）
   - 阶段进出条件
   - 每种分型的「要减少/要建立」训练方向
   - 新的训练原则或注意事项

   **C. 报告内容补充**（影响 REPORT 对象中的 what / feel / avoid / direction 字段）
   - 体态特征的更精准描述
   - 日常感受的补充
   - 应避免的错误动作
   - 训练方向的措辞优化

   **D. 暂不实施（记录备用）**
   - 需要更多数据验证的发现
   - 超出当前系统范围的内容

4. 针对 A/B/C 类，逐条提出具体改进方案（精确到函数名和代码位置），供用户确认后执行。
