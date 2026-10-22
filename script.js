// HTML에서 게임 캔버스를 찾아옵니다.
const canvas = document.querySelector("#game");

// 캔버스에 그림을 그릴 2D 도구를 가져옵니다.
const ctx = canvas.getContext("2d");

// 플레이어의 위치와 크기입니다. 키보드 조작은 아직 넣지 않습니다.
const player = { x: 385, y: 525, width: 45, height: 53 };

// 게임 시간과 체력입니다.
let remainingTime = 180;
let health = 3;
let elapsedTime = 0;
let lastFrameTime = null;
let nextObstacleIncreaseAt = 15;

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
const obstacleSymbols = "!@#$%^&*";
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

function drawPlayer() {
  // 작은 플레이어 위치와, 원본 도트 그림의 기준 너비를 가져옵니다.
  const { x, y } = player;
  const drawingWidth = 90;

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
  ctx.font = "bold 36px sans-serif";
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
      // 충돌하면 체력을 하나 줄이고 장애물을 위로 되돌립니다.
      health -= 1;
      resetFallingObject(obstacle);
    }
  });

  // 그리기
  drawBackground();
  drawBackground();
  ctx.fillStyle = "#1b1919";
  ctx.font = "bold 25px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\uC2A4\uD3A0 \uCEE4\uB809\uC158", canvas.width / 2, 42);
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("\uC810\uC218: 0", 25, 38);
  ctx.textAlign = "right";
  ctx.fillText(`\uC2DC\uAC04: ${formatTime(remainingTime)}`, canvas.width - 25, 38);
  ctx.fillStyle = "#e84d5b";
  ctx.font = "bold 25px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("\u2665".repeat(health) + "\u2661".repeat(3 - health), 25, 70);
  // 글자, 장애물, 플레이어 순서로 화면에 그립니다.
  letters.forEach(drawLetter);
  obstacles.forEach(drawObstacle);
  drawPlayer();

  if (remainingTime === 0 || health === 0) {
    // 시간이 끝났거나 체력이 없으면 게임 종료 문구를 표시합니다.
    ctx.fillStyle = "#1b1919";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\uAC8C\uC784 \uC885\uB8CC", canvas.width / 2, canvas.height / 2);
  }

  // 다음 화면을 그릴 때 게임 루프를 다시 실행합니다.
  requestAnimationFrame(gameLoop);
}

// 브라우저의 다음 화면 그리기 시점에 게임을 처음 시작합니다.
requestAnimationFrame(gameLoop);
