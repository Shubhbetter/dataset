# Quick Start Guide

Get your Cold Call CRM up and running in 15 minutes!

## Prerequisites ✅
- Node.js 18+ installed
- Supabase account (free)
- GitHub account (for Vercel deployment)

## 🚀 Development (Local)

### 1. Install & Setup (3 minutes)
```bash
npm install
cp .env.local.example .env.local
```

### 2. Supabase Credentials (5 minutes)
1. Go to [supabase.com](https://supabase.com)
2. Create project
3. Get URL & keys from Settings → API
4. Update `.env.local`

### 3. Database Schema (3 minutes)
1. Go to Supabase SQL Editor
2. Paste `supabase/migrations/001_init.sql`
3. Run query

### 4. Start Server (1 minute)
```bash
npm run dev
```

Visit `http://localhost:3000`

## 🌐 Production (Vercel)

### 1. Push to GitHub (2 minutes)
```bash
git add .
git commit -m "Initial commit"
git push
```

### 2. Deploy to Vercel (2 minutes)
1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repo
3. Add same 4 environment variables
4. Deploy!

**Done!** Your app is live 🎉

## 📁 File Overview

| File | Purpose |
|------|---------|
| `src/pages/index.tsx` | Main CRM interface |
| `src/pages/api/*` | Backend endpoints |
| `src/lib/supabase.ts` | Database connection |
| `supabase/migrations/001_init.sql` | Database schema |
| `.env.local` | Your API keys (never commit!) |

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` |
| "Database error" | Check Supabase URL/key in `.env.local` |
| "Build fails" | Run `npm run build` locally to see errors |

## 💡 First Steps After Deployment

1. Sign up at your deployed URL
2. Add agents
3. Import leads from Excel
4. Assign to agents
5. Start tracking calls!

## 📚 Learn More

- **Setup**: See `IMPLEMENTATION.md`
- **Deploy**: See `DEPLOYMENT.md`
- **Full Docs**: See `README.md`

---

Questions? Check the docs or GitHub issues.

**Happy selling! 📞**
