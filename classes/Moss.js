class Moss {
  constructor(img) {
    this.img = img;

    // 시작 위치 설정 (화면 끝의 랜덤 edge)
    let edge = floor(random(4)); // 0:위, 1:오른쪽, 2:아래, 3:왼쪽
    let margin = 1;
    let startPos;
    if (edge === 0) {
      startPos = createVector(random(width), margin);          // 위쪽
    } else if (edge === 1) {
      startPos = createVector(width - margin, random(height)); // 오른쪽
    } else if (edge === 2) {
      startPos = createVector(random(width), height - margin); // 아래쪽
    } else {
      startPos = createVector(margin, random(height));         // 왼쪽
    }

    // 이끼 점들 관리 배열
    this.points = [];           // 각 점(포자)을 저장하는 배열
    this.maxPoints = 1200;      // 최대 점 개수 (이 이상 퍼지지 않음)
    this.spawnInterval = 2;     // 몇 프레임마다 분기 시도
    this.lastSpawnFrame = 0;    // 마지막 분기 시도 프레임

    // 최초 포자(세대 0) 생성
    this.addPoint(startPos.copy(), 0);

    // 전체 생애 진행도
    this.lifeProgress = 0;                // 0~1 사이, 시간에 따라 증가
    this.lifeSpeed = random(0.001, 0.0018); // 생애 진행 속도
    
    // 빛 관련 (sketch.js에서 전달받음)
    this.lightObj = null;           // Light 객체 참조
    this.isInLightRange = null;     // 좌표가 빛 범위 안인지 체크하는 함수
  }

  // 새로운 점(포자) 추가
  addPoint(pos, generation) {
    // 크기는 60 또는 100 중 랜덤 선택
    let sizeOptions = [60, 100];
    let selectedSize = random(sizeOptions);
    
    let p = {
      pos: pos.copy(),                    // 위치
      generation: generation,             // 세대 (0부터 시작, 분기할수록 증가)
      progress: 0,                        // 이 점의 성장 진행도 (0~1)
      growthSpeed: random(0.05, 0.09),   // 성장 속도
      noiseOff: random(1000),             // 노이즈 오프셋 (떨림 효과용)
      baseSize: selectedSize              // 60 또는 100
    };
    this.points.push(p);
  }

  // 매 프레임 업데이트 (sketch.js의 runGameLogic에서 호출)
  update(lightObj, isInLightRange) {
    // 빛 정보 저장 (분기할 때 빛 범위 체크용)
    this.lightObj = lightObj;
    this.isInLightRange = isInLightRange;
    
    // 전체 생애 진행도 증가
    this.lifeProgress = constrain(this.lifeProgress + this.lifeSpeed, 0, 1);
    
    // 시간이 지날수록 maxPoints 자동 증가 (끊임없이 퍼짐)
    if (frameCount % 60 === 0) {  // 1초마다
      this.maxPoints += 50;  // 최대 점 개수 증가
      this.maxPoints = min(this.maxPoints, 3000);  // 상한선
    }
    
    // 각 점의 성장 진행
    for (let p of this.points) {
      if (p.progress < 1) {
        // 생애 진행도에 따라 성장 속도 가속
        p.progress += p.growthSpeed * (0.7 + this.lifeProgress * 0.8);
      }
      p.noiseOff += 0.02; // 떨림 효과용 노이즈 업데이트
    }

    // 일정 간격마다 새로운 점 생성 시도
    if (frameCount - this.lastSpawnFrame > this.spawnInterval) {
      this.lastSpawnFrame = frameCount;
      this.trySpawn();
    }
  }

  // 새로운 점 생성 시도 (분기/확산)
  trySpawn() {
    // 최대 개수 도달 시 중단
    if (this.points.length >= this.maxPoints) return;
    
    // 기존 점 중 하나를 부모로 선택
    let parent = random(this.points);
    if (!parent) return;
    
    // ★ 세대 제한 대폭 늘림 (화면 중앙까지 도달하도록)
    if (parent.generation >= 25) return;
    
    // 부모가 어느 정도 자랐을 때만 분기
    if (parent.progress < 0.3 + 0.4 * random(1)) return;
    
    // 랜덤 확률로 분기 (50%)
    if (random(1) > 0.5) return;

    // 한 번에 2~5개 점 생성 시도
    let spawnCount = floor(random(2, 5));
    for (let i = 0; i < spawnCount; i++) {
      if (this.points.length >= this.maxPoints) break;
      
      // 부모 주변 랜덤 방향으로 새 점 위치 계산
      let ang = random(TWO_PI);
      // 분기 거리 늘림 (더 빨리 퍼지게)
      let distR = random(15, 45);
      let offset = createVector(cos(ang), sin(ang)).mult(distR);
      let childPos = p5.Vector.add(parent.pos, offset);
      
      // 빛 범위 안이면 생성하지 않음 (빛이 닿는 곳은 이끼가 못 퍼짐)
      if (this.lightObj && this.isInLightRange && 
          this.isInLightRange(childPos.x, childPos.y, this.lightObj)) {
        continue;
      }
      
      // 화면 밖 허용 범위 늘림 (가장자리에서도 계속 퍼지게)
      if (childPos.x < -100 || childPos.x > width + 100 || 
          childPos.y < -100 || childPos.y > height + 100) {
        continue;
      }
      
      // 조건을 통과하면 새 점 추가 (세대 +1)
      this.addPoint(childPos, parent.generation + 1);
    }
  }

  // 빛과 충돌 시 성장 가속 (현재는 사용 안 함, 나중을 위해 유지)
  grow() {
    this.lifeSpeed *= 1.2;
    this.maxPoints = min(1800, this.maxPoints + 120);
  }
  
  // 빛에 닿은 점들 제거 (정화)
  purify(light) {
    // 역순으로 순회하며 빛 범위 안의 점들 삭제
    for (let i = this.points.length - 1; i >= 0; i--) {
      let p = this.points[i];
      let d = dist(p.pos.x, p.pos.y, light.x, light.y);
      // 빛 범위 안이면 제거
      if (d < (light.size || 30)) {
        this.points.splice(i, 1);
      }
    }
  }

  // 화면 밖으로 완전히 나갔는지 체크
  isOffScreen() {
    // 점이 하나라도 화면 안에 있으면 false
    for (let p of this.points) {
      if (p.pos.x >= 0 && p.pos.x < width && 
          p.pos.y >= 0 && p.pos.y < height) {
        return false;
      }
    }
    // 모든 점이 화면 밖이면 true
    return true;
  }

  // 빛(Light)과의 충돌 체크
  checkCollision(target) {
    if (!target) return false;
    // 점 중 하나라도 빛과 겹치면 true
    for (let p of this.points) {
      let currentSize = p.baseSize * sqrt(p.progress);
      let myRadius = currentSize / 2;
      let targetRadius = target.size ? target.size / 2 : 30;
      let d = dist(p.pos.x, p.pos.y, target.x, target.y);
      if (d < myRadius + targetRadius) return true;
    }
    return false;
  }
  
  // 식물(Plant)과의 충돌 체크
  checkCollisionWithPlant(plant) {
    // 점 중 하나라도 식물의 사각형 히트박스 안에 있으면 true
    for (let p of this.points) {
      let currentSize = p.baseSize * sqrt(p.progress);
      let halfSize = currentSize / 2;
      
      // 원과 사각형의 충돌: 원의 중심이 확장된 사각형 범위 안에 있는지
      if (p.pos.x + halfSize > plant.x - plant.w / 2 && 
          p.pos.x - halfSize < plant.x + plant.w / 2 &&
          p.pos.y + halfSize > plant.y - plant.h && 
          p.pos.y - halfSize < plant.y) {
        return true;
      }
    }
    return false;
  }

  // 화면의 표시
  display() {
    push();
    imageMode(CENTER);
    
    // 각 점을 이미지로 그림 (클리핑 없음)
    for (let p of this.points) {
      // 노이즈 기반 떨림 효과
      let jitterX = map(noise(p.noiseOff), 0, 1, -1, 1);
      let jitterY = map(noise(p.noiseOff + 50), 0, 1, -1, 1);
      let x = p.pos.x + jitterX;
      let y = p.pos.y + jitterY;
      
      // 크기 계산: 60 또는 100 (baseSize)에서 성장 진행도에 따라
      let currentSize = p.baseSize * sqrt(p.progress);
      
      // 어두운 틴트 (세대 범위도 25로 조정)
      let alpha = map(p.generation, 0, 25, 215, 80);
      tint(255, alpha);
      
      // moss_texture.png 이미지 그리기 (클리핑 없이 바로 표시)
      image(this.img, x, y, currentSize, currentSize);
      
      noTint();
      
      // 디버그 모드: 각 점의 baseSize 표시
      if (typeof debugMode !== "undefined" && debugMode) {
        fill(255, 255, 0);
        noStroke();
        textSize(10);
        textAlign(CENTER, CENTER);
        text(int(p.baseSize), x, y);
      }
    }
    
    pop();
  }
}
