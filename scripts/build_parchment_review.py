#!/usr/bin/env python3
"""Validate parchment transcription/provenance and generate CSV and Markdown."""

import argparse
import csv
import hashlib
import io
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/cards/base-parchments.json"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(data):
    require(data["schemaVersion"] == 1, "Unsupported schema version")
    source = next(s for s in data["sources"] if s["id"] == "user-parchments")
    raw = (ROOT / source["file"]).read_bytes()
    require(hashlib.sha256(raw).hexdigest() == source["sha256"],
            "Parchment source changed: reconcile the JSON and provenance before generating exports")
    lines = {i: line for i, line in enumerate(raw.decode("utf-8-sig").splitlines(), 1) if line.strip()}
    cards = data["cards"]
    ids = {c["id"] for c in cards}
    require(len(ids) == len(cards) == len(lines) == 37, "Expected 37 unique card IDs and source entries")
    require(len({c["name"] for c in cards}) == 37, "Duplicate parchment name")
    require([c["sourceLine"] for c in cards] == list(lines), "Cards must cover every source line in order")
    require(all(c["category"] == "parchment" and type(c["copies"]) is int and c["copies"] == 1 for c in cards),
            "Current source contains one copy of each parchment")
    require(Counter(c["parchmentType"] for c in cards) == {"treasure": 8, "mission": 29},
            "Expected eight treasures and 29 missions")
    require(data["inventory"] == {"totalCards": 37, "treasures": 8, "missions": 29}, "Inventory mismatch")
    issues = {issue["id"]: issue for issue in data["openItems"]}
    require(len(issues) == len(data["openItems"]), "Duplicate open item")
    for issue in issues.values():
        require(issue["cardIds"] and set(issue["cardIds"]) <= ids, "Unknown card in open item")
        require(issue["status"] == "open" and issue["question"], "Open items need a question")
    source_ids = {s["id"] for s in data["sources"]}
    buildings = json.loads((ROOT / "data/cards/base-buildings-and-provisions.json").read_text(encoding="utf-8"))
    resources = {r["id"] for r in buildings["resources"]}
    required_spec_fields = {
        "fixed_points": {"points"},
        "paired_treasure": {"partnerCardId", "pointsAlone", "pointsWithPartner"},
        "points_per_count": {"metric", "pointsPerItem"},
        "points_per_resource": {"resource", "pointsPerUnit"},
        "resource_threshold": {"resource", "minimum", "points"},
        "points_per_resource_class": {"resourceClass", "pointsPerUnit"},
        "points_per_qualifying_fief": {"minimumTerritories", "pointsPerFief"},
        "count_threshold": {"metric", "minimum", "points"},
        "territory_lead_bonus": {"points", "tiePolicy"},
        "extra_harvest_except_best": {"excludedFiefs", "excludeExactlyOneIfBestTied"},
        "multiply_treasure_values": {"factor", "multipleHunterStacking"},
        "copy_parchment": {"targetNeighbor", "copyEntireCard", "copyCardTargetPolicy", "choiceOrder"},
        "rank_bonus": {"rank", "points", "checkpoint", "tiePolicy"},
    }
    for card in cards:
        require(f'{card["name"]} — {card["sourceText"]}' == lines[card["sourceLine"]],
                f'Source wording differs for {card["id"]}')
        require(set(card["sourceRefs"]) <= source_ids and "user-parchments" in card["sourceRefs"], "Missing/unknown source")
        refs = {key for key, issue in issues.items() if card["id"] in issue["cardIds"]}
        require(set(card["openItemRefs"]) == refs, "Card/open-item references disagree")
        require(card["scoringStatus"] == ("needs_clarification" if refs else "draft_from_source"), "Invalid scoring status")
        spec = card["scoringSpec"]
        require(spec["type"] in required_spec_fields and required_spec_fields[spec["type"]] <= set(spec),
                f'Incomplete scoring specification for {card["id"]}')
        require(not any(value is None for value in spec.values()) or bool(refs), "Unresolved field has no open item")
        if "resource" in spec:
            require(spec["resource"] in resources, "Unknown resource reference")
        if "partnerCardId" in spec:
            require(spec["partnerCardId"] in ids and spec["partnerCardId"] != card["id"], "Invalid glove partner")
        if spec["type"] == "copy_parchment":
            require(spec["targetNeighbor"] in ("left", "right"), "Invalid copy direction")
    board = json.loads((ROOT / "data/maps/original-board.json").read_text(encoding="utf-8"))
    deck_total = len(board["cells"]) + sum(c["copies"] for c in buildings["cards"]) + sum(c["copies"] for c in cards)
    require(deck_total == buildings["deckCounts"]["total"] == 182, "Full card inventory must reconcile to 182")


def artifacts(data):
    stream = io.StringIO(newline="")
    fields = ["id", "name", "copies", "parchmentType", "sourceLine", "sourceText", "scoringStatus", "scoringSpec", "notes", "openItemRefs"]
    writer = csv.DictWriter(stream, fields, lineterminator="\n")
    writer.writeheader()
    for card in data["cards"]:
        row = {key: card[key] for key in fields}
        row["scoringSpec"] = json.dumps(card["scoringSpec"], ensure_ascii=False, separators=(",", ":"))
        row["notes"] = " ".join(card["notes"])
        row["openItemRefs"] = ";".join(card["openItemRefs"])
        writer.writerow(row)
    lines = ["# Original base-game parchments", "",
             "**37 entries imported: 8 treasures and 29 missions, one copy each.** Combined with 100 territories and 45 building/Provisions cards, the inventory totals 182.", "",
             "Status: **awaiting review**. [Original supplied text](parchments.txt) is preserved; the table below repeats it. [JSON](base-parchments.json) contains draft scoring specifications; [CSV](base-parchments.csv) includes both wording and specifications.", "",
             "One copy per entry and the treasure/mission classification are recorded assumptions. Matching counts does not prove every scoring rule. No scoring engine has been implemented.", "",
             "## Rules still needing clarification", ""]
    by_id = {c["id"]: c for c in data["cards"]}
    for issue in data["openItems"]:
        names = ", ".join(by_id[c]["name"] for c in issue["cardIds"])
        lines.append(f'- **{names}:** {issue["question"]}')
    lines.extend(["", "## Card review", "",
                  "In the supplied wording, carrot point rewards mean Golden Carrots (points); Carrot resources refer to production. These remain separate in the JSON.", "",
                  "| # | Card | Type | Supplied scoring text | Status |",
                  "| ---: | --- | --- | --- | --- |"])
    for card in data["cards"]:
        status = "Needs clarification" if card["openItemRefs"] else "Draft from source"
        text = card["sourceText"].replace("|", "\\|")
        lines.append(f'| {card["sourceLine"]} | {card["name"]} | {card["parchmentType"]} | {text} | {status} |')
    lines.extend(["", "## Interpretation notes", ""])
    for key, value in data["scoringConventions"].items():
        if key not in ("pointsUnit", "basicCarrotResourceId"):
            lines.append(f'- {value}')
    for card in data["cards"]:
        if card["notes"]:
            lines.append(f'- **{card["name"]}:** ' + " ".join(card["notes"]))
    rulebook = next(s for s in data["sources"] if s["id"] == "official-rulebook")
    lines.extend(["", f'General rules and noted special cases: [IELLO rulebook]({rulebook["url"]}), pages 4-6 and 10-11. Remaining card text comes from the supplied file.', ""])
    return {CATALOG.with_suffix(".csv"): stream.getvalue(), CATALOG.with_suffix(".review.md"): "\n".join(lines)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate and check export freshness")
    args = parser.parse_args()
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    validate(data)
    for path, content in artifacts(data).items():
        if args.check:
            require(path.exists() and path.read_text(encoding="utf-8") == content, f"Stale or missing export: {path.name}")
        else:
            path.write_text(content, encoding="utf-8")
    print("Validated 37 source entries (8 treasures, 29 missions); full inventory totals 182.")
    print(f'{len(data["openItems"])} scoring clarifications remain. This is data validation, not scoring-engine testing.')
    print("Review exports are current." if args.check else "Wrote parchment CSV and Markdown review.")


if __name__ == "__main__":
    main()
