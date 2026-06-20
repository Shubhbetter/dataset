# Cold Call CRM - Production Ready

A professional, full-stack Cold Call CRM application built with Next.js, React, TypeScript, and Supabase.

## 🚀 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend Hosting** | Vercel |
| **Database** | Supabase PostgreSQL |
| **Authentication** | Supabase Auth |
| **File Storage** | Supabase Storage |
| **Backend API** | Supabase Edge Functions / Next.js API Routes |
| **Domain** | Vercel free subdomain (customizable) |

## ✨ Features

- **Admin Dashboard**: Real-time analytics and lead management
- **Lead Management**: Import, track, and manage leads with status updates
- **Agent Management**: Create and manage sales agents with PIN authentication
- **Call History**: Detailed history of all call interactions
- **Bulk Operations**: Auto-distribute and bulk assign leads
- **Excel Import**: Seamlessly import leads from Excel/CSV files
- **Follow-up Tracking**: Schedule and track follow-ups
- **Status Breakdown**: Visual charts and statistics
- **Role-based Access**: Admin and agent roles with proper permissions

## 📋 Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Supabase account (free tier available)
- Vercel account (free tier available)

## 🔧 Local Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd cold-call-crm
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Project Settings → API
4. Copy your project URL and anon key

### 3. Set Up Environment Variables

```bash
cp .env.local.example .env.local
```

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Initialize Database

1. In Supabase dashboard, go to SQL Editor
2. Create a new query and paste contents of `supabase/migrations/001_init.sql`
3. Run the query to create all tables and policies

Alternatively, using Supabase CLI:
```bash
supabase db push
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Project Structure

```
cold-call-crm/
├── src/
│   ├── lib/
│   │   ├── constants.ts          # Constants and utilities
│   │   ├── services.ts           # Database service functions
│   │   └── supabase.ts           # Supabase client config
│   ├── pages/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login.ts      # Login endpoint
│   │   │   │   └── signup.ts     # Signup endpoint
│   │   │   ├── leads.ts          # Leads CRUD endpoints
│   │   │   ├── agents.ts         # Agents CRUD endpoints
│   │   │   └── call-history.ts   # Call history endpoints
│   │   ├── _app.tsx              # App wrapper with Supabase provider
│   │   └── index.tsx             # Main CRM component
│   ├── styles/
│   │   └── globals.css           # Tailwind CSS
│   └── types/
│       └── database.ts           # TypeScript types for database
├── supabase/
│   └── migrations/
│       └── 001_init.sql          # Database schema
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vercel.json
└── .env.local.example
```

## 🚀 Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
5. Click "Deploy"

### 3. Custom Domain (Optional)

In Vercel dashboard:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## 🔐 Security Features

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ User data isolation at database level
- ✅ Authentication via Supabase Auth
- ✅ API key management with environment variables
- ✅ TypeScript for type safety
- ✅ No sensitive data in frontend

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration

### Leads
- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create lead
- `PUT /api/leads` - Update lead
- `DELETE /api/leads` - Delete lead

### Agents
- `GET /api/agents` - Get all agents
- `POST /api/agents` - Create agent
- `DELETE /api/agents` - Delete agent

### Call History
- `GET /api/call-history?lead_id=xxx` - Get history for lead
- `POST /api/call-history` - Add history entry

## 📊 Database Schema

### agents
- `id` (TEXT) - Primary key
- `name` (TEXT) - Agent name
- `phone` (TEXT) - Phone number
- `pin` (TEXT) - 4-digit PIN
- `user_id` (UUID) - Owner user
- `created_at` (TIMESTAMP)

### leads
- `id` (TEXT) - Primary key
- `name` (TEXT) - Lead name
- `phone` (TEXT) - Phone number
- `company` (TEXT) - Company name
- `status` (TEXT) - Lead status
- `assigned_agent_id` (TEXT) - Assigned agent
- `next_followup` (DATE) - Follow-up date
- `user_id` (UUID) - Owner user
- `created_at`, `last_updated` (TIMESTAMP)

### call_history
- `id` (TEXT) - Primary key
- `lead_id` (TEXT) - Related lead
- `status` (TEXT) - Call status
- `note` (TEXT) - Call notes
- `next_followup` (DATE) - Next follow-up
- `user_id` (UUID) - Owner user
- `created_at` (TIMESTAMP)

## 🐛 Troubleshooting

### Database connection issues
- Check that SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Verify your Supabase project is active
- Check that RLS policies are properly configured

### Authentication not working
- Ensure email confirmation is enabled in Supabase Auth settings
- Check that user exists in Supabase Auth dashboard

### Vercel deployment failures
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify Node.js version compatibility

## 📝 License

This project is open source and available under the MIT License.

## 📞 Support

For issues and feature requests, please create a GitHub issue.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ for sales teams everywhere**