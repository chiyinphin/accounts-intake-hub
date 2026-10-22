const fs=require('fs'), path=require('path');
const SRC=path.join(__dirname,'..','src');
const src=fs.readFileSync(path.join(SRC,'i18n.js'),'utf8'); const I18N=new Function(src+';return I18N')();
const app=fs.readFileSync(path.join(SRC,'app.js'),'utf8');
const en=Object.keys(I18N.en), ms=Object.keys(I18N.ms);
const missingMs=en.filter(k=>!(k in I18N.ms)), extraMs=ms.filter(k=>!(k in I18N.en));
const used=new Set(); let m; const re=/\bt\('([a-zA-Z0-9_.]+)'/g; while((m=re.exec(app))) used.add(m[1]);
const re2=/\['([a-z]+\.[a-zA-Z.]+)'\]/g; while((m=re2.exec(app))) used.add(m[1]);
const re3=/'((?:nav|btn|dash|inbox|entry|ap|co|ex|au|se|f|kv|att|man)\.[a-zA-Z0-9.]+)'/g; while((m=re3.exec(app))) used.add(m[1]);
// keys ending in '.' are dynamic prefixes (e.g. 'st.' + status); covered by the family check below
const missing=[...used].filter(k=>!k.endsWith('.') && !(k in I18N.en));
// dynamic families
const fam={st:['inbox','draft','submitted','approved','returned','rejected','exported','overdue','soon','upcoming','done'],type:['bill','payment','receipt'],ledger:['office','client'],src:['whatsapp','email','scan','upload','other'],role:['clerk','approver'],act:['create','edit','submit','approve','reject','return','reopen','export','settings','reminder'],ce:['IMMUTABLE','LOCKED_SUBMITTED','LOCKED_REJECTED','NOT_OWNER','BAD_STATE','VALIDATION','DUPLICATE','FORBIDDEN','SELF_APPROVAL','BALANCE_OVERRIDE_REQUIRED','REASON_REQUIRED','EXPORTED_LOCKED','NOT_EXPORTABLE','NOTHING_SELECTED','NOT_FOUND'],err:['required','invalid_date','amount_positive','matter_required','matter_unknown','invalid_amount','invalid'],'se.p':['too_long','bad_name','duplicate','bad_source'],'se.roll':['none','next','prev'],'se.delim':['comma','semicolon','tab','pipe'],'ex.dl':['xlsx','csv','fox','json'],man:[1,2,3,4,5,6,7]};
const famMissing=[]; for(const [p,l] of Object.entries(fam)) for(const x of l){ const k=p+'.'+x; if(!(k in I18N.en)||!(k in I18N.ms)) famMissing.push(k); }
console.log('en keys',en.length,'ms keys',ms.length);
console.log('missing in ms:',missingMs.join(', ')||'none');
console.log('extra in ms:',extraMs.join(', ')||'none');
console.log('literal keys used but missing in en:',missing.join(', ')||'none');
console.log('dynamic family gaps:',famMissing.join(', ')||'none');
// placeholders parity
const ph=s=>(s.match(/\{[a-zA-Z]+\}/g)||[]).sort().join();
const phBad=en.filter(k=>k in I18N.ms && ph(I18N.en[k])!==ph(I18N.ms[k]));
console.log('placeholder mismatches:',phBad.join(', ')||'none');

const bad = missingMs.length + extraMs.length + missing.length + famMissing.length + phBad.length;
if (bad) { console.error('\ni18n check FAILED (' + bad + ' issue(s))'); process.exit(1); }
console.log('\ni18n check OK');
