# vision.py
import time, threading, cv2
from ultralytics import YOLO

MODEL_PATH = "yolo11s.pt"
TARGET_CLASSES = {"cell phone", "Phone", "Remote"}
CONF_THRESHOLD = 0.4
MIN_BOX_AREA_RATIO = 0.01
SHOW_FPS = True

# --- state ---
_model = None
_id2name = None
_wanted_ids = set()
_cap = None
_thread = None
_running = False
_lock = threading.Lock()

# latest JPEG buffer for streaming (optional)
_last_jpeg = None

def _init_model():
    global _model, _id2name, _wanted_ids
    if _model is None:
        _model = YOLO(MODEL_PATH)
        _id2name = _model.names
        _wanted_ids = {i for i, n in _id2name.items() if n in TARGET_CLASSES}

def _open_camera():
    global _cap
    _cap = cv2.VideoCapture(0)
    if not _cap.isOpened():
        raise RuntimeError("Could not open webcam")
    try:
        _cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    except Exception:
        pass

def _loop(use_window: bool):
    global _running, _cap, _last_jpeg
    prev_t = time.time()
    frame_count, fps = 0, 0.0

    while True:
        with _lock:
            if not _running:
                break

        ok, frame = _cap.read()
        if not ok:
            time.sleep(0.01)
            continue

        H, W = frame.shape[:2]
        area = float(H * W)

        res = _model(frame, verbose=False)[0]
        annotated = frame

        if res.boxes is not None and len(res.boxes) > 0:
            annotated = frame.copy()
            for cls_id, conf, xyxy in zip(
                res.boxes.cls.tolist(), res.boxes.conf.tolist(), res.boxes.xyxy.tolist()
            ):
                if int(cls_id) in _wanted_ids and conf >= CONF_THRESHOLD:
                    x1, y1, x2, y2 = map(int, xyxy)
                    box_area = max(0, x2 - x1) * max(0, y2 - y1)
                    if area > 0 and (box_area / area) >= MIN_BOX_AREA_RATIO:
                        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        label = f"{_id2name[int(cls_id)]}: {conf:.2f}"
                        cv2.putText(annotated, label, (x1, max(0, y1 - 7)),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2, cv2.LINE_AA)
                        
        if SHOW_FPS:
            frame_count += 1
            now = time.time()
            if now - prev_t >= 1.0:
                fps = frame_count / (now - prev_t)
                prev_t, frame_count = now, 0
            cv2.putText(annotated, f"FPS: {fps:.1f}", (10, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        # update last_jpeg for streaming
        ok, buf = cv2.imencode(".jpg", annotated)
        if ok:
            _last_jpeg = buf.tobytes()

        # only show a window if explicitly allowed (not recommended from Flask)
        if use_window:
            cv2.imshow("Camera Tracker", annotated)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                stop_tracker()
                break

    if _cap is not None:
        _cap.release()
        _cap = None
    if use_window:
        cv2.destroyAllWindows()

def start_tracker(use_window: bool = False):
    """Start detection in background; avoid GUI by default."""
    global _thread, _running
    with _lock:
        if _running:
            return
        _running = True
    _init_model()
    _open_camera()
    _thread = threading.Thread(target=_loop, args=(use_window,), daemon=True)
    _thread.start()

def stop_tracker():
    global _running, _thread
    with _lock:
        _running = False
    if _thread and _thread.is_alive():
        _thread.join(timeout=1.5)
    _thread = None

def get_last_jpeg() -> bytes | None:
    return _last_jpeg

def mjpeg_generator():
    """Yield multipart/x-mixed-replace MJPEG stream."""
    boundary = b"--frame"
    while True:
        with _lock:
            running = _running
        if not running:
            time.sleep(0.05)
            continue
        frame = get_last_jpeg()
        if frame is None:
            time.sleep(0.01)
            continue
        yield (boundary + b"\r\n"
               b"Content-Type: image/jpeg\r\n"
               b"Content-Length: " + str(len(frame)).encode() + b"\r\n\r\n" +
               frame + b"\r\n")