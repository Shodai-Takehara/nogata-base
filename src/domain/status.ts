import { AppColors } from '@/constants/tokens';
import type { AgeBracket, Shelter, ShelterOpening, WaterKind } from '@/domain/models';

export type WaterStatus = 'normal' | 'caution' | 'danger' | 'unknown';

/**
 * 警戒水位に対する現在水位の比率で3段階に判定する。
 * 0.7 という注意の閾値は市の公式基準ではなく本アプリの暫定値。
 * 市と会話できたら妥当な値に置き換える。
 */
export function waterStatus(levelCm: number | null, alertLevelCm: number | null): WaterStatus {
  if (
    levelCm == null ||
    alertLevelCm == null ||
    !Number.isFinite(levelCm) ||
    !Number.isFinite(alertLevelCm) ||
    alertLevelCm <= 0
  ) {
    return 'unknown';
  }
  const ratio = levelCm / alertLevelCm;
  if (ratio >= 1) return 'danger';
  if (ratio >= 0.7) return 'caution';
  return 'normal';
}

export const WATER_STATUS_LABEL: Record<WaterStatus, string> = {
  normal: '平常',
  caution: '注意',
  danger: '危険',
  unknown: '不明',
};

/**
 * やさしい日本語版の状態ラベル(F-13)。漢語を避け、危険は和語「あぶない」にする。
 * 注意は短い和語がないため読みの「ちゅうい」を当てる。チップ幅に収まる短さを保つ。
 */
export const WATER_STATUS_LABEL_EASY: Record<WaterStatus, string> = {
  normal: 'ふつう',
  caution: 'ちゅうい',
  danger: 'あぶない',
  unknown: 'わからない',
};

export const WATER_STATUS_COLOR: Record<WaterStatus, string> = {
  normal: AppColors.ok,
  caution: AppColors.caution,
  danger: AppColors.danger,
  unknown: AppColors.none,
};

export const SHELTER_OPENING_LABEL: Record<ShelterOpening, string> = {
  '0': '閉鎖',
  '1': '開設(混雑なし)',
  '2': '開設(やや混雑)',
  '3': '開設(非常に混雑)',
};

/**
 * やさしい日本語版の開設状況(F-13)。開いているかを動詞で示し、混雑は色でも伝わる。
 * 「混雑なし」は空きがある含意で「あいて いる」とし、色(緑)と併せて読ませる。
 */
export const SHELTER_OPENING_LABEL_EASY: Record<ShelterOpening, string> = {
  '0': 'しまって いる',
  '1': 'あいて いる',
  '2': 'すこし こんで いる',
  '3': 'とても こんで いる',
};

export const SHELTER_OPENING_COLOR: Record<ShelterOpening, string> = {
  '0': AppColors.none,
  '1': AppColors.ok,
  '2': AppColors.caution,
  '3': AppColors.danger,
};

export function isShelterOpen(opening: ShelterOpening): boolean {
  return opening !== '0';
}

export const AGE_BRACKET_LABEL: Record<AgeBracket, string> = {
  '0-3': '0〜3歳',
  '3-18': '3〜18歳',
  '18-65': '18〜65歳',
  '65+': '65歳以上',
};

/** やさしい日本語版の年齢区分(F-13)。「以上」を避けつつ 65 を含む言い方にする */
export const AGE_BRACKET_LABEL_EASY: Record<AgeBracket, string> = {
  '0-3': '0〜3さい',
  '3-18': '3〜18さい',
  '18-65': '18〜65さい',
  '65+': '65さいから 上(うえ)',
};

/** 水位画面のグループ見出し。センサーとゲートの区別に使う */
export const WATER_KIND_LABEL: Record<WaterKind, string> = {
  sensor: '水位センサー',
  gate: '転倒ゲート',
};

/** やさしい日本語版(F-13)。設備の固有な呼び名のため語は変えず、読みだけ添える */
export const WATER_KIND_LABEL_EASY: Record<WaterKind, string> = {
  sensor: '水位(すいい)センサー',
  gate: '転倒(てんとう)ゲート',
};

/** 交通規制の程度。線の色分け(F-06)に使う */
export type TrafficSeverity = 'full' | 'partial' | 'unknown';

/**
 * 規制種別の文字列から程度を判定する。実データは「通行止め（全面）」のような
 * 全角括弧表記(docs/api-spec.md §2.4)だが、表記ゆれに備えて部分一致で見る。
 */
export function trafficSeverity(status: string): TrafficSeverity {
  if (status.includes('全面')) return 'full';
  if (status.includes('一部')) return 'partial';
  return 'unknown';
}

/** 程度が読み取れない規制は、安全側に倒して全面と同じ危険色で描く */
export const TRAFFIC_SEVERITY_COLOR: Record<TrafficSeverity, string> = {
  full: AppColors.danger,
  partial: AppColors.caution,
  unknown: AppColors.danger,
};

/** 対応災害の種別。避難所の絞り込みに使う */
export type HazardType = 'flood' | 'landslide' | 'earthquake' | 'other';

export const HAZARD_TYPE_LABEL: Record<HazardType, string> = {
  flood: '水害',
  landslide: '土砂',
  earthquake: '地震',
  other: 'その他',
};

/** やさしい日本語版の災害種別(F-13)。用語の意味を保つため語は変えず、読みだけ添える */
export const HAZARD_TYPE_LABEL_EASY: Record<HazardType, string> = {
  flood: '水害(すいがい)',
  landslide: '土砂(どしゃ)',
  earthquake: '地震(じしん)',
  other: 'そのほか',
};

/** 表示・絞り込みの並び順を固定するための一覧 */
export const HAZARD_TYPES: readonly HazardType[] = ['flood', 'landslide', 'earthquake', 'other'];

/**
 * 選択された災害種別すべてに対応する避難所だけを残す(AND 条件)。
 * 「水害と土砂の両方に対応」で絞れるよう積集合にする。選択なしは全件。
 */
export function filterSheltersByHazards(
  shelters: Shelter[],
  selected: readonly HazardType[],
): Shelter[] {
  if (selected.length === 0) return shelters;
  return shelters.filter((s) => selected.every((h) => s.hazards[h]));
}
