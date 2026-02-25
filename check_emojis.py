import os

pages_dir = r'c:\Users\USER\AI-Driven-Career-Intelligence-System\frontend\src\pages'
found = []
for fname in sorted(os.listdir(pages_dir)):
    if not fname.endswith('.jsx'):
        continue
    path = os.path.join(pages_dir, fname)
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
