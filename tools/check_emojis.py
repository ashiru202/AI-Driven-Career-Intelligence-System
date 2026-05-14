from pathlib import Path

repo_root = Path(__file__).resolve().parents[1]
pages_dir = repo_root / 'frontend' / 'src' / 'pages'
found = []
for fname in sorted(p.name for p in pages_dir.iterdir()):
    if not fname.endswith('.jsx'):
        continue
    path = pages_dir / fname
    with open(path, encoding='utf-8') as f:
        for i, line in enumerate(f.readlines()):
            if any(ord(c) > 0x2600 for c in line):
                found.append(f'{fname}:{i+1}: {line.rstrip()}')

if found:
    for item in found[:80]:
        print(item)
    print(f'\nTotal: {len(found)} lines with emoji/special chars')
else:
    print('All clean - no emoji chars found!')
