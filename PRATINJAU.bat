@echo off
setlocal
cd /d "%~dp0"
echo KATALOG AC - DEMO LOKAL
echo Buka http://localhost:3090 setelah server siap.
echo Demo terpisah dari Supabase. Login demo tidak memerlukan password.
echo Jangan mengunggah data internal ke demo di komputer bersama.
node scripts\preview.cjs --demo
pause
