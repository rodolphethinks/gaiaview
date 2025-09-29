import React, { forwardRef, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import Webcam from 'react-webcam';
import styled from '@emotion/styled';

const OverlayCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const WebcamContainer = styled(Box)`
  position: relative;
  width: 100%;
  height: auto;
`;

const WebcamView = forwardRef(({ isRunning, faceDetected }, ref) => {
  const videoConstraints = {
    width: 1800,
    height: 720,
    facingMode: "user"
  };

  useEffect(() => {
    // Ensure TensorFlow.js is ready
    const loadTf = async () => {
      try {
        await import('@tensorflow/tfjs');
        console.log('TensorFlow.js loaded successfully');
      } catch (error) {
        console.error('Error loading TensorFlow.js:', error);
      }
    };
    loadTf();
  }, []);

  return (
    <WebcamContainer>
      {isRunning && (
        <>
          <Webcam
            ref={ref}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            mirrored={true}
            style={{ width: '100%', height: 'auto' }}
            onUserMedia={() => console.log('Camera access granted')}
            onUserMediaError={(error) => console.error('Camera error:', error)}
          />
          {faceDetected && (
            <Box
              sx={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                backgroundColor: 'rgba(0, 255, 0, 0.7)',
                color: 'white',
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              Face Detected
            </Box>
          )}
        </>
      )}
    </WebcamContainer>
  );
});

export default WebcamView;