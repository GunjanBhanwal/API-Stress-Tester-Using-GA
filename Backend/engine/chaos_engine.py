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

TARGET_URL        = os.getenv("DEFAULT_TARGET_URL", "http://localhost:5000/api/data")
GENERATIONS       = int(os.getenv("DEFAULT_GENERATIONS", 50))
POPULATION_SIZE   = int(os.getenv("DEFAULT_POPULATION_SIZE", 10))
LEARNING_RATE     = float(os.getenv("LEARNING_RATE", 0.15))
MIN_WEIGHT        = float(os.getenv("MIN_WEIGHT", 0.05))
REQUEST_TIMEOUT   = int(os.getenv("REQUEST_TIMEOUT", 12))
DATA_FILE         = os.getenv("DATA_FILE", "shared/data.json")
CONFIG_FILE       = os.getenv("CONFIG_FILE", "shared/config.json")


# =============================================================
# MUTATION FUNCTIONS
# Each one takes the original value and returns a mutated one
# =============================================================

def mutate_large_string(value):
    size = random.randint(500, 5000)
    return ''.join(random.choices(string.ascii_letters + string.digits, k=size))

def mutate_large_array(value):
    size = random.randint(100, 800)
    return [random.randint(1, 100) for _ in range(size)]

def mutate_nested_object(value):
    return {
        "level1": {
            "level2": {
                "data": [random.random() for _ in range(50)]
            }
        }
    }

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
    mutate_large_string:   "large_string",
    mutate_large_array:    "large_array",
    mutate_nested_object:  "nested_object",
    mutate_null:           "null_value",
    mutate_large_number:   "large_number",
}


# =============================================================
# CORE GA FUNCTIONS
# =============================================================

def mutate_payload(payload, weights):
    new_payload = copy.deepcopy(payload)
    keys  = list(weights.keys())
    probs = list(weights.values())
    chosen_key  = random.choices(keys, weights=probs, k=1)[0]
    mutation_fn = random.choice(MUTATION_FUNCTIONS)
    new_payload[chosen_key] = mutation_fn(new_payload[chosen_key])
    return new_payload, chosen_key, MUTATION_NAMES[mutation_fn]


def measure_latency(payload, url, headers=None):
    try:
        start = time.time()
        requests.post(
            url,
            json=payload,
            headers=headers or {},
            timeout=REQUEST_TIMEOUT
        )
        return round((time.time() - start) * 1000, 2)
    except requests.exceptions.Timeout:
        return float(REQUEST_TIMEOUT * 1000)
    except requests.exceptions.ConnectionError:
        print("[ENGINE] Cannot connect to target. Is victim running?")
        return 0.0
    except Exception as e:
        print(f"[ENGINE] Request error: {e}")
        return 0.0


def update_weights(weights, winning_key):
    new_weights = copy.deepcopy(weights)
    new_weights[winning_key] += LEARNING_RATE
    for key in new_weights:
        if key != winning_key:
            new_weights[key] -= LEARNING_RATE / (len(weights) - 1)
            new_weights[key]  = max(MIN_WEIGHT, new_weights[key])
    total = sum(new_weights.values())
    return {k: round(v / total, 4) for k, v in new_weights.items()}


def compute_diversity(weights):
    # Shannon entropy — measures how spread the weights are
    # High = exploring many keys, Low = focused on one key
    entropy = 0.0
    for w in weights.values():
        if w > 0:
            entropy -= w * math.log(w)
    return round(entropy, 4)


def compute_fir(current_max, previous_max):
    # Fitness Improvement Rate — % gain over previous generation
    if previous_max is None or previous_max == 0:
        return None
    return round(((current_max - previous_max) / previous_max) * 100, 2)


def save_results(results):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(results, f, indent=2)


def load_config():
    # If a config.json exists (sent from dashboard), use it
    # Otherwise fall back to .env defaults
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
        print(f"[ENGINE] Config loaded from {CONFIG_FILE}")
        return config
    print("[ENGINE] No config.json found — using .env defaults")
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
        "mode":        "adaptive"
    }


def track_operator_stats(operator_stats, mutation_name, latency):
    if mutation_name not in operator_stats:
        operator_stats[mutation_name] = {"count": 0, "total_latency": 0.0}
    operator_stats[mutation_name]["count"]         += 1
    operator_stats[mutation_name]["total_latency"] += latency
    return operator_stats


# =============================================================
# MAIN GA LOOP
# =============================================================

def run(config, mode="adaptive"):
    url         = config["url"]
    headers     = config.get("headers", {})
    base_payload= config["body"]
    generations = config["generations"]
    population  = config["population"]

    # Build initial equal weights from whatever keys are in the payload
    keys            = list(base_payload.keys())
    initial_weight  = round(1.0 / len(keys), 4)
    weights         = {k: initial_weight for k in keys}

    print(f"\n[ENGINE] Mode: {mode}")
    print(f"[ENGINE] Target: {url}")
    print(f"[ENGINE] Keys: {keys}")
    print(f"[ENGINE] Generations: {generations} | Population: {population}\n")

    all_results     = []
    current_payload = copy.deepcopy(base_payload)
    previous_max    = None
    operator_stats  = {}

    # --- Generation 0: baseline measurement ---
    baseline = measure_latency(current_payload, url, headers)
    print(f"[ENGINE] Baseline latency: {baseline}ms")

    all_results.append({
        "generation":              0,
        "mode":                    mode,
        "max_latency_ms":          baseline,
        "avg_latency_ms":          baseline,
        "min_latency_ms":          baseline,
        "best_key_mutated":        "baseline",
        "best_mutation_type":      "none",
        "diversity_score":         compute_diversity(weights),
        "fitness_improvement_rate":None,
        "weights":                 copy.deepcopy(weights),
        "operator_stats":          {}
    })
    save_results(all_results)

    for gen in range(1, generations + 1):
        print(f"[ENGINE] Gen {gen}/{generations} | Weights: {weights}")

        generation_results = []

        # --- Test population_size mutated payloads ---
        for _ in range(population):
            mutated_payload, mutated_key, mutation_name = mutate_payload(
                current_payload, weights
            )
            latency = measure_latency(mutated_payload, url, headers)
            operator_stats = track_operator_stats(operator_stats, mutation_name, latency)

            generation_results.append({
                "latency":       latency,
                "mutated_key":   mutated_key,
                "mutation_name": mutation_name,
                "payload":       mutated_payload
            })

        # --- Selection: best individual = highest latency ---
        best = max(generation_results, key=lambda x: x["latency"])
        latencies = [r["latency"] for r in generation_results]

        max_lat = best["latency"]
        avg_lat = round(sum(latencies) / len(latencies), 2)
        min_lat = round(min(latencies), 2)
        fir     = compute_fir(max_lat, previous_max)

        print(f"[ENGINE] Best: key='{best['mutated_key']}' | {max_lat}ms")

        # --- Adaptive: update weights only in adaptive mode ---
        if mode == "adaptive":
            weights = update_weights(weights, best["mutated_key"])

        # Survival of the fittest — best payload becomes next generation's base
        current_payload = best["payload"]
        previous_max    = max_lat

        # --- Build operator summary for this generation ---
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
            "mode":                     mode,
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

    print(f"\n[ENGINE] Run complete. Results saved to {DATA_FILE}")
    return all_results


# =============================================================
# ENTRY POINT
# =============================================================

if __name__ == "__main__":
    config = load_config()
    mode   = config.get("mode", "adaptive")

    if mode == "both":
        # Run adaptive first, then baseline, combine results
        print("[ENGINE] Running BOTH modes for research comparison")
        adaptive_results = run(config, mode="adaptive")

        # Reset data file for baseline run
        save_results([])
        baseline_results = run(config, mode="baseline")

        # Save both together
        combined = {
            "adaptive": adaptive_results,
            "baseline": baseline_results
        }
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        with open(DATA_FILE, "w") as f:
            json.dump(combined, f, indent=2)
        print("[ENGINE] Both runs saved.")
    else:
        run(config, mode=mode)