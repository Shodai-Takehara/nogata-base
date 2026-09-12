import { PLAIN_JAPANESE_COPY } from '@/state/plain-japanese-copy';

/**
 * データソースの日時はすべてエポックms。表示は常に JST。
 * 端末のタイムゾーン設定に依存しないよう timeZone を明示する。
 */
const jstFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * 「時点」を付けない版。規制の開始・解除など「出来事の時刻」に使う
 * (未来の見込み時刻に「時点」が付くと、その時点の情報と誤読されるため)。
 * `easy` はやさしい日本語モード。純関数のままにするため
 * フックでなく引数で受け、呼び出し側が useEasyJapanese の値を渡す。
 */
export function formatJstMoment(epochMs: number | null, easy = false): string {
  if (epochMs == null) {
    return easy ? PLAIN_JAPANESE_COPY.dateUnknown.easy : PLAIN_JAPANESE_COPY.dateUnknown.standard;
  }
  return jstFormatter.format(new Date(epochMs));
}

/** 「◯月◯日 ◯:◯ 時点」形式。計測・更新時刻の鮮度表示に使う */
export function formatJst(epochMs: number | null, easy = false): string {
  const moment = formatJstMoment(epochMs, easy);
  if (epochMs == null) return moment;
  const suffix = easy
    ? PLAIN_JAPANESE_COPY.dateSuffix.easy
    : PLAIN_JAPANESE_COPY.dateSuffix.standard;
  return `${moment}${suffix}`;
}

/**
 * データソースの日時フィールドを検証して返す。
 * 未入力の行はエポック0で届くため(公式ダッシュボードでは 1970/01/01 と
 * 表示されてしまう)、0以下は欠測として null に正規化する。
 */
export function toEpochMs(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
