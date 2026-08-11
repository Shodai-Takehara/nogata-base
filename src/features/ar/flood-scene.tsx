import {
  ViroAmbientLight,
  ViroARPlane,
  ViroARScene,
  ViroBox,
  ViroDirectionalLight,
  ViroMaterials,
  ViroMaterialVideo,
  ViroNode,
  ViroQuad,
  ViroText,
} from '@reactvision/react-viro';
import type { ViroAnchor } from '@reactvision/react-viro/dist/components/Types/ViroEvents';
import { useEffect, useRef, useState } from 'react';

import {
  chooseFloorAnchor,
  DEFAULT_DEPTH_M,
  DEFAULT_FLOOR_HEIGHT_M,
  effectiveWaterDepth,
  formatDepth,
  type FloorAnchorChoice,
} from '@/features/ar/water-plane';

export type WaterKind = 'muddy' | 'clear';

/**
 * 水面 Quad の一辺(m)。大きくするほど没入感は出るが、遮蔽(オクルージョン)が
 * 使えない現状では、遠くの物体に映る水位線が目線の高さに漸近して
 * 「スマホを上げると水も上がる」ように見えてしまう。有限の広さにして
 * 水の縁を空間に固定し、この錯覚を抑える
 */
const WATER_SIZE_M = 10;
/**
 * 動画1タイルの実寸(m)。実寸(2〜3m)に合わせると立った目線の浅い角度では
 * 波が遠景で潰れて平板に見えるため、あえて大きく貼って うねりを読み取れるようにする
 */
const TILE_MAIN_M = 10;
const UV_MAIN = WATER_SIZE_M / TILE_MAIN_M;

ViroMaterials.createMaterials({
  // 水面は実写のループ動画テクスチャ(assets/ar/SOURCES.md に出典と加工手順)。
  // 実写素材は上下左右がつながっていないため、Repeat だとタイルの継ぎ目が
  // 格子状に見えてしまう。Mirror(鏡面繰り返し)で継ぎ目を消す
  muddyWater: {
    diffuseTexture: require('../../../assets/ar/water-muddy.mp4'),
    normalTexture: require('../../../assets/ar/water-normal.png'),
    lightingModel: 'Blinn',
    shininess: 1.2,
    wrapS: 'Mirror',
    wrapT: 'Mirror',
  },
  clearWater: {
    diffuseTexture: require('../../../assets/ar/water-clear.mp4'),
    normalTexture: require('../../../assets/ar/water-normal.png'),
    lightingModel: 'Blinn',
    shininess: 2.0,
    wrapS: 'Mirror',
    wrapT: 'Mirror',
  },
  poleBody: { diffuseColor: '#E8E6E0', lightingModel: 'Lambert' },
  poleTop: { diffuseColor: '#C6372F', lightingModel: 'Lambert' },
});

// 水面の動きは動画テクスチャ自身に任せる。かつては平面ごと上下させる演出を
// 入れていたが、目線に近い高さの水面では水位線全体が脈動して見え、不自然だった

export type FloodSceneAppProps = {
  depthM: number;
  /** 今いる場所の高さ(地面から)。想定浸水深から引いて足元の水位を出す */
  floorHeightM: number;
  waterKind: WaterKind;
  onGroundStateChange?: (found: boolean) => void;
};

type Props = {
  sceneNavigator?: { viroAppProps?: FloodSceneAppProps };
};

/**
 * カメラ映像に水面を重ねる AR シーン(要件 F-08)。
 * テーブル等の天面を床と誤認しないよう、検出された水平面の中から
 * chooseFloorAnchor で「床」を選び、そのアンカーに水面と量水標を吸着させる。
 *
 * Viro の型定義上 initialScene.scene は引数なし関数のため props を省略可能にしているが、
 * 実行時には ViroARSceneNavigator が sceneNavigator(viroAppProps 含む)を渡してくる。
 */
export function FloodScene({ sceneNavigator }: Props = {}) {
  const appProps = sceneNavigator?.viroAppProps;
  const depthM = appProps?.depthM ?? DEFAULT_DEPTH_M;
  const floorHeightM = appProps?.floorHeightM ?? DEFAULT_FLOOR_HEIGHT_M;
  // 今いる場所の高さを引いた「足元に来る水位」を実際の水面高さにする
  const effectiveDepthM = effectiveWaterDepth(depthM, floorHeightM);
  const material = appProps?.waterKind === 'clear' ? 'clearWater' : 'muddyWater';
  // 濁流は現実でも下が見えないため不透明寄りに、真水は路面がうっすら透ける程度にする
  const surfaceOpacity = appProps?.waterKind === 'clear' ? 0.68 : 0.93;
  const [floorAnchor, setFloorAnchor] = useState<FloorAnchorChoice | null>(null);

  // updater は純粋関数である必要があり(React がレンダー中に再実行する)、
  // 中で親の setState を呼ぶと「レンダー中の別コンポーネント更新」エラーになる。
  // そのため床の有無の通知は状態確定後の副作用に分離する
  const groundFound = floorAnchor != null;
  const onGroundStateChange = appProps?.onGroundStateChange;
  useEffect(() => {
    onGroundStateChange?.(groundFound);
  }, [groundFound, onGroundStateChange]);

  // カメラの最高到達点。机を床と誤認しないための基準で、描画に使わないため ref に持つ
  // (毎フレーム届くので state にすると全体が再レンダーされ続ける)
  const maxCameraYRef = useRef<number | null>(null);
  const handleCameraTransform = (cameraTransform: { position: number[] }) => {
    const y = cameraTransform?.position?.[1];
    if (typeof y !== 'number' || !Number.isFinite(y)) return;
    maxCameraYRef.current = maxCameraYRef.current == null ? y : Math.max(maxCameraYRef.current, y);
  };

  const handleAnchor = (anchor: ViroAnchor) => {
    setFloorAnchor((current) => chooseFloorAnchor(current, anchor, maxCameraYRef.current));
  };

  const handleAnchorRemoved = (anchor?: ViroAnchor) => {
    setFloorAnchor((current) => {
      if (current == null || anchor?.anchorId !== current.anchorId) return current;
      // 選定済みの床が消えたら選び直し。他の検出済み平面の再通知は来ないため、
      // いったん未検出に戻してコーチング表示から再開する
      return null;
    });
  };

  return (
    // anchorDetectionTypes を明示しないと平面アンカーは検出されない(Viro の仕様)
    <ViroARScene
      anchorDetectionTypes={['PlanesHorizontal']}
      onAnchorFound={handleAnchor}
      onAnchorUpdated={handleAnchor}
      onAnchorRemoved={handleAnchorRemoved}
      onCameraTransformUpdate={handleCameraTransform}>
      {/* 量水標の陰影用。AR は実光源を持たないため仮想ライトを置く */}
      <ViroAmbientLight color="#ffffff" intensity={500} />
      <ViroDirectionalLight color="#ffffff" direction={[0.3, -1, -0.2]} intensity={900} />

      {/* 水面が見えているときだけ動画を回す(非表示中のデコードで電池を使わない) */}
      {floorAnchor && effectiveDepthM > 0 ? (
        <ViroMaterialVideo material={material} paused={false} loop muted />
      ) : null}

      {floorAnchor ? (
        // key で床の切り替え時に必ず作り直す(anchorId の付け替えは Viro が保証しないため)
        <ViroARPlane key={floorAnchor.anchorId} anchorId={floorAnchor.anchorId}>
          {/* 足元まで水が来ないときは水面を出さない(「ここは安全」を無の状態で示す) */}
          {effectiveDepthM > 0 ? (
            <>
              {/* 床アンカー基準の相対座標。Y=足元の水位 の位置に水面を敷く。
                  2枚重ねの案は目線に近い角度で層の分離が縞に見えたため1枚にしている */}
              <ViroQuad
                position={[0, effectiveDepthM, 0]}
                rotation={[-90, 0, 0]}
                width={WATER_SIZE_M}
                height={WATER_SIZE_M}
                uvCoordinates={[[0, 0, UV_MAIN, UV_MAIN]]}
                materials={[material]}
                opacity={surfaceOpacity}
              />
              {/* 下向きの面。板は裏から描画されないため、これがないと水面より
                  カメラを下げた(=水中に潜った)ときに何も見えなくなる */}
              <ViroQuad
                position={[0, effectiveDepthM, 0]}
                rotation={[90, 0, 0]}
                width={WATER_SIZE_M}
                height={WATER_SIZE_M}
                uvCoordinates={[[0, 0, UV_MAIN, UV_MAIN]]}
                materials={[material]}
                opacity={surfaceOpacity}
              />
            </>
          ) : null}

          {/* 量水標: 足元からの水位を実寸で読み取れる目盛り付きポール。床平面の中心に立てる */}
          <ViroNode position={[0, 0, 0]}>
            <ViroBox
              position={[0, 1.25, 0]}
              width={0.12}
              height={2.5}
              length={0.12}
              materials={['poleBody']}
            />
            <ViroBox
              position={[0, 2.62, 0]}
              width={0.13}
              height={0.25}
              length={0.13}
              materials={['poleTop']}
            />
            <MeterLabel text="1m" y={1.0} />
            <MeterLabel text="2m" y={2.0} />
            {/* 足元の水位ラベル。スライダーに追従する */}
            {effectiveDepthM > 0 ? (
              <ViroText
                text={formatDepth(effectiveDepthM)}
                position={[0.32, effectiveDepthM + 0.08, 0]}
                scale={[0.42, 0.42, 0.42]}
                color="#2FBFA6"
                extrusionDepth={0}
                transformBehaviors={['billboardY']}
              />
            ) : null}
          </ViroNode>
        </ViroARPlane>
      ) : null}
    </ViroARScene>
  );
}

function MeterLabel({ text, y }: { text: string; y: number }) {
  return (
    <ViroText
      text={text}
      position={[0.24, y, 0]}
      scale={[0.28, 0.28, 0.28]}
      color="#3B4652"
      extrusionDepth={0}
      transformBehaviors={['billboardY']}
    />
  );
}
