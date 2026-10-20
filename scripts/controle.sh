#!/usr/bin/env bash
# Contrôle bloquant avant tout push : aucune donnée privée dans les fichiers texte du site.
# Refuse : noms de clients, chemins de la machine, jetons, adresses e-mail, liens vers un dépôt privé.
# Usage : scripts/controle.sh [dist]   (code de sortie 1 = refus). Avec un dossier (dist/), contrôle aussi les fichiers construits. Les motifs sont écrits avec des crochets
# pour que ce fichier ne contienne pas lui-même les mots qu'il interdit.
set -u
cd "$(dirname "$0")/.."
ECHEC=0
refuse() { echo "REFUS ($1) :"; echo "$2" | cut -c1-200 | head -8; ECHEC=1; }

FICHIERS=$(git ls-files -co --exclude-standard 2>/dev/null | grep -v '^\.git/')
if [ -n "${1:-}" ]; then
  [ -d "$1" ] || { echo "dossier introuvable : $1 (lancer d'abord npm run build)"; exit 1; }
  FICHIERS=$(printf '%s\n%s' "$FICHIERS" "$(find "$1" -type f ! -name '.DS_Store')")
fi
[ -z "$FICHIERS" ] && { echo "aucun fichier à contrôler"; exit 1; }

cherche() { # $1 = étiquette, $2 = motif (grep -E, insensible à la casse si $3=i)
  local opt="-HnIoE"; [ "${3:-}" = "i" ] && opt="-HnIoEi"
  local r; r=$(echo "$FICHIERS" | tr '\n' '\0' | xargs -0 grep $opt -e "$2" 2>/dev/null | grep -viE "${4:-^\$}" | head -8)
  [ -n "$r" ] && refuse "$1" "$r"
}

cherche "nom de client" 'S[K]OLAE|Kord[i]s|Reply[ _-]?Wiz[a]rd|gitlab\.kord|E[S]GI\b|ecole[w]\.com|Skol[a]e' i
cherche "chemin de la machine" '/Us[e]rs/[A-Za-z0-9._-]+|/Vol[u]mes/[A-Za-z0-9._-]+|/priv[a]te/var'
cherche "jeton" 'gh[pousr]_[A-Za-z0-9]{20,}|github_p[a]t_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKI[A]{1}[0-9A-Z]{16}|xox[bpa]-[A-Za-z0-9-]{10,}|BEGIN [A-Z ]*PRIVATE KE[Y]|[Bb]earer [A-Za-z0-9._-]{20,}'
cherche "adresse e-mail" '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.(com|fr|net|org|io|dev|eu|app|co|me|ch|be)\b' i 'exemple|example'

# Liens vers un dépôt : seuls les dépôts publics *-releases et ce site sont admis.
LIENS=$(echo "$FICHIERS" | tr '\n' '\0' | xargs -0 grep -hIoE 'github\.com/LucasHRCHatReply/[A-Za-z0-9._-]+' 2>/dev/null | sort -u)
for l in $LIENS; do
  nom=${l##*/}; nom=${nom%.git}
  case "$nom" in
    *-releases|lucashi-apps) ;;
    *) refuse "lien vers un dépôt non public" "$l" ;;
  esac
  # et, si gh répond, le dépôt doit être réellement public
  if command -v gh >/dev/null 2>&1 || [ -x "$HOME/.local/bin/gh" ]; then
    GH=$(command -v gh || echo "$HOME/.local/bin/gh")
    v=$("$GH" api "repos/LucasHRCHatReply/$nom" --jq .private 2>/dev/null || echo "?")
    [ "$v" = "true" ] && refuse "dépôt privé" "$l"
  fi
done

[ $ECHEC -eq 0 ] && echo "contrôle : rien de privé ($(echo "$FICHIERS" | wc -l | tr -d ' ') fichiers)"
exit $ECHEC
