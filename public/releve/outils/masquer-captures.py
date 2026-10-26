from PIL import Image, ImageDraw, ImageFont
import os
C='/private/tmp/claude-502/-Users-l-hirschauer-lucashi-apps/0ce07a8d-bda3-462c-9631-5271e23a6a01/scratchpad/captures/'
OUT=os.path.expanduser('~/Releve/site/images/')
SF='/System/Library/Fonts/SFNS.ttf'; MONO='/System/Library/Fonts/SFNSMono.ttf'
def lum(p): return sum(p)/3
def ink_color(im,box,bg,dark):
    best=None
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2],1):
            p=im.getpixel((x,y))
            if best is None or (dark and lum(p)>lum(best)) or (not dark and lum(p)<lum(best)): best=p
    return best
def banner(im,dark):
    # efface le bandeau d'essai : recopie la ligne juste en dessous, colonne par colonne
    W,H=im.size
    for y in range(0,56):
        for x in range(400,W):
            im.putpixel((x,y),im.getpixel((x,58)))
def remplacer(im,box,texte,dark,size=26.8,font=SF,base=None,bgxy=None,color=None):
    x0,y0,x1,y1=box
    bg=im.getpixel(bgxy)
    col=color or ink_color(im,box,bg,dark)
    d=ImageDraw.Draw(im); d.rectangle(box,fill=bg)
    f=ImageFont.truetype(font,size)
    try: f.set_variation_by_name('Regular')
    except Exception: pass
    b=base if base is not None else y1-6
    d.text((x0+1,b),texte,font=f,fill=col,anchor='ls')
def apps(nom,dark,final):
    im=Image.open(C+nom).convert('RGB'); banner(im,dark)
    lignes=['/Applications','~/Applications · 1.4.1 publiée','~/Applications · 1.3.1 publiée','~/Applications · 1.1.2 publiée','~/Applications · 0.6.3 publiée','/Applications','~/Applications · copie plus ancienne','/Applications · 0.1.1 publiée','~/Applications · 0.4.0 publiée','/Applications · en session « Voile protégé »']
    if final: lignes[7]='/Applications'; lignes[8]='~/Applications'
    ends=[1545,1440,1440,1440,1440,1545,1475,1440,1440,1590]
    for k,t in enumerate(lignes):
        y0=238+118*k; y1=y0+22
        # fenetre de texte : x 570 -> juste avant le badge
        box=(566,y0-3,ends[k],y1+8)
        remplacer(im,box,t,dark,base=y1-5,bgxy=(556,y0+6))
    W,H=im.size
    card=im.getpixel((900,1000)); page=im.getpixel((1000,20))
    d=ImageDraw.Draw(im)
    xs=[x for x in range(410,W) if im.getpixel((x,1000))==card]; xa,xb=min(xs),max(xs)
    yb=1346
    d.rectangle((405,yb,W,H),fill=page)
    r=20
    for cx,cy,sx in ((xa,yb-1,1),(xb,yb-1,-1)):
        for dy in range(r):
            for dx in range(r):
                px=cx+sx*dx; py=cy-dy
                # distance au centre du coin arrondi
                ccx=cx+sx*(r-1); ccy=cy-(r-1)
                if (px-ccx)**2+(py-ccy)**2>r*r: im.putpixel((px,py),page)
    return im
def maj_avant(dark):
    im=Image.open(C+'onglet-mises-a-jour-%s.png'%('sombre' if dark else 'clair')).convert('RGB'); banner(im,dark)
    ts=['~/Applications']*4+['/Applications · mot de passe administrateur','~/Applications']
    for k,t in enumerate(ts):
        p1=238+140.2*k
        y0=int(p1)-2; y1=int(p1+(52 if k<5 else 58))
        box=(566,y0,1335,y1)
        remplacer(im,box,t,dark,base=int(p1)+18,bgxy=(556,y0+5),size=26.8)
    return im
def journal(dark):
    im=Image.open(C+'apres-journal-%s.png'%('sombre' if dark else 'clair')).convert('RGB'); banner(im,dark)
    bg=(30,31,33)
    col=ink_color(im,(480,788,900,812),bg,True)
    f=ImageFont.truetype(MONO,24.7); f.set_variation_by_name('Medium')
    box=(466,822,1880,884)
    d=ImageDraw.Draw(im); d.rectangle(box,fill=im.getpixel((1000,1300)))
    d.text((471,846),'16:58:00 Lueur · prête ; remplacement avec le mot de passe administrateur',font=f,fill=col,anchor='ls')
    d.text((471,876),'(/Applications)',font=f,fill=col,anchor='ls')
    return im
def save(im,nom):
    im.save(OUT+nom,optimize=True)
if __name__=='__main__':
    for dark in (False,True):
        s='sombre' if dark else 'clair'
        save(apps('onglet-apps-%s.png'%s,dark,False),'apps-%s.png'%s)
        save(maj_avant(dark),'maj-avant-%s.png'%s)
        im=Image.open(C+'apres-mises-a-jour-%s.png'%s).convert('RGB'); banner(im,dark); save(im,'maj-apres-%s.png'%s)
        save(journal(dark),'journal-%s.png'%s)
        im=Image.open(C+'onglet-decouvrir-%s.png'%s).convert('RGB'); banner(im,dark); save(im.crop((0,0,1960,560)),'decouvrir-%s.png'%s)
    # recadrages des écrans déjà masqués
    for s in ('clair','sombre'):
        a=Image.open(OUT+'apps-%s.png'%s); a.crop((420,750,1960,1000)).save(OUT+'doublons-%s.png'%s,optimize=True)
        a.crop((420,1233,1960,1348)).save(OUT+'session-%s.png'%s,optimize=True)
        m=Image.open(OUT+'maj-avant-%s.png'%s); m.crop((420,733,1960,874)).save(OUT+'mdp-%s.png'%s,optimize=True)
        Image.open(OUT+'journal-%s.png'%s).crop((420,40,1960,1416)).save(OUT+'journal-log-%s.png'%s,optimize=True)
        Image.open(OUT+'decouvrir-%s.png'%s).crop((420,40,1330,540)).save(OUT+'decouvrir-carte-%s.png'%s,optimize=True)
        a.crop((444,752,1920,1000)).save(OUT+'doublons-%s.png'%s,optimize=True)
        a.crop((444,1234,1920,1347)).save(OUT+'session-%s.png'%s,optimize=True)
        m.crop((444,734,1920,873)).save(OUT+'mdp-%s.png'%s,optimize=True)
