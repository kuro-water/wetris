import json
import sys
import argparse


ACTION_NAMES = {
    0: "Left",
    1: "Right",
    2: "RotateLeft",
    3: "RotateRight",
    4: "SoftDrop",
    5: "HardDrop",
    6: "Hold",
}


def action_name(action):
    return ACTION_NAMES.get(action, f"Unknown({action})")


def action_short(action):
    names = {
        0: "←",
        1: "→",
        2: "↺",
        3: "↻",
        4: "↓",
        5: "⇓",
        6: "H",
    }
    return names.get(action, "?")


def print_field(field):
    if not field:
        return

    width = len(field[0])

    border = "+" + "--" * width + "+"

    print(border)

    for row in field:
        cells = ""

        for cell in row:
            if cell == 0:
                cells += "  "
            else:
                cells += "[]"

        print(f"|{cells}|")

    print(border)


def print_candidate(index, candidate):
    field = candidate["field"]
    actions = candidate["actions"]

    print("=" * 50)
    print(f"Candidate {index}")
    print("=" * 50)

    print()

    print("Actions:")
    print("  " + " ".join(action_name(a) for a in actions))

    print()

    print("Short:")
    print("  " + " ".join(action_short(a) for a in actions))

    print()

    print(f"Moves: {len(actions)}")

    print()

    print("Field:")
    print_field(field)

    print()


def load_json():
    # ファイル指定
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as f:
            return json.load(f)

    # stdin
    return json.load(sys.stdin)


def main():
    parser = argparse.ArgumentParser(
        description="Wetris AI candidate viewer"
    )

    parser.add_argument(
        "file",
        nargs="?",
        help="JSON file. If omitted, read from stdin.",
    )

    parser.add_argument(
        "-i",
        "--index",
        type=int,
        help="Show only one candidate.",
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Show all candidates.",
    )

    args = parser.parse_args()

    if args.file:
        with open(args.file, encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)

    candidates = data["candidates"]

    print(f"Candidates: {len(candidates)}")
    print()

    if args.index is not None:
        if args.index < 0 or args.index >= len(candidates):
            print(f"Invalid index: {args.index}")
            sys.exit(1)

        print_candidate(
            args.index,
            candidates[args.index],
        )

        return

    # デフォルトは全部
    for i, candidate in enumerate(candidates):
        print_candidate(i, candidate)


if __name__ == "__main__":
    main()
