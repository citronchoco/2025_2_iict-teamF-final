let startBg;
let whiteOblique;

function preload() {
 startBg = loadImage(`assets/background/tone.jpg`)
 whiteOblique = loadFont(`assets/font/LeferiPointWhiteOblique.ttf`)
}


function setup() {
 createCanvas(1024, 768);
}


function draw() {
 drawStart();

 // 시작 화면에서 START와 TUTORIAL에 마우스를 올렸을 때 회색 반투명 원이 나타남
 let mouseOverStart = pow(mouseX - 345, 2) / pow(110, 2) + pow(mouseY - 555, 2) / pow(35, 2);
 let mouseOverTutorial = pow(mouseX - 679, 2) / pow(110, 2) + pow(mouseY - 555, 2) / pow(35, 2);
 // * 동일한 코드, if(((mouseX - 345)^2 / 110^2) + ((mouseY - 550)^2 / 35^2) < 1) {}
 if(mouseOverStart < 1) {
   noStroke()
   fill(220, 220, 220, 100)
   ellipse(345, 555, 220, 70)
 }
 if(mouseOverTutorial < 1) {
   noStroke()
   fill(220, 220, 220, 100)
   ellipse(679, 555, 220, 70)
 }
 // START를 눌렀을 때 (마우스오버 & 클릭) --> 게임 화면
 // if((mouseOverStart < 1) && mouseIsPressed) {
   // drawHUD();
 // }
 // TUTORIAL을 눌렀을 때 (마우스오버 & 클릭) --> 튜토리얼 화면
 // if((mouseOverTutorial < 1) && mouseIsPressed) {
   // drawTutorial();
 // }
}

function drawStart() {
 image(startBg, 0, 0, 1024, 768)
 stroke(255)


 // 게임 제목과 START, TUTORIAL 표시
 textFont(whiteOblique)
 strokeWeight(1)
 fill(255)
 textSize(30)
 textAlign(CENTER, CENTER)
 text(`START`, 345, 550)
 text(`TUTORIAL`, 679, 550)
 textSize(60)
 text(`빛과 그림자의 정원`, 512, 300)
}