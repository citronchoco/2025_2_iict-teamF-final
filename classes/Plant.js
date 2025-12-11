// Plant.js
// 담쟁이 넝쿨 스타일의 성장형 식물 클래스

// --- 에셋 경로 상수 ---
const PLANT_ASSETS = {
  stems: [
    './assets/plant/stem_a.png'
  ],
  leaves: [
    './assets/plant/leaf_a.png',
    './assets/plant/leaf_b.png'
  ],
  flowers: [
    './assets/plant/flower_1a.png',
    './assets/plant/flower_2a.png',
    './assets/plant/flower_3a.png',
    './assets/plant/flower_4a.png'
  ]
};

// --- 에셋 크기 정보 ---
const ASSET_SIZES = {
  stems: [
    { w: 10, h: 200 }
  ],
  leaves: [
    { w: 80, h: 160 },
    { w: 50, h: 230 }
  ],
  flowers: [
    { w: 230, h: 230 }
  ]
};

// --- 기본 설정 ---
const DEFAULT_PLANT_CONFIG = {
  // 성장 관련
  growthRate: 0.0008,
  maxGrowth: 1.0,
  baseGrowthSpeed: 0.3,
  lightGrowthMultiplier: 2.5,

  // 줄기 관련
  maxSegments: 15,
  segmentLength: 35,
  segmentGrowthSpeed: 1.2,
  angleVariation: 20,
  upwardTendency: 0.15,
  lightSeekingStrength: 0.18, // 빛 영향

  // 잎 관련
  leafSpawnInterval: 3,
  maxLeaves: 9,
  leafGrowthSpeed: 0.025,
  leafSwayAmount: 8,

  // 꽃 관련
  flowerThreshold: 0.8,
  flowerGrowthSpeed: 0.018,

  // 체력 관련
  maxHealth: 100,
  mossDamagePerFrame: 0.3,
  healthRegenRate: 0.05,
  healthRegenLightBonus: 0.1,

  // 시각 효과
  grayscaleOnDeath: true,
  swayEnabled: true,

  // 단계 전환 기준
  stageThresholds: [0.0, 0.5, 0.8]
};


// ============================================
// Debris 클래스: 떨어지는 조각 파편
// ============================================
class Debris {
  constructor(img, x, y, angle, config) {
    this.img = img;
    this.x = x;
    this.y = y;
    this.angle = angle || 0;
    
    config = config || {};

    this.vx = config.vx !== undefined ? config.vx : random(-1.2, 1.2);
    this.vy = config.vy !== undefined ? config.vy : random(-1.5, -0.2);
    this.angularVel = config.angularVel !== undefined ? config.angularVel : random(-2.5, 2.5);
    this.gravity = 0.12;
    this.friction = 0.92;
    this.bounceFactor = 0.25;

    this.life = config.life !== undefined ? config.life : 140;
    this.maxLife = this.life;

    this.grayscale = config.grayscale !== undefined ? config.grayscale : true;
    this.fadeStart = 0.3;

    this.displayWidth = config.displayWidth || 20;
    this.displayHeight = config.displayHeight || 20;

    this.srcX = config.srcX;
    this.srcY = config.srcY;
    this.srcW = config.srcW;
    this.srcH = config.srcH;
  }

  update() {
    this.vy += this.gravity;
    this.vx *= 0.995;
    this.angularVel *= 0.98;

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.angularVel;

    this.life--;

    const groundY = height - 20;
    if (this.y > groundY) {
      this.y = groundY;
      this.vy *= -this.bounceFactor;
      this.vx *= this.friction;
      this.angularVel *= 0.5;

      if (abs(this.vy) < 0.5) {
        this.vy = 0;
      }
    }

    if (this.x < 0 || this.x > width) {
      this.vx *= -0.5;
      this.x = constrain(this.x, 0, width);
    }
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(radians(this.angle));

    let lifeRatio = this.life / this.maxLife;
    let alpha = lifeRatio < this.fadeStart
      ? map(lifeRatio, 0, this.fadeStart, 0, 255)
      : 255;

    imageMode(CENTER);

    if (this.img) {
      if (this.grayscale) {
        tint(100, 100, 100, alpha);
      } else {
        tint(255, alpha);
      }

      if (this.srcW && this.srcH) {
        image(
          this.img,
          0, 0,
          this.displayWidth, this.displayHeight,
          this.srcX || 0, this.srcY || 0,
          this.srcW, this.srcH
        );
      } else {
        image(this.img, 0, 0, this.displayWidth, this.displayHeight);
      }
    } else {
      if (this.grayscale) {
        fill(100, 100, 100, alpha);
      } else {
        fill(80, 120, 80, alpha);
      }
      noStroke();
      rectMode(CENTER);
      rect(0, 0, this.displayWidth, this.displayHeight);
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
  constructor(startX, startY, angle, img, index, totalSegments) {
    this.startX = startX;
    this.startY = startY;
    this.angle = angle;  // -90이면 위로 향하는 각도
    this.img = img;
    this.index = index;
    this.totalSegments = totalSegments || 15;

    this.length = 0;
    this.targetLength = 35;
    this.isGrowing = true;

    this.sliceY = 0;
    this.sliceHeight = 20;
    this._calculateSlice();

    this.swayAmount = random(1.5, 3);
    this.currentSway = 0;
  }

  _calculateSlice() {
    if (!this.img) return;
    this.sliceHeight = this.img.height / this.totalSegments;
    this.sliceY = this.img.height - (this.index + 1) * this.sliceHeight;
    this.sliceY = max(0, this.sliceY);
  }

  getEndX() {
    return this.startX + cos(radians(this.angle)) * this.length;
  }

  getEndY() {
    return this.startY + sin(radians(this.angle)) * this.length;
  }

  getSwayEndX() {
    return this.startX + cos(radians(this.angle + this.currentSway)) * this.length;
  }

  getSwayEndY() {
    return this.startY + sin(radians(this.angle + this.currentSway)) * this.length;
  }

  updateStart(newX, newY) {
    this.startX = newX;
    this.startY = newY;
  }

  update(lightObj, config) {
    if (this.isGrowing) {
      this.length += config.segmentGrowthSpeed;
      if (this.length >= this.targetLength) {
        this.length = this.targetLength;
        this.isGrowing = false;
      }
    }

    // 빛 방향으로 위쪽 말단만 휘게
    if (lightObj && this.length > 1) {
      let endX = this.getEndX();
      let endY = this.getEndY();
      let distToLight = dist(endX, endY, lightObj.x, lightObj.y);

      let maxDist = lightObj.r * 1.5;
      if (distToLight < maxDist) {
        let angleToLight = degrees(atan2(lightObj.y - endY, lightObj.x - endX));
        let angleDiff = this._angleDelta(this.angle, angleToLight);

        // 좀 더 강하게, 하지만 거리 기반으로 완만하게 감소
        let base = config.lightSeekingStrength;
        let influence = map(distToLight, 0, maxDist, base, 0.0);
        influence = constrain(influence, 0, base);

        this.angle += angleDiff * influence * 0.08;
      }
    }

    let diffToUp = this._angleDelta(this.angle, -90);
    this.angle += diffToUp * config.upwardTendency * 0.05;
    this.angle = constrain(this.angle, -170, -10);

    if (config.swayEnabled) {
      let plantSway = config.plantSway || 0;
      let t = this.totalSegments > 1
        ? this.index / (this.totalSegments - 1)
        : 1.0;
      this.currentSway = plantSway * this.swayAmount * (0.4 + 0.8 * t);
    } else {
      this.currentSway = 0;
    }
  }

  display() {
    if (this.length <= 0) return;

    push();
    translate(this.startX, this.startY);
    // start 기준으로 위쪽 말단을 회전
    rotate(radians(this.angle - 90 + this.currentSway));

    if (this.img) {
      imageMode(CORNER);

      let srcX = 0;
      let srcY = this.sliceY;
      let srcW = this.img.width;
      let srcH = this.sliceHeight;

      let dstW = ASSET_SIZES.stems[0].w;
      let dstX = -dstW / 2;
      let dstY = 0;
      let dstH = this.length + 1;

      image(this.img, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH);
    } else {
      stroke(70, 100, 50);
      strokeWeight(6);
      strokeCap(ROUND);
      line(0, 0, 0, this.length);
    }

    pop();

    if (typeof debugMode !== 'undefined' && debugMode) {
      fill(255, 0, 0);
      noStroke();
      circle(this.startX, this.startY, 4);
      fill(0, 255, 0);
      circle(this.getSwayEndX(), this.getSwayEndY(), 4);
      fill(255, 255, 0);
      textSize(8);
      textAlign(LEFT, CENTER);
      text(this.index, this.startX + 8, this.startY);
    }
  }

  _angleDelta(from, to) {
    let d = (to - from + 540) % 360 - 180;
    return d;
  }
}


// ============================================
// Leaf 클래스: 줄기에 붙는 잎
// ============================================
class Leaf {
  constructor(attachSegment, side, img, size, stage) {
    this.segment = attachSegment;
    this.side = side;
    this.img = img;
    this.stage = stage || 0;

    let sizeVariation = random(0.5, 0.9);
    this.baseWidth = size.w * sizeVariation;
    this.baseHeight = size.h * sizeVariation;

    this.scale = 0.05;
    this.targetScale = random(0.45, 0.75);
    this.maxScale = this.targetScale + 0.05;

    this.attachPoint = random(0.2, 0.95);

    this.baseAngle = this.side * random(30, 95);
    this.tilt = random(-20, 20);

    this.swayOffset = random(1000);
    this.swaySpeed = random(0.02, 0.04);
    this.swayAmount = 6;
    this.currentSway = 0;

    this.health = 1.0;
    this.isWilting = false;
  }

  getAttachPosition() {
    if (!this.segment) return { x: 0, y: 0 };

    let t = this.attachPoint;
    let segAngle = this.segment.angle + this.segment.currentSway;
    let len = this.segment.length * t;
    let x = this.segment.startX + cos(radians(segAngle)) * len;
    let y = this.segment.startY + sin(radians(segAngle)) * len;

    return { x: x, y: y };
  }

  update(config, isInLight) {
    let growthSpeed = config.leafGrowthSpeed;
    if (isInLight) {
      growthSpeed *= 1.5;
    }

    if (!this.isWilting) {
      this.scale = lerp(this.scale, this.targetScale, growthSpeed);
      this.scale = min(this.scale, this.maxScale);
    } else {
      this.scale = lerp(this.scale, 0.3, 0.02);
      this.health -= 0.01;
    }

    if (config.swayEnabled) {
      this.swayOffset += this.swaySpeed;
      let windEffect = isInLight ? 0.5 : 1.0;
      this.currentSway = sin(this.swayOffset) * this.swayAmount * windEffect;
    } else {
      this.currentSway = 0;
    }
  }

  display() {
    if (!this.segment) return;
    if (this.segment.length < 5) return;

    let pos = this.getAttachPosition();

    push();
    translate(pos.x, pos.y);

    let segAngle = this.segment.angle + this.segment.currentSway;
    // 🔄 잎 방향 반전: +90 사용
    let totalAngle = segAngle + 90 + this.baseAngle + this.tilt + this.currentSway;
    rotate(radians(totalAngle));

    let w = this.baseWidth * this.scale;
    let h = this.baseHeight * this.scale;

    if (this.img) {
      imageMode(CENTER);

      if (this.isWilting) {
        tint(150, 140, 100, 200);
      }

      image(this.img, 0, -h * 0.5, w, h);
      noTint();
    } else {
      fill(this.isWilting ? color(120, 120, 60) : color(80, 160, 80));
      noStroke();

      beginShape();
      vertex(0, 0);
      bezierVertex(w * 0.5, -h * 0.2, w * 0.4, -h * 0.6, 0, -h);
      bezierVertex(-w * 0.4, -h * 0.6, -w * 0.5, -h * 0.2, 0, 0);
      endShape(CLOSE);

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
    return { x: pos.x - w / 2, y: pos.y - h, w: w, h: h };
  }

  getDisplaySize() {
    return {
      w: this.baseWidth * this.scale,
      h: this.baseHeight * this.scale
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
  constructor(attachSegment, img, size, stage) {
    this.segment = attachSegment;
    this.img = img;
    this.stage = stage || 0;

    let sizeVariation = random(0.85, 1.0);
    this.baseWidth = size.w * sizeVariation;
    this.baseHeight = size.h * sizeVariation;

    this.scale = 0.1;
    this.targetScale = 1.0;

    this.swayOffset = random(1000);
    this.swaySpeed = 0.015;
    this.swayAmount = 4;
    this.currentSway = 0;

    this.bloomProgress = 0;
    this.isFullyBloomed = false;

    this.pollenParticles = [];
    this.pollenTimer = 0;
  }

  getPosition() {
    if (!this.segment) return { x: 0, y: 0 };
    return {
      x: this.segment.getSwayEndX(),
      y: this.segment.getSwayEndY()
    };
  }

  update(config, isInLight) {
    let growthSpeed = config.flowerGrowthSpeed;
    if (isInLight) {
      growthSpeed *= 1.8;
    }

    this.scale = lerp(this.scale, this.targetScale, growthSpeed);
    this.bloomProgress = this.scale / this.targetScale;

    if (this.bloomProgress > 0.95 && !this.isFullyBloomed) {
      this.isFullyBloomed = true;
    }

    if (config.swayEnabled) {
      this.swayOffset += this.swaySpeed;
      this.currentSway = sin(this.swayOffset) * this.swayAmount;
    } else {
      this.currentSway = 0;
    }

    if (this.isFullyBloomed && isInLight) {
      this.pollenTimer++;
      if (this.pollenTimer > 30) {
        this.pollenTimer = 0;
        this._spawnPollen();
      }
    }

    for (let i = this.pollenParticles.length - 1; i >= 0; i--) {
      let p = this.pollenParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.02;
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
    if (this.segment.length < this.segment.targetLength * 0.5) return;

    let pos = this.getPosition();

    for (let p of this.pollenParticles) {
      let alpha = map(p.life, 0, 80, 0, 180);
      fill(255, 230, 150, alpha);
      noStroke();
      circle(p.x, p.y, p.size);
    }

    push();
    translate(pos.x, pos.y);

    let segAngle = this.segment.angle + this.segment.currentSway;
    // 🔄 꽃 방향 반전: +90 사용
    rotate(radians(segAngle + 90 + this.currentSway));

    let w = this.baseWidth * this.scale;
    let h = this.baseHeight * this.scale;

    if (this.img) {
      imageMode(CENTER);
      image(this.img, 0, -h * 0.4, w, h);
    } else {
      this._drawDefaultFlower(w, h);
    }

    pop();
  }

  _drawDefaultFlower(w, h) {
    let petalCount = 5;
    let petalSize = min(w, h) * 0.4;

    for (let i = 0; i < petalCount; i++) {
      push();
      rotate(radians((360 / petalCount) * i));
      fill(255, 180, 200);
      noStroke();
      ellipse(0, -petalSize * 0.7, petalSize * 0.7, petalSize * 1.2);
      pop();
    }

    fill(255, 220, 100);
    noStroke();
    circle(0, 0, petalSize * 0.6);
  }

  getBounds() {
    let pos = this.getPosition();
    let w = this.baseWidth * this.scale;
    let h = this.baseHeight * this.scale;
    return { x: pos.x - w / 2, y: pos.y - h, w: w, h: h };
  }

  getDisplaySize() {
    return {
      w: this.baseWidth * this.scale,
      h: this.baseHeight * this.scale
    };
  }
}


// ============================================
// Plant 클래스: 메인 식물 객체
// ============================================
class Plant {
  constructor(x, y, images, config) {
    this.x = x;
    this.y = y;

    this.config = Object.assign({}, DEFAULT_PLANT_CONFIG, config || {});
    
    // 꽃 높이 다양화: maxSegments에 ±3 랜덤 변동 추가
    this.config.maxSegments = this.config.maxSegments + floor(random(-3, 4));
    this.config.maxSegments = max(8, this.config.maxSegments); // 최소 8개 보장

    this.images = images || { stems: [], leaves: [], flowers: [] };

    this.flowerTypeIndex = floor(random(4));

    this.growth = 0;
    this.stage = 0;
    this.health = this.config.maxHealth;
    this.isDead = false;
    this.isInLight = false;

    this.segments = [];
    this.leaves = [];
    this.flower = null;

    this.debris = [];

    this.w = 60;
    this.h = 0;
    this._hitboxCenterX = x;
    this._hitboxCenterY = y;

    this._swayTime = random(0, TWO_PI);

    this._addFirstSegment();
  }

  _addFirstSegment() {
    let stemImg = this._getStemImage();
    let seg = new Segment(
      this.x,
      this.y,
      -90 + random(-5, 5),
      stemImg,
      0,
      this.config.maxSegments
    );
    seg.targetLength = this.config.segmentLength;
    this.segments.push(seg);
  }

  update(lightObj, mosses) {
    this._updateDebris();

    if (this.isDead) return;

    this.isInLight = this._checkInLight(lightObj);
    this._handleLight(lightObj);
    this._handleMoss(mosses);
    this._handleHealthRegen();
    this._updateGrowth(lightObj);
    this._updateStage();
    this._updateComponents(lightObj);
    this._updateHitbox();
  }

  display() {
    for (let d of this.debris) {
      d.display();
    }

    if (this.isDead) return;

    for (let seg of this.segments) {
      seg.display();
    }

    for (let leaf of this.leaves) {
      leaf.display();
    }

    if (this.flower) {
      this.flower.display();
    }

    if (typeof debugMode !== 'undefined' && debugMode) {
      this._drawDebug();
    }
  }

  _checkInLight(lightObj) {
    if (!lightObj) return false;
    let tip = this._getTipPosition();
    let d = dist(tip.x, tip.y, lightObj.x, lightObj.y);
    return d < lightObj.r;
  }

  _handleLight(lightObj) {
    if (!lightObj) return;

    let tip = this._getTipPosition();
    let d = dist(tip.x, tip.y, lightObj.x, lightObj.y);

    if (d < lightObj.r) {
      let intensity = map(d, 0, lightObj.r, this.config.lightGrowthMultiplier, 0.8);
      this.growth += this.config.growthRate * intensity;
    } else {
      this.growth += this.config.growthRate * this.config.baseGrowthSpeed;
    }
    this.growth = min(this.growth, this.config.maxGrowth);
  }

  _handleMoss(mosses) {
    if (!mosses || mosses.length === 0) return;

    let isTouchingMoss = false;
    for (let moss of mosses) {
      if (moss.checkCollisionWithPlant && moss.checkCollisionWithPlant(this)) {
        isTouchingMoss = true;
        break;
      }
    }

    if (isTouchingMoss) {
      this.takeDamage(this.config.mossDamagePerFrame);

      if (this.health < this.config.maxHealth * 0.5) {
        for (let leaf of this.leaves) {
          if (!leaf.isWilting && random() < 0.01) {
            leaf.startWilting();
          }
        }
      }
    }
  }

  _handleHealthRegen() {
    if (this.health >= this.config.maxHealth) return;

    let regenRate = this.config.healthRegenRate;
    if (this.isInLight) {
      regenRate += this.config.healthRegenLightBonus;
    }

    this.health = min(this.health + regenRate, this.config.maxHealth);
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this._die();
    }
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;
    
    // 부서지는 소리 재생 (crack1~crack5 중 랜덤)
    if (typeof crackSounds !== 'undefined' && crackSounds.length > 0) {
      let randomCrack = crackSounds[floor(random(crackSounds.length))];
      if (randomCrack && !randomCrack.isPlaying()) {
        randomCrack.setVolume(0.5);
        randomCrack.play();
      }
    }
    
    this._spawnDebris();
  }

  _spawnDebris() {
    let useGray = this.config.grayscaleOnDeath;

    for (let leaf of this.leaves) {
      let pos = leaf.getAttachPosition();
      let size = leaf.getDisplaySize();
      // Leaf display: segAngle + 90 + baseAngle + tilt + currentSway
      let segAngle = leaf.segment.angle + leaf.segment.currentSway;
      let leafDisplayAngle = segAngle + 90 + leaf.baseAngle + leaf.tilt + leaf.currentSway;

      this.debris.push(new Debris(
        leaf.img,
        pos.x,
        pos.y,
        leafDisplayAngle,
        {
          grayscale: useGray,
          life: random(100, 160),
          vx: random(-1.2, 1.2) + leaf.side * 0.6,
          vy: random(-0.8, 0),
          displayWidth: size.w,
          displayHeight: size.h
        }
      ));
    }

    if (this.flower) {
      let pos = this.flower.getPosition();
      let size = this.flower.getDisplaySize();
      // Flower display: segAngle + 90 + currentSway
      let segAngle = this.flower.segment.angle + this.flower.segment.currentSway;
      let flowerDisplayAngle = segAngle + 90 + this.flower.currentSway;

      this.debris.push(new Debris(
        this.flower.img,
        pos.x,
        pos.y,
        flowerDisplayAngle,
        {
          grayscale: useGray,
          life: random(120, 180),
          vy: random(-1.5, -0.3),
          displayWidth: size.w,
          displayHeight: size.h
        }
      ));
    }

    for (let i = this.segments.length - 1; i >= 0; i -= 2) {
      let seg = this.segments[i];
      if (seg.length < 5) continue;

      let midX = (seg.startX + seg.getSwayEndX()) / 2;
      let midY = (seg.startY + seg.getSwayEndY()) / 2;
      // Segment display: angle - 90 + currentSway
      let segDisplayAngle = seg.angle - 90 + seg.currentSway;

      this.debris.push(new Debris(
        seg.img,
        midX,
        midY,
        segDisplayAngle,
        {
          grayscale: useGray,
          life: random(80, 130),
          vx: random(-0.8, 0.8),
          vy: random(-0.4, 0.4),
          displayWidth: ASSET_SIZES.stems[0].w,
          displayHeight: seg.length,
          srcX: 0,
          srcY: seg.sliceY,
          srcW: seg.img ? seg.img.width : undefined,
          srcH: seg.sliceHeight
        }
      ));
    }

    this.segments = [];
    this.leaves = [];
    this.flower = null;
  }

  _updateDebris() {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      this.debris[i].update();
      if (this.debris[i].isDead()) {
        this.debris.splice(i, 1);
      }
    }
  }

  _updateGrowth(lightObj) {
    if (this.segments.length === 0) return;

    let lastSeg = this.segments[this.segments.length - 1];

    if (lastSeg.isGrowing) return;

    if (this.segments.length < this.config.maxSegments) {
      let targetSegments = floor(this.growth * this.config.maxSegments);
      if (this.segments.length < targetSegments) {
        this._addSegment(lightObj);
      }
    }

    this._trySpawnLeaf();
    this._trySpawnFlower();
  }

  _addSegment(lightObj) {
    let lastSeg = this.segments[this.segments.length - 1];

    let newAngle = lastSeg.angle + random(-this.config.angleVariation, this.config.angleVariation);

    let diffToUp = this._angleDelta(newAngle, -90);
    newAngle += diffToUp * this.config.upwardTendency;
    newAngle = constrain(newAngle, -160, -20);

    let stemImg = this._getStemImage();
    let newSeg = new Segment(
      lastSeg.getSwayEndX(),
      lastSeg.getSwayEndY(),
      newAngle,
      stemImg,
      this.segments.length,
      this.config.maxSegments
    );
    newSeg.targetLength = this.config.segmentLength;

    this.segments.push(newSeg);
  }

  _trySpawnLeaf() {
    if (this.leaves.length >= this.config.maxLeaves) return;
    if (this.segments.length < 3) return;

    let interval = this.config.leafSpawnInterval;
    let expectedLeaves = floor((this.segments.length - 2) / interval);
    expectedLeaves = min(expectedLeaves, this.config.maxLeaves);

    if (this.leaves.length < expectedLeaves) {
      let baseIndex = 2 + this.leaves.length * interval;
      let randomOffset = floor(random(-1, 2));
      let segIndex = constrain(baseIndex + randomOffset, 2, this.segments.length - 1);

      let seg = this.segments[segIndex];

      let side = random() > 0.5 ? 1 : -1;

      let leafImg = this._getLeafImage();
      let leafSize = this._getLeafSize();

      let newLeaf = new Leaf(seg, side, leafImg, leafSize, this.stage);
      this.leaves.push(newLeaf);
    }
  }

  _trySpawnFlower() {
    if (this.flower) return;
    if (this.growth < this.config.flowerThreshold) return;
    if (this.segments.length < 5) return;

    let lastSeg = this.segments[this.segments.length - 1];
    if (lastSeg.isGrowing) return;

    let flowerImg = this._getFlowerImage();
    let flowerSize = this._getFlowerSize();

    this.flower = new Flower(lastSeg, flowerImg, flowerSize, this.stage);
  }

  _updateStage() {
    let thresholds = this.config.stageThresholds;
    let newStage = 0;

    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (this.growth >= thresholds[i]) {
        newStage = i;
        break;
      }
    }

    if (newStage !== this.stage) {
      this._onStageChange(this.stage, newStage);
      this.stage = newStage;
    }
  }

  _onStageChange(oldStage, newStage) {
    for (let leaf of this.leaves) {
      if (leaf.scale > 0.2) {
        let worldHeight = leaf.baseHeight * leaf.scale;

        leaf.img = this._getLeafImage();
        let newSize = this._getLeafSize();

        leaf.baseWidth = newSize.w;
        leaf.baseHeight = newSize.h;

        leaf.scale = worldHeight / newSize.h;
        leaf.stage = newStage;
      }
    }
  }

  _updateComponents(lightObj) {
    if (this.config.swayEnabled) {
      this._swayTime += 0.02;
      this.config.plantSway = sin(this._swayTime);
    } else {
      this.config.plantSway = 0;
    }

    for (let i = 0; i < this.segments.length; i++) {
      let seg = this.segments[i];

      if (i === 0) {
        seg.updateStart(this.x, this.y);
      } else {
        let parent = this.segments[i - 1];
        seg.updateStart(parent.getSwayEndX(), parent.getSwayEndY());
      }

      seg.update(lightObj, this.config);
    }

    for (let leaf of this.leaves) {
      leaf.update(this.config, this.isInLight);
    }

    if (this.flower) {
      this.flower.update(this.config, this.isInLight);
    }
  }

  _updateHitbox() {
    if (this.segments.length === 0) {
      this.w = 30;
      this.h = 30;
      this._hitboxCenterX = this.x;
      this._hitboxCenterY = this.y;
      return;
    }

    let minX = this.x, maxX = this.x;
    let minY = this.y, maxY = this.y;

    for (let seg of this.segments) {
      let endX = seg.getSwayEndX();
      let endY = seg.getSwayEndY();
      minX = min(minX, seg.startX, endX);
      maxX = max(maxX, seg.startX, endX);
      minY = min(minY, seg.startY, endY);
      maxY = max(maxY, seg.startY, endY);
    }

    for (let leaf of this.leaves) {
      let bounds = leaf.getBounds();
      minX = min(minX, bounds.x);
      maxX = max(maxX, bounds.x + bounds.w);
      minY = min(minY, bounds.y);
      maxY = max(maxY, bounds.y + bounds.h);
    }

    if (this.flower) {
      let bounds = this.flower.getBounds();
      minX = min(minX, bounds.x);
      maxX = max(maxX, bounds.x + bounds.w);
      minY = min(minY, bounds.y);
      maxY = max(maxY, bounds.y + bounds.h);
    }

    this.w = (maxX - minX) + 30;
    this.h = (maxY - minY) + 30;
    this._hitboxCenterX = (minX + maxX) / 2;
    this._hitboxCenterY = (minY + maxY) / 2;
  }

  _getTipPosition() {
    if (this.segments.length === 0) {
      return { x: this.x, y: this.y };
    }
    let last = this.segments[this.segments.length - 1];
    return { x: last.getSwayEndX(), y: last.getSwayEndY() };
  }

  _getStemImage() {
    if (!this.images.stems || this.images.stems.length === 0) return null;
    return this.images.stems[0];
  }

  _getLeafImage() {
    if (!this.images.leaves || this.images.leaves.length === 0) return null;
    let idx = min(this.stage, this.images.leaves.length - 1);
    return this.images.leaves[idx];
  }

  _getLeafSize() {
    let idx = min(this.stage, ASSET_SIZES.leaves.length - 1);
    return ASSET_SIZES.leaves[idx];
  }

  _getFlowerImage() {
    if (!this.images.flowers || this.images.flowers.length === 0) return null;
    let idx = min(this.flowerTypeIndex, this.images.flowers.length - 1);
    return this.images.flowers[idx];
  }

  _getFlowerSize() {
    return ASSET_SIZES.flowers[0];
  }

  checkCollision(target) {
    if (!target || this.isDead) return false;

    let centerX = this._hitboxCenterX;
    let centerY = this._hitboxCenterY;

    let targetX = target.x || 0;
    let targetY = target.y || 0;
    let targetR = target.r || target.size || 30;

    let closestX = constrain(targetX, centerX - this.w / 2, centerX + this.w / 2);
    let closestY = constrain(targetY, centerY - this.h / 2, centerY + this.h / 2);

    let d = dist(targetX, targetY, closestX, closestY);
    return d < targetR;
  }

  _angleDelta(from, to) {
    let d = (to - from + 540) % 360 - 180;
    return d;
  }

  _drawDebug() {
    push();

    noFill();
    stroke(255, 0, 0, 150);
    strokeWeight(1);
    rectMode(CENTER);
    rect(this._hitboxCenterX, this._hitboxCenterY, this.w, this.h);

    fill(255, 0, 255);
    noStroke();
    circle(this.x, this.y, 8);

    fill(255, 255, 0);
    noStroke();
    textSize(11);
    textAlign(LEFT, TOP);

    let infoX = this.x + this.w / 2 + 10;
    let infoY = this._hitboxCenterY - 60;

    text('Growth: ' + (this.growth * 100).toFixed(1) + '%', infoX, infoY);
    text('Stage: ' + this.stage, infoX, infoY + 14);
    text('HP: ' + this.health.toFixed(1) + '/' + this.config.maxHealth, infoX, infoY + 28);
    text('Segs: ' + this.segments.length, infoX, infoY + 42);
    text('Leaves: ' + this.leaves.length, infoX, infoY + 56);
    text('Light: ' + (this.isInLight ? 'YES' : 'NO'), infoX, infoY + 70);
    text('Flower: ' + this.flowerTypeIndex, infoX, infoY + 84);

    pop();
  }

  get hitbox() {
    return {
      x: this._hitboxCenterX,
      y: this._hitboxCenterY,
      w: this.w,
      h: this.h
    };
  }
}


// ============================================
// 이미지 로딩 헬퍼
// ============================================
function loadPlantAssets() {
  let assets = {
    stems: [],
    leaves: [],
    flowers: []
  };

  for (let path of PLANT_ASSETS.stems) {
    assets.stems.push(loadImage(path,
      function() { console.log('Loaded: ' + path); },
      function() { console.warn('Failed to load: ' + path); }
    ));
  }

  for (let path of PLANT_ASSETS.leaves) {
    assets.leaves.push(loadImage(path,
      function() { console.log('Loaded: ' + path); },
      function() { console.warn('Failed to load: ' + path); }
    ));
  }

  for (let path of PLANT_ASSETS.flowers) {
    assets.flowers.push(loadImage(path,
      function() { console.log('Loaded: ' + path); },
      function() { console.warn('Failed to load: ' + path); }
    ));
  }

  return assets;
}
