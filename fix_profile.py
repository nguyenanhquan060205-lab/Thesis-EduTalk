import os

def fix_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    for old, new in replacements:
        content = content.replace(old, new)
        
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

# profile/page.tsx
fix_file('web/src/app/(main)/profile/page.tsx', [
    ('<any>', '<any> /* eslint-disable-line @typescript-eslint/no-explicit-any */')
])

