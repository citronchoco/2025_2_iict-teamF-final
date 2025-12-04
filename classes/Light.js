class Light {
  constructor(x, y, texture) {
    this.x = x;
    this.y = y;
    this.r = 100; // 빛의 영향 범위 (반지름)
    this.texture = texture;
    this.particles = [];
  }

  update() {
    // 1. 마우스 위치 따라가기 (부드러운 움직임을 원하면 lerp 사용 가능)
    this.x = mouseX;
    this.y = mouseY;

    // 2. 파티클 지속 생성
    if(frameCount%2==0){
      for (let i = 0; i < 2; i++) {
        this.addParticle();
      }
    }
  }

  display() {
    // [중요] 빛 효과를 위해 블렌드 모드 변경 (검은 배경에서 빛나보이게 함)
    // 배경이 밝은 경우 blendMode(BLEND)로 변경하거나 제거하세요.
    blendMode(ADD); 

    // 1. 중심 광원 그리기 (100x100 고정 크기)
    imageMode(CENTER);
    if (this.texture) {
      tint(255, 200); // 약간 투명하게
      // 텍스처가 배열로 들어오는 경우를 대비해 안전장치 (0번 인덱스 사용)
      let img = Array.isArray(this.texture) ? this.texture[0] : this.texture;
      if(img) image(img, this.x, this.y, 100, 100);
    }

    // 2. 파티클 시스템 실행 (주변 확산 효과)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.run();
      if (p.isDead()) {
        this.particles.splice(i, 1);
      }
    }
    
    // 블렌드 모드 복구 (다른 그림에 영향 안 주도록)
    blendMode(BLEND);
  }

  addParticle() {
    // 현재 위치에서 파티클 생성
    // 텍스처가 배열일 경우 랜덤 선택, 아니면 단일 텍스처 전달
    let imgToPass = Array.isArray(this.texture) ? random(this.texture) : this.texture;
    this.particles.push(new Particle(this.x, this.y, imgToPass));
  }
}

class Particle {
  constructor(x, y, img) {
    // 시작 위치: 완전 중앙보다는 약간의 분포를 가지고 시작하면 더 자연스러움
    this.loc = createVector(x + randomGaussian() * 5, y + randomGaussian() * 5);
    this.img = img;

    // 200x200(반지름 100)까지 퍼지려면 속도와 수명의 밸런스가 중요함
    // 속도를 높이면 더 멀리, 더 빨리 퍼짐
    let vx = randomGaussian() * 0.8;
    let vy = randomGaussian() * 0.8;

    this.velocity = createVector(vx, vy);
    
    // 파티클 크기 랜덤 (텍스처 전체를 100으로 그리면 너무 뭉개짐)
    // 주변부 파티클은 30~60 정도로 작게 그려서 '빛 가루' 느낌을 냄
    this.size = random(30, 60);

    // 수명
    this.lifespan = 255.0;
    // 수명 감소 속도: 이 값이 클수록 범위가 좁아짐 (빨리 사라짐)
    this.decay = random(4.0, 7.0); 
  }

  run() {
    this.update();
    this.render();
  }

  update() {
    this.loc.add(this.velocity);
    this.lifespan -= this.decay;
  }

  render() {
    imageMode(CENTER);
    
    // 수명이 다해갈수록 투명해짐
    tint(255, this.lifespan);
    
    if (this.img) {
      // 이미지 그리기 (회전 효과를 추가하면 더 기체처럼 보임)
      push();
      translate(this.loc.x, this.loc.y);
      // 파티클마다 약간 회전시켜서 반복되는 패턴 느낌 제거
      rotate(this.lifespan * 0.01); 
      image(this.img, 0, 0, this.size, this.size);
      pop();
    } else {
      noStroke();
      fill(255, 255, 200, this.lifespan);
      ellipse(this.loc.x, this.loc.y, this.size);
    }
    noTint();
  }

  isDead() {
    return this.lifespan < 0.0;
  }
}