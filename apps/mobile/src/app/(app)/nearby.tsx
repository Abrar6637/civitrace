import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatDistance, nearbyService, type PublicComplaint } from '../../services/nearby.service';
import { errorKey } from '../../services/config';
import { useCurrentPosition } from '../../hooks/useCurrentPosition';
import { AppText } from '../../components/AppText';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { colors } from '../../theme';

function openComplaint(c: PublicComplaint) {
  if (c.isMine) router.push({ pathname: '/complaints/[id]', params: { id: c.id } });
  else router.push({ pathname: '/public/[id]', params: { id: c.id } });
}

function pinColor(c: PublicComplaint) {
  if (c.isMine) return 'blue';
  if (c.status === 'resolved' || c.status === 'closed') return 'green';
  return c.isHazard ? 'red' : 'orange';
}

function Row({ item }: { item: PublicComplaint }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => openComplaint(item)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, item.isMine && styles.mineCard, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <AppText weight="bold" style={styles.category}>
          {t(`categories.${item.category}`)}
        </AppText>
        <AppText style={styles.distance}>{formatDistance(item.distanceM, t)}</AppText>
      </View>
      <View style={styles.cardBottom}>
        <StatusBadge status={item.status} />
        {item.isMine ? (
          <AppText style={styles.mine}>{t('nearby.mine')}</AppText>
        ) : (
          <View style={styles.supporters}>
            <Ionicons name={item.supportedByMe ? 'people' : 'people-outline'} size={14} color={colors.muted} />
            <AppText style={styles.muted}>{t('nearby.supporters', { count: item.supporters })}</AppText>
          </View>
        )}
      </View>
      {item.isHazard && (
        <View style={styles.hazard}>
          <Ionicons name="warning" size={12} color={colors.danger} />
          <AppText style={styles.hazardText}>{t('complaints.hazard')}</AppText>
        </View>
      )}
    </Pressable>
  );
}

export default function NearbyScreen() {
  const { t } = useTranslation();
  const gps = useCurrentPosition();
  const [mode, setMode] = useState<'list' | 'map'>('list');

  const query = useQuery({
    queryKey: ['nearby', gps.point?.lat.toFixed(3), gps.point?.lng.toFixed(3)],
    queryFn: () => nearbyService.nearby(gps.point!),
    enabled: !!gps.point,
    refetchOnMount: 'always',
  });

  const items = query.data ?? [];

  const header = (
    <View style={styles.header}>
      <BackButton />
      <AppText weight="bold" style={styles.title}>
        {t('nearby.title')}
      </AppText>
      <AppText style={styles.muted}>{t('nearby.radius', { km: 2 })}</AppText>
      <View style={styles.toggle}>
        {(['list', 'map'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            style={[styles.toggleItem, mode === m && styles.toggleActive]}
          >
            <Ionicons name={m === 'list' ? 'list' : 'map'} size={16} color={mode === m ? colors.white : colors.brand700} />
            <AppText style={[styles.toggleText, mode === m && styles.toggleTextActive]}>{t(`nearby.${m}`)}</AppText>
          </Pressable>
        ))}
      </View>
      {gps.state === 'locating' && <AppText style={styles.muted}>{t('confirm.locating')}</AppText>}
      {(gps.state === 'denied' || gps.state === 'error') && (
        <>
          <AppText style={styles.error}>{gps.state === 'denied' ? t('confirm.gpsDenied') : t('confirm.gpsError')}</AppText>
          <Button title={t('confirm.retry')} variant="secondary" onPress={gps.retry} />
        </>
      )}
      {query.isError && <AppText style={styles.error}>{t(errorKey(query.error))}</AppText>}
    </View>
  );

  if (mode === 'map' && gps.point) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.mapHeader}>{header}</View>
        <MapView
          style={styles.map}
          initialRegion={{ latitude: gps.point.lat, longitude: gps.point.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
          showsUserLocation
        >
          {items.map((c) => (
            <Marker
              key={c.id}
              coordinate={{ latitude: c.point.lat, longitude: c.point.lng }}
              pinColor={pinColor(c)}
              title={t(`categories.${c.category}`)}
              description={`${t(`statuses.${c.status}`)} · ${formatDistance(c.distanceM, t)}`}
              onCalloutPress={() => openComplaint(c)}
            />
          ))}
        </MapView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <Row item={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          gps.point && !query.isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="location-outline" size={44} color={colors.border} />
              <AppText style={styles.muted}>{t('nearby.empty')}</AppText>
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 10 },
  header: { gap: 10, marginBottom: 6 },
  mapHeader: { paddingHorizontal: 20, paddingTop: 20 },
  map: { flex: 1 },
  title: { fontSize: 24 },
  toggle: { flexDirection: 'row', gap: 8 },
  toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, backgroundColor: colors.brand50 },
  toggleActive: { backgroundColor: colors.brand600 },
  toggleText: { fontSize: 13, color: colors.brand700 },
  toggleTextActive: { color: colors.white },
  card: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  mineCard: { borderColor: '#93c5fd' },
  pressed: { backgroundColor: colors.brand50 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  category: { fontSize: 16, flexShrink: 1 },
  distance: { fontSize: 12, color: colors.brand700 },
  supporters: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mine: { fontSize: 12, color: '#1d4ed8' },
  hazard: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#fef2f2' },
  hazardText: { fontSize: 11, color: colors.danger },
  muted: { fontSize: 13, color: colors.muted },
  error: { fontSize: 13, color: colors.danger },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
});