import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  FlatList,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { TabScreenProps } from '../navigation/types';
import { COLORS, RADIUS, SHADOW } from '../theme';
import TopBar from '../components/TopBar';
import Button from '../components/Button';
import FadeIn from '../components/FadeIn';
import PressableScale from '../components/PressableScale';
import BottomSheet from '../components/BottomSheet';
import { preferences } from '../storage';
import { chargerVilles } from '../api/villes';
import { formatDateCourt, versYmd } from '../format';
import { useLangue } from '../i18n';
import { vibrer } from '../haptics';
import type { RechercheRecente, Ville } from '../api/types';

type Props = TabScreenProps<'Accueil'>;
type Feuille = 'aucune' | 'depart' | 'arrivee' | 'date' | 'passagers';

const sansAccent = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export default function RechercheScreen({ navigation }: Props) {
  const { t, locale } = useLangue();
  const [villeDepart, setVilleDepart] = useState('Korhogo');
  const [villeArrivee, setVilleArrivee] = useState('Abidjan');
  const [date, setDate] = useState(versYmd(new Date()));
  const [passagers, setPassagers] = useState(1);
  const [feuille, setFeuille] = useState<Feuille>('aucune');
  const [dateTemp, setDateTemp] = useState(new Date());
  const [passagersTemp, setPassagersTemp] = useState(1);
  const [recents, setRecents] = useState<RechercheRecente[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [filtre, setFiltre] = useState('');
  const rotation = useRef(new Animated.Value(0)).current;
  const tours = useRef(0);

  useEffect(() => {
    chargerVilles()
      .then(setVilles)
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      preferences.recherchesRecentes().then(setRecents);
    }, []),
  );

  function inverserVilles() {
    vibrer.selection();
    setVilleDepart(villeArrivee);
    setVilleArrivee(villeDepart);
    tours.current += 1;
    Animated.timing(rotation, {
      toValue: tours.current,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }

  function ouvrirDate() {
    setDateTemp(new Date(`${date}T00:00:00`));
    setFeuille('date');
  }
  function ouvrirPassagers() {
    setPassagersTemp(passagers);
    setFeuille('passagers');
  }
  function ouvrirVille(champ: 'depart' | 'arrivee') {
    setFiltre('');
    setFeuille(champ);
  }
  function choisirVille(nom: string) {
    if (feuille === 'depart') setVilleDepart(nom);
    else if (feuille === 'arrivee') setVilleArrivee(nom);
    vibrer.selection();
    setFeuille('aucune');
  }

  function ajusterTemp(delta: number) {
    setPassagersTemp((p) => {
      const suivant = Math.max(1, Math.min(9, p + delta));
      if (suivant !== p) vibrer.selection();
      return suivant;
    });
  }

  async function rechercher(params?: RechercheRecente) {
    const r: RechercheRecente = params ?? {
      depart: villeDepart.trim(),
      arrivee: villeArrivee.trim(),
      date,
      passagers,
    };
    if (!r.depart || !r.arrivee) return;
    setRecents(await preferences.ajouterRechercheRecente(r));
    navigation.navigate('Reservation', r);
  }

  const spin = rotation.interpolate({ inputRange: [0, 2], outputRange: ['0deg', '360deg'] });

  const villesFiltrees = useMemo(() => {
    const q = sansAccent(filtre);
    const liste = q ? villes.filter((v) => sansAccent(v.nom).includes(q)) : villes;
    return liste.slice(0, 40);
  }, [villes, filtre]);

  const villeSaisieLibre =
    filtre.trim().length >= 2 &&
    !villes.some((v) => sansAccent(v.nom) === sansAccent(filtre));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <View style={styles.hero}>
            <Text style={styles.titre}>{t.recherche.titre}</Text>
            <Text style={styles.sousTitre}>{t.recherche.sousTitre}</Text>
          </View>
        </FadeIn>

        <FadeIn delai={60}>
          <View style={styles.carte}>
            <View style={styles.trajet}>
              <View style={styles.rail}>
                <View style={styles.railDot} />
                <View style={styles.railLigne} />
                <Ionicons name="location" size={16} color={COLORS.orange} />
              </View>

              <View style={styles.champs}>
                <PressableScale style={styles.champ} echelle={0.99} onPress={() => ouvrirVille('depart')}>
                  <Text style={styles.champLabel}>{t.recherche.depart}</Text>
                  <Text style={styles.champValeur} numberOfLines={1}>
                    {villeDepart || t.recherche.choisirUneVille}
                  </Text>
                </PressableScale>
                <View style={styles.champSep} />
                <PressableScale style={styles.champ} echelle={0.99} onPress={() => ouvrirVille('arrivee')}>
                  <Text style={styles.champLabel}>{t.recherche.arrivee}</Text>
                  <Text style={styles.champValeur} numberOfLines={1}>
                    {villeArrivee || t.recherche.choisirUneVille}
                  </Text>
                </PressableScale>
              </View>

              <PressableScale style={styles.swap} onPress={inverserVilles} haptique hitSlop={8}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="swap-vertical" size={18} color={COLORS.orange} />
                </Animated.View>
              </PressableScale>
            </View>

            <View style={styles.rangeeInfos}>
              <PressableScale style={styles.infoChip} onPress={ouvrirDate} echelle={0.98}>
                <Ionicons name="calendar-clear-outline" size={17} color={COLORS.orange} />
                <View style={styles.infoCorps}>
                  <Text style={styles.infoLabel}>{t.recherche.date}</Text>
                  <Text style={styles.infoValeur} numberOfLines={1}>
                    {formatDateCourt(date, locale)}
                  </Text>
                </View>
              </PressableScale>
              <View style={styles.infoSep} />
              <PressableScale style={styles.infoChip} onPress={ouvrirPassagers} echelle={0.98}>
                <Ionicons name="people-outline" size={17} color={COLORS.orange} />
                <View style={styles.infoCorps}>
                  <Text style={styles.infoLabel}>{t.recherche.voyageurs}</Text>
                  <Text style={styles.infoValeur} numberOfLines={1}>
                    {passagers}
                  </Text>
                </View>
              </PressableScale>
            </View>

            <Button titre={t.recherche.rechercher} icone="search" onPress={() => rechercher()} style={styles.boutonRecherche} />
          </View>
        </FadeIn>

        <FadeIn delai={130} style={styles.recents}>
          <Text style={styles.sectionTitre}>{t.recherche.trajetsRecents}</Text>
          {recents.length === 0 ? (
            <View style={styles.recentsVide}>
              <Ionicons name="time-outline" size={22} color={COLORS.grayClair} />
              <Text style={styles.recentsVideTexte}>{t.recherche.aucuneRecherche}</Text>
            </View>
          ) : (
            recents.map((r, i) => (
              <PressableScale
                key={`${r.depart}-${r.arrivee}-${i}`}
                style={styles.recentCarte}
                onPress={() => rechercher({ ...r, date, passagers })}
              >
                <View style={styles.recentIcone}>
                  <Ionicons name="repeat" size={17} color={COLORS.gray} />
                </View>
                <View style={styles.recentCorps}>
                  <Text style={styles.recentTrajet} numberOfLines={1}>
                    {r.depart} → {r.arrivee}
                  </Text>
                  <Text style={styles.recentMeta}>
                    {formatDateCourt(r.date, locale)} · {t.commun.nVoyageurs(r.passagers)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.grayClair} />
              </PressableScale>
            ))
          )}
        </FadeIn>
      </ScrollView>

      {/* Sélecteur de ville */}
      <BottomSheet
        visible={feuille === 'depart' || feuille === 'arrivee'}
        titre={feuille === 'depart' ? t.recherche.villeDepartTitre : t.recherche.villeArriveeTitre}
        onClose={() => setFeuille('aucune')}
      >
        <View style={styles.rechercheVille}>
          <Ionicons name="search" size={17} color={COLORS.grayClair} />
          <TextInput
            style={styles.rechercheVilleInput}
            value={filtre}
            onChangeText={setFiltre}
            placeholder={t.recherche.rechercherVille}
            placeholderTextColor={COLORS.grayClair}
            autoFocus
            autoCorrect={false}
          />
        </View>
        <FlatList
          data={villesFiltrees}
          keyExtractor={(v) => String(v.id)}
          keyboardShouldPersistTaps="handled"
          style={styles.villeListe}
          ListHeaderComponent={
            villeSaisieLibre ? (
              <PressableScale style={styles.villeLigne} onPress={() => choisirVille(filtre.trim())}>
                <Ionicons name="pencil-outline" size={16} color={COLORS.orange} />
                <Text style={styles.villeLigneTexte}>{t.recherche.utiliser(filtre.trim())}</Text>
              </PressableScale>
            ) : null
          }
          ListEmptyComponent={
            !villeSaisieLibre ? (
              <Text style={styles.villeVide}>{t.recherche.aucuneVilleTrouvee}</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <PressableScale style={styles.villeLigne} onPress={() => choisirVille(item.nom)}>
              <Ionicons name="location-outline" size={16} color={COLORS.gray} />
              <Text style={styles.villeLigneTexte}>{item.nom}</Text>
            </PressableScale>
          )}
        />
      </BottomSheet>

      <BottomSheet visible={feuille === 'date'} titre={t.recherche.dateVoyage} onClose={() => setFeuille('aucune')}>
        <View style={styles.pickerConteneur}>
          <DateTimePicker
            value={dateTemp}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
            minimumDate={new Date()}
            accentColor={COLORS.orange}
            themeVariant="light"
            onChange={(_, d) => {
              if (d) setDateTemp(d);
            }}
          />
        </View>
        <Button
          titre={t.commun.valider}
          onPress={() => {
            setDate(versYmd(dateTemp));
            setFeuille('aucune');
          }}
        />
      </BottomSheet>

      <BottomSheet visible={feuille === 'passagers'} titre={t.recherche.nombreVoyageurs} onClose={() => setFeuille('aucune')}>
        <View style={styles.stepperRangee}>
          <PressableScale style={styles.stepBtn} onPress={() => ajusterTemp(-1)}>
            <Ionicons name="remove" size={22} color={passagersTemp <= 1 ? COLORS.grayClair : COLORS.dark} />
          </PressableScale>
          <Text style={styles.stepValeur}>{t.commun.nVoyageurs(passagersTemp)}</Text>
          <PressableScale style={styles.stepBtn} onPress={() => ajusterTemp(1)}>
            <Ionicons name="add" size={22} color={passagersTemp >= 9 ? COLORS.grayClair : COLORS.dark} />
          </PressableScale>
        </View>
        <Button
          titre={t.commun.valider}
          onPress={() => {
            setPassagers(passagersTemp);
            setFeuille('aucune');
          }}
          style={{ marginTop: 18 }}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contenu: { paddingBottom: 32 },

  hero: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 54,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  titre: { fontSize: 26, fontWeight: '800', color: COLORS.white },
  sousTitre: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6, lineHeight: 19 },

  carte: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 16,
    marginHorizontal: 20,
    marginTop: -38,
    ...SHADOW,
  },

  trajet: { flexDirection: 'row', alignItems: 'center' },
  rail: { width: 22, alignItems: 'center', alignSelf: 'stretch', paddingVertical: 14 },
  railDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 3, borderColor: COLORS.dark },
  railLigne: { flex: 1, width: 2, backgroundColor: COLORS.border, marginVertical: 4 },
  champs: { flex: 1, marginLeft: 4 },
  champ: { paddingVertical: 10, paddingHorizontal: 6 },
  champLabel: { fontSize: 10, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  champValeur: { fontSize: 17, fontWeight: '800', color: COLORS.dark, marginTop: 3 },
  champSep: { height: 1, backgroundColor: COLORS.border, marginLeft: 6 },
  swap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    ...SHADOW,
  },

  rangeeInfos: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
  },
  infoChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  infoSep: { width: 1, alignSelf: 'stretch', backgroundColor: COLORS.border },
  infoCorps: { flex: 1 },
  infoLabel: { fontSize: 10, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValeur: { fontSize: 14, fontWeight: '800', color: COLORS.dark, marginTop: 2 },

  boutonRecherche: { marginTop: 16 },

  recents: { marginTop: 26, paddingHorizontal: 20 },
  sectionTitre: { fontSize: 16, fontWeight: '800', color: COLORS.dark, marginBottom: 12 },
  recentsVide: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 26,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
  },
  recentsVideTexte: { fontSize: 13, color: COLORS.gray },
  recentCarte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
  },
  recentIcone: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentCorps: { flex: 1 },
  recentTrajet: { fontSize: 14, fontWeight: '800', color: COLORS.dark },
  recentMeta: { fontSize: 12, color: COLORS.gray, marginTop: 2 },

  rechercheVille: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rechercheVilleInput: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.dark, padding: 0 },
  villeListe: { maxHeight: 340 },
  villeLigne: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  villeLigneTexte: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  villeVide: { fontSize: 13, color: COLORS.gray, textAlign: 'center', paddingVertical: 20 },

  pickerConteneur: { alignItems: 'center', marginBottom: 6 },
  stepperRangee: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 8,
  },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValeur: { fontSize: 17, fontWeight: '800', color: COLORS.dark, minWidth: 130, textAlign: 'center' },
});
