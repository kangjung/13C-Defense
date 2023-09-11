const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const subCtx = canvas.getContext("2d");

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};



const playerBodyImage = new Image();
playerBodyImage.src = "./asset/player-body.png";

const playerArmImage = new Image();
playerArmImage.src = "./asset/player-arm.png";

let player = { x: 400, y: 300, radius: 15, fireRate: 1000, speed: 0.7, crossroads: 150 }; // 플레이어 캐릭터
let experience = 0; // 초기 경험치
let requiredExperience = 100; // 레벨업에 필요한 초기 경험치
let playerLevel = 1; // 레벨
let lives = 20; // 초기 목숨 설정
let isGameOver = false;
let isPaused = false; // 게임 일시정지 상태 저장
let isGameStarted = false;
let waitForShoot = false;
const bodySpriteWidth = 32;
const bodySpriteHeight = 32;
let bodyCurrentFrame = 0;
let bodyCurrentTime = 0;
let bodyAnimationState = "standing";
let bodyAnimationDirection = "left";
let armAngle = 0; // 팔의 회전 각도
const experienceBarHeight = 10; // 경험치바 높이값

const allowedArea = {
  x: 215,
  y: 170,
  width: 475,
  height: 340,
};


const arrows = []; // 화살 배열
let maxArrows = 1; // 동시에 발사 가능한 최대 화살 수
let canShoot = true; // 화살 발사 가능한지 여부를 나타내는 변수
let currentArrows = 0; // 현재 발사된 화살 수
let lastArrowShotTime = 0; // 마지막 화살 발사 시간

// 적 캐릭터 이미지
const destination = { x: 200, y: 350, radius: 25 }; // 적 최종 도달지점
const enemies = []; // 적 배열
const spriteSheetArr = ["./asset/horse-run-Sheet.png", "./asset/infantry-Sheet.png"]
const frameWidth = 32; // 각 프레임의 너비
const frameHeight = 32; // 각 프레임의 높이
let frameCount = 3; // 총 프레임 갯수

let enemySpawnInterval = 5000;
let lastEnemySpawnTime = 0;

// 적 이동경로
const pathPoints = [
  { x: 50, y: 70 },
  { x: 300, y: 70 },
  { x: 770, y: 100 },
  { x: 770, y: 540 },
  { x: 150, y: 540 },
  { x: 130, y: 350 },
  { x: 300, y: 350 },
];
function init(){
  player = { x: 400, y: 300, radius: 15, fireRate: 1000, speed: 0.7, crossroads: 150 };
  experience = 0;
  requiredExperience = 100;
  playerLevel = 1;
  lives = 20;
  enemySpawnInterval = 5000;
  lastEnemySpawnTime = 0;
  arrows.pop();
  enemies.pop();
  maxArrows = 1; // 동시에 발사 가능한 최대 화살 수
  canShoot = true; // 화살 발사 가능한지 여부를 나타내는 변수
  currentArrows = 0; // 현재 발사된 화살 수
  lastArrowShotTime = 0; // 마지막 화살 발사 시간
}

canvas.addEventListener("click", function() {
  if (!isGameStarted) {
    startGame(); // 게임 시작 함수 호출
  }
  if (isGameOver) {
    reStartGame(); // 게임 시작 함수 호출
  }
});

window.addEventListener("keydown", function(event) {
  keys[event.key] = true;
});

window.addEventListener("keyup", function(event) {
  keys[event.key] = false;
});

// 플레이어 캐릭터 사거리 표시
function drawPlayerRange() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + player.crossroads, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 0, 255, 0.3)"; // 파란 투명한 선으로 사거리 원 테두리 그리기
  //ctx.strokeStyle.setLineDash([5,10]);
  ctx.lineWidth = 2;
  ctx.stroke();
}

// 적
class Enemy{
  constructor(x, y, speed, maxHealth) {
    this.x = x + 16;
    this.y = y + 16;
    this.speed = speed;
    this.pathIndex = 0; // 현재 경로 인덱스
    this.radius = 20; // 적의 반지름 설정
    this.health = maxHealth; // 최대 체력 설정
    this.maxHealth = maxHealth; // 최대 체력 저장
    this.currentFrame = 0;
    this.currentRow = 0; // 현재 애니메이션 행 초기화
    this.lastUpdateTime = 0; // 마지막 업데이트 시간 초기화
    this.frameRate = 10; // 프레임 전환 속도 조절 (낮을수록 느림)
    this.img = new Image();
    this.img.src = (speed > 1.5) ? spriteSheetArr[0] : spriteSheetArr[1];
  }

  takeDamage(damage){
    if (typeof this.health === 'number' && !isNaN(this.health)) {
      this.health -= damage;
      if (this.health <= 0) {
        this.destroy();
      }
    }
  }
  destroy(){
    const enemyIndex = enemies.indexOf(this);
    if (enemyIndex !== -1) {
      enemies.splice(enemyIndex, 1);
      experience += 10;
    }
  }
  draw(){
    const spriteX = this.currentFrame * frameWidth; // 스프라이트 시트 내의 x 좌표 계산
    const spriteY = this.currentRow  * frameHeight; // 스프라이트 시트 내의 y 좌표 계산
    ctx.save(); // 현재 캔버스 상태 저장

    if (this.direction === "down") {
      ctx.scale(-1, 1); // 이미지를 좌우로 뒤집기
      ctx.drawImage(
          this.img,
          spriteX,
          spriteY,
          frameWidth,
          frameHeight,
          -this.x - 32,
          this.y - 32,
          64,
          64
      );
    } else {
      ctx.drawImage(
          this.img,
          spriteX,
          spriteY,
          frameWidth,
          frameHeight,
          this.x - 32,
          this.y - 32,
          64,
          64
      );
    }
    ctx.restore(); // 이전 캔버스 상태로 복원
  }

  update() {
    const currentTime = new Date().getTime();
    const targetX = pathPoints[this.pathIndex].x;
    const targetY = pathPoints[this.pathIndex].y;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 현재 시간과 마지막 업데이트 시간의 차이 계산
    const deltaTime = currentTime - this.lastUpdateTime;

    // 프레임 전환 속도 조절을 위한 로직
    if (deltaTime >= 1000 / this.frameRate) {
      this.currentFrame++;
      if (this.currentFrame >= frameCount) {
        this.currentFrame = 0; // 다음 프레임으로 넘어갈 때 0으로 초기화
      }
      this.lastUpdateTime = currentTime;
    }

    // 현재 행 업데이트 로직 추가 (현재는 0으로 고정)
    this.currentRow = 0;

    if (distance > this.speed) {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    } else {
      this.pathIndex++;
      if (this.pathIndex >= pathPoints.length) {
        this.pathIndex = 0; // 경로 반복
      }

      // 특정 경로에서 이미지 뒤집기 처리
      if (this.pathIndex === 3 || this.pathIndex === 4) {
        this.direction = "down"; // 아래로 이동할 때 이미지 뒤집기
      } else {
        this.direction = "up"; // 위로 이동할 때 이미지 복원
      }
    }
  }
  drawHealthBar() {
    const barWidth = 30;
    const barHeight = 5;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.radius - 20;

    const healthPercentage = this.health / this.maxHealth;
    const filledWidth = barWidth * healthPercentage;

    ctx.fillStyle = "green"; // Color of the filled part of the health bar
    ctx.fillRect(barX, barY, filledWidth, barHeight);

    ctx.strokeStyle = "black"; // Color of the border of the health bar
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}
// 화살
class Arrow{
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    this.speed = 7;
    this.targetX = targetX;
    this.targetY = targetY;
    this.radius = 5; // 화살의 반지름 설정
    this.hit = false; // 초기에 화살이 맞았는지 여부를 나타내는 속성 추가
    this.distanceToPlayer = 0; // 플레이어와의 거리 초기화
    this.img = new Image();
    this.img.src = "./asset/arrow.png"
    this.angle = Math.atan2(targetY - y, targetX - x);
    this.rotateAngle = this.angle + Math.PI / 2;
  }
  update = function() {
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
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          const dx = this.x - enemy.x;
          const dy = this.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < enemy.radius) {
            enemy.takeDamage(1);
            this.hit = true;
            audio.hitSound.play();
            break;
          }
        }
      }
    }

    // 플레이어와 화살 사이의 거리 계산
    const playerDistanceX = this.x - player.x;
    const playerDistanceY = this.y - player.y;
    this.distanceToPlayer = Math.sqrt(playerDistanceX * playerDistanceX + playerDistanceY * playerDistanceY);

  };

  draw() {
    ctx.restore(); // 그래픽 상태 복구
    ctx.save(); // 현재 그래픽 상태 저장
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotateAngle);
    ctx.drawImage(this.img, -12 / 2, -32 / 2, 12, 32);
    ctx.rotate(-this.rotateAngle);
    ctx.translate(-this.x, -this.y);

    ctx.restore(); // 그래픽 상태 복구
    ctx.save(); // 현재 그래픽 상태 저장
  }
}

function shootArrow(playerX, playerY, targetX, targetY) {
  if (currentArrows < maxArrows) {
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= player.radius + player.crossroads) {
      const arrow = new Arrow(playerX, playerY, targetX, targetY);
      arrows.push(arrow);
      currentArrows++;
      audio.shootSound.play();
    }
  }
}

function updateArrows() {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const arrow = arrows[i];
    arrow.update();

    if (arrow.x > canvas.width || arrow.x < 0 || arrow.y > canvas.height || arrow.y < 0 || arrow.hit || arrow.distanceToPlayer > player.radius + player.crossroads) {
      arrows.splice(i, 1);
    }
  }
}
function shootArrows() {
  const currentTime = new Date().getTime();
  if (canShoot && currentTime - lastArrowShotTime >= player.fireRate) {
    if (waitForShoot) {
      const closestEnemy = findClosestEnemy();

      if (closestEnemy) {
        const dx = closestEnemy.x - player.x;
        const dy = closestEnemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= player.radius + player.crossroads) {
          shootArrow(player.x, player.y, closestEnemy.x, closestEnemy.y);
          currentArrows++;
          canShoot = false;
          lastArrowShotTime = currentTime;
          waitForShoot = false;
        }
      }
    }
  } else {
    if (currentTime - lastArrowShotTime >= player.fireRate) {
      canShoot = true; // 쿨타임이 끝나면 다시 화살 발사 가능
      currentArrows = 0;
    }
  }
}

function updatePlayer() {
  const currentTime = new Date().getTime();

  if (keys.ArrowUp && player.y > allowedArea.y) {
    player.y -= player.speed;
    bodyAnimationState = "moving";
  }
  if (keys.ArrowDown && player.y < allowedArea.y + allowedArea.height) {
    player.y += player.speed;
    bodyAnimationState = "moving";
  }
  if (keys.ArrowLeft && player.x > allowedArea.x) {
    player.x -= player.speed;
    bodyAnimationState = "moving";
    bodyAnimationDirection = "left";
  }
  if (keys.ArrowRight && player.x < (allowedArea.x + allowedArea.width)) {
    player.x += player.speed;
    bodyAnimationState = "moving";
    bodyAnimationDirection = "right";
  }

  if(!keys.ArrowUp && !keys.ArrowDown && !keys.ArrowRight && !keys.ArrowLeft) {
    bodyAnimationState = "standing";
  }

  const closestEnemy = findClosestEnemy();


  if (bodyAnimationState === "standing") {
    bodyCurrentFrame = 0;
  }

  armAngle += 1;

  const deltaTime = currentTime - bodyCurrentTime;
  const bodySourceX = bodyCurrentFrame * bodySpriteWidth;
  if (deltaTime >= 1000/10) {
    bodyCurrentFrame++;
    if (bodyCurrentFrame >= frameCount) {
      bodyCurrentFrame = 0; // 다음 프레임으로 넘어갈 때 0으로 초기화
    }
    bodyCurrentTime = currentTime;
  }
  ctx.save();
  if (bodyAnimationDirection == "left") {
    ctx.scale(-1, 1); // 이미지를 좌우로 뒤집기
    ctx.drawImage(
        playerBodyImage,
        bodySourceX, 0, bodySpriteWidth, bodySpriteHeight,
        - player.x - 32, player.y - 32, 64, 64
    );
  } else if(bodyAnimationDirection == "right"){
    ctx.drawImage(
        playerBodyImage,
        bodySourceX, 0, bodySpriteWidth, bodySpriteHeight,
        player.x - 32, player.y - 32, 64, 64
    );
  }

  ctx.restore();
  ctx.save();

  if (bodyAnimationDirection == "left") {
    ctx.translate(player.x, player.y - 5);
    if (closestEnemy) {
      const dx = closestEnemy.x - player.x;
      const dy = closestEnemy.y - player.y - 10;
      const angle = Math.atan2(dy, dx);
      ctx.rotate(angle);
    }
  } else {
    ctx.translate(player.x, player.y - 5);
    if (closestEnemy) {
      const dx = closestEnemy.x - player.x;
      const dy = closestEnemy.y - player.y - 10;
      const angle = Math.atan2(dy, dx);
      ctx.rotate(angle);
    }
  }
  ctx.drawImage(playerArmImage, -32, -32, 64, 64);
  ctx.restore();
  ctx.save();

  shootArrows();

}

function spawnEnemy() {
  if (isGameStarted && !isPaused) {
    const y = Math.random() * canvas.height; // Y 축 랜덤 위치
    const speed = 0.5 + Math.random() * 2; // 랜덤 속도
    const maxHealth = 1 + Math.floor(Math.random() * 3); // 최대 체력
    const enemy = new Enemy(0, y, speed, maxHealth);
    enemies.push(enemy);
  }
}
function updateEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    enemy.update();

    if (checkCollision(enemy)) {
      enemy.takeDamage(1);
    } else if (enemy.x > canvas.width) {
      enemy.takeDamage(enemy.health);
      decreaseLives();
      decreaseLives();
    }

    enemy.drawHealthBar();
    enemy.draw();
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
  audio.explosionSound.play();
  lives--;
  if (lives <= 0) {
    isGameOver = true;
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
  ctx.fillText("Enemy: " + enemies.length, canvas.width - 100, 30);

  // 현재 목숨 표시
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Life: " + lives, canvas.width - 100, 60);
}

function drawExperienceBar(x, y, currentExperience, requiredExperience) {
  const percentage = currentExperience / requiredExperience;
  const filledWidth = canvas.width * percentage;

  ctx.fillStyle = "lightgray";
  ctx.fillRect(x, y, canvas.width , experienceBarHeight);

  ctx.fillStyle = "blue";
  ctx.fillRect(x, y, filledWidth, experienceBarHeight);

  ctx.strokeStyle = "black";
  ctx.strokeRect(x, y, canvas.width , experienceBarHeight);
}
//레벨 표시
function drawPlayerLevel() {
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Level: " + playerLevel, 10, 30);
}




function updateGameArea() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (isGameStarted && !isGameOver) {
    drawHUD(); // HUD 그리기
    // drawPath();
    drawDestination(); // 목적지 그리기
    drawExperienceBar(0, 0, experience, requiredExperience); // 경험치 표시
    drawPlayerLevel(); // 플레이어 레벨 표시
    drawPlayerRange(); // 플레이어 사거리 표시
    if (!isPaused) {
      const currentTime = new Date().getTime();
      const deltaTime = currentTime - lastEnemySpawnTime;
      updateEnemies();
      updatePlayer(); // 플레이어 업데이트
      updateArrows(); // 화살 업데이트
      levelUp();
      if (deltaTime >= enemySpawnInterval) {
        this.spawnEnemy();
        lastEnemySpawnTime = currentTime;
        // 적 스폰 시간 점점 빠르게
        if (enemySpawnInterval > 500) {
          enemySpawnInterval -= 100;
        }
      }

      // 화살 발사 로직
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
        isGameOver = true;
      }
    }
    requestAnimationFrame(() => this.updateGameArea());
  } else if(isGameOver){
    // 게임 오버 상태일 때 게임 오버 메시지 표시
    ctx.fillStyle = "black";
    ctx.font = "24px Arial";
    ctx.fillText("Game Over", canvas.width / 2 - 60, canvas.height / 2);
  } else {
    // 게임 시작 화면 그리기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStartScreen();
  }

}

function drawStartScreen() {
  ctx.fillStyle = "black";
  ctx.font = "24px Arial";
  ctx.fillText("Welcome to the Game!", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "18px Arial";
  ctx.fillText("Click anywhere to start", canvas.width / 2, canvas.height / 2 + 20);
}

updateGameArea();

function startGame() {
  isGameStarted = true;
  isGameOver = false;
  isPaused = false;
  init();
  updateGameArea();
}
function reStartGame() {
  isGameStarted = false;
  isGameOver = false;
  isPaused = false;
  init();
  updateGameArea();
}
const levelUpCanvas = document.getElementById("levelUpCanvas");
const levelUpCtx = levelUpCanvas.getContext("2d");
function levelUpKeyDown(event) {
  if (isPaused) {
    const key = event.key;
    if (key === "1" || key === "2" || key === "3") {
      isPaused = false; // 게임 다시 시작
      canvas.style.display = "block";
      levelUpCanvas.style.display = "none";
      window.removeEventListener("keydown", levelUpKeyDown);

      // 레벨업 능력치 증가 처리
      if (key === "1") {
        player.speed += 0.2; // 플레이어 속도 증가
      } else if (key === "2") {
        player.fireRate -= 100; // 화살 발사 간격 감소 (빨라짐)
      } else if (key === "3") {
        player.crossroads += 50; // 플레이어 사거리 증가
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

const cardWidth = 200;
const cardHeight = 300;
const cardSpacing = 20;
const cards = [
  { title: "CARD", description: "Increased. . movement. . speed", stats: "speed" },
  { title: "CARD", description: "Reduce. . arrow firing. . interval", stats: "fireRate" },
  { title: "CARD", description: "increase. . shooting range", stats: "crossroads" },
  { title: "CARD", description: "Increased. . glottal stamina", stats: "hp" }
];

function drawCard(x, y, card) {
  console.log("x:"+x + "/y:"+ y + "/ card:"+card.description)
  levelUpCtx.fillStyle = "#ccc";
  levelUpCtx.fillRect(x, y, cardWidth, cardHeight);

  // 텍스트가 카드 경계 내에서만 렌더링되도록 클리핑
  levelUpCtx.save();
  levelUpCtx.beginPath();
  levelUpCtx.rect(x, y, cardWidth, cardHeight);
  levelUpCtx.clip();
  levelUpCtx.fillStyle = "#000";
  levelUpCtx.font = "25px Arial"; // 폰트 크기 조정
  levelUpCtx.fillText(card.title, x + 10, y + 50);


  levelUpCtx.fillStyle = "#000";
  levelUpCtx.font = "25px Arial"; // 폰트 크기 조정
  levelUpCtx.fillText(card.title, x + 10, y + 50);
  // 텍스트를 여러 줄로 분할
  const lines = card.description.split('. ');
  for (let i = 0; i < lines.length; i++) {
    levelUpCtx.fillText(lines[i], x + 10, y + 150 + i * 20);
  }

  levelUpCtx.restore();
}

function showLevelUpUI() {
  isPaused = true;
  canvas.style.display = "none";
  levelUpCanvas.style.display = "block";
  let cardSize = 3;
  let cardX = 3;
  for (let i = 0; i < cardSize; i++) {
    cardX--;
    drawCard(canvas.width / 2 - (cardX * (200 + cardSpacing)) + 120, canvas.height / 3, cards[i]);

  }
  window.addEventListener("keydown", levelUpKeyDown);
}


function randomNum () {
  let n = Math.floor(Math.random() * cards.length) + 1;

  if (keyEvent.length < 3 && keyEvent.indexOf(n) < 0) {
    keyEvent.push(n);
    return randomNum();
  }
}

const audio = {
  hitSound: new Audio("./asset/hit.mp3"),
  explosionSound: new Audio("./asset/explosion.mp3"),
  shootSound: new Audio("./asset/shoot.mp3"),
};




let isMuted = false;
const muteButton = document.getElementById("muteButton");
muteButton.addEventListener("click", toggleMute);

function toggleMute() {
  isMuted = !isMuted;

  // 모든 오디오 요소를 음소거 상태에 따라 제어
  for (const key in audio) {
    if (audio.hasOwnProperty(key)) {
      const sound = audio[key];
      sound.muted = isMuted;
    }
  }

  muteButton.textContent = isMuted ? "SOUND" : "SOUND MUTE";
}

toggleMute();