(function(root,factory){if(typeof module==='object')module.exports=factory();else root.CatalogCore=factory();})(typeof window!=='undefined'?window:globalThis,function(){
 const columns=['kode_barang','nama_barang','merek','kategori','part_number','part_number_alternatif','spesifikasi','kecocokan_kendaraan','verifikasi','catatan_publik','catatan_internal','kode_barang_terkait','nama_file_foto'];
 const mapping={nama_barang:'name',merek:'brand',kategori:'category',part_number:'part_number',part_number_alternatif:'alternate_numbers',spesifikasi:'spec',kecocokan_kendaraan:'fitment',catatan_publik:'public_note'};
 const normalize=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const codeKey=v=>String(v??'').trim().toUpperCase();
 function parseCSV(input){
   const text=input.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0];const sep=first.split(';').length>first.split(',').length?';':',';
   const rows=[];let row=[],cell='',quoted=false,closed=false;
   for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=ch;}
   else if(ch==='"'){if(cell||closed)throw Error('Tanda kutip CSV tidak valid.');quoted=true;}
   else if(ch===sep){row.push(cell);cell='';closed=false;}
   else if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';closed=false;}
   else{if(closed&&!/\s/.test(ch))throw Error('Karakter setelah penutup kutip CSV.');if(!closed)cell+=ch;}}
   if(quoted)throw Error('Kutip CSV belum ditutup.');if(cell||row.length){row.push(cell);if(row.some(v=>v.trim()))rows.push(row);}return rows;
 }
 function rowsToObjects(matrix){if(matrix.length<2)throw Error('File belum berisi data barang.');const headers=matrix[0].map(v=>String(v??'').trim().toLowerCase());if(new Set(headers).size!==headers.length)throw Error('Nama kolom duplikat.');if(!headers.includes('kode_barang'))throw Error('Kolom kode_barang wajib ada.');const unknown=headers.filter(v=>!columns.includes(v));if(unknown.length)throw Error('Kolom tidak dikenal: '+unknown.join(', '));if(matrix.length>501)throw Error('Maksimal 500 baris per impor. Pecah file menjadi beberapa bagian.');return matrix.slice(1).map((cells,i)=>{if(cells.length>headers.length&&cells.slice(headers.length).some(v=>String(v??'').trim()))throw Error('Kolom berlebih pada baris '+(i+2));return {line:i+2,...Object.fromEntries(headers.map((h,j)=>[h,String(cells[j]??'').trim()]))};}).filter(r=>columns.some(key=>r[key]));}
 function planImport(rows,parts,mode,photoNames=[]){const existing=new Map(parts.map(p=>[codeKey(p.code),p])),counts=new Map();for(const r of rows){const key=codeKey(r.kode_barang);counts.set(key,(counts.get(key)||0)+1);}const names=new Set(photoNames);return rows.map(r=>{
   const errors=[],warnings=[],code=String(r.kode_barang||'').trim(),old=existing.get(codeKey(code));
   if(!code||code.length>60)errors.push('Kode wajib, maksimal 60 karakter.');if(counts.get(codeKey(code))>1)errors.push('Kode berulang dalam file.');if(old&&mode==='add')errors.push('Kode sudah ada; mode tambah saja.');
   const data={...(old?.data||{})};for(const [from,to] of Object.entries(mapping))if(r[from])data[to]=r[from];
   if(!data.name||data.name.length>150)errors.push('Nama wajib, maksimal 150 karakter.');
   if(r.verifikasi&&!['verified','unverified'].includes(r.verifikasi))errors.push('Verifikasi harus verified atau unverified.');data.verification=r.verifikasi||data.verification||'unverified';
   for(const [key,val] of Object.entries(data))if(typeof val!=='string'||val.length>10000)errors.push('Isi '+key+' terlalu panjang/tidak valid.');
   if((data.brand||'').length>80||(data.category||'').length>80||(data.part_number||'').length>100)errors.push('Merek/kategori maksimal 80; part number maksimal 100 karakter.');
   if((r.catatan_internal||'').length>10000)errors.push('Catatan internal maksimal 10000 karakter.');
   for(const key of ['brand','category']){const known=parts.map(p=>p.data[key]).find(v=>v&&v.toLowerCase()===(data[key]||'').toLowerCase());if(known)data[key]=known;}
   const photoFiles=(r.nama_file_foto||'').split('|').map(s=>s.trim()).filter(Boolean);
   if(new Set(photoFiles).size!==photoFiles.length)errors.push('Nama foto berulang dalam baris.');
   for(const name of photoFiles){if(!names.has(name))errors.push('Foto tidak ditemukan: '+name);if(!/\.(jpe?g|png|webp)$/i.test(name))errors.push('Format foto tidak diizinkan: '+name);}
   if((old?.images?.length||0)+photoFiles.length>12)errors.push('Total foto maksimal 12.');
   if(!old&&!photoFiles.length)warnings.push('Tanpa foto; tetap draf sampai dilengkapi.');
   if(old)warnings.push('Pembaruan menjadi draf untuk ditinjau; halaman publik sementara disembunyikan.');
   const related=(r.kode_barang_terkait||'').split('|').map(s=>s.trim()).filter(Boolean);
   if(related.length){const ids=[];for(const k of related){const target=existing.get(codeKey(k));if(!target||codeKey(k)===codeKey(code))errors.push('Barang terkait harus sudah ada dan berbeda: '+k);else ids.push(target.id);}data.related_ids=ids.join('|');}
   return {line:r.line,code:old?.code||code,old,data,note:r.catatan_internal||old?.note||'',photoFiles,errors,warnings};
 });}
 function validatePart(p){const errors=[];if(!String(p.code||'').trim()||p.code.length>60)errors.push('Kode internal wajib, maksimal 60 karakter.');if(!p.data?.name?.trim()||p.data.name.length>150)errors.push('Nama wajib, maksimal 150 karakter.');if((p.images||[]).length>12)errors.push('Maksimal 12 foto.');if(p.status==='published'&&!p.images.length)errors.push('Minimal satu foto untuk diterbitkan.');return errors;}
 function inspectZip(buffer,maxTotal=180*1024*1024,maxEntries=2000){const bytes=new Uint8Array(buffer),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50){end=i;break;}if(end<0)throw Error('ZIP tidak valid.');const count=v.getUint16(end+10,true),start=v.getUint32(end+16,true);if(count===65535||count>maxEntries||v.getUint16(end+4,true)!==0)throw Error('ZIP64/multi-volume/terlalu banyak file tidak didukung.');let pos=start,total=0;const entries=[];for(let n=0;n<count;n++){if(pos+46>bytes.length||v.getUint32(pos,true)!==0x02014b50)throw Error('Direktori ZIP rusak.');const size=v.getUint32(pos+24,true),len=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true);if(v.getUint16(pos+8,true)&1)throw Error('ZIP berpassword tidak didukung.');const name=new TextDecoder().decode(bytes.slice(pos+46,pos+46+len));if(size===0xffffffff||name.startsWith('/')||name.includes('\\')||name.split('/').includes('..')||/^[A-Za-z]:/.test(name))throw Error('Path ZIP tidak aman.');total+=size;if(total>maxTotal)throw Error('Isi ZIP melebihi batas ukuran setelah ekstraksi.');entries.push({name,size});pos+=46+len+extra+comment;}return entries;}
 function reportCSV(rows){const safe=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return '\uFEFF'+[['baris','kode_barang','hasil','keterangan'],...rows.map(r=>[r.line,r.code,r.result,r.message])].map(r=>r.map(safe).join(',')).join('\r\n');}
 return {columns,mapping,normalize,codeKey,parseCSV,rowsToObjects,planImport,validatePart,inspectZip,reportCSV};
});
