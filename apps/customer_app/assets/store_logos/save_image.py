#!/usr/bin/env python3
import sys, json, base64, os

out_file = sys.argv[1]
for line in sys.stdin:
    line = line.strip()
    if not line.startswith('{'):
        continue
    try:
        d = json.loads(line)
        if 'images' in d:
            data = base64.b64decode(d['images'][0]['result'])
            with open(out_file, 'wb') as f:
                f.write(data)
            print(f"Saved: {out_file} ({len(data)} bytes)")
            break
        elif 'error' in d:
            print(f"API error: {d}", file=sys.stderr)
    except Exception as e:
        pass
