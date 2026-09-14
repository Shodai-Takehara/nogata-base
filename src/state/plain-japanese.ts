import { useMemo } from 'react';

import type { AgeBracket, Shelter, ShelterOpening, WaterKind } from '@/domain/models';
import type { NearestScope } from '@/domain/shelter-order';
import {
  AGE_BRACKET_LABEL,
  AGE_BRACKET_LABEL_EASY,
  HAZARD_TYPE_LABEL,
  HAZARD_TYPE_LABEL_EASY,
  partitionHazards,
  SHELTER_OPENING_LABEL,
  SHELTER_OPENING_LABEL_EASY,
  WATER_KIND_LABEL,
  WATER_KIND_LABEL_EASY,
  WATER_STATUS_LABEL,
  WATER_STATUS_LABEL_EASY,
  type HazardType,
  type WaterStatus,
} from '@/domain/status';

import { PLAIN_JAPANESE_COPY, type CopyEntry, type CopyKey } from './plain-japanese-copy';
import { isEasyJapanese, useEasyJapanese, type DemoScenario } from './settings';

/**
 * デモシナリオごとの文言のキー。選択肢名(設定のセグメント)とバナーの文を、
 * シナリオを足したとき片方だけ忘れないよう1か所で対応づける
 */
export const DEMO_SCENARIO_COPY: Record<DemoScenario, { label: CopyKey; banner: CopyKey }> = {
  rain: { label: 'demoScenarioRain', banner: 'demoBannerRain' },
  quake: { label: 'demoScenarioQuake', banner: 'demoBannerQuake' },
};

/** 避難所が対応しない災害種別を伝える1行の文言のキー */
export const HAZARD_UNUSABLE_COPY: Record<HazardType, CopyKey> = {
  flood: 'shelterUnusableFlood',
  landslide: 'shelterUnusableLandslide',
  earthquake: 'shelterUnusableQuake',
  other: 'shelterUnusableOther',
};

/**
 * 避難所の対応災害について添える文のキー。対応しない種別ごとに1文。
 * 4種別すべて非対応の施設は元データの属性が空の記録なので、「使えない」と言い切らず
 * 「情報がない」の1文にする
 */
export function hazardNoteKeys(hazards: Shelter['hazards']): CopyKey[] {
  const { supported, unsupported } = partitionHazards(hazards);
  if (supported.length === 0) return ['shelterHazardsUnknown'];
  return unsupported.map((h) => HAZARD_UNUSABLE_COPY[h]);
}

/** 要約の最寄り避難所の行の見出しのキー */
export const NEAREST_SCOPE_COPY: Record<NearestScope, CopyKey> = {
  flood: 'nearestForFlood',
  earthquake: 'nearestForQuake',
  both: 'nearestForBoth',
};

/**
 * 読み上げ用の文言。平易版は読みを括弧で添えるため、読み上げに使うと読みが二重になる。
 * 読み上げは漢字のままでも正しく読まれるので、モードに関わらず標準の文を使う
 */
export function spokenCopy(key: CopyKey): string {
  return PLAIN_JAPANESE_COPY[key].standard;
}

/**
 * React の外(Alert を出すユーティリティ等)で使う版。フックが使えないため、
 * SettingsProvider が写したモードのスナップショットで引く。
 */
export function copyText(key: CopyKey): string {
  const entry: CopyEntry = PLAIN_JAPANESE_COPY[key];
  return isEasyJapanese() && entry.easy != null ? entry.easy : entry.standard;
}

/**
 * モードに応じて確定した固定文言を引く。`easy` 未定義の項目は標準文言に
 * フォールバックする(元から平易な語に無理な言い換えを作らないため)。
 * 外部送信しない端末内設定のため副作用はない。
 */
export function useCopy(): Record<CopyKey, string> {
  const easy = useEasyJapanese();
  return useMemo(() => {
    const out = {} as Record<CopyKey, string>;
    for (const key of Object.keys(PLAIN_JAPANESE_COPY) as CopyKey[]) {
      const entry = PLAIN_JAPANESE_COPY[key] as { standard: string; easy?: string };
      out[key] = easy && entry.easy != null ? entry.easy : entry.standard;
    }
    return out;
  }, [easy]);
}

/** ドメインの列挙ラベルをモードに応じて返す。状態色は共通言語のまま変えない */
export function useStatusLabels(): {
  water: Record<WaterStatus, string>;
  shelterOpening: Record<ShelterOpening, string>;
  hazardType: Record<HazardType, string>;
  ageBracket: Record<AgeBracket, string>;
  waterKind: Record<WaterKind, string>;
} {
  const easy = useEasyJapanese();
  return easy
    ? {
        water: WATER_STATUS_LABEL_EASY,
        shelterOpening: SHELTER_OPENING_LABEL_EASY,
        hazardType: HAZARD_TYPE_LABEL_EASY,
        ageBracket: AGE_BRACKET_LABEL_EASY,
        waterKind: WATER_KIND_LABEL_EASY,
      }
    : {
        water: WATER_STATUS_LABEL,
        shelterOpening: SHELTER_OPENING_LABEL,
        hazardType: HAZARD_TYPE_LABEL,
        ageBracket: AGE_BRACKET_LABEL,
        waterKind: WATER_KIND_LABEL,
      };
}
