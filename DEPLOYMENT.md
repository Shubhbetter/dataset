# Production Deployment Guide

This guide walks you through deploying the Cold Call CRM to production using Vercel and Supabase.

## 📅 Step-by-Step Deployment

### Phase 1: Prepare Supabase (5 minutes)

#### 1.1 Create Supabase Project
1. Visit [supabase.com](https://supabase.com)
2. Sign in or create account
3. Click "New Project"
4. Fill in:
   - **Project Name**: `cold-call-crm` (or your preference)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait for initialization

#### 1.2 Get API Keys
1. In your Supabase project, go to **Settings → API**
2. Copy and save:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

#### 1.3 Initialize Database Schema
1. Go to **SQL Editor** in Supabase
2. Click "New Query"
3. Copy and paste entire contents of `supabase/migrations/001_init.sql`
4. Click "Run" and verify success

### Phase 2: Prepare GitHub Repository (10 minutes)

#### 2.1 Initialize Git Repository
```bash
cd /path/to/cold-call-crm
git init
git add .
git commit -m "Initial production-ready commit"
```

#### 2.2 Create GitHub Repository
1. Go to [github.com](https://github.com)
2. Click "New Repository"
3. Name it `cold-call-crm`
4. Copy the push URL

#### 2.3 Push Code
```bash
git remote add origin https://github.com/YOUR_USERNAME/cold-call-crm.git
git branch -M main
git push -u origin main
```

### Phase 3: Deploy to Vercel (10 minutes)

#### 3.1 Connect Vercel to GitHub
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Select your `cold-call-crm` repository
5. Click "Import"

#### 3.2 Configure Environment Variables
1. In the "Environment Variables" section, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

2. Click "Deploy"
3. Wait for build to complete (5-10 minutes)

#### 3.3 Verify Deployment
1. Once deployed, click the production URL
2. You should see the login screen
3. Sign up with a test account
4. Verify database is working

### Phase 4: Post-Deployment Configuration (5 minutes)

#### 4.1 Enable Email Confirmations (Optional but Recommended)
1. In Supabase, go to **Authentication → Providers**
2. Enable "Email" if not already
3. Configure email templates in **Authentication → Email Templates**

#### 4.2 Set Up Custom Domain (Optional)
1. In Vercel dashboard, go to **Settings → Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate to be issued

#### 4.3 Configure Supabase CORS (If using custom domain)
1. In Supabase, go to **Project Settings → API**
2. Update "API CORS settings" to include your domain:
   ```
   https://yourdomain.com
   ```

### Phase 5: Monitor and Maintain

#### 5.1 Set Up Monitoring
1. **Vercel**: Enable Analytics in Project Settings
2. **Supabase**: Go to Project Settings → Database to monitor usage

#### 5.2 Regular Backups
1. In Supabase, go to **Settings → Backups**
2. Daily backups are enabled by default
3. Manual backups can be created anytime

#### 5.3 Update Application
To push updates:
```bash
git add .
git commit -m "Description of changes"
git push origin main
```
Vercel will automatically redeploy.

## 🔒 Security Checklist

- [ ] Row Level Security (RLS) enabled in Supabase
- [ ] Environment variables not committed to git
- [ ] `.env.local` added to `.gitignore`
- [ ] CORS properly configured
- [ ] Admin accounts secured
- [ ] Regular backups enabled
- [ ] HTTPS enforced on custom domain
- [ ] Two-factor authentication enabled on Supabase/Vercel accounts

## 📊 Expected Costs (Free Tier)

| Service | Free Tier | Limit |
|---------|-----------|-------|
| Vercel | Included | 100 GB/month bandwidth |
| Supabase DB | Included | 500 MB storage |
| Supabase Auth | Included | Unlimited users |
| Supabase Storage | Included | 1 GB storage |

**Total First Month Cost: $0**

## 🆘 Troubleshooting

### Build Fails on Vercel
- Check build logs: Click "Deployments" → failed build → "View logs"
- Common issues:
  - Missing environment variables
  - Node version mismatch
  - TypeScript errors

### Database Connection Issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` format
- Check network connectivity
- Look at Supabase logs: Settings → Logs

### Authentication Not Working
- Verify Supabase Auth is enabled
- Check email confirmation settings
- Look at Auth Logs in Supabase

### Performance Issues
- Check Vercel Analytics
- Look at Supabase database query performance
- Consider caching with Vercel Edge Cache

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Community Help**: Check GitHub issues

## ✅ Deployment Complete!

Your Cold Call CRM is now live in production. You can:

1. Share the URL with your team
2. Users can sign up at `/signup`
3. Admins can add agents and import leads
4. Start managing cold calls!

---

For questions or issues, refer to the main README.md or create a GitHub issue.
