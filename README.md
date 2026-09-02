# X Effect

A local 7×7 / 49-day habit card. Data stays in the browser — no account.

**Live app:** https://varolbio.github.io/x-effect/

Open that on a phone, then **Share → Add to Home Screen**. After the first visit it keeps working offline. Each device has its own cards. Use **Export cards** / **Import** on the home screen to copy a backup between devices.

Pushing to `main` republishes the site. GitHub Actions builds it; you do not upload a zip.

```bash
npm install
npm run dev
npm test
```

## Later

This MVP is one person, one device, one card stack. Accounts, a public site, comparing cards with other people, and profiles need a server and identity. Leave that for the next pass.
