import { RIVER_INFO_LABEL } from '@/constants/links';
import { AR_UNAVAILABLE_MESSAGE } from '@/features/ar/availability';

/**
 * やさしい日本語モードの固定文言カタログ。多言語対応ではなく日本語1言語で、
 * アプリが持つ固定文言だけを平易版へ切り替える。API 由来の動的テキスト(避難所名・
 * 自由記述)と数を数える文、出典表記は対象外。
 * 避けられない漢字には「漢字(かんじ)」形式で読みを添え、語のまとまりに空白を入れる。
 *
 * `easy` を省略した項目は平易版でも同じ文言を使う(元から平易、または固有名詞)。
 * フック(useCopy)から設定を巻き込まずに網羅テストできるよう、純粋データとして
 * React・端末ストレージから切り離してここに置く。
 */
export type CopyEntry = { standard: string; easy?: string };

export const PLAIN_JAPANESE_COPY = {
  // ---- 共通 ----
  back: {
    standard: '戻る',
    easy: 'もどる',
  },
  close: {
    standard: '閉じる',
    easy: 'とじる',
  },
  loading: {
    standard: '読み込み中…',
    easy: 'よみこんで います…',
  },
  listLoadError: {
    standard: '取得に失敗しました。下に引っぱると再読み込みします。',
    easy: 'じょうほうを とれませんでした。がめんを 下(した)に ひっぱると、もう いちど よみこみます。',
  },
  approxPrefix: {
    standard: '約',
    easy: 'だいたい',
  },
  dateUnknown: {
    standard: '不明',
    easy: 'わからない',
  },
  /** formatJst が日時の後ろに付ける語。先頭の空白は日時との区切り */
  dateSuffix: {
    standard: ' 時点',
    easy: ' の じょうほう',
  },
  /** 取得失敗時に、表示中のキャッシュの古さを示す。日時(formatJstMoment)の後ろに付ける */
  cachedAsOf: {
    standard: ' 時点の情報を表示しています',
    easy: ' の じょうほうを 見(み)せて います',
  },

  // ---- タブ・画面タイトル ----
  tabHome: {
    standard: 'ホーム',
  },
  tabWater: {
    standard: '水位',
    easy: 'みず',
  },
  tabShelters: {
    standard: '避難所',
    easy: 'にげるところ',
  },
  tabMore: {
    standard: 'その他',
    easy: 'そのほか',
  },
  waterScreenTitle: {
    standard: '水位',
    easy: '水(みず)の 高(たか)さ',
  },
  sheltersScreenTitle: {
    standard: '避難所',
    easy: 'にげる ところ',
  },
  moreScreenTitle: {
    standard: 'その他',
    easy: 'そのほか',
  },

  // ---- ホーム(地図) ----
  // レイヤー選択シートの項目名。チップだったときの短縮形(「車中泊」「被害」「規制」)は
  // 一覧に並べると何の情報か分からないため、正式な呼び名に戻している
  layerShelters: {
    standard: '避難所',
    easy: 'にげる ところ',
  },
  layerCarShelters: {
    standard: '車中泊避難所',
    easy: 'くるまで とまれる にげる ところ',
  },
  layerWater: {
    standard: '水位',
    easy: '水(みず)の 高(たか)さ',
  },
  layerDamage: {
    standard: '被害報告',
    easy: '被害(ひがい)の ほうこく',
  },
  layerTraffic: {
    standard: '交通規制',
    easy: '交通規制(こうつうきせい)',
  },
  // 「レイヤー」は外来語のまま。地図アプリで定着した呼び名で、言い換えると逆に伝わらない
  layersButton: {
    standard: 'レイヤー',
  },
  a11yLayersButton: {
    standard: '地図に出すものを選ぶ',
    easy: '地図(ちず)に 出(だ)す ものを えらぶ',
  },
  layerSheetTitle: {
    standard: '地図に出すもの',
    easy: '地図(ちず)に 出(だ)す もの',
  },
  layerSectionNow: {
    standard: 'いまの状況',
    easy: 'いまの ようす',
  },
  layerSectionFill: {
    standard: '塗り(1つ選ぶ)',
    easy: '色(いろ)を ぬる(1つ えらぶ)',
  },
  layerSectionAreas: {
    standard: '重ねる区域',
    easy: 'かさねる ところ',
  },
  fillNone: {
    standard: 'なし',
  },
  fillFlood: {
    standard: '洪水の浸水想定',
    easy: '洪水(こうずい)で 水(みず)が くる ところ',
  },
  fillFloodDesc: {
    standard: '川があふれたとき、どこがどれくらい沈むか',
    easy: '川(かわ)が あふれたとき、どこが どのくらい しずむか',
  },
  fillQuake: {
    standard: '地震のリスク',
    easy: '地震(じしん)の きけん',
  },
  fillQuakeDesc: {
    standard: '今後30年に強い揺れに見舞われる確率と地盤',
    easy: 'これから 30年(ねん)で 強(つよ)く ゆれる かのうせいと、地面(じめん)の かたさ',
  },
  fillLandform: {
    standard: '地形の分類',
    easy: '地形(ちけい)の 種類(しゅるい)',
  },
  fillLandformDesc: {
    standard: '土地の成り立ち。水が溜まりやすい場所がわかる',
    easy: '土地(とち)が どう できたか。水(みず)が たまりやすい ところが わかる',
  },
  landformNote: {
    standard: '白く抜けた所と山側は図の範囲外です。安全という意味ではありません',
    easy: '白(しろ)い ところと 山(やま)の ほうは、この 地図(ちず)に ない ところです。安全(あんぜん)という いみでは ありません',
  },
  areaLandslide: {
    standard: '土砂災害の区域',
    easy: '土砂(どしゃ)災害(さいがい)の ところ',
  },
  areaHouseCollapse: {
    standard: '家屋倒壊の区域',
    // 「想定区域」なので、必ず壊れると読まれないよう「かもしれない」を入れる
    easy: '家(いえ)が こわれる かもしれない ところ',
  },
  areaPopulation: {
    standard: '人口',
    easy: '人(ひと)の 数(かず)',
  },
  areaPopulationDesc: {
    standard: '500mごとの推計人口。地震のリスク、地形の分類とは同時に出せません',
    // 「推計」を落とすと実数に読めるため、「だいたいの」で見積もりだと分かるようにする
    easy: '500m ごとの だいたいの 人(ひと)の 数(かず)。地震(じしん)の きけんや 地形(ちけい)の 種類(しゅるい)とは いっしょには 出(だ)せません',
  },
  layerSectionMemory: {
    standard: '記憶',
    easy: 'むかしの こと',
  },
  layerLore: {
    standard: '自然災害伝承碑',
    easy: '自然(しぜん)災害(さいがい)伝承碑(でんしょうひ)',
  },
  layerLoreDesc: {
    standard: '過去の災害を伝える石碑。タップで伝承の内容が読めます',
    easy: '昔(むかし)の 災害(さいがい)を つたえる 石碑(せきひ)。タップすると 内容(ないよう)が 読(よ)めます',
  },
  loreSheetTitle: {
    standard: '自然災害伝承碑',
    easy: '自然(しぜん)災害(さいがい)伝承碑(でんしょうひ)',
  },
  loreBuiltYear: {
    standard: '建立年',
    easy: '建(た)てた 年(とし)',
  },
  loreDisaster: {
    standard: '災害名',
    easy: '災害(さいがい)の 名前(なまえ)',
  },
  loreStory: {
    standard: '伝承内容',
    easy: 'つたえて いる こと',
  },
  loreStoryNote: {
    standard: '内容は直方市が国土地理院に登録した文のままです',
    easy: '文(ぶん)は 直方市(のおがたし)が 国土地理院(こくどちりいん)に 登録(とうろく)した ままです',
  },
  loreRouteButton: {
    standard: '碑の場所を地図アプリで見る ↗',
    easy: '碑(ひ)の ばしょを ちずアプリで みる ↗',
  },
  legendExpand: {
    standard: '凡例を見る',
    easy: '色(いろ)の いみを 見(み)る',
  },
  populationSheetTitle: {
    standard: 'このあたりに住む人',
    easy: 'この あたりに すんで いる 人(ひと)',
  },
  population65Label: {
    standard: '65歳以上',
    easy: '65歳(さい)いじょう',
  },
  populationMeshNote: {
    standard: '500m四方ごとの推計値(2025年)です。',
    easy: '500m しかくごとの だいたいの 数(かず)(2025年)です。',
  },
  /** 地域名(固有名詞・原文のまま)の後ろに付ける語。先頭の空白は名前との区切り */
  populationAreaSuffix: {
    standard: ' 付近',
    easy: ' の あたり',
  },
  populationLegendTitle: {
    standard: '人口(500mごと)',
    easy: 'すんで いる 人(ひと)の 数(かず)',
  },
  quakeSheetTitle: {
    standard: 'この場所の地震のリスク',
    easy: 'この ばしょの 地震(じしん)の きけん',
  },
  // 「以上」は境界の値を含むため、「より強い」に言い換えず読みを添える(65歳以上と同じ扱い)
  quakeP55Label: {
    standard: '今後30年に震度6弱以上',
    easy: 'これから 30年(ねん)で 震度(しんど)6弱(じゃく)いじょう',
  },
  quakeP50Label: {
    standard: '震度5強以上',
    easy: '震度(しんど)5強(きょう)いじょう',
  },
  quakeP60Label: {
    standard: '震度6強以上',
    easy: '震度(しんど)6強(きょう)いじょう',
  },
  quakeGroundLabel: {
    standard: '地盤',
    easy: '地盤(じばん)',
  },
  quakeAmpLabel: {
    standard: '揺れの増幅',
    easy: 'ゆれの 大(おお)きさ',
  },
  quakeUnitTimes: {
    standard: '倍',
    easy: '倍(ばい)',
  },
  // 地震本部の解説に合わせた注意書き。確率の低さを安全と読ませない
  quakeNote: {
    standard: '確率は相対的な目安で、安全度ではなく危険度を示します',
    easy: 'この 数字(すうじ)は めやすです。安全(あんぜん)を しめす ものでは ありません',
  },
  quakeMeshNote: {
    standard: '250m四方ごとの値(2024年版)です。',
    easy: '250m しかくごとの 数字(すうじ)(2024年版)です。',
  },
  // 凡例の見出しと断層の説明は正式名称と専門語なので、平易版でも変えない
  quakeLegendTitle: {
    standard: '今後30年に震度6弱以上の確率',
  },
  quakeFaultLegend: {
    standard: '福智山断層帯(断層モデルの上端、深さ3km)',
  },
  summaryHomeQuake: {
    standard: '自宅の地点',
    easy: 'じぶんの いえの ばしょ',
  },
  a11yShowWholeCity: {
    standard: '直方市全体を表示',
    easy: '直方市(のおがたし) ぜんぶを 見(み)る',
  },
  a11yShowMyLocation: {
    standard: '現在地を表示',
    easy: 'いまの ばしょを 見(み)る',
  },
  a11yHomePin: {
    standard: '自宅',
    easy: 'じぶんの いえ',
  },
  summaryTitle: {
    standard: 'いまの状況',
    easy: 'いまの ようす',
  },
  a11ySummaryCollapse: {
    standard: 'いまの状況をたたむ',
    easy: 'いまの ようすを とじる',
  },
  a11ySummaryExpand: {
    standard: 'いまの状況をひらく',
    easy: 'いまの ようすを ひらく',
  },
  summaryPartialError: {
    standard: '一部の情報を取得できません。タップして再試行',
    easy: 'とれて いない じょうほうが あります。タップすると もう いちど とります。',
  },
  summaryNearestShelter: {
    standard: '最寄りの避難所',
    easy: 'いちばん 近(ちか)い にげる ところ',
  },
  summaryArLink: {
    standard: '現在地の浸水を AR で体感する ›',
    easy: 'いまの ばしょの 水(みず)の ふかさを AR で 見(み)る ›',
  },
  // 平常時は0件が正常のため、空状態の文言を必ず持つ
  summaryDamageEmpty: {
    standard: '現在、公開されている被害情報はありません',
    easy: 'いま 見(み)られる 被害(ひがい)の じょうほうは ありません',
  },
  summaryTrafficEmpty: {
    standard: '交通規制はありません',
    easy: '交通規制(こうつうきせい)は ありません',
  },

  // ---- 被害報告・交通規制の詳細シート ----
  damageWorkResult: {
    standard: '作業結果',
    easy: 'さぎょうの けっか',
  },
  damageHqNote: {
    standard: '災害対策本部より',
    easy: '市(し)の 災害対策本部(さいがいたいさくほんぶ)より',
  },
  trafficStart: {
    standard: '開始',
    easy: 'はじまり',
  },
  trafficEnd: {
    standard: '解除',
    easy: 'おわり',
  },
  trafficEndUndecided: {
    standard: '未定',
    easy: 'まだ わかりません',
  },

  // ---- 水位 ----
  waterHeadlineSub: {
    standard: '市内の水位センサー・転倒ゲート(数分おきに更新)',
    easy: '直方市(のおがたし)の 水(みず)の 高(たか)さです。数分(すうふん)ごとに 新(あたら)しく なります。',
  },
  listEmptyWater: {
    standard: '観測データがありません',
    easy: 'いま データが ありません',
  },
  waterNowLabel: {
    standard: '水位',
    easy: 'いまの 水(みず)',
  },
  waterAlertLabel: {
    standard: '警戒',
    easy: 'あぶない 高(たか)さ',
  },
  // 標準側は links.ts を正とし、平易版だけをここで持つ
  riverInfoLabel: {
    standard: RIVER_INFO_LABEL,
    easy: '直方市(のおがたし)の 川(かわ)の 水(みず)',
  },
  riverInfoSub: {
    standard: '川の防災情報(国土交通省)を開きます',
    easy: '国(くに)の サイト「川の防災情報」を ひらきます',
  },

  // ---- 避難所 ----
  shelterFilterLabel: {
    standard: '対応災害でしぼる',
    easy: 'さいがいの しゅるいで えらぶ',
  },
  listEmptyShelter: {
    standard: '避難所データがありません',
    easy: 'いま データが ありません',
  },
  listEmptyShelterFiltered: {
    standard: '条件に合う避難所がありません',
    easy: 'えらんだ さいがいに あう にげる ところは ありません',
  },
  sortedByHomeSuffix: {
    standard: '(自宅から近い順)',
    easy: '(いえから 近(ちか)い じゅん)',
  },

  // ---- 詳細シート ----
  statCapacity: {
    standard: '収容可能人数',
    easy: '入(はい)れる 人(ひと)の 数(かず)',
  },
  statFloorArea: {
    standard: '床面積',
    easy: 'ひろさ',
  },
  statEvacuating: {
    standard: '避難中',
    easy: 'いま いる人(ひと)',
  },
  unitHouseholds: {
    standard: '世帯',
    easy: 'かぞく',
  },
  // 「人」「㎡」は元から平易・記号のため easy を持たない(将来の翻訳のための抽出)
  unitPeople: {
    standard: '人',
  },
  unitSquareMeters: {
    standard: '㎡',
  },
  sectionSupportedHazards: {
    standard: '対応する災害',
    easy: 'どの さいがいで つかえるか',
  },
  sectionEvacueeBreakdown: {
    standard: '避難中の内訳',
    easy: 'いま いる人(ひと)の 数(かず)',
  },
  breakdownAge: {
    standard: '年齢',
    easy: 'とし',
  },
  breakdownMale: {
    standard: '男性',
    easy: 'おとこ',
  },
  breakdownFemale: {
    standard: '女性',
    easy: 'おんな',
  },
  telLabel: {
    standard: '電話',
    easy: '電話(でんわ)',
  },
  routeButton: {
    standard: '経路を見る(地図アプリ) ↗',
    easy: 'いきかたを みる(ちずアプリ) ↗',
  },
  carShelterBadge: {
    standard: '車中泊避難所',
    easy: 'くるまで とまれる',
  },
  carShelterApprox: {
    standard: '地図上のピンの位置は住所からの概算です。',
    easy: 'ピンの ばしょは だいたいです。',
  },
  carShelterNote: {
    standard: '開設状況は配信されていません。市の発表を確認してから向かってください。',
    easy: 'あいて いるか どうかは わかりません。市(し)の おしらせを 見(み)てから 行(い)って ください。',
  },

  // ---- その他(設定) ----
  captionPrepare: {
    standard: '備え',
    easy: 'そなえ',
  },
  captionLife: {
    standard: '暮らし',
    easy: 'くらし',
  },
  captionApp: {
    standard: 'アプリ',
  },
  captionCredits: {
    standard: '出典・免責',
    easy: 'じょうほうの もとと おことわり',
  },
  rowHazardMap: {
    standard: 'ハザードマップを重ねる',
    easy: 'きけんな ばしょを 地図(ちず)に 出(だ)す',
  },
  rowHomePin: {
    standard: 'じぶん設定(自宅ピン)',
    easy: 'じぶんの せってい(いえの ばしょ)',
  },
  homePinConfigured: {
    standard: '設定済み',
    easy: 'せってい ずみ',
  },
  rowDisasterWifi: {
    standard: '災害時の無料 Wi-Fi',
    // 「ただの Wi-Fi」は「単なる Wi-Fi」と読めるため、動詞にほどいて誤読を防ぐ
    easy: 'さいがいの ときに ただで つかえる Wi-Fi',
  },
  /** Wi-Fi 一覧で探す文字列そのものなので、平易版でも表記を変えない */
  disasterWifiSsid: {
    standard: '00000JAPAN',
  },
  disasterWifiTooltip: {
    standard:
      '大きな災害や通信障害のとき、携帯電話会社などが無料で開放する公衆 Wi-Fi です。ID もパスワードもいりません。',
    easy: '大(おお)きな さいがいの ときや、でんわや ネットが つかえなく なった ときに、けいたい電話(でんわ)の 会社(かいしゃ)などが ただで つかわせて くれる Wi-Fi です。ID も パスワードも いりません。',
  },
  disasterWifiLead: {
    standard:
      '大きな災害や通信障害で通信が使えなくなったとき、携帯電話会社や自治体、施設の Wi-Fi が「00000JAPAN」の名前で無料開放されます。ふだんは使えません。',
    easy: '大(おお)きな さいがいの ときや、でんわや ネットが つかえなく なった ときに、けいたい電話(でんわ)の 会社(かいしゃ)や 市(し)や おみせの Wi-Fi が「00000JAPAN」と いう 名前(なまえ)に なって、ただで つかえます。いつもは つかえません。',
  },
  disasterWifiStepsTitle: {
    standard: 'つなぎ方',
    easy: 'つなぎかた',
  },
  disasterWifiStep1: {
    standard: 'スマートフォンの「設定」から Wi-Fi を開く',
    easy: 'スマホの「せってい」から Wi-Fi を ひらく',
  },
  disasterWifiStep2: {
    standard: '一覧から「00000JAPAN」を選ぶ',
    easy: 'ならんで いる 中(なか)から「00000JAPAN」を えらぶ',
  },
  // 手順は語尾を辞書形でそろえる。3つ目だけ文を挟むと読む速さが落ちる
  disasterWifiStep3: {
    standard: 'パスワードを入れずに、画面の案内にしたがって使いはじめる',
    easy: 'パスワードは いれないで、がめんの あんないの とおりに つかいはじめる',
  },
  disasterWifiCaution: {
    standard:
      '通信の内容は暗号化されません。ID やパスワード、クレジットカード番号の入力は避けてください。',
    // 「暗号化されない」が何を招くかを、平易版では結果の側から書く
    easy: 'この Wi-Fi は、つうしんの 中身(なかみ)を ほかの 人(ひと)に 見(み)られる ことが あります。ID や パスワード、カードの ばんごうは いれないで ください。',
  },
  disasterWifiNote: {
    standard:
      'いま開放されているかどうかは、このアプリでは確認できません。Wi-Fi の一覧に「00000JAPAN」があるかで確かめてください。',
    easy: 'いま つかえるか どうかは、この アプリでは わかりません。スマホの Wi-Fi の ところに「00000JAPAN」が あるか 見(み)て ください。',
  },
  rowGarbage: {
    standard: 'ごみ収集日',
    easy: 'ごみの 日(ひ)',
  },
  rowCityNews: {
    standard: '市のお知らせ',
    easy: '市(し)からの おしらせ',
  },
  badgePreparing: {
    standard: '準備中',
    easy: 'じゅんびちゅう',
  },
  rowTextSize: {
    standard: '文字サイズ',
    easy: '文字(もじ)の 大(おお)きさ',
  },
  textSizeStandard: {
    standard: '標準',
    easy: 'ふつう',
  },
  textSizeLarge: {
    standard: '大きめ',
    easy: 'おおきめ',
  },
  textSizeXLarge: {
    standard: '特大',
    easy: 'とくだい',
  },
  rowEasyJapanese: {
    standard: 'やさしい日本語',
  },
  rowDemoMode: {
    standard: 'デモモード',
  },
  rowDemoScenario: {
    standard: 'シナリオ',
    easy: 'さいがいの しゅるい',
  },
  demoScenarioRain: {
    standard: '大雨',
    easy: '大雨(おおあめ)',
  },
  demoScenarioQuake: {
    standard: '地震',
    easy: '地震(じしん)',
  },
  lifeNote: {
    standard: '防災のつぎは、毎日の暮らしへ。',
    easy: 'ぼうさいの つぎは、まいにちの くらしへ。',
  },
  demoNote: {
    standard: '災害時の直方市を想定したデータを表示します。通信は行いません。',
    easy: 'さいがいの ときの 直方市(のおがたし)を れんしゅうで 見(み)せます。インターネットは つかいません。',
  },
  // 「再現」でなく「想定」。地震は市で起きた出来事でなく架空の想定で、実在の被災事実に見せない
  demoBannerRain: {
    standard: 'デモモード — 大雨災害の想定シナリオを表示中',
    easy: 'デモモード — 大雨(おおあめ)の れんしゅうです',
  },
  demoBannerQuake: {
    standard: 'デモモード — 地震災害の想定シナリオを表示中',
    easy: 'デモモード — 地震(じしん)の れんしゅうです',
  },
  disclaimerNotOfficial: {
    standard:
      '本アプリは直方市の公式アプリではありません。避難の判断は、市の発表する公式の情報に従ってください。',
    easy: 'これは 直方市(のおがたし)の 公式(こうしき)アプリでは ありません。にげる ときは、市(し)が 出(だ)す 公式(こうしき)の 情報(じょうほう)を 見(み)て、その とおりに して ください。',
  },

  // ---- じぶん設定(自宅ピン) ----
  homePinTitle: {
    standard: 'じぶん設定',
    easy: 'じぶんの せってい',
  },
  homePinHint: {
    standard: '地図をタップするか、右上のボタンで現在地に印を付けてください。',
    easy: 'ちずを タップするか、右上(みぎうえ)の ボタンで いまの ばしょに しるしを つけて ください。',
  },
  homePinPrivacyNote: {
    standard: 'この場所は端末の中にだけ保存され、外部には送信されません。',
    easy: 'この ばしょは あなたの iPhone の 中(なか)にだけ ほぞんします。ほかには おくりません。',
  },
  homePinSave: {
    standard: 'この場所を自宅にする',
    easy: 'ここを じぶんの いえに する',
  },
  homePinClear: {
    standard: '設定を解除する',
    easy: 'せっていを けす',
  },
  a11yBackToPrev: {
    standard: '前の画面に戻る',
    easy: 'まえの がめんに もどる',
  },
  a11yShowDescription: {
    standard: '説明を見る',
    easy: 'せつめいを 見(み)る',
  },
  a11yPinAtMyLocation: {
    standard: '現在地に印を付ける',
    easy: 'いまの ばしょに しるしを つける',
  },
  a11yHomePinSave: {
    standard: 'この場所を自宅として保存する',
    easy: 'ここを じぶんの いえに する',
  },
  a11yHomePinClear: {
    standard: '自宅の設定を解除する',
    easy: 'いえの せっていを けす',
  },

  // ---- AR ----
  arTitle: {
    standard: 'AR 浸水体験',
    easy: 'AR 浸水体験(しんすい たいけん)',
  },
  // 標準側は availability.ts を正とし、平易版だけをここで持つ(標準文言の二重管理を避ける)
  arNeedsDevice: {
    standard: AR_UNAVAILABLE_MESSAGE['needs-device'],
    easy: 'AR は カメラを つかいます。本物(ほんもの)の iPhone だけで つかえます。シミュレータでは 見(み)られません。',
  },
  arNeedsDevBuild: {
    standard: AR_UNAVAILABLE_MESSAGE['needs-dev-build'],
    easy: 'Expo Go では AR は つかえません。開発(かいはつ)ビルドで この アプリを ひらいて ください。',
  },
  arShowingWater: {
    standard: '水面を表示しています',
    easy: '水(みず)を 出(だ)して います',
  },
  arSearchingFloor: {
    standard: '床を探しています…',
    easy: 'ゆかを さがして います…',
  },
  arNoFlood: {
    standard: 'この高さなら浸水しません',
    easy: 'この 高(たか)さなら 水(みず)は 来(き)ません',
  },
  arWaterMuddy: {
    standard: '泥水',
    easy: 'どろみず',
  },
  arWaterClear: {
    standard: '真水',
    easy: 'きれいな水(みず)',
  },
  arDepthSliderLabel: {
    standard: '想定浸水深(地面から)',
    easy: '水(みず)の ふかさ(じめんから)',
  },
  arFloorSliderLabel: {
    standard: '今いる場所の高さ(地面から)',
    easy: 'いま いる 高(たか)さ(じめんから)',
  },
  arSiteLookupInProgress: {
    standard: '現在地の想定浸水深を取得中…',
    easy: 'いまの ばしょの データを しらべて います…',
  },
  arSiteNoData: {
    standard: 'この場所の浸水想定データはありません',
    easy: 'この ばしょの データは ありません',
  },
  arFloorHint: {
    standard: '2階なら約3m、3階なら約6m。高い階ほど足元まで水が来にくくなります',
    easy: '2階(かい)は 約(やく)3m、3階(かい)は 約(やく)6m。上(うえ)の 階(かい)ほど 水(みず)は 来(き)にくいです',
  },
  arCoaching: {
    standard: 'iPhone をゆっくり動かして\n床を映してください',
    easy: 'iPhone を ゆっくり うごかして\nゆかを うつして ください',
  },
  a11yArClose: {
    standard: 'AR を閉じる',
    easy: 'AR を とじる',
  },

  // ---- アラート(React の外から表示) ----
  alertLocationDeniedTitle: {
    standard: '位置情報が許可されていません',
    easy: 'いまの ばしょが つかえません',
  },
  alertLocationDeniedBody: {
    standard: '現在地を表示するには、設定アプリでこのアプリの位置情報を許可してください。',
    easy: 'iPhone の せっていで、この アプリの 位置情報(いちじょうほう)を ゆるして ください。',
  },
  alertLocationFailedTitle: {
    standard: '現在地を取得できませんでした',
    easy: 'いまの ばしょが わかりませんでした',
  },
  alertLocationFailedBody: {
    standard: '電波状況を確認して再度お試しください。',
    easy: 'でんぱの よい ところで、もう いちど ためして ください。',
  },
  alertMapsFailedTitle: {
    standard: '地図アプリを開けませんでした',
    easy: 'ちずアプリを ひらけませんでした',
  },
  alertMapsFailedBody: {
    standard: '時間をおいて再度お試しください。',
    easy: 'すこし あとで、もう いちど ためして ください。',
  },
} satisfies Record<string, CopyEntry>;

export type CopyKey = keyof typeof PLAIN_JAPANESE_COPY;
