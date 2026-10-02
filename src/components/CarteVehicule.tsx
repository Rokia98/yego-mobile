import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  Polyline,
  UrlTile,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW } from '../theme';
import { attributionCarte, carteConfiguree, TAILLE_TUILE, urlTuiles } from '../maps';

export type Coord = { latitude: number; longitude: number };

type Props = {
  vehicule: Coord | null;
  cap: number | null;
  fraiche: boolean;
  destination: Coord | null;
  trace: Coord[];
  /** hauteur (px) réservée en bas de carte par la fiche d'info, pour le cadrage */
  paddingBas?: number;
};

function region(points: Coord[]): Region | undefined {
  if (points.length === 0) return undefined;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.05),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.05),
  };
}

// Carte du véhicule suivi. Encapsule le fournisseur de carte : aujourd'hui
// react-native-maps + tuiles MapTiler (fond neutre `mapType="none"` sur Android),
// demain Google Maps (retirer <UrlTile> + `mapType="standard"`).
export default function CarteVehicule({
  vehicule,
  cap,
  fraiche,
  destination,
  trace,
  paddingBas = 240,
}: Props) {
  const ref = useRef<MapView | null>(null);
  const cadre = useRef(false);

  const tousLesPoints: Coord[] = [
    ...trace,
    ...(vehicule ? [vehicule] : []),
    ...(destination ? [destination] : []),
  ];

  useEffect(() => {
    if (cadre.current || !ref.current || tousLesPoints.length === 0) return;
    cadre.current = true;
    if (tousLesPoints.length === 1) {
      ref.current.animateToRegion(
        { ...tousLesPoints[0], latitudeDelta: 0.08, longitudeDelta: 0.08 },
        600,
      );
    } else {
      ref.current.fitToCoordinates(tousLesPoints, {
        edgePadding: { top: 90, right: 60, bottom: paddingBas, left: 60 },
        animated: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tousLesPoints.length]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        initialRegion={region(tousLesPoints)}
        showsUserLocation={false}
        toolbarEnabled={false}
        showsMyLocationButton={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {carteConfiguree && (
          <UrlTile urlTemplate={urlTuiles} tileSize={TAILLE_TUILE} maximumZ={20} zIndex={-1} />
        )}

        {trace.length > 1 && (
          <Polyline coordinates={trace} strokeColor={COLORS.orange} strokeWidth={4} />
        )}

        {destination && (
          <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <View style={styles.pinDest}>
              <Ionicons name="flag" size={14} color={COLORS.white} />
            </View>
          </Marker>
        )}

        {vehicule && (
          <Marker
            coordinate={vehicule}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            rotation={cap ?? 0}
            tracksViewChanges={false}
          >
            <View style={[styles.pinBus, !fraiche && styles.pinBusPerdu]}>
              <Ionicons name="bus" size={16} color={COLORS.white} />
            </View>
          </Marker>
        )}
      </MapView>

      <SafeAreaView style={styles.attributionZone} edges={['top']} pointerEvents="none">
        <Text style={styles.attribution}>{attributionCarte}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  attributionZone: { position: 'absolute', top: 0, right: 0, alignItems: 'flex-end' },
  attribution: {
    marginTop: 8,
    marginRight: 8,
    fontSize: 9,
    color: COLORS.gray,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  pinBus: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.orange,
    borderWidth: 3,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  pinBusPerdu: { backgroundColor: COLORS.grayClair },
  pinDest: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.dark,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
