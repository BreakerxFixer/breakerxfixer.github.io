#!/usr/bin/env node
/**
 * Vista previa sin Jekyll (Live Server, etc.):
 * expande {% include %} y genera la lista de writeups desde _writeups/*.md.
 *
 * Uso:  node scripts/live-preview.mjs
 * Abre: http://127.0.0.1:5500/live-preview/index.html
 * (raíz del servidor = la carpeta del repo; las rutas /styles.css siguen funcionando)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INCLUDES = path.join(ROOT, '_includes');
const WRITEUPS_DIR = path.join(ROOT, '_writeups');
const OUT = path.join(ROOT, 'live-preview');

const LEGAL_VARIANT =
  /\{%\s*if\s+include\.variant\s*==\s*'static'\s*%\}\s*static\{%\s*endif\s*%\}/g;

function stripJekyllFrontMatter(s) {
  // Front matter vacío: ---\n---\n (común en este repo)
  let t = s.replace(/^---\r?\n---\r?\n/, '');
  if (t !== s) return t;
  return s.replace(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/, '');
}

function readInclude(name) {
  return fs.readFileSync(path.join(INCLUDES, name), 'utf8');
}

function expandIncludes(html) {
  let prev;
  do {
    prev = html;

    html = html.replace(
      /\{%\s*include\s+bxf-legal-footer\.html\s+variant="static"\s*%\}/,
      () => {
        let inner = readInclude('bxf-legal-footer.html');
        inner = inner.replace(LEGAL_VARIANT, ' static');
        return expandIncludes(inner);
      },
    );

    html = html.replace(/\{%\s*include\s+bxf-legal-footer\.html\s*%\}/, () => {
      let inner = readInclude('bxf-legal-footer.html');
      inner = inner.replace(LEGAL_VARIANT, '');
      return expandIncludes(inner);
    });

    html = html.replace(/\{%\s*include\s+([a-zA-Z0-9_.-]+\.html)\s*%\}/, (_, name) =>
      expandIncludes(readInclude(name)),
    );
  } while (html !== prev);

  if (/\{%\s*include/.test(html)) {
    throw new Error('Quedan includes sin expandir. Revisa el HTML fuente.');
  }
  return html;
}

function parseMdFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.startsWith('---')) {
    return { data: {}, body: raw };
  }
  const end = raw.indexOf('\n---\n', 3);
  if (end === -1) {
    return { data: {}, body: raw };
  }
  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 5);
  const data = {};
  for (const line of fm.split(/\r?\n/)) {
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
  return { data, body };
}

function stripForSearch(s) {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`\[\]()|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildWriteupsListHtml() {
  if (!fs.existsSync(WRITEUPS_DIR)) {
    return '';
  }
  const files = fs.readdirSync(WRITEUPS_DIR).filter((f) => f.endsWith('.md'));
  const items = [];
  for (const file of files) {
    const { data, body } = parseMdFile(path.join(WRITEUPS_DIR, file));
    const slug = file.replace(/\.md$/i, '');
    const title = data.title || slug;
    const dificultad = data.dificultad || '';
    const plataforma = data.plataforma || '';
    const lang = data.lang || 'es';
    const searchContent = stripForSearch(
      [title, dificultad, plataforma, body].filter(Boolean).join(' '),
    );
    const url = `/writeups/${slug}/`;
    const diffHtml = dificultad
      ? `<span class="badge diff-${String(dificultad).toLowerCase()}">${dificultad}</span>`
      : '';
    const platHtml = plataforma
      ? `<span class="badge plat-${String(plataforma)
          .toLowerCase()
          .replace(/\s+/g, '-')}">${plataforma}</span>`
      : '';
    items.push(`      <li class="writeup-item" data-search="${escapeAttr(
      searchContent,
    )}" data-postlang="${escapeAttr(lang)}">
        <a href="${url}" class="writeup-link">
          <div class="writeup-title">${escapeHtml(title)}</div>
          <div class="writeup-meta">
            ${dificultad ? diffHtml : ''}
            ${plataforma ? platHtml : ''}
          </div>
        </a>
      </li>`);
  }
  return items.join('\n');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/\n/g, ' ');
}

function processWriteupsHtml(content) {
  const list = buildWriteupsListHtml();
  return content.replace(
    /\{%\s*for\s+post\s+in\s+site\.writeups\s*%\}[\s\S]*?\{%\s*endfor\s*%\}/,
    list,
  );
}

/** HTML en raíz del repo que tienen includes Jekyll o loops */
const PAGES = [
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

/** Con Live Server en la raíz del repo, /foo.html apunta al HTML sin expandir; las páginas generadas están en /live-preview/foo.html */
const SITE_HTML_PAGES = [
  'index',
  'writeups',
  'ctf',
  'learn',
  'aboutus',
  'privacy',
  'leaderboard',
  'season0',
  'season1',
  'terminal',
];

function rewriteLinksForLivePreview(html) {
  let out = html;
  for (const p of SITE_HTML_PAGES) {
    const re = new RegExp(`href="/${p}\\.html"`, 'g');
    out = out.replace(re, `href="/live-preview/${p}.html"`);
  }
  return out;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });

  for (const name of PAGES) {
    const src = path.join(ROOT, name);
    if (!fs.existsSync(src)) continue;
    let html = fs.readFileSync(src, 'utf8');
    html = stripJekyllFrontMatter(html);
    if (name === 'writeups.html') {
      html = processWriteupsHtml(html);
    }
    html = expandIncludes(html);
    html = rewriteLinksForLivePreview(html);
    fs.writeFileSync(path.join(OUT, name), html, 'utf8');
    console.log('ok', name);
  }

  const terminal = path.join(ROOT, 'terminal.html');
  if (fs.existsSync(terminal)) {
    let t = fs.readFileSync(terminal, 'utf8');
    t = stripJekyllFrontMatter(t);
    t = rewriteLinksForLivePreview(t);
    fs.writeFileSync(path.join(OUT, 'terminal.html'), t, 'utf8');
    console.log('ok terminal.html (sin includes)');
  }

  console.log('');
  console.log('Listo. Abre en el navegador:');
  console.log('  http://127.0.0.1:5500/live-preview/index.html');
  console.log('');
  console.log(
    'Los writeups individuales (/writeups/...) siguen siendo de Jekyll; usa esta vista para páginas principales.',
  );
}

main();
