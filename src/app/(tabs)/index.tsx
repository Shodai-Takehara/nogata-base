import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polygon, Polyline, UrlTile } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { CarShelterDetailSheet } from '@/components/car-shelter-detail-sheet';
import { DamageDetailSheet } from '@/components/damage-detail-sheet';
import { DemoBanner } from '@/components/demo-banner';
import { PopulationDetailSheet } from '@/components/population-detail-sheet';
import { ShelterDetailSheet } from '@/components/shelter-detail-sheet';
import { TrafficDetailSheet } from '@/components/traffic-detail-sheet';
import { WaterDetailSheet } from '@/components/water-detail-sheet';
import { CAR_SHELTERS, type CarShelter } from '@/constants/car-shelters';
import {
  FLOOD_ATTRIBUTION,
  HAZARD_LAYERS,
  HAZARD_TILE_MAX_Z,
  HAZARD_TILE_MIN_Z,
  HAZARD_TILE_OPACITY,
  type HazardLayerKey,
} from '@/constants/hazard-map';
import { RIVER_INFO_URL } from '@/constants/links';
import {
  POPULATION_ATTRIBUTION,
  POPULATION_BUCKETS,
  POPULATION_CELLS,
  POPULATION_SELECTED_STROKE,
  POPULATION_SELECTED_STROKE_WIDTH,
  POPULATION_STROKE,
  populationFill,
  type PopulationCell,
} from '@/constants/population-map';
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
import { useCopy } from '@/state/plain-japanese';
import { useEasyJapanese, useHomePin, useSettings } from '@/state/settings';
import { getCurrentLocation } from '@/utils/current-location';
import { formatJstMoment } from '@/utils/datetime';
import { formatDistanceMeters, haversineMeters } from '@/utils/geo';

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
  | { kind: 'population'; index: number };

export default function HomeScreen() {
  const dataSource = useDataSource();
  const insets = useSafeAreaInsets();
  const copy = useCopy();
  const [showShelters, setShowShelters] = useState(true);
  const [showCarShelters, setShowCarShelters] = useState(true);
  const [showWater, setShowWater] = useState(true);
  const [showDamage, setShowDamage] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  // 非公式アプリが想定浸水域を常時表示するより、利用者に明示的に出させる方が誤解が少ない
  const [showHazard, setShowHazard] = useState(false);
  // 人口レイヤー(F-14)。平常時の主目的(避難所・水位の確認)には不要な情報のため既定は非表示
  const [showPopulation, setShowPopulation] = useState(false);
  // 市の Web 版ハザードマップと同じく複数レイヤーを重ねられる。既定は洪水のみ
  const [activeHazards, setActiveHazards] = useState<HazardLayerKey[]>(['flood']);
  // 凡例の開閉。パネルはピン選択のたびに入れ替わるため、たたんだ状態を保てるよう親が持つ。
  // 初回は色の意味を知ってもらうためにひらいておく
  const [legendOpen, setLegendOpen] = useState(true);
  // 要約カードの開閉。凡例と同じ理由で親が持つ。初回は市内の状況を見せるためひらいておく
  const [summaryOpen, setSummaryOpen] = useState(true);
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

  // その他タブの「ハザードマップを重ねる」からの遷移で有効化する。
  // 値は遷移のたびに変わる(more.tsx 側で発行)ため、変化=遷移として扱える。
  // useEffect で拾うと React Compiler の set-state-in-effect ルールに反するため、
  // 前回レンダーの値を記録してレンダー中に検知する
  const { hazard } = useLocalSearchParams<{ hazard?: string }>();
  const [handledHazardParam, setHandledHazardParam] = useState<string | undefined>(undefined);
  if (hazard !== handledHazardParam) {
    setHandledHazardParam(hazard);
    if (hazard != null) setShowHazard(true);
  }

  const toggleHazardLayer = useCallback((key: HazardLayerKey) => {
    setActiveHazards((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

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
    selection?.kind === 'shelter' && showShelters
      ? (data?.shelters?.find((s) => s.id === selection.id) ?? null)
      : null;
  const selectedWater =
    selection?.kind === 'water' && showWater
      ? (data?.waterLevels?.find((w) => w.id === selection.id) ?? null)
      : null;
  const selectedCar =
    selection?.kind === 'car' && showCarShelters
      ? (CAR_SHELTERS.find((c) => c.id === selection.id) ?? null)
      : null;
  const selectedDamage =
    selection?.kind === 'damage' && showDamage
      ? (data?.damageReports?.find((d) => d.id === selection.id) ?? null)
      : null;
  const selectedTraffic =
    selection?.kind === 'traffic' && showTraffic
      ? (data?.trafficRegulations?.find((t) => t.id === selection.id) ?? null)
      : null;
  const selectedPopulation =
    selection?.kind === 'population' && showPopulation
      ? (POPULATION_CELLS[selection.index] ?? null)
      : null;

  /**
   * iOS はマーカーをタップしても地図タップ判定が走り、タップ地点から
   * 10px 以内にある規制線の onPress まで発火する(ピンと線が近接する
   * 感田交差点などで詳細シートの取り合いになる)。マーカー側を優先するため、
   * マーカー押下時刻を覚えて、直後の線タップは無視する
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
  // 規制線の押下時刻。線の上をタップすると下の人口メッシュも発火するため、
  // メッシュ側が線に譲る判定に使う
  const linePressedAt = useRef(0);
  const selectTraffic = useCallback((id: number) => {
    linePressedAt.current = Date.now();
    // マーカーの onPress が線より後に届くことがあるため、一拍置いてから判定する
    setTimeout(() => {
      if (Date.now() - markerPressedAt.current < 300) return;
      setSelection({ kind: 'traffic', id });
    }, 50);
  }, []);
  const selectPopulation = useCallback((index: number) => {
    // メッシュは地図の大半を覆うため、ピン・規制線のタップと必ず重なる。
    // 規制線(50ms)より遅らせて、他の対象が選ばれていたら譲る
    setTimeout(() => {
      if (Date.now() - markerPressedAt.current < 300) return;
      if (Date.now() - linePressedAt.current < 300) return;
      setSelection({ kind: 'population', index });
    }, 120);
  }, []);
  const closeSelection = useCallback(() => setSelection(null), []);

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
          showsUserLocation={locationEnabled}>
          {/* 面オーバーレイの重なり順について: Apple Maps 側は zIndex を無視し、
              addOverlay された順(=マウント順)で描画される。人口メッシュの青が
              浸水深の色を覆わないよう「タイルが常に上」を保証したいので、
              互いのトグルを key に入れて相手が出入りするたびに再マウントさせる。
              同一コミット内の挿入は子の並び順(人口→タイル)になるため順序が決まる */}
          {showPopulation ? (
            <PopulationLayer
              key={`population-${showHazard}`}
              selectedIndex={selection?.kind === 'population' ? selection.index : null}
              onSelect={selectPopulation}
            />
          ) : null}
          {showHazard
            ? HAZARD_LAYERS.filter((l) => activeHazards.includes(l.key)).map((l) => (
                <UrlTile
                  key={`${l.key}-${showPopulation}`}
                  urlTemplate={l.urlTemplate}
                  minimumZ={HAZARD_TILE_MIN_Z}
                  maximumZ={HAZARD_TILE_MAX_Z}
                  opacity={HAZARD_TILE_OPACITY}
                  zIndex={-1}
                />
              ))
            : null}
          {showShelters
            ? data?.shelters?.map((s) => (
                <ShelterMarker
                  key={`shelter-${s.id}-${s.opening}`}
                  shelter={s}
                  onSelect={selectShelter}
                />
              ))
            : null}
          {showCarShelters
            ? CAR_SHELTERS.map((c) => (
                <CarShelterMarker key={`car-${c.id}`} shelter={c} onSelect={selectCar} />
              ))
            : null}
          {showWater
            ? data?.waterLevels?.map((w) => (
                <WaterMarker
                  key={`${w.id}-${waterStatus(w.levelCm, w.alertLevelCm)}`}
                  waterLevel={w}
                  onSelect={selectWater}
                />
              ))
            : null}
          {showDamage
            ? data?.damageReports?.map((d) => (
                <DamageMarker key={`damage-${d.id}`} report={d} onSelect={selectDamage} />
              ))
            : null}
          {showTraffic
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
          {/* 自宅ピン(F-12)。じぶん設定画面と同じ見た目にして同一概念とわかるようにする。
              状態を持つデータピンと違い、詳細シートがないため選択対象にしない */}
          {homePin ? (
            <Marker
              coordinate={homePin}
              pinColor={AppColors.primary}
              accessibilityLabel={copy.a11yHomePin}
            />
          ) : null}
        </MapView>

        {/* 1行だと6チップが収まらずハザードだけ落ちて不揃いになるため、
            意味で2段に分ける(上=場所・観測点のピン、下=災害情報) */}
        <View style={styles.layerChips}>
          <View style={styles.layerChipRow}>
            <LayerChip
              label={copy.layerShelters}
              active={showShelters}
              onPress={() => setShowShelters((v) => !v)}
            />
            <LayerChip
              label={copy.layerCarShelters}
              active={showCarShelters}
              onPress={() => setShowCarShelters((v) => !v)}
            />
            <LayerChip
              label={copy.layerWater}
              active={showWater}
              onPress={() => setShowWater((v) => !v)}
            />
          </View>
          <View style={styles.layerChipRow}>
            <LayerChip
              label={copy.layerDamage}
              active={showDamage}
              onPress={() => setShowDamage((v) => !v)}
            />
            <LayerChip
              label={copy.layerTraffic}
              active={showTraffic}
              onPress={() => setShowTraffic((v) => !v)}
            />
            <LayerChip
              label={copy.layerHazard}
              active={showHazard}
              onPress={() => setShowHazard((v) => !v)}
            />
            <LayerChip
              label={copy.layerPopulation}
              active={showPopulation}
              onPress={() => setShowPopulation((v) => !v)}
            />
          </View>
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
      </View>

      <View style={[styles.bottomArea, { marginBottom: insets.bottom + 8 }]}>
        {selectedShelter ? (
          <ShelterDetailSheet shelter={selectedShelter} onClose={closeSelection} />
        ) : selectedWater ? (
          <WaterDetailSheet waterLevel={selectedWater} onClose={closeSelection} />
        ) : selectedCar ? (
          <CarShelterDetailSheet shelter={selectedCar} onClose={closeSelection} />
        ) : selectedDamage ? (
          <DamageDetailSheet report={selectedDamage} onClose={closeSelection} />
        ) : selectedTraffic ? (
          <TrafficDetailSheet regulation={selectedTraffic} onClose={closeSelection} />
        ) : selectedPopulation ? (
          <PopulationDetailSheet cell={selectedPopulation} onClose={closeSelection} />
        ) : (
          <>
            {showHazard ? (
              <HazardPanel
                active={activeHazards}
                onToggle={toggleHazardLayer}
                legendOpen={legendOpen}
                onToggleLegend={() => setLegendOpen((v) => !v)}
              />
            ) : null}
            {showPopulation ? <PopulationLegend /> : null}
            <SummaryCard
              shelters={data?.shelters ?? null}
              waterLevels={data?.waterLevels ?? null}
              damageReports={data?.damageReports ?? null}
              trafficRegulations={data?.trafficRegulations ?? null}
              hasError={hasError}
              cachedAt={fetchedAt}
              onRetry={refresh}
              showArLink={showHazard && activeHazards.includes('flood')}
              open={summaryOpen}
              onToggle={() => setSummaryOpen((v) => !v)}
            />
          </>
        )}
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
 * 人口メッシュの塗り(F-14)。202セルの静的データで、レイヤーを点けている間は
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

/** 人口レイヤーの凡例。ハザードの凡例パネルと同じ見た目で下部に出す */
function PopulationLegend() {
  const copy = useCopy();
  return (
    <View style={styles.legend}>
      <AppText maxScale={PANEL_MAX_SCALE} style={styles.legendTitle}>
        {copy.populationLegendTitle}
      </AppText>
      <View style={styles.legendRows}>
        {POPULATION_BUCKETS.map((bucket) => (
          <View key={bucket.min} style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: bucket.fill }]} />
            <AppText maxScale={PANEL_MAX_SCALE} style={styles.legendLabel}>
              {bucket.label}
            </AppText>
          </View>
        ))}
      </View>
      {/* 出典表記は NF-06 のため、レイヤーを出している間は常に見せる */}
      <AppText maxScale={PANEL_MAX_SCALE} style={styles.legendSource}>
        {POPULATION_ATTRIBUTION}
      </AppText>
    </View>
  );
}

function LayerChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.lchip, active && styles.lchipActive]}
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={`${label}レイヤーの表示切替`}>
      <AppText style={[styles.lchipText, active && styles.lchipTextActive]}>{label}</AppText>
    </Pressable>
  );
}

/** 重ねるレイヤーの選択と、選択中レイヤーの凡例をまとめたパネル。凡例はたためる */
function HazardPanel({
  active,
  onToggle,
  legendOpen,
  onToggleLegend,
}: {
  active: HazardLayerKey[];
  onToggle: (key: HazardLayerKey) => void;
  legendOpen: boolean;
  onToggleLegend: () => void;
}) {
  const copy = useCopy();
  const easy = useEasyJapanese();
  return (
    <View style={styles.legend}>
      <View style={styles.hazardChips}>
        {HAZARD_LAYERS.map((layer) => {
          const on = active.includes(layer.key);
          return (
            <Pressable
              key={layer.key}
              style={[styles.hazardChip, on && styles.hazardChipActive]}
              onPress={() => onToggle(layer.key)}
              hitSlop={6}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${layer.title}の表示切替`}>
              {/* 地図上のパネルは面積が限られ、特大だとチップが画面を覆って
                  押せなくなるため、拡大は標準相当までに抑える */}
              <AppText
                maxScale={PANEL_MAX_SCALE}
                style={[styles.hazardChipText, on && styles.hazardChipTextActive]}>
                {easy ? layer.labelEasy : layer.label}
              </AppText>
            </Pressable>
          );
        })}
        <Pressable
          style={styles.legendToggle}
          onPress={onToggleLegend}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityState={{ expanded: legendOpen }}
          accessibilityLabel={legendOpen ? copy.a11yLegendCollapse : copy.a11yLegendExpand}>
          <AppText maxScale={PANEL_MAX_SCALE} style={styles.legendToggleText}>
            {copy.legendLabel}
          </AppText>
          <AppText maxScale={PANEL_MAX_SCALE} style={styles.legendChevron}>
            {legendOpen ? '▾' : '▸'}
          </AppText>
        </Pressable>
      </View>

      {legendOpen
        ? HAZARD_LAYERS.filter((l) => active.includes(l.key)).map((layer) => (
            <View key={layer.key} style={styles.legendSection}>
              <AppText maxScale={PANEL_MAX_SCALE} style={styles.legendTitle}>
                {layer.title}
              </AppText>
              <View style={styles.legendRows}>
                {layer.legend.map((item) => (
                  <View key={item.color} style={styles.legendRow}>
                    <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                    <AppText maxScale={PANEL_MAX_SCALE} style={styles.legendLabel}>
                      {item.label}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          ))
        : null}
      {/* 出典表記は要件(F-07 / NF-06)のため、たたんでいる間も出し続ける */}
      <AppText maxScale={PANEL_MAX_SCALE} style={styles.legendSource}>
        {FLOOD_ATTRIBUTION}
      </AppText>
    </View>
  );
}

/** ハザードパネル内テキストの拡大上限。文字サイズ「標準」の倍率に合わせる */
const PANEL_MAX_SCALE = 1.2;

type SummaryProps = {
  shelters: Shelter[] | null;
  waterLevels: WaterLevel[] | null;
  damageReports: DamageReport[] | null;
  trafficRegulations: TrafficRegulation[] | null;
  hasError: boolean;
  /** 表示中データの取得時刻。取得失敗時に古さを明示する(NF-04) */
  cachedAt: number | null;
  onRetry: () => void;
  showArLink: boolean;
  /** 折りたたみ状態。カードは詳細シートと入れ替わるため親が保持する */
  open: boolean;
  onToggle: () => void;
};

function SummaryCard({
  shelters,
  waterLevels,
  damageReports,
  trafficRegulations,
  hasError,
  cachedAt,
  onRetry,
  showArLink,
  open,
  onToggle,
}: SummaryProps) {
  const router = useRouter();
  const copy = useCopy();
  const easy = useEasyJapanese();
  // 取得に失敗したソース(null)は行ごと出さない。「なし」「平常」との混同を防ぐ
  const water = useMemo(() => {
    if (!waterLevels) return null;
    const statuses = waterLevels.map((w) => waterStatus(w.levelCm, w.alertLevelCm));
    const danger = statuses.filter((s) => s === 'danger').length;
    const caution = statuses.filter((s) => s === 'caution').length;
    const unknown = statuses.filter((s) => s === 'unknown').length;
    if (danger > 0) {
      return { text: `水位 ${danger}地点で警戒超過`, color: AppColors.danger };
    }
    if (caution > 0) {
      return { text: `水位 ${caution}地点で注意`, color: AppColors.caution };
    }
    if (unknown > 0) {
      return { text: `水位 ${unknown}地点で観測値なし`, color: AppColors.none };
    }
    return { text: `水位 全${statuses.length}地点 平常`, color: AppColors.ok };
  }, [waterLevels]);

  const openCount = useMemo(
    () => (shelters ? shelters.filter((s) => isShelterOpen(s.opening)).length : null),
    [shelters],
  );

  // 自宅ピン設定時の最寄り避難所(F-12)。開設有無は問わず平常時の備えとして出す
  const homePin = useHomePin();
  const nearest = useMemo(() => {
    if (!homePin || !shelters || shelters.length === 0) return null;
    let best: Shelter = shelters[0];
    let bestMeters = haversineMeters(homePin, best.coord);
    for (const s of shelters) {
      const meters = haversineMeters(homePin, s.coord);
      if (meters < bestMeters) {
        best = s;
        bestMeters = meters;
      }
    }
    return { shelter: best, meters: bestMeters };
  }, [homePin, shelters]);

  const loading = !hasError && water == null && openCount == null;

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.summaryHeader}
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? copy.a11ySummaryCollapse : copy.a11ySummaryExpand}>
        <AppText style={styles.summaryTitle}>{copy.summaryTitle}</AppText>
        <AppText style={styles.summaryChevron}>{open ? '▾' : '▸'}</AppText>
      </Pressable>

      {/* 取得失敗の警告と再試行は、たたんでいても隠さない(古いデータへの注意のため) */}
      {hasError ? (
        <Pressable onPress={onRetry} style={styles.row}>
          <Dot color={AppColors.caution} />
          <AppText style={[styles.rowText, styles.rowTextShrink]}>
            {copy.summaryPartialError}
          </AppText>
        </Pressable>
      ) : null}
      {hasError && cachedAt != null ? (
        <AppText style={styles.cachedAt}>
          {formatJstMoment(cachedAt, easy)}
          {copy.cachedAsOf}
        </AppText>
      ) : null}

      {open && water ? (
        <View style={styles.row}>
          <Dot color={water.color} />
          <AppText style={styles.rowText}>{water.text}</AppText>
        </View>
      ) : null}

      {open && openCount != null ? (
        <View style={styles.row}>
          <Dot color={openCount > 0 ? AppColors.ok : AppColors.none} />
          <AppText style={styles.rowText}>
            {openCount > 0 ? `避難所 ${openCount}箇所 開設中` : '開設中の避難所 なし'}
          </AppText>
        </View>
      ) : null}

      {open && damageReports ? (
        <View style={styles.row}>
          <Dot color={damageReports.length > 0 ? AppColors.caution : AppColors.none} />
          <AppText style={[styles.rowText, styles.rowTextShrink]} numberOfLines={1}>
            {damageReports.length > 0
              ? `被害報告 ${damageReports.length}件`
              : copy.summaryDamageEmpty}
          </AppText>
        </View>
      ) : null}

      {open && trafficRegulations ? (
        <View style={styles.row}>
          <Dot color={trafficRegulations.length > 0 ? AppColors.danger : AppColors.none} />
          <AppText style={[styles.rowText, styles.rowTextShrink]} numberOfLines={1}>
            {trafficRegulations.length > 0
              ? `交通規制 ${trafficRegulations.length}件`
              : copy.summaryTrafficEmpty}
          </AppText>
        </View>
      ) : null}

      {open && nearest ? (
        <View style={styles.row}>
          <Dot color={SHELTER_OPENING_COLOR[nearest.shelter.opening]} />
          <AppText style={[styles.rowText, styles.rowTextShrink]} numberOfLines={1}>
            {copy.summaryNearestShelter} {nearest.shelter.name}({copy.approxPrefix}{' '}
            {formatDistanceMeters(nearest.meters)})
          </AppText>
        </View>
      ) : null}

      {open && loading ? (
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

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
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
  layerChips: {
    position: 'absolute',
    top: 10,
    left: 10,
    // 右端の丸ボタン(幅46+右余白10)に重ならない位置で折り返す
    right: 68,
    gap: 6,
  },
  layerChipRow: {
    flexDirection: 'row',
    // 文字サイズを大きくしたときに地図ボタンへ重ならないよう、段内でも折り返しを許す
    flexWrap: 'wrap',
    gap: 6,
  },
  lchip: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  lchipActive: {
    backgroundColor: AppColors.primary,
  },
  lchipText: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.inkSub,
  },
  lchipTextActive: {
    color: '#fff',
  },
  bottomArea: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    gap: 8,
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
  legend: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  hazardChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  hazardChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: AppColors.paper,
    borderWidth: 1,
    borderColor: AppColors.line,
  },
  hazardChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  hazardChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.inkSub,
  },
  hazardChipTextActive: {
    color: '#fff',
  },
  legendToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  legendToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.primary,
  },
  legendChevron: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
  },
  legendSection: {
    marginBottom: 4,
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.ink,
    marginBottom: 4,
  },
  legendRows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    rowGap: 3,
    maxWidth: 250,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 11,
    height: 11,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  legendLabel: {
    fontSize: 9.5,
    color: AppColors.ink,
    fontVariant: ['tabular-nums'],
  },
  legendSource: {
    fontSize: 8.5,
    color: AppColors.inkSub,
    marginTop: 4,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#14283C',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.inkSub,
    letterSpacing: 0.5,
  },
  summaryChevron: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
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
  rowText: {
    fontSize: 13,
    color: AppColors.ink,
  },
  // 最寄り避難所の名称が長いときに行内で省略させる
  rowTextShrink: {
    flexShrink: 1,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
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
