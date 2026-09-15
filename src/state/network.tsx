import { useNetworkState, type NetworkState } from 'expo-network';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

/**
 * OS が「経路なし」(機内モード、圏外、Wi-Fi 未接続)と報告している状態か。
 * 判定前(起動直後の undefined)はオンライン扱いにし、起動のたびに帯が一瞬出ないようにする。
 * iOS では isInternetReachable は経路の有無と同じ値で、電波が弱いだけの状態は拾えない
 */
export function isOffline(state: Pick<NetworkState, 'isConnected' | 'isInternetReachable'>) {
  return state.isConnected === false || state.isInternetReachable === false;
}

const OfflineContext = createContext(false);

/**
 * 経路なしが続いてから帯を出すまでの待ち。Wi-Fi に繋ぎ替えた直後など、一瞬だけ
 * 経路が途切れる場面で帯が点滅しないようにする。戻ったときは待たずに消す
 */
const OFFLINE_SETTLE_MS = 1_500;

/**
 * 端末の通信状態をアプリで1つだけ購読して配る。
 * expo-network はネイティブの監視を購読者が0になると止め、その監視は再開できない
 * (iOS の NWPathMonitor は cancel 後に start できない)。画面ごとに購読すると
 * タブの入れ替えや開発中の再読み込みで0になりうるため、ルートで持ち続ける
 */
export function NetworkProvider({ children }: PropsWithChildren) {
  const rawOffline = isOffline(useNetworkState());
  const [shown, setShown] = useState(false);
  // 経路が戻ったら即座に消す。effect で setState すると React Compiler の
  // set-state-in-effect ルールに反するため、前回の値を記録して描画中に検知する
  const [prevRaw, setPrevRaw] = useState(rawOffline);
  if (prevRaw !== rawOffline) {
    setPrevRaw(rawOffline);
    if (!rawOffline) setShown(false);
  }
  useEffect(() => {
    if (!rawOffline) return;
    const timer = setTimeout(() => setShown(true), OFFLINE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [rawOffline]);
  return <OfflineContext.Provider value={shown}>{children}</OfflineContext.Provider>;
}

export function useOffline(): boolean {
  return useContext(OfflineContext);
}
