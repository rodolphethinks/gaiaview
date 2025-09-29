import React, { useState, useEffect, useRef } from 'react';
import { Container, Grid, Paper, Typography, Box, Button } from '@mui/material';
import { LineChart } from '@mui/x-charts';
import WebcamView from './components/WebcamView';
import MetricsPanel from './components/MetricsPanel';
import AlertPanel from './components/AlertPanel';
import { processFrame } from './utils/videoProcessing';
import { computeMetrics } from './utils/metricsCalculation';

const BUFFER_SIZE = 300; // ~10s if 30 FPS

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState({
    blinkRate: 0,
    heartRate: null,
    hrv: null,
    isDrowsy: false
  });
  const [history, setHistory] = useState({
    time: [],
    blinkRate: [],
    heartRate: [],
    hrv: []
  });

  const webcamRef = useRef(null);
  const signalBufferRef = useRef([]);
  const timeBufferRef = useRef([]);
  const startTimeRef = useRef(null);
  const blinkCountRef = useRef(0);
  const lastEyeStateRef = useRef('open');
  const drowsyStartTimeRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      const processVideo = async () => {
        if (webcamRef.current) {
          const frame = await processFrame(webcamRef.current);
          if (frame) {
            const newMetrics = computeMetrics(frame, {
              signalBuffer: signalBufferRef.current,
              timeBuffer: timeBufferRef.current,
              blinkCount: blinkCountRef.current,
              lastEyeState: lastEyeStateRef.current,
              drowsyStartTime: drowsyStartTimeRef.current,
              startTime: startTimeRef.current
            });

            // Update refs
            signalBufferRef.current = newMetrics.signalBuffer;
            timeBufferRef.current = newMetrics.timeBuffer;
            blinkCountRef.current = newMetrics.blinkCount;
            lastEyeStateRef.current = newMetrics.lastEyeState;
            drowsyStartTimeRef.current = newMetrics.drowsyStartTime;

            // Update state
            setMetrics({
              blinkRate: newMetrics.blinkRate,
              heartRate: newMetrics.heartRate,
              hrv: newMetrics.hrv,
              isDrowsy: newMetrics.isDrowsy
            });

            // Update history
            setHistory(prev => {
              const now = Date.now();
              return {
                time: [...prev.time, now].slice(-100),
                blinkRate: [...prev.blinkRate, newMetrics.blinkRate].slice(-100),
                heartRate: [...prev.heartRate, newMetrics.heartRate].slice(-100),
                hrv: [...prev.hrv, newMetrics.hrv].slice(-100)
              };
            });
          }
          requestAnimationFrame(processVideo);
        }
      };
      processVideo();
    }
  }, [isRunning]);

  return (
    <Container maxWidth="xl">
      <Typography variant="h3" component="h1" gutterBottom>
        DriFit: In-Car Driver Health & Fatigue Monitoring
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        This application uses your webcam to monitor driver fatigue and health metrics in real-time.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3}>
            <WebcamView ref={webcamRef} isRunning={isRunning} />
          </Paper>
          <Box mt={2}>
            <AlertPanel isDrowsy={metrics.isDrowsy} />
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <MetricsPanel metrics={metrics} />
          
          <Paper elevation={3} sx={{ mt: 2, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Metrics Over Time
            </Typography>
            {['blinkRate', 'heartRate', 'hrv'].map((metric) => (
              <Box key={metric} sx={{ height: 200, mb: 2 }}>
                <LineChart
                  series={[
                    {
                      data: history[metric],
                      label: metric,
                      area: true,
                    },
                  ]}
                  xAxis={[{ data: history.time, scaleType: 'time' }]}
                />
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>

      <Box mt={2}>
        <Button
          variant="contained"
          color={isRunning ? "error" : "primary"}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? "Stop" : "Start"}
        </Button>
      </Box>
    </Container>
  );
}

export default App;