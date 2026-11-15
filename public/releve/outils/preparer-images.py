"""Prépare les images de la page depuis les captures de la fenêtre (dossier des captures en argument ou ~/Downloads/releve-captures-v1)."""
import os, sys
from PIL import Image
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/releve-captures-v1')
OUT = os.path.join(os.path.dirname(__file__), '..', 'images')
def ouvrir(n, t): return Image.open(os.path.join(SRC, f'{n}-{t}.png')).convert('RGB')
def sauver(im, n, t, large=1600):
    if im.width > large: im = im.resize((large, round(im.height * large / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, f'{n}-{t}.png'), optimize=True)
for t in ('clair', 'sombre'):
    # la fenêtre entière, haut de l'onglet Mises à jour : la scène 3D et la liste
    sauver(ouvrir('onglet-mises-a-jour', t).crop((0, 0, 1960, 1416)), 'fenetre', t)
    sauver(ouvrir('apres-mises-a-jour', t), 'fenetre-apres', t)
    sauver(ouvrir('onglet-catalogue', t).crop((400, 50, 1960, 940)), 'catalogue', t)
    apps = ouvrir('onglet-apps', t)
    sauver(apps.crop((450, 185, 1912, 320)), 'doublons', t)
    sauver(apps.crop((450, 1288, 1912, 1408)), 'session', t)
    sauver(ouvrir('onglet-mises-a-jour', t).crop((450, 1268, 1912, 1408)), 'mdp', t)
