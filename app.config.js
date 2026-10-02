// Étend app.json avec la clé Google Maps (suivi GPS du véhicule), injectée
// depuis l'environnement pour ne pas la committer.
//   EXPO_PUBLIC_GOOGLE_MAPS_KEY=... (Android : Maps SDK for Android ; iOS via
//   Apple Plans par défaut, une clé n'est requise que si on force Google sur iOS)
// Sans la variable, le comportement est identique à app.json seul.
module.exports = ({ config }) => {
  const cle = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  if (!cle) return config;

  return {
    ...config,
    ios: {
      ...config.ios,
      config: { ...config.ios?.config, googleMapsApiKey: cle },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { ...config.android?.config?.googleMaps, apiKey: cle },
      },
    },
  };
};
