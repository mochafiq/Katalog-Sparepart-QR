const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
for(const name of ['core.js','data.js','app.js','features.js'])new vm.Script(fs.readFileSync(path.join(root,'public',name),'utf8'),{filename:name});
for(const file of ['public/index.html','public/style.css','public/vendor/supabase.js','public/vendor/exceljs.min.js','public/vendor/jszip.min.js','public/vendor/qrcode.js','supabase/01-schema.sql'])if(!fs.existsSync(path.join(root,file)))throw Error('File tidak lengkap: '+file);
JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
console.log('Pemeriksaan source dan kelengkapan: LULUS.');
