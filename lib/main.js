// lib/stage.js
// ステージの状態を管理するスクリプト

// アセットのプリロード
const images = [
  "./assets/drugs/blue_down.png",
  "./assets/drugs/blue_half.png",
  "./assets/drugs/blue_left.png",
  "./assets/drugs/blue_right.png",
  "./assets/drugs/blue_up.png",
  "./assets/drugs/red_down.png",
  "./assets/drugs/red_half.png",
  "./assets/drugs/red_left.png",
  "./assets/drugs/red_right.png",
  "./assets/drugs/red_up.png",
  "./assets/drugs/yellow_down.png",
  "./assets/drugs/yellow_half.png",
  "./assets/drugs/yellow_left.png",
  "./assets/drugs/yellow_right.png",
  "./assets/drugs/yellow_up.png",
  "./assets/faces/blue.png",
  "./assets/faces/red.png",
  "./assets/faces/yellow.png",
  "./assets/space.png",
  "./assets/screens/background.jpg",
];

images.forEach((src) => {
  const img = new Image();
  img.src = src;
});

const ROW = 12;
const COL = 8;

// -1: 空白, 0: 赤, 1: 黄, 2: 青, 6: 赤顔, 7: 黄顔, 8: 青顔
const stage = Array.from({ length: ROW }, () => Array(COL).fill(-1));
// -1: 空白 / Undefined, 0: 上, 1: 右, 2: 下, 3: 左
const sprite = Array.from({ length: ROW }, () => Array(COL).fill(-1));

const faceValues = [6, 7, 8]; // 6: 赤顔, 7: 黄顔, 8: 青顔
const facePositions = [];

// カプセル関連の変数
let currentCapsule = null; // 現在落下中のカプセル
let gameRunning = false;
let dropTimer = 0;
const DROP_SPEED = 500; // ミリ秒（落下間隔）
let landingTimer = 0; // 着地開始時刻
let isLanding = false; // 着地状態かどうか
const LANDING_DELAY = 500; // 着地確定までの猶予時間（ミリ秒）

// ステージ管理の変数
let currentStage = 1;
let currentLevel = 1;
let totalScore = 0;
let stageScore = 0;
let gameStartTime = 0; // ゲーム開始時刻
let gameInitialized = false; // ゲームが初期化されたかどうか

// ステージ設定
const STAGE_CONFIG = {
  1: { virusCount: 4, colors: 1 }, // ステージ1: ウイルス4個、2色
  2: { virusCount: 6, colors: 2 }, // ステージ2: ウイルス6個、2色
  3: { virusCount: 8, colors: 3 }, // ステージ3: ウイルス8個、3色
  4: { virusCount: 10, colors: 3 }, // ステージ4: ウイルス10個、3色
  5: { virusCount: 12, colors: 3 }, // ステージ5: ウイルス12個、3色
  6: { virusCount: 18, colors: 3 }, // ステージ6: ウイルス18個、3色
  7: { virusCount: 24, colors: 3 }, // ステージ7: ウイルス24個、3色
  8: { virusCount: 28, colors: 3 }, // ステージ8: ウイルス28個、3色
  9: { virusCount: 32, colors: 3 }, // ステージ9: ウイルス32個、3色
  10: { virusCount: 36, colors: 3 }, // ステージ10: ウイルス36個、3色
};

// Cookie操作のヘルパー関数
function setCookie(name, value, days = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// 最大ステージ数を取得
function getMaxStage() {
  return Math.max(...Object.keys(STAGE_CONFIG).map(Number));
}

// クリア済み最高ステージを保存
function saveHighestClearedStage(stageNumber) {
  const currentHighest = getHighestClearedStage();
  if (stageNumber > currentHighest) {
    setCookie("highestClearedStage", stageNumber.toString());
    console.log(`最高クリアステージを更新: ${stageNumber}`);
  }
}

// クリア済み最高ステージを取得
function getHighestClearedStage() {
  const saved = getCookie("highestClearedStage");
  return saved ? parseInt(saved, 10) : 0;
}

// 次に挑戦すべきステージを取得
function getNextChallengeStage() {
  const highestCleared = getHighestClearedStage();
  const nextStage = highestCleared + 1;
  const maxStage = getMaxStage();

  // 最大ステージを超えた場合は最大ステージを返す
  return Math.min(nextStage, maxStage);
}

// カプセルの構造: { row1, col1, color1, row2, col2, color2, direction }
// direction: 0=上向き, 1=右向き, 2=下向き, 3=左向き（時計回り）

function debugDisplayDrug() {
  // 薬の表示テスト
  stage[0][0] = 0; // 例: (0, 0)に赤を配置
  stage[1][0] = 1; // 例: (1, 0)に黄を配置
  sprite[0][0] = 0; // 例: (0, 0)に上向きのスプライトを配置
  sprite[1][0] = 2; // 例: (1, 0)に下向きのスプライトを配置
}

// 新しいカプセルを生成
function generateNewCapsule() {
  const colors = [0, 1, 2]; // 赤、黄、青
  const color1 = colors[Math.floor(Math.random() * colors.length)];
  const color2 = colors[Math.floor(Math.random() * colors.length)];
  const startCol = Math.floor(COL / 2) - 1; // 中央付近に配置

  return {
    row1: 0,
    col1: startCol,
    color1: color1,
    row2: 1,
    col2: startCol,
    color2: color2,
    direction: 0, // 0=上向き（縦向きで開始）
  };
}

// カプセルが配置可能かチェック
function canPlaceCapsule(capsule) {
  // 範囲外チェック
  if (
    capsule.row1 < 0 ||
    capsule.row1 >= ROW ||
    capsule.col1 < 0 ||
    capsule.col1 >= COL
  ) {
    console.log("範囲外エラー (pos1):", capsule.row1, capsule.col1);
    return false;
  }
  if (
    capsule.row2 < 0 ||
    capsule.row2 >= ROW ||
    capsule.col2 < 0 ||
    capsule.col2 >= COL
  ) {
    console.log("範囲外エラー (pos2):", capsule.row2, capsule.col2);
    return false;
  }

  // すでに何かが配置されているかチェック
  if (stage[capsule.row1][capsule.col1] !== -1) {
    console.log(
      "衝突エラー (pos1):",
      capsule.row1,
      capsule.col1,
      "値:",
      stage[capsule.row1][capsule.col1]
    );
    return false;
  }
  if (stage[capsule.row2][capsule.col2] !== -1) {
    console.log(
      "衝突エラー (pos2):",
      capsule.row2,
      capsule.col2,
      "値:",
      stage[capsule.row2][capsule.col2]
    );
    return false;
  }

  return true;
}

// カプセルをステージに配置
function placeCapsule(capsule, temporary = false) {
  // 一時的な配置でも常にステージに配置して表示
  stage[capsule.row1][capsule.col1] = capsule.color1;
  stage[capsule.row2][capsule.col2] = capsule.color2;

  // スプライトの向きを設定（4方向回転対応）
  switch (capsule.direction) {
    case 0: // 上向き（縦向き）
      sprite[capsule.row1][capsule.col1] = 0; // 上向き
      sprite[capsule.row2][capsule.col2] = 2; // 下向き
      break;
    case 1: // 右向き（横向き）
      sprite[capsule.row1][capsule.col1] = 3; // 左向き
      sprite[capsule.row2][capsule.col2] = 1; // 右向き
      break;
    case 2: // 下向き（縦向き、逆順）
      sprite[capsule.row1][capsule.col1] = 2; // 下向き
      sprite[capsule.row2][capsule.col2] = 0; // 上向き
      break;
    case 3: // 左向き（横向き、逆順）
      sprite[capsule.row1][capsule.col1] = 1; // 右向き
      sprite[capsule.row2][capsule.col2] = 3; // 左向き
      break;
  }
}

// カプセルをステージから削除
function removeCapsule(capsule) {
  stage[capsule.row1][capsule.col1] = -1;
  stage[capsule.row2][capsule.col2] = -1;
  sprite[capsule.row1][capsule.col1] = -1;
  sprite[capsule.row2][capsule.col2] = -1;
}

// カプセルを1段下に移動
function dropCapsule(capsule) {
  const newCapsule = {
    row1: capsule.row1 + 1,
    col1: capsule.col1,
    color1: capsule.color1,
    row2: capsule.row2 + 1,
    col2: capsule.col2,
    color2: capsule.color2,
    direction: capsule.direction,
  };

  if (canPlaceCapsule(newCapsule)) {
    return newCapsule;
  }
  return null; // 移動できない
}

// カプセルを左に移動
function moveCapsuleLeft(capsule) {
  const newCapsule = {
    row1: capsule.row1,
    col1: capsule.col1 - 1,
    color1: capsule.color1,
    row2: capsule.row2,
    col2: capsule.col2 - 1,
    color2: capsule.color2,
    direction: capsule.direction,
  };

  if (canPlaceCapsule(newCapsule)) {
    return newCapsule;
  }
  return null; // 移動できない
}

// カプセルを右に移動
function moveCapsuleRight(capsule) {
  const newCapsule = {
    row1: capsule.row1,
    col1: capsule.col1 + 1,
    color1: capsule.color1,
    row2: capsule.row2,
    col2: capsule.col2 + 1,
    color2: capsule.color2,
    direction: capsule.direction,
  };

  if (canPlaceCapsule(newCapsule)) {
    return newCapsule;
  }
  return null; // 移動できない
}

// カプセルを回転（時計回り4方向回転）
function rotateCapsuleClockwise(capsule) {
  // 次の回転方向を計算（時計回り）
  const nextDirection = (capsule.direction + 1) % 4;

  let newCapsule;

  // 回転方向に応じてカプセルの位置を決定
  switch (nextDirection) {
    case 0: // 上向き（縦向き）
      newCapsule = {
        row1: capsule.row1,
        col1: capsule.col1,
        color1: capsule.color1,
        row2: capsule.row1 + 1,
        col2: capsule.col1,
        color2: capsule.color2,
        direction: 0,
      };
      break;
    case 1: // 右向き（横向き）
      newCapsule = {
        row1: capsule.row1,
        col1: capsule.col1,
        color1: capsule.color1,
        row2: capsule.row1,
        col2: capsule.col1 + 1,
        color2: capsule.color2,
        direction: 1,
      };
      break;
    case 2: // 下向き（縦向き、逆順）
      newCapsule = {
        row1: capsule.row1,
        col1: capsule.col1,
        color1: capsule.color1,
        row2: capsule.row1 - 1,
        col2: capsule.col1,
        color2: capsule.color2,
        direction: 2,
      };
      break;
    case 3: // 左向き（横向き、逆順）
      newCapsule = {
        row1: capsule.row1,
        col1: capsule.col1,
        color1: capsule.color1,
        row2: capsule.row1,
        col2: capsule.col1 - 1,
        color2: capsule.color2,
        direction: 3,
      };
      break;
  }

  // 回転後の位置が有効かチェック
  if (canPlaceCapsule(newCapsule)) {
    return newCapsule;
  }

  // 回転できない場合は、位置調整を試す
  // 上下方向への回転で範囲外になる場合
  if (nextDirection === 0 || nextDirection === 2) {
    // 縦向きで下端・上端にぶつかる場合の調整
    if (nextDirection === 0 && newCapsule.row2 >= ROW) {
      // 上に1セルずらして再試行
      newCapsule.row1--;
      newCapsule.row2--;
    } else if (nextDirection === 2 && newCapsule.row2 < 0) {
      // 下に1セルずらして再試行
      newCapsule.row1++;
      newCapsule.row2++;
    }

    if (canPlaceCapsule(newCapsule)) {
      return newCapsule;
    }
  }

  // 左右方向への回転で範囲外になる場合
  if (nextDirection === 1 || nextDirection === 3) {
    // 横向きで左端・右端にぶつかる場合の調整
    if (nextDirection === 1 && newCapsule.col2 >= COL) {
      // 左に1セルずらして再試行
      newCapsule.col1--;
      newCapsule.col2--;
    } else if (nextDirection === 3 && newCapsule.col2 < 0) {
      // 右に1セルずらして再試行
      newCapsule.col1++;
      newCapsule.col2++;
    }

    if (canPlaceCapsule(newCapsule)) {
      return newCapsule;
    }
  }

  return null; // 回転できない
}

// カプセルを回転（反時計回り4方向回転）
function rotateCapsuleCounterClockwise(capsule) {
  // 次の回転方向を計算（反時計回り）
  const nextDirection = (capsule.direction - 1 + 4) % 4;

  let newCapsule;

  // 回転方向に応じてカプセルの位置を決定
  switch (nextDirection) {
    case 0: // 上向き（縦向き）
      newCapsule = {
        row1: capsule.row1,
        col1: capsule.col1,
        color1: capsule.color1,
        row2: capsule.row1 + 1,
        col2: capsule.col1,
        color2: capsule.color2,
        direction: 0,
      };
      break;
    case 1: // 右向き（横向き）
      newCapsule = {
        row1: capsule.row1,
        col1: capsule.col1,
        color1: capsule.color1,
        row2: capsule.row1,
        col2: capsule.col1 + 1,
        color2: capsule.color2,
        direction: 1,
      };
      break;
    case 2: // 下向き（縦向き、逆順）
      newCapsule = {
        row1: capsule.row1,
        col1: capsule.col1,
        color1: capsule.color1,
        row2: capsule.row1 - 1,
        col2: capsule.col1,
        color2: capsule.color2,
        direction: 2,
      };
      break;
    case 3: // 左向き（横向き、逆順）
      newCapsule = {
        row1: capsule.row1,
        col1: capsule.col1,
        color1: capsule.color1,
        row2: capsule.row1,
        col2: capsule.col1 - 1,
        color2: capsule.color2,
        direction: 3,
      };
      break;
  }

  // 回転後の位置が有効かチェック
  if (canPlaceCapsule(newCapsule)) {
    return newCapsule;
  }

  // 回転できない場合は、位置調整を試す
  // 上下方向への回転で範囲外になる場合
  if (nextDirection === 0 || nextDirection === 2) {
    // 縦向きで下端・上端にぶつかる場合の調整
    if (nextDirection === 0 && newCapsule.row2 >= ROW) {
      // 上に1セルずらして再試行
      newCapsule.row1--;
      newCapsule.row2--;
    } else if (nextDirection === 2 && newCapsule.row2 < 0) {
      // 下に1セルずらして再試行
      newCapsule.row1++;
      newCapsule.row2++;
    }

    if (canPlaceCapsule(newCapsule)) {
      return newCapsule;
    }
  }

  // 左右方向への回転で範囲外になる場合
  if (nextDirection === 1 || nextDirection === 3) {
    // 横向きで左端・右端にぶつかる場合の調整
    if (nextDirection === 1 && newCapsule.col2 >= COL) {
      // 左に1セルずらして再試行
      newCapsule.col1--;
      newCapsule.col2--;
    } else if (nextDirection === 3 && newCapsule.col2 < 0) {
      // 右に1セルずらして再試行
      newCapsule.col1++;
      newCapsule.col2++;
    }

    if (canPlaceCapsule(newCapsule)) {
      return newCapsule;
    }
  }

  return null; // 回転できない
}

// 下位互換性のため、元の関数名も残す
function rotateCapsule(capsule) {
  return rotateCapsuleClockwise(capsule);
}

// 顔を下半分（行6～11）にランダムに配置
function placeFacesRandomly(stage, faceCount = 6, colorCount = 3) {
  const positions = [];
  // 下半分の全セルをリストアップ
  for (let row = 6; row < ROW; row++) {
    for (let col = 0; col < COL; col++) {
      positions.push([row, col]);
    }
  }
  // シャッフル
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // 使用する色を制限
  const availableColors = faceValues.slice(0, colorCount); // 指定された色数だけ使用

  // 顔を配置
  for (let i = 0; i < faceCount && i < positions.length; i++) {
    const [row, col] = positions[i];
    const face =
      availableColors[Math.floor(Math.random() * availableColors.length)];
    stage[row][col] = face;
  }
}

// ステージを初期化
function initializeStage(stageNumber) {
  // ステージをクリア
  for (let row = 0; row < ROW; row++) {
    for (let col = 0; col < COL; col++) {
      stage[row][col] = -1;
      sprite[row][col] = -1;
    }
  }

  // ステージ設定を取得
  const config = STAGE_CONFIG[stageNumber] || STAGE_CONFIG[5]; // 最大ステージを超えた場合は最後の設定を使用

  // ウイルスを配置
  placeFacesRandomly(stage, config.virusCount, config.colors);

  console.log(
    `ステージ ${stageNumber} 開始 / ウイルス: ${config.virusCount}個, 色: ${config.colors}色`
  );

  // スコアをリセット
  stageScore = 0;
}

// 次のステージに進む
function nextStage() {
  const completedStage = currentStage; // クリアしたステージ番号を保存

  // クリア済み最高ステージを保存
  saveHighestClearedStage(completedStage);

  currentStage++;

  // ステージクリアボーナス
  const stageBonus = currentStage * 1000;
  totalScore += stageBonus;

  console.log(`ステージ ${completedStage} クリア！ボーナス: ${stageBonus}点`);
  console.log(`総スコア: ${totalScore}点`);

  // クリアオーバーレイを表示
  showClearOverlay(completedStage, stageBonus);

  // 3秒後にクリアオーバーレイを隠してスタート画面を表示
  setTimeout(() => {
    hideClearOverlay();

    // 新しいステージを初期化
    initializeStage(currentStage);

    // ゲームを一時停止してスタート画面を表示
    gameRunning = false;
    currentCapsule = null;
    isLanding = false; // 着地状態をリセット

    // スタート画面を表示
    showStartScreen();
  }, 3000); // 3秒間クリア画面を表示
}

// スコア計算
function calculateScore(virusCleared, chainCount) {
  let score = 0;

  // ウイルス消去ボーナス
  score += virusCleared * 100;

  // 連鎖ボーナス
  if (chainCount > 1) {
    score += (chainCount - 1) * 50;
  }

  return score;
}

// 消去判定と連鎖処理

// 指定位置から同色のブロックを連続で探す（水平方向）
function findHorizontalMatches(row, col, color) {
  const matches = [];

  // 現在位置から左方向に探索
  for (let c = col; c >= 0; c--) {
    if (
      stage[row][c] === color ||
      (stage[row][c] >= 6 && stage[row][c] <= 8 && stage[row][c] - 6 === color)
    ) {
      matches.unshift([row, c]);
    } else {
      break;
    }
  }

  // 現在位置から右方向に探索（現在位置は既に含まれているので+1から）
  for (let c = col + 1; c < COL; c++) {
    if (
      stage[row][c] === color ||
      (stage[row][c] >= 6 && stage[row][c] <= 8 && stage[row][c] - 6 === color)
    ) {
      matches.push([row, c]);
    } else {
      break;
    }
  }

  return matches;
}

// 指定位置から同色のブロックを連続で探す（垂直方向）
function findVerticalMatches(row, col, color) {
  const matches = [];

  // 現在位置から上方向に探索
  for (let r = row; r >= 0; r--) {
    if (
      stage[r][col] === color ||
      (stage[r][col] >= 6 && stage[r][col] <= 8 && stage[r][col] - 6 === color)
    ) {
      matches.unshift([r, col]);
    } else {
      break;
    }
  }

  // 現在位置から下方向に探索（現在位置は既に含まれているので+1から）
  for (let r = row + 1; r < ROW; r++) {
    if (
      stage[r][col] === color ||
      (stage[r][col] >= 6 && stage[r][col] <= 8 && stage[r][col] - 6 === color)
    ) {
      matches.push([r, col]);
    } else {
      break;
    }
  }

  return matches;
}

// 消去可能なブロックを全て見つける
function findAllMatches() {
  console.log("=== findAllMatches開始 ===");
  const allMatches = new Set();

  for (let row = 0; row < ROW; row++) {
    for (let col = 0; col < COL; col++) {
      const cell = stage[row][col];
      if (cell === -1) continue; // 空白はスキップ

      // 色を取得（ウイルスの場合は対応する色に変換）
      let color;
      if (cell >= 0 && cell <= 2) {
        color = cell; // カプセルの色
      } else if (cell >= 6 && cell <= 8) {
        color = cell - 6; // ウイルスの色（6->0, 7->1, 8->2）
      } else {
        continue;
      }

      // 水平方向の一致を確認
      const horizontalMatches = findHorizontalMatches(row, col, color);
      if (horizontalMatches.length >= 4) {
        console.log(
          `水平マッチ発見: (${row},${col}) 色=${color} ${horizontalMatches.length}個`
        );
        horizontalMatches.forEach((match) =>
          allMatches.add(`${match[0]},${match[1]}`)
        );
      }

      // 垂直方向の一致を確認
      const verticalMatches = findVerticalMatches(row, col, color);
      if (verticalMatches.length >= 4) {
        console.log(
          `垂直マッチ発見: (${row},${col}) 色=${color} ${verticalMatches.length}個`
        );
        verticalMatches.forEach((match) =>
          allMatches.add(`${match[0]},${match[1]}`)
        );
      }
    }
  }

  // Set から配列に変換
  const result = Array.from(allMatches).map((pos) => {
    const [row, col] = pos.split(",").map(Number);
    return [row, col];
  });

  console.log(`findAllMatches結果: ${result.length}個のマッチ`, result);
  return result;
}

// ブロックを消去する
function clearMatches(matches) {
  let virusCleared = 0;

  // 消去前に接続されたカプセルピースを記録
  const connectedPieces = new Map();
  const toBeCleared = new Set();

  // 消去対象をセットに変換
  matches.forEach(([row, col]) => {
    toBeCleared.add(`${row},${col}`);
  });

  console.log(`消去対象: ${Array.from(toBeCleared).join(", ")}`);
  console.log(`消去対象数: ${toBeCleared.size}`);

  matches.forEach(([row, col]) => {
    const cell = stage[row][col];
    const spriteDir = sprite[row][col];

    console.log(
      `消去対象チェック: (${row},${col}) cell=${cell} sprite=${spriteDir}`
    );

    // カプセルピースの場合、接続されたピースを探す
    if (cell >= 0 && cell <= 2) {
      let connectedRow = -1,
        connectedCol = -1;

      console.log(
        `カプセルピース検出: (${row},${col}) 色=${cell} 向き=${spriteDir}`
      );

      // スプライトの向きから接続先を判定
      switch (spriteDir) {
        case 0: // 上向き -> 下に接続
          if (
            row + 1 < ROW &&
            stage[row + 1][col] >= 0 &&
            stage[row + 1][col] <= 2 &&
            sprite[row + 1][col] === 2
          ) {
            connectedRow = row + 1;
            connectedCol = col;
            console.log(
              `上向き接続発見: (${row},${col}) -> (${connectedRow},${connectedCol})`
            );
          }
          break;
        case 1: // 右向き -> 左に接続
          if (
            col - 1 >= 0 &&
            stage[row][col - 1] >= 0 &&
            stage[row][col - 1] <= 2 &&
            sprite[row][col - 1] === 3
          ) {
            connectedRow = row;
            connectedCol = col - 1;
            console.log(
              `右向き接続発見: (${row},${col}) -> (${connectedRow},${connectedCol})`
            );
          }
          break;
        case 2: // 下向き -> 上に接続
          if (
            row - 1 >= 0 &&
            stage[row - 1][col] >= 0 &&
            stage[row - 1][col] <= 2 &&
            sprite[row - 1][col] === 0
          ) {
            connectedRow = row - 1;
            connectedCol = col;
            console.log(
              `下向き接続発見: (${row},${col}) -> (${connectedRow},${connectedCol})`
            );
          }
          break;
        case 3: // 左向き -> 右に接続
          if (
            col + 1 < COL &&
            stage[row][col + 1] >= 0 &&
            stage[row][col + 1] <= 2 &&
            sprite[row][col + 1] === 1
          ) {
            connectedRow = row;
            connectedCol = col + 1;
            console.log(
              `左向き接続発見: (${row},${col}) -> (${connectedRow},${connectedCol})`
            );
          }
          break;
      }

      // 接続されたピースがある場合、記録
      if (connectedRow !== -1) {
        const currentPos = `${row},${col}`;
        const connectedPos = `${connectedRow},${connectedCol}`;

        console.log(
          `接続チェック: ${currentPos} 消去=${toBeCleared.has(
            currentPos
          )}, ${connectedPos} 消去=${toBeCleared.has(connectedPos)}`
        );

        // 一方が消去され、もう一方が残る場合のみ記録
        if (toBeCleared.has(currentPos) && !toBeCleared.has(connectedPos)) {
          connectedPieces.set(connectedPos, true); // 残るピースをhalf表示にする
          console.log(
            `カプセル半分化: (${connectedRow},${connectedCol}) をhalf表示にします`
          );
        }
      } else {
        console.log(`接続なし: (${row},${col})`);
      }
    }

    // ウイルスが消去された場合はカウント
    if (stage[row][col] >= 6 && stage[row][col] <= 8) {
      virusCleared++;
    }
  });

  // ブロックを消去
  matches.forEach(([row, col]) => {
    stage[row][col] = -1;
    sprite[row][col] = -1;
  });

  // 残ったカプセルピースをhalf表示に変更
  connectedPieces.forEach((_, posStr) => {
    const [row, col] = posStr.split(",").map(Number);
    sprite[row][col] = 4; // 4 = half
    console.log(`Half表示設定: (${row},${col}) sprite=${sprite[row][col]}`);
  });

  console.log(
    `${matches.length}個のブロックを消去, ウイルス${virusCleared}個消去, Half化${connectedPieces.size}個`
  );
  return virusCleared;
}

// 重力を適用（ブロックを下に落とす）
function applyGravity() {
  let moved = false;

  // 支えられていないカプセル片を見つけて落下させる
  const toFall = [];
  const toSeparate = []; // 分離するカプセルペアを記録

  // 下から上に向かって、支えられていないブロックを探す
  for (let row = ROW - 2; row >= 0; row--) {
    for (let col = 0; col < COL; col++) {
      const cell = stage[row][col];

      // カプセルの場合のみ重力を適用（ウイルスは固定）
      if (cell >= 0 && cell <= 2) {
        // 下のセルが空白かチェック
        if (stage[row + 1][col] === -1) {
          // このカプセル片が落下可能かチェック
          const fallResult = canCapsulePieceFallWithSeparation(row, col);
          if (fallResult.canFall) {
            toFall.push([row, col]);
            if (fallResult.willSeparate) {
              toSeparate.push({
                falling: [row, col],
                staying: [fallResult.connectedRow, fallResult.connectedCol],
              });
            }
          }
        }
      }
    }
  }

  // 分離するカプセルペアをhalf表示に変更
  for (const separation of toSeparate) {
    const [fallingRow, fallingCol] = separation.falling;
    const [stayingRow, stayingCol] = separation.staying;

    console.log(
      `カプセル分離: 落下(${fallingRow},${fallingCol}) 残存(${stayingRow},${stayingCol})`
    );

    // 両方をhalf表示に変更
    sprite[fallingRow][fallingCol] = 4;
    sprite[stayingRow][stayingCol] = 4;
  }

  // 落下可能なピースを実際に落下させる
  for (const [row, col] of toFall) {
    // 落下できる最下段を見つける
    let newRow = row;
    while (newRow + 1 < ROW && stage[newRow + 1][col] === -1) {
      newRow++;
    }

    if (newRow !== row) {
      // ブロックを移動
      stage[newRow][col] = stage[row][col];
      sprite[newRow][col] = sprite[row][col];
      stage[row][col] = -1;
      sprite[row][col] = -1;
      moved = true;
    }
  }

  return moved;
}

// カプセル片が落下可能かチェック（接続されたカプセル片も考慮）
function canCapsulePieceFall(row, col) {
  const cell = stage[row][col];
  const spriteDir = sprite[row][col];

  // half状態のピースは単独で落下可能
  if (spriteDir === 4) {
    return true;
  }

  // 隣接するカプセル片を探す
  let connectedRow = -1,
    connectedCol = -1;

  // スプライトの向きから接続先を判定（4方向対応）
  switch (spriteDir) {
    case 0: // 上向き -> 下に接続
      if (
        row + 1 < ROW &&
        stage[row + 1][col] !== -1 &&
        sprite[row + 1][col] === 2
      ) {
        connectedRow = row + 1;
        connectedCol = col;
      }
      break;
    case 1: // 右向き -> 左に接続
      if (
        col - 1 >= 0 &&
        stage[row][col - 1] !== -1 &&
        sprite[row][col - 1] === 3
      ) {
        connectedRow = row;
        connectedCol = col - 1;
      }
      break;
    case 2: // 下向き -> 上に接続
      if (
        row - 1 >= 0 &&
        stage[row - 1][col] !== -1 &&
        sprite[row - 1][col] === 0
      ) {
        connectedRow = row - 1;
        connectedCol = col;
      }
      break;
    case 3: // 左向き -> 右に接続
      if (
        col + 1 < COL &&
        stage[row][col + 1] !== -1 &&
        sprite[row][col + 1] === 1
      ) {
        connectedRow = row;
        connectedCol = col + 1;
      }
      break;
  }

  // 接続されたピースがない場合（単独ピース）は落下可能
  if (connectedRow === -1) {
    return true;
  }

  // 接続されたピースがある場合
  // 両方のピースが同時に落下可能な場合のみ落下
  if (connectedRow + 1 < ROW && stage[connectedRow + 1][connectedCol] === -1) {
    return true;
  }

  return false;
}

// カプセル片が落下可能かチェック（分離情報も含む）
function canCapsulePieceFallWithSeparation(row, col) {
  const cell = stage[row][col];
  const spriteDir = sprite[row][col];

  console.log(
    `分離チェック開始: (${row},${col}) cell=${cell} sprite=${spriteDir}`
  );

  // half状態のピースは単独で落下可能（分離なし）
  if (spriteDir === 4) {
    console.log(`半分ピースなので単独落下: (${row},${col})`);
    return { canFall: true, willSeparate: false };
  }

  // 隣接するカプセル片を探す
  let connectedRow = -1,
    connectedCol = -1;

  // スプライトの向きから接続先を判定（4方向対応）
  switch (spriteDir) {
    case 0: // 上向き -> 下に接続
      if (
        row + 1 < ROW &&
        stage[row + 1][col] !== -1 &&
        sprite[row + 1][col] === 2
      ) {
        connectedRow = row + 1;
        connectedCol = col;
        console.log(
          `上向き接続発見: (${row},${col}) -> (${connectedRow},${connectedCol})`
        );
      }
      break;
    case 1: // 右向き -> 左に接続
      if (
        col - 1 >= 0 &&
        stage[row][col - 1] !== -1 &&
        sprite[row][col - 1] === 3
      ) {
        connectedRow = row;
        connectedCol = col - 1;
        console.log(
          `右向き接続発見: (${row},${col}) -> (${connectedRow},${connectedCol})`
        );
      }
      break;
    case 2: // 下向き -> 上に接続
      if (
        row - 1 >= 0 &&
        stage[row - 1][col] !== -1 &&
        sprite[row - 1][col] === 0
      ) {
        connectedRow = row - 1;
        connectedCol = col;
        console.log(
          `下向き接続発見: (${row},${col}) -> (${connectedRow},${connectedCol})`
        );
      }
      break;
    case 3: // 左向き -> 右に接続
      if (
        col + 1 < COL &&
        stage[row][col + 1] !== -1 &&
        sprite[row][col + 1] === 1
      ) {
        connectedRow = row;
        connectedCol = col + 1;
        console.log(
          `左向き接続発見: (${row},${col}) -> (${connectedRow},${connectedCol})`
        );
      }
      break;
  }

  // 接続されたピースがない場合（単独ピース）は落下可能（分離なし）
  if (connectedRow === -1) {
    console.log(`接続なし、単独落下: (${row},${col})`);
    return { canFall: true, willSeparate: false };
  }

  // 接続されたピースがある場合
  // 両方のピースが同時に落下可能な場合は落下（分離なし）
  const connectedCanFall =
    connectedRow + 1 < ROW && stage[connectedRow + 1][connectedCol] === -1;
  console.log(
    `接続先落下可能チェック: (${connectedRow},${connectedCol}) 下が空白=${connectedCanFall}`
  );

  if (connectedCanFall) {
    console.log(
      `両方落下可能、分離なし: (${row},${col}) + (${connectedRow},${connectedCol})`
    );
    return { canFall: true, willSeparate: false };
  }

  // 接続されたピースが落下できない場合は分離して落下
  console.log(
    `分離して落下: (${row},${col}) 残存: (${connectedRow},${connectedCol})`
  );
  return {
    canFall: true,
    willSeparate: true,
    connectedRow: connectedRow,
    connectedCol: connectedCol,
  };
}

// 連鎖処理を実行
async function processChain() {
  console.log("=== processChain開始 ===");
  let chainCount = 0;
  let totalVirusCleared = 0;

  while (true) {
    // 重力を適用（複数回実行して安定するまで）
    while (applyGravity()) {
      stageDisplay();
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // 消去可能なブロックを探す
    const matches = findAllMatches();
    console.log(`マッチ検索結果: ${matches.length}個のマッチが見つかりました`);

    if (matches.length === 0) {
      console.log("消去可能なマッチなし、processChain終了");
      break; // 消去できるものがない場合は終了
    }

    chainCount++;
    console.log(`${chainCount}連鎖目: ${matches.length}個のマッチ`);

    // ブロックを消去
    const virusCleared = clearMatches(matches);
    totalVirusCleared += virusCleared;

    // 画面を更新
    stageDisplay();

    // 少し待機（視覚的効果のため）
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  if (chainCount > 0) {
    console.log(
      `連鎖終了: ${chainCount}連鎖, 合計${totalVirusCleared}個のウイルスを消去`
    );

    // スコア計算
    const earnedScore = calculateScore(totalVirusCleared, chainCount);
    stageScore += earnedScore;
    totalScore += earnedScore;

    console.log(
      `獲得スコア: ${earnedScore}点 (ステージスコア: ${stageScore}点, 総スコア: ${totalScore}点)`
    );
  }

  return totalVirusCleared;
}

// ゲームクリア判定
function checkGameClear() {
  for (let row = 0; row < ROW; row++) {
    for (let col = 0; col < COL; col++) {
      if (stage[row][col] >= 6 && stage[row][col] <= 8) {
        return false; // ウイルスがまだ残っている
      }
    }
  }
  return true; // 全てのウイルスが消去された
}

function stageDisplay() {
  const flatStage = stage.flat();
  const flatSprite = sprite.flat();

  // ステージの情報を表示
  const stageInnerHTML = document.getElementById("stage");
  stageInnerHTML.innerHTML = ""; // 前の表示をクリア

  for (let i = 0; i < flatStage.length; i++) {
    const img = document.createElement("img");
    if (flatStage[i] === -1) {
      img.src = "assets/space.png"; // 空白の画像
    } else if (flatStage[i] === 6) {
      img.src = "assets/faces/red.png"; // 赤の画像
    } else if (flatStage[i] === 7) {
      img.src = "assets/faces/yellow.png"; // 黄の画像
    } else if (flatStage[i] === 8) {
      img.src = "assets/faces/blue.png"; // 青の画像
    } else if (flatStage[i] === 0 || flatStage[i] === 1 || flatStage[i] === 2) {
      let color = "";
      if (flatStage[i] === 0) color = "red";
      if (flatStage[i] === 1) color = "yellow";
      if (flatStage[i] === 2) color = "blue";
      let dir = "";
      if (flatSprite[i] === 0) dir = "up";
      if (flatSprite[i] === 1) dir = "right";
      if (flatSprite[i] === 2) dir = "down";
      if (flatSprite[i] === 3) dir = "left";
      if (flatSprite[i] === 4) dir = "half"; // half表示
      img.src = `assets/drugs/${color}_${dir}.png`;
    }
    stageInnerHTML.appendChild(img);
  }

  // 情報パネルを更新
  updateInfoPanel();

  // ステージ情報をコンソールに表示（デバッグ用）
  if (gameRunning) {
    const virusCount = countRemainingViruses();
    console.log(
      `ステージ ${currentStage} | 残りウイルス: ${virusCount}個 | スコア: ${totalScore}点`
    );
  }
}

// 残りウイルス数をカウント
function countRemainingViruses() {
  let count = 0;
  for (let row = 0; row < ROW; row++) {
    for (let col = 0; col < COL; col++) {
      if (stage[row][col] >= 6 && stage[row][col] <= 8) {
        count++;
      }
    }
  }
  return count;
}

// 情報パネルを更新
function updateInfoPanel() {
  // ステージ情報を更新
  const stageElement = document.getElementById("current-stage");
  if (stageElement) {
    stageElement.textContent = currentStage;
  }

  // スコア情報を更新
  const scoreElement = document.getElementById("total-score");
  if (scoreElement) {
    scoreElement.textContent = totalScore.toLocaleString();
  }

  // 残りウイルス数を更新
  const virusElement = document.getElementById("remaining-virus");
  if (virusElement) {
    const virusCount = countRemainingViruses();
    virusElement.textContent = virusCount;
  }

  // 経過時間を更新
  const timeElement = document.getElementById("elapsed-time");
  if (timeElement && gameStartTime > 0) {
    const elapsed = Date.now() - gameStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    timeElement.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
}

// スタート画面の情報を更新
function updateStartScreen() {
  const config = STAGE_CONFIG[currentStage] || STAGE_CONFIG[10];

  const startStageElement = document.getElementById("start-stage");
  if (startStageElement) {
    startStageElement.textContent = currentStage;
  }

  const startVirusCountElement = document.getElementById("start-virus-count");
  if (startVirusCountElement) {
    startVirusCountElement.textContent = config.virusCount;
  }

  const startColorCountElement = document.getElementById("start-color-count");
  if (startColorCountElement) {
    startColorCountElement.textContent = config.colors;
  }
}

// ゲームオーバー画面を表示
function showGameOverOverlay(finalStage, finalScore, playTime) {
  const gameoverOverlay = document.getElementById("gameover-overlay");
  const gameoverStageElement = document.getElementById("gameover-stage");
  const gameoverTotalScoreElement = document.getElementById(
    "gameover-total-score"
  );
  const gameoverPlayTimeElement = document.getElementById("gameover-play-time");

  if (gameoverStageElement) {
    gameoverStageElement.textContent = finalStage;
  }
  if (gameoverTotalScoreElement) {
    gameoverTotalScoreElement.textContent = finalScore.toLocaleString();
  }
  if (gameoverPlayTimeElement) {
    const minutes = Math.floor(playTime / 60000);
    const seconds = Math.floor((playTime % 60000) / 1000);
    gameoverPlayTimeElement.textContent = `${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  if (gameoverOverlay) {
    gameoverOverlay.style.display = "flex";
  }
}

// ゲームオーバー画面を隠す
function hideGameOverOverlay() {
  const gameoverOverlay = document.getElementById("gameover-overlay");
  if (gameoverOverlay) {
    gameoverOverlay.style.display = "none";
  }
}

// 全ゲームクリア画面を表示
function showAllClearOverlay(finalScore, totalPlayTime) {
  const allclearOverlay = document.getElementById("allclear-overlay");
  const allclearTotalStagesElement = document.getElementById(
    "allclear-total-stages"
  );
  const allclearFinalScoreElement = document.getElementById(
    "allclear-final-score"
  );
  const allclearTotalTimeElement = document.getElementById(
    "allclear-total-time"
  );

  if (allclearTotalStagesElement) {
    allclearTotalStagesElement.textContent = getMaxStage();
  }
  if (allclearFinalScoreElement) {
    allclearFinalScoreElement.textContent = finalScore.toLocaleString();
  }
  if (allclearTotalTimeElement) {
    const minutes = Math.floor(totalPlayTime / 60000);
    const seconds = Math.floor((totalPlayTime % 60000) / 1000);
    allclearTotalTimeElement.textContent = `${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  if (allclearOverlay) {
    allclearOverlay.style.display = "flex";
  }
}

// 全ゲームクリア画面を隠す
function hideAllClearOverlay() {
  const allclearOverlay = document.getElementById("allclear-overlay");
  if (allclearOverlay) {
    allclearOverlay.style.display = "none";
  }
}

// クリアオーバーレイを表示
function showClearOverlay(stageNumber, stageBonus) {
  const clearOverlay = document.getElementById("clear-overlay");
  const clearStageElement = document.getElementById("clear-stage");
  const clearScoreElement = document.getElementById("clear-score");
  const clearTotalScoreElement = document.getElementById("clear-total-score");

  if (clearStageElement) {
    clearStageElement.textContent = stageNumber;
  }
  if (clearScoreElement) {
    clearScoreElement.textContent = stageBonus.toLocaleString();
  }
  if (clearTotalScoreElement) {
    clearTotalScoreElement.textContent = totalScore.toLocaleString();
  }

  if (clearOverlay) {
    clearOverlay.style.display = "flex";
  }
}

// クリアオーバーレイを隠す
function hideClearOverlay() {
  const clearOverlay = document.getElementById("clear-overlay");
  if (clearOverlay) {
    clearOverlay.style.display = "none";
  }
}

// スタート画面を表示
function showStartScreen() {
  const startScreen = document.getElementById("start-screen");
  const gameContainer = document.getElementById("game-container");

  if (startScreen) startScreen.style.display = "flex";
  if (gameContainer) gameContainer.style.display = "none";

  updateStartScreen();
}

// ゲーム画面を表示
function showGameScreen() {
  const startScreen = document.getElementById("start-screen");
  const gameContainer = document.getElementById("game-container");

  if (startScreen) startScreen.style.display = "none";
  if (gameContainer) gameContainer.style.display = "flex";
}

// ゲームの更新処理
async function updateGame() {
  if (!gameRunning) return;

  const currentTime = Date.now();

  // カプセルがない場合は新しいカプセルを生成
  if (!currentCapsule) {
    currentCapsule = generateNewCapsule();
    if (!canPlaceCapsule(currentCapsule)) {
      // ゲームオーバー（カプセルが配置できない）
      console.log("Game Over!");
      gameRunning = false;

      // ゲームオーバー情報を計算
      const playTime = Date.now() - gameStartTime;

      // ゲームオーバー画面を表示
      showGameOverOverlay(currentStage, totalScore, playTime);

      return;
    }
    placeCapsule(currentCapsule, true); // 一時的に配置
    dropTimer = currentTime;
    isLanding = false; // 新しいカプセルなので着地状態をリセット

    // 新しいカプセルが投下されるタイミングでアバターアニメーションを再生
    triggerAvatarAnimation();
  }

  // 着地状態の処理
  if (isLanding) {
    // 着地中の場合、LANDING_DELAY時間経過後に確定
    if (currentTime - landingTimer >= LANDING_DELAY) {
      console.log("=== カプセル着地確定 ===");
      placeCapsule(currentCapsule, false); // 永続的に配置
      currentCapsule = null; // 新しいカプセルを生成するため
      isLanding = false; // 着地状態をリセット

      // 連鎖処理を実行
      console.log("連鎖処理を開始します");
      const virusCleared = await processChain();
      console.log(`連鎖処理完了、ウイルス消去数: ${virusCleared}`);

      // ゲームクリア判定
      if (checkGameClear()) {
        console.log(
          `ステージ ${currentStage} クリア！全てのウイルスを消去しました！`
        );

        // 最終ステージかチェック
        if (currentStage >= Object.keys(STAGE_CONFIG).length) {
          console.log("🎉 全ステージクリア！おめでとうございます！");
          console.log(`最終スコア: ${totalScore}点`);

          // 全ステージクリア時も最高記録として保存
          saveHighestClearedStage(currentStage);

          // 全ゲームクリア画面を表示
          const totalPlayTime = Date.now() - gameStartTime;
          showAllClearOverlay(totalScore, totalPlayTime);

          gameRunning = false;
          return;
        } else {
          // 次のステージに進む（クリアオーバーレイを表示）
          nextStage();
          return;
        }
      }
    } else {
      // 着地中でも移動可能かチェック（猶予時間中の救済処理）
      removeCapsule(currentCapsule);
      const newPosition = dropCapsule(currentCapsule);
      if (newPosition) {
        // まだ落下できる場合は着地状態を解除
        currentCapsule = newPosition;
        placeCapsule(currentCapsule, true);
        isLanding = false;
        dropTimer = currentTime;
        console.log("着地状態から復帰: まだ落下可能");
      } else {
        // まだ落下できない場合は着地状態を継続
        placeCapsule(currentCapsule, true);
      }
    }
  } else {
    // 通常の落下処理
    if (currentTime - dropTimer >= DROP_SPEED) {
      // 現在のカプセルを削除
      removeCapsule(currentCapsule);

      // 1段下に移動を試行
      const newPosition = dropCapsule(currentCapsule);

      if (newPosition) {
        // 移動可能な場合
        currentCapsule = newPosition;
        placeCapsule(currentCapsule, true); // 一時的に配置
        dropTimer = currentTime;
      } else {
        // 移動できない場合（着地開始）
        console.log("=== カプセル着地開始 ===");
        placeCapsule(currentCapsule, true); // 一時的に配置（まだ確定ではない）
        isLanding = true;
        landingTimer = currentTime;
        console.log(`${LANDING_DELAY}ms後に着地確定予定`);
      }
    }
  }

  // 画面を更新
  stageDisplay();
}

// ゲーム開始
function startGame() {
  gameRunning = true;
  dropTimer = Date.now();
  gameStartTime = Date.now(); // ゲーム開始時刻を記録

  // 時間表示を定期的に更新（1秒ごと）
  const timeUpdateInterval = setInterval(() => {
    if (gameRunning) {
      updateInfoPanel();
    } else {
      clearInterval(timeUpdateInterval);
    }
  }, 1000);

  // ゲームループを開始
  async function gameLoop() {
    await updateGame();
    if (gameRunning) {
      requestAnimationFrame(gameLoop);
    }
  }

  gameLoop();
}

// Debug
console.log(stage);
console.log(sprite);

// デバッグ用: Cookie リセット機能（コンソールで使用）
window.resetGameProgress = function () {
  deleteCookie("highestClearedStage");
  console.log(
    "ゲーム進行状況をリセットしました。ページを再読み込みしてください。"
  );
};

// デバッグ用: 現在の進行状況確認機能
window.showGameProgress = function () {
  const highest = getHighestClearedStage();
  const next = getNextChallengeStage();
  console.log(`最高クリアステージ: ${highest}`);
  console.log(`次回挑戦ステージ: ${next}`);
  console.log(`現在のステージ: ${currentStage}`);
};

// 初期化処理
function initializeGame() {
  if (!gameInitialized) {
    // 保存されたステージから開始ステージを決定
    const nextChallenge = getNextChallengeStage();
    currentStage = nextChallenge;

    console.log(`最高クリアステージ: ${getHighestClearedStage()}`);
    console.log(`開始ステージ: ${currentStage}`);

    // ステージを初期化
    initializeStage(currentStage);
    // 初回表示
    stageDisplay();
    gameInitialized = true;
  }

  // スタート画面を表示
  showStartScreen();
}

// スタートボタンのイベントリスナーを設定
document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-button");
  if (startButton) {
    startButton.addEventListener("click", () => {
      console.log("ゲーム開始！");
      showGameScreen();
      startGame();
    });
  }

  // リスタートボタンのイベントリスナーを設定
  const restartButton = document.getElementById("restart-button");
  if (restartButton) {
    restartButton.addEventListener("click", () => {
      console.log("ゲーム再開始！");

      // ゲームオーバー画面を隠す
      hideGameOverOverlay();

      // ゲーム状態をリセット
      totalScore = 0;
      currentCapsule = null;
      isLanding = false;

      // 保存されたステージから再開
      const nextChallenge = getNextChallengeStage();
      currentStage = nextChallenge;

      // ステージを初期化
      initializeStage(currentStage);
      stageDisplay();

      // スタート画面を表示
      showStartScreen();
    });
  }

  // 全ゲームクリア画面のリスタートボタンのイベントリスナーを設定
  const allclearRestartButton = document.getElementById(
    "allclear-restart-button"
  );
  if (allclearRestartButton) {
    allclearRestartButton.addEventListener("click", () => {
      console.log("全ゲームクリア後の再開始！");

      // 全ゲームクリア画面を隠す
      hideAllClearOverlay();

      // ゲーム進行状況をリセット（最初からプレイ）
      deleteCookie("highestClearedStage");

      // ゲーム状態をリセット
      totalScore = 0;
      currentStage = 1;
      currentCapsule = null;
      isLanding = false;

      // ステージを初期化
      initializeStage(currentStage);
      stageDisplay();

      // スタート画面を表示
      showStartScreen();
    });
  }

  // 初期化実行
  initializeGame();
});

// キーボード操作の処理
document.addEventListener("keydown", (event) => {
  if (!gameRunning || !currentCapsule) return;

  let newCapsule = null;

  switch (event.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      // 左移動
      console.log("左移動");
      removeCapsule(currentCapsule);
      newCapsule = moveCapsuleLeft(currentCapsule);
      placeCapsule(currentCapsule, true);
      break;

    case "ArrowRight":
    case "d":
    case "D":
      // 右移動
      console.log("右移動");
      removeCapsule(currentCapsule);
      newCapsule = moveCapsuleRight(currentCapsule);
      placeCapsule(currentCapsule, true);
      break;

    case "ArrowUp":
    case " ": // スペースキー
      // 時計回り回転
      console.log("時計回り回転", currentCapsule);
      // 回転チェック前に現在のカプセルを一時的に削除
      removeCapsule(currentCapsule);
      newCapsule = rotateCapsuleClockwise(currentCapsule);
      // 元の位置に戻す（回転が失敗した場合のため）
      placeCapsule(currentCapsule, true);
      console.log("時計回り回転結果", newCapsule);
      break;

    case "w":
    case "W":
      // 時計回り回転
      console.log("時計回り回転 (W)", currentCapsule);
      // 回転チェック前に現在のカプセルを一時的に削除
      removeCapsule(currentCapsule);
      newCapsule = rotateCapsuleClockwise(currentCapsule);
      // 元の位置に戻す（回転が失敗した場合のため）
      placeCapsule(currentCapsule, true);
      console.log("時計回り回転結果 (W)", newCapsule);
      break;

    case "q":
    case "Q":
      // 反時計回り回転
      console.log("反時計回り回転 (Q)", currentCapsule);
      // 回転チェック前に現在のカプセルを一時的に削除
      removeCapsule(currentCapsule);
      newCapsule = rotateCapsuleCounterClockwise(currentCapsule);
      // 元の位置に戻す（回転が失敗した場合のため）
      placeCapsule(currentCapsule, true);
      console.log("反時計回り回転結果 (Q)", newCapsule);
      break;

    case "ArrowDown":
    case "s":
    case "S":
      // 加速落下
      console.log("加速落下");
      removeCapsule(currentCapsule);
      newCapsule = dropCapsule(currentCapsule);
      placeCapsule(currentCapsule, true);
      if (newCapsule) {
        // 落下タイマーをリセットして即座に落下
        dropTimer = Date.now() - DROP_SPEED;
      }
      break;
  }

  if (newCapsule) {
    // 現在のカプセルを削除
    removeCapsule(currentCapsule);
    // 新しい位置に配置
    currentCapsule = newCapsule;
    placeCapsule(currentCapsule, true);

    // 操作によって位置が変わった場合、着地状態をリセット
    if (isLanding) {
      // 下に移動可能かチェック
      const canDrop = dropCapsule(currentCapsule);
      if (canDrop) {
        // まだ落下できる場合は着地状態を解除
        isLanding = false;
        dropTimer = Date.now();
        console.log("操作により着地状態から復帰");
      }
    }

    // 画面を更新
    stageDisplay();
  } else if (
    event.key === "ArrowUp" ||
    event.key === "w" ||
    event.key === "W" ||
    event.key === "q" ||
    event.key === "Q" ||
    event.key === " "
  ) {
    console.log("回転できませんでした");
  }

  // デフォルトのキーボード動作を防ぐ（スクロールなど）
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)
  ) {
    event.preventDefault();
  }
});

// アバターGIFアニメーション制御
let avatarGif = null;
let avatarAnimationTimeout = null;

function initializeAvatar() {
  avatarGif = document.getElementById("avatar-gif");
  if (avatarGif) {
    // デフォルトでは静止状態
    avatarGif.classList.remove("animating");
  }
}

function playAvatarAnimation() {
  if (avatarGif) {
    // アニメーションクラスを追加
    avatarGif.classList.add("animating");

    // アニメーション終了後にクラスを削除
    clearTimeout(avatarAnimationTimeout);
    avatarAnimationTimeout = setTimeout(() => {
      avatarGif.classList.remove("animating");
    }, 800); // 0.8秒（CSSアニメーション時間と一致）
  }
}

function pauseAvatarAnimation() {
  if (avatarGif) {
    // アニメーションクラスを削除
    avatarGif.classList.remove("animating");
  }
}

// カプセル投下時にアバターアニメーションを再生
function triggerAvatarAnimation() {
  playAvatarAnimation();
}

// 初期化時にアバター設定
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(initializeAvatar, 100); // DOM読み込み後に初期化
});
