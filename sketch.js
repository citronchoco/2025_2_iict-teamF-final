let qrcodeDiv; // QR코드가 뜰 회색 박스

let hudBg, startBg, tutorialBg, overBg;
let kubulimFont;
let tutorialTitle, tutorialDescript, overDescript;
let lastPlayStateImg; // 마지막 플레이 화면을 저장할 변수


let plantAssets = { stems: [], leaves: [], flowers: [] };
let mossImages = [];
let lightImage = [];

let prevCoverage = 0;
let plantMossTimers = new Map();

const GAME_STATE = { TITLE: 0, PLAY: 1, ENDING: 2, TUTORIAL: 3, STORYLINE: 4 };

let storyDelayTimer = 120;
let isMaxCovered = false; // 이끼가 화면을 다 덮었는지 확인하는 플래그

// 설정값
const CFG = {
  // PLANT_COUNT: 15,       // 식물 15개
  MOSS_COUNT: 50,        // 이끼 50개
  DAY_DURATION: 2400,    // 하루 길이
  SAFE_TIME: 300         // 게임 시작 후 5초(300프레임) 동안 무적
};


// 상태 변수
let currentState = GAME_STATE.TITLE;
let debugMode = false;
let gameTime = 0;
let timePhase = 0;
let currentTimeTint = null; // 시간대 색조 (식물에 적용)


// 화면 샘플 그리드 기준 이끼가 안 덮인 칸들, 폭주 타깃
let emptySamplePositions = [];
let overgrowTargetPos = null;


// 폭주 연출을 한 번만 실행하기 위한 플래그 + 연출 프레임 카운트
let overgrowFinished = false;
let overgrowFrames = 0;      // 0이면 아직 연출 없음, 60이면 1초 연출


// 저장 알림 메시지 관련 변수
let showSaveMsg = false;
let saveMsgTimer = 0;
let notificationAlpha = 255;
let FADE_RATE = 6;
let notification_PARTICLE_COUNT = 20;
let particles = [];


// 오브젝트
let plants = [];
let mosses = [];
let lightObj;
let regrowthQueue = [];
let mossStartPositions = [];
const MAX_PLANTS = 10; // 식물 최대 개수 제한 (10개)
let seeds = [];       // 씨앗 객체 배열
let seedImage;
let ambiSound;        // 배경음
let crackSounds = []; // 부서지는 소리



// 캡쳐한 화면 서버 저장용 변수
let cnv;
const BUCKET_NAME = 'image';
let client;


// Base64 데이터를 파일 객체로 변환하는 헬퍼 함수
// const dataURLtoFile = (dataurl, fileName) => {
//   var arr = dataurl.split(","),
//     mime = arr[0].match(/:(.*?);/)[1],
//     bstr = atob(arr[1]),
//     n = bstr.length,
//     u8arr = new Uint8Array(n);

//   while (n--) {
//     u8arr[n] = bstr.charCodeAt(n);
//   }

//   return new File([u8arr], fileName, { type: mime });
// };



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


  // 씨앗 이미지 로드
  seedImage = loadImage('./assets/seed/seed_a.png');


  // 배경음 로드
  ambiSound = loadSound('./assets/sound/ambi.wav');


  // 부서지는 소리 로드
  for (let i = 1; i <= 5; i++) {
    crackSounds.push(loadSound(`./assets/sound/crack${i}.wav`));
  }


  // UI 및 배경 리소스 로드
  hudBg = loadImage('./assets/background/wall.png');
  startBg = loadImage('./assets/background/opening.png');
  tutorialBg = loadImage('./assets/background/tutorial.png');
  // overBg = loadImage('./assets/background/opening.jpg');


  kubulimFont = loadFont('./assets/font/BMKkubulimTTF.ttf');
}


function setup() {
  // 1. 전체 레이아웃을 잡을 컨테이너 생성
  let mainContainer = createDiv('');
  mainContainer.style('display', 'flex');       
  mainContainer.style('align-items', 'center'); 
  mainContainer.style('gap', '20px');           
  mainContainer.style('padding', '20px');       

  // 2. 게임 캔버스 생성 및 컨테이너에 넣기
  cnv = createCanvas(1024, 768);
  cnv.parent(mainContainer); // 캔버스를 mainContainer 안으로 이동

  // 우측 패널 생성
  let rightPanel = createDiv('');
  rightPanel.parent(mainContainer);
  rightPanel.style('display', 'flex');
  rightPanel.style('flex-direction', 'column');
  rightPanel.style('gap', '10px'); // 버튼과 박스 사이 간격

  // 튜토리얼 버튼
  let tutorialBtn = createButton('튜토리얼 다시보기');
  tutorialBtn.parent(rightPanel);
  tutorialBtn.style('padding', '10px 0');
  tutorialBtn.style('background-color', '#777'); // QR박스보다 살짝 밝게
  tutorialBtn.style('color', '#fff');
  tutorialBtn.style('border', 'none');
  tutorialBtn.style('border-radius', '10px');
  tutorialBtn.style('font-family', 'korea, sans-serif'); // 폰트는 상황에 맞게
  tutorialBtn.style('cursor', 'pointer');

  // 버튼 클릭 시 튜토리얼 화면으로 이동
  tutorialBtn.mousePressed(() => {
     currentState = GAME_STATE.TUTORIAL;
  });

  // 3. 우측 QR 코드 박스(회색 사각형) 생성
  qrcodeDiv = createDiv('저장 대기 중...'); // 초기 텍스트
  qrcodeDiv.parent(rightPanel); // 박스를 rightPanel 안으로 이동
  
  // --- CSS 스타일 적용  ---
  qrcodeDiv.style('width', '200px');          
  qrcodeDiv.style('height', '200px');         
  qrcodeDiv.style('background-color', '#555'); 
  qrcodeDiv.style('color', '#aaa');           
  qrcodeDiv.style('display', 'flex'); // 글자 중앙 정렬용
  qrcodeDiv.style('justify-content', 'center');
  qrcodeDiv.style('align-items', 'center');
  qrcodeDiv.style('border-radius', '10px');   

  frameRate(60);

  client = window.supabase.createClient(
    'https://hrygwxiqjlxizstgirps.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeWd3eGlxamx4aXpzdGdpcnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzg0NTIsImV4cCI6MjA4MDg1NDQ1Mn0.G_EW_3Hmi3kUN3P6zDQIsNuXTLHe1igduOLNYuNcJiY'
  );


  // 캔버스 내에서 우클릭 컨텍스트 메뉴를 완전히 차단
  cnv.elt.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });


  initGame();
}


function initGame() {
  plantMossTimers.clear();

  // 1. 변수 초기화
  plants = [];
  mosses = [];
  mossStartPositions = [];
  regrowthQueue = [];
  gameTime = 0;

  overgrowFinished = false;
  overgrowFrames = 0;

  prevCoverage = 0;
  isMaxCovered = false;
  storyDelayTimer = 120;
  lastPlayStateImg = null;

  showSaveMsg = false; // 여기서 다시 0으로 만듦
  saveMsgTimer = 0;


  // 2. 플레이어(Light) 생성
  lightObj = new Light(width / 2, height / 2, lightImage);


  // 3. 식물 생성 (화면 하단에 확실히 고정)
  // spawnPlants();


  // 4. 이끼 생성 (식물과 겹치지 않게 안전 배치)
  spawnInitialMosses();


  console.log("Game Initialized: Plants created ->", plants.length);
}


function draw() {
  // console.log(currentState)


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

      checkAndTransitionToStory();
      break;
    case GAME_STATE.STORYLINE:
      drawStoryLineScreen();
      break;
    case GAME_STATE.ENDING:
      drawEndingScreen();
      break;
  }


  // 폭주 연출이 끝났다면 엔딩으로 전환
  // if (overgrowFinished && overgrowFrames <= 0 && currentState === GAME_STATE.PLAY) {
  //   currentState = GAME_STATE.ENDING;
  // }
  drawSaveNotification();
  if (debugMode) drawDebugInfo();
}

// 화면 덮임 확인 및 딜레이 처리 함수
function checkAndTransitionToStory() {
  // 1. 이끼가 화면을 다 뒤덮었는지 확인
  if (overgrowFinished && overgrowFrames <= 0) {
    isMaxCovered = true; 
  }

  // 2. 다 덮였다면 2초 카운트다운 후 스토리라인 전환
  if (isMaxCovered) {
    storyDelayTimer--;
    
    // 2초(120프레임)가 지나면 상태 변경
    if (storyDelayTimer <= 0) {
      lastPlayStateImg = get();
      currentState = GAME_STATE.STORYLINE;
    }
  }
}


// 화면에서 이끼가 차지하는 대략적인 비율 계산함
function getMossCoverageRatio() {
  let cols = 25;
  let rows = 18;
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
  let coverage;
  if (frameCount % 10 === 0) {          // 10프레임마다 한 번만 계산
    coverage = getMossCoverageRatio();
  } else {
    coverage = prevCoverage || 0;      // 전 프레임 값 재사용
  }
  prevCoverage = coverage;

  let overgrowMode = coverage > 0.6;


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
  for (let i = plants.length - 1; i >= 0; i--) {
    let p = plants[i];


    p.update(lightObj, mosses);
    p.display();


    // 식물 체력이 0 이하면 배열에서 제거 -> 슬롯 확보
    if (p.isDead && p.debris.length === 0) {
      plants.splice(i, 1);
      console.log("Dead plant fully removed. Slot freed.");
    }
  }


  // 씨앗 배열을 업데이트하고, 착륙한 씨앗을 처리
  for (let i = seeds.length - 1; i >= 0; i--) {
    let s = seeds[i];
    let landed = s.update(); // 착륙 시 true 반환


    // 착륙 시 식물 생성 조건
    if (landed && !s.plantSpawned) { // s.plantSpawned 플래그를 사용하여 중복 생성 방지
      if (plants.length < MAX_PLANTS) {
        // 씨앗의 x좌표를 사용하여 바닥에 식물 생성
        plants.push(new Plant(s.x, height, plantAssets));
        s.plantSpawned = true; // 플래그 설정
        // console.log(`Plant grown from seed at x=${s.x}.`);
      }
    }


    s.display();


    // 착륙 후 1초(60프레임)가 지나고 식물이 생성된 후 배열에서 제거 (식물 생성 후 사라지도록)
    if (s.landed && s.plantSpawned && frameCount > s.startTime + 60) {
      seeds.splice(i, 1);
    }
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
      // 1) 이 식물이 어느 이끼와라도 겹치는지 확인
      let inContact = false;
      for (let m of mosses) {
        if (m.checkCollisionWithPlant(p)) {
          inContact = true;
          break;
        }
      }

      // 2) 겹쳐 있으면 누적 시간 증가, 아니면 리셋
      let key = p.x;                        // 식별자 없으니 x좌표를 키로 사용
      let t = plantMossTimers.get(key) || 0;

      if (inContact) {
        t += 3 / 60;                        // 프레임당 약 3/60초 누적
        plantMossTimers.set(key, t);

        if (t >= 3.0) {                     // 3초 동안 계속 닿아 있으면
          p.takeDamage(1.0);                // 한 번에 큰 데미지 (체력 거의 0)
          plantMossTimers.set(key, 0);      // 다시 0부터 누적 (연속 처형 방지)
        }
      } else {
        plantMossTimers.set(key, 0);        // 떨어지면 시간 리셋
      }
    }
  }


    if (m.points.length === 0) {
      scheduleRegrowth(m.startPos);
      mosses.splice(i, 1);
    }
  }


  if (overgrowMode && overgrowTargetPos) {
    if (frameCount % 3 === 0) {
      forceOvergrowTowardTarget();
    }
  }


  lightObj.display();


  // --- 4. 이끼 재생성 큐 처리 ---
  processRegrowthQueue();


  // coverage가 0.9을 넘는 순간: full-cover Moss 생성 + 1초 연출 준비
  if (coverage > 0.9 && !overgrowFinished) {
    // console.log('OVERGROW TRIGGER', coverage);
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


  imageMode(CORNER);
  image(hudBg, 0, 0, 1024, 768);


  let colors = [
    color(18, 100, 220, 100),   // 새벽
    color(0, 0, 0, 0), // 낮
    color(255, 100, 0, 120),  // 황혼
    color(20, 20, 70, 200)     // 밤
  ];


  timePhase = floor(t * 4);
  let nextPhase = (timePhase + 1) % 4;
  let localT = (t * 4) % 1;


  let bgTint = lerpColor(colors[timePhase], colors[nextPhase], localT);
  background(bgTint);
  
  // 식물에 적용할 시간대 색조 계산
  currentTimeTint = color(red(bgTint), green(bgTint), blue(bgTint), alpha(bgTint));
}



// Helper Functions


// function spawnPlants() {
//   let spacing = width / (CFG.PLANT_COUNT + 1);
//   for (let i = 1; i <= CFG.PLANT_COUNT; i++) {
//     plants.push(new Plant(i * spacing, height -10, plantAssets));
//   }
// }


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
  let edge = floor(random(3));
  let m = 20;
  if (edge === 0) return createVector(random(m, width - m), m);
  if (edge === 1) return createVector(width - m, random(m, height - m));
  return createVector(m, random(m, height - m));
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


  textFont(kubulimFont);
  strokeWeight(1);
  fill(255);
  textSize(30);
  textAlign(CENTER, CENTER);
  text(`START`, 345, 550);
  text(`TUTORIAL`, 679, 550);
  textSize(60);
  text(`빛과 그림자의 정원`, 512, 300);


  let mouseOverStart = pow(mouseX - 345, 2) / pow(100, 2) + pow(mouseY - 555, 2) / pow(35, 2);
  let mouseOverTutorial = pow(mouseX - 679, 2) / pow(100, 2) + pow(mouseY - 555, 2) / pow(35, 2);


  if (mouseOverStart < 1) {
    noStroke();
    fill(250, 210, 140, 100);
    ellipse(345, 555, 200, 70);
    fill(255);
    strokeWeight(1);
    textSize(30);
    text(`START`, 345, 550);
  }
  if (mouseOverTutorial < 1) {
    noStroke();
    fill(250, 210, 140, 100);
    ellipse(679, 555, 200, 70);
    fill(255);
    strokeWeight(1);
    textSize(30);
    text(`TUTORIAL`, 679, 550);
  }
}


function drawTutorialScreen() {
  image(tutorialBg, 0, 0, 1024, 768);


  tutorialTitle = `빛과 그림자의 정원`;
  tutorialDescript = `40초마다 새벽-낮-황혼-밤 순으로 시간이 흘러갑니다.\n 마우스를 통해 다양한 식물을 조종해 자유롭게 정원을 꾸밀 수 있습니다. \n 우클릭을 하면 새로운 씨앗이 생성됩니다. \n 밤 시간에는 조종이 불가하며 이끼가 랜덤하게 생성됩니다.\n 중간에 언제든지 스페이스바를 눌러 정원의 모습을 저장하실 수 있습니다.`;


  textFont(kubulimFont);
  textAlign(CENTER, CENTER);
  strokeWeight(3);
  fill(255);
  textSize(40);
  textLeading(30);
  text(tutorialTitle, 512, 220);
  strokeWeight(1);
  textSize(25);
  textLeading(70);
  text(tutorialDescript, 512, 400);
  textSize(30);
  text(`START`, 720, 585);


  let mouseOverStart2 = pow(mouseX - 720, 2) / pow(100, 2) + pow(mouseY - 570, 2) / pow(35, 2);
  if (mouseOverStart2 < 1) {
    noStroke();
    fill(223, 169, 72, 100);
    ellipse(720, 590, 200, 70);
    fill(255)
    strokeWeight(1)
    textSize(30);
    text(`START`, 720, 585);
  }
}

function drawStoryLineScreen(){
  imageMode(CORNER);
  // 캡처해둔 마지막 플레이 화면 그리기
  if (lastPlayStateImg) {
    image(lastPlayStateImg, 0, 0, 1024, 768);
  } else {
    background(0); // 만약 이미지가 없다면 검은색
  }

  // 내용은 아직 미정이라 하셨으므로 기존과 동일하게 처리하되 함수명만 분리
  let storyText = `스토리라인이 나옵니다...\n(재시작하려면 R을 누르세요)`;

  textSize(40);
  fill(255);
  textFont(kubulimFont);
  textAlign(CENTER, CENTER);
  text(storyText, 512, 384);

  // 필요하다면 여기에 스토리 관련 이미지나 버튼 추가
}

function drawEndingScreen() {
  image(overBg, 0, 0, 1024, 768);


  overDescript = `PRESS    R    TO RESTART`;


  textSize(40);
  fill(255);
  textFont(kubulimFont);
  textAlign(CENTER, CENTER);
  text(overDescript, 512, 384);


  fill(220, 220, 220, 100);
  stroke(235, 217, 148);
  ellipse(449, 391, 90, 90);
}


function mouseClicked() {
  // 마우스 우클릭이 아닌 경우, 원래 로직대로 처리 (LEFT 버튼 등)
  if (mouseButton !== RIGHT) {
    // 기존 마우스 왼쪽 버튼 클릭 로직은 mousePressed()에 있으므로 그대로 유지
    return true;
  }


  // 이 함수에서는 RIGHT 버튼에 대한 추가적인 처리를 하지 않고 바로 종료
  return true;
}


function mousePressed() {
  if (mouseButton === RIGHT) {
    if (currentState === GAME_STATE.PLAY) {
      if (plants.length + seeds.length < MAX_PLANTS) {
        seeds.push(new Seed(mouseX, mouseY, seedImage));
        // console.log(`Plant spawned at x=${mouseX}. Total plants: ${plants.length}/${MAX_PLANTS}`);
      } else {
        // console.log(`MAX_PLANTS (${MAX_PLANTS}) limit reached.`);
      }
    }
    // 우클릭 시 브라우저 컨텍스트 메뉴를 막기 위해 false를 리턴
    return false;
  }


  if (currentState === GAME_STATE.TITLE) {
    let checkStart = pow(mouseX - 345, 2) / pow(100, 2) + pow(mouseY - 555, 2) / pow(35, 2);
    let checkTutorial = pow(mouseX - 679, 2) / pow(100, 2) + pow(mouseY - 555, 2) / pow(35, 2);


    if (checkStart < 1) {
      initGame();
      currentState = GAME_STATE.PLAY;
      // 배경음 루프 재생 시작
      if (ambiSound && ambiSound.isLoaded() && !ambiSound.isPlaying()) {
        ambiSound.setVolume(0.25);
        ambiSound.loop();
      }
    } else if (checkTutorial < 1) {
      currentState = GAME_STATE.TUTORIAL;
    }
  }
  else if (currentState === GAME_STATE.TUTORIAL) {
    let checkStart2 = pow(mouseX - 720, 2) / pow(100, 2) + pow(mouseY - 570, 2) / pow(35, 2);
    if (checkStart2 < 1) {
      initGame();
      currentState = GAME_STATE.PLAY;
      // 배경음 루프 재생 시작
      if (ambiSound && ambiSound.isLoaded() && !ambiSound.isPlaying()) {
        ambiSound.setVolume(0.25);
        ambiSound.loop();
      }
    }
  }
}


function keyPressed() {
  if (key === 'd' || key === 'D') debugMode = !debugMode;

  if (currentState === GAME_STATE.STORYLINE && (key === 'r' || key === 'R' || key ==='ㄱ')) {
    currentState = GAME_STATE.TITLE; // 혹은 바로 initGame() 후 PLAY
    initGame(); 
  }

  if (currentState === GAME_STATE.ENDING && keyCode === 82) {
    currentState = GAME_STATE.TITLE;
    // console.log(key);
  }

  if (currentState === GAME_STATE.PLAY) {
    // 게임 중 ESC 누르면 스토리라인으로 즉시 이동
    if (keyCode === ESCAPE) {
      lastPlayStateImg = null;
      currentState = GAME_STATE.STORYLINE;
    }

    // 스페이스바 캡처 로직
    if (key === ' ' || keyCode === 32) {
      uploadScreenshot();
    }
  }

  // if (key === ' ' || keyCode === 32) {
  //   if (currentState === GAME_STATE.PLAY) {
  //     uploadScreenshot();
  //   }
  // }
}


async function uploadScreenshot() {
  // 1. 현재 캔버스를 Base64 데이터로 변환 (기본값 PNG)
  // let base64Image = cnv.canvas.toDataURL("image/png");

  // 파일명 만들기
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0'); 
  const dd = String(now.getDate()).padStart(2, '0');      
  const hh = String(now.getHours()).padStart(2, '0');     
  const min = String(now.getMinutes()).padStart(2, '0');  
  const ss = String(now.getSeconds()).padStart(2, '0');   


  // 2. 파일명 생성 (중복 방지용 시간 추가)
  const fileName = `public/garden_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.jpg`;
  // console.log("Uploading...", fileName);


  cnv.elt.toBlob(async (blob) => {

    // 3. Supabase에 바로 blob 업로드
    try {
      const { data, error } = await client
        .storage
        .from(BUCKET_NAME)
        .upload(fileName, blob, {
          contentType: 'image/jpeg', 
          cacheControl: "3600",
          upsert: false
        });

      if (error) {
        console.error("Upload Error:", error);
        alert("업로드 실패: " + error.message);
      } else {
        // 성공 시 알림 처리
        particles = [];
        createNotificationParticles(width / 2, 80, 500, 60);
        notificationAlpha = 255;
        showSaveMsg = true;
        saveMsgTimer = 180;

        // 2. QR 코드 영역 스타일 변경 (회색 -> 흰색)
        qrcodeDiv.style('background-color', 'white'); 
        qrcodeDiv.style('color', 'black');
        qrcodeDiv.html(''); 

        // 3. 실제 QR 코드 생성
        const publicURL = `https://hrygwxiqjlxizstgirps.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
        
        // QR 생성 (div 크기에 맞춤)
        new QRCode(qrcodeDiv.elt, {
          text: publicURL,
          width: 180,  // 박스가 200px이므로 약간 작게
          height: 180,
          colorDark : "#000000",
          colorLight : "#ffffff",
          correctLevel : QRCode.CorrectLevel.H
        });
      }
    } catch (err) {
      console.error("Unexpected Error:", err);
    }
  }, 'image/jpeg', 0.8); // 0.8은 퀄리티 (0~1 사이값)

  // // 3. 헬퍼 함수를 사용해 파일 객체로 변환
  // const imageFile = dataURLtoFile(base64Image, fileName);

  // // 4. Supabase에 업로드
  // try {
  //   const { data, error } = await client
  //     .storage
  //     .from(BUCKET_NAME)
  //     .upload(fileName, imageFile, {
  //       contentType: 'image/png',
  //       cacheControl: "3600",
  //       upsert: false
  //     });

  //   if (error) {
  //     console.error("Upload Error:", error);
  //     alert("업로드 실패: " + error.message);
  //   } else {
  //     // console.log("Upload Success:", data);
  //     alpha = 255;
  //     showSaveMsg = true;
  //     saveMsgTimer = 180;

  //     particles = []; 
  //     createNotificationParticles(width / 2, 80, 500, 60);
  //   }
  // } catch (err) {
  //   console.error("Unexpected Error:", err);
  // }
}


function drawSaveNotification() {
  // 알림 그리기
  if (showSaveMsg) {

    drawFadingNotification();
    if (particles.length > 0) {
      drawNotificationParticles();
    }
  }


  // 2. 타이머 및 투명도 조절 로직
  if (saveMsgTimer > 0) {
    // 타이머가 남아있으면 시간만 줄이고, 투명도는 줄이지 마!
    saveMsgTimer--;
    notificationAlpha = 255;
  } else {
    // 타이머가 0이 되면 그때부터 서서히 사라지기 시작
    notificationAlpha = max(0, notificationAlpha - FADE_RATE);
  }

  // 3. 완전히 투명해지면 종료
  if (notificationAlpha <= 0 && saveMsgTimer <= 0) {
    showSaveMsg = false;
    particles = [];
  }

  // // 투명도 감소 및 종료 확인
  // if (showSaveMsg) {
  //   // 투명도 감소
  //   alpha = max(0, alpha - FADE_RATE);

  //   // 투명도가 0이 되면 알림 표시를 완전히 끔
  //   if (alpha <= 0) {
  //     showSaveMsg = false;
  //     particles = [];
  //   }
  // }
}

function drawFadingNotification() {
  // 투명도가 0보다 클 때만 그리기
  if (notificationAlpha > 0) {
    // 회색 반투명 직사각형
    rectMode(CENTER);
    noStroke();
    fill(220, 220, 220, notificationAlpha * 0.4); // 배경의 최대 투명도는 255가 아닌 100으로 유지
    rect(width / 2, 80, 500, 60, 20);


    // 텍스트
    textAlign(CENTER, CENTER);
    textFont(kubulimFont);
    textSize(24);
    // fill(255) 대신 fill(255, notificationAlpha)로 텍스트도 같이 투명하게
    fill(255, notificationAlpha);
    text("정원의 모습이 서버에 저장되었습니다!", width / 2, 80);
  }
}


function drawNotificationParticles() {
  for (let i = 0; i < particles.length; i++) {
    console.log('particle:', particles[i]);  // 이게 뭔지 확인
    console.log('has updated display?', typeof particles[i].display);  // 함수인지 확인
    particles[i].update();
    particles[i].display();
  }
}


function createNotificationParticles(centerX, centerY, w, h) {


  for (let i = 0; i < notification_PARTICLE_COUNT; i++) {
    let x, y;

    // 0=Top, 1=Bottom, 2=Left, 3=Right 중 한 변을 랜덤하게 선택
    let side = floor(random(4));

    if (side === 0) { // Top edge
      x = random(centerX - w / 2, centerX + w / 2);
      y = centerY - h / 2;
    } else if (side === 1) { // Bottom edge
      x = random(centerX - w / 2, centerX + w / 2);
      y = centerY + h / 2;
    } else if (side === 2) { // Left edge
      x = centerX - w / 2;
      y = random(centerY - h / 2, centerY + h / 2);
    } else { // Right edge (side === 3)
      x = centerX + w / 2;
      y = random(centerY - h / 2, centerY + h / 2);
    }

    let p = new SaveEffect(x, y)
    console.log('Created particle:', p);  // 생성 직후 확인
    console.log('Has display?', typeof p.display);  // 메서드 확인
    particles.push(p);

    console.log('Total particles:', particles.length);
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


  for (let p of plants) {
    noFill();
    stroke(255, 0, 0);
    strokeWeight(2);
    rectMode(CENTER);
    rect(p.x, p.y - 20, 20, 20);
  }
}
