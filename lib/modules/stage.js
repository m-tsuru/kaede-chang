// lib/modules/stage.js
// ステージの状態を管理するモジュール

// -1: 空白, 0: 赤, 1: 黄, 2: 青, 6: 赤顔, 7: 黄顔, 8: 青顔
const stage = Array.from({ length: 12 }, () => Array(8).fill(-1));
// -1: 空白 / Undefined, 0: 上, 1: 右, 2: 下, 3: 左
const sprite = Array.from({ length: 12 }, () => Array(8).fill(-1));

const faceValues = [6, 7, 8]; // 6: 赤顔, 7: 黄顔, 8: 青顔

// 顔を下半分（行6～11）にランダムに配置
function placeFacesRandomly(stage, faceCount = 6) {
  const positions = [];
  // 下半分の全セルをリストアップ
  for (let row = 6; row < 12; row++) {
    for (let col = 0; col < 8; col++) {
      positions.push([row, col]);
    }
  }
  // シャッフル
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  // 顔を配置
  for (let i = 0; i < faceCount && i < positions.length; i++) {
    const [row, col] = positions[i];
    const face = faceValues[Math.floor(Math.random() * faceValues.length)];
    stage[row][col] = face;
  }
}

// 顔を6個ランダム配置（必要に応じて数を変更）
placeFacesRandomly(stage, 6);

// Debug
console.log(stage);
console.log(sprite);
