let tutorialBg;
let whiteOblique;
let tutorialTitle;
let tutorialDescript;


function preload() {
 tutorialBg = loadImage(`assets/background/ttwo.jpg`)
 whiteOblique = loadFont(`assets/font/LeferiPointWhiteOblique.ttf`)
}


function setup() {
 createCanvas(1024, 768);
}


function draw() {
 drawTutorial();
 
 // 튜토리얼 화면 내 START 마우스오버 시 회색 반투명 원 나타남
 let mouseOverStart2 = pow(mouseX - 512, 2) / pow(110, 2) + pow(mouseY - 605, 2) / pow(35, 2);
 if(mouseOverStart2 < 1) {
  noStroke()
  fill(220, 220, 220, 100)
  ellipse(512, 605, 220, 70)
 }
}

function drawTutorial() {
 image(tutorialBg, 0, 0, 1024, 768)

 // TUTORIAL 텍스트
 tutorialTitle = `빛과 그림자의 정원`
 tutorialDescript = `40초마다 새벽-낮-황혼-밤 순으로 시간이 흘러갑니다.\n 마우스를 통해 다양한 식물을 조종해 자유롭게 정원을 꾸밀 수 있습니다.\n 밤 시간에는 조종이 불가하며 이끼가 랜덤하게 생성됩니다.\n 중간에 언제든지 스페이스바를 눌러 정원의 모습을 저장하실 수 있습니다.`
 
 textFont(whiteOblique)
 textAlign(CENTER, CENTER)
 strokeWeight(3)
 fill(255)
 textSize(20)
 textLeading(30)
 text(tutorialTitle, 512, 120)
 strokeWeight(1)
 textSize(25)
 textLeading(70)
 text(tutorialDescript, 512, 350)
 textSize(30)
 text(`START`, 512, 600)
}