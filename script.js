// 이 페이지는 현재 정적인 자기소개 페이지입니다.
// 이름, 한 줄 소개, 게임 목록은 index.html에서 바로 수정할 수 있습니다.

const todayDate = document.querySelector("#today-date");
const today = new Date();

todayDate.textContent = `오늘은 ${today.toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
})}입니다.`;
