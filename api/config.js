module.exports = (req,res) => {
 res.setHeader('Cache-Control','no-store');
 const url=process.env.SUPABASE_URL||'';
 const key=process.env.SUPABASE_ANON_KEY||'';
 let safe=false;
 try {const u=new URL(url);safe=u.protocol==='https:'&&!!key;
 if(key.startsWith('sb_secret_'))safe=false;
 if(key.split('.').length===3){const payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));if(payload.role!=='anon')safe=false;}
 } catch {safe=false;}
 if(!safe)return res.status(503).json({error:'Konfigurasi belum siap. Atur SUPABASE_URL dan SUPABASE_ANON_KEY (anon/publishable, bukan service_role) di Vercel.'});
 res.json({url,key});
};
