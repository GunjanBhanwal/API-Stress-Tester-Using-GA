import os
import json
import subprocess
import sys
from flask import Flask, jsonify, request, render_template, send_file
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(dotenv_path="dashboard/.env")

FLASK_PORT      = int(os.getenv("FLASK_PORT", 5001))
DATA_FILE       = os.getenv("DATA_FILE", "shared/data.json")
CONFIG_FILE     = os.getenv("CONFIG_FILE", "shared/config.json")
REPORT_FILE     = os.getenv("REPORT_FILE", "shared/report.pdf")
ENGINE_SCRIPT   = os.getenv("ENGINE_SCRIPT", "engine/chaos_engine.py")
BASELINE_SCRIPT = os.getenv("BASELINE_SCRIPT", "engine/baseline_engine.py")
CORS_ORIGINS    = os.getenv("CORS_ORIGINS", "*")

app = Flask(__name__)
CORS(app, origins=CORS_ORIGINS)

# Holds the running engine subprocess so we can stop it
engine_process = None


def write_config(data):
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(data, f, indent=2)


def read_json_file(filepath):
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return None


def is_engine_running():
    global engine_process
    if engine_process is None:
        return False
    # poll() returns None if still running, return code if finished
    return engine_process.poll() is None


# =============================================================
# /api/start
# React calls this when user clicks Run
# =============================================================
@app.route("/api/start", methods=["POST"])
def start_engine():
    global engine_process

    if is_engine_running():
        return jsonify({
            "status": "error",
            "message": "Engine is already running"
        }), 400

    data, error = validate_start_request(request)
    if error:
        return jsonify({"status": "error", "message": error}), 400

    # Write config so the engine picks it up
    write_config(data)

    # Clear previous results
    if os.path.exists(DATA_FILE):
        os.remove(DATA_FILE)

    # Spawn engine as a subprocess
    # sys.executable = the same Python that is running this file right now
    engine_process = subprocess.Popen(
        [sys.executable, ENGINE_SCRIPT],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )

    print(f"[DASHBOARD] Engine started. PID: {engine_process.pid}")

    return jsonify({
        "status": "started",
        "message": "Engine is running",
        "pid": engine_process.pid,
        "config": data
    }), 200


# =============================================================
# /api/stop
# React calls this when user clicks Stop
# =============================================================
@app.route("/api/stop", methods=["POST"])
def stop_engine():
    global engine_process

    if not is_engine_running():
        return jsonify({
            "status": "error",
            "message": "No engine is running"
        }), 400

    engine_process.terminate()
    engine_process = None
    print("[DASHBOARD] Engine stopped.")

    return jsonify({"status": "stopped", "message": "Engine terminated"}), 200


# =============================================================
# /api/status
# React polls this every 2 seconds to get live results
# =============================================================
@app.route("/api/status", methods=["GET"])
def get_status():
    data = read_json_file(DATA_FILE)

    if data is None:
        return jsonify({
            "status":  "idle",
            "message": "No data yet. Run the engine first.",
            "data":    []
        }), 200

    # Determine current status
    if is_engine_running():
        status = "running"
    else:
        status = "complete"

    return jsonify({
        "status":  status,
        "message": f"{len(data)} generations loaded",
        "data":    data
    }), 200


# =============================================================
# /api/download
# React calls this when user clicks Download PDF
# =============================================================
@app.route("/api/download", methods=["GET"])
def download_report():
    if not os.path.exists(REPORT_FILE):
        # Generate it now if it does not exist
        data = read_json_file(DATA_FILE)
        if data is None:
            return jsonify({
                "status":  "error",
                "message": "No results to generate report from"
            }), 404

        # Spawn report generator as subprocess
        subprocess.run(
            [sys.executable, "engine/report_generator.py"],
            check=True
        )

    if not os.path.exists(REPORT_FILE):
        return jsonify({
            "status":  "error",
            "message": "Report generation failed"
        }), 500

    return send_file(
        REPORT_FILE,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="chaos_gen_report.pdf"
    )


# =============================================================
# /api/config
# Returns the current config so the UI can display it
# =============================================================
@app.route("/api/config", methods=["GET"])
def get_config():
    config = read_json_file(CONFIG_FILE)
    if config is None:
        return jsonify({
            "status":  "error",
            "message": "No config found"
        }), 404
    return jsonify({"status": "ok", "config": config}), 200


# =============================================================
# /health
# =============================================================
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":         "healthy",
        "service":        "dashboard",
        "engine_running": is_engine_running()
    }), 200


# =============================================================
# VALIDATION
# =============================================================
def validate_start_request(req):
    if not req.is_json:
        return None, "Content-Type must be application/json"

    data = req.get_json(silent=True)
    if data is None:
        return None, "Invalid JSON body"

    if "url" not in data or not data["url"]:
        return None, "url is required"

    if "body" not in data or not isinstance(data["body"], dict):
        return None, "body must be a JSON object"

    if len(data["body"]) == 0:
        return None, "body cannot be empty"

    # Set defaults for optional fields
    data.setdefault("method",      "POST")
    data.setdefault("headers",     {})
    data.setdefault("generations", int(os.getenv("DEFAULT_GENERATIONS", 50)))
    data.setdefault("population",  int(os.getenv("DEFAULT_POPULATION_SIZE", 10)))
    data.setdefault("mode",        "adaptive")

    return data, None


# =============================================================
# ERROR HANDLERS
# =============================================================
@app.errorhandler(404)
def not_found(e):
    return jsonify({"status": "error", "message": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"status": "error", "message": "Internal server error"}), 500


if __name__ == "__main__":
    print(f"Dashboard running on http://localhost:{FLASK_PORT}")
    app.run(host="0.0.0.0", port=FLASK_PORT, debug=False, use_reloader=False)