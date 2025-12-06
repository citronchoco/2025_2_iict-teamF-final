class Moss {
  constructor(img, startPos = null) {
    // 이끼가 사용할 이미지(텍스처)를 저장함
    this.img = img;

    // 시작 위치 설정함
    // startPos가 외부에서 주어지면 그 위치를 복사해서 사용함
    if (startPos) {
      startPos = startPos.copy();
    } else {
      // startPos가 없으면 화면 네 변 중 하나를 랜덤으로 골라 시작 위치를 생성함
      let edge = floor(random(4));  // 0: 위, 1: 오른쪽, 2: 아래, 3: 왼쪽
      let margin = 1;
      if (edge === 0) {
        // 위쪽 변에서 랜덤 x 위치를 선택함
        startPos = createVector(random(width), margin);
      } else if (edge === 1) {
        // 오른쪽 변에서 랜덤 y 위치를 선택함
        startPos = createVector(width - margin, random(height));
      } else if (edge === 2) {
        // 아래쪽 변에서 랜덤 x 위치를 선택함
        startPos = createVector(random(width), height - margin);
      } else {
        // 왼쪽 변에서 랜덤 y 위치를 선택함
        startPos = createVector(margin, random(height));
      }
    }

    // 시작 위치 저장함 (재생성용)
    // 나중에 이 이끼 덩어리가 전부 사라졌을 때 동일 위치에서 다시 자라게 하기 위해 원본을 보관함
    this.startPos = startPos.copy();

    // 이끼 점들 관리 배열 초기화함
    // 하나의 Moss 인스턴스는 여러 개의 작은 점(패치)들로 이루어져 있고, 그 점들을 이 배열에 저장함
    this.points = [];
    // 이 덩어리가 가질 수 있는 최대 패치 개수 설정함
    this.maxPoints = 800;
    // 새 패치를 분기시키는 기본 프레임 간격 설정함
    this.spawnInterval = 15;
    // 마지막으로 분기 시도를 한 프레임을 기록함
    this.lastSpawnFrame = 0;

    // 시작 위치에 0세대 패치를 하나 생성함
    this.addPoint(startPos.copy(), 0);

    // 전체 생애 진행도 초기화함
    // 이끼 덩어리 전체가 얼마나 성장했는지 나타내는 값으로 0에서 1 사이로 수렴함
    this.lifeProgress = 0;
    // 한 프레임마다 lifeProgress가 얼마나 증가할지 결정하는 속도값을 랜덤으로 설정함
    this.lifeSpeed = random(0.0005, 0.0008);
    
    // 빛 관련 참조를 초기화함
    // 현재 영향을 받는 빛 오브젝트(플레이어)를 저장함
    this.lightObj = null;
    // 어떤 위치(x, y)가 빛 범위 안에 있는지를 판정하는 함수 참조를 저장함
    this.isInLightRange = null;
  }



  addPoint(pos, generation) {
    // 이끼 패치의 기본 크기를 두 가지 중 하나로 랜덤 선택함
    let sizeOptions = [60, 100];
    let selectedSize = random(sizeOptions);
    
    // 하나의 이끼 점(패치)을 구성하는 데이터 구조를 생성함
    let p = {
      // 이 패치의 위치를 저장함
      pos: pos.copy(),
      // 몇 세대째 분기된 패치인지 저장함 (0은 루트, 1은 자식, 2는 손자 등)
      generation: generation,
      // 성장 진행도(0에서 1까지 증가하며 크기에 반영됨)를 저장함
      progress: 0,
      // 이 패치가 성장하는 속도를 저장함 (점마다 약간씩 다르게 랜덤 설정함)
      growthSpeed: random(0.02, 0.04),
      // 노이즈 애니메이션 오프셋을 저장함 (살짝 흔들리는 효과를 위해 사용함)
      noiseOff: random(1000),
      // 기본 크기(최대 크기를 결정함)를 저장함
      baseSize: selectedSize,
      // 투명도. 255에서 시작하고 빛에 맞으면 줄어들어 서서히 사라지게 됨
      alpha: 255,
      // 이 패치가 빛에 맞아 죽는 중인지 여부를 표시함. true이면 점점 투명해지고 결국 삭제됨
      dying: false
    };
    // 이 패치를 이끼 점 목록에 추가함
    this.points.push(p);
  }



  // overgrowMode는 화면을 많이 덮었을 때 폭주 모드 여부를 나타내는 플래그임
  update(lightObj, isInLightRange, overgrowMode = false) {
    // 현재 프레임에서 사용할 빛 오브젝트와 "빛 범위 안인지" 판정 함수를 저장함
    this.lightObj = lightObj;
    this.isInLightRange = isInLightRange;
    // 폭주 모드 상태를 저장함
    this.overgrowMode = overgrowMode;
    
    // 이끼 덩어리 전체 생애 진행도를 lifeSpeed만큼 증가시키고 0~1 범위로 제한함
    this.lifeProgress = constrain(this.lifeProgress + this.lifeSpeed, 0, 1);
    
    // 2초마다(60fps 기준 120프레임마다) maxPoints를 조금씩 늘려
    // 시간이 지날수록 더 많은 패치를 생성할 수 있게 함
    if (frameCount % 120 === 0) {
      this.maxPoints += 20;
      this.maxPoints = min(this.maxPoints, 1000);
    }

    // 시간대에 따른 성장 배율 설정함
    // timePhase는 전역 변수로 0: 새벽, 1: 낮, 2: 황혼, 3: 밤을 의미함
    let growthMultiplier = 1.0;
    if (timePhase === 1) {
      // 낮에는 이끼가 자라지 않도록 성장 배율을 0으로 설정함
      growthMultiplier = 0.0;
    } else if (timePhase === 0 || timePhase === 2) {
      // 새벽과 황혼에는 밤의 절반 속도로만 자라도록 0.5를 사용함
      growthMultiplier = 0.5;
    } else if (timePhase === 3) {
      // 밤에는 정상 속도로 자라도록 1.0을 사용함
      growthMultiplier = 1.0;
    }

    // overgrowMode가 켜졌을 때 성장 속도를 추가로 가속함
    if (overgrowMode) {
      // 예: 성장 속도를 6배로 가속함
      growthMultiplier *= 6.0;
    }

    // 이끼 패치 각각에 대해 성장과 애니메이션을 갱신함
    for (let p of this.points) {
      if (p.progress < 1) {
        // progress는 0에서 1까지 증가하며, baseSize와 함께 실제 크기에 반영됨
        // lifeProgress가 증가할수록 전체 성장 속도도 조금 가속되도록 함
        p.progress += p.growthSpeed * (0.7 + this.lifeProgress * 0.8) * growthMultiplier;
      }
      // noiseOff를 조금씩 증가시켜, 매 프레임마다 위치를 살짝 흔들어주는 노이즈 값을 바꿈
      p.noiseOff += 0.02;
      // dying/alpha 감소는 sketch.js에서 처리하므로 여기서는 건드리지 않음
    }

    // 시간대에 따른 분기 배율 설정함
    // 이 값은 "새 이끼 패치를 얼마나 자주 분기시킬지"에 영향을 줌
    let spawnMultiplier = 1.0;
    if (timePhase === 1) {
      // 낮에는 새로운 패치가 아예 생기지 않도록 0으로 설정함
      spawnMultiplier = 0.0;
    } else if (timePhase === 0 || timePhase === 2) {
      // 새벽과 황혼에는 분기 속도를 밤의 절반으로 줄임
      spawnMultiplier = 0.5;
    } else if (timePhase === 3) {
      // 밤에는 원래 설정된 속도로 분기함
      spawnMultiplier = 1.0;
    }

    // overgrowMode가 켜졌을 때 분기 속도도 추가로 가속함
    if (overgrowMode) {
      // 예: 분기 빈도를 3배로 가속함
      spawnMultiplier *= 3.0;
    }

    // spawnMultiplier가 0보다 클 때(새 패치를 허용할 때)만 분기를 시도함
    if (spawnMultiplier > 0) {
      // spawnInterval을 spawnMultiplier로 나누어
      // 시간대와 폭주 모드에 따라 분기 시도 간격을 늘리거나 줄이는 효과를 만듦
      if (frameCount - this.lastSpawnFrame > this.spawnInterval / spawnMultiplier) {
        this.lastSpawnFrame = frameCount;
        this.trySpawn();
      }
    }
  }



  trySpawn() {
    // 이미 최대 패치 수에 도달했다면 더 이상 분기하지 않음
    if (this.points.length >= this.maxPoints) return;
    
    // 부모 패치를 랜덤으로 하나 선택함
    let parent = random(this.points);
    if (!parent) return;
    
    // 세대 수가 너무 많아지면 무한 분기를 방지하기 위해 중단함
    if (parent.generation >= 50) return;
    
    // 부모 패치가 어느 정도 이상 자라야만 분기를 허용함
    if (parent.progress < 0.3 + 0.4 * random(1)) return;
    
    // 분기 확률 30% 설정함
    // random(1)이 0~1 사이 값을 내기 때문에, 30% 확률만 실제 분기가 일어남
    if (random(1) > 0.3) return;

    // 1~3개 자식 패치를 생성함
    let spawnCount = floor(random(1, 3));
    for (let i = 0; i < spawnCount; i++) {
      // 분기 도중에 maxPoints에 도달하면 더 이상 만들지 않음
      if (this.points.length >= this.maxPoints) break;
      
      // 화면 중앙 방향 계산함
      // 부모 패치에서 화면 중앙으로 향하는 벡터를 구함
      let centerX = width / 2;
      let centerY = height / 2;
      let toCenter = createVector(centerX - parent.pos.x, centerY - parent.pos.y);
      let centerAngle = toCenter.heading();
      
      // 중앙 방향 ± 45도 범위 안에서 랜덤한 각도를 선택함
      // 이렇게 하면 대체로 화면 중앙 쪽으로 이끼가 퍼지는 느낌이 남
      let angleVariation = random(-PI/4, PI/4);

      // 폭주 모드일 때는 각도 제한을 풀어 아무 방향으로나 뻗게 함
      let ang;
      if (this.overgrowMode) {
        ang = random(TWO_PI);
      } else {
        ang = centerAngle + angleVariation;
      }
      
      // 부모에서 얼마나 떨어진 위치에 자식을 둘지 거리 범위를 랜덤으로 정함
      let distR = random(20, 60);
      let offset = createVector(cos(ang), sin(ang)).mult(distR);
      let childPos = p5.Vector.add(parent.pos, offset);
      
      // 이 위치가 빛 범위 안이면, 빛에 의해 자라지 못한다고 보고 생성을 건너뜀
      if (this.lightObj && this.isInLightRange && 
          this.isInLightRange(childPos.x, childPos.y, this.lightObj)) {
        continue;
      }
      
      // 화면 밖으로 너무 멀리 나가면 성능과 연출을 위해 생성하지 않음
      if (childPos.x < -200 || childPos.x > width + 200 || 
          childPos.y < -200 || childPos.y > height + 200) {
        continue;
      }
      
      // 최종적으로 조건을 통과한 위치에 자식 패치를 추가함
      this.addPoint(childPos, parent.generation + 1);
    }
  }



  grow() {
    // 이끼 덩어리 전체 성장 속도를 가속시킴
    this.lifeSpeed *= 1.2;
    // 최대 패치 수 상한을 늘리되, 1800을 넘지 않도록 제한함
    this.maxPoints = min(1800, this.maxPoints + 120);
  }
  
  purify(light) {
    // sketch.js에서 dying/alpha 방식으로 정화 처리를 하고 있지만,
    // 이 함수는 빛 반경 안의 패치를 즉시 삭제하는 예전 방식을 남겨둠
    for (let i = this.points.length - 1; i >= 0; i--) {
      let p = this.points[i];
      let d = dist(p.pos.x, p.pos.y, light.x, light.y);
      let lightRadius = light.r || light.size || 80;
      
      if (d < lightRadius) {
        this.points.splice(i, 1);
      }
    }
  }



  isOffScreen() {
    // 이끼 패치들 중 하나라도 화면 내부에 있으면 false를 반환함
    for (let p of this.points) {
      if (p.pos.x >= 0 && p.pos.x < width && 
          p.pos.y >= 0 && p.pos.y < height) {
        return false;
      }
    }
    // 모든 패치가 화면 밖에 있으면 true를 반환함
    return true;
  }



  checkCollision(target) {
    // target이 없으면 충돌은 일어나지 않은 것으로 처리함
    if (!target) return false;
    for (let p of this.points) {
      // 이 패치의 현재 크기를 계산함
      let currentSize = p.baseSize * sqrt(p.progress);
      let myRadius = currentSize / 2;
      // target에 size가 있으면 그것을 지름으로 보고 반지름을 구함
      // 없으면 기본값 30을 사용함
      let targetRadius = target.size ? target.size / 2 : 30;
      // 패치 중심과 target 중심 사이 거리를 구함
      let d = dist(p.pos.x, p.pos.y, target.x, target.y);
      // 두 원의 중심 간 거리가 반지름 합보다 작으면 충돌한 것으로 판단함
      if (d < myRadius + targetRadius) return true;
    }
    return false;
  }
  
  checkCollisionWithPlant(plant) {
    // 식물은 직사각형 형태로 간주하고, 패치의 원과 겹치는지 검사함
    for (let p of this.points) {
      let currentSize = p.baseSize * sqrt(p.progress);
      let halfSize = currentSize / 2;
      
      // 패치의 원을 둘러싸는 정사각형과 식물의 사각형이 겹치는지 간단히 체크함
      if (p.pos.x + halfSize > plant.x - plant.w / 2 && 
          p.pos.x - halfSize < plant.x + plant.w / 2 &&
          p.pos.y + halfSize > plant.y - plant.h && 
          p.pos.y - halfSize < plant.y) {
        return true;
      }
    }
    return false;
  }



  display() {
    push();
    // 이끼 이미지의 기준점을 중심으로 맞춤
    imageMode(CENTER);
    
    for (let p of this.points) {
      // 화면에서 너무 크게 벗어난 패치는 그리지 않음
      if (p.pos.x < -50 || p.pos.x > width + 50 ||
          p.pos.y < -50 || p.pos.y > height + 50) {
        continue;
      }
      
      // 노이즈를 이용해 패치의 위치를 약간 흔들어 자연스러운 움직임을 만듦
      let jitterX = map(noise(p.noiseOff), 0, 1, -1, 1);
      let jitterY = map(noise(p.noiseOff + 50), 0, 1, -1, 1);
      let x = p.pos.x + jitterX;
      let y = p.pos.y + jitterY;
      
      // 성장 진행도에 따라 현재 크기를 계산함
      let currentSize = p.baseSize * sqrt(p.progress);
      
      // 세대가 높을수록, 그리고 덜 성장했을수록 더 투명하게 만듦
      let alpha = map(p.generation, 0, 50, 230, 120);
      alpha *= p.progress;
      // dying 상태라면 p.alpha 값이 줄어들면서 점점 더 투명해지도록 함
      alpha *= (p.alpha / 255);
      
      // 최종 계산된 alpha를 적용하고 이끼 이미지를 그림
      tint(255, alpha);
      image(this.img, x, y, currentSize, currentSize);
      noTint();
      
      // 디버그 모드에서는 각 패치의 baseSize를 화면에 표시함
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