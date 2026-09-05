#!/usr/bin/env python3
"""Validate the base building/Provisions catalog and generate review exports."""

import argparse
import csv
import io
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/cards/base-buildings-and-provisions.json"
BOARD = ROOT / "data/maps/original-board.json"
EXPECTED_COUNTS = {"city": 21, "farm": 12, "camp": 6, "sky_tower": 3, "provisions": 3}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(data, board):
    require(data["schemaVersion"] == 1, "Unsupported schema version")
    cards = data["cards"]
    require(len({c["id"] for c in cards}) == len(cards), "Duplicate card ID")
    resources = {r["id"]: r for r in data["resources"]}
    require(len(resources) == len(data["resources"]), "Duplicate resource ID")
    basic = {r for r, value in resources.items() if value["kind"] == "basic"}
    luxury = {r for r, value in resources.items() if value["kind"] == "luxury"}
    require(basic == {"wood", "fish", "carrots"} and len(luxury) == 7,
            "Expected three basic and seven distinct luxury resources")
    require(basic | luxury == set(resources), "Unknown resource kind")
    require({c["baseResource"] for c in board["cells"] if c["baseResource"]} == basic,
            "Basic resources must match the map")
    counts = Counter()
    for card in cards:
        require(type(card["copies"]) is int and card["copies"] > 0, "Copies must be positive integers")
        counts[card["category"]] += card["copies"]
        require(card["resolutionPhase"] == "exploration", "Cards resolve during Exploration")
        if card["category"] != "provisions":
            placement = card["placement"]
            require(placement["phase"] == "construction", "Buildings are placed during Construction")
            require(placement["ownership"] == ("unclaimed" if card["category"] == "camp" else "self"),
                    "Invalid ownership requirement")
            require(placement["requiresEmptyBuildingSlot"] is True, "Buildings require an empty slot")
            terrains = placement["allowedTerrains"]
            require(terrains is None or (terrains and set(terrains) <= {"forest", "plains", "field", "sea", "mountain", "city"}),
                    "Invalid terrain restriction")
    require(counts == EXPECTED_COUNTS, f"Wrong card quantities: {dict(counts)}")
    require(all(data["deckCounts"][kind] == n for kind, n in counts.items()), "Deck/category mismatch")
    require(data["deckCounts"]["territory"] == len(board["cells"]) == 100, "Expected 100 territory cards")
    require(data["deckCounts"]["parchment"] == 37, "Expected 37 parchments")
    require(sum(counts.values()) + len(board["cells"]) + 37 == data["deckCounts"]["total"] == 182,
            "Deck must total 182 cards")

    cities = [c for c in cards if c["category"] == "city"]
    require(Counter({c["effect"]["strength"]: c["copies"] for c in cities}) == {1: 9, 2: 9, 3: 3}
            and len(cities) == 3, "Expected 9/9/3 city cards")
    starting = Counter(c["startingCityStrength"] for c in board["cells"] if c["startingCityStrength"])
    require(starting == {1: 18}, "Expected 18 starting strength-1 cities")
    figures = {c["strength"]: c["figures"] for c in data["cityComponents"]}
    require(figures == {1: 27, 2: 9, 3: 3}, "Unexpected city components")
    for card in cities:
        strength = card["effect"]["strength"]
        require(card["copies"] + starting[strength] == figures[strength], "City cards/board exceed figures")
        require(card["effect"]["type"] == "add_strength", "Invalid city effect")
        require(card["placement"]["allowedTerrains"] == (["mountain"] if strength == 3 else None),
                "Invalid city terrain requirement")

    farms = [c for c in cards if c["category"] == "farm"]
    require(Counter({kind: sum(c["copies"] for c in farms if c["farmType"] == kind)
                     for kind in ("basic", "trading_post", "luxury")}) == {"basic": 3, "trading_post": 2, "luxury": 7},
            "Expected 3 basic farms, 2 Trading Posts, and 7 luxury farms")
    farm_resources = Counter()
    for card in farms:
        effect = card["effect"]
        require(effect["quantity"] == 1, "Each farm produces one additional resource")
        if card["farmType"] == "trading_post":
            require(effect["type"] == "choose_resource" and set(effect["choices"]) == basic,
                    "Trading Posts choose one basic resource")
            require(effect["choiceFrequency"] == "each_round" and effect["finalRoundChoiceAppliesToParchments"] is True,
                    "Invalid Trading Post timing")
        else:
            resource = effect["resource"]
            require(effect["type"] == "produce_resource" and resource in resources, "Unknown farm resource")
            require(resources[resource]["kind"] == card["farmType"], "Farm/resource type mismatch")
            farm_resources[resource] += card["copies"]
        if card["farmType"] != "luxury":
            require(card["placement"]["allowedTerrains"] is None, "Basic farms/Trading Posts have no terrain restriction")
    require(farm_resources == Counter({r: 1 for r in resources}), "Expected one fixed farm per resource")
    restrictions = {c["effect"]["resource"]: c["placement"]["allowedTerrains"] for c in farms if c["farmType"] == "luxury"}
    require(restrictions == {"pearl": ["sea"], "mushroom": ["forest"], "luxury_field": ["field"],
                             "diamond": ["mountain"], "copper": ["mountain"], "gold": ["mountain"], "steel": ["mountain"]},
            "Luxury restrictions differ from the user confirmation")
    camps = [c for c in cards if c["category"] == "camp"]
    require(sorted(c["effect"]["priority"] for c in camps) == list(range(1, 7)) and all(c["copies"] == 1 for c in camps),
            "Expected one Camp of each priority 1-6")
    for card in cards:
        if card["category"] == "camp":
            require(card["effect"]["type"] == "claim_territory" and card["effect"]["placeRabbit"] is True,
                    "Camp must claim a territory with a rabbit")
        elif card["category"] == "sky_tower":
            require(card["effect"] == {"type": "connect_fiefs", "tokensPerCard": 2, "territoriesPerCard": 2,
                                       "requiresDifferentFiefs": True}, "Sky Towers require a pair in different fiefs")
        elif card["category"] == "provisions":
            require(card["effect"] == {"type": "draw_and_play", "count": 2, "immediate": True,
                                       "discardAfterResolution": True}, "Invalid Provisions effect")
        if card["category"] in ("camp", "sky_tower"):
            require(card["placement"]["allowedTerrains"] is None, "Camps/Sky Towers have no terrain restriction")


def artifacts(data):
    resources = {r["id"]: r["name"] for r in data["resources"]}
    rows = []
    for card in data["cards"]:
        effect = card["effect"]
        summary = {
            "city": f'Strength {effect.get("strength")}',
            "camp": f'Priority {effect.get("priority")}',
            "sky_tower": "2 tokens; connects 2 separate fiefs",
            "provisions": "Immediately draw and play 2 cards",
        }.get(card["category"])
        if card["category"] == "farm":
            summary = resources[effect["resource"]] if "resource" in effect else "Choose wood/fish/carrots each round"
        terrains = card.get("placement", {}).get("allowedTerrains")
        rows.append({"id": card["id"], "name": card["name"], "category": card["category"], "copies": card["copies"],
                     "effect": summary, "terrain": ";".join(terrains) if terrains else ("n/a" if card["category"] == "provisions" else "any"),
                     "nameStatus": card.get("nameStatus", "descriptive")})
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    lines = ["# Base-game buildings and Provisions", "",
             "Generated from [the canonical JSON](base-buildings-and-provisions.json). Counts, camp priorities, and luxury-terrain assignments were confirmed by the user on 2026-09-05. General rules use the official rulebook.", "",
             "**42 building cards + 3 Provisions = 45 cards in this catalog.** The full deck is 100 territories + these 45 cards + 37 parchments = 182. [Parchment entries and scoring questions](base-parchments.review.md) are maintained separately.", "",
             "The 18 starting strength-1 cities are on the map. Together with the 9/9/3 city cards, they account for all 27/9/3 city figures.", "",
             "Card names below are descriptive labels. **Carrot powder is tentative**; it identifies one distinct luxury resource placed on a field, separate from basic carrots. Steel preserves the user's supplied name.", "",
             "| Card | Copies | Effect | Terrain restriction |",
             "| --- | ---: | --- | --- |"]
    for row in rows:
        name = row["name"] + (" (name tentative)" if row["nameStatus"] == "tentative" else "")
        lines.append(f'| {name} | {row["copies"]} | {row["effect"]} | {row["terrain"]} |')
    lines.extend(["", "Any terrain still requires the appropriate ownership and an empty building slot. Camps require no rabbit and no building; Sky Towers require two eligible territories in separate fiefs.", "", "## Rule notes", ""])
    lines.extend(f'- {note}' for note in data["ruleNotes"])
    lines.extend(["", "## Remaining items", ""])
    lines.extend(f'- {item["description"]}' for item in data["openItems"])
    source = next(s for s in data["sources"] if s["id"] == "official-rulebook")
    lines.extend(["", f'Rules source: [IELLO base-game rulebook]({source["url"]}), pages 2-4, 6-7, and 10. This catalog is reference data; gameplay has not been implemented or tested.', ""])
    return {
        CATALOG.with_suffix(".csv"): stream.getvalue(),
        CATALOG.with_suffix(".review.md"): "\n".join(lines),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate and check that review exports are current")
    args = parser.parse_args()
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    board = json.loads(BOARD.read_text(encoding="utf-8"))
    validate(data, board)
    for path, content in artifacts(data).items():
        if args.check:
            require(path.exists() and path.read_text(encoding="utf-8") == content, f"Stale or missing export: {path.name}")
        else:
            path.write_text(content, encoding="utf-8")
    print("Validated 42 buildings + 3 Provisions; city figures reconcile with the 18 starting cities.")
    print("Deck counts reconcile to 182; use build_parchment_review.py to validate the separate parchment catalog.")
    print("Review exports are current." if args.check else "Wrote CSV and Markdown review exports.")


if __name__ == "__main__":
    main()
