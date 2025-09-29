# DriFit: In-Car Driver Health & Fatigue Monitoring

DriFit is a real-time driver monitoring system that uses computer vision and machine learning to track driver health metrics and detect signs of fatigue.

## Features

- 👁️ Real-time eye blink detection and blink rate monitoring
- 💓 Heart rate monitoring using remote photoplethysmography (rPPG)
- ⚡ Heart Rate Variability (HRV) analysis
- 😴 Drowsiness detection and alerts
- 📊 Real-time visualization of health metrics

## Requirements

```
mediapipe
opencv-python
streamlit
numpy
pandas
altair
scipy
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/rodolphethinks/gaiaview.git
cd gaiaview
```

2. Install the required packages:
```bash
pip install -r requirements.txt
```

## Usage

Run the application using Streamlit:
```bash
streamlit run gaia.py
```

The application will open in your default web browser. Grant camera access when prompted.

## How it Works

DriFit uses:
- MediaPipe Face Mesh for facial landmark detection
- Computer vision techniques for eye state analysis
- Remote photoplethysmography (rPPG) for contactless heart rate monitoring
- Signal processing for heart rate variability analysis
- Real-time data visualization with Streamlit and Altair

## Documentation

For detailed technical documentation and API reference, please visit the [GitHub Pages site](https://rodolphethinks.github.io/gaiaview/).