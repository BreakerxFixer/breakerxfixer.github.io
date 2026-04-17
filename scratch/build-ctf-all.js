/**
 * Genera js/bxf-ctf-all-challenges.js para el hub unificado.
 * Compatibilidad:
 * - Si existen season0/season1, extrae desde esos HTML (modo legacy).
 * - Si no existen, reutiliza arrays del bundle actual.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function extractArrayLiteral(content, needle, fileLabel) {
    const startIdx = content.indexOf(needle);
    if (startIdx < 0) throw new Error(fileLabel + ': sin bloque ' + needle);
    let i = startIdx + needle.length;
    while (i < content.length && /\s/.test(content[i])) i++;
    if (content[i] !== '[') throw new Error(fileLabel + ': se esperaba [');
    let depth = 0;
    let inS = false;
    let inD = false;
    let inT = false;
    let esc = false;
    const arrStart = i;
    for (; i < content.length; i++) {
        const c = content[i];
        if (esc) {
            esc = false;
            continue;
        }
        if (inT) {
            if (c === '`') inT = false;
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
        if (c === "'") {
            inS = true;
            continue;
        }
        if (c === '"') {
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
            if (depth === 0) return content.slice(arrStart, i + 1);
        }
    }
    throw new Error(fileLabel + ': array sin cerrar');
}

function readLegacyOrCurrentArrays() {
    const season0Path = path.join(root, 'season0.html');
    const season1Path = path.join(root, 'season1.html');
    if (fs.existsSync(season0Path) && fs.existsSync(season1Path)) {
        const s0 = fs.readFileSync(season0Path, 'utf8');
        const s1 = fs.readFileSync(season1Path, 'utf8');
        return {
            a0: extractArrayLiteral(s0, 'const challenges = ', 'season0.html'),
            a1: extractArrayLiteral(s1, 'const challenges = ', 'season1.html'),
        };
    }

    const currentPath = path.join(root, 'js', 'bxf-ctf-all-challenges.js');
    const current = fs.readFileSync(currentPath, 'utf8');
    return {
        a0: extractArrayLiteral(current, 'var season0 = ', 'js/bxf-ctf-all-challenges.js'),
        a1: extractArrayLiteral(current, 'var season1 = ', 'js/bxf-ctf-all-challenges.js'),
    };
}

const { a0, a1 } = readLegacyOrCurrentArrays();
const banner = `/**
 * Todas las misiones CTF unificadas.
 * Regenerar: node scratch/build-ctf-all.js
 */
`;
const body = `${banner}(function () {
    var season0 = ${a0};
    var season1 = ${a1};
    window.BXF_CTF_ALL_CHALLENGES = season0.concat(season1);
})();
`;

fs.writeFileSync(path.join(root, 'js', 'bxf-ctf-all-challenges.js'), body, 'utf8');
const total = (a0.match(/\bid:\s*"/g) || []).length + (a1.match(/\bid:\s*"/g) || []).length;
console.log('OK -> js/bxf-ctf-all-challenges.js (' + total + ' missions)');
