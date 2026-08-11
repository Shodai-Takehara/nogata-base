import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { AppColors } from '@/constants/tokens';
import { arAvailability } from '@/features/ar/availability';
import { useCopy } from '@/state/plain-japanese';

export default function ArScreen() {
  const copy = useCopy();
  const availability = arAvailability({
    isRealDevice: Device.isDevice,
    isExpoGo: Constants.appOwnership === 'expo',
  });

  if (availability !== 'available') {
    const message = availability === 'needs-device' ? copy.arNeedsDevice : copy.arNeedsDevBuild;
    return <UnavailableView title={copy.arTitle} message={message} back={copy.back} />;
  }

  // ViroKit は実機専用で、Expo Go・シミュレータでは import した時点で落ちる。
  // 利用可能と判定できたときだけ遅延読み込みするため、静的 import にできない
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FloodExperience = require('@/features/ar/flood-experience').default as ComponentType;
  return <FloodExperience />;
}

function UnavailableView({
  title,
  message,
  back,
}: {
  title: string;
  message: string;
  back: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppText style={styles.title}>{title}</AppText>
      <AppText style={styles.body}>{message}</AppText>
      <Pressable
        style={styles.button}
        onPress={() => {
          // ディープリンクで直接開かれた場合は履歴がないため、ホームへ置き換える
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}>
        <AppText style={styles.buttonText}>{back}</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.ink,
  },
  body: {
    fontSize: 13,
    color: AppColors.inkSub,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
