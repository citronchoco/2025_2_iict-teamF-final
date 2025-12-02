class Moss {
  constructor(img) {
    this.img = img;

    let edge = floor(random(4));
    let margin = 1;
    let startPos;
    if (edge === 0) {
      startPos = createVector(random(width), margin);        // Top
    } else if (edge === 1) {
      startPos = createVector(width - margin, random(height)); // Right
    } else if (edge === 2) {
      startPos = createVector(random(width), height - margin); // Bottom
    } else {
      startPos = createVector(margin, random(height));         // Left
    }

    this.points = [];
    this.maxPoints = 1200;      // 더 촘촘하게 뒤덮을 수 있게 늘림
    this.spawnInterval = 2;     // 더 자주 분기
    this.lastSpawnFrame = 0;

    this.addPoint(startPos.copy(), 0);

    this.lifeProgress = 0;
    this.lifeSpeed = random(0.001, 0.0018); // 느릿하게 퍼지는 효과
  }

  addPoint(pos, generation) {
    let p = {
      pos: pos.copy(),
      generation: generation,
      progress: 0,
      growthSpeed: random(0.05, 0.09),      // 조금 더 빠른 성장
      noiseOff: random(1000),
      baseSize: random(2.0, 3.5)
    };
    this.points.push(p);
  }

  update() {
    this.lifeProgress = constrain(this.lifeProgress + this.lifeSpeed, 0, 1);
    for (let p of this.points) {
      if (p.progress < 1) {
        p.progress += p.growthSpeed * (0.7 + this.lifeProgress * 0.8); // 퍼지는 속도 조정
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
    if (parent.generation >= 12) return;
    if (parent.progress < 0.3 + 0.4 * random(1)) return;    // 어느정도 성장한 점만 분기
    if (random(1) > 0.5) return;

    let spawnCount = floor(random(2, 5));
    for (let i = 0; i < spawnCount; i++) {
      if (this.points.length >= this.maxPoints) break;
      let ang = random(TWO_PI);
      let distR = random(10, 25);                            // 주변 가까운 곳에 촘촘하게
      let offset = createVector(cos(ang), sin(ang)).mult(distR);
      let childPos = p5.Vector.add(parent.pos, offset);
      if (
        childPos.x < 0 || childPos.x > width ||
        childPos.y < 0 || childPos.y > height
      ) continue;
      this.addPoint(childPos, parent.generation + 1);
    }
  }

  grow() {
    this.lifeSpeed *= 1.2;
    this.maxPoints = min(1800, this.maxPoints + 120);     // 촘촘하게 더 퍼질 수 있음
  }

  isOffScreen() {
    for (let p of this.points) {
      if (
        p.pos.x >= 0 && p.pos.x < width &&
        p.pos.y >= 0 && p.pos.y < height
      ) return false;
    }
    return true;
  }

  checkCollision(target) {
    if (!target) return false;
    for (let p of this.points) {
      let size = p.baseSize * (0.6 + this.lifeProgress);
      let myRadius = size * 1.2;
      let targetRadius = target.size ? target.size / 2 : 16;
      let d = dist(p.pos.x, p.pos.y, target.x, target.y);
      if (d < myRadius + targetRadius) return true;
    }
    return false;
  }

  display() {
    push();
    noStroke();
    for (let p of this.points) {
      let jitterX = map(noise(p.noiseOff), 0, 1, -1, 1);
      let jitterY = map(noise(p.noiseOff + 50), 0, 1, -1, 1);
      let x = p.pos.x + jitterX;
      let y = p.pos.y + jitterY;
      let size = p.baseSize * (0.7 + this.lifeProgress);
      let baseDark = color(12, 50, 25, map(p.generation, 0, 12, 215, 110));
      fill(baseDark);
      circle(x, y, size);
    }
    pop();
  }
}
