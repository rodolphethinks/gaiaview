import React, { useState, useEffect, useRef } from 'react';
import { Container, Grid, Paper, Typography, Box, Button, ThemeProvider, createTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts';
import { styled } from '@mui/material/styles';
import WebcamView from './components/WebcamView';
import MetricsPanel from './components/MetricsPanel';
import AlertPanel from './components/AlertPanel';
import { processFrame } from './utils/videoProcessing';
import { computeMetrics } from './utils/metricsCalculation';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4f46e5',
    },
    secondary: {
      main: '#10b981',
    },
    background: {
      default: '#111827',
      paper: '#1f2937',
    },
    text: {
      primary: '#f3f4f6',
      secondary: '#9ca3af',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 12,
        },
      },
    },
  },
});

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '8px',
  padding: '10px 20px',
  backgroundColor: theme.palette.secondary.main,
  '&:hover': {
    backgroundColor: theme.palette.secondary.dark,
  },
}));

const MetricBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '12px',
  backgroundColor: 'rgba(31, 41, 55, 0.8)',
  backdropFilter: 'blur(10px)',
}));

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState({
    blinkRate: 0,
    heartRate: null,
    hrv: null,
    isDrowsy: false,
    faceDetected: false
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
    let animationFrameId;
    let processingFrame = false;

    if (isRunning) {
      console.log('Starting video processing...');
      startTimeRef.current = Date.now();
      
      const processVideo = async () => {
        if (processingFrame) {
          animationFrameId = requestAnimationFrame(processVideo);
          return;
        }

        try {
          processingFrame = true;
          if (webcamRef.current && webcamRef.current.video && 
              webcamRef.current.video.readyState === 4) {
            const frame = await processFrame(webcamRef.current);
            if (frame) {
              console.log('Processing metrics for frame...');
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
                isDrowsy: newMetrics.isDrowsy,
                faceDetected: true
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
          }
        } catch (error) {
          console.error('Error in video processing:', error);
        } finally {
          processingFrame = false;
        }
        
        // Schedule next frame
        animationFrameId = requestAnimationFrame(processVideo);
      };

      console.log('Starting video processing loop');
      processVideo();
    }

    // Cleanup function
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isRunning]);

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: 'background.default',
        padding: 3
      }}>
        <Container maxWidth={false} sx={{ maxWidth: 1800 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'text.primary' }}>
                DriFit: Driver Health & Fatigue Monitoring
              </Typography>
            </Grid>

            <Grid item xs={12} md={9}>
              <MetricBox elevation={3}>
                <WebcamView ref={webcamRef} isRunning={isRunning} faceDetected={metrics.faceDetected} />
              </MetricBox>
              <Box mt={2}>
                <AlertPanel isDrowsy={metrics.isDrowsy} />
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <MetricBox elevation={3} sx={{ mb: 3 }}>
                <MetricsPanel metrics={metrics} />
              </MetricBox>
              
              <MetricBox elevation={3}>
                <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>
                  Real-time Metrics
                </Typography>
                {['blinkRate', 'heartRate', 'hrv'].map((metric) => (
                  <Box key={metric} sx={{ height: 160, mb: 2 }}>
                    <LineChart
                      series={[
                        {
                          data: history[metric],
                          label: metric,
                          area: true,
                          color: '#4f46e5',
                        },
                      ]}
                      xAxis={[{ 
                        data: history.time, 
                        scaleType: 'time',
                        style: { fontSize: 12 },
                      }]}
                      sx={{
                        '.MuiChartsAxis-line': { stroke: '#4b5563' },
                        '.MuiChartsAxis-tick': { stroke: '#4b5563' },
                        '.MuiChartsAxis-label': { fill: '#9ca3af' },
                      }}
                    />
                  </Box>
                ))}
              </MetricBox>
            </Grid>
          </Grid>

          <Box mt={3} display="flex" justifyContent="center">
            <StyledButton
              variant="contained"
              onClick={() => setIsRunning(!isRunning)}
              sx={{
                backgroundColor: isRunning ? '#ef4444' : '#10b981',
                '&:hover': {
                  backgroundColor: isRunning ? '#dc2626' : '#059669',
                },
              }}
            >
              {isRunning ? "Stop Monitoring" : "Start Monitoring"}
            </StyledButton>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;