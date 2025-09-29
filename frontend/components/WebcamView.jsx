import React, { forwardRef } from 'react';
import { Box } from '@mui/material';
import Webcam from 'react-webcam';

const WebcamView = forwardRef(({ isRunning }, ref) => {
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };

  return (
    <Box sx={{ width: '100%', height: 'auto' }}>
      {isRunning && (
        <Webcam
          ref={ref}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          style={{ width: '100%', height: 'auto' }}
        />
      )}
    </Box>
  );
});

export default WebcamView;