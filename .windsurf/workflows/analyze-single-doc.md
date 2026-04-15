---
description: 深度分析单个新文档，快速提取与骨盆评估/报告相关的所有有价值信息
---

## 使用场景
用户新增了一个文档（.doc/.docx/.pdf），需要快速了解其内容并判断对评估逻辑/报告有何帮助。

## 步骤

1. 确认文档路径（用户提供文件名，默认在 /Users/songxuan/Desktop/jichuban/资料/ 目录下）。

// turbo
2. 提取文档文本（根据文件类型选择命令）：

   - PDF 文件：
   ```
   pdftotext "/Users/songxuan/Desktop/jichuban/资料/[文件名].pdf" /tmp/new_doc.txt
   ```
   - DOC/DOCX 文件：
   ```
   textutil -convert txt -output /tmp/new_doc.txt "/Users/songxuan/Desktop/jichuban/资料/[文件名].docx"
   ```

// turbo
3. 查看提取内容：
```
cat /tmp/new_doc.txt
```

4. 阅读全文后，按以下结构整理输出：

   ### 文档定性
   - 文档类型：（原理解析 / 训练方案 / 答疑记录 / 评估工具 / 其他）
   - 与现有系统的相关度：高 / 中 / 低
   - 一句话核心内容：

   ### 可落地的改进点

   **① 评估逻辑层**（数值阈值、判断规则、分型逻辑）
   - 若有：列出具体数值和规则，注明影响哪个函数

   **② 训练阶段层**（STAGE_TIP / trainingStage 入口判断）
   - 若有：列出具体出入条件，和「要减少/要建立」方向

   **③ 报告内容层**（what / feel / avoid / direction 字段）
   - 若有：列出需要补充或修改的措辞

   **④ 暂不实施**
   - 记录有价值但暂不确定如何落地的内容

5. 询问用户：「以上改进点，哪几条需要现在实施？」，等待确认后执行。
