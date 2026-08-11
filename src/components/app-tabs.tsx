import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { AppColors } from '@/constants/tokens';
import { useCopy } from '@/state/plain-japanese';

export default function AppTabs() {
  const copy = useCopy();
  return (
    <NativeTabs backgroundColor="#FFFFFF" labelStyle={{ selected: { color: AppColors.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{copy.tabHome}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="water">
        <NativeTabs.Trigger.Label>{copy.tabWater}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="water.waves" md="water" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="shelters">
        <NativeTabs.Trigger.Label>{copy.tabShelters}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>{copy.tabMore}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
