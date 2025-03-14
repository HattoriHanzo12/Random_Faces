let savedCount = 0;

function setup() {
  createCanvas(400, 400); // Match the visual size
  for (let i = 0; i < 3; i++) {
    randomSeed(i); // Ensure different faces
    background(getRandomColor()); // Random background like body
    fill(getRandomColor()); // Random face color
    ellipse(width / 2, height / 2, 200, 200); // Face circle (200px)

    // Eyes
    fill(255); // White eyes
    let eyeSize = Math.floor(Math.random() * 31) + 20; // 20-50px
    ellipse(width / 2 - 50, height / 2 - 20, eyeSize, eyeSize); // Left eye
    ellipse(width / 2 + 50, height / 2 - 20, eyeSize, eyeSize); // Right eye
    fill(0); // Black pupils
    let pupilSize = eyeSize * 0.5; // Approximate pupil size
    ellipse(width / 2 - 50, height / 2 - 20, pupilSize, pupilSize); // Left pupil
    ellipse(width / 2 + 50, height / 2 - 20, pupilSize, pupilSize); // Right pupil

    // Mouth
    noFill();
    arc(width / 2, height / 2 + 30, 80, 40, 0, PI); // Fixed mouth shape

    saveCanvas('random_face_mint_' + i + '.png', 'png');
  }
  noLoop(); // Stop after saving
}

function draw() {
  // Empty to avoid continuous drawing
}

// Random color generator (HEX)
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
