const Core = require('../src/core.js');
const T = process.argv[2] || '2026-10-22';
const res = Core.runSelfTests(T);
let fail = 0;
res.forEach(r => {
  if (!r.pass) fail++;
  console.log((r.pass ? 'PASS ' : 'FAIL ') + '[' + r.group + '] ' + r.name + (r.detail ? '\n      -> ' + r.detail : ''));
});
console.log('\n' + (res.length - fail) + '/' + res.length + ' passed (today=' + T + ')');
process.exit(fail ? 1 : 0);
