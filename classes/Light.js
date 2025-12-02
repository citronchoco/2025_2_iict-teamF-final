class Light {
  constructor(x, y, texture) {
    this.x = x;
    this.y = y;
    this.r = 100; // 반지름 (지름 200)
    this.texture = texture;
    this.particles = [];
  }

  update() {
    // 1. 마우스 위치 따라가기
    this.x = mouseX;
    this.y = mouseY;

    // 2. 파티클 계속 생성 (매 프레임 2~3개씩)
    for (let i = 0; i < 3; i++) {
      this.addParticle();
    }
  }

  display() {
    // 파티클 시스템 실행
    // 배열을 역순으로 순회해야 삭제 시 인덱스 오류가 안 남
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.run();
      if (p.isDead()) {
        this.particles.splice(i, 1);
      }
    }
  }

  addParticle() {
    // 현재 빛의 위치(this.x, this.y)에서 파티클 생성
    this.particles.push(new Particle(this.x, this.y, this.texture));
  }
}

// Light 클래스 내부에서만 사용하는 파티클 객체
class Particle {
  constructor(x, y, img) {
    this.loc = createVector(x, y);
    this.img = img;

    // [핵심] 가우시안 분포를 이용한 사방 퍼짐
    // x, y 모두 평균 0, 표준편차 0.8 정도로 설정하여 원형으로 퍼지게 함
    // 숫자를 키우면 더 빨리, 더 넓게 퍼짐
    let vx = randomGaussian() * 0.8;
    let vy = randomGaussian() * 0.8; // 위로만 가는 -1.0 제거함

    this.velocity = createVector(vx, vy);
    this.acceleration = createVector(0, 0);
    
    // 수명 (200x200 크기를 유지하려면 수명과 속도 조절 필요)
    this.lifespan = 255.0; 
  }

  run() {
    this.update();
    this.render();
  }

  update() {
    this.velocity.add(this.acceleration);
    this.loc.add(this.velocity);
    
    // 수명 감소 속도 (작을수록 오래 살아남아 구체가 커짐)
    this.lifespan -= 4.0; 
    
    // 가속도 초기화
    this.acceleration.mult(0);
  }

  render() {
    imageMode(CENTER);
    // 투명도 적용
    tint(255, this.lifespan);
    // 파티클 그리기 (텍스처가 있다면 텍스처 사용)
    if (this.img) {
      image(this.img, this.loc.x, this.loc.y);
    } else {
      // 텍스처 없으면 기본 원
      noStroke();
      fill(255, 255, 200, this.lifespan);
      ellipse(this.loc.x, this.loc.y, 10);
    }
    noTint(); // 틴트 초기화 (다른 그림에 영향 안 주게)
  }

  isDead() {
    return this.lifespan < 0.0;
  }
}