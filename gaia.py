import cv2
import mediapipe as mp
import streamlit as st
import numpy as np
import time
import pandas as pd
import altair as alt
from scipy.signal import butter, filtfilt, find_peaks

# -------------------------------
# Constants
# -------------------------------
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
FOREHEAD_ROI = [10, 109, 67, 103, 54, 21, 162, 127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148]
BUFFER_SIZE = 300  # ~10s if 30 FPS
EAR_THRESHOLD = 0.22
DROWSINESS_TIME_THRESHOLD = 2.0  # seconds

# -------------------------------
# Mediapipe face mesh
# -------------------------------
mp_face_mesh = mp.solutions.face_mesh

# -------------------------------
# Helper Functions
# -------------------------------
def get_eye_aspect_ratio(landmarks, eye_indices):
    """Calculates the Eye Aspect Ratio (EAR) for a single eye."""
    pts = np.array([(landmarks[i].x, landmarks[i].y) for i in eye_indices])
    A = np.linalg.norm(pts[1] - pts[5])
    B = np.linalg.norm(pts[2] - pts[4])
    C = np.linalg.norm(pts[0] - pts[3])
    ear = (A + B) / (2.0 * C)
    return ear

def bandpass_filter(data, low=0.8, high=2.5, fs=30):
    """Applies a bandpass filter to the signal."""
    nyq = 0.5 * fs
    b, a = butter(1, [low/nyq, high/nyq], btype="band")
    return filtfilt(b, a, data)

def compute_hr_hrv(signal, times, fs=30):
    """Computes Heart Rate (HR) and Heart Rate Variability (HRV) from the rPPG signal."""
    if len(signal) < fs * 3:  # need at least 3s of data
        return None, None
    
    try:
        # Detrending the signal to remove baseline wander
        signal_detrended = signal - np.mean(signal)
        
        filtered = bandpass_filter(signal_detrended, fs=fs)
        
        # Using a more robust peak finding
        peaks, properties = find_peaks(filtered, distance=fs*0.7, prominence=np.std(filtered)*0.3)
        
        if len(peaks) < 3: # Need at least 3 peaks for a more stable HR
            return None, None

        peak_times = np.array(times)[peaks]
        rr_intervals = np.diff(peak_times)  # in seconds

        # Basic outlier removal for RR intervals
        median_rr = np.median(rr_intervals)
        valid_rr = rr_intervals[np.abs(rr_intervals - median_rr) < 0.3 * median_rr]

        if len(valid_rr) < 2:
            return None, None

        hr = 60.0 / np.mean(valid_rr)
        hrv = np.std(valid_rr) * 1000  # RMSSD is a better HRV metric, but this is a start
        
        # Plausible HR range
        if not (40 < hr < 160):
            return None, None
            
        return hr, hrv
    except (np.linalg.LinAlgError, ValueError):
        return None, None

def initialize_session_state():
    """Initializes Streamlit session state variables."""
    if "history" not in st.session_state:
        st.session_state.history = {
            "time": [], "blink_rate": [], "hr": [], "hrv": []
        }
    if "blink_count" not in st.session_state:
        st.session_state.blink_count = 0
    if "last_eye_state" not in st.session_state:
        st.session_state.last_eye_state = "open"
    if "start_time" not in st.session_state:
        st.session_state.start_time = time.time()
    if "signal_buffer" not in st.session_state:
        st.session_state.signal_buffer = []
    if "time_buffer" not in st.session_state:
        st.session_state.time_buffer = []
    if "drowsy_start_time" not in st.session_state:
        st.session_state.drowsy_start_time = None

def update_dashboard(placeholders, data):
    """Updates the Streamlit dashboard with new data."""
    placeholders["stframe"].image(data["frame"], channels="BGR")

    # --- Metrics ---
    placeholders["metrics"]["blink"].metric("Blink Rate (per min)", f"{data['blink_rate']:.2f}")
    placeholders["metrics"]["hr"].metric("Heart Rate (bpm)", f"{data['hr']:.1f}" if data['hr'] is not None else "N/A")
    placeholders["metrics"]["hrv"].metric("HRV (ms)", f"{data['hrv']:.1f}" if data['hrv'] is not None else "N/A")

    # --- Drowsiness Alert ---
    if data["drowsy_alert"]:
        placeholders["alert"].warning("🚨 Drowsiness Detected!")
    else:
        placeholders["alert"].empty()

    # --- Charts ---
    df = pd.DataFrame(st.session_state.history)
    df["time"] = pd.to_datetime(df["time"], unit="s")

    with placeholders["charts"]["blink_tab"]:
        chart = alt.Chart(df).mark_line().encode(
            x=alt.X('time:T', title='Time'),
            y=alt.Y('blink_rate:Q', title='Blink Rate (per min)')
        ).properties(title="Blink Rate Over Time")
        placeholders["charts"]["blink_chart"].altair_chart(chart, use_container_width=True)

    with placeholders["charts"]["hr_tab"]:
        chart = alt.Chart(df).mark_line().encode(
            x=alt.X('time:T', title='Time'),
            y=alt.Y('hr:Q', title='Heart Rate (bpm)')
        ).properties(title="Heart Rate Over Time")
        placeholders["charts"]["hr_chart"].altair_chart(chart, use_container_width=True)

    with placeholders["charts"]["hrv_tab"]:
        chart = alt.Chart(df).mark_line().encode(
            x=alt.X('time:T', title='Time'),
            y=alt.Y('hrv:Q', title='HRV (ms)')
        ).properties(title="HRV Over Time")
        placeholders["charts"]["hrv_chart"].altair_chart(chart, use_container_width=True)

def main():
    """Main function to run the Streamlit application."""
    st.set_page_config(page_title="DriFit - Driver Monitoring", layout="wide")
    st.title("DriFit: In-Car Driver Health & Fatigue Monitoring")
    st.info("This application uses your webcam to monitor driver fatigue and health metrics in real-time.")

    initialize_session_state()

    # --- UI Placeholders ---
    col1, col2 = st.columns([2, 1])
    with col1:
        stframe = st.empty()
        alert_placeholder = st.empty()
    with col2:
        m_col1, m_col2, m_col3 = st.columns(3)
        st.subheader("Metrics")
        blink_metric_placeholder = m_col1.empty()
        hr_metric_placeholder = m_col2.empty()
        hrv_metric_placeholder = m_col3.empty()

        st.subheader("Metrics Over Time")
        blink_tab, hr_tab, hrv_tab = st.tabs(["Blink Rate", "Heart Rate", "HRV"])
        with blink_tab:
            blink_chart_placeholder = st.empty()
        with hr_tab:
            hr_chart_placeholder = st.empty()
        with hrv_tab:
            hrv_chart_placeholder = st.empty()

    placeholders = {
        "stframe": stframe,
        "alert": alert_placeholder,
        "metrics": {"blink": blink_metric_placeholder, "hr": hr_metric_placeholder, "hrv": hrv_metric_placeholder},
        "charts": {
            "blink_tab": blink_tab, "hr_tab": hr_tab, "hrv_tab": hrv_tab,
            "blink_chart": blink_chart_placeholder,
            "hr_chart": hr_chart_placeholder,
            "hrv_chart": hrv_chart_placeholder
        }
    }

    # --- Webcam and Face Mesh ---
    if 'cap' not in st.session_state:
        st.session_state.cap = cv2.VideoCapture(0)
    if 'face_mesh' not in st.session_state:
        st.session_state.face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)

    cap = st.session_state.cap
    face_mesh = st.session_state.face_mesh

    run = st.checkbox('Run')

    if not cap.isOpened():
        st.error("Could not open webcam. Please grant access and refresh.")
        return

    while run:
        ret, frame = cap.read()
        if not ret:
            st.warning("Could not read frame from webcam. Stopping.")
            run = False
            break

        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)

        eye_state = "open"
        hr, hrv = None, None
        drowsy_alert = False

        if results.multi_face_landmarks:
            face_landmarks = results.multi_face_landmarks[0]

            # --- Eye tracking (fatigue) ---
            left_ear = get_eye_aspect_ratio(face_landmarks.landmark, LEFT_EYE)
            right_ear = get_eye_aspect_ratio(face_landmarks.landmark, RIGHT_EYE)
            avg_ear = (left_ear + right_ear) / 2.0

            if avg_ear < EAR_THRESHOLD:
                eye_state = "closed"
                if st.session_state.drowsy_start_time is None:
                    st.session_state.drowsy_start_time = time.time()
                elif time.time() - st.session_state.drowsy_start_time > DROWSINESS_TIME_THRESHOLD:
                    drowsy_alert = True
            else:
                eye_state = "open"
                st.session_state.drowsy_start_time = None

            if st.session_state.last_eye_state == "closed" and eye_state == "open":
                st.session_state.blink_count += 1
            st.session_state.last_eye_state = eye_state

            # --- rPPG HR & HRV (forehead ROI) ---
            h, w, _ = frame.shape
            forehead_pts = np.array([(face_landmarks.landmark[i].x * w, face_landmarks.landmark[i].y * h) for i in FOREHEAD_ROI], dtype=np.int32)
            
            mask = np.zeros(frame.shape[:2], dtype=np.uint8)
            cv2.fillConvexPoly(mask, forehead_pts, 255)
            
            roi = cv2.bitwise_and(frame, frame, mask=mask)
            
            x, y, w_roi, h_roi = cv2.boundingRect(forehead_pts)
            
            if w_roi > 0 and h_roi > 0:
                roi_cropped = roi[y:y+h_roi, x:x+w_roi]
                if roi_cropped.size > 0:
                    green_mean = np.mean(roi_cropped[:, :, 1])
                    st.session_state.signal_buffer.append(green_mean)
                    st.session_state.time_buffer.append(time.time())

                    if len(st.session_state.signal_buffer) > BUFFER_SIZE:
                        st.session_state.signal_buffer.pop(0)
                        st.session_state.time_buffer.pop(0)

                    hr, hrv = compute_hr_hrv(st.session_state.signal_buffer, st.session_state.time_buffer)
            
            cv2.polylines(frame, [forehead_pts], isClosed=True, color=(0, 255, 0), thickness=1)

        # --- Data Update ---
        elapsed = time.time() - st.session_state.start_time
        blink_rate = (st.session_state.blink_count / (elapsed / 60)) if elapsed > 5 else 0.0

        # Update history
        st.session_state.history["time"].append(time.time())
        st.session_state.history["blink_rate"].append(blink_rate)
        st.session_state.history["hr"].append(hr)
        st.session_state.history["hrv"].append(hrv)

        for key in st.session_state.history:
            st.session_state.history[key] = st.session_state.history[key][-100:]

        # --- Dashboard Update ---
        update_data = {
            "frame": frame,
            "blink_rate": blink_rate,
            "hr": hr,
            "hrv": hrv,
            "drowsy_alert": drowsy_alert
        }
        update_dashboard(placeholders, update_data)
    
    else:
        if 'cap' in st.session_state:
            st.session_state.cap.release()
            del st.session_state.cap


if __name__ == "__main__":
    main()