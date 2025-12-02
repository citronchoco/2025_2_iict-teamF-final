class Moss {
  constructor(img) {
    this.img = img;
    let edge = floor(random(4));
    let margin = 40;
    if (edge === 0) {
      this.rootPos = createVector(random(width), -margin);
    } else if (edge === 1) {
      this.rootPos = createVector(width + margin, random(height));
    } else if (edge === 2) {
      this.rootPos = createVector(random(width), height + margin);
    } else {
      this.rootPos = createVector(-margin, random(height));
    }
    this.spots = [];
    this.maxSpots = 120;
    this.spawnInterval = 10;
    this.lastSpawnFrame = 0;
    this.addSpot(this.rootPos.copy(), null, 0);
    this.lifeProgress = 0;
    this.lifeSpeed = random(0.0008, 0.0015);
  }
  addSpot(pos, parent, generation) {
    let baseSize = lerp(80, 25, constrain(generation / 7, 0, 1));
    let finalW = random(baseSize * 0.6, baseSize * 1.3);
    let finalH = random(baseSize * 0.6, baseSize * 1.3);
    let spot = {
      parent: parent,
      generation: generation,
      startPos: pos.copy(),
      targetPos: this.makeTargetFrom(pos, generation),
      pos: pos.copy(),
      progress: 0,
      growthSpeed: random(0.01, 0.03),
      finalW: finalW,
      finalH: finalH,
      w: 0,
      h: 0,
      angle: random(TWO_PI),
      noiseOff: random(1000),
      branchesMade: 0,
      maxBranches: floor(map(generation, 0, 7, random(2, 3), 1)),
      branchedOut: false
    };
    this.spots.push(spot);
  }
  makeTargetFrom(pos, generation) {
    let center = createVector(width / 2, height / 2);
    let dir = p5.Vector.sub(center, pos);
    dir.rotate(random(-PI / 3, PI / 3));
    let baseDist = lerp(110, 30, constrain(generation / 7, 0, 1));
    dir.setMag(random(baseDist * 0.6, baseDist * 1.3));
    return p5.Vector.add(pos, dir);
  }
  update() {
    this.lifeProgress = constrain(this.lifeProgress + this.lifeSpeed, 0, 1);
    for (let spot of this.spots) {
      if (spot.progress < 1.0) {
        spot.progress += spot.growthSpeed * (0.3 + this.lifeProgress * 1.2);
      }
      let ease = sqrt(constrain(spot.progress, 0, 1));
      spot.pos = p5.Vector.lerp(spot.startPos, spot.targetPos, ease);
      spot.w = spot.finalW * ease;
      spot.h = spot.finalH * ease;
      spot.noiseOff += 0.08;
    }
    if (frameCount - this.lastSpawnFrame > this.spawnInterval) {
      this.lastSpawnFrame = frameCount;
      this.tryBranch();
    }
  }
  tryBranch() {
    if (this.spots.length >= this.maxSpots) return;
    let candidate = random(this.spots);
    if (!candidate) return;
    if (candidate.branchedOut) return;
    if (candidate.generation >= 8) return;
    if (candidate.progress < 0.6) return;
    if (random(1) > 0.35) return;
    let branchCount = floor(random(1, 3));
    for (let i = 0; i < branchCount; i++) {
      if (this.spots.length >= this.maxSpots) break;
      let angle = random(TWO_PI);
      let distR = random(25, 90);
      let offset = createVector(cos(angle), sin(angle)).mult(distR);
      let childPos = p5.Vector.add(candidate.pos, offset);
      if (
        childPos.x < -80 || childPos.x > width + 80 ||
        childPos.y < -80 || childPos.y > height + 80
      ) {
        continue;
      }
      this.addSpot(childPos, candidate, candidate.generation + 1);
    }
    candidate.branchesMade += branchCount;
    if (candidate.branchesMade >= candidate.maxBranches) {
      candidate.branchedOut = true;
    }
  }
  grow() {
    this.lifeSpeed *= 1.2;
  }
  isOffScreen() {
    return (
      this.rootPos.x < -150 || this.rootPos.x > width + 150 ||
      this.rootPos.y < -150 || this.rootPos.y > height + 150
    );
  }
  checkCollision(target) {
    if (!target) return false;
    for (let spot of this.spots) {
      let myRadius = ((spot.w + spot.h) / 4) * 0.6;
      let targetRadius = target.size ? target.size / 2 : 30;
      let d = dist(spot.pos.x, spot.pos.y, target.x, target.y);
      if (d < myRadius + targetRadius) return true;
    }
    return false;
  }
  display() {
    push();
    imageMode(CENTER);
    for (let spot of this.spots) {
      let jitterX = map(noise(spot.noiseOff), 0, 1, -2, 2);
      let jitterY = map(noise(spot.noiseOff + 100), 0, 1, -2, 2);
      if (spot.parent) {
        let alpha = map(spot.generation, 0, 8, 120, 20);
        let weight = max(0.3, 1.6 - spot.generation * 0.18);
        stroke(40, 90, 50, alpha);
        strokeWeight(weight);
        line(
          spot.parent.pos.x,
          spot.parent.pos.y,
          spot.pos.x + jitterX,
          spot.pos.y + jitterY
        );
      }
      push();
      translate(spot.pos.x + jitterX, spot.pos.y + jitterY);
      rotate(spot.angle);
      tint(100, 190, 120, 230);
      image(this.img, 0, 0, spot.w, spot.h);
      if (typeof debugMode !== "undefined" && debugMode) {
        noFill();
        stroke(255, 0, 0);
        rectMode(CENTER);
        rect(0, 0, spot.w * 0.6, spot.h * 0.6);
      }
      pop();
    }
    pop();
  }
}
