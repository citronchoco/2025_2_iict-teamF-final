class Particle {
    constructor(x, y) {
        this.pos = createVector(x, y); // 생성 위치 (알림 배너의 테두리)
        
        // 1. 랜덤한 방향
        this.vel = p5.Vector.random2D(); 
        // 2. 속도를 매우 작게 조정
        this.vel.mult(random(0.2, 1.5)); 
        
        this.acc = createVector(0, 0); // 가속도 (없음)
        this.size = random(1, 3); // 크기

        // 파티클 초기 색상 설정
        this.baseColor = color(255, 255, 255); // 흰색
        
        // 예시 2: 금색 계열 (저장 완료 느낌)
        // this.baseColor = color(255, 200, 50); 
    }

    update() {
        this.pos.add(this.vel);
        // 속도를 미세하게 줄여서 서서히 멈추는 효과
        this.vel.mult(0.99); 
    }

    display() {
        // 알림 배너와 함께 사라짐
        // 전역 변수 'alpha' 값을 그대로 투명도로 사용
        let displayColor = this.baseColor;
        displayColor.setAlpha(alpha);
        
        fill(displayColor);
        noStroke();
        ellipse(this.pos.x, this.pos.y, this.size);
    }
}