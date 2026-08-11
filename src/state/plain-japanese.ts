import { useMemo } from 'react';

import type { AgeBracket, ShelterOpening, WaterKind } from '@/domain/models';
import {
  AGE_BRACKET_LABEL,
  AGE_BRACKET_LABEL_EASY,
  HAZARD_TYPE_LABEL,
  HAZARD_TYPE_LABEL_EASY,
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
import { isEasyJapanese, useEasyJapanese } from './settings';

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
