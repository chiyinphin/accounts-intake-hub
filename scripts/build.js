// Usage: node scripts/build.js [--prod] [--fragment] [out.html]
//   (default)   test build  -> .build/test-build.html   (keeps window.__aih hook for tests)
//   --prod      release build -> dist/accounts-intake-hub.html (test hook stripped)
//   --fragment  omit doctype and viewport tag, for hosts that wrap the page themselves (claude.ai artifacts).
//               Without it the file is a complete document you can open straight from disk or a phone.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const read = f => fs.readFileSync(path.join(srcDir, f), 'utf8');
const prod = process.argv.includes('--prod'), fragment = process.argv.includes('--fragment');
const explicit = process.argv.slice(2).find(a => a.endsWith('.html'));
const out = explicit
  ? path.resolve(explicit)
  : prod ? path.join(root, 'dist', 'accounts-intake-hub.html') : path.join(root, '.build', 'test-build.html');

let css = read('styles.css');
const dark = read('dark.css');
css = css
  .replace('/*DARK_MEDIA*/', () => '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n' + dark + '  }\n}')
  .replace('/*DARK_ATTR*/', () => ':root[data-theme="dark"] {\n' + dark + '}');

let app = read('app.js');
if (prod) app = app.replace(/^\s*window\.__aih = .*$/m, '');
let core = read('core.js');
core = core.replace(/^if \(typeof module !== 'undefined'.*$/m, '');

for (const [name, src] of [['core', core], ['i18n', read('i18n.js')], ['app', app]]) {
  if (/<\/script/i.test(src)) throw new Error(name + ' contains a closing script tag');
}
const html = read('template.html')
  .replace('/*CSS*/', () => css)
  .replace('/*CORE*/', () => core)
  .replace('/*I18N*/', () => read('i18n.js'))
  .replace('/*APP*/', () => app);
const doc = fragment ? html : '<!doctype html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + html;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, doc);
console.log('wrote', path.relative(process.cwd(), out) || out, (doc.length / 1024).toFixed(1) + ' KB', (prod ? 'prod' : 'test build') + (fragment ? ', fragment' : ', standalone'));
