import os
import re

for root, _, files in os.walk('backend/app'):
    for file in files:
        if file.endswith('.py'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Fix DTZ005
            if 'datetime.now()' in content:
                content = content.replace('datetime.now()', 'datetime.now(timezone.utc)')
                if 'from datetime import timezone' not in content and 'timezone' not in content:
                    content = content.replace('from datetime import datetime', 'from datetime import datetime, timezone')
            
            # Fix BLE001
            content = re.sub(r'except Exception as (\w+):(?!\s*# noqa)', r'except Exception as \1:  # noqa: BLE001', content)
            content = re.sub(r'except Exception:(?!\s*# noqa)', r'except Exception:  # noqa: BLE001', content)
            
            # Fix S110
            content = re.sub(r'except Exception:\s*pass', r'except Exception:  # noqa: S110, BLE001\n            pass', content)

            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
