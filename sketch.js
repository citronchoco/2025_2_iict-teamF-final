let plantImages;
let mossImages = [];

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

// 이미지 리소스 로드
function preload() {
  // Plant.js 로더 호출
  plantImages = loadPlantAssets();
  
  // 이끼 텍스처 2종 로드
  mossImages.push(loadImage('assets/moss/moss_a.png'));
  mossImages.push(loadImage('assets/moss/moss_b.png'));
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

  // 플레이어 생성
  lightObj = new Light(width / 2, height / 2, null);

  // 식물 배치
  let spacing = width / 8;
  for (let i = 1; i <= 7; i++) {
    plants.push(new Plant(i * spacing, height, plantImages));
  }

  // 이끼 배치
  // 로드된 2개의 이미지 중 랜덤 선택하여 전달
  for (let i = 0; i < 50; i++) {
    let img = random(mossImages);
    mosses.push(new Moss(img));
  }
}

// 메인 루프
function draw() {
  // 게임 상태에 따른 배경 렌더링 분기
  // 플레이 중일 때만 시간 흐름에 따른 하늘색 변화 적용
  if (currentState === GAME_STATE.PLAY) {
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
  
  // 전체 주기 내에서의 현재 시점 계산
  let cycle = gameTime % DAY_DURATION;
  // 진행률을 0.0에서 1.0 사이 값으로 정규화
  let phaseProgress = cycle / DAY_DURATION; 

  // 시간대별 키 컬러 정의
  let cDawn = color(60, 80, 120);
  let cDay = color(135, 206, 235);
  let cDusk = color(200, 100, 50);
  let cNight = color(20, 20, 40);

  let bgColor;
  
  // 진행률에 따라 4단계 시간대로 구분하여 인접한 두 색상을 섞음
  if (phaseProgress < 0.25) {
    timePhase = 0;
    // 새벽에서 낮으로 넘어가는 구간
    bgColor = lerpColor(cDawn, cDay, map(phaseProgress, 0, 0.25, 0, 1));
  } else if (phaseProgress < 0.5) {
    timePhase = 1;
    // 낮에서 황혼으로 넘어가는 구간
    bgColor = lerpColor(cDay, cDusk, map(phaseProgress, 0.25, 0.5, 0, 1));
  } else if (phaseProgress < 0.75) {
    timePhase = 2;
    // 황혼에서 밤으로 넘어가는 구간
    bgColor = lerpColor(cDusk, cNight, map(phaseProgress, 0.5, 0.75, 0, 1));
  } else {
    timePhase = 3;
    // 밤에서 다시 새벽으로 넘어가는 구간
    bgColor = lerpColor(cNight, cDawn, map(phaseProgress, 0.75, 1.0, 0, 1));
  }
  
  background(bgColor);
}

// 게임 로직
function runGameLogic() {
  // 이끼 업데이트
  for (let i = 0; i < mosses.length; i++) {
    let m = mosses[i];
    
    // 빛 범위 판별 함수 전달
    m.update(lightObj, (x, y, light) => {
      let d = dist(x, y, light.x, light.y);
      return d < (light.r || 60); 
    });
    
    m.display();

    // 화면 이탈 시 재배치
    if (m.isOffScreen()) {
      let img = random(mossImages);
      mosses[i] = new Moss(img);
    }
  }

  // 식물 업데이트
  for (let i = 0; i < plants.length; i++) {
    let p = plants[i];
    
    // 이끼 배열 전달하여 상호작용 처리
    p.update(lightObj, mosses);
    p.display();
  }

  // 플레이어 입력 처리 및 위치 업데이트
  lightObj.update();
  lightObj.display();
}

// 타이틀 화면
function drawTitleScreen() {
  textAlign(CENTER, CENTER);
  fill(0);
  textSize(40);
  text("OVERGROWN", width / 2, height / 2 - 20);
  
  textSize(16);
  // 사용자 입력을 유도하기 위한 텍스트 점멸 효과
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
  // 타이틀 화면에서 클릭 시 게임 시작 트리거
  if (currentState === GAME_STATE.TITLE) {
    initGame();
    currentState = GAME_STATE.PLAY;
  } 
}

// 키보드 입력
function keyPressed() {
  // 개발용 디버그 오버레이 토글
  if (key === 'd' || key === 'D') {
    debugMode = !debugMode;
  }
  
  // 엔딩 후 재시작 로직
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
  
  // 성능 모니터링을 위한 FPS 및 경과 시간
  text(`FPS: ${int(frameRate())}`, 10, 10);
  text(`Time: ${int(gameTime / 60)}s`, 10, 30);
  
  // 현재 배경 색상 상태 확인
  let phaseName = ["Dawn", "Day", "Dusk", "Night"];
  text(`Phase: ${phaseName[timePhase]}`, 10, 50);

  // 마우스 좌표 정렬 확인을 위한 가이드라인
  stroke(255, 0, 0, 100);
  line(mouseX, 0, mouseX, height);
  line(0, mouseY, width, mouseY);
}