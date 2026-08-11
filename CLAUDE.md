# 直方ベース

直方市の防災ダッシュボードのモバイルアプリ化に AR 浸水体験を加えた個人開発アプリ。
e-ZUKA スマートアプリコンテスト2026(締切 2026-08-14)への出品版を開発している。

## 正とするドキュメント

この CLAUDE.md には要点だけを書く。詳細は以下が正であり、矛盾したらそちらに従う。

- `docs/requirements.md`:要件・スコープ・判断日・スケジュール。**機能の追加や削減はここの判断日ルールに従う。会話の流れで勝手にスコープを増やさない**
- `docs/api-spec.md`:全データソースの仕様(エンドポイント・フィールド・フィルタ・出典)
- `docs/design/ui-mockup.html`:UI カンプ(画面 ID S-01〜S-07、配色・状態表現のトークン)

## 技術構成

- React Native + Expo(dev client 前提。Expo Go では動かない)
- AR:ViroReact(@reactvision/react-viro)+ ARKit。iOS 先行、実機 iPhone で検証する。**ViroKit は実機専用**のため AR 本体(features/ar/flood-experience)をルートから静的 import しない(/ar で利用可否を判定してから遅延 require)。シミュレータ・Expo Go は案内画面にフォールバック
- 地図:react-native-maps(Apple Maps)+ UrlTile。Google Maps API 等の有料キーは使わない
- サーバなし。クライアントから公開 API を直接叩く。バックエンドを追加しない

## データの絶対ルール

破ると市民の個人情報や市との信頼に関わる。例外なく守る。

1. **個人情報フィールドを取得しない**。ArcGIS への全クエリは `outFields` 明示指定とし、許可フィールドのホワイトリストを一箇所(データ層)で管理する。`field_10`・`field_11`・`Creator`・`Editor`・`input_p`・`input_tel` は取得・表示・保存・ログ出力のすべてを禁止
2. **ArcGIS へは読み取り専用**。書き込み系エンドポイント(addFeatures 等)を呼ぶコードを書かない
3. **公開フラグのフィルタを必ず適用**(`field_7='公開'`、`openFlg='公開'`)。非公開データを表示しない
4. **じぶん設定(自宅ピン等)は端末内にのみ保存**し、外部送信するコードを書かない(要件 NF-07)
5. kawabou(river.go.jp)へはリンクアウトのみ。スクレイピング・API 呼び出しを実装しない

## 実装の約束

- データ層はリポジトリパターン。ライブ API とデモモード用フィクスチャを DI で差し替えられる構造を保つ(デモモードは審査の中心機能)
- 日付は全ソースがエポックミリ秒。表示は必ず JST の「◯月◯日 ◯:◯ 時点」形式
- 平常時は空データが正常系。一覧・地図は空状態 UI を必ず持つ
- 座標は `f=geojson` または `outSR=4326` で WGS84 に統一して受け取る
- 状態色は 平常=緑 / 注意=橙 / 危険=赤 / 閉鎖・なし=灰 の共通言語(トークンはカンプ参照)

## 前提とするグローバルスキル

この repo はユーザースコープに以下が入っている前提で運用する。別環境では `npx skills add` で導入する。

- `react-native-best-practices`(Callstack)/ `vercel-react-native-skills`:RN 実装・性能。RN のコードを書く際に自動適用される
- `comment-quality`:コード内コメントと spec 説明文を書く・直す・レビューするとき必ず使う
- `japanese-tech-writing`:ドキュメント・PR 説明・仕様書など日本語の文章を書く・推敲するとき必ず使う

## コメントと日本語

- コード内コメントは日本語で、why / why-not のみを書く(what を書かない)。粒度・語彙は `comment-quality` に従う
- ドキュメント・PR 説明の文体は `japanese-tech-writing` に従う。LLM 口調の空句(「重要なのは〜」「包括的」等)を使わない

## コマンド

- `npm start`:開発サーバ起動(`npm run ios` で iOS シミュレータ)
- `npm run typecheck`:TypeScript 型検査
- `npm test`:jest(データ層のホワイトリスト防御・状態判定のテストを含む)
- `npm run lint`:ESLint(expo lint)
- `npm run format`:Prettier で全体整形(シングルクォート・`.prettierrc` が正)

変更後は typecheck・test・lint の3つを通してからコミットする。コミット時は husky + lint-staged がステージ済みファイルへ Prettier と `eslint --fix`(import 順の統一を含む)を自動適用する。AR(ViroReact)導入後は Expo Go では動かず、dev client の実機ビルドが必要。

## コミット規約

Conventional Commits を日本語で使う。形式は `type(scope): 要約`(scope は任意、要約は日本語)。

- `feat`: 利用者から見える機能の追加・変更
- `fix`: 不具合の修正
- `docs`: ドキュメントのみの変更
- `refactor`: 挙動を変えないコードの整理
- `test`: テストのみの追加・修正
- `perf`: 性能改善
- `chore`: 依存・設定・スクリプトなど上記以外

1コミット=1意味単位は従来どおり。本文は必要なときだけ書き、what の羅列ではなく why を書く。

## 実装の標準ループ

1. 着手前: 関連スキルを読み込む(RN コードなら RN 系、コメントを書くなら comment-quality)
2. 実装 → 機械的検証(typecheck・test・lint)
3. まとまった変更は /code-review で粗探し → 指摘を検証 → 修正
4. 画面に触れる変更はシミュレータ or 実機で実動確認(機械的検証だけで完了と言わない)
5. コミット(意味単位・日本語メッセージ・コミット規約の type を付ける)
