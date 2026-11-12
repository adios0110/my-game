// ============================================================
// ① 준비 (canvas, ctx)
// ============================================================

// HTML에서 게임 캔버스를 찾아옵니다.
const canvas = document.querySelector("#game");

// 캔버스에 그림을 그릴 2D 도구를 가져옵니다.
const ctx = canvas.getContext("2d");


// ============================================================
// ② 상태 변수
// ============================================================

// 플레이어의 위치와 크기입니다.
const player = { x: 385, y: 0, width: 45, height: 54 };
// 플레이어의 발이 캔버스 바닥에 닿는 시작 위치입니다.
player.y = canvas.height - player.height;
const initialPlayerPosition = { x: player.x, y: player.y };
// 플레이어의 가로 이동 속도, 점프력, 중력을 한곳에서 관리합니다.
const playerSpeed = 300;
const jumpPower = -650;
const gravity = 1800;
const groundY = canvas.height - player.height;
// 세로 속도는 음수일수록 위로, 양수일수록 아래로 움직입니다.
let verticalVelocity = 0;
let isOnGround = true;
// 현재 눌려 있는 키의 상태를 기록합니다.
const keys = {};

// 디버그 및 히트박스 표시 설정 (기본값 false로 변경)
let showDebug = false;
let showHitbox = false;

// 게임 시간과 체력입니다.
const maxHealth = 3;
let remainingTime = 180;
let health = maxHealth;
let elapsedTime = 0;
let lastFrameTime = null;
let nextObstacleIncreaseAt = 15;
let score = 0;
let collectedLetters = "";
// 클릭해 선택한 문자의 인덱스와 단어 확인 상태입니다.
let selectedLetterIndexes = [];
let wordMessage = "문자를 클릭하고 Enter로 단어를 확인하세요.";
let isCheckingWord = false;
const wordValidityCache = new Map();
let gameOver = false;
// 방어막은 장애물 충돌 한 번을 막으면 사라집니다.
let hasShield = false;
// 게임 상태: intro(조작 설명 화면) → playing(게임 중)
let gameState = "intro";

// A~Z는 모두 등장하지만, 화면에는 5개만 동시에 보입니다.
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let nextLetterIndex = 5;
const letters = Array.from({ length: 5 }, (_, index) => ({
  // 이 물체가 글자임을 표시합니다.
  kind: "letter",
  // 화면에 표시할 알파벳입니다.
  text: alphabet[index],
  // 글자의 시작 가로 위치입니다.
  x: 35 + index * 150,
  // 글자의 시작 세로 위치입니다.
  y: -40 - index * 80,
  // 한 프레임에 아래로 이동할 거리입니다.
  speedY: 3 + (index % 3) * 0.35,
}));

// 장애물은 3개로 시작하며 15초마다 하나씩 추가됩니다.
const obstacleSymbols = "!-@#$%^&*";
let nextObstacleSymbolIndex = 3;
const obstacles = obstacleSymbols.slice(0, 3).split("").map((text, index) => ({
  // 이 물체가 장애물임을 표시합니다.
  kind: "obstacle",
  // 화면에 표시할 특수기호입니다.
  text,
  // 장애물의 시작 가로 위치입니다.
  x: 150 + index * 240,
  // 장애물의 시작 세로 위치입니다.
  y: -100 - index * 150,
  // 처음 두 장애물의 가로 속도입니다. 나머지는 0이라 수직으로 떨어집니다.
  speedX: index < 2 ? (index === 0 ? 1.8 : -1.8) : 0,
  // 한 프레임에 아래로 이동할 거리입니다.
  speedY: 4 + index * 0.2,
}));

// 책장 한 칸의 글자 슬롯 위치와 맞추기 위해 책장 시작 x 좌표를 상수로 둡니다.
const shelfXs = [20, 570];

// 특별한 기능을 쓸 수 있는 단어와, 그 단어의 글자들이 빛날 때 쓸 색입니다.
const specialWords = [
  { word: "SHIELD", color: "#54d6ff" },
  { word: "PLUS", color: "#ffe45e" },
];

// ---------- 안경 쓴 교복 학생 도트 스프라이트 (15 x 18 칸) ----------
const spritePalette = {
  H: "#2f2740", // 머리카락
  S: "#ffd9c2", // 피부
  G: "#6b6f8f", // 안경테
  E: "#15151f", // 눈
  M: "#d9776e", // 입
  N: "#2c4a7c", // 교복 재킷
  W: "#ffffff", // 셔츠
  R: "#d9444f", // 리본
  P: "#3c405e", // 바지
  B: "#2a2330", // 신발
};

// 앞모습입니다.
const frontRows = [
  ".....HHHHH.....",
  "...HHHHHHHHH...",
  "..HHHHHHHHHHH..",
  "..HHSSSSSSSHH..",
  ".HHSSSSSSSSSHH.",
  ".HSGGGSSSGGGSH.",
  ".HSGEGSGSGEGSH.",
  ".HSGGGSSSGGGSH.",
  ".HSSSSSMSSSSSH.",
  "..HSSSSSSSSSH..",
  "....HSSSSSH....",
  "...NNWWRWWNN...",
  "..NNNWRRRWNNN..",
  "..NNNNWRWNNNN..",
  "..SNNNNNNNNNS..",
  "....PPPPPPP....",
  "....PPP.PPP....",
  "...BBBB.BBBB...",
];

// 오른쪽을 보는 옆모습의 몸통입니다. (왼쪽을 볼 때는 좌우를 뒤집어 그립니다.)
const sideBodyRows = [
  "....HHHHHH.....",
  "...HHHHHHHHH...",
  "..HHHHHHHHHHH..",
  "..HHHHHSSSSS...",
  ".HHHHHSSSSSSS..",
  ".HHHHSSGGGGSS..",
  ".HHHHSSGEGGSS..",
  ".HHHHSSGGGGSSS.",
  ".HHHHSSSSSSMS..",
  "..HHHSSSSSSS...",
  "....HSSSSSS....",
  "....NNWRNNN....",
  "...NNNWRNNNN...",
  "...NNNNNNNNN...",
  "...NNNNNNNSS...",
  "....PPPPPPP....",
];
// 걷기 애니메이션용 다리 두 가지입니다.
const sideLegStride = ["...PPPP.PPPP...", "..BBBBB.BBBBB.."];
const sideLegTogether = ["....PPPPPPP....", "....BBBBBBBB..."];


// ============================================================
// ③ 이벤트
// ============================================================

document.addEventListener("keydown", (event) => {
  preventGameKeyScroll(event);

  // 설명 화면에서는 Space 또는 Enter로 게임을 시작합니다.
  if (gameState === "intro") {
    if (event.key === " " || event.key === "Enter") startGame();
    return;
  }

  if (event.key === "r" || event.key === "R") {
    restartGame();
    return;
  }

  // G 키를 누르면 디버그 표시 및 히트박스 켜기/끄기 토글 (연속 입력 방지)
  if (event.key === "g" || event.key === "G") {
    if (!event.repeat) {
      showDebug = !showDebug;
      showHitbox = showDebug;
    }
    keys.right = true;
    return;
  }

  if (gameOver) return;

  if (event.key === "Enter") {
    submitSelectedWord();
    return;
  }

  // A, D 키의 눌림 상태를 저장해 게임 루프에서 계속 이동하게 합니다.
  if (["a", "A"].includes(event.key)) keys.left = true;

  // 바닥에 있을 때만 음수 점프 속도를 주어 위로 솟게 합니다.
  if (event.key === " " && isOnGround) {
    verticalVelocity = jumpPower;
    isOnGround = false;
  }
});

document.addEventListener("keyup", (event) => {
  preventGameKeyScroll(event);
  if (["a", "A"].includes(event.key)) keys.left = false;
  if (["d", "D"].includes(event.key)) keys.right = false;
});

canvas.addEventListener("click", (event) => {
  if (gameState === "intro") {
    startGame();
    return;
  }

  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * (canvas.width / bounds.width);
  const y = (event.clientY - bounds.top) * (canvas.height / bounds.height);

  if (gameOver) {
    if (x >= 285 && x <= 515 && y >= 340 && y <= 390) restartGame();
    return;
  }

  // 클릭한 책장 문자를 선택하거나 선택 해제합니다.
  const clickedIndex = [...collectedLetters].slice(0, 50).findIndex((_, index) => {
    const slot = getCollectedLetterSlot(index);
    return x >= slot.x && x <= slot.x + 30 && y >= slot.y && y <= slot.y + 40;
  });
  if (clickedIndex === -1) return;

  if (selectedLetterIndexes.includes(clickedIndex)) {
    selectedLetterIndexes = selectedLetterIndexes.filter((index) => index !== clickedIndex);
  } else {
    selectedLetterIndexes.push(clickedIndex);
  }
  wordMessage = "Enter를 눌러 선택한 단어를 확인하세요.";
});


// ============================================================
// ④ 함수들
// ============================================================

function drawShelf(shelfX) {
  // 따뜻한 나무 프레임이 도서관 벽 위에서 책장이 눈에 확 띄게 합니다.
  ctx.fillStyle = "#7a4a2a";
  ctx.fillRect(shelfX - 10, 76, 230, 384);
  // 책장 윗장식입니다.
  ctx.fillStyle = "#5a3820";
  ctx.fillRect(shelfX - 14, 68, 238, 12);
  ctx.fillStyle = "#c99458";
  ctx.fillRect(shelfX - 14, 68, 238, 3);
  // 안쪽은 어둡게 칠해 알록달록한 문자 책이 또렷하게 보이게 합니다.
  ctx.fillStyle = "#2b1d15";
  ctx.fillRect(shelfX, 90, 210, 360);
  // 아직 비어 있는 책 자리를 아주 흐린 윤곽으로 보여 줍니다.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
  ctx.lineWidth = 1;
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      ctx.strokeRect(shelfX + 18 + column * 37 + 0.5, 108 + row * 60 + 0.5, 29, 39);
    }
  }
  // 책이 올라가는 선반입니다.
  for (let y = 150; y < 450; y += 60) {
    ctx.fillStyle = "#a8763e";
    ctx.fillRect(shelfX, y, 210, 9);
    ctx.fillStyle = "#d1a066";
    ctx.fillRect(shelfX, y, 210, 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(shelfX, y + 9, 210, 4);
  }
  // 책장 바닥판과 바깥 윤곽선입니다.
  ctx.fillStyle = "#5a3820";
  ctx.fillRect(shelfX - 10, 450, 230, 10);
  ctx.strokeStyle = "#3a2412";
  ctx.lineWidth = 3;
  ctx.strokeRect(shelfX - 10, 76, 230, 384);
}

function drawBackground() {
  // 학교 도서관 벽: 차분한 연두빛 회색입니다.
  ctx.fillStyle = "#d3dbc3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 천장 들보입니다.
  ctx.fillStyle = "#5a3d2b";
  ctx.fillRect(0, 0, canvas.width, 16);
  ctx.fillStyle = "#3d2a1c";
  ctx.fillRect(0, 16, canvas.width, 4);

  // 가운데 아래쪽 벽 하단 패널(웨인스코팅)입니다.
  ctx.fillStyle = "#a68d6a";
  ctx.fillRect(240, 350, 320, 100);
  ctx.fillStyle = "#8f7656";
  ctx.fillRect(240, 350, 320, 4);
  for (let x = 262; x < 560; x += 60) ctx.fillRect(x, 362, 3, 76);

  // 가운데 큰 창문입니다.
  const sky = ctx.createLinearGradient(0, 128, 0, 300);
  sky.addColorStop(0, "#9fd3ec");
  sky.addColorStop(1, "#e2f3f7");
  ctx.fillStyle = sky;
  ctx.fillRect(290, 128, 220, 172);
  ctx.strokeStyle = "#7b5a3c";
  ctx.lineWidth = 10;
  ctx.strokeRect(290, 128, 220, 172);
  ctx.fillStyle = "#7b5a3c";
  ctx.fillRect(397, 128, 6, 172);
  ctx.fillRect(290, 211, 220, 6);
  ctx.fillRect(280, 300, 240, 10);

  // 창문 위 도서관 명패입니다.
  ctx.fillStyle = "#5a3d2b";
  ctx.fillRect(340, 97, 120, 22);
  ctx.fillStyle = "#f3e3b8";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("LIBRARY", 400, 113);

  // 나무 바닥입니다.
  ctx.fillStyle = "#b98b5c";
  ctx.fillRect(0, 450, canvas.width, 150);
  ctx.fillStyle = "#9d724a";
  for (let band = 0; band < 4; band += 1) {
    const bandY = 454 + band * 36;
    ctx.fillRect(0, bandY + 34, canvas.width, 2);
    for (let x = (band % 2) * 60; x < canvas.width; x += 120) ctx.fillRect(x, bandY, 2, 36);
  }
  // 걸레받이입니다.
  ctx.fillStyle = "#5a3d2b";
  ctx.fillRect(0, 446, canvas.width, 8);
  // 창문으로 들어온 햇빛이 바닥에 비칩니다.
  ctx.fillStyle = "rgba(255, 248, 210, 0.16)";
  ctx.beginPath();
  ctx.moveTo(330, 456);
  ctx.lineTo(470, 456);
  ctx.lineTo(540, 575);
  ctx.lineTo(260, 575);
  ctx.closePath();
  ctx.fill();

  // 가운데 열람용 책상과 스탠드입니다.
  ctx.fillStyle = "#6e4a2c";
  ctx.fillRect(340, 416, 8, 34);
  ctx.fillRect(452, 416, 8, 34);
  ctx.fillStyle = "#7d5232";
  ctx.fillRect(330, 408, 140, 8);
  ctx.fillStyle = "#6f8a66";
  ctx.fillRect(350, 397, 24, 11);
  ctx.fillStyle = "#a38bbf";
  ctx.fillRect(376, 401, 18, 7);
  ctx.fillStyle = "#2d5a43";
  ctx.fillRect(432, 402, 14, 6);
  ctx.fillStyle = "#3f8a63";
  ctx.beginPath();
  ctx.moveTo(427, 402);
  ctx.lineTo(439, 382);
  ctx.lineTo(451, 402);
  ctx.closePath();
  ctx.fill();

  // 양옆 책장은 마지막에 그려 가장 눈에 띄게 합니다.
  shelfXs.forEach(drawShelf);
}

function getCollectedLetterSlot(index) {
  const shelfSide = Math.floor(index / 25);
  const positionInShelf = index % 25;
  const row = Math.floor(positionInShelf / 5);
  const column = positionInShelf % 5;
  const shelfX = shelfSide === 0 ? 20 : 570;
  return { x: shelfX + 18 + column * 37, y: 108 + row * 60 };
}

function getSpecialWordMatches() {
  // 책장에 보이는 문자만으로 특수 단어를 만들 수 있는지 확인합니다.
  const shelfLetters = [...collectedLetters].slice(0, 50);
  return specialWords.map((special) => {
    const indexes = [];
    for (const character of special.word) {
      const found = shelfLetters.findIndex((letter, index) => letter === character && !indexes.includes(index));
      if (found === -1) return null;
      indexes.push(found);
    }
    return { ...special, indexes };
  }).filter(Boolean);
}

function drawCollectedLettersOnShelves() {
  // 획득 순서대로 왼쪽 책장을 먼저 채우고, 다음에는 오른쪽 책장을 채웁니다.
  const bookColors = ["#f5b544", "#e87867", "#5799a6", "#8d79b8", "#78a66b"];
  const specialMatches = getSpecialWordMatches();
  // 빛이 살짝 숨 쉬듯 커졌다 작아지게 합니다.
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 350);

  [...collectedLetters].slice(0, 50).forEach((letter, index) => {
    const shelfSide = Math.floor(index / 25); // 0: 왼쪽, 1: 오른쪽
    const positionInShelf = index % 25;
    const row = Math.floor(positionInShelf / 5);
    const column = positionInShelf % 5;
    const shelfX = shelfSide === 0 ? 20 : 570;
    const x = shelfX + 18 + column * 37;
    const shelfY = 150 + row * 60;

    ctx.fillStyle = bookColors[index % bookColors.length];
    ctx.fillRect(x, shelfY - 42, 30, 40);
    // 책등 느낌의 어두운 줄과 윗면 하이라이트입니다.
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(x, shelfY - 42, 4, 40);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(x, shelfY - 42, 30, 3);

    // 특수 기능(SHIELD, PLUS)에 쓸 수 있는 문자는 테두리가 살짝 빛납니다.
    specialMatches.forEach((match, order) => {
      if (!match.indexes.includes(index)) return;
      const pad = 2 + order * 1.5;
      ctx.save();
      ctx.shadowColor = match.color;
      ctx.shadowBlur = 6 + pulse * 6;
      ctx.strokeStyle = match.color;
      ctx.globalAlpha = 0.65 + pulse * 0.3;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - pad, shelfY - 42 - pad, 30 + pad * 2, 40 + pad * 2);
      ctx.restore();
    });

    // 선택된 문자는 흰색 테두리로 표시합니다.
    if (selectedLetterIndexes.includes(index)) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, shelfY - 44, 34, 44);
    }
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.strokeText(letter, x + 17, shelfY - 14);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(letter, x + 17, shelfY - 14);
  });
}

function getSelectedWord() {
  return selectedLetterIndexes.map((index) => collectedLetters[index]).join("");
}

async function submitSelectedWord() {
  const word = getSelectedWord().toLowerCase();
  if (word.length < 2) {
    wordMessage = "두 글자 이상을 선택하세요.";
    return;
  }
  if (isCheckingWord) return;

  isCheckingWord = true;
  wordMessage = `${word.toUpperCase()} 단어를 확인하는 중...`;
  let isValidWord = wordValidityCache.get(word);
  if (isValidWord === undefined) {
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      isValidWord = response.ok;
      wordValidityCache.set(word, isValidWord);
    } catch {
      wordMessage = "사전에 연결할 수 없습니다. 인터넷 연결을 확인하세요.";
      isCheckingWord = false;
      return;
    }
  }

  isCheckingWord = false;
  if (getSelectedWord().toLowerCase() !== word) return;
  if (!isValidWord) {
    wordMessage = `${word.toUpperCase()}는 사전에 없는 단어입니다.`;
    return;
  }

  score += 50;
  // 뒤에서부터 삭제해 앞쪽 인덱스가 바뀌지 않게 합니다.
  [...selectedLetterIndexes].sort((a, b) => b - a).forEach((index) => {
    collectedLetters = collectedLetters.slice(0, index) + collectedLetters.slice(index + 1);
  });
  selectedLetterIndexes = [];
  if (word === "plus") {
    health = Math.min(maxHealth, health + 1);
    wordMessage = "PLUS 정답! +50점, 체력 +1";
  } else if (word === "shield") {
    hasShield = true;
    wordMessage = "SHIELD 정답! 다음 장애물 충돌을 막습니다.";
  } else {
    wordMessage = `${word.toUpperCase()} 정답! +50점`;
  }
}

function buildSprite(rows) {
  // 글자 지도를 1칸 = 1픽셀인 작은 캔버스로 만들어 두고, 그릴 때 크게 확대합니다.
  const spriteCanvas = document.createElement("canvas");
  spriteCanvas.width = rows[0].length;
  spriteCanvas.height = rows.length;
  const spriteCtx = spriteCanvas.getContext("2d");
  rows.forEach((row, y) => {
    [...row].forEach((code, x) => {
      if (code === ".") return;
      spriteCtx.fillStyle = spritePalette[code];
      spriteCtx.fillRect(x, y, 1, 1);
    });
  });
  return spriteCanvas;
}

const studentFront = buildSprite(frontRows);
const studentSide = [
  buildSprite([...sideBodyRows, ...sideLegStride]),
  buildSprite([...sideBodyRows, ...sideLegTogether]),
];

function drawPlayer() {
  const { x, y, width, height } = player;

  // 바닥에 그림자를 깔아 점프 높이를 알기 쉽게 합니다.
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x + width / 2, groundY + height - 3, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 방어막이 있을 때 플레이어 주위에 푸른 보호막을 표시합니다.
  if (hasShield) {
    ctx.save();
    ctx.strokeStyle = "#54d6ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, 34, 40, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // A만 누르면 왼쪽, D만 누르면 오른쪽 옆모습, 그 외에는 앞모습을 보여 줍니다.
  const direction = keys.right && !keys.left ? "right" : keys.left && !keys.right ? "left" : "front";

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (direction === "front") {
    ctx.drawImage(studentFront, x, y, width, height);
  } else {
    // 땅에서 걸을 때는 다리가 번갈아 움직이고, 공중에서는 성큼 걷는 다리로 고정합니다.
    const frame = isOnGround ? Math.floor(performance.now() / 140) % 2 : 0;
    if (direction === "left") {
      ctx.translate(x + width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(studentSide[frame], 0, 0, width, height);
    } else {
      ctx.drawImage(studentSide[frame], x, y, width, height);
    }
  }
  ctx.restore();
}

// ---------- 시작 전 조작 설명 화면 ----------
function drawKeycap(label, x, y, width, fontSize) {
  // 키보드 키처럼 보이도록 아래쪽에 두께를 줍니다.
  ctx.fillStyle = "#8a8a8a";
  ctx.fillRect(x, y + 5, width, 50);
  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(x, y, width, 50);
  ctx.fillStyle = "#111111";
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(label, x + width / 2, y + 33);
}

function drawIntroScreen(time) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px sans-serif";
  ctx.fillText("스펠 커넥션", canvas.width / 2, 100);

  // 주인공 학생을 크게 보여 줍니다.
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(studentFront, canvas.width / 2 - 37.5, 130, 75, 90);
  ctx.restore();

  drawKeycap("A", 235, 270, 50, 24);
  drawKeycap("D", 295, 270, 50, 24);
  drawKeycap("SPACE", 235, 345, 190, 22);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("좌우 이동", 455, 305);
  ctx.fillText("점프", 455, 380);

  ctx.textAlign = "center";
  ctx.fillStyle = "#9a9a9a";
  ctx.font = "15px sans-serif";
  ctx.fillText("책장의 문자를 클릭해 고른 뒤 Enter로 단어를 확인하세요.", canvas.width / 2, 465);

  // 시작 안내 문구는 천천히 깜빡입니다.
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.45 * Math.sin(time / 400);
  ctx.fillStyle = "#ffe45e";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("Space 또는 Enter를 눌러 시작", canvas.width / 2, 535);
  ctx.restore();
}

function startGame() {
  gameState = "playing";
  keys.left = false;
  keys.right = false;
}

function drawLetter(letter) {
  // 글자의 테두리와 흰색 내부를 그립니다.
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#141022";
  ctx.strokeText(letter.text, letter.x, letter.y);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(letter.text, letter.x, letter.y);
}

function drawObstacle(obstacle) {
  // 장애물을 빨간 특수기호로 그립니다.
  // -는 가로 길이가 짧으므로 글꼴을 키워 다른 장애물과 비슷하게 보이게 합니다.
  ctx.font = obstacle.text === "-" ? "bold 54px sans-serif" : "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff5e6b";
  ctx.fillText(obstacle.text, obstacle.x, obstacle.y);
}

function resetFallingObject(object) {
  // 화면 아래로 나간 물체를 화면 위로 되돌립니다.
  object.y = -30;
  // 다음에 떨어질 가로 위치를 무작위로 정합니다.
  object.x = 30 + Math.random() * (canvas.width - 60);
  // 글자라면 A부터 Z까지 다음 알파벳으로 바꿉니다.
  if (object.kind === "letter") {
    object.text = alphabet[nextLetterIndex];
    nextLetterIndex = (nextLetterIndex + 1) % alphabet.length;
  }
}

function addObstacle() {
  // 특수기호 목록에서 다음 장애물 모양을 고릅니다.
  const text = obstacleSymbols[nextObstacleSymbolIndex % obstacleSymbols.length];
  // 새 장애물을 배열에 추가합니다.
  obstacles.push({
    kind: "obstacle",
    text,
    x: 30 + Math.random() * (canvas.width - 60),
    y: -30,
    speedX: 0,
    speedY: 1.5 + Math.random(),
  });
  nextObstacleSymbolIndex += 1;
}

function isCollidingWithPlayer(obstacle) {
  // 장애물의 영역과 플레이어의 영역이 겹치는지 확인합니다.
  return obstacle.x + 18 > player.x
    && obstacle.x - 18 < player.x + player.width
    && obstacle.y + 8 > player.y
    && obstacle.y - 36 < player.y + player.height;
}

function isLetterCollected(letter) {
  return letter.x + 18 > player.x
    && letter.x - 18 < player.x + player.width
    && letter.y + 8 > player.y
    && letter.y - 36 < player.y + player.height;
}

function restartGame() {
  remainingTime = 180;
  health = maxHealth;
  elapsedTime = 0;
  nextObstacleIncreaseAt = 15;
  score = 0;
  collectedLetters = "";
  selectedLetterIndexes = [];
  wordMessage = "문자를 클릭하고 Enter로 단어를 확인하세요.";
  isCheckingWord = false;
  gameOver = false;
  hasShield = false;
  player.x = initialPlayerPosition.x;
  player.y = groundY;
  verticalVelocity = 0;
  isOnGround = true;
  nextLetterIndex = 5;
  nextObstacleSymbolIndex = 3;

  letters.forEach((letter, index) => {
    letter.text = alphabet[index];
    letter.x = 35 + index * 150;
    letter.y = -40 - index * 80;
  });
  obstacles.splice(3);
  obstacles.forEach((obstacle, index) => {
    obstacle.text = obstacleSymbols[index];
    obstacle.x = 150 + index * 240;
    obstacle.y = -100 - index * 150;
    obstacle.speedX = index < 2 ? (index === 0 ? 1.8 : -1.8) : 0;
    obstacle.speedY = 4 + index * 0.2;
  });
}

// A, D 키와 스페이스바의 기본 동작을 막습니다.
function preventGameKeyScroll(event) {
  if (["a", "A", "d", "D", " "].includes(event.key)) event.preventDefault();
}

function updatePlayerPosition(deltaTime) {
  // 눌려 있는 A, D 키에 따라 가로 위치를 계산합니다.
  if (keys.left) player.x -= playerSpeed * deltaTime;
  if (keys.right) player.x += playerSpeed * deltaTime;

  // 매 프레임 중력을 세로 속도에 더하고, 그 속도로 세로 위치를 갱신합니다.
  verticalVelocity += gravity * deltaTime;
  player.y += verticalVelocity * deltaTime;

  // 좌우 벽을 넘지 않게 하고, 오른쪽 벽에는 플레이어 너비를 반영합니다.
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

  // 바닥에 닿으면 위치와 세로 속도를 멈춰 다음 점프를 허용합니다.
  if (player.y >= groundY) {
    player.y = groundY;
    verticalVelocity = 0;
    isOnGround = true;
  }
}

function formatTime(seconds) {
  // 전체 초를 분 단위 숫자로 바꿉니다.
  const minutes = Math.floor(seconds / 60);
  // 남은 초를 두 자리 문자열로 바꿉니다.
  const secondsText = Math.ceil(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secondsText}`;
}


// ============================================================
// ⑤ 게임 루프
// ============================================================

function gameLoop(currentTime) {
  // 지우기
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 설명 화면 동안에는 게임 시간과 물체가 움직이지 않습니다.
  if (gameState === "intro") {
    lastFrameTime = currentTime;
    drawIntroScreen(currentTime);
    requestAnimationFrame(gameLoop);
    return;
  }

  // 계산
  if (lastFrameTime !== null && remainingTime > 0 && health > 0) {
    // 이전 프레임부터 흐른 시간을 초 단위로 계산합니다.
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    // 남은 게임 시간에서 흐른 시간을 뺍니다.
    remainingTime = Math.max(0, remainingTime - deltaTime);
    elapsedTime += deltaTime;
    // 키 상태와 중력에 따라 플레이어 위치를 매 프레임 갱신합니다.
    updatePlayerPosition(deltaTime);
    while (elapsedTime >= nextObstacleIncreaseAt) {
      // 15초가 지날 때마다 장애물을 하나 추가합니다.
      addObstacle();
      nextObstacleIncreaseAt += 15;
    }
  }
  lastFrameTime = currentTime;

  // 모든 글자의 위치를 아래쪽으로 갱신합니다.
  letters.forEach((letter) => {
    if (remainingTime > 0 && health > 0) letter.y += letter.speedY;
    if (letter.y > canvas.height + 40) resetFallingObject(letter);
    if (!gameOver && isLetterCollected(letter)) {
      collectedLetters += letter.text;
      score += 5;
      resetFallingObject(letter);
    }
  });
  // 모든 장애물의 위치를 갱신하고 충돌을 확인합니다.
  obstacles.forEach((obstacle) => {
    if (remainingTime > 0 && health > 0) obstacle.y += obstacle.speedY;
    // 가로 속도가 있는 장애물은 대각선으로 이동합니다.
    if (remainingTime > 0 && health > 0) obstacle.x += obstacle.speedX;
    // 좌우 벽에 닿으면 가로 이동 방향을 반대로 바꿉니다.
    if (obstacle.x <= 18 || obstacle.x >= canvas.width - 18) {
      obstacle.speedX *= -1;
    }
    if (obstacle.y > canvas.height + 40) resetFallingObject(obstacle);
    if (health > 0 && isCollidingWithPlayer(obstacle)) {
      // 방어막이 있으면 이 충돌 한 번을 막고 방어막을 없앱니다.
      if (hasShield) {
        hasShield = false;
      } else if (obstacle.text === "-") {
        // -는 점수를 차감하고, 나머지 장애물은 체력을 줄입니다.
        score -= 35;
      } else {
        health -= 1;
      }
      resetFallingObject(obstacle);
    }
  });

  // 그리기
  drawBackground();
  drawCollectedLettersOnShelves();
  ctx.fillStyle = "#1b1919";
  ctx.font = "bold 25px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\uC2A4\uD3A0 \uCEE4\uB809\uC158", canvas.width / 2, 42);
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`\uC810\uC218: ${score}`, 25, 38);
  ctx.textAlign = "right";
  ctx.fillText(`\uC2DC\uAC04: ${formatTime(remainingTime)}`, canvas.width - 25, 38);
  ctx.fillStyle = "#e84d5b";
  ctx.font = "bold 25px sans-serif";
  ctx.textAlign = "left";
  const fullHearts = Math.floor(health);
  const hasHalfHeart = health % 1 >= 0.5;
  const emptyHearts = maxHealth - fullHearts - (hasHalfHeart ? 1 : 0);
  ctx.fillText("\u2665".repeat(fullHearts) + (hasHalfHeart ? "½" : "") + "\u2661".repeat(emptyHearts), 25, 70);
  // 글자, 장애물, 플레이어 순서로 화면에 그립니다.
  // 현재 선택한 문자와 단어 확인 결과를 화면에 표시합니다.
  ctx.fillStyle = "#1b1919";
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`선택: ${getSelectedWord() || "-"}`, canvas.width / 2, 67);
  ctx.font = "13px sans-serif";
  ctx.fillText(wordMessage, canvas.width / 2, 87);

  letters.forEach(drawLetter);
  obstacles.forEach(drawObstacle);
  drawPlayer();

  // 디버그 정보 및 히트박스 표시 (showDebug가 true일 때만 출력)
  if (showDebug) {
    ctx.save();
    // 왼쪽 상단 여백에 반투명 박스 및 디버그 정보 출력
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(15, 95, 195, 95);
    ctx.strokeStyle = "#54d6ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 95, 195, 95);

    ctx.fillStyle = "#54d6ff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("[DEBUG INFO]", 23, 113);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Player X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}`, 23, 131);
    ctx.fillText(`Obstacles: ${obstacles.length}`, 23, 149);
    ctx.fillText(`GameState: ${gameState}`, 23, 167);
    ctx.fillText(`Score: ${score}`, 23, 185);
    ctx.restore();

    // showHitbox가 true일 때 플레이어와 장애물의 충돌 범위(히트박스)를 빨간 테두리로 표시
    if (showHitbox) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.85)";
      ctx.lineWidth = 2;

      // 플레이어 히트박스
      ctx.strokeRect(player.x, player.y, player.width, player.height);

      // 장애물 히트박스 (isCollidingWithPlayer 판정 범위와 일치)
      obstacles.forEach((obstacle) => {
        ctx.strokeRect(obstacle.x - 18, obstacle.y - 36, 36, 44);
      });

      ctx.restore();
    }
  }

  if (remainingTime === 0 || health === 0) {
    gameOver = true;
    // 시간이 끝났거나 체력이 없으면 게임 종료 문구를 표시합니다.
    ctx.fillStyle = "#1b1919";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\uAC8C\uC784 \uC885\uB8CC", canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = "#28616d";
    ctx.fillRect(285, 340, 230, 50);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("\uB2E4\uC2DC \uC2DC\uC791 (R)", canvas.width / 2, 373);
  }

  // 다음 화면을 그릴 때 게임 루프를 다시 실행합니다.
  requestAnimationFrame(gameLoop);
}


// ============================================================
// ⑥ 시동
// ============================================================

// 브라우저의 다음 화면 그리기 시점에 게임을 처음 시작합니다.
requestAnimationFrame(gameLoop);