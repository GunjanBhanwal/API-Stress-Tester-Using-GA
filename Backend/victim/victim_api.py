import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))

app = Flask(__name__)
CORS(app)


def validate_payload(req):
    if not req.is_json:
        return None, "Content-Type must be application/json"
    data = req.get_json(silent=True)
    if data is None:
        return None, "Invalid JSON body"
    if not isinstance(data, dict):
        return None, "JSON body must be an object"
    if len(data) == 0:
        return None, "JSON body cannot be empty"
    return data, None


@app.route("/api/data", methods=["POST"])
def handle_data():
    start = time.time()

    data, error = validate_payload(request)
    if error:
        return jsonify({"status": "error", "message": error}), 400

    print(f"[VICTIM] Keys received: {list(data.keys())}")

    for key, value in data.items():

        # Deliberate O(n^2) vulnerability — triggers on "items" list
        if key == "items" and isinstance(value, list):
            n = len(value)
            dummy = 0
            for i in range(n):
                for j in range(n):
                    dummy += (i * j) % 7
            print(f"[VICTIM] items n={n}, iterations={n*n}")

    elapsed_ms = round((time.time() - start) * 1000, 2)
    print(f"[VICTIM] Done in {elapsed_ms}ms")

    return jsonify({
        "status": "ok",
        "processing_time_ms": elapsed_ms,
        "keys_received": list(data.keys())
    }), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "victim-api"}), 200


@app.route("/api/info", methods=["GET"])
def info():
    return jsonify({
        "service": "Chaos-Gen Victim API",
        "vulnerability": "O(n^2) loop on items list",
        "sample_payload": {
            "username": "test",
            "email": "test@test.com",
            "items": [1, 2, 3],
            "metadata": "none"
        }
    }), 200


@app.errorhandler(404)
def not_found(e):
    return jsonify({"status": "error", "message": "Endpoint not found"}), 404

@app.errorhandler(405)
def not_allowed(e):
    return jsonify({"status": "error", "message": "Method not allowed"}), 405

@app.errorhandler(500)
def server_error(e):
    return jsonify({"status": "error", "message": "Internal server error"}), 500


if __name__ == "__main__":
    print(f"Victim API running on http://localhost:{FLASK_PORT}")
    app.run(host="0.0.0.0", port=FLASK_PORT, debug=False, use_reloader=False)