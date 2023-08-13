const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 게임 요소 초기화
const player = {
  x: canvas.width / 2,
  y: canvas.height - 50,
  radius: 20,
  color: 'blue'
};

// 플레이어 움직임 관리
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') {
    player.x -= 10;
  } else if (event.key === 'ArrowRight') {
    player.x += 10;
  }
});

// 게임 루프
function gameLoop() {
  // 캔버스 초기화
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 플레이어 그리기
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = player.color;
  ctx.fill();
  ctx.closePath();

  requestAnimationFrame(gameLoop);
}

gameLoop();