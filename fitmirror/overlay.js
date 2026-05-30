// Outfit placement only — no pose, camera, or asset loading.

var firstOutfitDrawLogged = false;

/**
 * Scales and draws a transparent outfit PNG anchored to the shoulders.
 */
export function drawOutfit(
  ctx,
  landmarks,
  outfitImg,
  canvasW,
  canvasH,
  scaleFactor,
  offsetX,
  offsetY
) {
  var left = landmarks[11];
  var right = landmarks[12];
  if (!left || !right || !outfitImg.naturalWidth) {
    return;
  }

  var leftX = left.x * canvasW;
  var leftY = left.y * canvasH;
  var rightX = right.x * canvasW;
  var rightY = right.y * canvasH;

  var shoulderWidth = Math.hypot(rightX - leftX, rightY - leftY);
  var outfitW = shoulderWidth * scaleFactor;
  var outfitH = (outfitImg.naturalHeight / outfitImg.naturalWidth) * outfitW;

  var centerX = (leftX + rightX) / 2;
  var shoulderY = (leftY + rightY) / 2;
  var x = centerX - outfitW / 2;
  var y = shoulderY - outfitH * 0.08;

  ctx.drawImage(outfitImg, x + offsetX, y + offsetY, outfitW, outfitH);

  if (!firstOutfitDrawLogged) {
    console.log("Drawing outfit at:", x, y, outfitW, outfitH);
    firstOutfitDrawLogged = true;
  }
}

var firstTrouserDrawLogged = false;

/**
 * Scales and draws trousers anchored from hips to ankles.
 */
export function drawTrousers(
  ctx,
  landmarks,
  trouserImg,
  canvasW,
  canvasH,
  offsetX,
  offsetY,
  scaleFactor
) {
  var leftHip = landmarks[23];
  var rightHip = landmarks[24];
  var leftAnkle = landmarks[27];
  var rightAnkle = landmarks[28];
  if (
    !leftHip ||
    !rightHip ||
    !leftAnkle ||
    !rightAnkle ||
    !trouserImg.naturalWidth
  ) {
    return;
  }

  var leftHipX = leftHip.x * canvasW;
  var leftHipY = leftHip.y * canvasH;
  var rightHipX = rightHip.x * canvasW;
  var rightHipY = rightHip.y * canvasH;
  var leftAnkleX = leftAnkle.x * canvasW;
  var leftAnkleY = leftAnkle.y * canvasH;
  var rightAnkleX = rightAnkle.x * canvasW;
  var rightAnkleY = rightAnkle.y * canvasH;

  var hipWidth = Math.hypot(rightHipX - leftHipX, rightHipY - leftHipY);
  var hipMidY = (leftHipY + rightHipY) / 2;
  var ankleMidY = (leftAnkleY + rightAnkleY) / 2;
  var trouserHeight = Math.abs(ankleMidY - hipMidY);

  var trouserW = hipWidth * scaleFactor;
  var trouserH = trouserHeight * 1.05;

  var centerX = (leftHipX + rightHipX) / 2;
  var x = centerX - trouserW / 2;
  var y = hipMidY - trouserH * 0.05;

  ctx.drawImage(trouserImg, x + offsetX, y + offsetY, trouserW, trouserH);

  if (!firstTrouserDrawLogged) {
    console.log("Drawing trousers at:", x, y, trouserW, trouserH);
    firstTrouserDrawLogged = true;
  }
}
