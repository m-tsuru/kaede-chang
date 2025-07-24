// lib/modules/stage.js
// ステージの状態を管理するモジュール

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

// ステージ管理の変数
let currentStage = 1;
let currentLevel = 1;
let totalScore = 0;
let stageScore = 0;

// ステージ設定
const STAGE_CONFIG = {
  1: { virusCount: 4, colors: 2 },   // ステージ1: ウイルス4個、2色
  2: { virusCount: 6, colors: 2 },   // ステージ2: ウイルス6個、2色
  3: { virusCount: 8, colors: 3 },   // ステージ3: ウイルス8個、3色
  4: { virusCount: 10, colors: 3 },  // ステージ4: ウイルス10個、3色
  5: { virusCount: 12, colors: 3 },  // ステージ5: ウイルス12個、3色
};

// カプセルの構造: { row1, col1, color1, row2, col2, color2, direction }
// direction: 0=縦（上下）, 1=横（左右）

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
    direction: 0 // 0=縦（上下）
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

  // スプライトの向きを設定
  if (capsule.direction === 0) { // 縦
    sprite[capsule.row1][capsule.col1] = 2; // 下向き
    sprite[capsule.row2][capsule.col2] = 0; // 上向き
  } else { // 横
    sprite[capsule.row1][capsule.col1] = 1; // 右向き
    sprite[capsule.row2][capsule.col2] = 3; // 左向き
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
    direction: capsule.direction
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
    direction: capsule.direction
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
    direction: capsule.direction
  };

  if (canPlaceCapsule(newCapsule)) {
    return newCapsule;
  }
  return null; // 移動できない
}

// カプセルを回転
function rotateCapsule(capsule) {
  let newCapsule;

  if (capsule.direction === 0) { // 縦 → 横
    // 上のセルを基準に、右側にもう一つのセルを配置
    newCapsule = {
      row1: capsule.row1,
      col1: capsule.col1,
      color1: capsule.color1,
      row2: capsule.row1,
      col2: capsule.col1 + 1,
      color2: capsule.color2,
      direction: 1
    };
  } else { // 横 → 縦
    // 左のセルを基準に、下側にもう一つのセルを配置
    newCapsule = {
      row1: capsule.row1,
      col1: capsule.col1,
      color1: capsule.color1,
      row2: capsule.row1 + 1,
      col2: capsule.col1,
      color2: capsule.color2,
      direction: 0
    };
  }

  // 回転後の位置が有効かチェック
  if (canPlaceCapsule(newCapsule)) {
    return newCapsule;
  }

  // 回転できない場合は、壁際での補正を試す
  if (capsule.direction === 0) { // 縦 → 横で右端にぶつかる場合
    // 左に1セルずらして再試行
    newCapsule = {
      row1: capsule.row1,
      col1: capsule.col1 - 1,
      color1: capsule.color1,
      row2: capsule.row1,
      col2: capsule.col1,
      color2: capsule.color2,
      direction: 1
    };
    if (canPlaceCapsule(newCapsule)) {
      return newCapsule;
    }
  } else { // 横 → 縦で下端にぶつかる場合
    // 上に1セルずらして再試行
    newCapsule = {
      row1: capsule.row1 - 1,
      col1: capsule.col1,
      color1: capsule.color1,
      row2: capsule.row1,
      col2: capsule.col1,
      color2: capsule.color2,
      direction: 0
    };
    if (canPlaceCapsule(newCapsule)) {
      return newCapsule;
    }
  }

  return null; // 回転できない
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
    `ステージ ${stageNumber} 開始！ウイルス: ${config.virusCount}個, 色: ${config.colors}色`
  );

  // スコアをリセット
  stageScore = 0;
}

// 次のステージに進む
function nextStage() {
  currentStage++;

  // ステージクリアボーナス
  const stageBonus = currentStage * 1000;
  totalScore += stageBonus;

  console.log(`ステージ ${currentStage - 1} クリア！ボーナス: ${stageBonus}点`);
  console.log(`総スコア: ${totalScore}点`);

  // 新しいステージを初期化
  initializeStage(currentStage);

  // ゲームを再開
  gameRunning = true;
  currentCapsule = null;
  dropTimer = Date.now();
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

// ステージ1を初期化
initializeStage(currentStage);

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
        horizontalMatches.forEach((match) =>
          allMatches.add(`${match[0]},${match[1]}`)
        );
      }

      // 垂直方向の一致を確認
      const verticalMatches = findVerticalMatches(row, col, color);
      if (verticalMatches.length >= 4) {
        verticalMatches.forEach((match) =>
          allMatches.add(`${match[0]},${match[1]}`)
        );
      }
    }
  }

  // Set から配列に変換
  return Array.from(allMatches).map((pos) => {
    const [row, col] = pos.split(",").map(Number);
    return [row, col];
  });
}

// ブロックを消去する
function clearMatches(matches) {
  let virusCleared = 0;

  matches.forEach(([row, col]) => {
    // ウイルスが消去された場合はカウント
    if (stage[row][col] >= 6 && stage[row][col] <= 8) {
      virusCleared++;
    }

    stage[row][col] = -1;
    sprite[row][col] = -1;
  });

  console.log(
    `${matches.length}個のブロックを消去, ウイルス${virusCleared}個消去`
  );
  return virusCleared;
}

// 重力を適用（ブロックを下に落とす）
function applyGravity() {
  let moved = false;

  // 支えられていないカプセル片を見つけて落下させる
  const toFall = [];

  // 下から上に向かって、支えられていないブロックを探す
  for (let row = ROW - 2; row >= 0; row--) {
    for (let col = 0; col < COL; col++) {
      const cell = stage[row][col];

      // カプセルの場合のみ重力を適用（ウイルスは固定）
      if (cell >= 0 && cell <= 2) {
        // 下のセルが空白かチェック
        if (stage[row + 1][col] === -1) {
          // このカプセル片が落下可能かチェック
          if (canCapsulePieceFall(row, col)) {
            toFall.push([row, col]);
          }
        }
      }
    }
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

  // 隣接するカプセル片を探す
  let connectedRow = -1,
    connectedCol = -1;

  // スプライトの向きから接続先を判定
  switch (spriteDir) {
    case 0: // 上向き -> 下に接続
      if (row + 1 < ROW && stage[row + 1][col] === cell) {
        connectedRow = row + 1;
        connectedCol = col;
      }
      break;
    case 1: // 右向き -> 左に接続
      if (col - 1 >= 0 && stage[row][col - 1] === cell) {
        connectedRow = row;
        connectedCol = col - 1;
      }
      break;
    case 2: // 下向き -> 上に接続
      if (row - 1 >= 0 && stage[row - 1][col] === cell) {
        connectedRow = row - 1;
        connectedCol = col;
      }
      break;
    case 3: // 左向き -> 右に接続
      if (col + 1 < COL && stage[row][col + 1] === cell) {
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

// 連鎖処理を実行
async function processChain() {
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

    if (matches.length === 0) {
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
      img.src = `assets/drugs/${color}_${dir}.png`;
    }
    stageInnerHTML.appendChild(img);
  }

  // ステージ情報をコンソールに表示（HTMLに表示領域がないため）
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
      return;
    }
    placeCapsule(currentCapsule, true); // 一時的に配置
    dropTimer = currentTime;
  }

  // 落下タイマーチェック
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
      // 移動できない場合（着地）
      placeCapsule(currentCapsule, false); // 永続的に配置
      currentCapsule = null; // 新しいカプセルを生成するため

      // 連鎖処理を実行
      const virusCleared = await processChain();

      // ゲームクリア判定
      if (checkGameClear()) {
        console.log(
          `ステージ ${currentStage} クリア！全てのウイルスを消去しました！`
        );

        // 最終ステージかチェック
        if (currentStage >= Object.keys(STAGE_CONFIG).length) {
          console.log("🎉 全ステージクリア！おめでとうございます！");
          console.log(`最終スコア: ${totalScore}点`);
          gameRunning = false;
          return;
        } else {
          // 次のステージに進む
          setTimeout(() => {
            nextStage();
          }, 2000); // 2秒後に次のステージ
          return;
        }
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

// 初回表示
stageDisplay();

// ゲーム開始（2秒後に開始）
setTimeout(() => {
  console.log("ゲーム開始！");
  startGame();
}, 2000);

// キーボード操作の処理
document.addEventListener('keydown', (event) => {
  if (!gameRunning || !currentCapsule) return;

  let newCapsule = null;

  switch(event.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      // 左移動
      console.log("左移動");
      removeCapsule(currentCapsule);
      newCapsule = moveCapsuleLeft(currentCapsule);
      placeCapsule(currentCapsule, true);
      break;

    case 'ArrowRight':
    case 'd':
    case 'D':
      // 右移動
      console.log("右移動");
      removeCapsule(currentCapsule);
      newCapsule = moveCapsuleRight(currentCapsule);
      placeCapsule(currentCapsule, true);
      break;

    case 'ArrowUp':
    case 'w':
    case 'W':
    case ' ': // スペースキー
      // 回転
      console.log("回転操作", currentCapsule);
      // 回転チェック前に現在のカプセルを一時的に削除
      removeCapsule(currentCapsule);
      newCapsule = rotateCapsule(currentCapsule);
      // 元の位置に戻す（回転が失敗した場合のため）
      placeCapsule(currentCapsule, true);
      console.log("回転結果", newCapsule);
      break;

    case 'ArrowDown':
    case 's':
    case 'S':
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
    // 画面を更新
    stageDisplay();
  } else if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W' || event.key === ' ') {
    console.log("回転できませんでした");
  }

  // デフォルトのキーボード動作を防ぐ（スクロールなど）
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
    event.preventDefault();
  }
});
