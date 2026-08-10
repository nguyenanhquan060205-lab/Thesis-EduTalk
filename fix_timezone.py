import os
import re

for root, _, files in os.walk('backend/app'):
    for file in files:
        if file.endswith('.py'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if 'timezone.utc' in content and 'from datetime import timezone' not in content and 'from datetime import datetime, timezone' not in content:
                content = content.replace('from datetime import datetime', 'from datetime import datetime, timezone')

            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
