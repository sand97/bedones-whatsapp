# US-011 - Page Forfaits et menu dedie

Statut: Implementee
Priorite: Moyenne
Zone: `apps/frontend`

## Suivi superviseur

- 2026-03-07: Menu `Forfaits` ajoute dans `General` avec route dediee
- 2026-03-08: La page a ete refondue avec une URL anglaise `/pricing`, une selection de duree
  (1, 6, 12 mois), des cartes centrees sur le volume de messages et un affichage des moyens de
  paiement
- 2026-03-08: Ajustements UX appliques sur `/pricing` avec suppression du CTA Free, messages
  reformules cote utilisateur, promo reservee aux plans payants non actifs et bandeau moyens de
  paiement centre sans card d'introduction
- 2026-03-08: La pastille `Plan actuel : ...` a ete retiree du header pour alleger l'entete et
  laisser uniquement le statut dans les cartes de plan
- 2026-03-08: Refonte visuelle majeure de `/pricing` dans une logique inspiree des pages pricing
  SaaS, avec hero dedie dans le contenu de page, effets rectangulaires decoratifs et grille de
  comparaison basee sur les capacites reelles des tools de l'agent WhatsApp, tout en gardant le
  shell dashboard standard
- 2026-03-08: La page a ete reprise de zero apres revue visuelle via captures MCP pour se rapprocher
  d'une structure pricing claire type Vercel: fond clair quadrille, hero centre, controle de
  duree compact et bloc principal en 3 colonnes sans header de page
- 2026-03-08: Ajustement de densite visuelle avec suppression du texte hero, badges francises,
  prix Free harmonise en `0€ / 7 jours`, descriptions raccourcies et utilisation accrue de la
  largeur disponible pour eviter les colonnes comprimees
- 2026-03-08: Nouvelle passe de composition validee par captures MCP sur `/pricing` avec reduction
  du padding lateral, suppression du vide inutile dans les colonnes, descriptions re-etalees sur
  la largeur utile et meilleur alignement vertical des blocs prix
- 2026-03-08: Finition visuelle de `/pricing` avec grille decorative allegee, mise en avant du
  plan `Pro` par un fond blanc et libelles de features compactes pour limiter les retours a la
  ligne dans `Free` et `Business`
- 2026-03-08: Nettoyage final de la structure visuelle sur `/pricing` avec suppression du
  quadrillage double, ancrage des lignes decoratives au debut de la section des cartes et retrait
  des coins arrondis du shell dashboard pour cette page
- 2026-03-08: Ajustement de contenu sur `/pricing` avec retrait de la limitation "notes vocales"
  du plan `Free` et ajout de cette capacite dans le plan `Pro`
- 2026-03-08: Polissage final du `Segmented` avec hover conserve en pilule et suppression de la
  ligne dupliquee en tete de la section pricing
- 2026-03-08: Badge `Populaire` du plan `Pro` repositionne sur l'arete haute avec un arrondi
  inferieur droit plus proche de la reference visuelle type Vercel
- 2026-03-08: Badge `Populaire` encore affine avec une empreinte plus petite pour se rapprocher du
  volume visuel de la reference Vercel
- 2026-03-08: Badge `Populaire` repositionne hors de la carte `Pro`, au-dessus du cadre blanc,
  avec un seul arrondi superieur droit conformement au rendu souhaite
- 2026-03-08: Systeme de grille rapproche de Vercel avec quadrillage reserve au bloc superieur
  (segmented + paiements) et suppression des lignes de fond a l'interieur des cartes pricing
- 2026-03-08: Systeme de grille corrige apres revue MCP avec un champ quadrille superieur plus
  haut et borde, tandis que la section des cartes reste nette sans quadrillage interne
- 2026-03-08: Pas de grille harmonise sur `/pricing` avec un bloc superieur cale sur des hauteurs
  regulieres et des colonnes verticales reparties uniformement pour supprimer les ecarts incoherents
- 2026-03-08: Bloc `Paiements acceptes` deplace en bas de page, champ superieur compacte pour
  remonter les offres a l'ouverture, et quadrillage refait avec des traits interieurs controles
  afin d'eliminer les doubles bordures
- 2026-03-08: Les montants des plans ont ete redimensionnes pour retrouver le meme gabarit visuel
  que les titres et une hierarchie plus sobre a l'ouverture de page
- 2026-03-08: La grille remonte desormais jusqu'en haut de `/pricing`, le `Segmented` est recentre
  dans le champ superieur, les prix ont ete legerement rehausses et le bouton menu mobile a perdu
  son ombre parasite
- 2026-03-08: Le shell desktop de `/pricing` n'ajoute plus d'espace en tete, ce qui permet au
  quadrillage de toucher le bord superieur, et la bordure horizontale haute du bloc pricing a ete
  retiree pour eviter le trait inutile en sommet d'ecran
- 2026-03-08: Le conteneur principal de `/pricing` a ete borne par une largeur maximale afin que
  les cartes n'occupent plus tout l'espace disponible sur les tres grands ecrans
- 2026-03-08: Correction de la passe precedente sur `/pricing`: la largeur maximale ne s'applique
  plus a tout le conteneur, mais uniquement a la grille des cartes, afin de garder le champ
  superieur pleine largeur tout en bornant correctement les colonnes pricing
- 2026-03-08: Correction structurelle de la grille `/pricing`: suppression de la borne de largeur
  appliquee a tort, retour a une grille pleine largeur dans le content et ajout de `min-w-0` sur
  les cartes pour empecher le contenu interne de forcer un elargissement parasite des colonnes
- 2026-03-08: La largeur des cartes `/pricing` suit maintenant une vraie logique responsive:
  grille fluide sur desktop, plafond de lecture applique seulement a `xl/2xl`, validation
  visuelle faite a 1440, 1500 et 1680 pour eviter une correction ciblee sur une seule largeur
- 2026-03-08: Passe responsive refaite sur `/pricing` avec une grille `auto-fit/minmax` pilotee
  par la largeur reelle du content: 1 colonne a 1024/768/mobile, 2 colonnes a 1200, 3 colonnes
  quand l'espace disponible redevient suffisant (controle visuel jusqu'a 1680)
- 2026-03-08: Restauration du layout pricing retenu apres regression, en reprenant le rendu valide
  par capture MCP: bloc superieur quadrille sans hero, cartes Free/Pro/Business en colonnes
  propres, badge `Populaire` fixe sur `Pro`, CTA payants en pilule et moyens de paiement laisses
  en bas de page
- 2026-03-08: Passe de finition ciblee sur `/pricing` avec suppression des doubles bordures,
  suppression de la bordure haute, hauteur du bloc quadrille fixee a `150px` et reutilisation du
  style de `Segmented` deja present sur la page `stats`
- 2026-03-08: Ajustement de precision sur `/pricing` avec badge `Populaire` replace sur l'arete
  haute de `Pro` et quadrillage du bloc superieur realigne pour eviter le double trait visible
  contre la grille des cartes

## User story

En tant qu'utilisateur, je veux consulter les differentes offres d'abonnement afin de comprendre les ecarts entre les plans et choisir la formule adaptee.

## Contexte

Le dashboard affiche deja un etat de forfait (`Free`) mais la navigation ne propose pas encore de page dediee. Il faut ajouter un menu `Forfaits` dans la section `General` et y presenter 3 plans de facturation.

## Taches

- Ajouter un item `Forfaits` dans la navigation `General`
- Creer une route et une page dediee
- Afficher 3 plans de facturation
- Prevoir un design coherent avec le dashboard actuel

## Criteres d'acceptation

- Le menu `Forfaits` est visible dans `General`
- La page presente 3 plans de facturation distincts
- Chaque plan affiche au minimum un nom, un resume et un CTA
- Le plan courant de l'utilisateur peut etre mis en avant si l'information est disponible

## Dependances

- Peut etre relie plus tard a la card Forfait du dashboard
