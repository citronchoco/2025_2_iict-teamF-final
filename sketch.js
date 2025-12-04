let plantAssets = { stems: [], leaves: [], flowers: [] };
let mossImages = [];
let lightImage = []; 



const GAME_STATE = {
  TITLE: 0,
  PLAY: 1,
  ENDING: 2
};



// 게임 상태
let currentState = GAME_STATE.TITLE;
// 디버그 모드
let debugMode = false;



// 시간 시스템 변수
let gameTime = 0;
// 하루가 지나가는 주기 설정, 60fps 기준 약 40초
const DAY_DURATION = 2400;



// 배경 색상 보간을 위한 현재 시간대 인덱스
// 0:새벽, 1:낮, 2:황혼, 3:밤
let timePhase = 0;



// 오브젝트 컨테이너
let plants = [];
let mosses = [];
let lightObj;



// 구역 관리
let mossStartPositions = [];
let minMossDistance = 120;



// 재생성을 위한 대기열
let regrowthQueue = [];



// 이미지 리소스 로드
function preload() {
  // 줄기 이미지 로드
  plantAssets.stems.push(loadImage('./assets/plant/stem_a.png'));
  plantAssets.stems.push(loadImage('./assets/plant/stem_b.png'));
  plantAssets.stems.push(loadImage('./assets/plant/stem_c.png'));
  
  // 잎 이미지 로드
  plantAssets.leaves.push(loadImage('./assets/plant/leaf_a.png'));
  plantAssets.leaves.push(loadImage('./assets/plant/leaf_b.png'));
  plantAssets.leaves.push(loadImage('./assets/plant/leaf_c.png'));
  
  // 꽃 이미지 로드
  plantAssets.flowers.push(loadImage('./assets/plant/flower_1a.png'));
  plantAssets.flowers.push(loadImage('./assets/plant/flower_1b.png'));
  
  // 이끼 텍스처 2종 로드
  mossImages.push(loadImage('./assets/moss/moss_a.png'));
  mossImages.push(loadImage('./assets/moss/moss_b.png'));

  lightImage.push(loadImage('./assets/light/light_a.png'));
}



// 초기화
function setup() {
  createCanvas(1024, 768);
  frameRate(60);

  initGame();
}



// 게임 세션 시작
function initGame() {
  // 이전 세션의 잔여 데이터 제거
  plants = [];
  mosses = [];
  gameTime = 0;
  mossStartPositions = [];
  regrowthQueue = [];

  // 플레이어 생성 시 로드한 이미지(배열) 전달
  lightObj = new Light(width / 2, height / 2, lightImage);

  // 식물 배치
  let spacing = width / 8;
  for (let i = 1; i <= 7; i++) {
    plants.push(new Plant(i * spacing, height, plantAssets));
  }

  // 이끼 배치: 사방 끝면을 촘촘하게 채우기
  createInitialMossOnAllEdges();
}



// 메인 루프
function draw() {
  // 게임 상태에 따른 배경 렌더링 분기
  if (currentState === GAME_STATE.PLEY) {
    updateTimeCycle();
  } else if (currentState === GAME_STATE.TITLE) {
    background(200);
  } else {
    background(0);
  }

  // 핵심 게임 로직 분기 처리
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

  // 디버그 모드 활성화 시 프레임 및 상태 정보 오버레이
  if (debugMode) drawDebugInfo();
}



// 배경 색상 업데이트
function updateTimeCycle() {
  gameTime++;
  
  let cycle = gameTime % DAY_DURATION;
  let phaseProgress = cycle / DAY_DURATION; 

  let cDawn = color(60, 80, 120);
  let cDay = color(135, 206, 235);
  let cDusk = color(200, 100, 50);
  let cNight = color(20, 20, 40);

  let bgColor;
  
  if (phaseProgress < 0.25) {
    timePhase = 0; // 새벽->낮
    bgColor = lerpColor(cDawn, cDay, map(phaseProgress, 0, 0.25, 0, 1));
  } else if (phaseProgress < 0.5) {
    timePhase = 1; // 낮->황혼
    bgColor = lerpColor(cDay, cDusk, map(phaseProgress, 0.25, 0.5, 0, 1));
  } else if (phaseProgress < 0.75) {
    timePhase = 2; // 황혼->밤
    bgColor = lerpColor(cDusk, cNight, map(phaseProgress, 0.5, 0.75, 0, 1));
  } else {
    timePhase = 3; // 밤->새벽
    bgColor = lerpColor(cNight, cDawn, map(phaseProgress, 0.75, 1.0, 0, 1));
  }
  
  background(bgColor);
}



function runGameLogic() {
  // 1. 이끼 업데이트 (역순 순회)
  for (let i = mosses.length - 1; i >= 0; i--) {
    let m = mosses[i];
    
    // 빛 범위 판별 함수 전달 (Light 클래스의 r 사용)
    m.update(lightObj, (x, y, light) => {
      let d = dist(x, y, light.x, light.y);
      return d < (light.r || 100); 
    });
    
    // 빛에 닿으면 정화 - 매 프레임마다 수동으로 처리 (서서히 사라짐)
    for (let j = m.points.length - 1; j >= 0; j--) {
      let p = m.points[j];
      let d = dist(p.pos.x, p.pos.y, lightObj.x, lightObj.y);
      
      // Light 클래스의 r(반지름 100)보다 조금 더 넉넉하게 체크
      if (d < 120) {
        // 즉시 삭제 대신, 사라지는 상태로 표시
        p.dying = true;
      }

      // dying 상태면 alpha를 줄여가며 삭제
      if (p.dying) {
        p.alpha -= 15;            // 작게 하면 더 천천히 사라짐
        if (p.alpha <= 0) {
          m.points.splice(j, 1);
        }
      }
    }
    
    // 모든 점이 제거되면 이끼 객체 삭제 후 재생성 대기열로
    if (m.points.length === 0) {
      regrowthQueue.push({
        pos: m.startPos.copy(),
        regrowFrame: frameCount + 180
      });
      mosses.splice(i, 1);
      continue;
    }
    
    m.display();
  }


  // 2. 재생성 대기열 처리
  for (let i = regrowthQueue.length - 1; i >= 0; i--) {
    let entry = regrowthQueue[i];
    
    // 재생성 시간이 되면
    if (frameCount >= entry.regrowFrame) {
      let img = random(mossImages);
      let newMoss = new Moss(img, entry.pos);
      mosses.push(newMoss);
      regrowthQueue.splice(i, 1);
    }
  }


  // 3. 식물 업데이트 및 충돌 처리
  for (let i = 0; i < plants.length; i++) {
    let p = plants[i];
    
    p.update(lightObj);
    p.display();

    // 이끼와의 충돌 검사
    for (let m of mosses) {
      if (m.checkCollisionWithPlant(p)) {
        p.takeDamage(0.5);
      }
    }
  }


  // 4. 플레이어(Light) 업데이트
  lightObj.update();
  lightObj.display();
}



// 사방 끝면을 일정 간격으로 전부 채우는 초기 이끼 생성
function createInitialMossOnAllEdges() {
  let margin = 1;
  let stepX = 80; // 위/아래 변에서의 x 간격
  let stepY = 80; // 좌/우 변에서의 y 간격

  // 위쪽 면
  for (let x = 0; x <= width; x += stepX) {
    let pos = createVector(x, margin);
    let img = random(mossImages);
    mosses.push(new Moss(img, pos));
  }

  // 아래쪽 면
  for (let x = 0; x <= width; x += stepX) {
    let pos = createVector(x, height - margin);
    let img = random(mossImages);
    mosses.push(new Moss(img, pos));
  }

  // 왼쪽 면
  for (let y = 0; y <= height; y += stepY) {
    let pos = createVector(margin, y);
    let img = random(mossImages);
    mosses.push(new Moss(img, pos));
  }

  // 오른쪽 면
  for (let y = 0; y <= height; y += stepY) {
    let pos = createVector(width - margin, y);
    let img = random(mossImages);
    mosses.push(new Moss(img, pos));
  }
}



// Edge에만 이끼 생성
function createMossAtEdge() {
  let maxAttempts = 300;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 랜덤 면 선택 (0:위, 1:오른, 2:아래, 3:왼)
    let edge = floor(random(4));
    let pos;
    let margin = 1;
    
    if (edge === 0) pos = createVector(random(margin, width - margin), margin);
    else if (edge === 1) pos = createVector(width - margin, random(margin, height - margin));
    else if (edge === 2) pos = createVector(random(margin, width - margin), height - margin);
    else pos = createVector(margin, random(margin, height - margin));
    
    // 기존 moss들과 충분히 떨어져 있는지 체크
    let tooClose = false;
    for (let existingPos of mossStartPositions) {
      let d = dist(pos.x, pos.y, existingPos.x, existingPos.y);
      if (d < minMossDistance) {
        tooClose = true;
        break;
      }
    }
    
    if (tooClose) continue;
    
    mossStartPositions.push(pos.copy());
    let img = random(mossImages);
    let newMoss = new Moss(img, pos);
    mosses.push(newMoss);
    return;
  }
}



// 타이틀 화면
function drawTitleScreen() {
  textAlign(CENTER, CENTER);
  fill(0);
  textSize(40);
  text("OVERGROWN", width / 2, height / 2 - 20);
  
  textSize(16);
  if (frameCount % 60 < 30) fill(50); else fill(150);
  text("Click to Start", width / 2, height / 2 + 50);
}



// 엔딩 화면
function drawEndingScreen() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("ENDING", width / 2, height / 2 - 30);
  
  textSize(16);
  if (frameCount % 60 < 30) fill(255, 255, 0); else fill(150);
  text("Press 'R' to Return to Title", width / 2, height / 2 + 30);
}



// 마우스 입력
function mousePressed() {
  if (currentState === GAME_STATE.TITLE) {
    initGame();
    currentState = GAME_STATE.PLAY;
  } 
}



// 키보드 입력
function keyPressed() {
  if (key === 'd' || key === 'D') {
    debugMode = !debugMode;
  }
  
  if (currentState === GAME_STATE.ENDING) {
    if (key === 'r' || key === 'R') {
      currentState = GAME_STATE.TITLE;
    }
  }
}



// 디버그 정보
function drawDebugInfo() {
  fill(0, 255, 0);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  
  text(`FPS: ${int(frameRate())}`, 10, 10);
  text(`Time: ${int(gameTime / 60)}s`, 10, 30);
  text(`Mosses: ${mosses.length}`, 10, 70);
  text(`Regrowth Queue: ${regrowthQueue.length}`, 10, 90);
  
  let phaseName = ["Dawn", "Day", "Dusk", "Night"];
  text(`Phase: ${phaseName[timePhase]}`, 10, 50);

  stroke(255, 0, 0, 100);
  line(mouseX, 0, mouseX, height);
  line(0, mouseY, width, mouseY);
}
