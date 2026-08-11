/**
 * アプリ全体の色トークン。
 * 出典: docs/design/ui-mockup.html のトークン定義。
 * 状態色(平常/注意/危険/なし)は地図ピン・バー・チップで共通の言語として使う。
 */
export const AppColors = {
  /** 川藍 — 主色。ヘッダー・アクティブタブ・リンク */
  primary: '#1E4E79',
  primaryDeep: '#16324F',
  /** 生成り — 画面背景 */
  paper: '#F7F6F2',
  surface: '#FFFFFF',
  ink: '#22303C',
  inkSub: '#77848F',
  line: '#E6E4DD',

  /** 状態色 */
  ok: '#2F8F6B',
  caution: '#D97E00',
  danger: '#C6372F',
  /** 閉鎖・データなし */
  none: '#B8BDC2',
  /** 水色 — 地図の平常時水位ピン専用。緑だと避難所ピンと紛れるため分ける */
  waterCalm: '#3D9BCF',

  /** 燈 — AR の CTA 専用。他の用途に使わない */
  ember: '#D96C3D',
  /** デモモード識別色 */
  demo: '#5B4A8A',
  demoAccent: '#FFD76B',
} as const;

/** 直方市中心部の初期表示領域(市街地と遠賀川が収まる範囲) */
export const NOGATA_REGION = {
  latitude: 33.744,
  longitude: 130.729,
  latitudeDelta: 0.05,
  longitudeDelta: 0.04,
} as const;

/**
 * フローティングのネイティブタブバーが覆う高さ。
 * タブバーはコンテンツの上に重なるため、スクロール末尾がこの分だけ隠れる。
 * リストの下部パディングに safe area と合わせて足す。
 */
export const TAB_BAR_SPACE = 72;
