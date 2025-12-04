// Plant.js

// --- 에셋 경로 상수 ---
const PLANT_ASSETS = {
  stems: [
    'assets/plant/stem_01.png',
    'assets/plant/stem_02.png',
    'assets/plant/stem_03.png'
  ],
  leaves: [
    'assets/plant/leaf_01.png',
    'assets/plant/leaf_02.png',
    'assets/plant/leaf_03.png'
  ],
  flowers: [
    'assets/plant/flower_01.png',
    'assets/plant/flower_02.png'
  ]
};

// --- 에셋 크기 정보 (스케일 계산용) ---
const ASSET_SIZES = {
  stems: [
    { w: 20, h: 200 },
    { w: 20, h: 250 },
    { w: 20, h: 400 }
  ],
  leaves: [
    { w: 80, h: 160 },
    { w: 50, h: 230 },
    { w: 130, h: 270 }
  ],
  flowers: [
    { w: 180, h: 180 },
    { w: 250, h: 250 }
  ]
};

// --- 기본 설정 (확장 가능) ---
const DEFAULT_PLANT_CONFIG = {
  // 성장 관련
  growthRate: 0.0008, // 높을수록 빨리 큼
  maxGrowth: 1.0,
  baseGrowthSpeed: 0.3,
  lightGrowthMultiplier: 2.5,
  
  // 줄기 관련
  maxSegments: 25, // 줄기 마디의 최대 개수 (길이 제한)
  segmentLength: 20,
  segmentGrowthSpeed: 0.8,
  angleVariation: 20,
  upwardTendency: 0.15,
  lightSeekingStrength: 0.25, // 빛을 따라가는 정도(높을수록 빛을 향히 급격히 휨)
  
  // 분기 관련 (담쟁이 스타일)
  branchEnabled: false,
  branchChance: 0.08,
  maxBranches: 3,
  
  // 잎 관련
  leafSpawnInterval: 3, // 줄기 몇 마디마다 잎이 생길지 결정
  maxLeaves: 10,
  leafGrowthSpeed: 0.025,
  leafSwayAmount: 8,
  
  // 꽃 관련
  flowerThreshold: 0.8, // 성장률이 얼마일 때 꽃이 피기 시작할지
  flowerGrowthSpeed: 0.018,
  
  // 체력 관련
  maxHealth: 100,
  mossDamagePerFrame: 0.3, // 이끼와 닿았을 때 체력이 깎이는 속도
  healthRegenRate: 0.05,
  healthRegenLightBonus: 0.1,
  
  // 시각 효과
  grayscaleOnDeath: true,
  swayEnabled: true,
  
  // 단계 전환 기준 (growth 값)
  stageThresholds: [0.0, 0.25, 0.55, 0.8] // 식물 이미지가 바뀌는 성장 단계의 기준점
};


// ============================================
// Debris 클래스: 떨어지는 조각 파편
// ============================================
class Debris {
  constructor(img, x, y, angle = 0, config = {}) {
    this.img = img;
    this.x = x;
    this.y = y;
    this.angle = angle;
    
    // 물리
    this.vx = config.vx !== undefined ? config.vx : random(-2.5, 2.5);
    this.vy = config.vy !== undefined ? config.vy : random(-3, -0.5);
    this.angularVel = config.angularVel !== undefined ? config.angularVel : random(-6, 6);
    this.gravity = 0.18;
    this.friction = 0.92;
    this.bounceFactor = 0.25;
    
    // 수명
    this.life = config.life !== undefined ? config.life : 140;
    this.maxLife = this.life;
    
    // 시각 효과
    this.grayscale = config.grayscale !== undefined ? config.grayscale : true;
    this.scale = config.scale !== undefined ? config.scale : 1.0;
    this.fadeStart = 0.3;
    
    // 크기 정보 (이미지 없을 때 대비)
    this.width = config.width || 20;
    this.height = config.height || 20;
  }
  
  update() {
    // 중력 적용
    this.vy += this.gravity;
    
    // 공기 저항
    this.vx *= 0.995;
    this.angularVel *= 0.98;
    
    // 위치 업데이트
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.angularVel;
    
    // 수명 감소
    this.life--;
    
    // 바닥 충돌
    const groundY = height - 45;
    if (this.y > groundY) {
      this.y = groundY;
      this.vy *= -this.bounceFactor;
      this.vx *= this.friction;
      this.angularVel *= 0.5;
      
      // 거의 멈추면 완전히 정지
      if (abs(this.vy) < 0.5) {
        this.vy = 0;
      }
    }
    
    // 화면 좌우 경계
    if (this.x < 0 || this.x > width) {
      this.vx *= -0.5;
      this.x = constrain(this.x, 0, width);
    }
  }
  
  display() {
    push();
    translate(this.x, this.y);
    rotate(radians(this.angle));
    
    // 투명도 계산 (수명 끝날 때 페이드아웃)
    let lifeRatio = this.life / this.maxLife;
    let alpha = lifeRatio < this.fadeStart 
      ? map(lifeRatio, 0, this.fadeStart, 0, 255)
      : 255;
    
    imageMode(CENTER);
    
    if (this.img) {
      // 흑백 처리
      if (this.grayscale) {
        tint(100, 100, 100, alpha);
      } else {
        tint(255, alpha);
      }
      
      image(this.img, 0, 0, 
            this.img.width * this.scale, 
            this.img.height * this.scale);
    } else {
      // 이미지 없으면 사각형으로 대체
      if (this.grayscale) {
        fill(100, 100, 100, alpha);
      } else {
        fill(80, 120, 80, alpha);
      }
      noStroke();
      rectMode(CENTER);
      rect(0, 0, this.width * this.scale, this.height * this.scale);
    }
    
    noTint();
    pop();
  }
  
  isDead() {
    return this.life <= 0;
  }
}


// ============================================
// Segment 클래스: 줄기의 한 조각
// ============================================
class Segment {
  constructor(parentEndX, parentEndY, angle, length, img, index = 0) {
    // 시작점 (부모 세그먼트의 끝점)
    this.startX = parentEndX;
    this.startY = parentEndY;
    
    // 방향과 길이
    this.angle = angle;
    this.length = length;
    this.targetLength = 20;
    this.index = index;
    
    // 이미지와 슬라이스 정보
    this.img = img;
    this.sliceY = 0;
    this.sliceHeight = 20;
    
    // 흔들림 효과
    this.swayOffset = random(1000);
    this.swaySpeed = random(0.015, 0.025);
    this.swayAmount = random(1.5, 3);
    this.currentSway = 0;
    
    // 성장 애니메이션
    this.growthProgress = 0;
    this.isGrowing = true;
  }
  
  // 끝점 좌표 계산
  getEndX() {
    return this.startX + cos(radians(this.angle + this.currentSway)) * this.length;
  }
  
  getEndY() {
    return this.startY + sin(radians(this.angle + this.currentSway)) * this.length;
  }
  
  // 흔들림 없는 실제 끝점 (자식 세그먼트 연결용)
  getRealEndX() {
    return this.startX + cos(radians(this.angle)) * this.length;
  }
  
  getRealEndY() {
    return this.startY + sin(radians(this.angle)) * this.length;
  }
  
  // 시작점 업데이트
  updateStart(newX, newY) {
    this.startX = newX;
    this.startY = newY;
  }
  
  update(lightObj, config) {
    // 성장 처리
    if (this.isGrowing && this.length < this.targetLength) {
      this.length += config.segmentGrowthSpeed;
      this.length = min(this.length, this.targetLength);
      
      if (this.length >= this.targetLength) {
        this.isGrowing = false;
      }
    }
    
    // 빛을 향해 휘어지기
    if (lightObj) {
      let endX = this.getRealEndX();
      let endY = this.getRealEndY();
      let distToLight = dist(endX, endY, lightObj.x, lightObj.y);
      
      if (distToLight < lightObj.r * 1.5) {
        let angleToLight = degrees(atan2(lightObj.y - endY, lightObj.x - endX));
        let angleDiff = this._angleDelta(this.angle, angleToLight);
        
        let influence = map(distToLight, 0, lightObj.r * 1.5, 
                           config.lightSeekingStrength, 0.02);
        this.angle += angleDiff * influence * 0.1;
      }
    }
    
    // 위쪽으로 향하려는 경향
    let diffToUp = this._angleDelta(this.angle, -90);
    this.angle += diffToUp * config.upwardTendency * 0.05;
    
    // 각도 제한 (-170 ~ -10, 대략 위쪽 반원)
    this.angle = constrain(this.angle, -170, -10);
    
    // 흔들림 업데이트
    if (config.swayEnabled) {
      this.swayOffset += this.swaySpeed;
      this.currentSway = sin(this.swayOffset) * this.swayAmount;
    }
  }
  
  display() {
    push();
    translate(this.startX, this.startY);
    rotate(radians(this.angle + 90 + this.currentSway));
    
    if (this.img) {
      imageMode(CORNER);
      
      // 줄기 이미지의 일부분만 잘라서 사용
      let srcX = 0;
      let srcY = this.sliceY;
      let srcW = this.img.width;
      let srcH = min(this.sliceHeight, this.img.height - this.sliceY);
      
      // 목적지: 세그먼트 길이만큼
      let dstX = -this.img.width / 2;
      let dstY = 0;
      let dstW = this.img.width;
      let dstH = this.length;
      
      image(this.img, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH);
    } else {
      // 이미지 없으면 선으로 대체
      stroke(70, 100, 50);
      strokeWeight(6);
      strokeCap(ROUND);
      line(0, 0, 0, this.length);
    }
    
    pop();
    
    // 디버그: 세그먼트 연결점 표시
    if (typeof debugMode !== 'undefined' && debugMode) {
      fill(255, 0, 0);
      noStroke();
      circle(this.startX, this.startY, 4);
    }
  }
  
  _angleDelta(from, to) {
    let d = (to - from + 540) % 360 - 180;
    return d;
  }
}


// Leaf 클래스: 줄기에 붙는 잎
class Leaf {
  constructor(attachSegment, side, img, size, stage = 0) {
    this.segment = attachSegment;
    this.side = side;
    this.img = img;
    this.stage = stage;
    
    // 크기
    this.baseWidth = size.w;
    this.baseHeight = size.h;
    this.scale = 0.15;
    this.targetScale = 1.0;
    this.maxScale = 1.0;
    
    // 부착 위치 (세그먼트 길이의 비율)
    this.attachPoint = random(0.4, 0.85);
    
    // 각도
    this.baseAngle = this.side * random(35, 70);
    this.tilt = random(-8, 8);
    
    // 흔들림
    this.swayOffset = random(1000);
    this.swaySpeed = random(0.02, 0.04);
    this.swayAmount = 6;
    this.currentSway = 0;
    
    // 상태
    this.health = 1.0;
    this.isWilting = false;
  }
  
  // 부착 지점의 월드 좌표
  getAttachPosition() {
    if (!this.segment) return { x: 0, y: 0 };
    
    let t = this.attachPoint;
    let x = lerp(this.segment.startX, this.segment.getRealEndX(), t);
    let y = lerp(this.segment.startY, this.segment.getRealEndY(), t);
    return { x, y };
  }
  
  update(config, isInLight = false) {
    // 스케일 서서히 증가
    let growthSpeed = config.leafGrowthSpeed;
    if (isInLight) {
      growthSpeed *= 1.5;
    }
    
    if (!this.isWilting) {
      this.scale = lerp(this.scale, this.targetScale, growthSpeed);
      this.scale = min(this.scale, this.maxScale);
    } else {
      // 시들 때는 스케일 감소
      this.scale = lerp(this.scale, 0.3, 0.02);
      this.health -= 0.01;
    }
    
    // 흔들림 업데이트
    if (config.swayEnabled) {
      this.swayOffset += this.swaySpeed;
      let windEffect = isInLight ? 0.5 : 1.0;
      this.currentSway = sin(this.swayOffset) * this.swayAmount * windEffect;
    }
  }
  
  display() {
    if (!this.segment) return;
    
    let pos = this.getAttachPosition();
    
    push();
    translate(pos.x, pos.y);
    
    // 세그먼트 각도 + 잎 각도 + 흔들림
    let segAngle = this.segment.angle + this.segment.currentSway;
    let totalAngle = segAngle + 90 + this.baseAngle + this.tilt + this.currentSway;
    rotate(radians(totalAngle));
    
    let w = this.baseWidth * this.scale;
    let h = this.baseHeight * this.scale;
    
    if (this.img) {
      imageMode(CENTER);
      
      // 시들 때 색상 변화
      if (this.isWilting) {
        tint(150, 140, 100, 200);
      }
      
      // 잎은 연결부가 아래, 말단이 위
      image(this.img, 0, -h * 0.35, w, h);
      
      noTint();
    } else {
      // 이미지 없으면 베지어 곡선으로 잎 그리기
      fill(80, 160, 80);
      if (this.isWilting) {
        fill(120, 120, 60);
      }
      noStroke();
      
      beginShape();
      vertex(0, 0);
      bezierVertex(w * 0.5, -h * 0.2, w * 0.4, -h * 0.6, 0, -h);
      bezierVertex(-w * 0.4, -h * 0.6, -w * 0.5, -h * 0.2, 0, 0);
      endShape(CLOSE);
      
      // 잎맥
      stroke(60, 130, 60);
      strokeWeight(1);
      line(0, 0, 0, -h * 0.85);
    }
    
    pop();
  }
  
  getBounds() {
    let pos = this.getAttachPosition();
    let w = this.baseWidth * this.scale;
    let h = this.baseHeight * this.scale;
    return {
      x: pos.x - w / 2,
      y: pos.y - h,
      w: w,
      h: h
    };
  }
  
  startWilting() {
    this.isWilting = true;
  }
}


// ============================================
// Flower 클래스: 줄기 끝에 피는 꽃
// ============================================
class Flower {
  constructor(attachSegment, img, size, stage = 0) {
    this.segment = attachSegment;
    this.img = img;
    this.stage = stage;
    
    this.baseWidth = size.w;
    this.baseHeight = size.h;
    this.scale = 0.1;
    this.targetScale = 1.0;
    
    // 흔들림
    this.swayOffset = random(1000);
    this.swaySpeed = 0.015;
    this.swayAmount = 4;
    this.currentSway = 0;
    
    // 개화 효과
    this.bloomProgress = 0;
    this.isFullyBloomed = false;
    
    // 파티클 효과 (꽃가루)
    this.pollenParticles = [];
    this.pollenTimer = 0;
  }
  
  getPosition() {
    if (!this.segment) return { x: 0, y: 0 };
    return {
      x: this.segment.getRealEndX(),
      y: this.segment.getRealEndY()
    };
  }
  
  update(config, isInLight = false) {
    // 개화 진행
    let growthSpeed = config.flowerGrowthSpeed;
    if (isInLight) {
      growthSpeed *= 1.8;
    }
    
    this.scale = lerp(this.scale, this.targetScale, growthSpeed);
    this.bloomProgress = this.scale / this.targetScale;
    
    if (this.bloomProgress > 0.95 && !this.isFullyBloomed) {
      this.isFullyBloomed = true;
    }
    
    // 흔들림
    if (config.swayEnabled) {
      this.swayOffset += this.swaySpeed;
      this.currentSway = sin(this.swayOffset) * this.swayAmount;
    }
    
    // 꽃가루 파티클 (완전 개화 후)
    if (this.isFullyBloomed && isInLight) {
      this.pollenTimer++;
      if (this.pollenTimer > 30) {
        this.pollenTimer = 0;
        this._spawnPollen();
      }
    }
    
    // 파티클 업데이트
    for (let i = this.pollenParticles.length - 1; i >= 0; i--) {
      let p = this.pollenParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.02; // 위로 떠오름
      p.life--;
      
      if (p.life <= 0) {
        this.pollenParticles.splice(i, 1);
      }
    }
  }
  
  _spawnPollen() {
    let pos = this.getPosition();
    for (let i = 0; i < 2; i++) {
      this.pollenParticles.push({
        x: pos.x + random(-10, 10),
        y: pos.y + random(-10, 10),
        vx: random(-0.5, 0.5),
        vy: random(-0.3, 0.1),
        size: random(3, 6),
        life: random(40, 80)
      });
    }
  }
  
  display() {
    if (!this.segment) return;
    
    let pos = this.getPosition();
    
    // 꽃가루 파티클 먼저 그리기 (뒤에)
    for (let p of this.pollenParticles) {
      let alpha = map(p.life, 0, 80, 0, 180);
      fill(255, 230, 150, alpha);
      noStroke();
      circle(p.x, p.y, p.size);
    }
    
    push();
    translate(pos.x, pos.y);
    
    let segAngle = this.segment.angle + this.segment.currentSway;
    rotate(radians(segAngle + 90 + this.currentSway));
    
    let w = this.baseWidth * this.scale;
    let h = this.baseHeight * this.scale;
    
    if (this.img) {
      imageMode(CENTER);
      image(this.img, 0, -h * 0.4, w, h);
    } else {
      // 이미지 없으면 간단한 꽃 그리기
      this._drawDefaultFlower(w, h);
    }
    
    pop();
  }
  
  _drawDefaultFlower(w, h) {
    let petalCount = 5;
    let petalSize = min(w, h) * 0.4;
    
    // 꽃잎
    for (let i = 0; i < petalCount; i++) {
      push();
      rotate(radians((360 / petalCount) * i));
      fill(255, 180, 200);
      noStroke();
      ellipse(0, -petalSize * 0.7, petalSize * 0.7, petalSize * 1.2);
      pop();
    }
    
    // 꽃 중심
    fill(255, 220, 100);
    noStroke();
    circle(0, 0, petalSize * 0.6);
  }
  
  getBounds() {
    let pos = this.getPosition();
    let w = this.baseWidth * this.scale;
    let h = this.baseHeight * this.scale;
    return {
      x: pos.x - w / 2,
      y: pos.y - h,
      w: w,
      h: h
    };
  }
}


// ============================================
// Plant 클래스: 메인 식물 객체
// ============================================
class Plant {
  /**
   * @param {number} x 초기 x 위치
   * @param {number} y 초기 y 위치
   * @param {Object} images { stems:[], leaves:[], flowers:[] } 형태의 이미지 세트
   */
  constructor(x, y, images = null) {
    // 기준점 (뿌리 위치)
    this.x = x;
    this.y = y;
    
    // 외부에서 이미 로드된 이미지를 받음
    this.images = images || { stems: [], leaves: [], flowers: [] };

    // 랜덤 특성 부여 (식물의 다양성 확보)
    // 3가지 타입 중 하나를 랜덤으로 섞거나 속성을 변조
    // 랜덤 대신 기본 설정값 사용 (모든 식물이 동일한 성장 규칙 가짐)
    this.config = {
      growthRate: 0.0008,      // 성장 속도
      maxSegments: 25,         // 최대 길이
      segmentLength: 20,       // 마디 길이
      lightSeekingStrength: 0.25, // 빛 추적 강도
      leafSpawnInterval: 3,    // 잎 간격
      flowerThreshold: 0.8,    // 꽃 피는 시기
      maxHealth: 100
    };

    // 상태
    this.growth = 0; // 0.0~1.0 성장도
    this.stage = 0; // 0:초기 -> 1:중간 -> 2:최종
    this.health = this.config.maxHealth;
    this.isDead = false;
    this.isInLight = false;
    
    // 구성 요소
    this.segments = [];
    this.leaves = [];
    this.flower = null;
    
    // 파편
    this.debris = [];
    
    // 히트박스
    this.w = 60;
    this.h = 0;
    this._hitboxCenterX = x;
    this._hitboxCenterY = y;
    
    // 초기화
    this._initFirstSegment();
  }
  
  // --- 초기화 ---
  _initFirstSegment() {
    let stemImg = this._getCurrentImage(this.images.stems);
    let firstSeg = new Segment(
      this.x,
      this.y,
      -90 + random(-10, 10),
      5,
      stemImg
    );
    firstSeg.targetLength = this.config.segmentLength;
    this.segments.push(firstSeg);
  }
  
  //===========================================
  // --- 메인 업데이트 ---
  update(lightObj) {
    // 파편 업데이트 (죽었어도 계속)
    this._updateDebris();
    
    if (this.isDead) return;
    
    // 빛 감지 및 성장
    this.isInLight = this._checkInLight(lightObj);
    this._handleGrowth(lightObj);
    
    // 체력 자연 회복
    if (this.isInLight && this.health < this.config.maxHealth) {
      this.health += 0.1;
    }
    
    // 구성 요소 업데이트
    this._updateComponents(lightObj);
    
    // 히트박스 업데이트
    this._updateHitbox();
  }
  
  // --- 렌더링 ---
  display() {
    // 파편 (가장 뒤)
    for (let d of this.debris) {
      d.display();
    }
    
    if (this.isDead) return;
    
    // 줄기
    for (let seg of this.segments) {
      seg.display();
    }
    
    // 잎
    for (let leaf of this.leaves) {
      leaf.display();
    }
    
    // 꽃
    if (this.flower) {
      this.flower.display();
    }
    
    // 디버그 정보
    if (typeof debugMode !== 'undefined' && debugMode) {
      this._drawDebug();
    }
  }
  
  // --- 빛 범위 체크 ---
  // _checkInLight(lightObj) {
  //   if (!lightObj) return false;
    
  //   let tip = this._getTipPosition();
  //   let d = dist(tip.x, tip.y, lightObj.x, lightObj.y);
    
  //   return d < lightObj.r;
  // }
  
  // --- Light 상호작용 ---
  // _handleLight(lightObj) {
  //   if (!lightObj) return;
    
  //   let tip = this._getTipPosition();
  //   let d = dist(tip.x, tip.y, lightObj.x, lightObj.y);
    
  //   if (d < lightObj.r) {
  //     // 거리에 따른 성장 강도
  //     let intensity = map(d, 0, lightObj.r, 
  //                        this.config.lightGrowthMultiplier, 0.8);
  //     this.growth += this.config.growthRate * intensity;
  //     this.growth = min(this.growth, this.config.maxGrowth);
  //   } else {
  //     // 빛 밖에서도 아주 느리게 성장
  //     this.growth += this.config.growthRate * this.config.baseGrowthSpeed;
  //     this.growth = min(this.growth, this.config.maxGrowth);
  //   }
  // }
  
  // --- Moss 상호작용 ---
  // _handleMoss(mosses) {
  //   if (!mosses || mosses.length === 0) return;
    
  //   let isTouchingMoss = false;
    
  //   for (let moss of mosses) {
  //     if (moss.checkCollisionWithPlant && moss.checkCollisionWithPlant(this)) {
  //       isTouchingMoss = true;
  //       break;
  //     }
  //   }
    
  //   if (isTouchingMoss) {
  //     this.takeDamage(this.config.mossDamagePerFrame);
      
  //     // 잎 시들기 시작
  //     if (this.health < this.config.maxHealth * 0.5) {
  //       for (let leaf of this.leaves) {
  //         if (!leaf.isWilting && random() < 0.01) {
  //           leaf.startWilting();
  //         }
  //       }
  //     }
  //   }
  // }
  
  // // --- 체력 회복 ---
  // _handleHealthRegen() {
  //   if (this.health >= this.config.maxHealth) return;
    
  //   let regenRate = this.config.healthRegenRate;
  //   if (this.isInLight) {
  //     regenRate += this.config.healthRegenLightBonus;
  //   }
    
  //   this.health += regenRate;
  //   this.health = min(this.health, this.config.maxHealth);
  // }
  
  // // --- 피해 처리 ---
  // takeDamage(amount) {
  //   this.health -= amount;
    
  //   if (this.health <= 0) {
  //     this.health = 0;
  //     this._die();
  //   }
  // }
  
  // // --- 죽음 처리 ---
  // _die() {
  //   if (this.isDead) return;
    
  //   this.isDead = true;
  //   this._spawnDebris();
  // }
  
  // // --- 파편 생성 ---
  // _spawnDebris() {
  //   let useGray = this.config.grayscaleOnDeath;
    
  //   // 잎 → 파편
  //   for (let leaf of this.leaves) {
  //     let pos = leaf.getAttachPosition();
  //     let bounds = leaf.getBounds();
      
  //     this.debris.push(new Debris(
  //       leaf.img,
  //       pos.x,
  //       pos.y,
  //       leaf.segment.angle + leaf.baseAngle,
  //       {
  //         grayscale: useGray,
  //         scale: leaf.scale,
  //         life: random(100, 160),
  //         vx: random(-3, 3) + leaf.side * 1.5,
  //         vy: random(-2, 0),
  //         width: bounds.w,
  //         height: bounds.h
  //       }
  //     ));
  //   }
    
  //   // 꽃 → 파편
  //   if (this.flower) {
  //     let pos = this.flower.getPosition();
  //     let bounds = this.flower.getBounds();
      
  //     this.debris.push(new Debris(
  //       this.flower.img,
  //       pos.x,
  //       pos.y,
  //       this.flower.segment.angle,
  //       {
  //         grayscale: useGray,
  //         scale: this.flower.scale,
  //         life: random(120, 180),
  //         vy: random(-4, -1),
  //         width: bounds.w,
  //         height: bounds.h
  //       }
  //     ));
  //   }
    
  //   // 세그먼트 → 파편 (일부만)
  //   for (let i = this.segments.length - 1; i >= 0; i -= 2) {
  //     let seg = this.segments[i];
      
  //     this.debris.push(new Debris(
  //       seg.img,
  //       (seg.startX + seg.getRealEndX()) / 2,
  //       (seg.startY + seg.getRealEndY()) / 2,
  //       seg.angle,
  //       {
  //         grayscale: useGray,
  //         scale: 1.0,
  //         life: random(80, 130),
  //         vx: random(-2, 2),
  //         vy: random(-1, 1),
  //         width: 20,
  //         height: seg.length
  //       }
  //     ));
  //   }
    
  //   // 구성 요소 제거
  //   this.segments = [];
  //   this.leaves = [];
  //   this.flower = null;
  // }
  
  // // --- 파편 업데이트 ---
  // _updateDebris() {
  //   for (let i = this.debris.length - 1; i >= 0; i--) {
  //     this.debris[i].update();
  //     if (this.debris[i].isDead()) {
  //       this.debris.splice(i, 1);
  //     }
  //   }
  // }
  
  // // --- 성장 업데이트 ---
  // _updateGrowth(lightObj) {
  //   if (this.segments.length === 0) return;
    
  //   let lastSeg = this.segments[this.segments.length - 1];
    
  //   // 마지막 세그먼트가 자라는 중
  //   if (lastSeg.isGrowing) {
  //     return;
  //   }
    
  //   // 새 세그먼트 추가 조건
  //   if (this.segments.length < this.config.maxSegments) {
  //     // growth에 비례하여 세그먼트 추가
  //     let targetSegments = floor(this.growth * this.config.maxSegments);
      
  //     if (this.segments.length < targetSegments) {
  //       this._addSegment(lightObj);
  //     }
  //   }
    
  //   // 잎 생성 체크
  //   this._trySpawnLeaf();
    
  //   // 꽃 생성 체크
  //   this._trySpawnFlower();
  // }
  
  // // --- 새 세그먼트 추가 ---
  // _addSegment(lightObj) {
  //   let lastSeg = this.segments[this.segments.length - 1];
    
  //   // 새 각도 계산
  //   let newAngle = lastSeg.angle + random(-this.config.angleVariation, this.config.angleVariation);
    
  //   // 빛을 향하는 경향
  //   if (lightObj && this.isInLight) {
  //     let endX = lastSeg.getRealEndX();
  //     let endY = lastSeg.getRealEndY();
  //     let angleToLight = degrees(atan2(lightObj.y - endY, lightObj.x - endX));
  //     let diff = this._angleDelta(newAngle, angleToLight);
  //     newAngle += diff * this.config.lightSeekingStrength;
  //   }
    
  //   // 위쪽 경향 유지
  //   let diffToUp = this._angleDelta(newAngle, -90);
  //   newAngle += diffToUp * this.config.upwardTendency;
    
  //   // 각도 제한
  //   newAngle = constrain(newAngle, -160, -20);
    
  //   // 새 세그먼트 생성
  //   let stemImg = this._getStemImage();
  //   let newSeg = new Segment(
  //     lastSeg.getRealEndX(),
  //     lastSeg.getRealEndY(),
  //     newAngle,
  //     1,
  //     stemImg,
  //     this.segments.length
  //   );
  //   newSeg.targetLength = this.config.segmentLength;
  //   newSeg.sliceY = (this.segments.length * 15) % (stemImg ? stemImg.height - 20 : 100);
    
  //   this.segments.push(newSeg);
  // }
  
  // // --- 잎 생성 ---
  // _trySpawnLeaf() {
  //   if (this.leaves.length >= this.config.maxLeaves) return;
  //   if (this.segments.length < 3) return;
    
  //   let interval = this.config.leafSpawnInterval;
  //   let expectedLeaves = floor((this.segments.length - 2) / interval);
  //   expectedLeaves = min(expectedLeaves, this.config.maxLeaves);
    
  //   if (this.leaves.length < expectedLeaves) {
  //     // 새 잎을 붙일 세그먼트 찾기
  //     let segIndex = 2 + this.leaves.length * interval;
  //     segIndex = min(segIndex, this.segments.length - 1);
      
  //     let seg = this.segments[segIndex];
      
  //     // 좌우 번갈아가며
  //     let side = this.leaves.length % 2 === 0 ? 1 : -1;
      
  //     let leafImg = this._getLeafImage();
  //     let leafSize = this._getLeafSize();
      
  //     let newLeaf = new Leaf(seg, side, leafImg, leafSize, this.stage);
  //     this.leaves.push(newLeaf);
  //   }
  // }
  
  // // --- 꽃 생성 ---
  // _trySpawnFlower() {
  //   if (this.flower) return;
  //   if (this.growth < this.config.flowerThreshold) return;
  //   if (this.segments.length < 5) return;
    
  //   let lastSeg = this.segments[this.segments.length - 1];
  //   let flowerImg = this._getFlowerImage();
  //   let flowerSize = this._getFlowerSize();
    
  //   this.flower = new Flower(lastSeg, flowerImg, flowerSize, this.stage);
  // }
  
  // // --- 단계 업데이트 ---
  // _updateStage() {
  //   let thresholds = this.config.stageThresholds;
  //   let newStage = 0;
    
  //   for (let i = thresholds.length - 1; i >= 0; i--) {
  //     if (this.growth >= thresholds[i]) {
  //       newStage = i;
  //       break;
  //     }
  //   }
    
  //   if (newStage !== this.stage) {
  //     this._onStageChange(this.stage, newStage);
  //     this.stage = newStage;
  //   }
  // }
  
  // // --- 단계 변경 처리 ---
  // _onStageChange(oldStage, newStage) {
  //   // 잎 이미지 업데이트 (새 단계에 맞게)
  //   for (let leaf of this.leaves) {
  //     if (leaf.scale > 0.8) {
  //       // 이미 다 자란 잎은 새 이미지로, 스케일 조정
  //       leaf.img = this._getLeafImage();
  //       let newSize = this._getLeafSize();
        
  //       // 크기 비율 유지하며 전환
  //       let scaleRatio = leaf.baseHeight / newSize.h;
  //       leaf.scale = leaf.scale * scaleRatio * 0.6;
        
  //       leaf.baseWidth = newSize.w;
  //       leaf.baseHeight = newSize.h;
  //       leaf.stage = newStage;
  //     }
  //   }
    
  //   // 꽃 이미지 업데이트
  //   if (this.flower && newStage >= 3) {
  //     this.flower.img = this._getFlowerImage();
  //     let newSize = this._getFlowerSize();
      
  //     let scaleRatio = this.flower.baseHeight / newSize.h;
  //     this.flower.scale = this.flower.scale * scaleRatio * 0.5;
      
  //     this.flower.baseWidth = newSize.w;
  //     this.flower.baseHeight = newSize.h;
  //   }
  // }
  
  // // --- 구성 요소 업데이트 ---
  // _updateComponents(lightObj) {
  //   // 세그먼트 체인 업데이트
  //   for (let i = 0; i < this.segments.length; i++) {
  //     let seg = this.segments[i];
      
  //     if (i === 0) {
  //       seg.updateStart(this.x, this.y);
  //     } else {
  //       let parent = this.segments[i - 1];
  //       seg.updateStart(parent.getRealEndX(), parent.getRealEndY());
  //     }
      
  //     seg.update(lightObj, this.config);
  //   }
    
  //   // 잎 업데이트
  //   for (let leaf of this.leaves) {
  //     leaf.update(this.config, this.isInLight);
  //   }
    
  //   // 꽃 업데이트
  //   if (this.flower) {
  //     this.flower.update(this.config, this.isInLight);
  //   }
  // }
  
  // // --- 히트박스 업데이트 ---
  // _updateHitbox() {
  //   if (this.segments.length === 0) {
  //     this.w = 30;
  //     this.h = 30;
  //     this._hitboxCenterX = this.x;
  //     this._hitboxCenterY = this.y;
  //     return;
  //   }
    
  //   let minX = this.x, maxX = this.x;
  //   let minY = this.y, maxY = this.y;
    
  //   // 세그먼트 범위
  //   for (let seg of this.segments) {
  //     let endX = seg.getRealEndX();
  //     let endY = seg.getRealEndY();
  //     minX = min(minX, seg.startX, endX);
  //     maxX = max(maxX, seg.startX, endX);
  //     minY = min(minY, seg.startY, endY);
  //     maxY = max(maxY, seg.startY, endY);
  //   }
    
  //   // 잎 범위 추가
  //   for (let leaf of this.leaves) {
  //     let bounds = leaf.getBounds();
  //     minX = min(minX, bounds.x);
  //     maxX = max(maxX, bounds.x + bounds.w);
  //     minY = min(minY, bounds.y);
  //     maxY = max(maxY, bounds.y + bounds.h);
  //   }
    
  //   // 여유 추가
  //   this.w = (maxX - minX) + 30;
  //   this.h = (maxY - minY) + 30;
  //   this._hitboxCenterX = (minX + maxX) / 2;
  //   this._hitboxCenterY = (minY + maxY) / 2;
  // }
  
  // // --- 줄기 끝점 ---
  // _getTipPosition() {
  //   if (this.segments.length === 0) {
  //     return { x: this.x, y: this.y };
  //   }
  //   let last = this.segments[this.segments.length - 1];
  //   return { x: last.getRealEndX(), y: last.getRealEndY() };
  // }
  
  // // --- 에셋 헬퍼 ---
  // _getStemImage() {
  //   if (!this.images.stems || this.images.stems.length === 0) return null;
  //   let idx = min(this.stage, this.images.stems.length - 1);
  //   return this.images.stems[idx];
  // }
  
  // _getLeafImage() {
  //   if (!this.images.leaves || this.images.leaves.length === 0) return null;
  //   let idx = min(this.stage, this.images.leaves.length - 1);
  //   return this.images.leaves[idx];
  // }
  
  // _getLeafSize() {
  //   let idx = min(this.stage, ASSET_SIZES.leaves.length - 1);
  //   return ASSET_SIZES.leaves[idx];
  // }
  
  // _getFlowerImage() {
  //   if (!this.images.flowers || this.images.flowers.length === 0) return null;
  //   let idx = this.stage >= 3 ? min(1, this.images.flowers.length - 1) : 0;
  //   return this.images.flowers[idx];
  // }
  
  // _getFlowerSize() {
  //   let idx = this.stage >= 3 ? 1 : 0;
  //   idx = min(idx, ASSET_SIZES.flowers.length - 1);
  //   return ASSET_SIZES.flowers[idx];
  // }
  
  checkCollision(target) {
  // --- Moss에서 호출하는 충돌 체크 ---
  // sketch.js에서 ex. myPlant.checkCollision(myMoss)로 사용

    if (!target || this.isDead) return false;
    
    let centerX = this._hitboxCenterX;
    let centerY = this._hitboxCenterY;
    
    let targetX = target.x || 0;
    let targetY = target.y || 0;
    let targetR = target.r || target.size || 30;
    
    // 원-사각형 충돌
    let closestX = constrain(targetX, centerX - this.w / 2, centerX + this.w / 2);
    let closestY = constrain(targetY, centerY - this.h / 2, centerY + this.h / 2);
    let d = dist(targetX, targetY, closestX, closestY);
    return d < targetR;
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.health -= amount;
    
    // 체력 절반 이하일 때 잎 시들기 효과 (랜덤)
    if (this.health < this.config.maxHealth * 0.5 && this.leaves.length > 0) {
       if (random() < 0.1) this.leaves[floor(random(this.leaves.length))].isWilting = true;
    }

    if (this.health <= 0) {
      this.health = 0;
      this._die();
    }
  }

  // ============================================
  // 내부 로직
  // ============================================
  _handleGrowth(lightObj) {
    let speed = this.isInLight ? this.config.growthRate * 2.5 : this.config.growthRate * 0.3;
    this.growth = min(this.growth + speed, 1.0);

    // 단계 업데이트 (이미지 변경용)
    // 0.25, 0.55를 넘을 때마다 이미지를 갈아끼움
    let oldStage = this.stage;
    if (this.growth > 0.55) this.stage = 2; // 최종
    else if (this.growth > 0.25) this.stage = 1; // 중간
    else this.stage = 0; // 초기

    // 단계가 변했다면, 현재 달려있는 모든 부품의 이미지를 업데이트!
    if (this.stage !== oldStage) {
      this._updateImagesToStage();
    }
    
    // 줄기 추가
    let maxSegsCurrent = floor(this.growth * this.config.maxSegments);
    if (this.segments.length < maxSegsCurrent) {
      this._addSegment(lightObj);
    }

    this._trySpawnLeaf();
    this._trySpawnFlower();
  }

  _updateImagesToStage() {
    let stemImg = this._getCurrentImage(this.images.stems);
    let leafImg = this._getCurrentImage(this.images.leaves);
    
    // 줄기 이미지 교체
    for(let s of this.segments) {
        if(stemImg) s.img = stemImg;
    }
    // 잎 이미지 교체
    for(let l of this.leaves) {
        if(leafImg) l.img = leafImg;
    }
    // 꽃 이미지 교체 (꽃은 최종 단계 근처에서만 나오므로 단순 처리)
    if (this.flower) {
        this.flower.img = this._getCurrentImage(this.images.flowers);
    }
  }

  _addSegment(lightObj) {
    let last = this.segments[this.segments.length - 1];
    let newAngle = last.angle + random(-20, 20);

    if (lightObj && this.isInLight) {
      let endX = last.getEndX();
      let endY = last.getEndY();
      let angleToLight = degrees(atan2(lightObj.y - endY, lightObj.x - endX));
      // 여기서 _angleDelta 사용
      let diff = this._angleDelta(newAngle, angleToLight);
      newAngle += diff * this.config.lightSeekingStrength;
    }
    
    // 위쪽(-90도)으로 자라려는 성질
    let toUp = this._angleDelta(newAngle, -90);
    newAngle += toUp * 0.1;
    newAngle = constrain(newAngle, -170, -10);

    let img = this._getCurrentImage(this.images.stems);
    let newSeg = new Segment(last.getEndX(), last.getEndY(), newAngle, 1, img);
    newSeg.targetLength = this.config.segmentLength;
    this.segments.push(newSeg);
  }

  _trySpawnLeaf() {
    let requiredSegments = (this.leaves.length + 1) * this.config.leafSpawnInterval + 2;
    if (this.segments.length >= requiredSegments) {
        let seg = this.segments[this.segments.length - 2]; 
        let dir = (this.leaves.length % 2 === 0) ? 1 : -1;
        let img = this._getCurrentImage(this.images.leaves);
        this.leaves.push(new Leaf(seg, dir, img));
    }
  }

  _trySpawnFlower() {
    if (!this.flower && this.growth > this.config.flowerThreshold) {
      let lastSeg = this.segments[this.segments.length - 1];
      let img = this._getCurrentImage(this.images.flowers);
      this.flower = new Flower(lastSeg, img);
    }
  }

  _die() {
    this.isDead = true;
    // 파편 생성
    for(let s of this.segments) this.debris.push(new Debris(s.img, s.startX, s.startY));
    for(let l of this.leaves) this.debris.push(new Debris(l.img, l.getPos().x, l.getPos().y));
    if (this.flower) this.debris.push(new Debris(this.flower.img, this.flower.getPos().x, this.flower.getPos().y));
    
    this.segments = []; this.leaves = []; this.flower = null;
  }

  _updateComponents() {
    for (let i = 0; i < this.segments.length; i++) {
        if (i > 0) {
            let parent = this.segments[i-1];
            this.segments[i].updateStart(parent.getEndX(), parent.getEndY());
        }
        // 2. 세그먼트 업데이트 시 lightObj와 this.config를 모두 전달
        this.segments[i].update(lightObj, this.config);
    }
    
    // 3. 잎 업데이트 시 this.config 전달 (기존엔 this.isInLight만 전달해서 오류 가능성 있음)
    for (let l of this.leaves) {
        l.update(this.config, this.isInLight);
    }
    
    // 4. 꽃 업데이트 시 this.config 전달
    if (this.flower) {
        this.flower.update(this.config, this.isInLight);
    }
  }

  _updateDebris() {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      this.debris[i].update();
      if (this.debris[i].isDead()) this.debris.splice(i, 1);
    }
  }

  _updateHitbox() {
    if (this.segments.length === 0) return;
    let minX = this.x, maxX = this.x, minY = this.y, maxY = this.y;
    
    for (let s of this.segments) {
        let ex = s.getEndX(); let ey = s.getEndY();
        if(ex < minX) minX = ex; if(ex > maxX) maxX = ex;
        if(ey < minY) minY = ey; if(ey > maxY) maxY = ey;
    }

    this.w = (maxX - minX) + 40;
    this.h = (maxY - minY) + 40;
    this._hitboxCenterX = (minX + maxX) / 2;
    this._hitboxCenterY = (minY + maxY) / 2;
  }

  _checkInLight(lightObj) {
    if (!lightObj) return false;
    let last = this.segments[this.segments.length - 1];
    if (!last) return false;
    return dist(last.getEndX(), last.getEndY(), lightObj.x, lightObj.y) < lightObj.r;
  }

_getCurrentImage(arr) {
    if (!arr || arr.length === 0) return null;
    // this.stage가 배열 길이를 넘지 않도록 안전장치
    let idx = min(this.stage, arr.length - 1);
    return arr[idx];
  }
  
  // ============================================
  // 유틸리티 & 디버그
  // ============================================
  
  _angleDelta(from, to) {
    let d = (to - from + 540) % 360 - 180;
    return d;
  }

  _drawDebug() {
    push();
    
    // 히트박스
    noFill();
    stroke(255, 0, 0, 150);
    strokeWeight(1);
    rectMode(CENTER);
    rect(this._hitboxCenterX, this._hitboxCenterY, this.w, this.h);
    
    // 뿌리 위치
    fill(255, 0, 255);
    noStroke();
    circle(this.x, this.y, 8);
    
    // 정보 텍스트
    fill(255, 255, 0);
    noStroke();
    textSize(11);
    textAlign(LEFT, TOP);
    
    let infoX = this.x + this.w / 2 + 10;
    let infoY = this._hitboxCenterY - 50;
    
    text(`Growth: ${(this.growth * 100).toFixed(1)}%`, infoX, infoY);
    text(`HP: ${this.health.toFixed(1)}/${this.config.maxHealth}`, infoX, infoY + 28);
    text(`Light: ${this.isInLight ? 'YES' : 'NO'}`, infoX, infoY + 70);
    
    pop();
  }



  // --- 유틸리티 ---
  _angleDelta(from, to) {
    let d = (to - from + 540) % 360 - 180;
    return d;
  }


  
//   // --- 디버그 렌더링 ---
//   _drawDebug() {
//     push();
    
//     // 히트박스
//     noFill();
//     stroke(255, 0, 0, 150);
//     strokeWeight(1);
//     rectMode(CENTER);
//     rect(this._hitboxCenterX, this._hitboxCenterY, this.w, this.h);
    
//     // 뿌리 위치
//     fill(255, 0, 255);
//     noStroke();
//     circle(this.x, this.y, 8);
    
//     // 정보 텍스트
//     fill(255, 255, 0);
//     noStroke();
//     textSize(11);
//     textAlign(LEFT, TOP);
    
//     let infoX = this.x + this.w / 2 + 10;
//     let infoY = this._hitboxCenterY - 50;
    
//     text(`Growth: ${(this.growth * 100).toFixed(1)}%`, infoX, infoY);
//     text(`Stage: ${this.stage}`, infoX, infoY + 14);
//     text(`HP: ${this.health.toFixed(1)}/${this.config.maxHealth}`, infoX, infoY + 28);
//     text(`Segs: ${this.segments.length}`, infoX, infoY + 42);
//     text(`Leaves: ${this.leaves.length}`, infoX, infoY + 56);
//     text(`Light: ${this.isInLight ? 'YES' : 'NO'}`, infoX, infoY + 70);
    
//     pop();
//   }
  
//   // --- 외부 인터페이스 (MockPlant 호환) ---
//   get hitbox() {
//     return {
//       x: this._hitboxCenterX,
//       y: this._hitboxCenterY,
//       w: this.w,
//       h: this.h
//     };
//   }
}


// 이미지 로딩 헬퍼

// function loadPlantAssets() {
//   let assets = {
//     stems: [],
//     leaves: [],
//     flowers: []
//   };
  
//   for (let path of PLANT_ASSETS.stems) {
//     assets.stems.push(loadImage(path, 
//       () => console.log(`Loaded: ${path}`),
//       () => console.warn(`Failed to load: ${path}`)
//     ));
//   }
  
//   for (let path of PLANT_ASSETS.leaves) {
//     assets.leaves.push(loadImage(path,
//       () => console.log(`Loaded: ${path}`),
//       () => console.warn(`Failed to load: ${path}`)
//     ));
//   }
  
//   for (let path of PLANT_ASSETS.flowers) {
//     assets.flowers.push(loadImage(path,
//       () => console.log(`Loaded: ${path}`),
//       () => console.warn(`Failed to load: ${path}`)
//     ));
//   }
  
//   return assets;
// }