# Pristupio

Pristupio is a SaaS tool for continuous web accessibility monitoring.
It provides automated WCAG checks, weekly monitoring, and clear issue severity reporting.

## Tech stack
- Vue 3 + Vite
- Pinia
- Bootstrap 5
- Netlify (hosting + serverless functions)
- Supabase (Auth + DB)
- axe-core (accessibility audits)

## Project structure
app/ - frontend application
app/netlify/ - Netlify Functions (backend)
app/docs/ - product and technical documentation

## MVP scope
- One-time accessibility audit via axe-core
- Issue severity: LOW / MEDIUM / HIGH
- Project dashboard
- Weekly automated monitoring
- Email alerts
- PDF export
- Subscription-based access

## Not a full WCAG audit
Pristupio performs automated accessibility checks and does not replace a full manual WCAG audit.

## Development
```bash
cd app
npm install
npm run dev
```
