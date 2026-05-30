// Outfit placement only — no pose, camera, or asset loading.

var firstOutfitDrawLogged = false;

/**
 * Scales and draws a transparent outfit PNG anchored to the shoulders.
 */
export function drawOutfit(ctx, landmarks, outfitImg, canvasW, canvasH, scaleFactor) {
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

  ctx.drawImage(outfitImg, x, y, outfitW, outfitH);

  if (!firstOutfitDrawLogged) {
    console.log("Drawing outfit at:", x, y, outfitW, outfitH);
    firstOutfitDrawLogged = true;
  }
}
