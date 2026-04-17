/**
 * Extrae los arrays `const challenges = [...]` de season0/season1 y genera js/bxf-ctf-all-challenges.js
 * Ejecutar: node scratch/build-ctf-all.js
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function extractArrayLiteral(html, fileLabel) {
    const needle = 'const challenges = ';
    const startIdx = html.indexOf(needle);
    if (startIdx < 0) throw new Error(fileLabel + ': sin const challenges');
    let i = startIdx + needle.length;
    while (i < html.length && /\s/.test(html[i])) i++;
    if (html[i] !== '[') throw new Error(fileLabel + ': se esperaba [');
    let depth = 0;
    let inS = false,
        inD = false,
        inT = false,
        esc = false;
    const arrStart = i;
    for (; i < html.length; i++) {
        const c = html[i];
        if (esc) {
            esc = false;
            continue;
        }
        if (inT) {
            if (c === '`' && !esc) inT = false;
            continue;
        }
        if (inS) {
            if (c === '\\') esc = true;
            else if (c === "'") inS = false;
            continue;
        }
        if (inD) {
            if (c === '\\') esc = true;
            else if (c === '"') inD = false;
            continue;
        }
        if (c === "'" && !inD) {
            inS = true;
            continue;
        }
        if (c === '"' && !inS) {
            inD = true;
            continue;
        }
        if (c === '`') {
            inT = true;
            continue;
        }
        if (c === '[') depth++;
        else if (c === ']') {
            depth--;
            if (depth === 0) {
                return html.slice(arrStart, i + 1);
            }
        }
    }
    throw new Error(fileLabel + ': array sin cerrar');
}

const s0 = fs.readFileSync(path.join(root, 'season0.html'), 'utf8');
const s1 = fs.readFileSync(path.join(root, 'season1.html'), 'utf8');
const a0 = extractArrayLiteral(s0, 'season0.html');
const a1 = extractArrayLiteral(s1, 'season1.html');

const banner = `/**
 * Todas las misiones CTF (Season 0 + Season 1).
 * Regenerar: node scratch/build-ctf-all.js
 */
`;

const body = `${banner}(function () {
    var season0 = ${a0};
    var season1 = ${a1};
    window.BXF_CTF_ALL_CHALLENGES = season0.concat(season1);
})();
`;

fs.writeFileSync(path.join(root, 'js', 'bxf-ctf-all-challenges.js'), body);
console.log('OK -> js/bxf-ctf-all-challenges.js (', (a0.match(/\bid:\s*"/g) || []).length + (a1.match(/\bid:\s*"/g) || []).length, 'missions )');
