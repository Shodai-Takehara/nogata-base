/**
 * AR 機能を開けるかどうかの判定(要件 F-08 のフォールバック)。
 * ViroKit は実機専用のネイティブモジュールで、Expo Go には含まれない。
 */
export type ArAvailability = 'available' | 'needs-device' | 'needs-dev-build';

export function arAvailability(input: {
  isRealDevice: boolean;
  isExpoGo: boolean;
}): ArAvailability {
  if (!input.isRealDevice) return 'needs-device';
  if (input.isExpoGo) return 'needs-dev-build';
  return 'available';
}

export const AR_UNAVAILABLE_MESSAGE: Record<Exclude<ArAvailability, 'available'>, string> = {
  'needs-device':
    'この機能はカメラを使うため、iPhone の実機でのみ利用できます。シミュレータでは表示できません。',
  'needs-dev-build':
    'Expo Go では AR を利用できません。開発ビルド(dev client)でこのアプリを開いてください。',
};
