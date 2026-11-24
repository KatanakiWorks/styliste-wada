# Styliste Wada (nom provisoire)

Styliste de poche pour iOS et Android (Expo SDK 58). Photographiez vos vêtements, l'app compose des tenues avec les 348 combinaisons du *Dictionary of Color Combinations* de Sanzo Wada, les montre sur une silhouette 3D et note votre look devant le miroir.

## Démarrer

```bash
npm install
npx expo start
```

Scannez le QR code avec **Expo Go** (tous les modules utilisés y sont inclus).

## Votre clé Gemini

L'analyse des pièces, les conseils, le Mirror Check et le lookbook utilisent l'API Gemini de Google. **Chaque utilisateur utilise sa propre clé** :

1. Créez une clé gratuite sur https://aistudio.google.com/apikey.
2. Dans l'app : **Placard → Paramètres → Clé API Gemini**, collez-la, puis « Vérifier et enregistrer ».

La clé est vérifiée auprès de Google, puis chiffrée sur le téléphone (Keychain iOS / Keystore Android via `expo-secure-store`). Elle n'est jamais écrite dans le code ni envoyée ailleurs que chez Google. Sans clé, l'app fonctionne quand même : on renseigne les pièces à la main.

La génération d'images (lookbook) nécessite la facturation activée sur Google AI Studio ; le reste fonctionne avec l'offre gratuite.

**Développement uniquement** : vous pouvez mettre une clé dans `.env` (voir `.env.example`). Elle est alors incluse dans le bundle : ne commitez jamais `.env` (il est dans `.gitignore`) et ne publiez pas de build qui la contient.

## Écrans

| Écran | Fichier | Rôle |
| --- | --- | --- |
| Caméra | `src/app/(tabs)/index.tsx` | Photo ou import depuis la galerie. Glisser : placard / composer. |
| Placard | `src/app/(tabs)/closet.tsx` | Pièces, filtres, accès aux paramètres. |
| Composer | `src/app/(tabs)/composer.tsx` | Tenues à swiper, silhouette 3D, conseils, inspirations. |
| Looks | `src/app/(tabs)/looks.tsx` | Tenues gardées. |
| Nouvelle pièce | `src/app/add.tsx` | Analyse Gemini + teinte Wada la plus proche (ΔE CIEDE2000), corrigeable. |
| Modifier la pièce | `src/app/item/[id].tsx` | Catégorie, nom, matière, couleur, suppression. |
| Mirror Check | `src/app/mirror.tsx` | Notes esthétique / couleurs / drip, verdict, 3 ajustements. |
| Inspirations | `src/app/inspiration.tsx` | Lookbook Gemini et recherche Pinterest. |
| Paramètres | `src/app/settings.tsx` | Clé Gemini, silhouette, thème, météo, données. |

## Logique

- `src/lib/color.ts` : Lab, ΔE CIEDE2000, moteur de tenues (neutres, nuances proches), goûts appris des swipes. Testé : `npm test`.
- `src/lib/gemini.ts` : appels Gemini (API Interactions) avec bascule automatique de modèle.
- `src/lib/api-key.ts` : clé de l'utilisateur dans le stockage chiffré.
- `src/lib/store.ts` : placard, looks, profil (SQLite kv-store, photos dans le dossier documents). Tout reste sur le téléphone.
- `src/components/mannequin-3d.tsx` : silhouette 3D (three.js / React Three Fiber).

## Crédits

Palettes : Sanzo Wada, *A Dictionary of Color Combinations* (1933–1934). Données numérisées par Matt DesLauriers, licence MIT (`src/data/wada.json`).
