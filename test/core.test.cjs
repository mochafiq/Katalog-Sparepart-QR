const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../public/core.js');
test('CSV: angka nol, kutip, pemisah, dan multiline tetap utuh',()=>{
 const rows=C.parseCSV('\uFEFFkode_barang,nama_barang,part_number\r\n001,"Filter, kabin",000123\r\n002,"Baris 1\nBaris ""2""",123');
 const objects=C.rowsToObjects(rows);assert.equal(objects[0].kode_barang,'001');assert.equal(objects[0].part_number,'000123');assert.equal(objects[1].nama_barang,'Baris 1\nBaris "2"');
 assert.equal(C.parseCSV('kode_barang;nama_barang\r\n01;Filter')[1][0],'01');assert.throws(()=>C.parseCSV('a,b\n"kutip,b'));
 assert.equal(C.rowsToObjects(C.parseCSV('kode_barang,nama_barang\n\n01,Filter'))[0].line,3);
});
test('Validasi impor: duplikat, kode lama, data kosong, foto, dan hubungan',()=>{
 const old={id:'a',code:'AC-01',data:{name:'Filter',brand:'ABC',verification:'verified'},images:[{path:'a'}],note:'Catatan lama'};
 let rows=C.planImport([{line:2,kode_barang:'ac-01',nama_barang:'',merek:''}],[old],'update');assert.equal(rows[0].data.brand,'ABC');assert.equal(rows[0].note,'Catatan lama');assert.equal(rows[0].code,'AC-01');assert.equal(rows[0].errors.length,0);
 assert.ok(C.planImport([{kode_barang:'ac-01'}],[old],'add')[0].errors.length);
 const dup=C.planImport([{kode_barang:' A ',nama_barang:'X'},{kode_barang:'a',nama_barang:'Y'}],[],'add');assert.ok(dup.every(r=>r.errors.length));
 assert.ok(C.planImport([{kode_barang:'X',nama_barang:'X',nama_file_foto:'missing.jpg'}],[],'add')[0].errors.some(s=>s.includes('tidak ditemukan')));
 assert.ok(C.planImport([{kode_barang:'X',nama_barang:'X',kode_barang_terkait:'AC-01'}],[old],'add')[0].data.related_ids==='a');
 assert.equal(C.normalize('AB-12 34'),'ab1234');assert.throws(()=>C.rowsToObjects([['kode_barang','rahasia'],['A','X']]));
});
test('Publikasi wajib foto dan laporan CSV tidak mengeksekusi formula',()=>{
 assert.ok(C.validatePart({code:'A',data:{name:'X'},images:[],status:'published'}).length);
 assert.match(C.reportCSV([{line:2,code:'=1+1',result:'OK',message:''}]),/"'=1\+1"/);
});
test('Config tidak pernah mengirim service-role atau secret key',()=>{
 const handler=require('../api/config.js');const oldURL=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_ANON_KEY;
 try {process.env.SUPABASE_URL='https://example.supabase.co';let status,payload;const res={setHeader(){},status(n){status=n;return this;},json(v){payload=v;}};
 process.env.SUPABASE_ANON_KEY='sb_secret_danger';handler({},res);assert.equal(status,503);assert.equal(payload.key,undefined);
 process.env.SUPABASE_ANON_KEY='e30.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.signature';handler({},res);assert.equal(status,503);
 process.env.SUPABASE_ANON_KEY='sb_publishable_example';status=200;handler({},res);assert.equal(status,200);assert.equal(payload.key,'sb_publishable_example');
 }finally{if(oldURL===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldURL;if(oldKey===undefined)delete process.env.SUPABASE_ANON_KEY;else process.env.SUPABASE_ANON_KEY=oldKey;}
});
