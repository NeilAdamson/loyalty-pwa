# Testing Scripts

This document outlines the usage of helper scripts available for testing the Loyalty PWA system. These scripts are located in `apps/api/scripts/`.

## Prerequisites

- The development environment must be running (via `dev.ps1` or `docker compose`).
- Scripts are designed to be run **inside the API container** to ensure database connectivity.

---

## 1. Set Stamp Count (`set-stamps.ts`)

This script allows you to manually set the number of stamps on a member's active card. This is particularly useful for testing the redemption flow by setting a card to `n-1` stamps (one away from full).

### Usage

Run the following command from your host terminal:

```bash
docker compose exec api npx tsx scripts/set-stamps.ts <vendor-slug> <phone-number>
```

**Parameters:**
- `<vendor-slug>`: The URL slug of the vendor (e.g., `demo-cafe`).
- `<phone-number>`: The member's phone number as stored in the database (e.g., `+27821234567` or `0821234567` depending on your setup).

### Behavior

1.  **Finds Vendor**: Looks up the vendor by the provided slug.
2.  **Finds Member**: Looks up the member by phone number within that vendor.
3.  **Finds Active Program**: Identifies the currently active loyalty program for the vendor.
4.  **Finds Active Card**: Locates the member's active card for that program.
    *   *Note: If no active card exists, the script will exit with an error.*
5.  **Updates Stamps**: Sets the card's `stamps_count` to `required_stamps - 1`.
6.  **Output**: Logs the previous and new stamp counts to the console.

### Example

To set stamps for member `+15550001234` at vendor `demo-cafe`:

```powershell
docker compose exec api npx tsx scripts/set-stamps.ts demo-cafe +15550001234
```

**Successful Output:**
```text
Found Vendor: The Demo Cafe
Found Member: Bob Loyalty
Found Active Program: Free Coffee (Req: 10)

✅ SUCCESS: Updated card <card-uuid>
   Previous Stamps: 0
   New Stamps:      9 / 10

Ready for final stamp test!
```
