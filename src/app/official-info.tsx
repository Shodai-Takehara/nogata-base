import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { ScreenHeader } from '@/components/screen-header';
import { OFFICIAL_SECTIONS, type OfficialLink } from '@/constants/official-links';
import { AppColors } from '@/constants/tokens';
import { spokenCopy, useCopy } from '@/state/plain-japanese';
import { openExternalUrl } from '@/utils/external-link';

/**
 * 公式情報への導線。熊本地震では偽の救助要請や偽動画が広まり、被災した市の LINE も障害で
 * 第一報を出せなかった。一次情報の入口を1画面に集め、共有の前に発信元を確かめるよう促す。
 * 中身はすべてリンクアウトで、この画面からデータを取りに行かない(取得できない状況でも入口は残る)
 */
export default function OfficialInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const copy = useCopy();

  const open = (link: OfficialLink) => {
    switch (link.target.kind) {
      case 'url':
        openExternalUrl(link.target.url);
        return;
      case 'tel':
        openExternalUrl(`tel:${link.target.number}`);
        return;
      case 'screen':
        router.push(link.target.path);
        return;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={copy.officialInfoTitle} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* 注意書きを先頭に置く。リンクより先に「確かめてから共有」を読ませるため */}
        <View style={styles.cautionBox}>
          <AppText style={styles.cautionText}>{copy.officialInfoWarning}</AppText>
        </View>

        {OFFICIAL_SECTIONS.map((section) => (
          <View key={section.key}>
            <AppText style={styles.caption}>{copy[section.title]}</AppText>
            <View style={styles.card}>
              {section.links.map((link, i) => (
                <View key={link.key}>
                  {i > 0 ? <View style={styles.separator} /> : null}
                  <LinkRow link={link} onPress={() => open(link)} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function LinkRow({ link, onPress }: { link: OfficialLink; onPress: () => void }) {
  const copy = useCopy();
  const external = link.target.kind !== 'screen';
  // 行は1つの読み上げ単位で子の文字は読まれないため、注記(171 のつながる日など)も文に含める。
  // 平易版の読み(括弧)を二重に読ませないよう標準の文を使う
  const spoken = [spokenCopy(link.label), link.note ? spokenCopy(link.note) : null]
    .filter((t) => t != null)
    .join('。');
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole={external ? 'link' : 'button'}
      accessibilityLabel={spoken}
      accessibilityHint={external ? spokenCopy('officialOpensExternal') : undefined}>
      <View style={styles.rowText}>
        <AppText style={styles.rowTitle}>{copy[link.label]}</AppText>
        {link.note ? <AppText style={styles.rowNote}>{copy[link.note]}</AppText> : null}
      </View>
      {/* 外へ出るリンクと、アプリ内の画面(›)を印で区別する */}
      <AppText style={styles.arrow}>{external ? '↗' : '›'}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.paper,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  cautionBox: {
    backgroundColor: '#FDF4EC',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: AppColors.caution,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  cautionText: {
    fontSize: 13,
    lineHeight: 20,
    color: AppColors.ink,
  },
  caption: {
    fontSize: 11,
    color: AppColors.inkSub,
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.ink,
  },
  rowNote: {
    fontSize: 11,
    lineHeight: 16,
    color: AppColors.inkSub,
  },
  arrow: {
    fontSize: 16,
    color: AppColors.primary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.line,
  },
});
