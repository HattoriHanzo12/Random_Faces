function setup() {
  createCanvas(200, 200);
  for (let i = 0; i < 5; i++) { // Generate 5 new samples
    saveFace(i + 8); // Start from index 8 to avoid overwriting 0-7
  }
}

function saveFace(index) {
  // Random background
  background(random(255), random(255), random(255));
  generateFace();
  save('random_face_mint_' + index + '.png');
}

function generateFace() {
  // Random face color
  let faceColor = color(random(100, 200), random(100, 200), random(100, 200));
  fill(faceColor);
  ellipse(width / 2, height / 2, 100, 100); // Head

  // Random eye shapes and positions
  let eyeSize = random(8, 15); // Random eye diameter
  let eyeOffsetX = random(15, 25); // Random horizontal offset
  let eyeOffsetY = random(15, 25); // Random.Concurrent vertical offset
  let eyeShape = random(1); // 0-1 to decide shape (circle or oval)
  let ovalHeight = random(5, 12); // Random vertical stretch for oval

  // Debug: Log the random values to ensure they're changing
  console.log("Eye Size: " + eyeSize + ", OffsetX: " + eyeOffsetX + ", OffsetY: " + eyeOffsetY + ", Shape: " + eyeShape);

  fill(0); // Eyes in black
  if (eyeShape < 0.5) {
    // Circular eyes
    ellipse(width / 2 - eyeOffsetX, height / 2 - eyeOffsetY, eyeSize, eyeSize);
    ellipse(width / 2 + eyeOffsetX, height / 2 - eyeOffsetY, eyeSize, eyeSize);
  } else {
    // Oval eyes
    ellipse(width / 2 - eyeOffsetX, height / 2 - eyeOffsetY, eyeSize, ovalHeight);
    ellipse(width / 2 + eyeOffsetX, height / 2 - eyeOffsetY, eyeSize, ovalHeight);
  }

  // Smile with random height
  arc(width / 2, height / 2 + 20, 40, random(15, 25), 0, PI);
}
