#!/usr/bin/env python3
"""
批量提取 资料/ 下所有文档的关键内容，输出到 /tmp/doc_summary.txt
支持 .doc / .docx / .pdf
- 哈希追踪：自动跳过未变化的文档，只处理 [NEW] / [UPDATED] 文件
- 哈希记录：scripts/.doc_hashes.json
"""

import os, re, subprocess, hashlib, json

FOLDER     = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '资料')
OUT        = '/tmp/doc_summary.txt'
TMP        = '/tmp/docs_extracted'
HASH_FILE  = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.doc_hashes.json')

os.makedirs(TMP, exist_ok=True)

# ── 关键词：评估逻辑 + 训练阶段 + 报告内容 + 禁忌/错误 ──────────────────────
KEYWORDS = [
    # 三大测试
    '直腿抬高', 'SLR', '肩关节屈曲', '肩屈', '髋屈', '髋关节屈曲',
    # 压缩分型
    '前压缩', '后压缩', '前倾', '后倾', 'Anterior', 'Posterior',
    # 偏移/旋转分型
    'left AIC', 'right BC', 'AIC', '左高右低', '斜向', '偏移', '旋转',
    # 评估动作/判断
    '评估', '检测', '测试', '判断', '三大测试', '下坠测试', '单腿站立',
    # 训练阶段
    '第一阶段', '第二阶段', '第三阶段', '阶段一', '阶段二', '阶段三',
    '入口', '退出', '进入', '达到后', '出口标准',
    # 训练方向/原则
    '训练目标', '训练方向', '训练原则', '要减少', '要建立',
    '重心', '承重', '装载', '站立期',
    # 解剖/结构
    '髂腰肌', '股直肌', '背阔肌', '腰方肌', '竖脊肌', '腘绳肌', '臀大肌',
    '腹斜肌', '内收肌', '胸骨下角', 'ISA', '窄肋骨', '宽肋骨',
    # 代偿与呼吸
    '代偿', '呼吸', '呼气', '吸气', '骨盆底',
    # 禁忌/错误做法
    '避免', '不要', '错误', '禁忌', '反而', '代偿性',
    # 体感/症状
    '紧绷', '酸胀', '疼痛', '麻木', '不稳',
]

# ── 哈希追踪 ────────────────────────────────────────────────────────────────
def load_hashes():
    if os.path.exists(HASH_FILE):
        with open(HASH_FILE, encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_hashes(hashes):
    with open(HASH_FILE, 'w', encoding='utf-8') as f:
        json.dump(hashes, f, ensure_ascii=False, indent=2)

def file_md5(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

# ── 文本提取 ────────────────────────────────────────────────────────────────
def extract_text(path, content_hash):
    dest = os.path.join(TMP, content_hash + '.txt')
    if os.path.exists(dest) and os.path.getsize(dest) > 100:
        with open(dest, encoding='utf-8', errors='ignore') as f:
            return f.read()

    ext = path.lower().rsplit('.', 1)[-1]
    if ext == 'pdf':
        subprocess.run(['pdftotext', path, dest], capture_output=True)
    elif ext in ('doc', 'docx'):
        subprocess.run(['textutil', '-convert', 'txt', '-output', dest, path], capture_output=True)

    if not os.path.exists(dest):
        return ''
    with open(dest, encoding='utf-8', errors='ignore') as f:
        return f.read()

# ── 关键词片段提取 ───────────────────────────────────────────────────────────
def extract_snippets(text, max_per_kw=3, ctx=150):
    results = []
    seen = set()
    for kw in KEYWORDS:
        count = 0
        for m in re.finditer(re.escape(kw), text, re.IGNORECASE):
            s = max(0, m.start() - ctx)
            e = min(len(text), m.end() + ctx)
            snippet = text[s:e].replace('\n', ' ').strip()
            sig = snippet[:50]
            if sig not in seen and len(snippet) > 20:
                seen.add(sig)
                results.append((kw, snippet))
                count += 1
                if count >= max_per_kw:
                    break
    return results

# ── 主流程 ───────────────────────────────────────────────────────────────────
stored_hashes = load_hashes()
new_hashes    = dict(stored_hashes)

lines         = []
cnt_new       = 0
cnt_updated   = 0
cnt_skipped   = 0
new_file_list = []  # 本次处理的新/更新文件名

files = sorted(os.listdir(FOLDER))

for fname in files:
    if not re.search(r'\.(doc|docx|pdf)$', fname, re.IGNORECASE):
        continue

    fpath   = os.path.join(FOLDER, fname)
    cur_md5 = file_md5(fpath)
    prev    = stored_hashes.get(fname)

    if prev == cur_md5:
        cnt_skipped += 1
        continue  # 文件未变化，跳过

    status = '[NEW]' if prev is None else '[UPDATED]'
    if status == '[NEW]':
        cnt_new += 1
    else:
        cnt_updated += 1

    new_hashes[fname] = cur_md5
    new_file_list.append(fname)

    text = extract_text(fpath, cur_md5)
    if not text.strip():
        lines.append(f'\n{"="*60}')
        lines.append(f'{status} FILE: {fname}  (空/提取失败)')
        lines.append('='*60)
        continue

    snippets = extract_snippets(text)
    lines.append(f'\n{"="*60}')
    lines.append(f'{status} FILE: {fname}  ({len(text)//1000}K字)')
    lines.append('='*60)
    if not snippets:
        lines.append('  (未匹配到评估/训练相关关键词，建议人工阅读原文)')
    for kw, snip in snippets:
        lines.append(f'  [{kw}] ...{snip}...')

# ── 写入输出 & 更新哈希记录 ──────────────────────────────────────────────────
summary_header = [
    '=' * 60,
    f'扫描完成  {__import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M")}',
    f'新增文档: {cnt_new}  |  更新文档: {cnt_updated}  |  跳过(未变化): {cnt_skipped}',
    '=' * 60,
]
if new_file_list:
    summary_header.append('本次处理文件:')
    for f in new_file_list:
        summary_header.append(f'  • {f}')
else:
    summary_header.append('>>> 无新增或变化的文档，报告内容已是最新。')

all_lines = summary_header + lines

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(all_lines))

save_hashes(new_hashes)

print('\n'.join(summary_header))
print(f'\n详细内容已写入 {OUT}')
