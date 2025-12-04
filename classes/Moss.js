class Moss {
  constructor(img, startPos = null) {
    this.img = img;

    // === 시작 위치 설정 ===
    if (startPos) {
      startPos = startPos.copy();
    } else {
      let edge = floor(random(4));
      let margin = 1;
      if (edge === 0) {
        startPos = createVector(random(width), margin);
      } else if (edge === 1) {
        startPos = createVector(width - margin, random(height));
      } else if (edge === 2) {
        startPos = createVector(random(width), height - margin);
      } else {
        startPos = createVector(margin, random(height));
      }
    }

    // === 이끼 점들 관리 배열 ===
    this.points = [];
    this.maxPoints = 800;
    this.spawnInterval = 8;
    this.lastSpawnFrame = 0;

    this.addPoint(startPos.copy(), 0);

    // === 전체 생애 진행도 ===
    this.lifeProgress = 0;
    this.lifeSpeed = random(0.0005, 0.0008);
    
    // === 빛 관련 ===
    this.lightObj = null;
    this.isInLightRange = null;
  }

  addPoint(pos, generation) {
    let sizeOptions = [60, 100];
    let selectedSize = random(sizeOptions);
    
    let p = {
      pos: pos.copy(),
      generation: generation,
      progress: 0,
      growthSpeed: random(0.02, 0.04),
      noiseOff: random(1000),
      baseSize: selectedSize
    };
    this.points.push(p);
  }

  update(lightObj, isInLightRange) {
    this.lightObj = lightObj;
    this.isInLightRange = isInLightRange;
    
    this.lifeProgress = constrain(this.lifeProgress + this.lifeSpeed, 0, 1);
    
    // 2초마다 maxPoints 증가
    if (frameCount % 120 === 0) {
      this.maxPoints += 20;
      this.maxPoints = min(this.maxPoints, 1000);
    }
    
    for (let p of this.points) {
      if (p.progress < 1) {
        p.progress += p.growthSpeed * (0.7 + this.lifeProgress * 0.8);
      }
      p.noiseOff += 0.02;
    }

    if (frameCount - this.lastSpawnFrame > this.spawnInterval) {
      this.lastSpawnFrame = frameCount;
      this.trySpawn();
    }
  }

  trySpawn() {
    if (this.points.length >= this.maxPoints) return;
    
    let parent = random(this.points);
    if (!parent) return;
    
    if (parent.generation >= 50) return;
    
    if (parent.progress < 0.3 + 0.4 * random(1)) return;
    
    // 분기 확률 30%
    if (random(1) > 0.3) return;

    // 1~3개 생성
    let spawnCount = floor(random(1, 3));
    for (let i = 0; i < spawnCount; i++) {
      if (this.points.length >= this.maxPoints) break;
      
      // 화면 중앙 방향 계산
      let centerX = width / 2;
      let centerY = height / 2;
      let toCenter = createVector(centerX - parent.pos.x, centerY - parent.pos.y);
      let centerAngle = toCenter.heading();
      
      // 중앙 방향 ± 45도
      let angleVariation = random(-PI/4, PI/4);
      let ang = centerAngle + angleVariation;
      
      let distR = random(20, 60);
      let offset = createVector(cos(ang), sin(ang)).mult(distR);
      let childPos = p5.Vector.add(parent.pos, offset);
      
      if (this.lightObj && this.isInLightRange && 
          this.isInLightRange(childPos.x, childPos.y, this.lightObj)) {
        continue;
      }
      
      if (childPos.x < -200 || childPos.x > width + 200 || 
          childPos.y < -200 || childPos.y > height + 200) {
        continue;
      }
      
      this.addPoint(childPos, parent.generation + 1);
    }
  }

  grow() {
    this.lifeSpeed *= 1.2;
    this.maxPoints = min(1800, this.maxPoints + 120);
  }
  
  purify(light) {
    for (let i = this.points.length - 1; i >= 0; i--) {
      let p = this.points[i];
      let d = dist(p.pos.x, p.pos.y, light.x, light.y);
      if (d < (light.size || 30)) {
        this.points.splice(i, 1);
      }
    }
  }

  isOffScreen() {
    for (let p of this.points) {
      if (p.pos.x >= 0 && p.pos.x < width && 
          p.pos.y >= 0 && p.pos.y < height) {
        return false;
      }
    }
    return true;
  }

  checkCollision(target) {
    if (!target) return false;
    for (let p of this.points) {
      let currentSize = p.baseSize * sqrt(p.progress);
      let myRadius = currentSize / 2;
      let targetRadius = target.size ? target.size / 2 : 30;
      let d = dist(p.pos.x, p.pos.y, target.x, target.y);
      if (d < myRadius + targetRadius) return true;
    }
    return false;
  }
  
  checkCollisionWithPlant(plant) {
    for (let p of this.points) {
      let currentSize = p.baseSize * sqrt(p.progress);
      let halfSize = currentSize / 2;
      
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
    imageMode(CENTER);
    
    for (let p of this.points) {
      if (p.pos.x < -50 || p.pos.x > width + 50 ||
          p.pos.y < -50 || p.pos.y > height + 50) {
        continue;
      }
      
      let jitterX = map(noise(p.noiseOff), 0, 1, -1, 1);
      let jitterY = map(noise(p.noiseOff + 50), 0, 1, -1, 1);
      let x = p.pos.x + jitterX;
      let y = p.pos.y + jitterY;
      
      let currentSize = p.baseSize * sqrt(p.progress);
      
      let alpha = map(p.generation, 0, 50, 230, 120);
      alpha *= p.progress;
      
      tint(255, alpha);
      image(this.img, x, y, currentSize, currentSize);
      noTint();
      
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
