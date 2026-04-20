"""One-off: replace legacy account panel markup with Stitch-style panel (matches index.html)."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

NEW_4 = r"""    <div id="account-panel-overlay"
    style="display:none;position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);">
</div>
<div id="account-panel" class="account-panel">
    <div class="lb-account-panel__chrome">
        <span class="lb-account-panel__brand" data-en="&gt; BXF_PROTOCOL" data-es="&gt; BXF_PROTOCOL">&gt; BXF_PROTOCOL</span>
        <button type="button" class="account-panel-close"
            onclick="document.getElementById('account-panel').classList.remove('open');document.getElementById('account-panel-overlay').style.display='none';"
            aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
    </div>
    <div class="account-panel-header lb-account-panel__hero">
        <div class="account-panel-avatar-wrap">
            <div class="account-panel-avatar" id="panel-avatar">👾</div>
            <label for="avatar-upload" class="avatar-upload-btn" title="Upload photo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                </svg>
            </label>
            <input type="file" id="avatar-upload" accept="image/*" style="display:none;">
        </div>
        <div class="lb-account-panel__identity">
            <div class="account-panel-username" id="panel-username">—</div>
            <div class="account-panel-stats" id="panel-stats">RANK -- | 0 PTS</div>
        </div>
    </div>
    <div class="account-panel-body">
        <div id="avatar-preview-wrap" class="account-avatar-preview-wrap account-panel-block" style="display:none;">
            <div id="avatar-preview" class="account-avatar-preview"></div>
            <button type="button" class="account-action-btn account-action-btn--success" id="avatar-apply-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                APLICAR FOTO
            </button>
            <button type="button" class="account-action-btn" id="avatar-cancel-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
                CANCELAR
            </button>
        </div>
        <button type="button" class="account-action-btn" id="signout-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
            Cerrar sesión
        </button>
        <button type="button" class="account-action-btn danger" id="delete-account-btn-panel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            Borrar cuenta
        </button>
    </div>
</div>
"""

PAT_4 = re.compile(
    r'<div id="account-panel-overlay"[\s\S]*?</div>\s*<div id="account-panel"[\s\S]*?</div>\s*</div>\s*\n',
    re.MULTILINE,
)

PAT_2 = re.compile(
    r'  <div id="account-panel-overlay"[\s\S]*?</div>\s*<div id="account-panel"[\s\S]*?</div>\s*</div>\s*\n',
    re.MULTILINE,
)


def main():
    files_4 = [
        "writeups.html",
        "privacy.html",
        "learn.html",
        "ctf.html",
        "contest-leaderboard.html",
        "aboutus.html",
        "_layouts/writeup.html",
    ]
    for fn in files_4:
        p = ROOT / fn
        t = p.read_text(encoding="utf-8")
        if "lb-account-panel__chrome" in t:
            print(fn, "skip")
            continue
        nt, n = PAT_4.subn(NEW_4, t, count=1)
        if n != 1:
            print(fn, "FAIL", n)
        else:
            p.write_text(nt, encoding="utf-8")
            print(fn, "ok")

    NEW_2 = "\n".join("  " + line if line.strip() else line for line in NEW_4.split("\n"))
    p = ROOT / "writeup-community.html"
    t = p.read_text(encoding="utf-8")
    if "lb-account-panel__chrome" in t:
        print("writeup-community.html skip")
    else:
        nt, n = PAT_2.subn(NEW_2, t, count=1)
        print("writeup-community.html", "ok" if n == 1 else f"FAIL {n}")
        if n == 1:
            p.write_text(nt, encoding="utf-8")


if __name__ == "__main__":
    main()
