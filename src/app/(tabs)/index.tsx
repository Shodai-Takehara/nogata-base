import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, memo, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  UrlTile,
  type LatLng,
  type MapPressEvent,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { CarShelterDetailSheet } from '@/components/car-shelter-detail-sheet';
import { DamageDetailSheet } from '@/components/damage-detail-sheet';
import { DemoBanner } from '@/components/demo-banner';
import { LayerPicker } from '@/components/layer-picker';
import { LayersButton } from '@/components/layers-button';
import { LegendStrip } from '@/components/legend-strip';
import { LoreDetailSheet } from '@/components/lore-detail-sheet';
import { MapBottomSheet, type SheetMode } from '@/components/map-bottom-sheet';
import { PopulationDetailSheet } from '@/components/population-detail-sheet';
import { QuakeDetailSheet } from '@/components/quake-detail-sheet';
import { ShelterDetailSheet } from '@/components/shelter-detail-sheet';
import { TrafficDetailSheet } from '@/components/traffic-detail-sheet';
import { WaterDetailSheet } from '@/components/water-detail-sheet';
import { CAR_SHELTERS, type CarShelter } from '@/constants/car-shelters';
import { AREA_LAYERS, hazardLayer, tileOptions } from '@/constants/hazard-map';
import { RIVER_INFO_URL } from '@/constants/links';
import { LORE_MONUMENTS, type LoreMonument } from '@/constants/lore-monuments';
import {
  POPULATION_CELLS,
  POPULATION_SELECTED_STROKE,
  POPULATION_SELECTED_STROKE_WIDTH,
  POPULATION_STROKE,
  populationFill,
  type PopulationCell,
} from '@/constants/population-map';
import {
  FUKUCHIYAMA_FAULT,
  QUAKE_BUCKETS,
  QUAKE_CELLS,
  QUAKE_CLASSES,
  QUAKE_FAULT_LINE,
  QUAKE_META,
  QUAKE_SELECTED_STROKE,
  QUAKE_SELECTED_STROKE_WIDTH,
  QUAKE_STROKE,
  type QuakeCell,
} from '@/constants/quake-map';
import { AppColors, NOGATA_REGION } from '@/constants/tokens';
import { useDataSource } from '@/data/data-source-context';
import type {
  DamageReport,
  Shelter,
  ShelterOpening,
  TrafficRegulation,
  WaterLevel,
} from '@/domain/models';
import {
  isShelterOpen,
  SHELTER_OPENING_COLOR,
  SHELTER_OPENING_LABEL,
  TRAFFIC_SEVERITY_COLOR,
  trafficSeverity,
  WATER_STATUS_LABEL,
  waterStatus,
  type WaterStatus,
} from '@/domain/status';
import { useRemoteData } from '@/hooks/use-remote-data';
import {
  AREA_KEYS,
  fillTileLayer,
  INITIAL_MAP_LAYERS,
  mapLayersReducer,
  overlayCount,
} from '@/state/map-layers';
import { legendBlocks } from '@/state/map-legend';
import { useCopy } from '@/state/plain-japanese';
import { quakeDetail } from '@/state/quake-detail';
import { useEasyJapanese, useHomePin, useSettings } from '@/state/settings';
import { getCurrentLocation } from '@/utils/current-location';
import { formatJstMoment } from '@/utils/datetime';
import { formatDistanceMeters, haversineMeters } from '@/utils/geo';
import { meshCodeAt, meshPolygon } from '@/utils/mesh-code';

/**
 * 地図ピンは scripts/generate-map-pins.js で SVG テンプレートから生成した
 * PNG を、素の Image の子ビューとして渡す。
 * - react-native-svg の子ビューは New Architecture でタップ時に描画が
 *   消えることがあるため使わない
 * - Marker の image プロパティは bridgeless モードで画像がロードされない
 *   (実装が RCTBridge.currentBridge に依存)ため使わない
 */
const SHELTER_PIN_IMAGE: Record<ShelterOpening, number> = {
  '0': require('../../../assets/map-pins/shelter-none.png'),
  '1': require('../../../assets/map-pins/shelter-ok.png'),
  '2': require('../../../assets/map-pins/shelter-caution.png'),
  '3': require('../../../assets/map-pins/shelter-danger.png'),
};

// 平常は状態色(緑)だと避難所ピンと紛れるため、地図上では水色にしている。
// 一覧側の状態チップは共通言語(平常=緑)のまま変えない
const WATER_PIN_IMAGE: Record<WaterStatus, number> = {
  normal: require('../../../assets/map-pins/water-calm.png'),
  caution: require('../../../assets/map-pins/water-caution.png'),
  danger: require('../../../assets/map-pins/water-danger.png'),
  unknown: require('../../../assets/map-pins/water-unknown.png'),
};

const CAR_PIN_IMAGE = require('../../../assets/map-pins/car-shelter.png');
const DAMAGE_PIN_IMAGE = require('../../../assets/map-pins/damage-report.png');
const LORE_PIN_IMAGE = require('../../../assets/map-pins/lore-monument.png');

/**
 * 重なった対象(ピン、規制線、塗り)のタップの譲り合い。1回のタップがそれぞれに届き、
 * 届く順も一定でないため、後回しにする対象ほど長く待ってから判定する(線 < 面)。
 * 待ち時間内に他の対象が押されていれば、その対象に譲る
 */
const LINE_TAP_DELAY_MS = 50;
const FILL_TAP_DELAY_MS = 120;
const PRESS_YIELD_MS = 300;

/**
 * 地図上で選択中のピン。詳細はネイティブの吹き出し(Callout)ではなく
 * 画面下の自前シートで出す。Callout は New Architecture で開閉が
 * 不安定なため使わない。
 */
type MapSelection =
  | { kind: 'shelter'; id: number }
  | { kind: 'water'; id: string }
  | { kind: 'car'; id: number }
  | { kind: 'damage'; id: number }
  | { kind: 'traffic'; id: number }
  | { kind: 'lore'; id: string }
  | { kind: 'population'; index: number }
  /** 地震ハザードはセル単位の面を持たないので、タップ地点から求めたメッシュコードで持つ */
  | { kind: 'quake'; code: string };

export default function HomeScreen() {
  const dataSource = useDataSource();
  const insets = useSafeAreaInsets();
  const copy = useCopy();
  const easy = useEasyJapanese();
  const router = useRouter();
  const [layers, dispatchLayers] = useReducer(mapLayersReducer, INITIAL_MAP_LAYERS);
  // 既定は peek(1行)。市内の状況は1行で足り、地図を広く見せる方を優先する
  const [sheetMode, setSheetMode] = useState<SheetMode>('peek');
  const [locationEnabled, setLocationEnabled] = useState(false);
  // 選択は id で保持し、表示は最新データから解決する(更新でシートが古くならないように)
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const mapRef = useRef<MapView>(null);

  // デモモードは直方市の再現シナリオを見せる機能のため、市外(発表会場など)で
  // 現在地表示して地図が離れていても、有効化されたら市中心へ戻す
  const demoMode = useSettings().settings.demoMode;
  useEffect(() => {
    if (demoMode) mapRef.current?.animateToRegion(NOGATA_REGION, 500);
  }, [demoMode]);

  // その他タブの「ハザードマップを重ねる」からの遷移で塗りを洪水にする。
  // 値は遷移のたびに変わる(more.tsx 側で発行)ため、変化=遷移として扱える。
  // useEffect で拾うと React Compiler の set-state-in-effect ルールに反するため、
  // 前回レンダーの値を記録してレンダー中に検知する
  const { hazard } = useLocalSearchParams<{ hazard?: string }>();
  const [handledHazardParam, setHandledHazardParam] = useState<string | undefined>(undefined);
  if (hazard !== handledHazardParam) {
    setHandledHazardParam(hazard);
    if (hazard != null) dispatchLayers({ type: 'applyDeepLink', link: 'hazard' });
  }

  // 現在地表示は許可が要るため、勝手に出さずボタンを導線にする(押されたときだけ要求)
  const locateMe = useCallback(async () => {
    const coord = await getCurrentLocation();
    if (!coord) return;
    setLocationEnabled(true);
    mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.01, longitudeDelta: 0.008 }, 600);
  }, []);

  const loadAll = useCallback(async () => {
    // 1レイヤーの失敗で地図全体を空にしないため、取れた分は表示する
    const results = await Promise.allSettled([
      dataSource.fetchShelters(),
      dataSource.fetchWaterLevels(),
      dataSource.fetchDamageReports(),
      dataSource.fetchTrafficRegulations(),
    ]);
    if (results.every((r) => r.status === 'rejected')) {
      throw (results[0] as PromiseRejectedResult).reason;
    }
    const [shelters, waterLevels, damageReports, trafficRegulations] = results;
    return {
      // 失敗したソースは「0件」と区別するため null にする(要約の誤表示防止)
      shelters: shelters.status === 'fulfilled' ? shelters.value : null,
      waterLevels: waterLevels.status === 'fulfilled' ? waterLevels.value : null,
      damageReports: damageReports.status === 'fulfilled' ? damageReports.value : null,
      trafficRegulations:
        trafficRegulations.status === 'fulfilled' ? trafficRegulations.value : null,
      partialError: results.some((r) => r.status === 'rejected'),
    };
  }, [dataSource]);

  const { data, error, refresh, fetchedAt } = useRemoteData(loadAll, 'home-map');
  const hasError = error != null || data?.partialError === true;
  const homePin = useHomePin();
  // レイヤーを非表示にしたら詳細シートも出さない(地図に無いものの詳細が残るのを防ぐ)
  const selectedShelter =
    selection?.kind === 'shelter' && layers.pins.shelters
      ? (data?.shelters?.find((s) => s.id === selection.id) ?? null)
      : null;
  const selectedWater =
    selection?.kind === 'water' && layers.pins.water
      ? (data?.waterLevels?.find((w) => w.id === selection.id) ?? null)
      : null;
  const selectedCar =
    selection?.kind === 'car' && layers.pins.carShelters
      ? (CAR_SHELTERS.find((c) => c.id === selection.id) ?? null)
      : null;
  const selectedDamage =
    selection?.kind === 'damage' && layers.pins.damage
      ? (data?.damageReports?.find((d) => d.id === selection.id) ?? null)
      : null;
  const selectedTraffic =
    selection?.kind === 'traffic' && layers.pins.traffic
      ? (data?.trafficRegulations?.find((t) => t.id === selection.id) ?? null)
      : null;
  const selectedLore =
    selection?.kind === 'lore' && layers.lore
      ? (LORE_MONUMENTS.find((m) => m.id === selection.id) ?? null)
      : null;
  const selectedPopulation =
    selection?.kind === 'population' && layers.population
      ? (POPULATION_CELLS[selection.index] ?? null)
      : null;
  const selectedQuake =
    selection?.kind === 'quake' && layers.fill === 'quake'
      ? (QUAKE_CELLS[selection.code] ?? null)
      : null;

  /**
   * iOS はマーカーをタップしても地図タップ判定が走り、タップ地点から
   * 10px 以内にある規制線の onPress まで発火する(ピンと線が近接する
   * 感田交差点などで詳細シートの取り合いになる)。マーカー側を優先するため、
   * マーカー押下時刻を覚えて、直後の線と面のタップは譲らせる
   */
  const markerPressedAt = useRef(0);
  const stampMarkerPress = () => {
    markerPressedAt.current = Date.now();
  };

  // マーカーへ渡すハンドラは identity を固定する(memo を効かせるため)
  const selectShelter = useCallback((id: number) => {
    stampMarkerPress();
    setSelection({ kind: 'shelter', id });
  }, []);
  const selectWater = useCallback((id: string) => {
    stampMarkerPress();
    setSelection({ kind: 'water', id });
  }, []);
  const selectCar = useCallback((id: number) => {
    stampMarkerPress();
    setSelection({ kind: 'car', id });
  }, []);
  const selectDamage = useCallback((id: number) => {
    stampMarkerPress();
    setSelection({ kind: 'damage', id });
  }, []);
  const selectLore = useCallback((id: string) => {
    stampMarkerPress();
    setSelection({ kind: 'lore', id });
  }, []);
  // 規制線の押下時刻。線の上をタップすると下の塗りも発火するため、塗り側が線に譲る判定に使う
  const linePressedAt = useRef(0);
  const selectTraffic = useCallback((id: number) => {
    linePressedAt.current = Date.now();
    // マーカーの onPress が線より後に届くことがあるため、一拍置いてから判定する
    setTimeout(() => {
      if (Date.now() - markerPressedAt.current < PRESS_YIELD_MS) return;
      setSelection({ kind: 'traffic', id });
    }, LINE_TAP_DELAY_MS);
  }, []);
  // レイヤー選択シートを地図タップで閉じた時刻。閉じるためのタップが、地図を覆う
  // 人口メッシュの選択として届くのを防ぐ判定に使う
  const layersClosedAt = useRef(0);
  // 面(人口メッシュ、地震ハザード)は地図の大半を覆うため、ピン・規制線のタップと必ず重なる。
  // 規制線より遅らせて、他の対象が選ばれていたら譲る
  const selectOverlay = useCallback((next: MapSelection) => {
    setTimeout(() => {
      if (Date.now() - markerPressedAt.current < PRESS_YIELD_MS) return;
      if (Date.now() - linePressedAt.current < PRESS_YIELD_MS) return;
      if (Date.now() - layersClosedAt.current < PRESS_YIELD_MS) return;
      setSelection(next);
    }, FILL_TAP_DELAY_MS);
  }, []);
  const selectPopulation = useCallback(
    (index: number) => selectOverlay({ kind: 'population', index }),
    [selectOverlay],
  );
  const closeSelection = useCallback(() => setSelection(null), []);

  // レイヤー選択はシート外の地図タップで閉じる(地図アプリで慣れた操作に合わせる)。
  // iOS ではピンをタップしても地図タップが届くが、ピンの詳細がシートに入れ替わるだけなので支障はない。
  // 地震の塗りは面ごとの onPress を持たないため、同じ地図タップから地点のセルを引く
  const mapPressed = useCallback(
    (e: MapPressEvent) => {
      if (sheetMode === 'layers') {
        layersClosedAt.current = Date.now();
        setSheetMode('peek');
        return;
      }
      if (layers.fill !== 'quake') return;
      const { latitude, longitude } = e.nativeEvent.coordinate;
      const code = meshCodeAt(latitude, longitude, QUAKE_META.mesh);
      if (QUAKE_CELLS[code] == null) return;
      selectOverlay({ kind: 'quake', code });
    },
    [sheetMode, layers.fill, selectOverlay],
  );

  // 詳細シートはレイヤー選択より優先して表示されるため、閉じてからシートを切り替える
  // (閉じないと、詳細を閉じたあとに選択シートが突然出る)
  const openLayers = useCallback(() => {
    setSelection(null);
    setSheetMode('layers');
  }, []);

  const summary = summarize(data ?? null, homePin);
  const showArLink = layers.fill === 'flood';
  const fillTile = fillTileLayer(layers.fill);
  const detail = selectedShelter ? (
    <ShelterDetailSheet shelter={selectedShelter} onClose={closeSelection} />
  ) : selectedWater ? (
    <WaterDetailSheet waterLevel={selectedWater} onClose={closeSelection} />
  ) : selectedCar ? (
    <CarShelterDetailSheet shelter={selectedCar} onClose={closeSelection} />
  ) : selectedLore ? (
    <LoreDetailSheet monument={selectedLore} onClose={closeSelection} />
  ) : selectedDamage ? (
    <DamageDetailSheet report={selectedDamage} onClose={closeSelection} />
  ) : selectedTraffic ? (
    <TrafficDetailSheet regulation={selectedTraffic} onClose={closeSelection} />
  ) : selectedPopulation ? (
    <PopulationDetailSheet cell={selectedPopulation} onClose={closeSelection} />
  ) : selectedQuake ? (
    <QuakeDetailSheet cell={selectedQuake} onClose={closeSelection} />
  ) : null;

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top, backgroundColor: AppColors.surface }}>
        <DemoBanner />
        <View style={styles.header}>
          <AppText style={styles.title}>直方ベース</AppText>
        </View>
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={NOGATA_REGION}
          showsUserLocation={locationEnabled}
          onPress={mapPressed}>
          {/* 面オーバーレイの重なり順について: Apple Maps 側は zIndex を無視し、
              addOverlay された順(=マウント順)で描画される。人口メッシュの青がハザードの
              塗りと区域タイルの色を覆わないよう「人口 → 塗り → 区域タイル」を保証したいので、
              上に来る側を key 付きの Fragment で包み、下側(人口の有無、塗りの種類)が変わる
              たびに上側をまとめて再マウントさせる。同一コミット内の挿入は子の並び順になる
              ため順序が決まる。塗りを足すときは Fragment の中に置けばこの規則に乗る。
              下側を消したとき(人口オフ、塗りなし)の再マウントは不要だが、入れ替わりと
              区別する手間に見合わないので、そのまま再マウントさせている */}
          {layers.population ? (
            <PopulationLayer
              selectedIndex={selection?.kind === 'population' ? selection.index : null}
              onSelect={selectPopulation}
            />
          ) : null}
          <Fragment key={`above-population-${layers.population}`}>
            {layers.fill === 'quake' ? (
              <QuakeLayer selectedCode={selection?.kind === 'quake' ? selection.code : null} />
            ) : null}
            {fillTile ? <UrlTile key={fillTile.key} {...tileOptions(fillTile)} /> : null}
            <Fragment key={`above-fill-${layers.fill}`}>
              {AREA_KEYS.filter((area) => layers.areas[area])
                .flatMap((area) => AREA_LAYERS[area])
                .map((key) => (
                  <UrlTile key={key} {...tileOptions(hazardLayer(key))} />
                ))}
            </Fragment>
          </Fragment>
          {layers.lore
            ? LORE_MONUMENTS.map((m) => (
                <LoreMarker key={`lore-${m.id}`} monument={m} onSelect={selectLore} />
              ))
            : null}
          {layers.pins.shelters
            ? data?.shelters?.map((s) => (
                <ShelterMarker
                  key={`shelter-${s.id}-${s.opening}`}
                  shelter={s}
                  onSelect={selectShelter}
                />
              ))
            : null}
          {layers.pins.carShelters
            ? CAR_SHELTERS.map((c) => (
                <CarShelterMarker key={`car-${c.id}`} shelter={c} onSelect={selectCar} />
              ))
            : null}
          {layers.pins.water
            ? data?.waterLevels?.map((w) => (
                <WaterMarker
                  key={`${w.id}-${waterStatus(w.levelCm, w.alertLevelCm)}`}
                  waterLevel={w}
                  onSelect={selectWater}
                />
              ))
            : null}
          {layers.pins.damage
            ? data?.damageReports?.map((d) => (
                <DamageMarker key={`damage-${d.id}`} report={d} onSelect={selectDamage} />
              ))
            : null}
          {layers.pins.traffic
            ? data?.trafficRegulations?.map((t) => (
                <Polyline
                  key={`traffic-${t.id}`}
                  coordinates={t.path}
                  strokeColor={TRAFFIC_SEVERITY_COLOR[trafficSeverity(t.status)]}
                  strokeWidth={4}
                  tappable
                  onPress={() => selectTraffic(t.id)}
                />
              ))
            : null}
          {/* 自宅ピン。じぶん設定画面と同じ見た目にして同一概念とわかるようにする。
              状態を持つデータピンと違い、詳細シートがないため選択対象にしない */}
          {homePin ? (
            <Marker
              coordinate={homePin}
              pinColor={AppColors.primary}
              accessibilityLabel={copy.a11yHomePin}
            />
          ) : null}
        </MapView>

        <View style={styles.topLeft}>
          <LayersButton count={overlayCount(layers)} onPress={openLayers} />
        </View>

        <View style={styles.mapButtons}>
          <Pressable
            style={styles.mapButton}
            onPress={() => mapRef.current?.animateToRegion(NOGATA_REGION, 500)}
            accessibilityRole="button"
            accessibilityLabel={copy.a11yShowWholeCity}>
            {/* 丸ボタンは大きさ固定のため、文字サイズ設定で拡大しない素の Text を使う */}
            <Text style={styles.mapButtonIcon}>⌂</Text>
          </Pressable>
          <Pressable
            style={styles.mapButton}
            onPress={locateMe}
            accessibilityRole="button"
            accessibilityLabel={copy.a11yShowMyLocation}>
            <Text style={styles.locateIcon}>➤</Text>
          </Pressable>
        </View>

        <MapBottomSheet
          mode={sheetMode}
          onChangeMode={setSheetMode}
          legend={<LegendStrip blocks={legendBlocks(layers, copy, easy)} onExpand={openLayers} />}
          detail={detail}
          peek={
            <SummaryPeek
              summary={summary}
              hasError={hasError}
              cachedAt={fetchedAt}
              onRetry={refresh}
            />
          }
          summary={
            <SummaryRows
              summary={summary}
              hasError={hasError}
              cachedAt={fetchedAt}
              onRetry={refresh}
              showArLink={showArLink}
            />
          }
          layers={
            <LayerPicker
              state={layers}
              dispatch={dispatchLayers}
              onOpenAr={() => router.push('/ar')}
            />
          }
        />
      </View>
    </View>
  );
}

const ShelterMarker = memo(function ShelterMarker({
  shelter,
  onSelect,
}: {
  shelter: Shelter;
  onSelect: (id: number) => void;
}) {
  return (
    <Marker
      coordinate={shelter.coord}
      onPress={() => onSelect(shelter.id)}
      accessibilityLabel={`避難所 ${shelter.name}(${SHELTER_OPENING_LABEL[shelter.opening]})`}
      // 尻尾の先端(画像下端)が座標を指すようにする。anchor は iOS の
      // Apple Maps では効かないため、centerOffset(画像高 34pt の半分)で持ち上げる
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={{ x: 0, y: -17 }}>
      <Image source={SHELTER_PIN_IMAGE[shelter.opening]} />
    </Marker>
  );
});

const CarShelterMarker = memo(function CarShelterMarker({
  shelter,
  onSelect,
}: {
  shelter: CarShelter;
  onSelect: (id: number) => void;
}) {
  return (
    <Marker
      coordinate={shelter.coord}
      onPress={() => onSelect(shelter.id)}
      accessibilityLabel={`車中泊避難所 ${shelter.name}`}>
      <Image source={CAR_PIN_IMAGE} />
    </Marker>
  );
});

/**
 * 伝承碑のピンは過去の記録なので、重なったらいまの状況のピン(zIndex 未指定 = 0)を上にする。
 * Apple Maps はマウント順ではピンの重なりを決めないため、zIndex で下げる
 */
const LORE_MARKER_Z_INDEX = -1;

const LoreMarker = memo(function LoreMarker({
  monument,
  onSelect,
}: {
  monument: LoreMonument;
  onSelect: (id: string) => void;
}) {
  return (
    <Marker
      coordinate={monument.coord}
      zIndex={LORE_MARKER_Z_INDEX}
      onPress={() => onSelect(monument.id)}
      accessibilityLabel={`自然災害伝承碑 ${monument.name}`}>
      <Image source={LORE_PIN_IMAGE} />
    </Marker>
  );
});

const DamageMarker = memo(function DamageMarker({
  report,
  onSelect,
}: {
  report: DamageReport;
  onSelect: (id: number) => void;
}) {
  return (
    <Marker
      coordinate={report.coord}
      onPress={() => onSelect(report.id)}
      accessibilityLabel={`被害報告 ${report.category}`}>
      <Image source={DAMAGE_PIN_IMAGE} />
    </Marker>
  );
});

const WaterMarker = memo(function WaterMarker({
  waterLevel,
  onSelect,
}: {
  waterLevel: WaterLevel;
  onSelect: (id: string) => void;
}) {
  const status = waterStatus(waterLevel.levelCm, waterLevel.alertLevelCm);
  return (
    <Marker
      coordinate={waterLevel.coord}
      onPress={() => onSelect(waterLevel.id)}
      accessibilityLabel={`水位観測点 ${waterLevel.name}(${WATER_STATUS_LABEL[status]})`}>
      <Image source={WATER_PIN_IMAGE[status]} />
    </Marker>
  );
});

/**
 * 人口メッシュ。202セルの静的データで、レイヤーを点けている間は
 * 全セルを描画したままにする。選択の変更ではセル単位の memo により、
 * 枠線が変わる2セルぶんだけがネイティブ更新になる。
 * zIndex は付けない(Apple Maps 側が面オーバーレイでは無視するため効かない。
 * ハザードタイルとの重なり順は MapView 側の再マウント制御で決めている)。
 */
const PopulationLayer = memo(function PopulationLayer({
  selectedIndex,
  onSelect,
}: {
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <>
      {POPULATION_CELLS.map((cell, index) => (
        <PopulationCellOverlay
          key={`pop-${index}`}
          cell={cell}
          index={index}
          selected={index === selectedIndex}
          onSelect={onSelect}
        />
      ))}
    </>
  );
});

const PopulationCellOverlay = memo(function PopulationCellOverlay({
  cell,
  index,
  selected,
  onSelect,
}: {
  cell: PopulationCell;
  index: number;
  selected: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <>
      {cell.polys.map((ring, part) => (
        <Polygon
          key={`pop-${index}-${part}`}
          coordinates={ring}
          fillColor={populationFill(cell.pop)}
          strokeColor={selected ? POPULATION_SELECTED_STROKE : POPULATION_STROKE}
          strokeWidth={selected ? POPULATION_SELECTED_STROKE_WIDTH : 0.5}
          tappable
          onPress={() => onSelect(index)}
        />
      ))}
    </>
  );
});

/**
 * 地震ハザードの塗り。面オーバーレイの数を抑えるため区分ごとに融合した面だけを描き
 * (QUAKE_CLASSES)、セル単位の面は持たない。そのため面の onPress ではタップを取れず、
 * MapView の onPress で座標からセルを引いている
 */
const QuakeLayer = memo(function QuakeLayer({ selectedCode }: { selectedCode: string | null }) {
  return (
    <>
      {QUAKE_CLASSES.flatMap((cls) =>
        cls.polys.map((poly, part) => (
          /* この Polygon の props を5つから増やさない。Apple Maps 側(AIRMapPolygon)は coordinates を
             受けた時点で面を組み、holes を後から受けても組み直さない。旧アーキテクチャ互換層は
             props を差分辞書の列挙順(キーの組で決まり、挿入順によらない)に適用し、この5つなら
             holes が先に届く(2026-09-12 に macOS の Foundation で全順列を確認)。
             lineCap 等を足すと順が入れ替わり、穴が空かなくなる */
          <Polygon
            key={`quake-${cls.bucket}-${part}`}
            coordinates={poly.outer}
            holes={poly.holes}
            fillColor={QUAKE_BUCKETS[cls.bucket].fill}
            strokeColor={QUAKE_STROKE}
            strokeWidth={0.5}
          />
        )),
      )}
      <Polyline
        coordinates={FUKUCHIYAMA_FAULT.top}
        strokeColor={QUAKE_FAULT_LINE.color}
        strokeWidth={QUAKE_FAULT_LINE.width}
        lineDashPattern={QUAKE_FAULT_LINE.dashPattern}
      />
      {selectedCode ? (
        <Polygon
          coordinates={meshPolygon(selectedCode)}
          strokeColor={QUAKE_SELECTED_STROKE}
          strokeWidth={QUAKE_SELECTED_STROKE_WIDTH}
        />
      ) : null}
    </>
  );
});

type HomeData = {
  shelters: Shelter[] | null;
  waterLevels: WaterLevel[] | null;
  damageReports: DamageReport[] | null;
  trafficRegulations: TrafficRegulation[] | null;
};

type Summary = {
  water: { text: string; color: string } | null;
  openCount: number | null;
  damageReports: DamageReport[] | null;
  trafficRegulations: TrafficRegulation[] | null;
  nearest: { shelter: Shelter; meters: number } | null;
  /** 自宅ピンの地点の地震ハザード。自宅が市域の外なら null */
  homeQuake: QuakeCell | null;
  loading: boolean;
};

/**
 * 要約に出す値を先に確定させる。peek(1行)と要約(全行)の両方が同じ値を使うため、
 * 表示側で計算を重複させない。
 * 取得に失敗したソース(null)は行ごと出さない。「なし」「平常」との混同を防ぐ
 */
function summarize(data: HomeData | null, homePin: LatLng | null): Summary {
  const waterLevels = data?.waterLevels ?? null;
  let water: Summary['water'] = null;
  if (waterLevels) {
    const statuses = waterLevels.map((w) => waterStatus(w.levelCm, w.alertLevelCm));
    const danger = statuses.filter((s) => s === 'danger').length;
    const caution = statuses.filter((s) => s === 'caution').length;
    const unknown = statuses.filter((s) => s === 'unknown').length;
    if (danger > 0) {
      water = { text: `水位 ${danger}地点で警戒超過`, color: AppColors.danger };
    } else if (caution > 0) {
      water = { text: `水位 ${caution}地点で注意`, color: AppColors.caution };
    } else if (unknown > 0) {
      water = { text: `水位 ${unknown}地点で観測値なし`, color: AppColors.none };
    } else {
      water = { text: `水位 全${statuses.length}地点 平常`, color: AppColors.ok };
    }
  }

  const shelters = data?.shelters ?? null;
  const openCount = shelters ? shelters.filter((s) => isShelterOpen(s.opening)).length : null;

  // 自宅ピン設定時の最寄り避難所。開設有無は問わず平常時の備えとして出す
  let nearest: Summary['nearest'] = null;
  if (homePin && shelters && shelters.length > 0) {
    let best: Shelter = shelters[0];
    let bestMeters = haversineMeters(homePin, best.coord);
    for (const s of shelters) {
      const meters = haversineMeters(homePin, s.coord);
      if (meters < bestMeters) {
        best = s;
        bestMeters = meters;
      }
    }
    nearest = { shelter: best, meters: bestMeters };
  }

  const homeQuake = homePin
    ? (QUAKE_CELLS[meshCodeAt(homePin.latitude, homePin.longitude, QUAKE_META.mesh)] ?? null)
    : null;

  return {
    water,
    openCount,
    damageReports: data?.damageReports ?? null,
    trafficRegulations: data?.trafficRegulations ?? null,
    nearest,
    homeQuake,
    loading: data == null,
  };
}

type SummaryStatusProps = {
  summary: Summary;
  hasError: boolean;
  /** 表示中データの取得時刻。取得失敗時に古さを明示する */
  cachedAt: number | null;
  onRetry: () => void;
};

/** 取得失敗の警告と再試行。たたんでいても隠さない(古いデータへの注意のため) */
function SummaryError({ hasError, cachedAt, onRetry }: Omit<SummaryStatusProps, 'summary'>) {
  const copy = useCopy();
  const easy = useEasyJapanese();
  if (!hasError) return null;
  return (
    <>
      <Pressable onPress={onRetry} style={styles.row}>
        <Dot color={AppColors.caution} />
        <AppText style={[styles.rowText, styles.rowTextShrink]}>{copy.summaryPartialError}</AppText>
      </Pressable>
      {cachedAt != null ? (
        <AppText style={styles.cachedAt}>
          {formatJstMoment(cachedAt, easy)}
          {copy.cachedAsOf}
        </AppText>
      ) : null}
    </>
  );
}

/** ボトムシートの peek に出す1行。水位の状態と開設中の避難所数だけに絞る(平常時の主目的) */
function SummaryPeek({ summary, hasError, cachedAt, onRetry }: SummaryStatusProps) {
  const copy = useCopy();
  return (
    <View>
      <View style={styles.peekLine}>
        {summary.water ? (
          <View style={styles.peekItem}>
            <Dot color={summary.water.color} />
            <AppText style={styles.rowText}>{summary.water.text}</AppText>
          </View>
        ) : null}
        {summary.openCount != null ? (
          <View style={styles.peekItem}>
            <Dot color={summary.openCount > 0 ? AppColors.ok : AppColors.none} />
            <AppText style={styles.rowText}>{shelterCountText(summary.openCount)}</AppText>
          </View>
        ) : null}
        {summary.loading && !hasError ? (
          <View style={styles.peekItem}>
            <Dot color={AppColors.none} />
            <AppText style={styles.rowText}>{copy.loading}</AppText>
          </View>
        ) : null}
      </View>
      <SummaryError hasError={hasError} cachedAt={cachedAt} onRetry={onRetry} />
    </View>
  );
}

function shelterCountText(openCount: number): string {
  return openCount > 0 ? `避難所 ${openCount}箇所 開設中` : '開設中の避難所 なし';
}

/** ボトムシートの要約に出す全行。peek の2項目に被害、規制、最寄り、導線を足す */
function SummaryRows({
  summary,
  hasError,
  cachedAt,
  onRetry,
  showArLink,
}: SummaryStatusProps & { showArLink: boolean }) {
  const router = useRouter();
  const copy = useCopy();
  const { water, openCount, damageReports, trafficRegulations, nearest, homeQuake, loading } =
    summary;

  return (
    <View>
      <SummaryError hasError={hasError} cachedAt={cachedAt} onRetry={onRetry} />

      {water ? (
        <View style={styles.row}>
          <Dot color={water.color} />
          <AppText style={styles.rowText}>{water.text}</AppText>
        </View>
      ) : null}

      {openCount != null ? (
        <View style={styles.row}>
          <Dot color={openCount > 0 ? AppColors.ok : AppColors.none} />
          <AppText style={styles.rowText}>{shelterCountText(openCount)}</AppText>
        </View>
      ) : null}

      {damageReports ? (
        <View style={styles.row}>
          <Dot color={damageReports.length > 0 ? AppColors.caution : AppColors.none} />
          <AppText style={[styles.rowText, styles.rowTextShrink]} numberOfLines={1}>
            {damageReports.length > 0
              ? `被害報告 ${damageReports.length}件`
              : copy.summaryDamageEmpty}
          </AppText>
        </View>
      ) : null}

      {trafficRegulations ? (
        <View style={styles.row}>
          <Dot color={trafficRegulations.length > 0 ? AppColors.danger : AppColors.none} />
          <AppText style={[styles.rowText, styles.rowTextShrink]} numberOfLines={1}>
            {trafficRegulations.length > 0
              ? `交通規制 ${trafficRegulations.length}件`
              : copy.summaryTrafficEmpty}
          </AppText>
        </View>
      ) : null}

      {nearest ? (
        <View style={styles.row}>
          <Dot color={SHELTER_OPENING_COLOR[nearest.shelter.opening]} />
          <AppText style={[styles.rowText, styles.rowTextShrink]} numberOfLines={1}>
            {copy.summaryNearestShelter} {nearest.shelter.name}({copy.approxPrefix}{' '}
            {formatDistanceMeters(nearest.meters)})
          </AppText>
        </View>
      ) : null}

      {homeQuake ? <HomeQuakeRow cell={homeQuake} /> : null}

      {loading && !hasError ? (
        <View style={styles.row}>
          <Dot color={AppColors.none} />
          <AppText style={styles.rowText}>{copy.loading}</AppText>
        </View>
      ) : null}

      {showArLink ? (
        <Pressable style={[styles.row, styles.linkRow]} onPress={() => router.push('/ar')}>
          <AppText style={styles.linkText}>{copy.summaryArLink}</AppText>
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.row, styles.linkRow]}
        onPress={() => {
          // 外部ブラウザ起動の失敗は致命ではないため握りつぶす(未処理 rejection の防止)
          Linking.openURL(RIVER_INFO_URL).catch(() => {});
        }}>
        <AppText style={styles.linkText}>{copy.riverInfoLabel}(川の防災情報) ↗</AppText>
      </Pressable>
    </View>
  );
}

/**
 * 自宅ピンの地点の地震ハザード。塗りを地震にしていなくても出す。
 * 「自分の場所の数字」を、地図を操作せずに読めるようにするため
 */
function HomeQuakeRow({ cell }: { cell: QuakeCell }) {
  const copy = useCopy();
  const easy = useEasyJapanese();
  const detail = quakeDetail(cell, copy, easy);
  return (
    // 数字を省略すると意味が無いので折り返しを許し、点は1行目に合わせる
    <View style={[styles.row, styles.rowWrap]}>
      {/* 区分の色は透過で 9pt の点では白地に埋もれるため、同じ色相の不透明色で地震の行だと示す */}
      <Dot color={QUAKE_SELECTED_STROKE} top />
      <AppText style={[styles.rowText, styles.rowTextShrink]}>
        {copy.summaryHomeQuake}: {detail.main.label} {detail.main.value}({copy.quakeGroundLabel}:{' '}
        {detail.ground})
      </AppText>
    </View>
  );
}

function Dot({ color, top }: { color: string; top?: boolean }) {
  return <View style={[styles.dot, top && styles.dotTop, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.ink,
  },
  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  topLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  mapButtons: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 8,
  },
  mapButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  mapButtonIcon: {
    fontSize: 24,
    color: AppColors.primary,
    marginTop: -1,
  },
  locateIcon: {
    fontSize: 20,
    color: AppColors.primary,
    // 位置情報の矢印らしく北東向きに傾ける
    transform: [{ rotate: '-45deg' }],
    marginTop: 2,
  },
  cachedAt: {
    fontSize: 10,
    color: AppColors.inkSub,
    paddingBottom: 4,
    // 警告行の点(9pt)+間隔ぶんだけ字下げして、警告の続きだと分かるようにする
    paddingLeft: 17,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  // 文字サイズが大きいときは項目ごとに折り返し、1項目の途中で切れないようにする
  peekLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 2,
  },
  peekItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  rowText: {
    fontSize: 13,
    color: AppColors.ink,
  },
  // 長い文を行内に収める(省略するか折り返すかは numberOfLines で決める)
  rowTextShrink: {
    flexShrink: 1,
  },
  rowWrap: {
    alignItems: 'flex-start',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  // 折り返す行で点を1行目の中央に置く(13pt の行高との差の半分)
  dotTop: {
    marginTop: 4,
  },
  linkRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.line,
    marginTop: 4,
    paddingTop: 8,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.primary,
  },
});
