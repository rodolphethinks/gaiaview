import React from 'react';
import { Alert, Slide } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledAlert = styled(Alert)(({ theme }) => ({
  borderRadius: '12px',
  backgroundColor: theme.palette.mode === 'dark' ? '#991b1b' : undefined,
  '& .MuiAlert-icon': {
    color: '#fff'
  },
  '& .MuiAlert-message': {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 500
  }
}));

const AlertPanel = ({ isDrowsy }) => {
  if (!isDrowsy) return null;

  return (
    <Slide direction="up" in={isDrowsy} mountOnEnter unmountOnExit>
      <StyledAlert severity="error" variant="filled" icon={<span role="img" aria-label="warning">⚠️</span>}>
        Driver Drowsiness Detected - Take a Break!
      </StyledAlert>
    </Slide>
  );
};

export default AlertPanel;