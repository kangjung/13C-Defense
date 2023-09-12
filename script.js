const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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

let player = { x: 400, y: 300, radius: 15, fireRate: 1000, speed: 0.9, crossroads: 150, damage: 1 };
let experience = 0;
let requiredExperience = 100;
let playerLevel = 1;
let lives = 10;
let isGameOver = false;
let isPaused = false;
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
  player = { x: 400, y: 300, radius: 15, fireRate: 1000, speed:0.9, crossroads: 150, damage: 1 };
  experience = 0;
  requiredExperience = 100;
  playerLevel = 1;
  lives = 10;
  enemySpawnInterval = 5000;
  lastEnemySpawnTime = 0;
  arrows.length = 0;
  enemies.length = 0;
  maxArrows = 1;
  canShoot = true;
  currentArrows = 0;
  lastArrowShotTime = 0;
}

canvas.addEventListener("click", function() {
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
  ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
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

    ctx.fillStyle = "green";
    ctx.fillRect(barX, barY, filledWidth, barHeight);

    ctx.strokeStyle = "black";
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}
class Arrow{
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    this.speed = 7;
    this.targetX = targetX;
    this.targetY = targetY;
    this.radius = 5;
    this.hit = false;
    this.distanceToPlayer = 0;
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
            enemy.takeDamage(player.damage);
            this.hit = true;
            audio.hitSound.play();
            break;
          }
        }
      }
    }
    const playerDistanceX = this.x - player.x;
    const playerDistanceY = this.y - player.y;
    this.distanceToPlayer = Math.sqrt(playerDistanceX * playerDistanceX + playerDistanceY * playerDistanceY);
  };
  draw() {
    ctx.restore();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotateAngle);
    ctx.drawImage(this.img, -12 / 2, -32 / 2, 12, 32);
    ctx.rotate(-this.rotateAngle);
    ctx.translate(-this.x, -this.y);

    ctx.restore();
    ctx.save();
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
  canShoot = currentArrows < maxArrows;
  if (canShoot && currentTime - lastArrowShotTime >= player.fireRate) {
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
  } else {
    if (currentTime - lastArrowShotTime >= player.fireRate) {
      canShoot = true;
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
      bodyCurrentFrame = 0;
    }
    bodyCurrentTime = currentTime;
  }
  ctx.save();
  if (bodyAnimationDirection === "left") {
    ctx.scale(-1, 1);
    ctx.drawImage(
        playerBodyImage,
        bodySourceX, 0, bodySpriteWidth, bodySpriteHeight,
        - player.x - 32, player.y - 32, 64, 64
    );
  } else if(bodyAnimationDirection === "right"){
    ctx.drawImage(
        playerBodyImage,
        bodySourceX, 0, bodySpriteWidth, bodySpriteHeight,
        player.x - 32, player.y - 32, 64, 64
    );
  }

  ctx.restore();
  ctx.save();

  if (bodyAnimationDirection === "left") {
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
    let speed = 0.5;
    let maxHealth = 1;
    if(enemySpawnInterval <= 2000) {
      speed = speed + Math.random() * 2;
      maxHealth += Math.floor(Math.random() * 3);
    } else if(enemySpawnInterval <= 3000) {
      speed = speed + Math.random() * 1.2;
      maxHealth += Math.floor(Math.random() * 3);
    } else if (enemySpawnInterval <= 4500) {
      speed = speed + Math.random() * 0.8;
      maxHealth += Math.floor(Math.random() * 2);
    } else {
      speed = speed + (Math.random() * 0.5);
    }
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

function drawDestination() {
  ctx.fillStyle = "green";
  ctx.beginPath();
  ctx.arc(destination.x, destination.y, 0, 0, Math.PI * 2);
  ctx.fill();
}
//UI 표시
function drawHUD() {
  // 현재 적 수 표시
  ctx.fillStyle = "green";
  ctx.font = "18px Arial";
  ctx.fillText("Enemy: " + enemies.length, allowedArea.width/2, allowedArea.y + 200);

  // 현재 목숨 표시
  ctx.fillStyle = "green";
  ctx.font = "18px Arial";
  ctx.fillText("Life: " + lives, allowedArea.width/2, allowedArea.y + 230);

  ctx.fillStyle = "rgba(0, 0, 255, 0.3)";
  ctx.fillStyle = "green";
  ctx.font = "25px Arial";
  ctx.fillText("MOVE : keyboard Arrow Key", allowedArea.width/2, allowedArea.y + 100);
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
function drawPlayerLevel() {
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Level: " + playerLevel, 10, 30);
}
function updateGameArea() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (isGameStarted && !isGameOver) {
    drawHUD();
    drawDestination();
    drawExperienceBar(0, 0, experience, requiredExperience);
    drawPlayerLevel();
    drawPlayerRange();
    if (!isPaused) {
      const currentTime = new Date().getTime();
      const deltaTime = currentTime - lastEnemySpawnTime;
      updateEnemies();
      updatePlayer();
      updateArrows();
      if (deltaTime >= enemySpawnInterval) {
        this.spawnEnemy();
        lastEnemySpawnTime = currentTime;
        if (enemySpawnInterval > 500) {
          enemySpawnInterval -= 50;
        }
      }

      for (let i = 0; i < arrows.length; i++) {
        arrows[i].update();
        arrows[i].draw();

        if (arrows[i].x > canvas.width) {
          arrows.splice(i, 1);
          i--;
        }
      }

      if (lives <= 0) {
        isGameOver = true;
      } else {
        levelUp();
      }
    }
    requestAnimationFrame(() => this.updateGameArea());
  } else if(isGameOver){
    ctx.fillStyle = "black";
    ctx.font = "50px Arial";
    ctx.fillText("Game Over", canvas.width / 2 - 60, canvas.height / 2);
    ctx.font = "40px Arial";
    ctx.fillText("Click anywhere to Restart", canvas.width / 2 - 150, (canvas.height / 2)+ 80);
  } else {
    drawStartScreen();
  }

}
const startCanvas = document.getElementById("startCanvas");
const startCtx = startCanvas.getContext("2d");
function drawStartScreen() {
  canvas.style.display = "none";
  startCanvas.style.display = "block";
  startCtx.fillStyle = "black";
  startCtx.font = "120px Arial";
  startCtx.fillText("13C Defense", 50, 180);
  startCtx.font = "40px Arial";
  startCtx.fillText("Click anywhere to start", 260, 530);
}
startCanvas.addEventListener("click", function() {
  if (!isGameStarted) {
    startGame(); // 게임 시작 함수 호출
  }
});

updateGameArea();

function startGame() {
  isGameStarted = true;
  isGameOver = false;
  isPaused = false;
  canvas.style.display = "block";
  startCanvas.style.display = "none";
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
let cards = [
  { title: "Speed", description: "Increased. . movement. . speed", stats: "speed" },
  { title: "FireRate", description: "Reduce. . arrow firing. . interval", stats: "fireRate" },
  { title: "Range", description: "Increase. . shooting range", stats: "crossroads" },
  { title: "Life", description: "Increased. . glottal stamina", stats: "hp" },
  { title: "Damage", description: "Increased. . damage", stats: "damage" }
];
function levelUpKeyDown(event) {
  if (isPaused) {
    const key = event.key;
    if (key === "1" || key === "2" || key === "3") {
      let card = cards[levelCards[key-1]];
      canvas.style.display = "block";
      levelUpCanvas.style.display = "none";
      window.removeEventListener("keydown", levelUpKeyDown);
      console.log(card);
      // 레벨업 능력치 증가 처리
      if (card.stats === "speed") {
        player.speed += 0.2; // 플레이어 속도 증가
      } else if (card.stats === "fireRate") {
        player.fireRate -= 100; // 화살 발사 간격 감소 (빨라짐)
      } else if (card.stats === "crossroads") {
        player.crossroads += 50; // 플레이어 사거리 증가
      } else if(card.stats === "hp"){
        lives += 10;
      }else if(card.stats === "maxArrows"){
        maxArrows++;
      }else if(card.stats === "damage"){
        player.damage += 0.5;
      }

      isPaused = false; // 게임 다시 시작
    }
  }
}
function drawCard(x, y, card, idx) {
  levelUpCtx.fillStyle = "#ccc";
  levelUpCtx.fillRect(x, y, cardWidth, cardHeight);
  levelUpCtx.save();
  levelUpCtx.beginPath();
  levelUpCtx.rect(x, y, cardWidth, cardHeight);
  levelUpCtx.clip();
  levelUpCtx.fillStyle = "#000";

  levelUpCtx.lineWidth = 5;

  levelUpCtx.stroke();
  levelUpCtx.fillStyle = "#000";
  levelUpCtx.font = "25px Arial"; // 폰트 크기 조정
  levelUpCtx.fillText((idx+ " . "+ card.title), x + 10, y + 50);
  // 텍스트를 여러 줄로 분할
  const lines = card.description.split('. ');
  for (let i = 0; i < lines.length; i++) {
    levelUpCtx.fillText(lines[i], x + 10, y + 150 + i * 20);
  }

  levelUpCtx.restore();
}

function showLevelUpUI() {
  getLevelCards();
  isPaused = true;
  canvas.style.display = "none";
  levelUpCanvas.style.display = "block";
  levelUpCtx.fillStyle = "#000";
  levelUpCtx.font = "90px Arial"; // 폰트 크기 조정
  levelUpCtx.fillText("Level UP", 200, 110);
  levelUpCtx.font = "25px Arial"; // 폰트 크기 조정
  levelUpCtx.fillText("Select and press one of the number keys ", 180, 160);
  levelUpCtx.fillText("1, 2, or 3 depending on the desired ability.", 180, 190);

  let cardSize = 3;
  let cardX = 3;
  for (let i = 0; i < cardSize; i++) {
    cardX--;
    drawCard(canvas.width / 2 - (cardX * (200 + cardSpacing)) + 120, canvas.height / 3 + 50, cards[levelCards[i]], i+1);

  }
  window.addEventListener("keydown", levelUpKeyDown);
}

let levelCards = [];

function getLevelCards(){
  levelCards = [];
  let cardSize = cards.length;
  for(let i=0; i < 3; i++){
    const randomNum = Math.floor(Math.random() * cardSize);
    if(randomNum === 2 && player.fireRate <=100){
      i--;
    } else if(levelCards.indexOf(randomNum) === -1){
      levelCards.push(randomNum);
    } else {
      i--;
    }
  }
}

const audio = {
  hitSound: new Audio("./asset/hit.mp3"),
  explosionSound: new Audio("./asset/explosion.mp3"),
  shootSound: new Audio("./asset/shoot.mp3"),
};

let isMuted = true;
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