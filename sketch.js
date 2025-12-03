const GAME_STATE = {
  TITLE: 0,
  PLAY: 1,
  ENDING: 2
};

let currentState = GAME_STATE.TITLE;
let debugMode = false; // 'D'키로 디버그 모드

// 시간 시스템 변수
let gameTime = 0;
const DAY_DURATION = 2400; // 약 40초 (60fps 기준)
let timePhase = 0; // 0:새벽, 1:낮, 2:황혼, 3:밤

// 객체 배열
let plants = [];
let mosses = [];
let lightObj;

// 리소스 컨테이너
let assets = {
  plant: [],
  moss: [],
  light: null
};

function preload() {
  console.log("Resource Loading...");
  // 이미지 업로드 (현재는 setup에서 임시 생성)
  // assets.moss.push(loadImage('assets/moss/moss_texture.png')); <-- 이끼 이미지 로딩. 일단 주석처리
}

function setup() {
  createCanvas(1024, 768);
  frameRate(60);

  // [안전장치] 이미지가 없을 때 임시 이끼 이미지 생성
  if (assets.moss.length === 0) {
    let tempMoss = createImage(64, 64);
    tempMoss.loadPixels();
    for (let i = 0; i < tempMoss.width; i++) {
      for (let j = 0; j < tempMoss.height; j++) {
        // 노이즈가 있는 초록색 텍스처
        if (random() > 0.3) tempMoss.set(i, j, color(50, random(100, 200), 100, 100));
        else tempMoss.set(i, j, color(0, 0, 0, 0));
      }
    }
    tempMoss.updatePixels();
    assets.moss.push(tempMoss);
  }

  // 게임 시작
  initGame();
}

/**
 * 게임 시작/재시작 초기화
 */
function initGame() {
  plants = [];
  mosses = [];
  gameTime = 0; // 시간 초기화

  // 1. 빛 생성
  // 텍스처가 없다면 null을 넘겨 Light 내부에서 처리하거나, setup에서 만든 텍스처 전달
  lightObj = new Light(width / 2, height / 2, null);

  // 2. 식물 생성 (MockPlant)
  let spacing = width / 8;
  for (let i = 1; i <= 7; i++) {
    plants.push(new MockPlant(i * spacing, height));
  }

  // 3. 이끼 생성
  for (let i = 0; i < 50; i++) {
    let img = random(assets.moss);
    mosses.push(new Moss(img));
  }
}

function draw() {
  // 배경 처리를 위한 시간 계산
  if (currentState === GAME_STATE.PLAY) {
    updateTimeCycle();
  } else if (currentState === GAME_STATE.TITLE) {
    background(200); // 타이틀은 밝은 배경 (임시)
  } else {
    background(0); // 엔딩은 검은 배경
  }

  switch (currentState) {
    case GAME_STATE.TITLE:
      drawTitleScreen();
      break;
    case GAME_STATE.PLAY:
      runGameLogic();
      break;
    case GAME_STATE.ENDING:
      drawEndingScreen();
      break;
  }

  if (debugMode) drawDebugInfo();
}

// 시간 흐름 및 배경색 업데이트 (새벽-낮-황혼-밤)
function updateTimeCycle() {
  gameTime++;
  let cycle = gameTime % DAY_DURATION;
  let phaseProgress = cycle / DAY_DURATION; // 0.0 ~ 1.0

  // 4단계 색상 정의 (디자이너 리소스 전 단색 처리)
  let cDawn = color(60, 80, 120);   // 새벽 (푸르스름)
  let cDay = color(135, 206, 235);  // 낮 (하늘색)
  let cDusk = color(200, 100, 50);  // 황혼 (주황색)
  let cNight = color(20, 20, 40);   // 밤 (어두운 남색)

  let bgColor;
  
  // 0~0.25: 새벽->낮, 0.25~0.5: 낮->황혼, 0.5~0.75: 황혼->밤, 0.75~1.0: 밤->새벽
  if (phaseProgress < 0.25) {
    timePhase = 0; // 새벽
    bgColor = lerpColor(cDawn, cDay, map(phaseProgress, 0, 0.25, 0, 1));
  } else if (phaseProgress < 0.5) {
    timePhase = 1; // 낮
    bgColor = lerpColor(cDay, cDusk, map(phaseProgress, 0.25, 0.5, 0, 1));
  } else if (phaseProgress < 0.75) {
    timePhase = 2; // 황혼
    bgColor = lerpColor(cDusk, cNight, map(phaseProgress, 0.5, 0.75, 0, 1));
  } else {
    timePhase = 3; // 밤
    bgColor = lerpColor(cNight, cDawn, map(phaseProgress, 0.75, 1.0, 0, 1));
  }
  
  background(bgColor);
}

// 게임 로직
function runGameLogic() {
  // [1] 이끼 업데이트
  for (let i = 0; i < mosses.length; i++) {
    let m = mosses[i];
    m.update();
    m.display();

    // 1-1. 화면 밖으로 나갔는지 확인
    if (m.isOffScreen()) {
      let img = random(assets.moss);
      mosses[i] = new Moss(img);
    }

    // 1-2. 빛과의 충돌 체크
    if (m.checkCollision(lightObj)) {
      m.grow(); 
    }
  }

  // [2] 식물 업데이트
  for (let i = 0; i < plants.length; i++) {
    let p = plants[i];
    p.display();
    if (p.checkCollision(lightObj)) {
      // p.grow(); 
    }
  }

  // [3] 빛 업데이트
  lightObj.update();
  lightObj.display();
}

// 6. 화면 함수
function drawTitleScreen() {
  textAlign(CENTER, CENTER);
  fill(0);
  textSize(40);
  text("OVERGROWN", width / 2, height / 2 - 20);
  textSize(16);
  if (frameCount % 60 < 30) fill(50); else fill(150);
  text("Click to Start", width / 2, height / 2 + 50);
}

function drawEndingScreen() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("ENDING", width / 2, height / 2 - 30);
  
  textSize(16);
  // 깜빡이는 효과
  if (frameCount % 60 < 30) fill(255, 255, 0); else fill(150);
  text("Press 'R' to Return to Title", width / 2, height / 2 + 30);
}

function mousePressed() {
  // 타이틀에서만 클릭으로 시작 가능 (임시)
  if (currentState === GAME_STATE.TITLE) {
    initGame(); // 게임 시작 시 초기화
    currentState = GAME_STATE.PLAY;
  } 
}

function keyPressed() {
  // 디버그 모드 토글
  if (key === 'd' || key === 'D') {
    debugMode = !debugMode;
  }
  
  // 엔딩 화면에서 'R'키를 눌러야만 타이틀로 복귀
  if (currentState === GAME_STATE.ENDING) {
    if (key === 'r' || key === 'R') {
      currentState = GAME_STATE.TITLE;
    }
  }
}

function drawDebugInfo() {
  fill(0, 255, 0);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  text(`FPS: ${int(frameRate())}`, 10, 10);
  text(`Time: ${int(gameTime / 60)}s`, 10, 30);
  
  let phaseName = ["Dawn", "Day", "Dusk", "Night"];
  text(`Phase: ${phaseName[timePhase]}`, 10, 50);

  stroke(255, 0, 0, 100);
  line(mouseX, 0, mouseX, height);
  line(0, mouseY, width, mouseY);
}

// 임시 식물 클래스
class MockPlant {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 60; this.h = 200;
  }
  display() {
    imageMode(CENTER); noStroke(); fill(50, 150, 50);
    rect(this.x, this.y - this.h / 2, this.w, this.h);
    if (debugMode) {
      noFill(); stroke(255, 0, 0);
      rect(this.x, this.y - this.h / 2, this.w, this.h);
    }
  }
  checkCollision(light) {
    if (light.x > this.x - this.w / 2 && light.x < this.x + this.w / 2 &&
      light.y > this.y - this.h && light.y < this.y) return true;
    return false;
  }
}