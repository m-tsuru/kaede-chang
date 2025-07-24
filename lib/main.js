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
function placeFacesRandomly(stage, faceCount = 6) {
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
  // 顔を配置
  for (let i = 0; i < faceCount && i < positions.length; i++) {
    const [row, col] = positions[i];
    const face = faceValues[Math.floor(Math.random() * faceValues.length)];
    stage[row][col] = face;
  }
}

// 顔を6個ランダム配置（必要に応じて数を変更）
placeFacesRandomly(stage, 6);

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
}

// ゲームの更新処理
function updateGame() {
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
  function gameLoop() {
    updateGame();
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
