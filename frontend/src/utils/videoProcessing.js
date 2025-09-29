import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@mediapipe/face_mesh';

let model = null;
let modelLoading = false;

const initializeModel = async () => {
  if (!model && !modelLoading) {
    try {
      modelLoading = true;
      console.log('Initializing face detection model...');
      model = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'mediapipe',
          refineLandmarks: true,
          maxFaces: 1,
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh'
        }
      );
      console.log('Face detection model initialized successfully');
    } catch (error) {
      console.error('Error initializing face detection model:', error);
      model = null;
    } finally {
      modelLoading = false;
    }
  }
  return model;
};

export const processFrame = async (webcamRef) => {
  if (!webcamRef || !webcamRef.video) {
    console.log('No webcam reference available');
    return null;
  }

  try {
    const model = await initializeModel();
    if (!model) {
      console.log('Face detection model not ready');
      return null;
    }

    const video = webcamRef.video;
    
    // Make sure video is ready
    if (video.readyState !== 4) {
      console.log('Video not ready:', video.readyState);
      return null;
    }

    console.log('Processing video frame...');
    const predictions = await model.estimateFaces(video);

    if (predictions && predictions.length > 0) {
      console.log('Face detected');
      const face = predictions[0];
      
      // Create canvas for frame processing
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // Draw the frame
      ctx.drawImage(video, 0, 0);

      // Convert keypoints to the format expected by metrics calculation
      const landmarks = face.keypoints.map(keypoint => [keypoint.x, keypoint.y]);

      return {
        landmarks: landmarks,
        frame: canvas
      };
    } else {
      console.log('No face detected in frame');
    }
  } catch (error) {
    console.error('Error in face detection:', error);
  }

  return null;
};