const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

const enemies = []; // 적 배열
const arrows = []; // 화살 배열
const player = { x: 400, y: 300, radius: 15, fireRate: 1000 }; // 플레이어 캐릭터
let playerSpeed = 0.7; // 플레이어 이동 속도
const destination = { x: 350, y: 350, radius: 25 }; // 적 최종 도달지점
let crossroads = 100;
let experience = 0; // 초기 경험치
let requiredExperience = 100; // 레벨업에 필요한 초기 경험치
let playerLevel = 1; // 레벨
let canShoot = true; // 화살 발사 가능한지 여부를 나타내는 변수
let lastArrowShotTime = 0; // 마지막 화살 발사 시간
let lives = 100; // 초기 목숨 설정
let maxArrows = 1; // 동시에 발사 가능한 최대 화살 수
let currentArrows = 0; // 현재 발사된 화살 수
let isPaused = false; // 게임 일시정지 상태 저장
let isGameStarted = false;

canvas.addEventListener("click", function() {
  if (!isGameStarted) {
    isGameStarted = true;
    startGame(); // 게임 시작 함수 호출
  }
});

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
  ctx.arc(player.x, player.y, player.radius + crossroads, 0, Math.PI * 2);
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
  this.hit = false; // 초기에 화살이 맞았는지 여부를 나타내는 속성 추가
  this.distanceToPlayer = 0; // 플레이어와의 거리 초기화
}
function updateArrows() {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const arrow = arrows[i];
    arrow.update();

    // 화살이 화면 바깥으로 나간 경우 또는 화살이 삭제되어야 하는 경우
    if (arrow.x > canvas.width || arrow.x < 0 || arrow.y > canvas.height || arrow.y < 0 || arrow.hit || arrow.distanceToPlayer > player.radius + crossroads) {
      arrows.splice(i, 1);
    }
  }
}

function shootArrow(playerX, playerY, targetX, targetY) {
  if (currentArrows < maxArrows) {
    const arrow = new Arrow(playerX, playerY, targetX, targetY);
    arrows.push(arrow);
    currentArrows++;
  }
}
Arrow.prototype.update = function() {
  const dx = this.targetX - this.x;
  const dy = this.targetY - this.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (!this.hit) {
    if (distance > this.speed) {
      const vx = dx / distance;
      const vy = dy / distance;

      this.x += vx * this.speed;
      this.y += vy * this.speed;
    } else {
      this.hit = true; // 화살이 적에게 도달하여 맞았음을 표시
      this.handleHit(); // 충돌 처리 함수 호출
    }
  }

  // 플레이어와 화살 사이의 거리 계산
  const playerDistanceX = this.x - player.x;
  const playerDistanceY = this.y - player.y;
  this.distanceToPlayer = Math.sqrt(playerDistanceX * playerDistanceX + playerDistanceY * playerDistanceY);

  // 화살 그리기는 업데이트와 독립적으로 항상 실행
  this.draw();
};

Arrow.prototype.handleHit = function() {
  // 화살이 적에게 맞았을 때의 처리를 여기에 추가
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    const dx = this.x - enemy.x;
    const dy = this.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < enemy.radius) {
      enemy.takeDamage(1); // 적에게 데미지 입히기
      this.hit = true; // 화살이 적에게 도달하여 맞았음을 표시
      break; // 한 번에 하나의 적에게만 데미지를 입히도록 처리
    }
  }
};

Enemy.prototype.takeDamage = function(damage) {
  if (typeof this.health === 'number' && !isNaN(this.health)) {
    this.health -= damage;

    console.log( "health " + this.health + "  damage " + damage);
    if (this.health <= 0) {
      this.destroy();
    }
  }
};

Enemy.prototype.destroy = function() {
  const enemyIndex = enemies.indexOf(this);
  if (enemyIndex !== -1) {
    enemies.splice(enemyIndex, 1);
    experience += 10;
  }
};

Arrow.prototype.draw = function() {
  ctx.fillStyle = "blue";
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
  ctx.fill();
}
function shootArrows() {
  const currentTime = new Date().getTime();

  if (canShoot) {
    const closestEnemy = findClosestEnemy();
    if (closestEnemy && currentTime - lastArrowShotTime >= player.fireRate && currentArrows < maxArrows) {
      const dx = closestEnemy.x - player.x;
      const dy = closestEnemy.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= player.radius + crossroads) {
        shootArrow(player.x, player.y, closestEnemy.x, closestEnemy.y);
        currentArrows++;
        canShoot = false;
        lastArrowShotTime = currentTime;
      }
    }
  } else {
    if (currentTime - lastArrowShotTime >= player.fireRate) {
      canShoot = true;
      currentArrows = 0;
    }
  }
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

  // 플레이어와 가장 가까운 적 찾기
  const closestEnemy = findClosestEnemy();

  // 화살 발사 간격 확인하여 화살 발사
  if (closestEnemy && currentTime - lastArrowShotTime >= player.fireRate && currentArrows < maxArrows) {
    shootArrow(player.x, player.y, closestEnemy.x, closestEnemy.y);
    lastArrowShotTime = currentTime;
  }

  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();


  // 화살 발사 로직 호출
  shootArrows();
}

//적 관련
function Enemy(x, y, speed, maxHealth) {
  this.x = x;
  this.y = y;
  this.speed = speed;
  this.pathIndex = 0; // 현재 경로 인덱스
  this.radius = 20; // 적의 반지름 설정
  this.health = maxHealth; // 최대 체력 설정
  this.maxHealth = maxHealth; // 최대 체력 저장
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
};

function spawnEnemy() {
  if (isGameStarted) {
    const y = Math.random() * canvas.height; // Y 축 랜덤 위치
    const speed = 1 + Math.random() * 2; // 랜덤 속도
    const maxHealth = 1 + Math.floor(Math.random() * 3); // 최대 체력
    const enemy = new Enemy(0, y, speed, maxHealth);
    enemies.push(enemy);
  }
}
Enemy.prototype.drawHealthBar = function() {
  const barWidth = 30;
  const barHeight = 5;
  const barX = this.x - barWidth / 2;
  const barY = this.y - this.radius - 10;

  const healthPercentage = this.health / this.maxHealth;
  const filledWidth = barWidth * healthPercentage;

  ctx.fillStyle = "green"; // Color of the filled part of the health bar
  ctx.fillRect(barX, barY, filledWidth, barHeight);

  ctx.strokeStyle = "black"; // Color of the border of the health bar
  ctx.strokeRect(barX, barY, barWidth, barHeight);
};
function updateEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    enemy.update();

    ctx.fillStyle = "red";
    ctx.fillRect(enemy.x, enemy.y, 20, 20);

    if (checkCollision(enemy)) {
      enemy.takeDamage(1); // Enemy takes damage
    } else if (enemy.x > canvas.width) {
      enemy.takeDamage(enemy.health); // Enemy's health drops to zero
      decreaseLives();
    }

    // Draw the health bar for the enemy
    enemy.drawHealthBar();
  }
}

function findClosestEnemy() {
  let closestDistance = Infinity;
  let closestEnemy = null;

  for (const enemy of enemies) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestEnemy = enemy;
    }
  }

  return closestEnemy;
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
    alert("GAME OVER");
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
const experienceBarWidth = 200;
const experienceBarHeight = 10;

function drawExperienceBar(x, y, currentExperience, requiredExperience) {
  const percentage = currentExperience / requiredExperience;

  ctx.fillStyle = "lightgray";
  ctx.fillRect(x, y, experienceBarWidth, experienceBarHeight);

  ctx.fillStyle = "blue";
  const filledWidth = experienceBarWidth * percentage;
  ctx.fillRect(x, y, filledWidth, experienceBarHeight);

  ctx.strokeStyle = "black";
  ctx.strokeRect(x, y, experienceBarWidth, experienceBarHeight);
}
//레벨 표시
function drawPlayerLevel() {
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Level: " + playerLevel, 400, 30);
}
setInterval(spawnEnemy, 2000); // 2초마다 적 생성

// 주기적으로 게임 화면을 업데이트하는 함수를 호출합니다.
updateGameArea();

function updateGameArea() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawHUD(); // HUD 그리기
  drawPath();
  drawDestination(); // 목적지 그리기

  if (isGameStarted) {
    if (!isPaused) {

      updateEnemies();
      updatePlayer(); // 플레이어 업데이트
      updateArrows(); // 화살 업데이트
      drawExperienceBar(400, 50, experience, requiredExperience); // 경험치 표시
      drawPlayerLevel(); // 플레이어 레벨 표시
      drawPlayerRange(); // 플레이어 사거리 표시

      // 레벨업 확인 및 업데이트
      levelUp();

      // 화살 발사 로직
      const currentTime = new Date().getTime();

      if (canShoot && currentTime - lastArrowShotTime >= player.fireRate) {
        const closestEnemy = findClosestEnemy();
        if (closestEnemy) {
          shootArrow(player.x, player.y, closestEnemy.x, closestEnemy.y);
          lastArrowShotTime = currentTime;
        }
      }

  // 최대 화살 발사 갯수인 `maxArrows`를 관리하는 부분은 화살을 발사할 때 마다 체크하는 것으로 충분합니다.
      canShoot = currentArrows < maxArrows;


      // 화살 업데이트
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
    }
  } else {
    // 게임 시작 화면 그리기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStartScreen();
  }
  requestAnimationFrame(updateGameArea);
}

function drawStartScreen() {
  ctx.fillStyle = "black";
  ctx.font = "24px Arial";
  ctx.fillText("Welcome to the Game!", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "18px Arial";
  ctx.fillText("Click anywhere to start", canvas.width / 2, canvas.height / 2 + 20);
}

function startGame() {
  
}

const levelUpCanvas = document.getElementById("levelUpCanvas");
const levelUpCtx = levelUpCanvas.getContext("2d");

function levelUpKeyDown(event) {
  if (isPaused) {
    const key = event.key;
    if (key === "1" || key === "2" || key === "3") {
      isPaused = false; // 게임 다시 시작
      levelUpCanvas.style.display = "none";
      window.removeEventListener("keydown", levelUpKeyDown);

      // 레벨업 능력치 증가 처리
      if (key === "1") {
        playerSpeed += 0.2; // 플레이어 속도 증가
      } else if (key === "2") {
        player.fireRate -= 100; // 화살 발사 간격 감소 (빨라짐)
      } else if (key === "3") {
        crossroads += 10; // 플레이어 사거리 증가
      }
      // 게임 재개
      isPaused = false; // 게임 다시 시작
    }
  }
}

function levelUp() {
  if (experience >= requiredExperience) {
    experience -= requiredExperience;
    playerLevel++;
    requiredExperience += 50; // 레벨업할 때마다 필요 경험치가 두 배로 증가
    showLevelUpUI(); // 레벨업 UI 표시
  }
}

function showLevelUpUI() {
  isPaused = true; // 게임 일시정지
  levelUpCanvas.style.display = "block";
  levelUpCtx.clearRect(0, 0, levelUpCanvas.width, levelUpCanvas.height);

  // UI 그리기
  levelUpCtx.fillStyle = "white";
  levelUpCtx.fillRect(0, 0, levelUpCanvas.width, levelUpCanvas.height);

  levelUpCtx.fillStyle = "black";
  levelUpCtx.font = "15px Arial";
  levelUpCtx.fillText("Level Up! Choose an ability to increase:", 20, 40);
  levelUpCtx.fillText("1. Increase player speed", 40, 80);
  levelUpCtx.fillText("2. Increase fire rate", 40, 120);
  levelUpCtx.fillText("3. Increase player range", 40, 160);
  window.addEventListener("keydown", levelUpKeyDown);
}