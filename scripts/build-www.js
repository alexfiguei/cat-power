// Copia os ficheiros da app web para www/ (usado pela versão Android)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of ['index.html', 'manifest.webmanifest', 'manifest-mary.webmanifest', 'sw.js', 'img', 'icons']) {
  fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
}
fs.copyFileSync(path.join(root, 'node_modules/jszip/dist/jszip.min.js'), path.join(out, 'jszip.min.js'));
console.log('www pronto');
