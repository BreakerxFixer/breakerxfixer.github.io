#!/usr/bin/env node
/**
 * Expande _includes/*.html en las páginas HTML (una vez, o tras restaurar {% include %} desde git).
 * La lista de writeups se regenera desde _writeups/*.md.
 *
 * Uso: node scripts/inline-site.mjs
 *
 * Tras ejecutar, las páginas ya no contienen {% include %}. Para volver a usar este script,
 * restaura los .html anteriores desde git (con includes) o vuelve a insertar los includes a mano.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INC = path.join(ROOT, '_includes');
const WRITEUPS = path.join(ROOT, '_writeups');

function read(n) {
  return fs.readFileSync(path.join(INC, n), 'utf8');
}

const header = read('bxf-header.html');
const authModal = read('bxf-auth-modal.html');
const accountPanel = read('bxf-account-panel.html');
const socialWidget = read('bxf-social-widget.html');
const legalRaw = read('bxf-legal-footer.html');
const legalIndex = legalRaw.replace(
  /\{%\s*if\s+include\.variant\s*==\s*'static'\s*%\}\s*static\{%\s*endif\s*%\}/g,
  '',
);
const legalStatic = legalRaw.replace(
  /\{%\s*if\s+include\.variant\s*==\s*'static'\s*%\}\s*static\{%\s*endif\s*%\}/g,
  ' static',
);

function stripEmptyFrontMatter(s) {
  return s.replace(/^---\r?\n---\r?\n/, '');
}

function expandIncludes(html, { staticFooter }) {
  const legal = staticFooter ? legalStatic : legalIndex;
  return html
    .replace(/\{%\s*include\s+bxf-header\.html\s*%\}/g, header)
    .replace(/\{%\s*include\s+bxf-auth-modal\.html\s*%\}/g, authModal)
    .replace(/\{%\s*include\s+bxf-account-panel\.html\s*%\}/g, accountPanel)
    .replace(/\{%\s*include\s+bxf-social-widget\.html\s*%\}/g, socialWidget)
    .replace(/\{%\s*include\s+bxf-legal-footer\.html\s+variant="static"\s*%\}/g, legalStatic)
    .replace(/\{%\s*include\s+bxf-legal-footer\.html\s*%\}/g, legal);
}

function parseMd(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    data[k] = v;
  }
  return { data, body: m[2] };
}

function stripForSearch(s) {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`\[\]()|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function escAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildWriteupsUl() {
  const files = fs
    .readdirSync(WRITEUPS)
    .filter((f) => f.endsWith('.md'))
    .sort();
  const items = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/i, '');
    const { data, body } = parseMd(path.join(WRITEUPS, file));
    const title = data.title || slug;
    const d = data.dificultad || '';
    const pl = data.plataforma || '';
    const lang = data.lang || 'es';
    const searchContent = stripForSearch(
      [title, d, pl, body].filter(Boolean).join(' '),
    );
    const diffHtml = d
      ? `<span class="badge diff-${String(d).toLowerCase()}">${escHtml(d)}</span>`
      : '';
    const platHtml = pl
      ? `<span class="badge plat-${String(pl)
          .toLowerCase()
          .replace(/\s+/g, '-')}">${escHtml(pl)}</span>`
      : '';
    items.push(`      <li class="writeup-item" data-search="${escAttr(searchContent)}" data-postlang="${escAttr(lang)}">
        <a href="/writeups/${slug}/" class="writeup-link">
          <div class="writeup-title">${escHtml(title)}</div>
          <div class="writeup-meta">
            ${d ? `            ${diffHtml}\n` : ''}${pl ? `            ${platHtml}\n` : ''}          </div>
        </a>
      </li>`);
  }
  return items.join('\n');
}

const ROOT_PAGES = [
  'index.html',
  'aboutus.html',
  'learn.html',
  'privacy.html',
  'season0.html',
  'season1.html',
  'leaderboard.html',
  'ctf.html',
  'writeups.html',
];

function processWriteups(html) {
  const ul = buildWriteupsUl();
  return html.replace(
    /\{%\s*for\s+post\s+in\s+site\.writeups\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/,
    ul,
  );
}

function main() {
  for (const name of ROOT_PAGES) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    let html = fs.readFileSync(p, 'utf8');
    html = stripEmptyFrontMatter(html);
    const staticFooter = name !== 'index.html';
    if (name === 'writeups.html') {
      html = processWriteups(html);
    }
    html = expandIncludes(html, { staticFooter });
    if (/\{%\s*include/.test(html)) {
      throw new Error(`Quedan includes en ${name}`);
    }
    fs.writeFileSync(p, html, 'utf8');
    console.log('ok', name);
  }

  const layoutPath = path.join(ROOT, '_layouts', 'writeup.html');
  if (fs.existsSync(layoutPath)) {
    let html = fs.readFileSync(layoutPath, 'utf8');
    html = expandIncludes(html, { staticFooter: true });
    if (/\{%\s*include/.test(html)) {
      throw new Error('Quedan includes en _layouts/writeup.html');
    }
    fs.writeFileSync(layoutPath, html, 'utf8');
    console.log('ok _layouts/writeup.html');
  }

  const term = path.join(ROOT, 'terminal.html');
  if (fs.existsSync(term)) {
    let html = fs.readFileSync(term, 'utf8');
    html = stripEmptyFrontMatter(html);
    fs.writeFileSync(term, html, 'utf8');
    console.log('ok terminal.html (solo front matter)');
  }
}

main();
