/* Adapter produksi menggunakan Supabase. Mode demo hanya disediakan server pratinjau lokal. */
(function(){
const unwrap=r=>{if(r.error)throw Error(r.error.message);return r.data;};
async function all(query){let rows=[];for(let start=0;;start+=500){const batch=unwrap(await query().range(start,start+499));rows.push(...batch);if(batch.length<500)return rows;if(rows.length>50000)throw Error('Data terlalu besar untuk browser. Hubungi pengelola.');}}
window.makeCatalogAPI=function(client){return {
 demo:false,client,
 async session(){const s=unwrap(await client.auth.getSession());if(!s.session)return null;const user=unwrap(await client.auth.getUser()).user;const a=unwrap(await client.from('catalog_admins').select('*').eq('user_id',user.id).maybeSingle());return a?.active?{...a,user}:null;},
 async login(email,password){unwrap(await client.auth.signInWithPassword({email,password}));},
 async logout(){unwrap(await client.auth.signOut());},
 async recover(email){unwrap(await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/reset-password'}));},
 async password(password){unwrap(await client.auth.updateUser({password}));},
 async parts(){return all(()=>client.from('catalog_parts').select('*').order('code'));},
 async part(id){return unwrap(await client.from('catalog_parts').select('*').eq('id',id).maybeSingle());},
 async notes(){return all(()=>client.from('catalog_notes').select('*').order('part_id'));},
 async settings(){return unwrap(await client.from('catalog_settings').select('*').eq('id',1).single());},
 async save(p,reason='Edit barang'){const r=unwrap(await client.rpc('catalog_save',{p_id:p.id,p_expected:p.version||0,p_code:p.code,p_data:p.data,p_images:p.images,p_status:p.status,p_note:p.note||'',p_reason:reason}));return Array.isArray(r)?r[0]:r;},
 async upload(path,blob){unwrap(await client.storage.from('catalog-photos').upload(path,blob,{contentType:blob.type,upsert:false,cacheControl:'300'}));},
 async download(path){return unwrap(await client.storage.from('catalog-photos').download(path));},
 async versions(id){return all(()=>client.from('catalog_revisions').select('*').eq('part_id',id).order('version',{ascending:false}));},
 async restoreVersion(id,expected){return unwrap(await client.rpc('catalog_restore_revision',{p_revision:id,p_expected:expected}));},
 async admins(){return unwrap(await client.from('catalog_admins').select('*').order('email'));},
 async setAdmin(email,role,active){unwrap(await client.rpc('catalog_set_admin',{p_email:email,p_role:role,p_active:active}));},
 async setSettings(s){unwrap(await client.rpc('catalog_set_settings',{p_shop:s.shop,p_base_url:s.base_url,p_budget:s.storage_budget_mb}));},
 async usage(){return unwrap(await client.rpc('catalog_storage_usage'));},
 async backup(){return unwrap(await client.rpc('catalog_backup'));},
 async restoreBackup(b,signature){unwrap(await client.rpc('catalog_restore_backup',{p_backup:b,p_signature:signature}));}
};};
window.makeDemoAPI=function(){
const key='katalog-ac-demo-v2';let state;
try{state=JSON.parse(localStorage.getItem(key));}catch{}
if(!state){state={parts:[['00000000-0000-4000-8000-000000000001','AC-0001','Kompresor AC','Kompresor'],['00000000-0000-4000-8000-000000000002','AC-0002','Filter kabin','Filter'],['00000000-0000-4000-8000-000000000003','AC-0003','Evaporator','Evaporator']].map(([id,code,name,category])=>({id,code,data:{name,category,brand:'Data contoh',part_number:'',alternate_numbers:'',spec:'Contoh katalog. Lengkapi dengan spesifikasi barang bengkel Anda.',fitment:'Belum diverifikasi.',verification:'unverified',public_note:'Data contoh untuk pratinjau, bukan referensi pemasangan.',related_ids:''},images:[],status:'published',version:1,updated_at:new Date().toISOString(),note:''})),revisions:[],photos:{},settings:{shop:'Katalog AC · Demo',base_url:location.origin,storage_budget_mb:1000},admins:[{user_id:'demo',email:'pemilik@demo.local',role:'owner',active:true}]};}
const persist=()=>localStorage.setItem(key,JSON.stringify(state));const clone=o=>structuredClone(o);const need=()=>{if(!sessionStorage.getItem('catalog-demo-login'))throw Error('Login demo diperlukan.');};
return {demo:true,
async session(){return sessionStorage.getItem('catalog-demo-login')?{...state.admins[0],user:{email:'pemilik@demo.local'}}:null;},async login(){sessionStorage.setItem('catalog-demo-login','1');},async logout(){sessionStorage.removeItem('catalog-demo-login');},async recover(){throw Error('Email pemulihan tersedia setelah terhubung Supabase.');},async password(){throw Error('Penggantian password tersedia setelah terhubung Supabase.');},
async parts(){return clone(state.parts.filter(p=>sessionStorage.getItem('catalog-demo-login')||p.status!=='draft'));},async part(id){return (await this.parts()).find(p=>p.id===id)||null;},async notes(){need();return state.parts.map(p=>({part_id:p.id,note:p.note||''}));},async settings(){return clone(state.settings);},
async save(p,reason='Edit barang'){need();const old=state.parts.find(x=>x.id===p.id);if(old&&old.version!==p.version)throw Error('KONFLIK: Data telah berubah.');if(!old&&state.parts.some(x=>CatalogCore.codeKey(x.code)===CatalogCore.codeKey(p.code)))throw Error('Kode sudah ada.');const errors=CatalogCore.validatePart(p);if(errors.length)throw Error(errors.join(' '));const saved={...clone(p),version:(old?.version||0)+1,updated_at:new Date().toISOString()};if(old)state.parts[state.parts.indexOf(old)]=saved;else state.parts.push(saved);state.revisions.push({id:state.revisions.length+1,part_id:p.id,version:saved.version,snapshot:clone(saved),note:saved.note,actor_email:'pemilik@demo.local',reason,created_at:saved.updated_at});persist();return clone(saved);},
async upload(path,blob){need();const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});state.photos[path]=data;persist();},async download(path){if(!state.photos[path])throw Error('Foto tidak ada.');return (await fetch(state.photos[path])).blob();},async versions(id){need();return clone(state.revisions.filter(r=>r.part_id===id).reverse());},async restoreVersion(id,version){const r=state.revisions.find(r=>r.id===id);return this.save({...r.snapshot,version},'Pulihkan versi '+r.version);},async admins(){need();return clone(state.admins);},async setAdmin(){throw Error('Atur akses pengguna setelah terhubung Supabase.');},async setSettings(s){need();state.settings=clone(s);persist();},async usage(){return Math.round(Object.values(state.photos).join('').length*.75);},async backup(){need();return {format:'KATALOG_AC_2',exported_at:new Date().toISOString(),signature:JSON.stringify(state.parts.map(p=>[p.id,p.version])),parts:clone(state.parts),notes:state.parts.map(p=>({part_id:p.id,note:p.note||''})),revisions:clone(state.revisions),settings:clone(state.settings),admins:clone(state.admins)};},async restoreBackup(b){need();state.parts=clone(b.parts);state.revisions=clone(b.revisions);state.settings=clone(b.settings);persist();}
};};
})();
