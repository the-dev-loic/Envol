#!/usr/bin/env python3
"""Met à jour la liste des fichiers du jeu dans sw.js (pour le hors connexion)
et change la version du cache à partir du contenu des fichiers.
À lancer avant chaque commit :  python3 tools/update-sw.py
"""
import datetime, hashlib, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
exts = {'.js', '.html', '.css', '.png', '.webmanifest'}
files = sorted(
    p for p in root.rglob('*')
    if p.is_file() and p.suffix in exts and '.git' not in p.parts and 'tools' not in p.parts
    and p.name not in ('sw.js', 'admin.html')  # la page de contrôle n'a pas besoin d'être hors connexion
) + [root / 'reglages.json']
h = hashlib.sha1()
for p in files:
    if p.name != 'version.js':  # généré ci-dessous, ne compte pas dans l'empreinte
        h.update(p.read_bytes())
version = h.hexdigest()[:10]
listing = ",\n".join(f"  './{p.relative_to(root).as_posix()}'" for p in files)

sw = root / 'sw.js'
src = sw.read_text()
src = re.sub(r"const CACHE = '[^']*';", f"const CACHE = 'envol-{version}';", src)
src = re.sub(r"const FILES = \[[^\]]*\];", "const FILES = [\n  './',\n" + listing + ",\n];", src, flags=re.S)
sw.write_text(src)

# Numéro de version affiché dans le menu (pour vérifier sur le téléphone que la mise à jour est arrivée)
stamp = datetime.datetime.now().strftime('%d/%m %H:%M')
(root / 'src' / 'version.js').write_text(
    f"// Généré par tools/update-sw.py — ne pas modifier à la main.\nexport const VERSION = '{stamp} · {version[:6]}';\n")
print(f"sw.js : {len(files)} fichiers, cache envol-{version}")
