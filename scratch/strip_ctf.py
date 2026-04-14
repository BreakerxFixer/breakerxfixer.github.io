import re

with open("/home/k1r0x/Desktop/breakerxfixer.github.io/ctf.html", "r") as f:
    html = f.read()

# Replace the static list with nothing, and add the search/filter UI
start_idx = html.find('<ul class="ctf-list">')
end_idx = html.find('</ul>', start_idx) + 5

replacement = """<div class="filter-container" style="text-align: center; margin-bottom: 20px;">
            <input type="text" id="ctfSearch" placeholder="Search missions, categories, description..." style="background: rgba(0,0,0,0.5); border: 1px solid #00ff3c; color: #00ff3c; padding: 12px; width: 80%; max-width: 600px; margin-bottom: 20px; font-family: monospace; border-radius: 4px; outline: none;">
            <div class="categories-nav" style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;" id="category-filters">
                <button class="cat-btn active" data-cat="all">ALL</button>
                <button class="cat-btn" data-cat="Web">WEB</button>
                <button class="cat-btn" data-cat="Crypto">CRYPTO</button>
                <button class="cat-btn" data-cat="Pwn">PWN</button>
                <button class="cat-btn" data-cat="Forensics">FORENSICS</button>
                <button class="cat-btn" data-cat="OSINT">OSINT</button>
                <button class="cat-btn" data-cat="Rev">REVERSE</button>
                <button class="cat-btn" data-cat="Programming">PROGRAMMING</button>
                <button class="cat-btn" data-cat="Hardware">HARDWARE</button>
            </div>
        </div>
        <ul class="ctf-list" id="ctf-list-container">
            <!-- Rendered by JS -->
        </ul>"""

new_html = html[:start_idx] + replacement + html[end_idx:]

with open("/home/k1r0x/Desktop/breakerxfixer.github.io/ctf.html", "w") as f:
    f.write(new_html)

print("ctf.html stripped of hardcoded list.")
