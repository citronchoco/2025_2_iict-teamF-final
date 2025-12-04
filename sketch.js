// sketch.js

let plantAssets = { stems: [], leaves: [], flowers: [] };
let mossImages = [];
let lightImage = []; 

const GAME_STATE = { TITLE: 0, PLAY: 1, ENDING: 2 };

// 설정값
const CFG = {
  PLANT_COUNT: 15,       // 식물 15개
  MOSS_COUNT: 50,       // 이끼 50개
  DAY_DURATION: 2400,   // 하루 길이
  SAFE_TIME: 300        // 게임 시작 후 5초(300프레임) 동안 무적
};

// 상태 변수
let currentState = GAME_STATE.TITLE;
let debugMode = false;
let gameTime = 0;
let timePhase = 0;

// 오브젝트
let plants = [];
let mosses = [];
let lightObj;
let regrowthQueue = []; 
let mossStartPositions = []; 

function preload() {
  // 식물 이미지 로드
  plantAssets.stems.push(loadImage('./assets/plant/stem_a.png'));
  plantAssets.stems.push(loadImage('./assets/plant/stem_b.png'));
  plantAssets.stems.push(loadImage('./assets/plant/stem_c.png'));
  
  plantAssets.leaves.push(loadImage('./assets/plant/leaf_a.png'));
  plantAssets.leaves.push(loadImage('./assets/plant/leaf_b.png'));
  plantAssets.leaves.push(loadImage('./assets/plant/leaf_c.png'));
  
  plantAssets.flowers.push(loadImage('./assets/plant/flower_1a.png'));
  plantAssets.flowers.push(loadImage('./assets/plant/flower_1b.png'));
  
  // 이끼 및 빛 이미지 로드
  mossImages.push(loadImage('./assets/moss/moss_a.png'));
  mossImages.push(loadImage('./assets/moss/moss_b.png'));
  lightImage.push(loadImage('./assets/light/light_a.png'));
}

function setup() {
  createCanvas(1024, 768);
  frameRate(60);
  initGame();
}

function initGame() {
  // 1. 변수 초기화
  plants = [];
  mosses = [];
  mossStartPositions = [];
  regrowthQueue = [];
  gameTime = 0;

  // 2. 플레이어(Light) 생성
  lightObj = new Light(width / 2, height / 2, lightImage);

  // 3. 식물 생성 (화면 하단에 확실히 고정)
  spawnPlants();
  
  // 4. 이끼 생성 (식물과 겹치지 않게 안전 배치)
  spawnInitialMosses();
  
  console.log("Game Initialized: Plants created ->", plants.length);
}

function draw() {
  // 배경 그리기
  if (currentState === GAME_STATE.PLAY) updateTimeCycle();
  else if (currentState === GAME_STATE.TITLE) background(200);
  else background(0);

  // 상태별 로직 실행
  switch (currentState) {
    case GAME_STATE.TITLE: drawTitleScreen(); break;
    case GAME_STATE.PLAY:  runGameLogic(); break;
    case GAME_STATE.ENDING: drawEndingScreen(); break;
  }

  // 디버그 정보 (키보드 'd'를 누르면 켜짐)
  if (debugMode) drawDebugInfo();
}

function runGameLogic() {
  // --- 1. 플레이어(Light) 업데이트 ---
  lightObj.update();

  // --- 2. 식물 업데이트 ---
  for (let p of plants) {
    p.update(lightObj); 
    p.display();
  }

  // --- 3. 이끼 업데이트 (역순 순회) ---
  for (let i = mosses.length - 1; i >= 0; i--) {
    let m = mosses[i];

    // 이끼 성장 및 화면 갱신
    m.update(lightObj, (x, y, light) => dist(x, y, light.x, light.y) < (light.r || 100));

    // ★ 빛에 닿으면 서서히 사라지도록 처리
    for (let j = m.points.length - 1; j >= 0; j--) {
      let p = m.points[j];
      let d = dist(p.pos.x, p.pos.y, lightObj.x, lightObj.y);

      // 빛 반경 근처에 들어오면 dying 상태로 전환
      if (d < (lightObj.r || 100) + 20) { // 약간 넉넉하게
        p.dying = true;
      }

      // dying 상태인 점은 alpha를 줄여가며 삭제
      if (p.dying) {
        p.alpha -= 15;        // 숫자 줄이면 더 천천히 사라짐
        if (p.alpha <= 0) {
          m.points.splice(j, 1);
        }
      }
    }

    m.display();

    // SAFE_TIME이 지났을 때만 충돌 처리
    if (gameTime > CFG.SAFE_TIME) {
      for (let p of plants) {
        if (m.checkCollisionWithPlant(p)) {
          p.takeDamage(0.3); // 충돌 시 데미지
        }
      }
    }

    // 이끼 소멸 확인
    if (m.points.length === 0) {
      scheduleRegrowth(m.startPos);
      mosses.splice(i, 1);
    }
  }

  lightObj.display();

  // --- 4. 이끼 재생성 큐 처리 ---
  processRegrowthQueue();
}

// 배경 시간 흐름
function updateTimeCycle() {
  gameTime++;
  let cycle = gameTime % CFG.DAY_DURATION;
  let t = cycle / CFG.DAY_DURATION; 

  let colors = [
    color(60, 80, 120),   // 새벽
    color(135, 206, 235), // 낮
    color(200, 100, 50),  // 황혼
    color(20, 20, 40)     // 밤
  ];

  timePhase = floor(t * 4);
  let nextPhase = (timePhase + 1) % 4;
  let localT = (t * 4) % 1;
  
  background(lerpColor(colors[timePhase], colors[nextPhase], localT));
}

// Helper Functions

function spawnPlants() {
  let spacing = width / (CFG.PLANT_COUNT + 1);
  for (let i = 1; i <= CFG.PLANT_COUNT; i++) {
    plants.push(new Plant(i * spacing, height -10, plantAssets));
  }
}

function spawnInitialMosses() {
  for (let i = 0; i < CFG.MOSS_COUNT; i++) {
    // 100번 시도해서 안전한 위치 찾기
    for (let k = 0; k < 100; k++) {
      let pos = getEdgePosition();
      
      // 다른 이끼와 너무 가까운지 체크
      let mossTooClose = mossStartPositions.some(exist => dist(pos.x, pos.y, exist.x, exist.y) < 120);
      
      // 식물과 너무 가까운지 체크 (안전거리 200px)
      let plantTooClose = plants.some(p => dist(pos.x, pos.y, p.x, p.y) < 200);
      
      if (!mossTooClose && !plantTooClose) {
        mossStartPositions.push(pos);
        mosses.push(new Moss(random(mossImages), pos));
        break; // 성공하면 루프 종료
      }
    }
  }
}

function getEdgePosition() {
  let edge = floor(random(4));
  let m = 20; 
  if (edge === 0) return createVector(random(m, width-m), m); // 상
  if (edge === 1) return createVector(width-m, random(m, height-m)); // 우
  if (edge === 2) return createVector(random(m, width-m), height-m); // 하
  return createVector(m, random(m, height-m)); // 좌
}

function scheduleRegrowth(pos) {
  regrowthQueue.push({
    pos: pos.copy(),
    time: frameCount + 180 // 3초 후 재생성
  });
}

function processRegrowthQueue() {
  for (let i = regrowthQueue.length - 1; i >= 0; i--) {
    if (frameCount >= regrowthQueue[i].time) {
      mosses.push(new Moss(random(mossImages), regrowthQueue[i].pos));
      regrowthQueue.splice(i, 1);
    }
  }
}

// UI 함수들
function drawTitleScreen() {
  textAlign(CENTER, CENTER);
  fill(0); textSize(40); text("OVERGROWN", width/2, height/2 - 20);
  fill(frameCount % 60 < 30 ? 50 : 150); textSize(16); text("Click to Start", width/2, height/2 + 50);
}

function drawEndingScreen() {
  fill(255); textAlign(CENTER, CENTER); textSize(32); text("ENDING", width/2, height/2 - 30);
  fill(frameCount % 60 < 30 ? 255 : 150); textSize(16); text("Press 'R' to Return", width/2, height/2 + 30);
}

function mousePressed() {
  if (currentState === GAME_STATE.TITLE) {
    initGame();
    currentState = GAME_STATE.PLAY;
  }
}

function keyPressed() {
  if (key === 'd' || key === 'D') debugMode = !debugMode;
  if (currentState === GAME_STATE.ENDING && (key === 'r' || key === 'R')) currentState = GAME_STATE.TITLE;
}

function drawDebugInfo() {
  // 디버그 모드에서만 보이는 정보
  fill(0, 255, 0); noStroke(); textAlign(LEFT, TOP); textSize(14);
  text(`FPS: ${int(frameRate())}`, 10, 10);
  text(`Plants: ${plants.length}`, 10, 30);
  text(`GameTime: ${gameTime}`, 10, 50);
  text(`SafeMode: ${gameTime < CFG.SAFE_TIME ? "ON" : "OFF"}`, 10, 70);

  // 식물 위치 강제 표시 (식물이 투명한지 확인용)
  for(let p of plants) {
    noFill(); stroke(255, 0, 0); strokeWeight(2);
    rectMode(CENTER);
    rect(p.x, p.y - 20, 20, 20); // 식물 뿌리 위치에 빨간 사각형
  }
}