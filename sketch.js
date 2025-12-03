const GAME_STATE = {
  TITLE: 0,
  PLAY: 1,
  ENDING: 2
};

// 게임의 현재 진행 단계 관리, 타이틀 화면에서 시작
let currentState = GAME_STATE.TITLE;
// 개발 편의를 위한 히트박스 및 정보 표시 모드 토글
let debugMode = false;

// 환경 변화 시스템 변수
let gameTime = 0;
// 하루가 지나가는 주기 설정, 60fps 기준 약 40초
const DAY_DURATION = 2400;
// 배경 색상 보간을 위한 현재 시간대 인덱스
// 0:새벽, 1:낮, 2:황혼, 3:밤
let timePhase = 0;

// 인게임 오브젝트 관리 컨테이너
let plants = [];
let mosses = [];
// 플레이어가 조작하는 광원 객체
let lightObj;

// 이미지 및 사운드 리소스 캐싱
let assets = {
  plant: [],
  moss: [],
  light: null
};

// p5.js 리소스 선행 로드 훅
function preload() {
  console.log("Resource Loading...");
  // 외부 에셋 로딩 필요 시 이곳에 추가
}

// 캔버스 초기화 및 절차적 텍스처 생성
function setup() {
  createCanvas(1024, 768);
  frameRate(60);

  // 에셋 로드 실패 시 게임이 멈추지 않도록 절차적으로 임시 텍스처 생성
  // 노이즈가 섞인 초록색 사각형을 만들어 이끼로 사용
  if (assets.moss.length === 0) {
    let tempMoss = createImage(64, 64);
    tempMoss.loadPixels();
    
    for (let i = 0; i < tempMoss.width; i++) {
      for (let j = 0; j < tempMoss.height; j++) {
        // 30% 확률로 픽셀을 찍어 거친 질감 표현
        if (random() > 0.3) {
          tempMoss.set(i, j, color(50, random(100, 200), 100, 100));
        } else {
          tempMoss.set(i, j, color(0, 0, 0, 0));
        }
      }
    }
    tempMoss.updatePixels();
    assets.moss.push(tempMoss);
  }

  // 게임 세션 시작
  initGame();
}

// 게임 상태 리셋 및 오브젝트 배치
// 타이틀에서 시작하거나 엔딩 후 재시작할 때 호출됨
function initGame() {
  // 이전 세션의 잔여 데이터 제거
  plants = [];
  mosses = [];
  gameTime = 0;

  // 플레이어 캐릭터인 Light 객체 생성
  // 텍스처가 없을 경우 내부적으로 기본 도형 렌더링 처리
  lightObj = new Light(width / 2, height / 2, null);

  // 상호작용 가능한 식물 오브젝트 배치
  // 화면 너비에 맞춰 균등한 간격으로 생성
  let spacing = width / 8;
  for (let i = 1; i <= 7; i++) {
    plants.push(new MockPlant(i * spacing, height));
  }

  // 배경 분위기를 담당하는 이끼 파티클 대량 생성
  for (let i = 0; i < 50; i++) {
    let img = random(assets.moss);
    mosses.push(new Moss(img));
  }
}

// p5.js 메인 렌더링 루프
function draw() {
  // 게임 상태에 따른 배경 렌더링 분기
  // 플레이 중일 때만 시간 흐름에 따른 하늘색 변화 적용
  if (currentState === GAME_STATE.PLAY) {
    updateTimeCycle();
  } else if (currentState === GAME_STATE.TITLE) {
    background(200);
  } else {
    // 엔딩 화면은 어두운 배경으로 몰입감 유도
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

// 시간 흐름에 따른 배경 색상 보간 처리
// 선형 보간 lerpColor 함수를 사용하여 부드러운 전환 구현
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

// 인게임 내 모든 오브젝트의 상태 업데이트 및 렌더링
function runGameLogic() {
  // 이끼 파티클 업데이트
  for (let i = 0; i < mosses.length; i++) {
    let m = mosses[i];
    m.update();
    m.display();

    // 화면 밖으로 나간 객체 재활용 로직
    // 메모리 효율을 위해 위치만 초기화하는 풀링 방식으로 변경 고려 필요
    if (m.isOffScreen()) {
      let img = random(assets.moss);
      mosses[i] = new Moss(img);
    }

    // 플레이어 광원과의 충돌 체크 및 상호작용
    if (m.checkCollision(lightObj)) {
      m.grow();
    }
  }

  // 식물 오브젝트 업데이트
  for (let i = 0; i < plants.length; i++) {
    let p = plants[i];
    p.display();
    
    // 식물 성장 로직, 현재 밸런스 조절을 위해 비활성화 상태
    if (p.checkCollision(lightObj)) {
      // p.grow(); 
    }
  }

  // 플레이어 입력 처리 및 위치 업데이트
  lightObj.update();
  lightObj.display();
}

// 타이틀 화면 UI 렌더링
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

// 엔딩 화면 UI 렌더링
function drawEndingScreen() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("ENDING", width / 2, height / 2 - 30);
  
  textSize(16);
  if (frameCount % 60 < 30) fill(255, 255, 0); else fill(150);
  text("Press 'R' to Return to Title", width / 2, height / 2 + 30);
}

// 전역 마우스 입력 처리
function mousePressed() {
  // 타이틀 화면에서 클릭 시 게임 시작 트리거
  if (currentState === GAME_STATE.TITLE) {
    initGame();
    currentState = GAME_STATE.PLAY;
  } 
}

// 전역 키보드 입력 처리
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

// 개발 편의를 위한 실시간 상태 정보 표시
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

// 프로토타이핑용 임시 식물 클래스
// 추후 정식 Plant 클래스로 기능 확장 및 분리 예정
class MockPlant {
  constructor(x, y) {
    this.x = x; 
    this.y = y; 
    // 충돌 판정용 히트박스 크기
    this.w = 60;
    this.h = 200;
  }

  display() {
    imageMode(CENTER); 
    noStroke(); 
    fill(50, 150, 50);
    // 중심점 보정하여 사각형 렌더링
    rect(this.x, this.y - this.h / 2, this.w, this.h);
    
    // 디버그 모드 시 히트박스 영역 시각화
    if (debugMode) {
      noFill(); 
      stroke(255, 0, 0);
      rect(this.x, this.y - this.h / 2, this.w, this.h);
    }
  }

  // AABB 방식의 단순 사각형 충돌 감지
  checkCollision(light) {
    if (light.x > this.x - this.w / 2 && light.x < this.x + this.w / 2 &&
      light.y > this.y - this.h && light.y < this.y) {
      return true;
    }
    return false;
  }
}