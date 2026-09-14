import { RIVER_INFO_URL } from '@/constants/links';
import type { CopyKey } from '@/state/plain-japanese-copy';

export type OfficialTarget =
  | { kind: 'url'; url: string }
  | { kind: 'tel'; number: string }
  /** 00000JAPAN の案内は通信が落ちたときに読むものなので、外部ページでなく端末内の画面に持つ */
  | { kind: 'screen'; path: '/disaster-wifi' };

export type OfficialLink = {
  key: string;
  label: CopyKey;
  note?: CopyKey;
  target: OfficialTarget;
};

export type OfficialSection = {
  key: string;
  title: CopyKey;
  links: readonly OfficialLink[];
};

/** 直方市の気象庁の市町村コード(class20s)。area.json で確かめた値 */
const JMA_NOGATA_AREA_CODE = '4020400';

/**
 * 公式情報の画面に並べる導線。すべてリンクアウトで、アプリからデータを取りに行かない。
 * URL は 2026-09-15 に開けることを確かめたもの(docs/api-spec.md §10)。確認できない先は載せない
 */
export const OFFICIAL_SECTIONS: readonly OfficialSection[] = [
  {
    key: 'city',
    title: 'officialSectionCity',
    links: [
      {
        key: 'city-emergency',
        label: 'officialCityEmergency',
        note: 'officialCityEmergencyNote',
        // 緊急情報は独立したページではなく市のトップページの先頭に出る
        target: { kind: 'url', url: 'https://www.city.nogata.fukuoka.jp/' },
      },
      {
        key: 'city-line',
        label: 'officialCityLine',
        note: 'officialCityLineNote',
        // LINE のプロフィールページ(Safari で開く)。LINE が無くても発信元と最近の投稿が読める。
        // LINE を直接開く line.me/R/ti/p/@… は未インストールだと何も分からないので使わない
        target: { kind: 'url', url: 'https://page.line.me/nogata_city' },
      },
    ],
  },
  {
    key: 'pref',
    title: 'officialSectionPref',
    links: [
      {
        key: 'pref-evacuation',
        label: 'officialPrefEvacuation',
        target: { kind: 'url', url: 'https://www.bousai.pref.fukuoka.jp/evacuation/nogata-shi/' },
      },
      {
        key: 'pref-app',
        label: 'officialPrefApp',
        note: 'officialPrefAppNote',
        // 県の「防災メール・まもるくん」は 2026-03-31 に終わり、市がこのアプリを代わりに案内している
        target: { kind: 'url', url: 'https://www.bousai.pref.fukuoka.jp/lp/app_mamorukun/' },
      },
    ],
  },
  {
    key: 'jma',
    title: 'officialSectionJma',
    links: [
      {
        key: 'jma-warning',
        label: 'officialJmaWarning',
        target: {
          kind: 'url',
          url: `https://www.jma.go.jp/bosai/warning/#area_type=class20s&area_code=${JMA_NOGATA_AREA_CODE}`,
        },
      },
    ],
  },
  {
    key: 'river',
    title: 'officialSectionRiver',
    links: [
      {
        key: 'river-level',
        label: 'riverInfoLabel',
        note: 'riverInfoSub',
        target: { kind: 'url', url: RIVER_INFO_URL },
      },
    ],
  },
  {
    key: 'safety',
    title: 'officialSectionSafety',
    links: [
      {
        key: 'dial-171',
        label: 'officialDial171',
        note: 'officialDial171Note',
        target: { kind: 'tel', number: '171' },
      },
      {
        key: 'web171',
        label: 'officialWeb171',
        note: 'officialWeb171Note',
        target: { kind: 'url', url: 'https://www.web171.jp/' },
      },
    ],
  },
  {
    key: 'network',
    title: 'officialSectionNetwork',
    links: [
      {
        key: 'disaster-wifi',
        label: 'rowDisasterWifi',
        note: 'officialWifiNote',
        target: { kind: 'screen', path: '/disaster-wifi' },
      },
    ],
  },
];
