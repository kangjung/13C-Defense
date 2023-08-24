const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const keys = {}; // 키보드 입력을 저장하는 객체
const enemies = []; // 적 배열
const arrows = []; // 화살 배열
const player = { x: 400, y: 300, radius: 15, fireRate: 1000 }; // 플레이어 캐릭터
const playerSpeed = 0.5; // 플레이어 이동 속도
const destination = { x: 350, y: 350, radius: 25 }; // 적 최종 도달지점
let experience = 0; // 초기 경험치
let lastArrowShotTime = 0;
let lives = 100; // 초기 목숨 설정

// 적 이동경로
const pathPoints = [
  { x: 100, y: 100 },
  { x: 300, y: 100 },
  { x: 700, y: 100 },
  { x: 700, y: 500 },
  { x: 200, y: 500 },
  { x: 200, y: 350 },
  { x: 350, y: 350 },
];

window.addEventListener("keydown", function(event) {
  keys[event.key] = true;
});

window.addEventListener("keyup", function(event) {
  keys[event.key] = false;
});

// 플레이어 캐릭터 사거리 표시
function drawPlayerRange() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + 100, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 0, 255, 0.3)"; // 파란 투명한 선으로 사거리 원 테두리 그리기
  ctx.lineWidth = 2;
  ctx.stroke();
}

function Arrow(x, y, targetX, targetY) {
  this.x = x;
  this.y = y;
  this.speed = 5;
  this.targetX = targetX;
  this.targetY = targetY;

  this.radius = 5; // 화살의 반지름 설정
}
function updateArrows() {
  for (let i = 0; i < arrows.length; i++) {
    const arrow = arrows[i];
    arrow.update();
    arrow.draw();

    // 화살과 적의 충돌 체크
    for (let j = 0; j < enemies.length; j++) {
      const enemy = enemies[j];
      const dx = arrow.x - enemy.x;
      const dy = arrow.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      console.log("distance  " + distance + "    arrow.radius " + arrow.radius + " enemy.radius  " + enemy.radius);
      if (distance < arrow.radius + enemy.radius) {
        arrow.hit = true; // 화살이 적에게 맞았음을 표시
        arrows.splice(i, 1); // 화살 제거
        i--;

        enemies.splice(j, 1); // 적 제거
        j--;
      }
    }

    if (arrow.x > canvas.width || arrow.x < 0 || arrow.y > canvas.height || arrow.y < 0 ||
        (arrow.hit && !arrow.targetX && !arrow.targetY)) {
      // 화살이 화면 바깥으로 나가거나, 충돌 후 targetX와 targetY가 없는 경우 화살 제거
      arrows.splice(i, 1);
      i--;
    }
  }
}
function shootArrow(playerX, playerY, targetX, targetY) {
  const arrow = new Arrow(playerX, playerY, targetX, targetY);
  arrows.push(arrow);
}

Arrow.prototype.update = function() {
  // 화살 이동 로직
  const dx = this.targetX - this.x;
  const dy = this.targetY - this.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (this.hit) {
    // 화살이 이미 적에게 맞았음을 표시
    this.x += (dx / distance) * this.speed;
    this.y += (dy / distance) * this.speed;
  } else {
    if (distance < 10) {
      // 화살과 적이 충돌한 경우 처리
      // 적 제거, 경험치 증가 등의 처리
      this.hit = true; // 화살이 이미 적에게 맞았음을 표시
    } else {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    }
  }
}
Arrow.prototype.draw = function() {
  ctx.fillStyle = "blue";
  ctx.fillRect(this.x, this.y, 10, 10);
}

function updatePlayer() {
  const currentTime = new Date().getTime();
  // 화살표 키보드 입력에 따라 플레이어 위치 업데이트
  if (keys.ArrowUp) {
    player.y -= playerSpeed;
  }
  if (keys.ArrowDown) {
    player.y += playerSpeed;
  }
  if (keys.ArrowLeft) {
    player.x -= playerSpeed;
  }
  if (keys.ArrowRight) {
    player.x += playerSpeed;
  }

  // 화면 경계에서 벗어나지 않도록 제한
  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

  if (currentTime - lastArrowShotTime >= player.fireRate) {
    lastArrowShotTime = currentTime;

    for (const enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < player.radius + 100) { // 일정 범위 내의 적에게 화살 발사
        shootArrow(player.x, player.y, enemy.x, enemy.y);
      }
    }
  }

  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
}

//적 관련
function Enemy(x, y, speed) {
  this.x = x;
  this.y = y;
  this.speed = speed;
  this.pathIndex = 0; // 현재 경로 인덱스
  this.radius = 20; // 적의 반지름 설정
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

function decreaseLives() {
  lives--;
  if (lives <= 0) {
    // 게임 오버 로직 추가
    alert("GAME OVER")
  }
}

//적 이동길 표시
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
// 적 최종 도달 지점
function drawDestination() {
  ctx.fillStyle = "green";
  ctx.beginPath();
  ctx.arc(destination.x, destination.y, destination.radius, 0, Math.PI * 2);
  ctx.fill();
}
//UI 표시
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
//경험치 그리기
function drawExperience() {
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Experience: " + experience, 400, 60);
}
//레벨 표시
function drawPlayerLevel() {
  const level = Math.floor(experience / 100) + 1;
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Level: " + level, 400, 30);
}

setInterval(spawnEnemy, 2000); // 2초마다 적 생성

// 주기적으로 게임 화면을 업데이트하는 함수를 호출합니다.
updateGameArea();
//setInterval(updateGameArea, 20);

function updateGameArea() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawPath();
  drawDestination(); // 목적지 그리기
  updateEnemies();
  drawHUD(); // HUD 그리기

  updatePlayer(); // 플레이어 업데이트
  updateArrows(); // 화살 업데이트
  drawExperience(); // 경험치 표시
  drawPlayerLevel(); // 플레이어 레벨 표시
  updatePlayer(); // 플레이어 업데이트
  drawPlayerRange(); // 플레이어 사거리 표시

  for (let i = 0; i < arrows.length; i++) {
    arrows[i].update();
    arrows[i].draw();

    if (arrows[i].x > canvas.width) {
      arrows.splice(i, 1);
      i--;
    }
  }

  if (lives <= 0) {
    console.log("GAME OVER");
  }
  requestAnimationFrame(updateGameArea);
}
