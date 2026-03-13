# US-002 - Dashboard polish et actions

Statut: Termine
Priorite: Haute
Zone: `apps/frontend`

## User story

En tant qu'utilisateur du dashboard, je veux une page d'accueil plus lisible et plus coherente visuellement afin d'identifier rapidement mes actions utiles.

## Contexte

La page `dashboard.tsx` contient plusieurs ajustements UI ponctuels a livrer sans changer l'identite visuelle globale des composants.

## Taches

- Renommer le bloc `Plan et usage` en `Usages et plan`
- Faire pointer le bouton de la card usage vers `/stats`
- Aligner le bouton `Passer a la version Pro` sur le design du bouton `Activer l'IA`
- Modifier la card Forfait pour afficher `Free` en texte noir sur fond vert
- Remplacer les icones `GoogleOutlined` et `FacebookOutlined` par les SVG fournis
- Faire pointer l'action Facebook vers `https://moderator.bedones.com`
- Creer une classe CSS reutilisable pour les liens soulignes verts sur fond clair

## Criteres d'acceptation

- Les liens de type `Exclure des contacts` utilisent une classe reutilisable et non du style inline
- Cette classe applique un texte noir en `font-semibold`
- Le soulignement reste vert au repos et au hover
- Au hover, seule l'epaisseur du soulignement augmente; la couleur du texte ne change pas
- Le badge `Free` de la card forfait reste lisible sur tous les fonds clairs
- Le bouton `Passer a la version Pro` reprend les memes codes visuels que `Activer l'IA`
- La card usage amene bien vers `/stats`
- Le bouton Facebook ouvre `https://moderator.bedones.com`

## Notes techniques

- La classe de lien peut vivre dans `apps/frontend/app/app.css`
- Garder l'usage de composants Ant Design la ou cela reste pertinent
- Eviter d'introduire des variantes de bouton ad hoc si une classe ou un token existant suffit

## Dependances

- Recommande apres `US-001`

## Suivi superviseur

- Date: 2026-03-07
- Etat: Ajustements UI dashboard livres
- Resultat: bloc renomme en `Usages et plan`, CTA usage vers `/stats`, bouton Pro aligne sur `Activer l'IA`
- Complements livres: badge `Free` noir sur fond vert, SVG Google/Facebook remplaces, action Facebook vers `https://moderator.bedones.com`, classe CSS reutilisable pour les liens soulignes verts
- Verification: `pnpm --filter frontend build` OK
