#!/usr/bin/env python3
"""Met à jour la liste des fichiers du jeu dans sw.js (pour le hors connexion)
et change la version du cache à partir du contenu des fichiers.
À lancer avant chaque commit :  python3 tools/update-sw.py
"""
import hashlib, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
exts = {'.js', '.html', '.css', '.png', '.webmanifest'}
files = sorted(
    p for p in root.rglob('*')
    if p.is_file() and p.suffix in exts and '.git' not in p.parts and 'tools' not in p.parts and p.name != 'sw.js'
)
h = hashlib.sha1()
for p in files:
    h.update(p.read_bytes())
version = h.hexdigest()[:10]
listing = ",\n".join(f"  './{p.relative_to(root).as_posix()}'" for p in files)

sw = root / 'sw.js'
src = sw.read_text()
src = re.sub(r"const CACHE = '[^']*';", f"const CACHE = 'envol-{version}';", src)
src = re.sub(r"const FILES = \[[^\]]*\];", "const FILES = [\n  './',\n" + listing + ",\n];", src, flags=re.S)
sw.write_text(src)
print(f"sw.js : {len(files)} fichiers, cache envol-{version}")
