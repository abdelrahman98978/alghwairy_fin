@echo off
echo [Sovereign Sync] Preparing to upload files to GitHub...
git add .
git commit -m "Update: Stabilize Supabase sync and resolve merge conflicts"
echo [Sovereign Sync] Pushing to main branch...
git push origin main
echo [Sovereign Sync] Done!
pause
