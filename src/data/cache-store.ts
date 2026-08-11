import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 最終取得データの永続キャッシュ(要件 NF-04)。圏外や起動直後でも
 * 前回のデータを表示できるようにする。保存するのは市の公開データのみで、
 * 個人情報は含まない(取得段階でホワイトリスト済み)。
 *
 * v1 はスキーマの版。データ構造を変えたら番号を上げ、古いキャッシュは読まずに捨てる。
 */
const PREFIX = 'nogata.cache.v1.';

export type CacheEnvelope<T> = {
  /** 取得に成功した時刻(エポックms)。古さの表示に使う */
  fetchedAt: number;
  data: T;
};

export async function readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed == null ||
      typeof (parsed as CacheEnvelope<T>).fetchedAt !== 'number' ||
      !('data' in parsed)
    ) {
      return null;
    }
    return parsed as CacheEnvelope<T>;
  } catch {
    // 壊れたキャッシュは無いものとして扱う(次の成功時に上書きされる)
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  const envelope: CacheEnvelope<T> = { fetchedAt: Date.now(), data };
  AsyncStorage.setItem(PREFIX + key, JSON.stringify(envelope)).catch(() => {
    // 保存失敗は致命ではない(次回オンライン起動で再取得される)
  });
}
