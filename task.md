# Task Checklist

## Investigate slow login screen load time
- [x] Check API logs for startup errors
- [ ] Fix the API issue (pnpm install) and verify logindingPage.tsx` and `VendorLookup.tsx` for heavy imports
- [x] Check `api.ts` and `index.css` for heavy imports
- [x] Check `AuthShell.tsx` and `AdminInput.tsx` for heavy UI library dependencies
- [x] Implement lazy loading for routes if necessary
- [x] Check for other potential blockers creating a huge module graph
