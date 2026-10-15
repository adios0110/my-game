// 캔버스와 2D 그림 도구를 가져옵니다.
const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

// ===== 나중에 바꾸기 쉬운 위치·크기 설정 =====
const LIBRARY = {
  door: { x: 300, y: 105, width: 200, height: 330 },
  leftShelf: { x: 20, y: 90, width: 225, height: 390 },
  rightShelf: { x: 555, y: 90, width: 225, height: 390 },
  floorY: 430,
  archCenter: { x: 400, y: 125, radius: 215 },
};
const PLAYER = { x: 340, y: 430, pixel: 8, width: 120, height: 120 };
const SCORE = { x: 25, y: 38, fontSize: 20, value: 0 };
const TIMER = { x: 695, y: 35, radius: 15, seconds: 60, fontSize: 18 };
const TITLE = { x: 400, y: 42, fontSize: 25 };
const LETTERS = [
  { text: "S", x: 265, y: 180, size: 36 },
  { text: "P", x: 345, y: 245, size: 36 },
  { text: "E", x: 535, y: 190, size: 36 },
  { text: "L", x: 590, y: 310, size: 36 },
];
const OBSTACLES = [
  { text: "!", x: 270, y: 305, size: 40 },
  { text: "#", x: 470, y: 140, size: 36 },
  { text: "%", x: 525, y: 355, size: 36 },
];
const DUST = [
  { x: 85, y: 170, radius: 3 }, { x: 155, y: 360, radius: 5 },
  { x: 215, y: 250, radius: 2 }, { x: 280, y: 405, radius: 4 },
  { x: 335, y: 150, radius: 3 }, { x: 465, y: 235, radius: 3 },
  { x: 510, y: 370, radius: 5 }, { x: 635, y: 175, radius: 2 },
  { x: 720, y: 330, radius: 4 }, { x: 755, y: 470, radius: 3 },
];

// 방 전체를 보랏빛이 감도는 어두운 색으로 채웁니다.
const wallGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
wallGradient.addColorStop(0, "#151536");
wallGradient.addColorStop(0.7, "#2d214c");
wallGradient.addColorStop(1, "#4a3159");
ctx.fillStyle = wallGradient;
ctx.fillRect(0, 0, canvas.width, canvas.height);

// 천장의 커다란 아치와 금빛 장식선을 그립니다.
ctx.strokeStyle = "#6f547d";
ctx.lineWidth = 22;
ctx.beginPath();
ctx.arc(LIBRARY.archCenter.x, LIBRARY.archCenter.y, LIBRARY.archCenter.radius, Math.PI, 0);
ctx.stroke();
ctx.strokeStyle = "#b38a82";
ctx.lineWidth = 3;
ctx.beginPath();
ctx.arc(LIBRARY.archCenter.x, LIBRARY.archCenter.y, LIBRARY.archCenter.radius, Math.PI, 0);
ctx.stroke();

// 중앙 문 뒤에서 퍼지는 따뜻한 빛을 그립니다.
const glow = ctx.createRadialGradient(400, 245, 20, 400, 245, 250);
glow.addColorStop(0, "rgba(255, 245, 213, 0.95)");
glow.addColorStop(0.35, "rgba(238, 179, 187, 0.45)");
glow.addColorStop(1, "rgba(238, 179, 187, 0)");
ctx.fillStyle = glow;
ctx.fillRect(170, 55, 460, 430);

// 중앙의 아치형 문을 그리는 함수를 만듭니다.
function drawDoor() {
  const { x, y, width, height } = LIBRARY.door; // 문 설정값을 짧은 이름으로 가져옵니다.
  ctx.fillStyle = "#85566d"; // 문의 기본 보랏빛 색을 설정합니다.
  ctx.fillRect(x, y + 52, width, height - 52); // 문의 네모난 아래 부분을 그립니다.
  ctx.beginPath(); // 문의 둥근 윗부분을 위한 경로를 시작합니다.
  ctx.arc(x + width / 2, y + 52, width / 2, Math.PI, 0); // 반원 모양의 문 윗부분을 만듭니다.
  ctx.lineTo(x + width, y + 70); // 문 오른쪽으로 경로를 잇습니다.
  ctx.lineTo(x, y + 70); // 문 왼쪽으로 경로를 닫습니다.
  ctx.fill(); // 둥근 문 윗부분을 채웁니다.
  ctx.strokeStyle = "#d7a799"; // 문의 금빛 테두리 색을 설정합니다.
  ctx.lineWidth = 4; // 문의 테두리 두께를 설정합니다.
  ctx.strokeRect(x + 10, y + 75, width - 20, height - 90); // 문의 사각 테두리를 그립니다.
  ctx.beginPath(); // 문의 아치 테두리를 위한 경로를 시작합니다.
  ctx.arc(x + width / 2, y + 52, width / 2 - 10, Math.PI, 0); // 문 윗부분의 테두리 곡선을 만듭니다.
  ctx.stroke(); // 문 윗부분의 테두리를 그립니다.
  ctx.fillStyle = "#fff8db"; // 문 중앙 빛의 색을 설정합니다.
  ctx.fillRect(x + width / 2 - 9, y + 8, 18, height - 18); // 문틈으로 들어오는 세로 빛을 그립니다.
  ctx.fillStyle = "#edced1"; // 창문 빛의 연한 분홍색을 설정합니다.
  ctx.fillRect(x + 22, y + 55, width - 44, 25); // 문의 윗 창문 부분을 그립니다.
}

// 중앙의 빛나는 문을 화면에 그립니다.
drawDoor();

// 이전 장식 위를 학교 도서관의 벽과 천장으로 덮어 실제 학교 공간을 만듭니다.
const schoolWall = ctx.createLinearGradient(0, 0, 0, LIBRARY.floorY);
schoolWall.addColorStop(0, "#fffaf0");
schoolWall.addColorStop(0.6, "#f3ead7");
schoolWall.addColorStop(1, "#dacbad");
ctx.fillStyle = schoolWall;
ctx.fillRect(0, 0, canvas.width, LIBRARY.floorY);

// 평평한 천장과 길쭉한 형광등을 그립니다.
ctx.fillStyle = "#f7f1e3";
ctx.fillRect(0, 0, canvas.width, 72);
ctx.strokeStyle = "#d0bea0";
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(0, 72);
ctx.lineTo(canvas.width, 72);
ctx.stroke();
ctx.fillStyle = "#fffdf4";
ctx.fillRect(190, 28, 150, 10);
ctx.fillRect(460, 28, 150, 10);

// 뒤쪽 벽의 큰 창문과 창틀을 그립니다.
ctx.fillStyle = "#fffdf4";
ctx.fillRect(285, 94, 230, 210);
ctx.fillStyle = "#d8edf0";
ctx.fillRect(295, 104, 210, 190);
ctx.strokeStyle = "#a89171";
ctx.lineWidth = 10;
ctx.strokeRect(285, 94, 230, 210);
ctx.lineWidth = 5;
ctx.beginPath();
ctx.moveTo(400, 99);
ctx.lineTo(400, 299);
ctx.moveTo(290, 198);
ctx.lineTo(510, 198);
ctx.stroke();

// 창문으로 들어오는 부드러운 낮빛을 바닥 쪽에 더합니다.
const windowLight = ctx.createLinearGradient(400, 290, 400, LIBRARY.floorY);
windowLight.addColorStop(0, "rgba(255, 250, 224, 0.85)");
windowLight.addColorStop(1, "rgba(255, 250, 224, 0)");
ctx.fillStyle = windowLight;
ctx.fillRect(250, 285, 300, 150);

// 창문 아래의 낮은 수납장과 도서관 안내 게시판을 그립니다.
ctx.fillStyle = "#bfae91";
ctx.fillRect(270, 318, 260, 70);
ctx.fillStyle = "#897860";
ctx.fillRect(280, 328, 240, 50);
ctx.fillStyle = "#f7e8b6";
ctx.fillRect(365, 336, 70, 32);
ctx.fillStyle = "#718da0";
ctx.fillRect(374, 343, 52, 5);
ctx.fillRect(374, 353, 38, 5);

// 책장을 그리는 함수를 만듭니다.
function drawBookshelf(shelf) {
  ctx.fillStyle = "#d4c7af"; // 책장 안쪽의 밝은 나무색을 설정합니다.
  ctx.fillRect(shelf.x, shelf.y, shelf.width, shelf.height); // 책장 전체 바탕을 그립니다.
  ctx.strokeStyle = "#9f8c70"; // 책장 테두리의 나무색을 설정합니다.
  ctx.lineWidth = 7; // 책장 테두리 두께를 설정합니다.
  ctx.strokeRect(shelf.x, shelf.y, shelf.width, shelf.height); // 책장 외곽선을 그립니다.
  for (let row = 0; row < 5; row += 1) {
    const shelfY = shelf.y + 65 + row * 65; // 현재 선반의 y좌표를 계산합니다.
    ctx.fillStyle = "#ae9c7e"; // 가로 선반의 색을 설정합니다.
    ctx.fillRect(shelf.x, shelfY, shelf.width, 10); // 가로 선반 하나를 그립니다.
    for (let column = 0; column < 9; column += 1) {
      const bookX = shelf.x + 14 + column * 23; // 현재 책의 x좌표를 계산합니다.
      const bookY = shelfY - 50; // 현재 책의 y좌표를 계산합니다.
      const bookColors = ["#91a8bd", "#b2c5bf", "#d8a9a1", "#d4be81", "#9f9bc2"]; // 책 표지 색 목록입니다.
      ctx.fillStyle = bookColors[(row + column) % bookColors.length]; // 순서대로 책 색을 고릅니다.
      ctx.fillRect(bookX, bookY, 16, 46); // 책 한 권을 그립니다.
      ctx.fillStyle = "rgba(255, 230, 170, 0.45)"; // 책등 장식선의 색을 설정합니다.
      ctx.fillRect(bookX + 3, bookY + 7, 10, 2); // 책등의 작은 장식선을 그립니다.
    }
  }
}

// 좌우에 깊은 서가를 그립니다.
drawBookshelf(LIBRARY.leftShelf);
drawRightWindows();

// 오른쪽 창가의 큰 창문을 그리는 함수를 만듭니다.
function drawRightWindows() {
  const windowX = 565; // 오른쪽 창문이 시작하는 x좌표입니다.
  const windowY = 88; // 오른쪽 창문의 y좌표입니다.
  const windowWidth = 215; // 오른쪽 창문의 전체 가로 길이입니다.
  const windowHeight = 315; // 오른쪽 창문의 전체 세로 길이입니다.
  ctx.fillStyle = "#d8edf0"; // 창문 너머의 밝은 하늘색을 설정합니다.
  ctx.fillRect(windowX, windowY, windowWidth, windowHeight); // 큰 창문 유리를 그립니다.
  ctx.strokeStyle = "#987e60"; // 창틀의 갈색을 설정합니다.
  ctx.lineWidth = 7; // 창틀 선의 두께를 설정합니다.
  ctx.strokeRect(windowX, windowY, windowWidth, windowHeight); // 창문의 바깥 테두리를 그립니다.
  ctx.lineWidth = 4; // 창틀 안쪽 선의 두께를 설정합니다.
  for (let x = windowX + 54; x < windowX + windowWidth; x += 54) {
    ctx.beginPath(); // 세로 창틀을 위한 경로를 시작합니다.
    ctx.moveTo(x, windowY); // 창틀 선의 시작점을 지정합니다.
    ctx.lineTo(x, windowY + windowHeight); // 창틀 선의 끝점을 지정합니다.
    ctx.stroke(); // 세로 창틀을 그립니다.
  }
  ctx.beginPath(); // 가로 창틀을 위한 경로를 시작합니다.
  ctx.moveTo(windowX, windowY + 105); // 가로 창틀의 시작점을 지정합니다.
  ctx.lineTo(windowX + windowWidth, windowY + 105); // 가로 창틀의 끝점을 지정합니다.
  ctx.moveTo(windowX, windowY + 210); // 두 번째 가로 창틀의 시작점을 지정합니다.
  ctx.lineTo(windowX + windowWidth, windowY + 210); // 두 번째 가로 창틀의 끝점을 지정합니다.
  ctx.stroke(); // 가로 창틀을 그립니다.
}

// 바닥을 보랏빛 타일로 채웁니다.
ctx.fillStyle = "#f0eadc";
ctx.fillRect(0, LIBRARY.floorY, canvas.width, canvas.height - LIBRARY.floorY);

// 열람용 책상 두 개와 의자를 그립니다.
ctx.fillStyle = "#c8a77b";
ctx.fillRect(70, 448, 180, 18);
ctx.fillRect(550, 448, 180, 18);
ctx.fillStyle = "#8f704f";
ctx.fillRect(88, 466, 12, 50);
ctx.fillRect(220, 466, 12, 50);
ctx.fillRect(568, 466, 12, 50);
ctx.fillRect(700, 466, 12, 50);
ctx.fillStyle = "#aeb8ba";
ctx.fillRect(115, 490, 55, 28);
ctx.fillRect(630, 490, 55, 28);

// 바닥의 원근감 있는 타일 선을 그립니다.
ctx.strokeStyle = "#d4c6b2";
ctx.lineWidth = 2;
for (let x = -80; x <= canvas.width + 80; x += 120) {
  ctx.beginPath();
  ctx.moveTo(400, LIBRARY.floorY);
  ctx.lineTo(x, canvas.height);
  ctx.stroke();
}
for (let y = LIBRARY.floorY + 35; y < canvas.height; y += 42) {
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(canvas.width, y);
  ctx.stroke();
}

// 공기 중에 떠 있는 빛먼지를 그립니다.
DUST.forEach((particle) => {
  ctx.fillStyle = "rgba(255, 245, 215, 0.6)"; // 빛먼지의 반투명한 색을 설정합니다.
  ctx.beginPath(); // 원형 빛먼지를 위한 경로를 시작합니다.
  ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2); // 작은 원을 만듭니다.
  ctx.fill(); // 빛먼지 원을 채웁니다.
});

// 게임 제목을 화면 위 가운데에 그립니다.
ctx.fillStyle = "#1b1919";
ctx.font = `bold ${TITLE.fontSize}px sans-serif`;
ctx.textAlign = "center";
ctx.fillText("스펠 컬렉션", TITLE.x, TITLE.y);

// 왼쪽 위에 현재 점수를 표시합니다.
ctx.fillStyle = "#181816";
ctx.font = `bold ${SCORE.fontSize}px sans-serif`;
ctx.textAlign = "left";
ctx.fillText(`점수: ${SCORE.value}`, SCORE.x, SCORE.y);

// 오른쪽 위에 시계 테두리와 시곗바늘을 그립니다.
ctx.strokeStyle = "#71aec0";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(TIMER.x, TIMER.y, TIMER.radius, 0, Math.PI * 2);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(TIMER.x, TIMER.y);
ctx.lineTo(TIMER.x, TIMER.y - 9);
ctx.moveTo(TIMER.x, TIMER.y);
ctx.lineTo(TIMER.x + 7, TIMER.y + 5);
ctx.stroke();

// 시계 오른쪽에 남은 시간을 표시합니다.
ctx.fillStyle = "#1a1818";
ctx.font = `bold ${TIMER.fontSize}px sans-serif`;
ctx.textAlign = "left";
ctx.fillText(`${TIMER.seconds}초`, TIMER.x + TIMER.radius + 10, TIMER.y + 6);

// 수집할 글자를 검은 테두리와 흰 글씨로 그립니다.
LETTERS.forEach((letter) => {
  ctx.font = `bold ${letter.size}px sans-serif`; // 글자마다 설정한 크기의 굵은 글꼴을 적용합니다.
  ctx.textAlign = "center"; // 글자의 x좌표를 가운데 기준으로 설정합니다.
  ctx.lineWidth = 5; // 글자 테두리 두께를 설정합니다.
  ctx.strokeStyle = "#141022"; // 글자 테두리를 짙은 보라색으로 설정합니다.
  ctx.strokeText(letter.text, letter.x, letter.y); // 글자의 어두운 외곽선을 그립니다.
  ctx.fillStyle = "#ffffff"; // 글자 내부 색을 흰색으로 설정합니다.
  ctx.fillText(letter.text, letter.x, letter.y); // 글자 내부를 그립니다.
});

// 피해야 할 빨간 특수기호 장애물을 그립니다.
OBSTACLES.forEach((obstacle) => {
  ctx.fillStyle = "#ff5e6b"; // 장애물 색을 선명한 빨간색으로 설정합니다.
  ctx.font = `bold ${obstacle.size}px sans-serif`; // 장애물마다 설정한 크기의 굵은 글꼴을 적용합니다.
  ctx.textAlign = "center"; // 장애물의 x좌표를 가운데 기준으로 설정합니다.
  ctx.fillText(obstacle.text, obstacle.x, obstacle.y); // 특수기호 장애물을 그립니다.
});

// 120×120 치비 학생 도트의 기준 위치와 한 칸 크기를 가져옵니다.
const px = PLAYER.pixel;
const playerX = PLAYER.x;
const playerY = PLAYER.y;

// 검은 머리카락의 바깥 실루엣을 그립니다.
ctx.fillStyle = "#202131";
ctx.fillRect(playerX + 2 * px, playerY, 11 * px, 2 * px);
ctx.fillRect(playerX + px, playerY + 2 * px, 13 * px, 4 * px);
ctx.fillRect(playerX, playerY + 4 * px, 15 * px, 4 * px);

// 밝은 피부색으로 둥근 얼굴과 귀를 그립니다.
ctx.fillStyle = "#ffd1bd";
ctx.fillRect(playerX + 2 * px, playerY + 4 * px, 11 * px, 5 * px);
ctx.fillRect(playerX + px, playerY + 5 * px, px, 2 * px);
ctx.fillRect(playerX + 14 * px, playerY + 5 * px, px, 2 * px);

// 앞머리로 얼굴 윗부분을 자연스럽게 덮습니다.
ctx.fillStyle = "#202131";
ctx.fillRect(playerX + 2 * px, playerY + 2 * px, 10 * px, 2 * px);
ctx.fillRect(playerX + 2 * px, playerY + 4 * px, 4 * px, px);
ctx.fillRect(playerX + 9 * px, playerY + 4 * px, 4 * px, px);

// 커다란 검은 안경 테두리와 안경다리를 그립니다.
ctx.fillStyle = "#121521";
ctx.fillRect(playerX + 2 * px, playerY + 5 * px, 4 * px, 3 * px);
ctx.fillRect(playerX + 9 * px, playerY + 5 * px, 4 * px, 3 * px);
ctx.fillRect(playerX + 6 * px, playerY + 6 * px, 3 * px, px);
ctx.fillRect(playerX + px, playerY + 6 * px, px, px);
ctx.fillRect(playerX + 14 * px, playerY + 6 * px, px, px);

// 안경 안의 짙은 초록 눈과 하이라이트를 그립니다.
ctx.fillStyle = "#46605c";
ctx.fillRect(playerX + 3 * px, playerY + 6 * px, 2 * px, px);
ctx.fillRect(playerX + 10 * px, playerY + 6 * px, 2 * px, px);
ctx.fillStyle = "#d9fff3";
ctx.fillRect(playerX + 4 * px, playerY + 6 * px, px, px);
ctx.fillRect(playerX + 11 * px, playerY + 6 * px, px, px);

// 볼터치와 작은 입으로 표정을 그립니다.
ctx.fillStyle = "#f18f9b";
ctx.fillRect(playerX + 2 * px, playerY + 8 * px, 2 * px, px);
ctx.fillRect(playerX + 11 * px, playerY + 8 * px, 2 * px, px);
ctx.fillStyle = "#b85664";
ctx.fillRect(playerX + 7 * px, playerY + 8 * px, px, px);

// 청록색 교복 재킷과 팔을 그립니다.
ctx.fillStyle = "#28616d";
ctx.fillRect(playerX + 3 * px, playerY + 9 * px, 9 * px, 4 * px);
ctx.fillRect(playerX + px, playerY + 10 * px, 2 * px, 4 * px);
ctx.fillRect(playerX + 12 * px, playerY + 10 * px, 2 * px, 4 * px);

// 흰 셔츠 깃과 빨간 넥타이를 그립니다.
ctx.fillStyle = "#f4f3f2";
ctx.fillRect(playerX + 6 * px, playerY + 9 * px, 3 * px, 3 * px);
ctx.fillStyle = "#bf4d59";
ctx.fillRect(playerX + 7 * px, playerY + 10 * px, px, 3 * px);

// 회색 바지와 검은 신발을 그립니다.
ctx.fillStyle = "#4c4d58";
ctx.fillRect(playerX + 4 * px, playerY + 13 * px, 3 * px, px);
ctx.fillRect(playerX + 9 * px, playerY + 13 * px, 3 * px, px);
ctx.fillStyle = "#1b1a24";
ctx.fillRect(playerX + 3 * px, playerY + 14 * px, 4 * px, px);
ctx.fillRect(playerX + 9 * px, playerY + 14 * px, 4 * px, px);

// 화면 아래에 조작 안내 문구를 표시합니다.
ctx.fillStyle = "#fff5df";
ctx.font = "16px sans-serif";
ctx.textAlign = "center";
ctx.fillText("방향키로 학생을 움직여 글자를 모으세요!", canvas.width / 2, 580);
