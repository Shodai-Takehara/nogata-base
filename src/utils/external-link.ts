import { Alert, Linking } from 'react-native';

import { copyText } from '@/state/plain-japanese';
import type { CopyKey } from '@/state/plain-japanese-copy';

type Failure = { title: CopyKey; body: CopyKey };

const GENERIC_FAILURE: Failure = { title: 'alertOpenFailedTitle', body: 'alertOpenFailedBody' };

/**
 * 外部のブラウザ、電話、地図などのアプリを開く。失敗(対応アプリが無い、シミュレータの tel: など)は
 * 致命ではないので、知らせるだけで握りつぶす(未処理 rejection の防止)。
 * 地図のように専用の言い方がある呼び出し元は失敗時の文言を差し替える
 */
export function openExternalUrl(url: string, failure: Failure = GENERIC_FAILURE) {
  Linking.openURL(url).catch(() => {
    Alert.alert(copyText(failure.title), copyText(failure.body));
  });
}
