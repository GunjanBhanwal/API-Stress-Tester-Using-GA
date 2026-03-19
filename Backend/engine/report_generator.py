import os
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(dotenv_path="engine/.env")

DATA_FILE   = os.getenv("DATA_FILE",   "shared/data.json")
REPORT_FILE = os.getenv("REPORT_FILE", "shared/report.pdf")
CONFIG_FILE = os.getenv("CONFIG_FILE", "shared/config.json")

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table,
        TableStyle, PageBreak, HRFlowable
    )
    from reportlab.graphics.shapes import Drawing, Line
    from reportlab.graphics.charts.lineplots import LinePlot
    from reportlab.graphics.widgets.markers import makeMarker
except ImportError:
    print("[REPORT] reportlab not installed. Run: pip install reportlab")
    exit(1)


# =============================================================
# COLORS
# =============================================================
RED     = colors.HexColor("#E24B4A")
BLUE    = colors.HexColor("#185FA5")
GRAY    = colors.HexColor("#888780")
LIGHT   = colors.HexColor("#F5F5F4")
DARK    = colors.HexColor("#1A1A1A")
GREEN   = colors.HexColor("#3B6D11")
BORDER  = colors.HexColor("#E5E5E5")
AMBER   = colors.HexColor("#BA7517")


# =============================================================
# STYLES
# =============================================================
def build_styles():
    base = getSampleStyleSheet()

    styles = {
        "title": ParagraphStyle(
            "title",
            fontSize=22,
            textColor=DARK,
            fontName="Helvetica-Bold",
            spaceAfter=4
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontSize=11,
            textColor=GRAY,
            fontName="Helvetica",
            spaceAfter=2
        ),
        "section": ParagraphStyle(
            "section",
            fontSize=13,
            textColor=DARK,
            fontName="Helvetica-Bold",
            spaceBefore=16,
            spaceAfter=8
        ),
        "body": ParagraphStyle(
            "body",
            fontSize=10,
            textColor=DARK,
            fontName="Helvetica",
            spaceAfter=4,
            leading=15
        ),
        "mono": ParagraphStyle(
            "mono",
            fontSize=9,
            textColor=BLUE,
            fontName="Courier",
            spaceAfter=2
        ),
        "label": ParagraphStyle(
            "label",
            fontSize=9,
            textColor=GRAY,
            fontName="Helvetica",
            spaceAfter=2
        ),
        "highlight": ParagraphStyle(
            "highlight",
            fontSize=10,
            textColor=RED,
            fontName="Helvetica-Bold",
            spaceAfter=4
        ),
    }
    return styles


# =============================================================
# HELPER: build a simple line chart using ReportLab graphics
# =============================================================
def build_line_chart(data_series, width=440, height=180, y_label="ms"):
    drawing = Drawing(width, height)

    chart = LinePlot()
    chart.x      = 40
    chart.y      = 20
    chart.width  = width - 60
    chart.height = height - 40

    chart.data = data_series

    # Style each line
    chart.lines[0].strokeColor = RED
    chart.lines[0].strokeWidth = 1.5
    chart.lines[0].symbol      = makeMarker("Circle")
    chart.lines[0].symbol.size = 3

    if len(data_series) > 1:
        chart.lines[1].strokeColor = BLUE
        chart.lines[1].strokeWidth = 1
        chart.lines[1].symbol      = makeMarker("Circle")
        chart.lines[1].symbol.size = 2

    chart.xValueAxis.valueMin        = 0
    chart.xValueAxis.labelTextFormat = "%d"
    chart.xValueAxis.labels.fontSize = 7
    chart.xValueAxis.labels.fontName = "Helvetica"

    chart.yValueAxis.labelTextFormat = "%d"
    chart.yValueAxis.labels.fontSize = 7
    chart.yValueAxis.labels.fontName = "Helvetica"

    drawing.add(chart)
    return drawing


# =============================================================
# HELPER: stat summary table
# =============================================================
def build_stat_table(rows, styles):
    col_widths = [200, 150, 150]
    table = Table(rows, colWidths=col_widths)
    table.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0),  LIGHT),
        ("TEXTCOLOR",    (0, 0), (-1, 0),  GRAY),
        ("FONTNAME",     (0, 0), (-1, 0),  "Helvetica"),
        ("FONTSIZE",     (0, 0), (-1, 0),  8),
        ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 1), (-1, -1), 9),
        ("TEXTCOLOR",    (0, 1), (-1, -1), DARK),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID",         (0, 0), (-1, -1), 0.3, BORDER),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
    ]))
    return table


# =============================================================
# COMPUTE SUMMARY STATS FROM RAW DATA
# =============================================================
def compute_summary(data):
    if not data:
        return {}

    # Skip generation 0 (baseline) for most calculations
    gens = [d for d in data if d["generation"] > 0]
    if not gens:
        return {}

    latencies   = [d["max_latency_ms"] for d in gens]
    diversities = [d["diversity_score"] for d in gens]
    firs        = [d["fitness_improvement_rate"] for d in gens if d["fitness_improvement_rate"] is not None]

    peak_gen    = max(gens, key=lambda d: d["max_latency_ms"])

    # Convergence = first gen where any single weight > 0.6
    conv_gen = next(
        (d for d in gens if max(d["weights"].values()) > 0.6),
        None
    )

    # Most targeted key = key with highest weight in final generation
    final_weights = gens[-1]["weights"]
    top_key       = max(final_weights, key=final_weights.get)

    return {
        "total_generations": len(gens),
        "peak_latency_ms":   round(max(latencies), 2),
        "peak_generation":   peak_gen["generation"],
        "avg_latency_ms":    round(sum(latencies) / len(latencies), 2),
        "baseline_ms":       data[0]["max_latency_ms"] if data else 0,
        "final_diversity":   round(diversities[-1], 4),
        "initial_diversity": round(diversities[0], 4),
        "avg_fir":           round(sum(firs) / len(firs), 2) if firs else 0,
        "convergence_gen":   conv_gen["generation"] if conv_gen else "Did not converge",
        "top_key":           top_key,
        "top_key_weight":    round(final_weights[top_key], 4),
        "mode":              gens[0].get("mode", "adaptive")
    }


# =============================================================
# MAIN REPORT BUILDER
# =============================================================
def generate_report(data, config, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )

    styles  = build_styles()
    story   = []
    summary = compute_summary(data)

    # Skip gen 0 for charts
    gens = [d for d in data if d["generation"] > 0]

    # ==========================================================
    # PAGE 1 — Title + Config + Summary
    # ==========================================================
    story.append(Paragraph("Chaos-Gen", styles["title"]))
    story.append(Paragraph("Adaptive API Stress Testing — Research Report", styles["subtitle"]))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        styles["label"]
    ))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=16))

    # Run configuration
    story.append(Paragraph("Run Configuration", styles["section"]))
    config_rows = [
        ["Parameter", "Value"],
        ["Target URL",   config.get("url", "—")],
        ["Mode",         summary.get("mode", "—").capitalize()],
        ["Generations",  str(summary.get("total_generations", "—"))],
        ["Population",   str(config.get("population", "—"))],
        ["Keys Tested",  ", ".join(config.get("body", {}).keys())],
    ]
    story.append(build_stat_table(config_rows, styles))
    story.append(Spacer(1, 16))

    # Summary stats
    story.append(Paragraph("Executive Summary", styles["section"]))
    summary_rows = [
        ["Metric",                  "Value"],
        ["Baseline Latency",        f"{summary.get('baseline_ms', 0):.2f} ms"],
        ["Peak Latency Achieved",   f"{summary.get('peak_latency_ms', 0):.2f} ms"],
        ["Peak at Generation",      str(summary.get('peak_generation', '—'))],
        ["Average Latency",         f"{summary.get('avg_latency_ms', 0):.2f} ms"],
        ["Converged at Generation", str(summary.get('convergence_gen', '—'))],
        ["Most Targeted Key",       summary.get('top_key', '—')],
        ["Final Key Weight",        f"{summary.get('top_key_weight', 0) * 100:.1f}%"],
        ["Initial Diversity",       str(summary.get('initial_diversity', '—'))],
        ["Final Diversity",         str(summary.get('final_diversity', '—'))],
        ["Average FIR",             f"{summary.get('avg_fir', 0):.2f}%"],
    ]
    story.append(build_stat_table(summary_rows, styles))

    story.append(PageBreak())

    # ==========================================================
    # PAGE 2 — Latency Chart
    # ==========================================================
    story.append(Paragraph("Latency Over Generations", styles["section"]))
    story.append(Paragraph(
        "Red line = max latency per generation. Blue line = average latency.",
        styles["label"]
    ))
    story.append(Spacer(1, 8))

    if gens:
        max_series = [(d["generation"], d["max_latency_ms"]) for d in gens]
        avg_series = [(d["generation"], d["avg_latency_ms"]) for d in gens]
        story.append(build_line_chart([max_series, avg_series]))

    story.append(Spacer(1, 20))

    # ==========================================================
    # PAGE 2 cont — Diversity Chart
    # ==========================================================
    story.append(Paragraph("Diversity Score Over Generations", styles["section"]))
    story.append(Paragraph(
        "Measures how spread the mutation weights are. "
        "Drops as GA specialises on the vulnerable key.",
        styles["label"]
    ))
    story.append(Spacer(1, 8))

    if gens:
        div_series = [(d["generation"], d["diversity_score"]) for d in gens]
        story.append(build_line_chart([div_series], y_label="entropy"))

    story.append(PageBreak())

    # ==========================================================
    # PAGE 3 — Generation Log Table
    # ==========================================================
    story.append(Paragraph("Generation Log", styles["section"]))

    log_rows = [["Gen", "Max ms", "Avg ms", "Best Key", "Diversity", "FIR %"]]
    for d in gens:
        fir = d.get("fitness_improvement_rate")
        log_rows.append([
            str(d["generation"]),
            f"{d['max_latency_ms']:.1f}",
            f"{d['avg_latency_ms']:.1f}",
            d["best_key_mutated"],
            f"{d['diversity_score']:.3f}",
            f"+{fir:.1f}" if fir is not None else "—"
        ])

    log_table = Table(log_rows, colWidths=[40, 70, 70, 80, 70, 60])
    log_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  LIGHT),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  GRAY),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("TEXTCOLOR",     (0, 1), (-1, -1), DARK),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID",          (0, 0), (-1, -1), 0.3, BORDER),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(log_table)

    story.append(PageBreak())

    # ==========================================================
    # PAGE 4 — Operator Effectiveness
    # ==========================================================
    story.append(Paragraph("Mutation Operator Effectiveness", styles["section"]))
    story.append(Paragraph(
        "Shows which mutation type caused the highest average latency across all generations.",
        styles["label"]
    ))
    story.append(Spacer(1, 8))

    # Aggregate operator stats across all generations
    all_ops = {}
    for d in gens:
        for op_name, op_data in d.get("operator_stats", {}).items():
            if op_name not in all_ops:
                all_ops[op_name] = {"count": 0, "total": 0.0}
            all_ops[op_name]["count"] += op_data["count"]
            all_ops[op_name]["total"] += op_data["avg_latency_ms"] * op_data["count"]

    op_rows = [["Mutation Type", "Times Used", "Avg Latency (ms)"]]
    for op_name, stats in sorted(all_ops.items(), key=lambda x: -x[1]["total"]):
        avg = stats["total"] / stats["count"] if stats["count"] > 0 else 0
        op_rows.append([op_name, str(stats["count"]), f"{avg:.2f}"])

    story.append(build_stat_table(op_rows, styles))

    story.append(Spacer(1, 20))

    # ==========================================================
    # PAGE 4 cont — Research Notes
    # ==========================================================
    story.append(Paragraph("Research Notes", styles["section"]))
    story.append(Paragraph(
        f"The GA ran in <b>{summary.get('mode', 'adaptive').upper()}</b> mode. "
        f"Starting from a baseline of <b>{summary.get('baseline_ms', 0):.2f}ms</b>, "
        f"the algorithm achieved a peak latency of "
        f"<b>{summary.get('peak_latency_ms', 0):.2f}ms</b> — a "
        f"<b>{((summary.get('peak_latency_ms', 1) / max(summary.get('baseline_ms', 1), 0.1)) * 100):.0f}%</b> "
        f"increase over baseline.",
        styles["body"]
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"The diversity score dropped from "
        f"<b>{summary.get('initial_diversity', 0):.4f}</b> to "
        f"<b>{summary.get('final_diversity', 0):.4f}</b>, indicating the adaptive "
        f"mechanism successfully specialised the mutation strategy toward the "
        f"<b>'{summary.get('top_key', '?')}'</b> key "
        f"(final weight: {summary.get('top_key_weight', 0) * 100:.1f}%).",
        styles["body"]
    ))

    doc.build(story)
    print(f"[REPORT] PDF saved to {output_path}")
    return output_path


# =============================================================
# ENTRY POINT
# =============================================================
if __name__ == "__main__":
    data   = None
    config = {}

    if not os.path.exists(DATA_FILE):
        print(f"[REPORT] No data file found at {DATA_FILE}")
        exit(1)

    with open(DATA_FILE, "r") as f:
        data = json.load(f)

    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)

    if not data:
        print("[REPORT] Data file is empty.")
        exit(1)

    generate_report(data, config, REPORT_FILE)