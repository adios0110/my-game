// HTML에서 게임 캔버스를 찾아옵니다.
const canvas = document.querySelector("#game");

// 캔버스에 그림을 그릴 2D 도구를 가져옵니다.
const ctx = canvas.getContext("2d");

// 플레이어의 위치와 크기입니다.
const player = { x: 385, y: 0, width: 45, height: 53 };
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

function drawBackground() {
  // 배경 전체를 밝은 벽 색으로 채웁니다.
  ctx.fillStyle = "#f3ead7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 가운데 창문과 좌우 책장을 그립니다.
  ctx.fillStyle = "#d8edf0";
  ctx.fillRect(285, 95, 230, 215);
  ctx.strokeStyle = "#a89171";
  ctx.lineWidth = 10;
  ctx.strokeRect(285, 95, 230, 215);
  ctx.fillStyle = "#d4c7af";
  ctx.fillRect(20, 90, 210, 360);
  ctx.fillRect(570, 90, 210, 360);
  ctx.fillStyle = "#ae9c7e";
  for (let y = 150; y < 450; y += 60) {
    ctx.fillRect(20, y, 210, 8);
    ctx.fillRect(570, y, 210, 8);
  }
  ctx.fillStyle = "#f0eadc";
  ctx.fillRect(0, 430, canvas.width, 170);
}

function getCollectedLetterSlot(index) {
  const shelfSide = Math.floor(index / 25);
  const positionInShelf = index % 25;
  const row = Math.floor(positionInShelf / 5);
  const column = positionInShelf % 5;
  const shelfX = shelfSide === 0 ? 20 : 570;
  return { x: shelfX + 18 + column * 37, y: 108 + row * 60 };
}

function drawCollectedLettersOnShelves() {
  // 획득 순서대로 왼쪽 책장을 먼저 채우고, 다음에는 오른쪽 책장을 채웁니다.
  const bookColors = ["#f5b544", "#e87867", "#5799a6", "#8d79b8", "#78a66b"];
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
    // 선택된 문자는 흰색 테두리로 표시합니다.
    if (selectedLetterIndexes.includes(index)) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, shelfY - 44, 34, 44);
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(letter, x + 15, shelfY - 14);
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

function drawPlayer() {
  // 작은 플레이어 위치와, 원본 도트 그림의 기준 너비를 가져옵니다.
  const { x, y } = player;
  const drawingWidth = 90;

  // 방어막이 있을 때 플레이어 주위에 푸른 보호막을 표시합니다.
  if (hasShield) {
    ctx.save();
    ctx.strokeStyle = "#54d6ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x + player.width / 2, y + player.height / 2, 34, 40, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 원본 학생 도트를 1/3 크기로 줄여 플레이어 위치에 배치합니다.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 / 2, 1 / 2);
  ctx.translate(-x, -y);

  // 머리, 얼굴, 안경, 교복, 다리 순서로 안경 쓴 학생을 그립니다.
  ctx.fillStyle = "#202131";
  ctx.fillRect(x + 10, y, drawingWidth - 20, 35);
  ctx.fillStyle = "#ffd1bd";
  ctx.fillRect(x + 15, y + 25, drawingWidth - 30, 40);
  ctx.fillStyle = "#121521";
  ctx.fillRect(x + 18, y + 38, 22, 15);
  ctx.fillRect(x + 50, y + 38, 22, 15);
  ctx.fillRect(x + 40, y + 43, 10, 5);
  ctx.fillStyle = "#28616d";
  ctx.fillRect(x + 18, y + 65, drawingWidth - 36, 30);
  ctx.fillStyle = "#4c4d58";
  ctx.fillRect(x + 25, y + 95, 18, 10);
  ctx.fillRect(x + 47, y + 95, 18, 10);
  ctx.restore();
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

document.addEventListener("keydown", (event) => {
  preventGameKeyScroll(event);

  if (event.key === "r" || event.key === "R") {
    restartGame();
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

canvas.addEventListener("click", (event) => {
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

function formatTime(seconds) {
  // 전체 초를 분 단위 숫자로 바꿉니다.
  const minutes = Math.floor(seconds / 60);
  // 남은 초를 두 자리 문자열로 바꿉니다.
  const secondsText = Math.ceil(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secondsText}`;
}

function gameLoop(currentTime) {
  // 지우기
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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
        score -= 30;
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

// 브라우저의 다음 화면 그리기 시점에 게임을 처음 시작합니다.
requestAnimationFrame(gameLoop);
