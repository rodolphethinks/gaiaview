import React from 'react';
import { Paper, Grid, Typography } from '@mui/material';

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
    <Grid container spacing={2}>
      {metricItems.map(({ label, value, unit }) => (
        <Grid item xs={4} key={label}>
          <Paper elevation={3} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="subtitle2" color="textSecondary">
              {label}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {unit}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default MetricsPanel;