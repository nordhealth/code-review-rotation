# Release TODO

## Cloudflare Deployment

- [ ] Run `npx nuxthub deploy` to link project and trigger first deploy
- [ ] Set production environment variables on Cloudflare (Workers > Settings > Variables):
  - [ ] `NUXT_SESSION_PASSWORD` — generate a new 32+ char secret
  - [ ] `NUXT_API_KEY` — for cron and public API authentication
  - [ ] `NUXT_RESEND_API_KEY`
  - [ ] `NUXT_EMAIL_FROM` — e.g. `Nord Review <nordreview@nordhealth.com>`
- [ ] (Optional) Configure custom domain `nordreview.nordhealth.com` in NuxtHub or Cloudflare dashboard

## Resend Email

- [ ] Add and verify `nordhealth.com` domain in Resend dashboard (add DNS records: MX, SPF, DKIM)
  - Until verified, emails only work from `onboarding@resend.dev`
- [ ] Confirm `NUXT_RESEND_API_KEY` and `NUXT_EMAIL_FROM` are set on Cloudflare (see above)

## Post-Deploy

- [ ] Change default admin password (`admin123!`) immediately after first deploy, or remove the seed plugin (`server/plugins/seed.ts`) before deploying
