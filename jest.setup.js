// AsyncStorage のネイティブ実装は jest に無いため、公式のメモリ上の模擬に置き換える。
// 設定(settings.tsx)のように保存を伴うモジュールをテストから読めるようにするため
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
