import React from 'react';
import { Paper, Grid, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const MetricCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: 'center',
  backgroundColor: 'rgba(17, 24, 39, 0.6)',
  backdropFilter: 'blur(8px)',
  borderRadius: '12px',
  border: '1px solid rgba(75, 85, 99, 0.3)',
}));

const MetricsPanel = ({ metrics }) => {
  const { blinkRate, heartRate, hrv } = metrics;

  const formatValue = (value, precision = 1) => {
    return value !== null ? value.toFixed(precision) : 'N/A';
  };

  const metricItems = [
    {
      label: 'Blink Rate',
      value: formatValue(blinkRate, 2),
      unit: 'per min'
    },
    {
      label: 'Heart Rate',
      value: formatValue(heartRate),
      unit: 'bpm'
    },
    {
      label: 'HRV',
      value: formatValue(hrv),
      unit: 'ms'
    }
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
        Driver Metrics
      </Typography>
      <Grid container spacing={2}>
        {metricItems.map(({ label, value, unit }) => (
          <Grid item xs={12} key={label}>
            <MetricCard elevation={0}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                {label}
              </Typography>
              <Typography variant="h4" component="div" sx={{ 
                color: 'text.primary',
                fontWeight: 600,
                fontSize: '2rem'
              }}>
                {value}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {unit}
              </Typography>
            </MetricCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MetricsPanel;