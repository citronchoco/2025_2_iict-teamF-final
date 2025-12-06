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


// 폭주 연출을 한 번만 실행하기 위한 플래그
let overgrowFinished = false;


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


  // UI 및 배경 리소스 로드 (제공해주신 파일 경로 기반)
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
  // if (currentState === GAME_STATE.PLAY) updateTimeCycle();
  // else if (currentState === GAME_STATE.TITLE) background(200);
  // else background(0);


  console.log(currentState)
  // 상태별 로직 실행
  switch (currentState) {
    case GAME_STATE.TITLE: drawStartScreen(); break;
    case GAME_STATE.TUTORIAL: drawTutorialScreen(); break;
    case GAME_STATE.PLAY: 
      updateTimeCycle(); 
      runGameLogic(); 
      break;
    case GAME_STATE.ENDING: drawEndingScreen(); break;
  }

  // 이끼가 화면을 거의 다 덮은 뒤, 다음 프레임부터 ENDING으로 전환
  if (overgrowFinished && currentState === GAME_STATE.PLAY) {
    currentState = GAME_STATE.ENDING;
  }

  // 디버그 정보 (키보드 'd'를 누르면 켜짐)
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
  // 예시: 화면의 40% 이상을 덮으면 폭주 모드로 전환함
  let overgrowMode = coverage > 0.4;


  // 폭주 모드일 때: 빈 샘플 칸들 중 하나를 목표 지점으로 선택
  if (overgrowMode && emptySamplePositions.length > 0) {
    if (frameCount % 10 === 0 || !overgrowTargetPos) {
      overgrowTargetPos = random(emptySamplePositions).copy();
    }
  } else {
    overgrowTargetPos = null;
  }


  // 디버그용 로그 출력 (coverage, overgrowMode, timePhase 확인용)
  console.log('coverage:', coverage.toFixed(3), 'overgrowMode:', overgrowMode, 'timePhase:', timePhase);


  // --- 1. 플레이어(Light) 업데이트 ---
  lightObj.update();


  // --- 2. 식물 업데이트 ---
  for (let p of plants) {
    p.update(lightObj); 
    p.display();
  }

  // 이미 폭주 연출이 끝났으면, 이끼와 빛만 보여주고 로직은 멈춤
  if (overgrowFinished) {
    for (let m of mosses) {
      m.display();
    }
    lightObj.display();
    return;
  }


  // --- 3. 이끼 업데이트 (역순 순회) ---
  for (let i = mosses.length - 1; i >= 0; i--) {
    let m = mosses[i];


    // 이끼 성장 및 화면 갱신
    // overgrowMode를 세 번째 인자로 넘겨 폭주 모드 여부를 전달함
    m.update(
      lightObj, 
      (x, y, light) => dist(x, y, light.x, light.y) < (light.r || 100),
      overgrowMode
    );


    // 빛에 닿으면 서서히 사라지도록 처리
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


  // 폭주 모드일 때, 목표 빈 칸을 향해 강제로 이끼를 한 번 퍼뜨림
  if (overgrowMode && overgrowTargetPos) {
    forceOvergrowTowardTarget();
  }


  lightObj.display();


  // --- 4. 이끼 재생성 큐 처리 ---
  processRegrowthQueue();


  // coverage가 0.8을 넘는 순간: 기존 이끼를 싹 지우고, 새 Moss 하나로 화면 전체를 덮음
  if (coverage > 0.8 && !overgrowFinished) {
    console.log('OVERGROW TRIGGER', coverage);
    overgrowFinished = true;

    // 1) 새 Moss 하나 생성 (현재 이끼 이미지 중 하나 사용)
    let img = mossImages.length > 0 ? mossImages[0] : null;
    let fullMoss = new Moss(img, createVector(width / 2, height / 2));

    // 2) 이 Moss의 points를 비우고, 화면 전체에 이끼 패치를 새로 생성
    fullMoss.points = [];
    let step = 30; // 더 촘촘히 하고 싶으면 20으로 줄이기
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        // progress를 1로 주어, 처음부터 최대 크기/불투명도로 보이게 함
        fullMoss.addPoint(createVector(x, y), 0, 1);
      }
    }

    // 3) 기존 이끼들은 버리고, 이 Moss 하나만 화면에 남김
    mosses = [fullMoss];
  }
}


// 폭주 모드에서 overgrowTargetPos 쪽으로 이끼를 강제로 한 번 퍼뜨림
function forceOvergrowTowardTarget() {
  if (!overgrowTargetPos || mosses.length === 0) return;


  // 1. 타깃에 가장 가까운 Moss 찾기
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


  // 2. 그 Moss 안에서 타깃에 가장 가까운 패치 하나 찾기
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


  // 3. parent → 타깃 방향으로 조금 떨어진 곳에 새 점 강제 생성
  let dir = createVector(
    overgrowTargetPos.x - parent.pos.x,
    overgrowTargetPos.y - parent.pos.y
  );
  if (dir.magSq() === 0) return;
  dir.normalize();


  let distR = random(20, 60);
  let childPos = p5.Vector.add(parent.pos, dir.mult(distR));


  // 화면 밖으로 너무 멀리 나가면 생성하지 않음
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
function drawStartScreen() {
  image(startBg, 0, 0, 1024, 768);
  stroke(255);


  // 폰트 및 텍스트 설정
  textFont(whiteObliqueFont);
  strokeWeight(1);
  fill(255);
  textSize(30);
  textAlign(CENTER, CENTER);
  text(`START`, 345, 550);
  text(`TUTORIAL`, 679, 550);
  textSize(60);
  text(`빛과 그림자의 정원`, 512, 300);


  // 마우스 오버 효과 계산
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


  // 튜토리얼 화면 내 START 버튼 마우스 오버
  let mouseOverStart2 = pow(mouseX - 512, 2) / pow(110, 2) + pow(mouseY - 605, 2) / pow(35, 2);
  if(mouseOverStart2 < 1) {
    noStroke();
    fill(220, 220, 220, 100);
    ellipse(512, 605, 220, 70);
  }
}


// function drawTitleScreen() {
//   textAlign(CENTER, CENTER);
//   fill(0); textSize(40); text("OVERGROWN", width/2, height/2 - 20);
//   fill(frameCount % 60 < 30 ? 50 : 150); textSize(16); text("Click to Start", width/2, height/2 + 50);
// }


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
  // 1. TITLE 화면에서의 클릭 처리
  if (currentState === GAME_STATE.TITLE) {
    // START 버튼 판정
    let checkStart = pow(mouseX - 345, 2) / pow(110, 2) + pow(mouseY - 555, 2) / pow(35, 2);
    // TUTORIAL 버튼 판정
    let checkTutorial = pow(mouseX - 679, 2) / pow(110, 2) + pow(mouseY - 555, 2) / pow(35, 2);


    if (checkStart < 1) {
      initGame();
      currentState = GAME_STATE.PLAY;
    } else if (checkTutorial < 1) {
      currentState = GAME_STATE.TUTORIAL;
    }
  }
  // 2. TUTORIAL 화면에서의 클릭 처리 (START 버튼 하나)
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
  // 디버그 모드에서만 보이는 정보
  fill(0, 255, 0); noStroke(); textAlign(LEFT, TOP); textSize(14);
  text(`FPS: ${int(frameRate())}`, 10, 10);
  text(`Plants: ${plants.length}`, 10, 30);
  text(`GameTime: ${gameTime}`, 10, 50);
  text(`SafeMode: ${gameTime < CFG.SAFE_TIME ? "ON" : "OFF"}`, 10, 70);
  text(`TimePhase: ${timePhase}`, 10, 90);


  // 식물 위치 강제 표시 (식물이 투명한지 확인용)
  for(let p of plants) {
    noFill(); stroke(255, 0, 0); strokeWeight(2);
    rectMode(CENTER);
    rect(p.x, p.y - 20, 20, 20); // 식물 뿌리 위치에 빨간 사각형
  }
}