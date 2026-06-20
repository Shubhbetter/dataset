#!/bin/bash

# Cold Call CRM - Setup Script
# This script helps set up the project locally

set -e

echo "🚀 Cold Call CRM - Setup Script"
echo "================================"
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node --version)"
echo ""

# Check npm
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm."
    exit 1
fi
echo "✅ npm $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Create .env.local
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local..."
    cp .env.local.example .env.local
    echo "✅ .env.local created"
    echo ""
    echo "⚠️  Please update .env.local with your Supabase credentials:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
else
    echo "✅ .env.local already exists"
fi
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your Supabase credentials"
echo "2. Initialize database (copy SQL from supabase/migrations/001_init.sql to Supabase SQL Editor)"
echo "3. Run: npm run dev"
echo "4. Open: http://localhost:3000"
echo ""
echo "For more info, see DEPLOYMENT.md"
