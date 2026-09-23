# 直方ベース

直方市の防災ダッシュボード「災害時情報共有PF(公開用)」をモバイルアプリにし、AR 浸水体験を加えた個人開発アプリ。e-ZUKA スマートアプリコンテスト 2026 への出品用。

- 地図: 避難所・車中泊避難所・水位計・被害報告・交通規制のピンに、ハザードの塗り(洪水浸水想定、地震ハザード、地形の分類)、区域(土砂災害警戒区域、家屋倒壊等氾濫想定区域)、人口の目安、自然災害伝承碑を重ねて表示
- 水位: 市内の水位センサー・転倒ゲートの一覧と警戒判定。川の防災情報(国交省)へのリンク
- 避難所: 対応災害のタグと絞り込み、詳細(収容・床面積・避難者内訳)。自宅を設定すると道のり順になり徒歩分数が出る
- AR 浸水体験: 現在地の想定浸水深を実寸の水面として表示(実機 iPhone のみ)
- 公式情報: 市、県、気象庁、川、電気、安否確認の公式ページへの入口(リンクのみ)と、災害時の無料 Wi-Fi(00000JAPAN)の説明
- デモモード: 通信なしで大雨と地震の災害時の画面を再現(審査・展示用)
- やさしい日本語モードと文字サイズ3段階。圏外のときは「オフライン」の帯を出す

## 必要なもの

- Node.js(LTS)と npm
- Xcode と実機 iPhone
- **Expo Go では動かない**。ネイティブモジュール(ViroReact・react-native-maps)を含むため、dev client のビルドが必要
- **iOS シミュレータでも動かない**。ViroKit が実機専用バイナリのため、シミュレータ向けビルド自体が失敗する

## 起動

```bash
npm install
npx expo run:ios --device   # 実機のみ。初回はネイティブビルドで数分かかる
```

2回目以降は dev client がインストール済みなので、`npm start` で開発サーバを起動してアプリを開くだけでよい。

### 実機ビルドの注意

- Apple Developer の署名が必要。`app.json` の `appleTeamId` を自分のチーム ID に変更する
- iPhone 側で「デベロッパモード」を有効化し、初回起動時に開発者証明書を信頼する
- 「No script URL provided」等が出る場合は、iPhone の設定でアプリの「ローカルネットワーク」を許可する
- ポート 8081 を他プロセス(Docker 等)が使っている場合は `--port 8082` を付ける

### デモ用ビルド(Release)

開発ビルド(dev client)は起動のたびに Mac 上の開発サーバから JS を受け取るため、Mac と同じネットワークにいないとアプリ画面まで進めない。
Release 構成でビルドすると JS がアプリに埋め込まれ、インストール後は Mac なしで単体で起動する。
デモブースや人に見せる場面ではこちらを使う。

署名には無料の Apple ID(Personal Team)で作れる開発用プロファイルを使う。
このプロファイルは作成から 7 日で失効し、失効するとアプリが起動しなくなる(端末内の設定は消えない)。
アプリの有効期限はビルド時に使ったプロファイルの期限で決まるため、デモ前の入れ直しは次の手順で新しいプロファイルから作る。

1. このアプリの古いプロファイルを消す。失効したプロファイルは Xcode が自動で削除するため、ディレクトリが空でも何も起きない。プロファイルのファイル名は UUID なので、中身の bundle ID で選ぶ。他のプロジェクトのプロファイルは残る

   ```bash
   find ~/Library/Developer/Xcode/UserData/Provisioning\ Profiles -name '*.mobileprovision' \
     -exec sh -c 'security cms -D -i "$1" 2>/dev/null | grep -q com.anonymous.nogata-app && rm -v "$1"' _ {} \;
   ```

2. プロファイルの生成を Xcode に許可してビルドする。UDID は `xcrun xctrace list devices` で確認できる

   ```bash
   xcodebuild -workspace ios/app.xcworkspace -scheme app -configuration Release \
     -destination "id=<iPhone の UDID>" -allowProvisioningUpdates -allowProvisioningDeviceRegistration
   ```

   `appleTeamId` を設定済みのプロジェクトでは Expo CLI がこの許可を Xcode に渡さない(Expo SDK 57 で確認)ため、プロファイルが無いまま手順 3 を実行すると `No profiles for 'com.anonymous.nogata-app' were found` で止まる。
   手順 1 でプロファイルを消しているので、この手順は毎回実行する

3. Release 構成でビルドしてインストールする。手順 2 とビルド成果物を共有するので差分ビルドで済む(1〜2 分程度)

   ```bash
   npx expo run:ios --device --configuration Release --no-bundler
   ```

   `--no-bundler` は Release では使わない開発サーバを起動させないための指定。
   付けないと開発サーバが立ち上がったままコマンドが終わらず、ポート 8081 が塞がっていれば確認も求められる

4. 起動が `profile has not been explicitly trusted by the user` で拒否されたら、iPhone の 設定 → 一般 → VPN とデバイス管理 で開発者を信頼してから開く。初回に限らず、入れ直しで再度求められることがある

生成されたプロファイルの期限は次のコマンドで確認できる。
この日付を過ぎるとアプリが起動しなくなるので、デモや審査の当日が期限より後なら、当日の朝に手順 1 から回し直す。

```bash
find ~/Library/Developer/Xcode/UserData/Provisioning\ Profiles -name '*.mobileprovision' \
  -exec sh -c 'security cms -D -i "$1" | plutil -extract ExpirationDate raw -' _ {} \;
```

補足:

- 開発ビルドと同じ bundle ID なので、入れると開発ビルドが置き換わる。開発に戻すときは従来どおり `npx expo run:ios --device` で入れ直す
- 埋め込まれるのはアプリのコードと画像で、地図タイルや水位・避難所の実データは iPhone の通信で取得する。デモモードと AR の水面表示は通信なしで動く(AR が現在地の想定浸水深を初期値に取る処理だけは通信が要り、取れなければ既定値で始まる)

### AR について

AR 非対応の環境では、AR 画面は案内表示にフォールバックする。水面の表示検証は実機でしかできない。

## 開発コマンド

| コマンド            | 内容                                   |
| ------------------- | -------------------------------------- |
| `npm run typecheck` | TypeScript 型検査                      |
| `npm test`          | jest(データ層の防御・状態判定のテスト) |
| `npm run lint`      | ESLint(import 順のチェックを含む)      |
| `npm run format`    | Prettier で全体整形                    |

コミット時は husky + lint-staged が Prettier と `eslint --fix` を自動適用する。

## データと注意点

- **サーバを持たない**。直方市が公開している ArcGIS Feature Service をクライアントから直接読む。市側の設定変更で予告なく取得できなくなる可能性がある
- **読み取り専用**。書き込み系 API は呼ばない。取得フィールドはホワイトリスト(`src/data/arcgis/layers.ts`)で管理し、報告者名・電話番号などの個人情報フィールドは取得しない
- じぶん設定(自宅ピン等)は端末内にのみ保存し、外部送信しない
- **平常時は空データが正常**。避難所ゼロ・被害報告ゼロでも不具合ではない。画面の動きを見るには「その他 → デモモード」を有効にする
- 川の防災情報(river.go.jp)と九州電力送配電の停電情報へはリンクで誘導するのみ。API 取得・スクレイピングはしない(どちらも利用規約で機械取得が禁じられている)
- 地震ハザード(`src/constants/quake-mesh.json`)は J-SHIS 地震ハザードステーション(防災科学技術研究所)2024年基準 NIED作成版を `scripts/quake-hazard.py` で直方市域ぶんに加工して同梱している。出典表記を外さないこと
- 自然災害伝承碑(`src/constants/lore-monuments.json`)は国土地理院の自然災害伝承碑データ(GeoJSON)を `scripts/lore-monuments.py` で直方市の分に加工して同梱している。碑文の要約は市が登録した原文のまま。写真は扱わない。出典表記を外さないこと
- 人口の目安(`src/constants/population-mesh.json`)は国土数値情報 500mメッシュ別将来推計人口(国土交通省、CC BY 4.0)の 2025年の推計値を `scripts/flood-population.py` で直方市域に按分し、地域名を令和2年国勢調査の小地域境界(e-Stat)から付けて同梱している。2020年の国勢調査をもとにした推計であり、いまの住民の数ではない。出典表記を外さないこと
- 車中泊避難所(`src/constants/car-shelters.ts`)は市の公式サイトの一覧(2026-07 時点)から起こした静的データで、開設状況の配信はない
- ハザードの塗りと区域は重ねるハザードマップ(国土交通省)と地理院タイルの配信タイルをそのまま描く(`docs/api-spec.md` §7、§11)。加工物は持たない
- 避難所までの道のり(`src/constants/walk-graph.json`)は OpenStreetMap の道路を `scripts/walk-graph.py` で直方市域ぶんに加工して同梱し、端末内で最短経路を引く。この JSON は OpenStreetMap の派生データベースで ODbL(<https://www.openstreetmap.org/copyright>)に従い、リポジトリの MIT ライセンスの対象外。出典表記「© OpenStreetMap contributors」を外さないこと
- 本アプリは直方市の公式アプリではない。避難の判断は市の公式情報に従うこと

## ドキュメント

| ファイル                     | 内容                                                 |
| ---------------------------- | ---------------------------------------------------- |
| `docs/requirements.md`       | 要件・スコープ・スケジュール                         |
| `docs/api-spec.md`           | 全データソースの仕様(ArcGIS、外部リンク、同梱データ) |
| `docs/design/ui-mockup.html` | UI カンプ(画面 ID・配色トークン)                     |
| `CLAUDE.md`                  | 開発ルール(データの絶対ルールを含む)                 |
