# MundoSolar Database Setup Commands

After setting up Supabase and updating your .env.local, run these commands:

```bash
# Navigate to project directory
cd C:\Projects\mundosolar

# Generate Prisma client with new schema
npm run db:generate

# Create database tables (first time setup)
npm run db:migrate

# Populate with initial data (admin user, categories, etc.)
npm run db:seed

# Optional: Open database browser
npm run db:studio
```

## Expected Results:

### After `npm run db:generate`:
- ✅ Prisma client generated with all models
- ✅ TypeScript types updated

### After `npm run db:migrate`:
- ✅ All 20+ database tables created
- ✅ Relationships and constraints applied
- ✅ Indexes created for performance

### After `npm run db:seed`:
- ✅ Admin user created (admin@mundosolar.com)
- ✅ Product categories added (Paneles, Inversores, etc.)
- ✅ Mexican fiscal data (Regimen Fiscal, CFDI codes)
- ✅ Sample locations and products
- ✅ System settings configured

## Test Your Setup:

```bash
# Start the development server
npm run dev

# Open browser to http://localhost:3000
# Login with: admin@mundosolar.com / admin123
```

## Troubleshooting:

### Connection Issues:
- Verify your DATABASE_URL has the correct password
- Check your Supabase project is running (green status)
- Ensure you're using the correct project reference

### Migration Errors:
- Reset database: `npm run db:reset`
- Try again: `npm run db:migrate`

### Seed Errors:
- Check if admin user already exists
- Reset and seed again: `npm run db:reset && npm run db:seed`