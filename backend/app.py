from flask import Flask, jsonify, request
from flask_cors import CORS
import vision as tracker  

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "Backend is working!"})

@app.route("/start-tracking", methods=["POST"])
def start_tracking():
    tracker.start_tracker()
    return jsonify({"status": "tracking started"})

@app.route("/stop-tracking", methods=["POST"])
def stop_tracking():
    tracker.stop_tracker()
    return jsonify({"status": "tracking stopped"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)