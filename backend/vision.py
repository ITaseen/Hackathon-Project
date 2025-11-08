import time
import cv2
from ultralytics import YOLO


MODEL_PATH = "yolo11s.pt"
TARGET_CLASSES = {"cell phone", "remote, person"}
CONF_THRESHOLD = 0.4
MIN_BOX_AREA_RATIO = 0.01
SHOW_FPS = True
WINDOW_NAME = "Camera Tracker"
FULLSCREEN = False
TOPMOST = True

model = YOLO(MODEL_PATH)
id2name = model.names
wanted_ids = {i for i, n in id2name.items() if n in TARGET_CLASSES}

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise RuntimeError("Could not open webcam")

try:
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
except Exception:
    pass

# Prepare window
cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
if FULLSCREEN:
    cv2.setWindowProperty(WINDOW_NAME, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
else:
    cv2.resizeWindow(WINDOW_NAME, 960, 540)

try:
    cv2.setWindowProperty(WINDOW_NAME, cv2.WND_PROP_TOPMOST, 1 if TOPMOST else 0)
except Exception:
    pass

prev_t = time.time()
frame_count = 0
fps = 0.0

print("[INFO] Press 'q' to quit")
while True:
    ret, frame = cap.read()
    if not ret:
        break

    H, W = frame.shape[:2]
    frame_area = float(H * W)

    # Run YOLO on the current frame
    # You can also use model.predict(frame, verbose=False) — both are fine.
    results = model(frame, verbose=False)[0]

    # Start from original frame so we control how to draw
    annotated = frame.copy()

    # Draw only the classes we care about and above thresholds
    if results.boxes is not None and len(results.boxes) > 0:
        for cls_id, conf, xyxy in zip(
            results.boxes.cls.tolist(),
            results.boxes.conf.tolist(),
            results.boxes.xyxy.tolist()
        ):
            if cls_id in wanted_ids and conf >= CONF_THRESHOLD:
                x1, y1, x2, y2 = map(int, xyxy)
                box_area = max(0, x2 - x1) * max(0, y2 - y1)
                if frame_area > 0 and (box_area / frame_area) >= MIN_BOX_AREA_RATIO:
                    # Draw bounding box + label
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    label = f"{id2name[int(cls_id)]}: {conf:.2f}"
                    cv2.putText(annotated, label, (x1, max(0, y1 - 7)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2, cv2.LINE_AA)

    # FPS overlay
    if SHOW_FPS:
        frame_count += 1
        now = time.time()
        if now - prev_t >= 1.0:
            fps = frame_count / (now - prev_t)
            prev_t = now
            frame_count = 0
        cv2.putText(annotated, f"FPS: {fps:.1f}", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

    cv2.imshow(WINDOW_NAME, annotated)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()


