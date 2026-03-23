import os
import json
import time
import random
import copy
import string
import math
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path="engine/.env")

TARGET_URL      = os.getenv("DEFAULT_TARGET_URL", "http://localhost:5000/api/data")
GENERATIONS     = int(os.getenv("DEFAULT_GENERATIONS", 50))
POPULATION_SIZE = int(os.getenv("DEFAULT_POPULATION_SIZE", 10))
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", 12))
DATA_FILE       = os.getenv("DATA_FILE",   "shared/data.json")
CONFIG_FILE     = os.getenv("CONFIG_FILE", "shared/config.json")


# =============================================================
# MUTATION FUNCTIONS — identical to chaos_engine.py
# Baseline uses the same mutations, just no adaptive weights
# =============================================================

def mutate_large_string(value):
    size = random.randint(500, 5000)
    return ''.join(random.choices(string.ascii_letters + string.digits, k=size))

def mutate_large_array(value):
    size = random.randint(100, 800)
    return [random.randint(1, 100) for _ in range(size)]

def mutate_nested_object(value):
    return {"level1": {"level2": {"data": [random.random() for _ in range(50)]}}}

def mutate_null(value):
    return None

def mutate_large_number(value):
    return random.randint(10**9, 10**15)

MUTATION_FUNCTIONS = [
    mutate_large_string,
    mutate_large_array,
    mutate_nested_object,
    mutate_null,
    mutate_large_number,
]

MUTATION_NAMES = {
    mutate_large_string:  "large_string",
    mutate_large_array:   "large_array",
    mutate_nested_object: "nested_object",
    mutate_null:          "null_value",
    mutate_large_number:  "large_number",
}


# =============================================================
# CORE FUNCTIONS
# =============================================================

def mutate_payload(payload, weights):
    new_payload = copy.deepcopy(payload)
    keys        = list(weights.keys())
    probs       = list(weights.values())
    chosen_key  = random.choices(keys, weights=probs, k=1)[0]
    mutation_fn = random.choice(MUTATION_FUNCTIONS)
    new_payload[chosen_key] = mutation_fn(new_payload[chosen_key])
    return new_payload, chosen_key, MUTATION_NAMES[mutation_fn]


def measure_latency(payload, url, headers=None):
    try:
        start    = time.time()
        response = requests.post(
            url,
            json=payload,
            headers=headers or {},
            timeout=REQUEST_TIMEOUT
        )
        elapsed = round((time.time() - start) * 1000, 2)

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 10))
            print(f"[BASELINE] Rate limited. Waiting {retry_after}s...")
            time.sleep(retry_after)
            return None

        return elapsed

    except requests.exceptions.Timeout:
        return float(REQUEST_TIMEOUT * 1000)
    except requests.exceptions.ConnectionError:
        print("[BASELINE] Cannot connect to target. Is victim running?")
        return 0.0
    except Exception as e:
        print(f"[BASELINE] Request error: {e}")
        return 0.0


def compute_diversity(weights):
    entropy = 0.0
    for w in weights.values():
        if w > 0:
            entropy -= w * math.log(w)
    return round(entropy, 4)


def compute_fir(current_max, previous_max):
    if previous_max is None or previous_max == 0:
        return None
    return round(((current_max - previous_max) / previous_max) * 100, 2)


def save_results(results):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(results, f, indent=2)


def track_operator_stats(operator_stats, mutation_name, latency):
    if mutation_name not in operator_stats:
        operator_stats[mutation_name] = {"count": 0, "total_latency": 0.0}
    operator_stats[mutation_name]["count"]         += 1
    operator_stats[mutation_name]["total_latency"] += latency
    return operator_stats


def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
        print(f"[BASELINE] Config loaded from {CONFIG_FILE}")
        return config
    print("[BASELINE] No config.json — using .env defaults")
    return {
        "url":         TARGET_URL,
        "method":      "POST",
        "headers":     {},
        "body":        {
            "username": "test",
            "email":    "test@test.com",
            "items":    [1, 2, 3],
            "metadata": "none"
        },
        "generations": GENERATIONS,
        "population":  POPULATION_SIZE,
        "mode":        "baseline"
    }


# =============================================================
# MAIN BASELINE LOOP
# Identical to adaptive BUT weights never update — always 0.25
# This is the control experiment for the research paper
# =============================================================

def run_baseline(config):
    url          = config["url"]
    headers      = config.get("headers", {})
    base_payload = config["body"]
    generations  = config["generations"]
    population   = config["population"]

    keys           = list(base_payload.keys())
    initial_weight = round(1.0 / len(keys), 4)

    # FIXED weights — never change, this is the key difference
    # from chaos_engine.py where weights update every generation
    weights = {k: initial_weight for k in keys}

    print(f"\n[BASELINE] Mode: baseline (no adaptive weight updates)")
    print(f"[BASELINE] Target: {url}")
    print(f"[BASELINE] Keys: {keys}")
    print(f"[BASELINE] Fixed weights: {weights}")
    print(f"[BASELINE] Generations: {generations} | Population: {population}\n")

    all_results     = []
    current_payload = copy.deepcopy(base_payload)
    previous_max    = None
    operator_stats  = {}

    # Generation 0 — baseline measurement
    baseline = measure_latency(current_payload, url, headers)
    print(f"[BASELINE] Baseline latency: {baseline}ms")

    all_results.append({
        "generation":               0,
        "mode":                     "baseline",
        "max_latency_ms":           baseline,
        "avg_latency_ms":           baseline,
        "min_latency_ms":           baseline,
        "best_key_mutated":         "baseline",
        "best_mutation_type":       "none",
        "diversity_score":          compute_diversity(weights),
        "fitness_improvement_rate": None,
        "weights":                  copy.deepcopy(weights),
        "operator_stats":           {}
    })
    save_results(all_results)

    for gen in range(1, generations + 1):
        print(f"[BASELINE] Gen {gen}/{generations} | Weights: {weights} (fixed)")

        generation_results = []

        for _ in range(population):
            mutated_payload, mutated_key, mutation_name = mutate_payload(
                current_payload, weights
            )
            latency = measure_latency(mutated_payload, url, headers)

            if latency is None:
                continue

            operator_stats = track_operator_stats(
                operator_stats, mutation_name, latency
            )
            generation_results.append({
                "latency":       latency,
                "mutated_key":   mutated_key,
                "mutation_name": mutation_name,
                "payload":       mutated_payload
            })

        if not generation_results:
            print(f"[BASELINE] Gen {gen} fully rate limited — skipping")
            continue

        best      = max(generation_results, key=lambda x: x["latency"])
        latencies = [r["latency"] for r in generation_results]

        max_lat = best["latency"]
        avg_lat = round(sum(latencies) / len(latencies), 2)
        min_lat = round(min(latencies), 2)
        fir     = compute_fir(max_lat, previous_max)

        print(f"[BASELINE] Best: key='{best['mutated_key']}' | {max_lat}ms")

        # ============================================================
        # KEY DIFFERENCE FROM chaos_engine.py:
        # We do NOT call update_weights() here.
        # Weights stay fixed at 0.25 for every single generation.
        # This proves the adaptive mechanism is what causes convergence.
        # ============================================================

        current_payload = best["payload"]
        previous_max    = max_lat

        op_summary = {
            name: {
                "count": stats["count"],
                "avg_latency_ms": round(
                    stats["total_latency"] / stats["count"], 2
                )
            }
            for name, stats in operator_stats.items()
        }

        gen_data = {
            "generation":               gen,
            "mode":                     "baseline",
            "max_latency_ms":           max_lat,
            "avg_latency_ms":           avg_lat,
            "min_latency_ms":           min_lat,
            "best_key_mutated":         best["mutated_key"],
            "best_mutation_type":       best["mutation_name"],
            "diversity_score":          compute_diversity(weights),
            "fitness_improvement_rate": fir,
            "weights":                  copy.deepcopy(weights),
            "operator_stats":           op_summary
        }

        all_results.append(gen_data)
        save_results(all_results)

    print(f"\n[BASELINE] Run complete. Results saved to {DATA_FILE}")
    return all_results


# =============================================================
# ENTRY POINT
# =============================================================

if __name__ == "__main__":
    config = load_config()
    run_baseline(config)