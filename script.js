const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
const playerBodyImage = new Image();
playerBodyImage.src = "./asset/player-body.png";
const playerArmImage = new Image();
playerArmImage.src = "./asset/player-arm.png";
let player = { x: 400, y: 300, radius: 15, fireRate: 1000, speed: 0.9, crossroads: 150, damage: 1 };
let experience = 0, requiredExperience = 100, playerLevel = 1, lives = 10, isGameOver = false, isPaused = false, isGameStarted = false, waitForShoot = false;
let bodyCurrentFrame = 0, bodyCurrentTime = 0, bodyAnimationState = "standing", bodyAnimationDirection = "left", armAngle = 0;
const experienceBarHeight = 10;
const allowedArea = {
  x: 215,
  y: 170,
  width: 475,
  height: 340,
};
const arrows = [];
let maxArrows = 1, canShoot = true, currentArrows = 0,lastArrowShotTime = 0;
const destination = { x: 200, y: 350, radius: 25 };
const enemies = [];
const spriteSheetArr = ["./asset/horse-run-Sheet.png", "./asset/infantry-Sheet.png"];
let enemySpawnInterval = 5000, lastEnemySpawnTime = 0;
let currentTime;
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
    reStartGame();
  }
});

window.addEventListener("keydown", function(event) {
  keys[event.key] = true;
});

window.addEventListener("keyup", function(event) {
  keys[event.key] = false;
});
function drawPlayerRange() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + player.crossroads, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();
}
class Enemy{
  constructor(x, y, speed, maxHealth) {
    this.x = x + 16;
    this.y = y + 16;
    this.speed = speed;
    this.pathIndex = 0;
    this.radius = 20;
    this.health = maxHealth;
    this.maxHealth = maxHealth;
    this.currentFrame = 0;
    this.currentRow = 0;
    this.lastUpdateTime = 0;
    this.frameRate = 10;
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
    const spriteX = this.currentFrame * 32, spriteY = this.currentRow  * 32;
    ctx.save();
    if (this.direction === "down") {
      ctx.scale(-1, 1);
      ctx.drawImage(this.img,32,spriteY,32,32,-this.x - 32,this.y - 32,64,64);
    } else {
      ctx.drawImage(this.img,spriteX,spriteY,32,32,this.x - 32,this.y - 32,64,64);
    }
    ctx.restore();
  }

  update() {
    const targetX = pathPoints[this.pathIndex].x, targetY = pathPoints[this.pathIndex].y, dx = targetX - this.x, dy = targetY - this.y, distance = Math.sqrt(dx * dx + dy * dy), deltaTime = currentTime - this.lastUpdateTime;
    if (deltaTime >= 1000 / this.frameRate) {
      this.currentFrame++;
      if (this.currentFrame >= 3) {
        this.currentFrame = 0;
      }
      this.lastUpdateTime = currentTime;
    }
    this.currentRow = 0;
    if (distance > this.speed) {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    } else {
      this.pathIndex++;
      if (this.pathIndex >= pathPoints.length) this.pathIndex = 0;

      if (this.pathIndex === 3 || this.pathIndex === 4)
        this.direction = "down";
      else
        this.direction = "up";

    }
  }
  drawHealthBar() {
    const barWidth = 30, barHeight = 5,barX = this.x - barWidth / 2, barY = this.y - this.radius - 20, healthPercentage = this.health / this.maxHealth, filledWidth = barWidth * healthPercentage;
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
    const dx = this.targetX - this.x, dy = this.targetY - this.y, distance = Math.sqrt(dx * dx + dy * dy);
    if (!this.hit) {
      if (distance > this.speed) {
        const vx = dx / distance, vy = dy / distance;
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
  canShoot = currentArrows < maxArrows;
  if (canShoot && currentTime - lastArrowShotTime >= player.fireRate) {
    const closestEnemy = findClosestEnemy();
    if (closestEnemy) {
      const dx = closestEnemy.x - player.x, dy = closestEnemy.y - player.y;
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
  const deltaTime = currentTime - bodyCurrentTime, bodySourceX = bodyCurrentFrame * 32;
  if (deltaTime >= 1000/10) {
    bodyCurrentFrame++;
    if (bodyCurrentFrame >= 3) {
      bodyCurrentFrame = 0;
    }
    bodyCurrentTime = currentTime;
  }
  ctx.save();
  if (bodyAnimationDirection === "left") {
    ctx.scale(-1, 1);
    ctx.drawImage(playerBodyImage,bodySourceX, 0, 32, 32,- player.x - 32, player.y - 32, 64, 64);
  } else if(bodyAnimationDirection === "right"){
    ctx.drawImage(playerBodyImage,bodySourceX, 0, 32, 32,player.x - 32, player.y - 32, 64, 64
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
    const y = Math.random() * canvas.height;
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
    decreaseLives();
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
  ctx.fillStyle = "green";
  ctx.font = "18px Arial";
  ctx.fillText("Enemy: " + enemies.length, allowedArea.width/2, allowedArea.y + 200);
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
    currentTime = new Date().getTime();
    drawHUD();
    drawDestination();
    drawExperienceBar(0, 0, experience, requiredExperience);
    drawPlayerLevel();
    drawPlayerRange();
    if (!isPaused) {
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
  startCtx.fillStyle = "green";
  startCtx.fillRect(0, 200, canvas.width, canvas.height);
  startCtx.fillStyle = "black";
  startCtx.font = "40px Arial";
  startCtx.fillText("Click anywhere to start", 200, 530);
  let image = new Image();
  image.src = spriteSheetArr[0];
  image.onload = function (){
    startCtx.drawImage(image,64,0,32,32,500,280,64,64);
    startCtx.drawImage(image,64,0,32,32,310,410,64,64);
    startCtx.drawImage(image,0,0,32,32,250,310,64,64);
    startCtx.drawImage(image,32,0,32,32,100,250,64,64);
    startCtx.drawImage(image,32,0,32,32,150,400,64,64);
  }
  let image1 = new Image();
  image1.src = spriteSheetArr[1];
  image1.onload = function (){
    startCtx.drawImage(image1,64,0,32,32,520,350,64,64);
    startCtx.drawImage(image1,64,0,32,32,400,350,64,64);
    startCtx.drawImage(image1,0,0,32,32,350,280,64,64);
    startCtx.drawImage(image1,32,0,32,32,450,400,64,64);
  }
  startCtx.restore();
}
startCanvas.addEventListener("click", function() {
  if (!isGameStarted) {
    startGame();
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
    requiredExperience += 50;
    showLevelUpUI();
  }
}
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
      if (card.stats === "speed") {
        player.speed += 0.2;
      } else if (card.stats === "fireRate") {
        player.fireRate -= 100;
      } else if (card.stats === "crossroads") {
        player.crossroads += 50;
      } else if(card.stats === "hp"){
        lives += 10;
      }else if(card.stats === "damage"){
        player.damage += 0.5;
      }
      isPaused = false;
    }
  }
}
function drawCard(x, y, card, idx) {
  levelUpCtx.fillStyle = "#ccc";
  levelUpCtx.fillRect(x, y, 200, 300);
  levelUpCtx.save();
  levelUpCtx.beginPath();
  levelUpCtx.rect(x, y, 200, 300);
  levelUpCtx.clip();
  levelUpCtx.fillStyle = "#000";
  levelUpCtx.lineWidth = 5;
  levelUpCtx.stroke();
  levelUpCtx.fillStyle = "#000";
  levelUpCtx.font = "25px Arial";
  levelUpCtx.fillText((idx+ " . "+ card.title), x + 10, y + 50);
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
  levelUpCtx.font = "90px Arial";
  levelUpCtx.fillText("Level UP", 200, 110);
  levelUpCtx.font = "25px Arial";
  levelUpCtx.fillText("Select and press one of the number keys ", 180, 160);
  levelUpCtx.fillText("1, 2, or 3 depending on the desired ability.", 180, 190);

  let cardSize = 3;
  let cardX = 3;
  for (let i = 0; i < cardSize; i++) {
    cardX--;
    drawCard(canvas.width / 2 - (cardX * (200 + 20)) + 120, canvas.height / 3 + 50, cards[levelCards[i]], i+1);

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
  for (const key in audio) {
    if (audio.hasOwnProperty(key)) {
      const sound = audio[key];
      sound.muted = isMuted;
    }
  }
  muteButton.textContent = isMuted ? "SOUND" : "SOUND MUTE";
}

toggleMute();