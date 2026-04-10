# WHAT TO DO

## Problem
Old code is still running. You need to REPLACE these files on GitHub.

## Files to replace (upload these from the ZIP):
1. index.html        <- Main app (complete rewrite)
2. package.json      <- Node version fix
3. api/ai.js         <- AI fix (reads GROQ_API_KEY correctly)
4. api/_lib/config.js <- Supports all env var name variations

## Steps:
1. Open github.com/muahshi/cricsenseai
2. Click each file above
3. Click pencil icon (Edit)
4. Select ALL text, delete it
5. Paste the new content from the ZIP file
6. Click "Commit changes"
7. Vercel will auto-redeploy in ~30 seconds

## Env vars in Vercel are correct - no change needed there.
## GROQ_API_KEY will now work correctly.
