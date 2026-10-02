// Fond de carte du suivi GPS.
//
// Pour l'instant : tuiles raster MapTiler (clé cliente `EXPO_PUBLIC_MAPTILER_KEY`,
// voir .env). Une bascule vers Google Maps est prévue ensuite — elle se limitera
// au composant `src/components/CarteVehicule.tsx` (retirer la couche `UrlTile` et
// repasser `mapType` à 'standard').

export const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';

// Styles MapTiler possibles : streets-v2, basic-v2, outdoor-v2, dataviz…
const STYLE_CARTE = 'streets-v2';

export const carteConfiguree = MAPTILER_KEY.length > 0;

// URL de tuiles au format XYZ attendu par react-native-maps <UrlTile>.
// Endpoint raster MapTiler = tuiles 512 px → <UrlTile tileSize={512}>.
export const urlTuiles = `https://api.maptiler.com/maps/${STYLE_CARTE}/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`;
export const TAILLE_TUILE = 512;

// Attribution obligatoire (conditions MapTiler / OpenStreetMap).
export const attributionCarte = '© MapTiler © OpenStreetMap';
