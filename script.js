const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

//이동경로
const pathPoints = [
  { x: 100, y: 100 },
  { x: 300, y: 100 },
  { x: 700, y: 100 },
  { x: 700, y: 500 },
  { x: 200, y: 500 },
  { x: 200, y: 200 },
  { x: 600, y: 200 },
  { x: 600, y: 350 },
  { x: 499, y: 350 },
];

let lives = 3; // 초기 목숨 설정
const enemies = []; // 적 배열

const destination = { x: 500, y: 350, radius: 25 };

function updateGameArea() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawPath();
  drawDestination(); // 목적지 그리기
  updateEnemies();
  drawHUD(); // HUD 그리기

  if (lives <= 0) {
    gameOver();
  }
}

function drawDestination() {
  ctx.fillStyle = "green";
  ctx.beginPath();
  ctx.arc(destination.x, destination.y, destination.radius, 0, Math.PI * 2);
  ctx.fill();
}

function checkCollision(enemy) {
  const dx = enemy.x - destination.x;
  const dy = enemy.y - destination.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < destination.radius) {
    decreaseLives(); // 목적지에 도달한 적 처리
    return true;
  }
  return false;
}


function Enemy(x, y, speed) {
  this.x = x;
  this.y = y;
  this.speed = speed;
  this.pathIndex = 0; // 현재 경로 인덱스
}

Enemy.prototype.update = function() {
  const targetX = pathPoints[this.pathIndex].x;
  const targetY = pathPoints[this.pathIndex].y;

  const dx = targetX - this.x;
  const dy = targetY - this.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > this.speed) {
    this.x += (dx / distance) * this.speed;
    this.y += (dy / distance) * this.speed;
  } else {
    this.pathIndex++;
    if (this.pathIndex >= pathPoints.length) {
      this.pathIndex = 0; // 경로 반복
    }
  }
}

function spawnEnemy() {
  const y = Math.random() * canvas.height; // Y 축 랜덤 위치
  const speed = 1 + Math.random() * 2; // 랜덤 속도
  const enemy = new Enemy(0, y, speed);
  enemies.push(enemy);
}

function updateEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    enemies[i].update();

    ctx.fillStyle = "red";
    ctx.fillRect(enemies[i].x, enemies[i].y, 20, 20);

    if (checkCollision(enemies[i])) {
      enemies.splice(i, 1);
      i--;
    } else if (enemies[i].x > canvas.width) {
      enemies.splice(i, 1);
      i--;
      decreaseLives();
    }
  }
}

function decreaseLives() {
  lives--;
  if (lives <= 0) {
    // 게임 오버 로직 추가
    alert("GAME OVER")
  }
}

function drawPath() {
  ctx.strokeStyle = "gray";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  for (let i = 1; i < pathPoints.length; i++) {
    ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
  }
  ctx.stroke();
}

function drawHUD() {
  // 현재 적 수 표시
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Enemies: " + enemies.length, canvas.width - 100, 30);

  // 현재 목숨 표시
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Lives: " + lives, canvas.width - 100, 60);
}

setInterval(spawnEnemy, 2000); // 2초마다 적 생성

// 주기적으로 게임 화면을 업데이트하는 함수를 호출합니다.
setInterval(updateGameArea, 20);
