// classes/Moss.js

class Moss {
  constructor(img, startPos, parent = null, generation = 0) {
    this.img = img;
    this.parent = parent;
    this.generation = generation; // 확산 단계(너무 깊게 안 퍼지게)

    // 위치/성장 관련
    this.startPos = startPos.copy(); // 시작 위치
    this.progress = 0;
    this.growthSpeed = random(0.007, 0.018); // 느린 잠식
    this.angle = random(TWO_PI);

    // 타겟점: 주변 랜덤 방향 (곰팡이 분기 느낌)
    let branchAngle = random(-PI/2, PI/2) + this.angle;
    let branchDist = random(30, 110);
    let dir = createVector(cos(branchAngle), sin(branchAngle)).mult(branchDist);
    this.targetPos = p5.Vector.add(this.startPos, dir);

    this.pos = this.startPos.copy();

    // 크기: 분기당 크기 변화 (세대별 랜덤성)
    let baseSize = lerp(80, 36, generation / 7.0); // 세대 늘수록 작아지게
    this.finalW = random(baseSize * 0.6, baseSize * 1.2);
    this.finalH = random(baseSize * 0.7, baseSize * 1.2);
    this.w = 0;
    this.h = 0;

    // 시각적 노이즈
    this.noiseOff = random(1000);

    // 분기 관련
    this.maxBranches = floor(map(generation, 0, 6, random(2,3), 1)); // 세대 높으면 분기 적게
    this.branchesMade = 0;
    this.branchesDone = false;
  }

  update() {
    if (this.progress < 1.0) this.progress += this.growthSpeed;
    let easeProgress = sqrt(constrain(this.progress, 0, 1));
    this.pos = p5.Vector.lerp(this.startPos, this.targetPos, easeProgress);
    this.w = this.finalW * easeProgress;
    this.h = this.finalH * easeProgress;
    this.noiseOff += 0.1;
  }

  canBranch() {
    if (this.branchesDone) return false;
    if (this.generation >= 8) return false;         // 8세대 이상은 확산 멈춤
    if (this.progress < 0.70) return false;         // 크기 충분히 커질 때까진 안 퍼짐
    if (this.maxBranches > 0 && this.branchesMade >= this.maxBranches) {
      this.branchesDone = true;
      return false;
    }
    // 분기 확률 - "스멀스멀" 느낌은 확률(0.20~0.40)로
    if (random(1) > 0.28) return false;
    return true;
  }

  branch() {
    this.branchesMade++;
    // 주변 랜덤 각도+거리에 자식 생성
    let angle = random(TWO_PI);
    let distR = random(32, 100);
    let offset = createVector(cos(angle), sin(angle)).mult(distR);
    let childPos = p5.Vector.add(this.pos, offset);

    // 화면 밖이면 무시
    if (
      childPos.x < -60 || childPos.x > width + 60 ||
      childPos.y < -60 || childPos.y > height + 60
    ) return null;

    return new Moss(this.img, childPos, this, this.generation + 1);
  }

  display() {
    push();

    // 지직거리는 위치
    let jitterX = map(noise(this.noiseOff), 0, 1, -2, 2);
    let jitterY = map(noise(this.noiseOff + 100), 0, 1, -2, 2);

    // 부모-자식 연결선(곰팡이 네트워크)
    if (this.parent) {
      stroke(50, 90, 60, 50);
      strokeWeight(1.2 - this.generation * 0.13);
      line(
        this.parent.pos.x, this.parent.pos.y,
        this.pos.x + jitterX, this.pos.y + jitterY
      );
    }

    translate(this.pos.x + jitterX, this.pos.y + jitterY);
    rotate(this.angle);
    imageMode(CENTER);

    // 칙칙한 tint
    tint(120, 255, 180, 220);
    image(this.img, 0, 0, this.w, this.h);

    pop();
  }

  // 안전상 화면 벗어난 경우
  isOffScreen() {
    return (
      this.pos.x < -80 || this.pos.x > width + 80 ||
      this.pos.y < -80 || this.pos.y > height + 80
    );
  }

  checkCollision(target) {
    if (!target) return false;
    let myRadius = ((this.w + this.h) / 4) * 0.65;
    let targetRadius = target.size ? target.size / 2 : 10;
    let d = dist(this.pos.x, this.pos.y, target.x, target.y);
    return d < (myRadius + targetRadius);
  }
}
