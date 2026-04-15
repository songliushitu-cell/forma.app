---
description: 将 index.html 的改动提交并推送到 Git 远程仓库
---

## 使用场景
实施完一批改进后，需要将代码变更提交保存。

## 步骤

// turbo
1. 查看当前改动状态：
```
git -C /Users/songxuan/Desktop/jichuban status
```

// turbo
2. 查看具体改动内容（确认改动范围）：
```
git -C /Users/songxuan/Desktop/jichuban diff index.html
```

3. 根据改动内容，用一句话总结本次提交的核心改动（中文，格式：`[模块] 改动描述`，例如：`[报告] Stage3提示按分型细化训练方向`）。

// turbo
4. 暂存改动：
```
git -C /Users/songxuan/Desktop/jichuban add index.html
```

5. 提交（将 [commit message] 替换为第 3 步总结的内容）：
```
git -C /Users/songxuan/Desktop/jichuban commit -m "[commit message]"
```

6. 推送到远程：
```
git -C /Users/songxuan/Desktop/jichuban push
```

7. 确认推送成功后，告知用户提交完成，并说明本次提交包含的改动列表。
