const EAR_THRESHOLD = 0.22;
const DROWSINESS_TIME_THRESHOLD = 2000; // 2 seconds in milliseconds
const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
const FOREHEAD_ROI_INDICES = [10, 109, 67, 103, 54, 21, 162, 127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148];

// Signal processing functions
function movingAverageFilter(data, windowSize) {
  const result = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
      sum += data[j];
      count++;
    }
    result[i] = sum / count;
  }
  return result;
}

function bandpassFilter(data, lowFreq, highFreq, samplingRate) {
  const lowPassWindow = Math.round(samplingRate / lowFreq);
  const highPassWindow = Math.round(samplingRate / highFreq);
  
  const lowPass = movingAverageFilter(data, lowPassWindow);
  const highPass = movingAverageFilter(data, highPassWindow);
  
  return data.map((val, i) => lowPass[i] - highPass[i]);
}

export const computeMetrics = (frameData, state) => {
  const {
    landmarks,
    frame
  } = frameData;

  const {
    signalBuffer,
    timeBuffer,
    blinkCount,
    lastEyeState,
    drowsyStartTime,
    startTime
  } = state;

  // Eye tracking
  const leftEAR = getEyeAspectRatio(landmarks, LEFT_EYE_INDICES);
  const rightEAR = getEyeAspectRatio(landmarks, RIGHT_EYE_INDICES);
  const avgEAR = (leftEAR + rightEAR) / 2.0;

  let newBlinkCount = blinkCount;
  let newDrowsyStartTime = drowsyStartTime;
  let isDrowsy = false;
  let eyeState = 'open';

  // Blink and drowsiness detection
  if (avgEAR < EAR_THRESHOLD) {
    eyeState = 'closed';
    if (drowsyStartTime === null) {
      newDrowsyStartTime = Date.now();
    } else if (Date.now() - drowsyStartTime > DROWSINESS_TIME_THRESHOLD) {
      isDrowsy = true;
    }
  } else {
    eyeState = 'open';
    newDrowsyStartTime = null;
    if (lastEyeState === 'closed') {
      newBlinkCount++;
    }
  }

  // Heart rate calculation from forehead ROI
  const greenChannel = extractGreenChannel(frame, landmarks, FOREHEAD_ROI_INDICES);
  
  let newSignalBuffer = [...signalBuffer, greenChannel];
  let newTimeBuffer = [...timeBuffer, Date.now()];

  if (newSignalBuffer.length > 300) { // ~10s at 30fps
    newSignalBuffer = newSignalBuffer.slice(-300);
    newTimeBuffer = newTimeBuffer.slice(-300);
  }

  const { heartRate, hrv } = computeHRAndHRV(newSignalBuffer, newTimeBuffer);

  // Calculate blink rate (blinks per minute)
  const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
  const blinkRate = elapsed > 0.0833 ? (newBlinkCount / elapsed) : 0; // Only start calculating after 5 seconds

  return {
    blinkRate,
    heartRate,
    hrv,
    isDrowsy,
    blinkCount: newBlinkCount,
    lastEyeState: eyeState,
    drowsyStartTime: newDrowsyStartTime,
    signalBuffer: newSignalBuffer,
    timeBuffer: newTimeBuffer
  };
};

function getEyeAspectRatio(landmarks, indices) {
  try {
    const points = indices.map(i => {
      if (!landmarks[i] || landmarks[i].length !== 2) {
        throw new Error(`Invalid landmark at index ${i}`);
      }
      return {
        x: landmarks[i][0],
        y: landmarks[i][1]
      };
    });
    const A = euclideanDistance(points[1], points[5]);
    const B = euclideanDistance(points[2], points[4]);
    const C = euclideanDistance(points[0], points[3]);
    if (C === 0) return 0;
    return (A + B) / (2.0 * C);
  } catch (error) {
    console.error('Error calculating EAR:', error);
    return 0;
  }
}

function euclideanDistance(p1, p2) {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) + 
    Math.pow(p2.y - p1.y, 2)
  );
}

function extractGreenChannel(frame, landmarks, indices) {
  try {
    // Convert landmarks to pixel coordinates
    const points = indices.map(i => {
      if (!landmarks[i] || landmarks[i].length !== 2) {
        throw new Error(`Invalid landmark at index ${i}`);
      }
      return {
        x: Math.round(landmarks[i][0]),
        y: Math.round(landmarks[i][1])
      };
    });

    // Get bounding box of forehead region
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.max(0, Math.min(...xs));
    const maxX = Math.min(frame.width - 1, Math.max(...xs));
    const minY = Math.max(0, Math.min(...ys));
    const maxY = Math.min(frame.height - 1, Math.max(...ys));

    // Validate region size
    if (maxX <= minX || maxY <= minY) {
      throw new Error('Invalid region size');
    }

    // Get green channel mean from the region
    const ctx = frame.getContext('2d');
    const imageData = ctx.getImageData(minX, minY, maxX - minX, maxY - minY);
    let sum = 0;
    let count = 0;

    for (let i = 1; i < imageData.data.length; i += 4) {
      sum += imageData.data[i]; // Green channel
      count++;
    }

    return count > 0 ? sum / count : 0;
  } catch (error) {
    console.error('Error extracting green channel:', error);
    return 0;
  }
}

function computeHRAndHRV(signal, times) {
  if (signal.length < 90) { // Need at least 3s of data at 30fps
    return { heartRate: null, hrv: null };
  }

  try {
    // Calculate sampling rate
    const samplingRate = 1000 / ((times[times.length - 1] - times[0]) / times.length);
    
    // Normalize and detrend the signal
    const mean = signal.reduce((a, b) => a + b) / signal.length;
    const signalDetrended = signal.map(x => x - mean);
    
    // Apply bandpass filter (0.8-2.5 Hz for heart rate range of 48-150 BPM)
    const filtered = movingAverageFilter(signalDetrended, Math.round(samplingRate / 4));
    
    // Find peaks with adaptive threshold
    const stdDev = Math.sqrt(filtered.reduce((sum, x) => sum + x * x, 0) / filtered.length);
    const adaptiveThreshold = stdDev * 0.6;
    
    const peaks = [];
    const minPeakDistance = Math.round(samplingRate * 0.4); // Minimum 0.4s between peaks
    
    for (let i = 1; i < filtered.length - 1; i++) {
      if (filtered[i] > filtered[i - 1] && filtered[i] > filtered[i + 1] && 
          filtered[i] > adaptiveThreshold) {
        if (peaks.length === 0 || (i - peaks[peaks.length - 1]) >= minPeakDistance) {
          peaks.push(i);
        }
      }
    }
    
    if (peaks.length < 3) {
      console.log('Not enough peaks detected:', peaks.length);
      return { heartRate: null, hrv: null };
    }

    // Calculate intervals between peaks
    const peakTimes = peaks.map(i => times[i]);
    const intervals = [];
    for (let i = 1; i < peakTimes.length; i++) {
      const interval = peakTimes[i] - peakTimes[i - 1];
      if (interval > 400 && interval < 1500) { // Valid range for heart beats (40-150 BPM)
        intervals.push(interval);
      }
    }
    
    if (intervals.length < 2) {
      console.log('Not enough valid intervals:', intervals.length);
      return { heartRate: null, hrv: null };
    }

    // Calculate heart rate
    const meanInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    const heartRate = 60000 / meanInterval; // Convert to BPM

    // Calculate HRV (RMSSD method)
    const rmssd = Math.sqrt(
      intervals.slice(1)
        .map((interval, i) => Math.pow(interval - intervals[i], 2))
        .reduce((a, b) => a + b) / (intervals.length - 1)
    );

    // Plausibility checks
    if (heartRate < 45 || heartRate > 150) {
      console.log('Heart rate out of plausible range:', heartRate);
      return { heartRate: null, hrv: null };
    }

    console.log('Calculated metrics:', { heartRate, hrv: rmssd });
    return { heartRate, hrv: rmssd };
  } catch (error) {
    console.error('Error computing HR/HRV:', error);
    return { heartRate: null, hrv: null };
  }
}