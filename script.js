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
let groundY = canvas.height - player.height;

// ------------------------------------------------------------
// 플레이어 이미지 (player.png)
// player.png는 같은 크기의 4칸이 가로로 이어진 시트입니다.
//   0: 앞모습 / 1, 2: 오른쪽 걷기 / 3: 왼쪽 (왼쪽의 다른 한 장은 2번을 뒤집어 씁니다)
// ------------------------------------------------------------
// 이미지는 파일 대신 이 파일 맨 아래의 getEmbeddedImages()에 들어 있어서, 따로 파일을 둘 필요가 없습니다.
const PLAYER_IMAGE_SRC = getEmbeddedImages().player;
const PLAYER_IMAGE_FRAME_COUNT = 4;
// 이미지가 불러와지면 플레이어를 이 높이로 그립니다. (가로는 이미지 비율대로 정해집니다)
const PLAYER_DRAW_HEIGHT = 68;
// 충돌 판정 영역은 이미지 크기에서 양쪽으로 이만큼씩 줄입니다.
const PLAYER_HITBOX_INSET_X = 4;
// 오른쪽/왼쪽 걷기 때 번갈아 그릴 프레임입니다.
const playerWalkFrames = {
  right: [{ frame: 1, flip: false }, { frame: 2, flip: false }],
  left: [{ frame: 3, flip: false }, { frame: 2, flip: true }],
};

// 이미지가 실제로 불러와졌을 때만 true가 됩니다. false이면 기존 도트 그림으로 그립니다.
let isPlayerImageReady = false;
const playerImage = new Image();
playerImage.onload = () => {
  // 그림을 그리는 건 게임 루프지만, 불러오기가 끝나기 전에는 그리지 않도록 여기서 준비 완료를 표시합니다.
  const frameWidth = playerImage.naturalWidth / PLAYER_IMAGE_FRAME_COUNT;
  const frameHeight = playerImage.naturalHeight;
  if (!(frameWidth > 0 && frameHeight > 0)) return;

  // 플레이어 크기를 이미지 크기 기준으로 바꾸되, 발 위치는 그대로 유지합니다.
  const feetY = player.y + player.height;
  player.height = PLAYER_DRAW_HEIGHT;
  player.width = Math.round(PLAYER_DRAW_HEIGHT * frameWidth / frameHeight);
  groundY = canvas.height - player.height;
  initialPlayerPosition.y = groundY;
  player.y = Math.min(feetY - player.height, groundY);
  player.x = Math.min(player.x, canvas.width - player.width);
  isPlayerImageReady = true;
};
playerImage.onerror = () => {
  // 파일이 없거나 불러오지 못하면 기존 도트 그림 그대로 게임이 진행됩니다.
  isPlayerImageReady = false;
};
playerImage.src = PLAYER_IMAGE_SRC;

function getPlayerHitbox() {
  // 이미지 크기에서 좌우로 PLAYER_HITBOX_INSET_X만큼 줄인 충돌 판정 영역입니다.
  return {
    x: player.x + PLAYER_HITBOX_INSET_X,
    y: player.y,
    width: player.width - PLAYER_HITBOX_INSET_X * 2,
    height: player.height,
  };
}

// ------------------------------------------------------------
// 책장 레이아웃: 모은 문자(책)가 놓일 자리
// 배경 이미지가 있을 때와 없을 때(직접 그린 책장)의 자리가 달라서 두 가지를 준비합니다.
//   startX: [왼쪽 책장 첫 열 x, 오른쪽 책장 첫 열 x] / rowBottoms: 각 줄 책이 놓이는 선반 윗면 y
// ------------------------------------------------------------
const DRAWN_SHELF_LAYOUT = {
  cols: 5, rows: 5, startX: [38, 588], pitchX: 37, bookW: 30, bookH: 40,
  rowBottoms: [148, 208, 268, 328, 388],
};
const IMAGE_SHELF_LAYOUT = {
  cols: 6, rows: 4, startX: [89, 587], pitchX: 33, bookW: 28, bookH: 40,
  rowBottoms: [310, 361, 415, 469],
};
let shelfLayout = DRAWN_SHELF_LAYOUT;

function getShelfCapacity() {
  // 두 책장에 보여 줄 수 있는 문자의 최대 개수입니다.
  return shelfLayout.cols * shelfLayout.rows * 2;
}

// ------------------------------------------------------------
// 배경 이미지 (background.png, 800 x 600)
// 불러오기에 성공해야 이미지로 그리고, 실패하면 직접 그린 도서관 배경을 씁니다.
// ------------------------------------------------------------
const BACKGROUND_IMAGE_SRC = getEmbeddedImages().background;
let isBackgroundReady = false;
const backgroundImage = new Image();
backgroundImage.onload = () => {
  if (!(backgroundImage.naturalWidth > 0)) return;
  isBackgroundReady = true;
  // 이미지 속 책장 위치에 맞춰 문자 책 자리를 바꿉니다.
  shelfLayout = IMAGE_SHELF_LAYOUT;
};
backgroundImage.onerror = () => {
  isBackgroundReady = false;
  shelfLayout = DRAWN_SHELF_LAYOUT;
};
backgroundImage.src = BACKGROUND_IMAGE_SRC;

// ------------------------------------------------------------
// 효과음과 음소거
// ------------------------------------------------------------
const HIT_SOUND_SRC = "hit.mp3";
const POINT_SOUND_SRC = "point.mp3";
// M 키로 켜고 끄는 음소거 상태입니다.
let isMuted = false;

function createSound(src) {
  // 파일이 없거나 Audio를 만들 수 없는 환경이어도 게임이 멈추지 않도록 감쌉니다.
  try {
    const audio = new Audio(src);
    audio.preload = "auto";
    // 소리 파일을 불러오지 못해도 조용히 넘어갑니다.
    audio.addEventListener("error", () => {});
    return audio;
  } catch {
    return null;
  }
}

const hitSound = createSound(HIT_SOUND_SRC);
const pointSound = createSound(POINT_SOUND_SRC);

function playSound(sound) {
  if (isMuted || !sound) return;
  try {
    // 연속으로 빠르게 나도 매번 처음부터 다시 재생하도록 되감습니다.
    sound.currentTime = 0;
    const result = sound.play();
    // 재생이 막히거나 파일이 없으면 play()가 실패하는데, 에러로 멈추지 않게 무시합니다.
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {
    // 재생 실패는 게임 진행에 영향을 주지 않습니다.
  }
}

function toggleMute() {
  isMuted = !isMuted;
  // 음소거를 켜는 순간 재생 중이던 소리도 멈춥니다.
  if (isMuted) {
    [hitSound, pointSound].forEach((sound) => {
      try {
        if (sound) sound.pause();
      } catch {
        // 무시
      }
    });
  }
}
// 세로 속도는 음수일수록 위로, 양수일수록 아래로 움직입니다.
let verticalVelocity = 0;
let isOnGround = true;
// 현재 눌려 있는 키의 상태를 기록합니다.
const keys = {};

// 디버그 및 히트박스 표시 설정 (기본값 false로 변경)
let showDebug = false;
let showHitbox = false;

// ------------------------------------------------------------
// 난이도 설정: 시간이 지날수록 장애물이 조금씩 어려워집니다.
// 숫자를 바꾸고 싶으면 이 블록만 고치면 됩니다.
// ------------------------------------------------------------
// 난이도가 한 단계 오르는 간격(밀리초)입니다. Date.now() 기준이라 모니터 주사율과 무관합니다.
const DIFFICULTY_INTERVAL_MS = 10000;
// 장애물 속도 배율: 처음 값, 단계마다 늘어나는 양, 상한입니다.
const START_SPEED_MULTIPLIER = 0.5;
const SPEED_MULTIPLIER_STEP = 0.05;
const MAX_SPEED_MULTIPLIER = 1.3;
// 장애물 개수: 처음 개수, 몇 단계마다 1개씩 늘지, 상한입니다.
const START_OBSTACLE_COUNT = 1;
const LEVELS_PER_EXTRA_OBSTACLE = 2;
const MAX_OBSTACLE_COUNT = 7;
// 장애물 등장 간격: 화면 밖으로 나간(또는 부딪힌) 장애물이 다시 나타나기까지 기다리는 시간입니다.
// 처음 값, 단계마다 줄어드는 양, 줄어들 수 있는 최대 양입니다. (최소 간격 = 처음 값 - 최대 감소량)
const START_RESPAWN_DELAY_MS = 2500;
const RESPAWN_DELAY_STEP_MS = 150;
const MAX_RESPAWN_DELAY_REDUCTION_MS = 2200;

// 현재 난이도 단계, 난이도 시계의 시작 시각, 다음 상승 시점입니다.
let difficultyLevel = 0;
let difficultyStartTime = Date.now();
let nextDifficultyIncreaseAt = difficultyStartTime + DIFFICULTY_INTERVAL_MS;
// 현재 단계에서 실제로 쓰는 값입니다. (applyDifficulty가 계산해서 채웁니다)
const difficulty = {
  speedMultiplier: START_SPEED_MULTIPLIER,
  respawnDelayMs: START_RESPAWN_DELAY_MS,
};

// 게임 시간과 체력입니다.
const maxHealth = 3;
let remainingTime = 180;
let health = maxHealth;
let elapsedTime = 0;
let lastFrameTime = null;
let score = 0;
// 최고 점수는 브라우저 localStorage에 저장해 두고, 없으면 0으로 시작합니다.
const HIGH_SCORE_KEY = "spellCorrectionHighScore";
let highScore = loadHighScore();
// 이번 판에서 최고 점수를 새로 세웠는지 기록합니다. (게임 오버 화면의 "신기록!" 표시용)
let isNewRecord = false;
let collectedLetters = "";
// 클릭해 선택한 문자의 인덱스와 단어 확인 상태입니다.
let selectedLetterIndexes = [];
let wordMessage = "문자를 클릭하고 Enter로 단어를 확인하세요.";
let isCheckingWord = false;
const wordValidityCache = new Map();
let gameOver = false;
// 방어막은 장애물 충돌 한 번을 막으면 사라집니다.
let hasShield = false;
// 게임 상태: start(시작 화면) → intro(조작 설명 화면) → playing(게임 중)
let gameState = "start";

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

// 장애물은 START_OBSTACLE_COUNT개로 시작하고, 난이도가 오르면 하나씩 늘어납니다.
const obstacleSymbols = "!-@#$%^&*";
let nextObstacleSymbolIndex = START_OBSTACLE_COUNT;
const obstacles = obstacleSymbols.slice(0, START_OBSTACLE_COUNT).split("").map((text, index) => ({
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

  // M 키: 음소거 켜기/끄기. 어느 화면에서든 동작하고, 화면 전환은 일으키지 않습니다.
  if (event.key === "m" || event.key === "M") {
    if (!event.repeat) toggleMute();
    return;
  }

  // 시작 화면에서는 아무 키나 누르면 조작 설명 화면으로 넘어갑니다.
  // (키를 꾹 눌러 반복 입력될 때 바로 다음 화면까지 넘어가지 않도록 repeat는 무시합니다.)
  if (gameState === "start") {
    if (!event.repeat) gameState = "intro";
    return;
  }

  // 설명 화면에서는 Space 또는 Enter로 게임을 시작합니다.
  if (gameState === "intro") {
    if (!event.repeat && (event.key === " " || event.key === "Enter")) startGame();
    return;
  }

  if (event.key === "r" || event.key === "R") {
    restartGame();
    return;
  }

  // B 키를 누르면 디버그 표시 및 히트박스 켜기/끄기 토글 (연속 입력 방지)
  if (event.key === "b" || event.key === "B") {
    if (!event.repeat) {
      showDebug = !showDebug;
      showHitbox = showDebug;
    }
    return;
  }

  if (gameOver) return;

  if (event.key === "Enter") {
    submitSelectedWord();
    return;
  }

  // A, D 키의 눌림 상태를 저장해 게임 루프에서 계속 이동하게 합니다.
  if (["a", "A"].includes(event.key)) keys.left = true;
  if (["d", "D"].includes(event.key)) keys.right = true;

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
  if (gameState === "start") return;
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
  const clickedIndex = [...collectedLetters].slice(0, getShelfCapacity()).findIndex((_, index) => {
    const slot = getCollectedLetterSlot(index);
    return x >= slot.x && x <= slot.x + slot.width && y >= slot.y && y <= slot.y + slot.height;
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
  if (isBackgroundReady && backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    return;
  }
  // 안전장치: 이미지가 없거나 불러오지 못했으면 직접 그린 배경을 씁니다.
  drawFallbackBackground();
}

function drawFallbackBackground() {
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
  // 획득 순서대로 왼쪽 책장을 먼저 채우고, 다음에는 오른쪽 책장을 채웁니다.
  const layout = shelfLayout;
  const lettersPerShelf = layout.cols * layout.rows;
  const shelfSide = Math.floor(index / lettersPerShelf); // 0: 왼쪽, 1: 오른쪽
  const positionInShelf = index % lettersPerShelf;
  const row = Math.floor(positionInShelf / layout.cols);
  const column = positionInShelf % layout.cols;
  return {
    x: layout.startX[shelfSide] + column * layout.pitchX,
    y: layout.rowBottoms[row] - layout.bookH,
    width: layout.bookW,
    height: layout.bookH,
  };
}

function getSpecialWordMatches() {
  // 책장에 보이는 문자만으로 특수 단어를 만들 수 있는지 확인합니다.
  const shelfLetters = [...collectedLetters].slice(0, getShelfCapacity());
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
  const bookColors = ["#f5b544", "#e87867", "#5799a6", "#8d79b8", "#78a66b"];
  const specialMatches = getSpecialWordMatches();
  // 빛이 살짝 숨 쉬듯 커졌다 작아지게 합니다.
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 350);

  [...collectedLetters].slice(0, getShelfCapacity()).forEach((letter, index) => {
    const { x, y, width, height } = getCollectedLetterSlot(index);

    ctx.fillStyle = bookColors[index % bookColors.length];
    ctx.fillRect(x, y, width, height);
    // 어두운 윤곽선: 갈색 책장 위에서도 책이 또렷하게 보이게 합니다.
    ctx.strokeStyle = "rgba(40, 22, 10, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, width - 1.5, height - 1.5);
    // 책등 느낌의 어두운 줄과 윗면 하이라이트입니다.
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(x, y, 4, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(x, y, width, 3);

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
      ctx.strokeRect(x - pad, y - pad, width + pad * 2, height + pad * 2);
      ctx.restore();
    });

    // 선택된 문자는 흰색 테두리로 표시합니다.
    if (selectedLetterIndexes.includes(index)) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
    }
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.strokeText(letter, x + width / 2, y + height - 12);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(letter, x + width / 2, y + height - 12);
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
  playSound(pointSound);
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

function drawPlayerFrame(frameIndex, x, y, width, height, flip = false) {
  // player.png 시트에서 frameIndex번째 칸만 잘라 그립니다. flip이 true이면 좌우를 뒤집습니다.
  const frameWidth = playerImage.naturalWidth / PLAYER_IMAGE_FRAME_COUNT;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (flip) {
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    ctx.drawImage(playerImage, frameIndex * frameWidth, 0, frameWidth, playerImage.naturalHeight, 0, 0, width, height);
  } else {
    ctx.drawImage(playerImage, frameIndex * frameWidth, 0, frameWidth, playerImage.naturalHeight, x, y, width, height);
  }
  ctx.restore();
}

function drawPlayer() {
  const { x, y, width, height } = player;

  // 바닥에 그림자를 깔아 점프 높이를 알기 쉽게 합니다.
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x + width / 2, groundY + height - 3, Math.max(18, width * 0.4), 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 방어막이 있을 때 플레이어 주위에 푸른 보호막을 표시합니다.
  if (hasShield) {
    ctx.save();
    ctx.strokeStyle = "#54d6ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, Math.max(34, width * 0.75), height * 0.75, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // A만 누르면 왼쪽, D만 누르면 오른쪽 옆모습, 그 외에는 앞모습을 보여 줍니다.
  const direction = keys.right && !keys.left ? "right" : keys.left && !keys.right ? "left" : "front";
  // 땅에서 걸을 때는 다리가 번갈아 움직이고, 공중에서는 첫 번째 걷기 모습으로 고정합니다.
  const walkStep = isOnGround ? Math.floor(performance.now() / 140) % 2 : 0;

  // 이미지가 불러와졌다면 player.png로 그립니다.
  if (isPlayerImageReady && playerImage.complete && playerImage.naturalWidth > 0) {
    if (direction === "front") {
      drawPlayerFrame(0, x, y, width, height);
    } else {
      const step = playerWalkFrames[direction][walkStep];
      drawPlayerFrame(step.frame, x, y, width, height, step.flip);
    }
    return;
  }

  // 안전장치: 이미지가 없거나 불러오지 못했을 때는 기존 도트 그림으로 그립니다.
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (direction === "front") {
    ctx.drawImage(studentFront, x, y, width, height);
  } else if (direction === "left") {
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    ctx.drawImage(studentSide[walkStep], 0, 0, width, height);
  } else {
    ctx.drawImage(studentSide[walkStep], x, y, width, height);
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
  if (isPlayerImageReady && playerImage.complete && playerImage.naturalWidth > 0) {
    const introWidth = Math.round(90 * player.width / player.height);
    drawPlayerFrame(0, canvas.width / 2 - introWidth / 2, 130, introWidth, 90);
  } else {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(studentFront, canvas.width / 2 - 37.5, 130, 75, 90);
    ctx.restore();
  }

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

function drawStartScreen(time) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";

  // 게임 제목
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px sans-serif";
  ctx.fillText("SpellCorrection", canvas.width / 2, 220);

  // 목표 한 줄
  ctx.fillStyle = "#ffe45e";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("최대한 많은 점수를 얻어라!", canvas.width / 2, 290);

  // 게임 설명
  ctx.fillStyle = "#d0d0d0";
  ctx.font = "18px sans-serif";
  ctx.fillText("특수 기호를 피해 문자를 모아 문자를 마우스로 선택하여 단어를 만드세요.", canvas.width / 2, 345);

  // 시작 안내(깜빡임)
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time / 400);
  ctx.fillStyle = "#ffffff";
  ctx.font = "16px sans-serif";
  ctx.fillText("아무 키나 눌러 시작", canvas.width / 2, 520);
  ctx.restore();
}

function drawMuteIndicator() {
  // 오른쪽 아래 구석에 현재 소리 상태를 작게 보여 줍니다.
  const label = isMuted ? "음소거 (M)" : "소리 켜짐 (M)";
  ctx.save();
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "right";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.strokeText(label, canvas.width - 10, canvas.height - 10);
  ctx.fillStyle = isMuted ? "#ff8a8a" : "#ffffff";
  ctx.fillText(label, canvas.width - 10, canvas.height - 10);
  ctx.restore();
}

function startGame() {
  gameState = "playing";
  // 난이도 시계는 실제로 게임이 시작되는 순간부터 잽니다.
  resetDifficulty();
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
  // 장애물이라면 현재 난이도의 등장 간격만큼 기다렸다가 다시 떨어집니다.
  if (object.kind === "obstacle") object.respawnAt = Date.now() + difficulty.respawnDelayMs;
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

function loadHighScore() {
  // 저장된 값을 Number()로 숫자로 바꿉니다. 없거나 숫자가 아니면 0입니다.
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch {
    // localStorage를 쓸 수 없는 환경이면 저장 없이 0으로 시작합니다.
    return 0;
  }
}

function saveHighScore() {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  } catch {
    // 저장에 실패해도 게임은 계속됩니다.
  }
}

function finishGame() {
  // 게임이 끝난 순간 딱 한 번 호출됩니다. 지금 점수가 더 높으면 최고 점수를 갱신하고 저장합니다.
  gameOver = true;
  if (score > highScore) {
    highScore = score;
    isNewRecord = true;
    saveHighScore();
  }
}

function applyDifficulty() {
  // 현재 단계(difficultyLevel)로 속도, 등장 간격, 개수를 계산합니다. 상한은 Math.min으로 막습니다.
  difficulty.speedMultiplier = Math.min(
    MAX_SPEED_MULTIPLIER,
    START_SPEED_MULTIPLIER + difficultyLevel * SPEED_MULTIPLIER_STEP,
  );
  difficulty.respawnDelayMs = START_RESPAWN_DELAY_MS
    - Math.min(difficultyLevel * RESPAWN_DELAY_STEP_MS, MAX_RESPAWN_DELAY_REDUCTION_MS);
  const targetObstacleCount = Math.min(
    MAX_OBSTACLE_COUNT,
    START_OBSTACLE_COUNT + Math.floor(difficultyLevel / LEVELS_PER_EXTRA_OBSTACLE),
  );
  while (obstacles.length < targetObstacleCount) addObstacle();
}

function updateDifficulty() {
  // 다음 상승 시점이 지났을 때만 한 단계 올리고, 시점을 10초 뒤로 미룹니다.
  const now = Date.now();
  let hasChanged = false;
  while (now >= nextDifficultyIncreaseAt) {
    difficultyLevel += 1;
    nextDifficultyIncreaseAt += DIFFICULTY_INTERVAL_MS;
    hasChanged = true;
  }
  if (hasChanged) applyDifficulty();
}

function resetDifficulty() {
  // 난이도, 시작 시각, 다음 상승 시점을 모두 처음으로 되돌립니다.
  difficultyLevel = 0;
  difficultyStartTime = Date.now();
  nextDifficultyIncreaseAt = difficultyStartTime + DIFFICULTY_INTERVAL_MS;
  applyDifficulty();
}

function isCollidingWithPlayer(obstacle) {
  // 장애물의 영역과 플레이어의 판정 영역이 겹치는지 확인합니다.
  const hitbox = getPlayerHitbox();
  return obstacle.x + 18 > hitbox.x
    && obstacle.x - 18 < hitbox.x + hitbox.width
    && obstacle.y + 8 > hitbox.y
    && obstacle.y - 36 < hitbox.y + hitbox.height;
}

function isLetterCollected(letter) {
  const hitbox = getPlayerHitbox();
  return letter.x + 18 > hitbox.x
    && letter.x - 18 < hitbox.x + hitbox.width
    && letter.y + 8 > hitbox.y
    && letter.y - 36 < hitbox.y + hitbox.height;
}

function restartGame() {
  remainingTime = 180;
  health = maxHealth;
  elapsedTime = 0;
  score = 0;
  collectedLetters = "";
  selectedLetterIndexes = [];
  wordMessage = "문자를 클릭하고 Enter로 단어를 확인하세요.";
  isCheckingWord = false;
  gameOver = false;
  isNewRecord = false;
  hasShield = false;
  player.x = initialPlayerPosition.x;
  player.y = groundY;
  verticalVelocity = 0;
  isOnGround = true;
  nextLetterIndex = 5;
  nextObstacleSymbolIndex = START_OBSTACLE_COUNT;

  letters.forEach((letter, index) => {
    letter.text = alphabet[index];
    letter.x = 35 + index * 150;
    letter.y = -40 - index * 80;
  });
  obstacles.splice(START_OBSTACLE_COUNT);
  obstacles.forEach((obstacle, index) => {
    obstacle.text = obstacleSymbols[index];
    obstacle.x = 150 + index * 240;
    obstacle.y = -100 - index * 150;
    obstacle.speedX = index < 2 ? (index === 0 ? 1.8 : -1.8) : 0;
    obstacle.speedY = 4 + index * 0.2;
    obstacle.respawnAt = 0;
  });
  // 난이도(단계, 시작 시각, 다음 상승 시점)도 처음으로 되돌립니다.
  resetDifficulty();
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

  // 시작 화면 동안에는 게임 시간과 물체가 움직이지 않습니다.
  if (gameState === "start") {
    lastFrameTime = currentTime;
    drawStartScreen(currentTime);
    drawMuteIndicator();
    requestAnimationFrame(gameLoop);
    return;
  }

  // 설명 화면 동안에는 게임 시간과 물체가 움직이지 않습니다.
  if (gameState === "intro") {
    lastFrameTime = currentTime;
    drawIntroScreen(currentTime);
    drawMuteIndicator();
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
    // Date.now() 기준으로 10초마다 난이도를 한 단계씩 올립니다.
    updateDifficulty();
  }
  lastFrameTime = currentTime;

  // 모든 글자의 위치를 아래쪽으로 갱신합니다.
  letters.forEach((letter) => {
    if (remainingTime > 0 && health > 0) letter.y += letter.speedY;
    if (letter.y > canvas.height + 40) resetFallingObject(letter);
    if (!gameOver && isLetterCollected(letter)) {
      collectedLetters += letter.text;
      score += 5;
      playSound(pointSound);
      resetFallingObject(letter);
    }
  });
  // 모든 장애물의 위치를 갱신하고 충돌을 확인합니다.
  obstacles.forEach((obstacle) => {
    // 다시 등장하기를 기다리는 중이면 움직이지 않습니다. (respawnAt이 없으면 비교가 false라 바로 움직입니다)
    const isWaiting = Date.now() < obstacle.respawnAt;
    // 현재 난이도의 속도 배율을 곱해 이동합니다. 가로 속도가 있으면 대각선으로 움직입니다.
    if (remainingTime > 0 && health > 0 && !isWaiting) {
      obstacle.y += obstacle.speedY * difficulty.speedMultiplier;
      obstacle.x += obstacle.speedX * difficulty.speedMultiplier;
    }
    // 좌우 벽에 닿으면 가로 이동 방향을 반대로 바꿉니다.
    if (obstacle.x <= 18 || obstacle.x >= canvas.width - 18) {
      obstacle.speedX *= -1;
    }
    if (obstacle.y > canvas.height + 40) resetFallingObject(obstacle);
    if (health > 0 && isCollidingWithPlayer(obstacle)) {
      // 충돌 효과음 (방어막으로 막은 충돌에도 재생됩니다)
      playSound(hitSound);
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
  // 최고 점수를 시간 아래에 작게 보여 줍니다.
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(`최고: ${highScore}`, canvas.width - 25, 60);
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
    ctx.fillRect(15, 95, 195, 115);
    ctx.strokeStyle = "#54d6ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 95, 195, 115);

    ctx.fillStyle = "#54d6ff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("[DEBUG INFO]", 23, 113);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`Player X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}`, 23, 131);
    ctx.fillText(`Obstacles: ${obstacles.length}`, 23, 149);
    ctx.fillText(`GameState: ${gameState}`, 23, 167);
    ctx.fillText(`Score: ${score}`, 23, 185);
    ctx.fillText(`Level: ${difficultyLevel}  Speed x${difficulty.speedMultiplier.toFixed(2)}`, 23, 203);
    ctx.restore();

    // showHitbox가 true일 때 플레이어와 장애물의 충돌 범위(히트박스)를 빨간 테두리로 표시
    if (showHitbox) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.85)";
      ctx.lineWidth = 2;

      // 이미지 전체 크기는 얇은 회색 선, 실제 충돌 판정 영역은 빨간 선으로 표시합니다.
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(player.x, player.y, player.width, player.height);
      ctx.restore();
      const hitbox = getPlayerHitbox();
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);

      // 장애물 히트박스 (isCollidingWithPlayer 판정 범위와 일치)
      obstacles.forEach((obstacle) => {
        ctx.strokeRect(obstacle.x - 18, obstacle.y - 36, 36, 44);
      });

      ctx.restore();
    }
  }

  if (remainingTime === 0 || health === 0) {
    // 게임 오버가 되는 첫 프레임에만 최고 점수를 확인합니다.
    if (!gameOver) finishGame();
    // 점수가 잘 읽히도록 어두운 판 위에 결과를 보여 줍니다.
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(240, 180, 320, 225);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\uAC8C\uC784 \uC885\uB8CC", canvas.width / 2, 225);
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(`최종 점수: ${score}`, canvas.width / 2, 263);
    ctx.fillText(`최고 점수: ${highScore}`, canvas.width / 2, 293);
    if (isNewRecord) {
      // 신기록이면 노란 문구가 살짝 깜빡입니다.
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(performance.now() / 200);
      ctx.fillStyle = "#ffe45e";
      ctx.fillText("신기록!", canvas.width / 2, 323);
      ctx.restore();
    }
    ctx.fillStyle = "#28616d";
    ctx.fillRect(285, 340, 230, 50);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("\uB2E4\uC2DC \uC2DC\uC791 (R)", canvas.width / 2, 373);
  }

  drawMuteIndicator();

  // 다음 화면을 그릴 때 게임 루프를 다시 실행합니다.
  requestAnimationFrame(gameLoop);
}


// ============================================================
// ⑥ 시동
// ============================================================

// 브라우저의 다음 화면 그리기 시점에 게임을 처음 시작합니다.
requestAnimationFrame(gameLoop);

// ------------------------------------------------------------
// 내장 이미지 데이터 (base64)
// player: 4칸(앞모습 / 오른쪽 걷기 2장 / 왼쪽) 가로 시트, 320 x 136 PNG
// background: 800 x 600 도서관 배경 WebP
// 이미지를 바꾸고 싶으면 PLAYER_IMAGE_SRC / BACKGROUND_IMAGE_SRC에 "파일이름.png" 같은 경로를 직접 넣어도 됩니다.
// ------------------------------------------------------------
function getEmbeddedImages() {
  return {
    player: "data:image/png;base64,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",
    background: "data:image/webp;base64,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",
  };
}