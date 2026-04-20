"""Remove duplicate account-panel fragments, replay-tut-btn, and account-tut-menu from HTML pages."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SKIP = ("node_modules", "scratch", "frontend", ".git")

ORPHAN_STD = re.compile(
    r"\n        <button class=\"account-panel-close\"[\s\S]*?\n    </div>\n</div>\n(?=\n    <!-- ═══ Social Widget)",
)
ORPHAN_COMM = re.compile(
    r"\n      <button class=\"account-panel-close\"[\s\S]*?\n  </div>\n\n  <div id=\"social-widget\">",
)
REPLAY_BTN = re.compile(
    r"[ \t]*<button[^>]*\bid=\"replay-tut-btn\"[^>]*>[\s\S]*?</button>\s*\n",
)
TUT_MENU = re.compile(
    r"[ \t]*<details[^>]*\bid=\"account-tut-menu\"[^>]*>[\s\S]*?</details>\s*\n",
    re.MULTILINE,
)


def main():
    for p in ROOT.rglob("*.html"):
        if any(s in p.parts for s in SKIP):
            continue
        try:
            t = p.read_text(encoding="utf-8")
        except OSError:
            continue
        if "account-panel" not in t and "replay-tut-btn" not in t:
            continue
        orig = t
        t = ORPHAN_STD.sub("\n", t)
        t = ORPHAN_COMM.sub("\n\n  <div id=\"social-widget\">", t)
        while REPLAY_BTN.search(t):
            t = REPLAY_BTN.sub("", t, count=1)
        t = TUT_MENU.sub("", t)
        if t != orig:
            p.write_text(t, encoding="utf-8")
            print("cleaned", p.relative_to(ROOT))


if __name__ == "__main__":
    main()
