import { useNetworkState } from 'expo-network';

/**
 * 端末がインターネットに届かない状態か。
 * 判定が出るまで(起動直後は未定)はオンライン扱いにして、起動のたびに
 * オフラインの帯が一瞬出ることを避ける。圏外かどうかは取得の失敗からも
 * 推せるが、失敗はサーバ停止やタイムアウト(15秒)でも起きるため、
 * 端末側の状態を先に見せる
 */
export function useOffline(): boolean {
  const state = useNetworkState();
  return state.isConnected === false || state.isInternetReachable === false;
}
