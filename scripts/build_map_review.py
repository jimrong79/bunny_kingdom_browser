#!/usr/bin/env python3
"""Validate the map and regenerate review files with Python's standard library."""

import argparse
import csv
import hashlib
import io
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / "data/maps/original-board.json"
ROWS = "ABCDEFGHIJ"
RESOURCES = {
    "forest": "wood", "plains": None, "field": "carrots",
    "sea": "fish", "mountain": None, "city": None,
}
CODES = {"forest": "FO", "plains": "PL", "field": "FI",
         "sea": "SE", "mountain": "MO", "city": "CI"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(data):
    require(data["schemaVersion"] == 1, "Unsupported schema version")
    require(data["dimensions"] == {"rows": 10, "columns": 10}, "Expected a 10 by 10 board")
    require(data["coordinateSystem"]["rows"] == list(ROWS), "Invalid row labels")
    require(data["coordinateSystem"]["columns"] == list(range(1, 11)), "Invalid column labels")
    expected = [f"{row}{column}" for row in ROWS for column in range(1, 11)]
    require([c["coordinate"] for c in data["cells"]] == expected,
            "Cells must contain A1 through J10 exactly once, in row order")
    cells = {c["coordinate"]: c for c in data["cells"]}
    for coord, cell in cells.items():
        require(cell["row"] in ROWS and type(cell["column"]) is int,
                f"Invalid row or column at {coord}")
        require(f'{cell["row"]}{cell["column"]}' == coord, f"Coordinate mismatch at {coord}")
        require(cell["terrain"] in RESOURCES, f"Unknown terrain at {coord}")
        require(cell["baseResource"] == RESOURCES[cell["terrain"]], f"Resource mismatch at {coord}")
        require(type(cell["startingCityStrength"]) is int and
                cell["startingCityStrength"] == (1 if cell["terrain"] == "city" else 0),
                f"Starting city mismatch at {coord}")
    seen = set()
    for edge in data["blockedConnections"]:
        a, b = edge["from"], edge["to"]
        require(a in cells and b in cells, f"Unknown lava endpoint: {a} / {b}")
        ca, cb = cells[a], cells[b]
        distance = abs(ROWS.index(ca["row"]) - ROWS.index(cb["row"])) + abs(ca["column"] - cb["column"])
        require(distance == 1, f"Lava endpoints must share a side: {a} / {b}")
        require(ca["terrain"] == cb["terrain"] == "mountain", f"Lava must join mountain spaces: {a} / {b}")
        require(edge["reason"] == "lava", f"Unsupported blocked-edge reason at {a} / {b}")
        key = frozenset((a, b))
        require(key not in seen, f"Duplicate undirected lava edge: {a} / {b}")
        seen.add(key)
    require(data["verification"]["status"] in ("awaiting_user_review", "user_verified"),
            "Unknown review status")
    if data["verification"]["status"] == "user_verified":
        require(all(data["verification"].get(key) for key in ("reviewedBy", "reviewRecordedAt", "reviewEvidence")),
                "A verified map must include who reviewed it, when the review was recorded, and the confirmation")
    photo = ROOT / data["source"]["file"]
    if photo.exists():
        require(hashlib.sha256(photo.read_bytes()).hexdigest() == data["source"]["sha256"],
                "The source photo has changed. Review its provenance before regenerating.")
    else:
        print("Note: local reference photo is absent; data validation can still run.")


def csv_text(fieldnames, rows):
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return stream.getvalue()


def artifacts(data):
    counts = Counter(c["terrain"] for c in data["cells"])
    verified = data["verification"]["status"] == "user_verified"
    review_summary = ("The user reviewed the extraction and confirmed that the data looks correct."
                      if verified else "Photo is clear enough for transcription. Human review is pending.")
    cities = [c["coordinate"] for c in data["cells"] if c["startingCityStrength"]]
    blocked = {c["coordinate"]: [] for c in data["cells"]}
    for edge in data["blockedConnections"]:
        blocked[edge["from"]].append(edge["to"])
        blocked[edge["to"]].append(edge["from"])
    cell_rows = [dict(c, lavaBlockedNeighbors=";".join(blocked[c["coordinate"]])) for c in data["cells"]]
    fields = ["coordinate", "row", "column", "terrain", "baseResource", "startingCityStrength", "lavaBlockedNeighbors"]
    lines = [
        "BUNNY KINGDOM — ORIGINAL BOARD TRANSCRIPTION", "",
        f'Status: {data["verification"]["status"]}',
        f'Source: {data["source"]["file"]}',
        review_summary, "",
        "Orientation: A at top; J at bottom; 1 at left; 10 at right.",
        "FO = Forest (wood); PL = Plains (none); FI = Field (carrots)",
        "SE = Sea (fish); MO = Mountain (none); CI = Starting city (none, strength 1)", "",
        "    " + " ".join(f"{column:>2}" for column in range(1, 11)),
    ]
    for row in ROWS:
        lines.append(f"{row}   " + " ".join(CODES[c["terrain"]] for c in data["cells"] if c["row"] == row))
    lines.extend(["", "SPACE COUNTS"])
    lines.extend(f"{terrain}: {counts[terrain]}" for terrain in RESOURCES)
    lines.extend([f'Total: {len(data["cells"])}', "", f"STARTING CITIES ({len(cities)})", ", ".join(cities),
                  "", f'LAVA — BLOCKED SHARED EDGES ({len(data["blockedConnections"])})'])
    lines.extend(f'{e["from"]} <-> {e["to"]}' for e in data["blockedConnections"])
    lines.extend(["", "INTERPRETATION"])
    lines.extend(data["definitions"].values())
    lines.extend(["", "REVIEW NOTES"] + data["verification"]["notes"])
    lines.extend(["", "CORRECTIONS", "Report a coordinate (for example A4) or an edge pair, followed by the correction.",
                  "Edit original-board.json, then run python3 scripts/build_map_review.py to regenerate all views.",
                  "Validation cannot prove that a visual transcription matches the physical board.", ""])
    template = (ROOT / "scripts/templates/map_review.html").read_text(encoding="utf-8")
    embedded = json.dumps(data, ensure_ascii=False).replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")
    require(template.count("__BOARD_JSON__") == 1, "Missing or duplicate data placeholder")
    return {
        ROOT / "data/maps/original-board.cells.csv": csv_text(fields, cell_rows),
        ROOT / "data/maps/original-board.lava.csv": csv_text(["from", "to", "reason"], data["blockedConnections"]),
        ROOT / "data/maps/original-board.review.txt": "\n".join(lines),
        ROOT / "review/map/index.html": template.replace("__BOARD_JSON__", embedded),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate the map and check that generated files are current")
    args = parser.parse_args()
    data = json.loads(MAP.read_text(encoding="utf-8"))
    validate(data)
    for path, text in artifacts(data).items():
        if args.check:
            require(path.exists() and path.read_text(encoding="utf-8") == text, f"Stale or missing artifact: {path.relative_to(ROOT)}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
    cities = sum(c["startingCityStrength"] > 0 for c in data["cells"])
    print(f'Validated {len(data["cells"])} cells, {cities} starting cities, and {len(data["blockedConnections"])} lava edges.')
    print("Generated files are current." if args.check else "Wrote CSV exports, text summary, and review/map/index.html.")
    print(f'Visual review status: {data["verification"]["status"]}')


if __name__ == "__main__":
    main()
