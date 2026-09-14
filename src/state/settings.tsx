import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { LatLng } from '@/domain/models';

/** 文字サイズは細かい段階を設けず3択にする(選択に迷わせない)。特大は高齢の利用者向け */
export type TextSize = 'standard' | 'large' | 'xlarge';

/** 設定 UI の表示順を固定するための一覧。表示名は文言カタログ(textSize*)が持つ */
export const TEXT_SIZES: readonly TextSize[] = ['standard', 'large', 'xlarge'];

/** RN 既定に対する倍率。標準を底上げしたうえで、レイアウトが崩れない範囲で段階的に上げる */
const TEXT_SIZE_SCALE: Record<TextSize, number> = {
  standard: 1.2,
  large: 1.4,
  xlarge: 1.6,
};

/** デモモードで再現する災害。避難所の開き方と水位の違いを見せるための2択 */
export type DemoScenario = 'rain' | 'quake';

/** 設定 UI の表示順を固定するための一覧。表示名は文言カタログ(demoScenario*)が持つ */
export const DEMO_SCENARIOS: readonly DemoScenario[] = ['rain', 'quake'];

/** じぶん設定と開発者向け設定。端末内にのみ保存し、外部送信しない */
type Settings = {
  demoMode: boolean;
  /** デモモードのときだけ意味を持つ。オフでも値は保持し、再度オンにしたとき同じシナリオに戻る */
  demoScenario: DemoScenario;
  textSize: TextSize;
  /** やさしい日本語モード。固定 UI 文言を平易版へ切り替える */
  easyJapanese: boolean;
  /** 自宅(よく居る場所)のピン。未設定は null */
  homePin: LatLng | null;
};

const DEFAULT_SETTINGS: Settings = {
  demoMode: false,
  demoScenario: 'rain',
  textSize: 'standard',
  easyJapanese: false,
  homePin: null,
};

const STORAGE_KEY = 'nogata.settings.v1';

/**
 * 保存済みの値を今の設定に合わせる。項目が無ければ既定値で埋め、選択肢の値が
 * 今の選択肢に無ければ(将来の改名や手で書き換えた保存)既定値へ戻す。
 * 選択肢の名前を引く側(データ源、バナー、設定画面)に個別の逃げ道を持たせないため、ここで一度に直す
 */
export function normalizeSettings(saved: unknown): Settings {
  const merged: Settings = { ...DEFAULT_SETTINGS, ...(saved as Partial<Settings>) };
  return {
    ...merged,
    textSize: TEXT_SIZES.includes(merged.textSize) ? merged.textSize : DEFAULT_SETTINGS.textSize,
    demoScenario: DEMO_SCENARIOS.includes(merged.demoScenario)
      ? merged.demoScenario
      : DEFAULT_SETTINGS.demoScenario,
  };
}

type SettingsContextValue = {
  settings: Settings;
  /** 保存済み設定の読み込みが終わるまで false。ちらつき防止に使う */
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * やさしい日本語モードの写し。Alert は React の外(ユーティリティ関数)から出すため、
 * フックを使えない場所のためにモードだけモジュール変数へ写す。書き込みは
 * SettingsProvider のみが行い、読み取り専用の関数だけを公開する。
 */
let easyJapaneseSnapshot = false;

export function isEasyJapanese(): boolean {
  return easyJapaneseSnapshot;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    easyJapaneseSnapshot = settings.easyJapanese;
  }, [settings.easyJapanese]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!cancelled && raw) {
          setSettings(normalizeSettings(JSON.parse(raw)));
        }
      })
      .catch(() => {
        // 読めなければ既定値で動かす。設定は再作成できるため握りつぶしてよい
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
        // 永続化失敗はアプリ動作を止めるほどではない(次回起動時に既定値へ戻るだけ)
      });
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, ready, update }), [settings, ready, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings は SettingsProvider の内側でのみ使えます');
  }
  return ctx;
}

/** 文字サイズ設定を倍率として返す。AppText が fontSize に掛けて使う */
export function useTextScale(): number {
  const { settings } = useSettings();
  return TEXT_SIZE_SCALE[settings.textSize];
}

/** やさしい日本語モードが有効かを返す。文言を選ぶフック(useCopy 等)が使う */
export function useEasyJapanese(): boolean {
  const { settings } = useSettings();
  return settings.easyJapanese;
}

/** 自宅ピンを返す。距離順の並び替えと最寄り避難所の表示が使う */
export function useHomePin(): LatLng | null {
  const { settings } = useSettings();
  return settings.homePin;
}
