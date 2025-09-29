# DriFit: In-Car Driver Health & Fatigue Monitoring

DriFit is a real-time driver monitoring system that uses computer vision and machine learning to track driver health metrics and detect signs of fatigue. It uses modern web technologies to provide a responsive and reliable monitoring solution.

## Features

- 👁️ Real-time eye blink detection and blink rate monitoring
- 💓 Heart rate monitoring using remote photoplethysmography (rPPG)
- ⚡ Heart Rate Variability (HRV) analysis
- 😴 Drowsiness detection with real-time alerts
- 📊 Real-time visualization of health metrics
- 🎯 Modern React-based UI with Material design
- 📱 Responsive layout for different screen sizes

## Technology Stack

- Frontend:
  - React
  - TensorFlow.js
  - MediaPipe Face Mesh
  - Material-UI components
  - Real-time data visualization
- Backend:
  - Python (optional for additional processing)
  - Signal processing algorithms
  - Computer vision pipelines

## Prerequisites

- Node.js 14+ and npm
- Python 3.8+ (optional, for backend features)
- Webcam access
- Modern web browser (Chrome recommended)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/rodolphethinks/gaiaview.git
cd gaiaview
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. (Optional) Set up Python environment and install dependencies:
```bash
pip install -r requirements.txt
```

## Development Setup

1. Start the frontend development server:
```bash
cd frontend
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

The application will automatically reload if you make changes to the source code.

## Project Structure

```
DriFit/
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── AlertPanel.jsx
│   │   │   ├── MetricsPanel.jsx
│   │   │   └── WebcamView.jsx
│   │   ├── utils/         # Utility functions
│   │   │   ├── metricsCalculation.js
│   │   │   └── videoProcessing.js
│   │   └── App.jsx        # Main application component
│   └── public/            # Static assets
├── requirements.txt       # Python dependencies
└── README.md             # Project documentation
```

## Key Components

- **WebcamView**: Handles camera input and face detection
- **MetricsPanel**: Displays health metrics and visualizations
- **AlertPanel**: Manages drowsiness and health alerts
- **metricsCalculation.js**: Core algorithms for health metrics
- **videoProcessing.js**: Video and face processing utilities

## Browser Support

Tested and optimized for:
- Google Chrome (recommended)
- Firefox
- Edge
- Safari (limited support)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- TensorFlow.js team for the machine learning framework
- MediaPipe team for the face detection models
- React and Material-UI teams for the frontend frameworks