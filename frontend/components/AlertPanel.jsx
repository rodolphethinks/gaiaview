import React from 'react';
import { Alert } from '@mui/material';

const AlertPanel = ({ isDrowsy }) => {
  if (!isDrowsy) return null;

  return (
    <Alert severity="warning" variant="filled">
      🚨 Drowsiness Detected!
    </Alert>
  );
};

export default AlertPanel;