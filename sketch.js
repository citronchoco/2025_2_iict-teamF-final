let hudBg, startBg, tutorialBg, overBg;
let whiteObliqueFont; 
let tutorialTitle, tutorialDescript, overDescript;

let plantAssets = { stems: [], leaves: [], flowers: [] };
let mossImages = [];
let lightImage = []; 

const GAME_STATE = { TITLE: 0, PLAY: 1, ENDING: 2, TUTORIAL: 3 };

// 설정값
const CFG = {
  PLANT_COUNT: 15,       // 식물 15개
  MOSS_COUNT: 50,        // 이끼 50개
  DAY_DURATION: 2400,    // 하루 길이
  SAFE_TIME: 300         // 게임 시작 후 5초(300프레임) 동안 무적
};

// 상태 변수
let currentState = GAME_STATE.TITLE;
let debugMode = false;
let gameTime = 0;
let timePhase = 0;

// 화면 샘플 그리드 기준 이끼가 안 덮인 칸들, 폭주 타깃
let emptySamplePositions = [];
let overgrowTargetPos = null;

// 폭주 연출을 한 번만 실행하기 위한 플래그 + 연출 프레임 카운트
let overgrowFinished = false;
let overgrowFrames = 0;      // 0이면 아직 연출 없음, 60이면 1초 연출

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
  plantAssets.flowers.push(loadImage('./assets/plant/flower_2a.png'));
  plantAssets.flowers.push(loadImage('./assets/plant/flower_3a.png'));
  plantAssets.flowers.push(loadImage('./assets/plant/flower_4a.png'));
  
  // 이끼 및 빛 이미지 로드
  mossImages.push(loadImage('./assets/moss/moss_a.png'));
  mossImages.push(loadImage('./assets/moss/moss_b.png'));
  lightImage.push(loadImage('./assets/light/light_a.png'));

  // UI 및 배경 리소스 로드
  hudBg = loadImage('./assets/background/tthree.jpg');
  startBg = loadImage('./assets/background/tone.jpg');
  tutorialBg = loadImage('./assets/background/ttwo.jpg');
  overBg = loadImage('./assets/background/tfour.jpg');
  
  whiteObliqueFont = loadFont('./assets/font/LeferiPointWhiteOblique.ttf');
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
  overgrowFinished = false;
  overgrowFrames = 0;

  // 2. 플레이어(Light) 생성
  lightObj = new Light(width / 2, height / 2, lightImage);

  // 3. 식물 생성 (화면 하단에 확실히 고정)
  spawnPlants();
  
  // 4. 이끼 생성 (식물과 겹치지 않게 안전 배치)
  spawnInitialMosses();
  
  console.log("Game Initialized: Plants created ->", plants.length);
}

function draw() {
  console.log(currentState)

  switch (currentState) {
    case GAME_STATE.TITLE:
      drawStartScreen();
      break;
    case GAME_STATE.TUTORIAL:
      drawTutorialScreen();
      break;
    case GAME_STATE.PLAY:
      updateTimeCycle();
      runGameLogic();
      break;
    case GAME_STATE.ENDING:
      drawEndingScreen();
      break;
  }

  // 폭주 연출이 끝났다면 엔딩으로 전환
  if (overgrowFinished && overgrowFrames <= 0 && currentState === GAME_STATE.PLAY) {
    currentState = GAME_STATE.ENDING;
  }

  if (debugMode) drawDebugInfo();
}

// 화면에서 이끼가 차지하는 대략적인 비율 계산함
function getMossCoverageRatio() {
  let cols = 40;
  let rows = 30;
  let covered = 0;
  let total = cols * rows;

  emptySamplePositions = [];

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = map(i + 0.5, 0, cols, 0, width);
      let y = map(j + 0.5, 0, rows, 0, height);

      let isCovered = false;

      for (let m of mosses) {
        for (let p of m.points) {
          let size = p.baseSize * Math.sqrt(p.progress);
          let r = size / 2;
          let d = dist(x, y, p.pos.x, p.pos.y);
          if (d <= r) {
            isCovered = true;
            break;
          }
        }
        if (isCovered) break;
      }

      if (isCovered) {
        covered++;
      } else {
        emptySamplePositions.push(createVector(x, y));
      }
    }
  }

  return covered / total;
}

function runGameLogic() {
  // --- 0. 이끼 커버리지 계산 및 폭주 모드 여부 결정 ---
  let coverage = getMossCoverageRatio();
  let overgrowMode = coverage > 0.4;

  if (overgrowMode && emptySamplePositions.length > 0) {
    if (frameCount % 10 === 0 || !overgrowTargetPos) {
      overgrowTargetPos = random(emptySamplePositions).copy();
    }
  } else {
    overgrowTargetPos = null;
  }

  console.log('coverage:', coverage.toFixed(3), 'overgrowMode:', overgrowMode, 'timePhase:', timePhase);

  // --- 폭주 연출 중이면: full-cover Moss만 보여주고 카운트 다운 ---
  if (overgrowFinished && overgrowFrames > 0) {
    // 배경 갱신
    updateTimeCycle();
    // full-cover용 moss만 렌더 (지금 mosses 배열엔 그것만 있어야 함)
    for (let m of mosses) {
      m.display();
    }
    overgrowFrames--;      // 1초 동안 유지 (60프레임)
    return;
  }

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

    m.update(
      lightObj, 
      (x, y, light) => dist(x, y, light.x, light.y) < (light.r || 100),
      overgrowMode
    );

    // 빛에 닿으면 서서히 사라지도록 처리
    for (let j = m.points.length - 1; j >= 0; j--) {
      let p = m.points[j];
      let d = dist(p.pos.x, p.pos.y, lightObj.x, lightObj.y);

      if (d < (lightObj.r || 100) + 20) {
        p.dying = true;
      }

      if (p.dying) {
        p.alpha -= 15;
        if (p.alpha <= 0) {
          m.points.splice(j, 1);
        }
      }
    }

    m.display();

    if (gameTime > CFG.SAFE_TIME) {
      for (let p of plants) {
        if (m.checkCollisionWithPlant(p)) {
          p.takeDamage(0.3);
        }
      }
    }

    if (m.points.length === 0) {
      scheduleRegrowth(m.startPos);
      mosses.splice(i, 1);
    }
  }

  if (overgrowMode && overgrowTargetPos) {
    forceOvergrowTowardTarget();
  }

  lightObj.display();

  // --- 4. 이끼 재생성 큐 처리 ---
  processRegrowthQueue();

  // coverage가 0.95을 넘는 순간: full-cover Moss 생성 + 1초 연출 준비
  if (coverage > 0.95 && !overgrowFinished) {
    console.log('OVERGROW TRIGGER', coverage);
    overgrowFinished = true;
    overgrowFrames = 60;    // 1초 동안 연출 유지

    // 1) 새 Moss 하나 생성
    let img = mossImages.length > 0 ? mossImages[0] : null;
    let fullMoss = new Moss(img, createVector(width / 2, height / 2));

    // 2) 이 Moss의 points를 비우고, 화면 전체에 이끼 패치를 새로 생성 (랜덤 순서)
    fullMoss.points = [];

    let step = 30; // 더 촘촘히 하고 싶으면 20 등으로 줄이기
    let positions = [];

    // 2-1) 먼저 모든 좌표를 배열에 담기
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        positions.push(createVector(x, y));
      }
    }

    // 2-2) Fisher–Yates로 배열을 무작위 섞기
    for (let i = positions.length - 1; i > 0; i--) {
      let j = floor(random(i + 1));
      let tmp = positions[i];
      positions[i] = positions[j];
      positions[j] = tmp;
    }

    // 2-3) 섞인 순서대로 패치 생성 (progress=1로, 처음부터 꽉 찬 이끼)
    for (let pos of positions) {
      fullMoss.addPoint(pos, 0, 1);
    }

    // 3) 기존 이끼들은 버리고, 이 Moss 하나만 화면에 남김
    mosses = [fullMoss];
  }
}

// 폭주 모드에서 overgrowTargetPos 쪽으로 이끼를 강제로 한 번 퍼뜨림
function forceOvergrowTowardTarget() {
  if (!overgrowTargetPos || mosses.length === 0) return;

  let bestMoss = null;
  let bestDist = Infinity;

  for (let m of mosses) {
    for (let p of m.points) {
      let d = dist(p.pos.x, p.pos.y, overgrowTargetPos.x, overgrowTargetPos.y);
      if (d < bestDist) {
        bestDist = d;
        bestMoss = m;
      }
    }
  }
  if (!bestMoss) return;

  let parent = null;
  bestDist = Infinity;
  for (let p of bestMoss.points) {
    let d = dist(p.pos.x, p.pos.y, overgrowTargetPos.x, overgrowTargetPos.y);
    if (d < bestDist) {
      bestDist = d;
      parent = p;
    }
  }
  if (!parent) return;

  let dir = createVector(
    overgrowTargetPos.x - parent.pos.x,
    overgrowTargetPos.y - parent.pos.y
  );
  if (dir.magSq() === 0) return;
  dir.normalize();

  let distR = random(20, 60);
  let childPos = p5.Vector.add(parent.pos, dir.mult(distR));

  if (childPos.x < -200 || childPos.x > width + 200 ||
      childPos.y < -200 || childPos.y > height + 200) {
    return;
  }

  bestMoss.addPoint(childPos, parent.generation + 1);
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
    for (let k = 0; k < 100; k++) {
      let pos = getEdgePosition();
      
      let mossTooClose = mossStartPositions.some(exist => dist(pos.x, pos.y, exist.x, exist.y) < 120);
      let plantTooClose = plants.some(p => dist(pos.x, pos.y, p.x, p.y) < 200);
      
      if (!mossTooClose && !plantTooClose) {
        mossStartPositions.push(pos);
        mosses.push(new Moss(random(mossImages), pos));
        break;
      }
    }
  }
}

function getEdgePosition() {
  let edge = floor(random(4));
  let m = 20; 
  if (edge === 0) return createVector(random(m, width-m), m);
  if (edge === 1) return createVector(width-m, random(m, height-m));
  if (edge === 2) return createVector(random(m, width-m), height-m);
  return createVector(m, random(m, height-m));
}

function scheduleRegrowth(pos) {
  regrowthQueue.push({
    pos: pos.copy(),
    time: frameCount + 180
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
function drawStartScreen() {
  image(startBg, 0, 0, 1024, 768);
  stroke(255);

  textFont(whiteObliqueFont);
  strokeWeight(1);
  fill(255);
  textSize(30);
  textAlign(CENTER, CENTER);
  text(`START`, 345, 550);
  text(`TUTORIAL`, 679, 550);
  textSize(60);
  text(`빛과 그림자의 정원`, 512, 300);

  let mouseOverStart = pow(mouseX - 345, 2) / pow(110, 2) + pow(mouseY - 555, 2) / pow(35, 2);
  let mouseOverTutorial = pow(mouseX - 679, 2) / pow(110, 2) + pow(mouseY - 555, 2) / pow(35, 2);

  if(mouseOverStart < 1) {
    noStroke();
    fill(220, 220, 220, 100);
    ellipse(345, 555, 220, 70);
  }
  if(mouseOverTutorial < 1) {
    noStroke();
    fill(220, 220, 220, 100);
    ellipse(679, 555, 220, 70);
  }
}

function drawTutorialScreen() {
  image(tutorialBg, 0, 0, 1024, 768);

  tutorialTitle = `빛과 그림자의 정원`;
  tutorialDescript = `40초마다 새벽-낮-황혼-밤 순으로 시간이 흘러갑니다.\n 마우스를 통해 다양한 식물을 조종해 자유롭게 정원을 꾸밀 수 있습니다.\n 밤 시간에는 조종이 불가하며 이끼가 랜덤하게 생성됩니다.\n 중간에 언제든지 스페이스바를 눌러 정원의 모습을 저장하실 수 있습니다.`;
  
  textFont(whiteObliqueFont);
  textAlign(CENTER, CENTER);
  strokeWeight(3);
  fill(255);
  textSize(20);
  textLeading(30);
  text(tutorialTitle, 512, 120);
  strokeWeight(1);
  textSize(25);
  textLeading(70);
  text(tutorialDescript, 512, 350);
  textSize(30);
  text(`START`, 512, 600);

  let mouseOverStart2 = pow(mouseX - 512, 2) / pow(110, 2) + pow(mouseY - 605, 2) / pow(35, 2);
  if(mouseOverStart2 < 1) {
    noStroke();
    fill(220, 220, 220, 100);
    ellipse(512, 605, 220, 70);
  }
}

function drawEndingScreen() {
  image(overBg, 0, 0, 1024, 768);
  
  overDescript = `PRESS    R    TO RESTART`;
  
  textSize(40);
  fill(255);
  textFont(whiteObliqueFont);
  textAlign(CENTER, CENTER);
  text(overDescript, 512, 384);

  fill(220, 220, 220, 100);
  stroke(235, 217, 148);
  ellipse(449, 391, 90, 90);
}

function mousePressed() {
  if (currentState === GAME_STATE.TITLE) {
    let checkStart = pow(mouseX - 345, 2) / pow(110, 2) + pow(mouseY - 555, 2) / pow(35, 2);
    let checkTutorial = pow(mouseX - 679, 2) / pow(110, 2) + pow(mouseY - 555, 2) / pow(35, 2);

    if (checkStart < 1) {
      initGame();
      currentState = GAME_STATE.PLAY;
    } else if (checkTutorial < 1) {
      currentState = GAME_STATE.TUTORIAL;
    }
  }
  else if (currentState === GAME_STATE.TUTORIAL) {
    let checkStart2 = pow(mouseX - 512, 2) / pow(110, 2) + pow(mouseY - 605, 2) / pow(35, 2);
    if (checkStart2 < 1) {
      initGame();
      currentState = GAME_STATE.PLAY;
    }
  }
}

function keyPressed() {
  if (key === 'd' || key === 'D') debugMode = !debugMode;
  if (currentState === GAME_STATE.ENDING && keyCode===82) {
    currentState = GAME_STATE.TITLE;
    console.log(key);
  }
}

function drawDebugInfo() {
  fill(0, 255, 0); 
  noStroke(); 
  textAlign(LEFT, TOP); 
  textSize(14);
  text(`FPS: ${int(frameRate())}`, 10, 10);
  text(`Plants: ${plants.length}`, 10, 30);
  text(`GameTime: ${gameTime}`, 10, 50);
  text(`SafeMode: ${gameTime < CFG.SAFE_TIME ? "ON" : "OFF"}`, 10, 70);
  text(`TimePhase: ${timePhase}`, 10, 90);

  for(let p of plants) {
    noFill(); 
    stroke(255, 0, 0); 
    strokeWeight(2);
    rectMode(CENTER);
    rect(p.x, p.y - 20, 20, 20);
  }
}