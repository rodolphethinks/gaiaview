import * as faceapi from 'face-api.js';
import { createFaceMesh } from './faceMesh';
import { getEyeAspectRatio } from './metrics';

export const processFrame = async (webcamRef) => {
  const video = webcamRef.current.video;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  
  // Flip horizontally for mirror effect
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);

  const faceMesh = await createFaceMesh();
  const predictions = await faceMesh.estimateFaces(canvas);

  if (predictions.length > 0) {
    const landmarks = predictions[0].landmarks;
    return {
      landmarks,
      frame: canvas
    };
  }

  return null;
};