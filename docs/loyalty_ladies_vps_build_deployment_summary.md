# LoyaltyLadies VPS – Build & Deployment Summary

This document summarises the **successful, critical actions** taken to bring the LoyaltyLadies infrastructure from zero to a stable, production‑ready baseline. It intentionally omits troubleshooting detail and captures only the final outcomes, decisions, and current server state.

---

## 1. Infrastructure Provisioning

- **Cloud Provider:** Hetzner Cloud
- **Server Name:** `Loyalty-VM`
- **Server Type:** CPX32 (x86)
- **Location:** Nuremberg (eu-central)
- **Resources:**
  - 4 vCPU
  - 8 GB RAM
  - 160 GB NVMe SSD
- **Public IPv4:** `78.47.78.234`
- **Operating System:** Ubuntu 22.04 LTS

The VPS was created as a single-node host intended to run a Docker-based application stack for the LoyaltyLadies platform.

---

## 2. User & Access Model

- **Primary login user:** `neil`
- **Access method:** SSH key–based authentication only (no passwords)
- **SSH keys:**
  - Unique SSH key pair generated per client machine
  - Public keys installed in `/home/neil/.ssh/authorized_keys`
  - Multiple machines successfully authorised
- **Root access:**
  - Root login still enabled for now (intentionally, as a temporary safety measure)
  - Day-to-day operations performed as `neil` with `sudo`

Resulting state:
- Secure, key-only access
- Multi-machine access without shared keys
- Clear separation between admin access and application runtime

---

## 3. System Hardening & Base Configuration

The following baseline hardening and system setup steps are complete:

- System packages updated (`apt update && apt upgrade`)
- Timezone set to UTC
- Firewall enabled using **UFW** with rules:
  - Allow: 22 (SSH), 80 (HTTP), 443 (HTTPS)
  - Deny: all other inbound traffic

Resulting state:
- Server reachable only via SSH and web ports
- No unnecessary services exposed

---

## 4. Container Runtime

- **Docker Engine:** Installed (official Docker repository)
- **Docker Compose:** Installed (v2 plugin)
- **Current usage model:**
  - Docker will host the full application stack (API, frontend, database)
  - No containers are yet exposed directly to the internet

Resulting state:
- VPS is ready to run production Docker workloads
- Compose-based deployment is the chosen orchestration model

---

## 5. Web Entry Point & HTTPS

- **Reverse proxy / web server:** Caddy
- **Installation:** System-level Caddy installation (systemd service)
- **TLS:** Automatic HTTPS via Let’s Encrypt

### Current Caddy Configuration (baseline validation)

Caddy is configured to respond to the domain with a simple validation response:

```
loyaltyladies.com, www.loyaltyladies.com {
    respond "LoyaltyLadies VPS is live" 200
}
```

This confirms:
- DNS routing is correct
- Ports 80/443 are reachable
- TLS certificates are issued and valid

---

## 6. Domain & DNS Configuration

- **Domain:** `punchcard.co.za`
- **DNS Provider:** Cloudflare

### Active DNS Records

```
A   punchcard.co.za     → 78.47.78.234
A   www                   → 78.47.78.234
```

- Proxy status: **DNS only** (no Cloudflare proxying yet)
- TTL: Auto

Resulting state:
- `https://punchcard.co.za` resolves to the Hetzner VPS
- HTTPS is live and verified

---

## 7. Application Deployment Direction (Agreed Plan)

- Application code and `docker-compose.yml` live in the **Antigravity project**
- The VPS will deploy directly from this repository
- A deployment pipeline will:
  - Pull the Antigravity project onto the VPS
  - Use the existing `docker-compose.yml` and `.env`
  - Replace hardcoded `localhost` / IP addresses with:
    - Docker service names (inside the Docker network)
    - Relative paths (e.g. `/api`) for browser-facing calls
- Caddy will be extended to:
  - Route `/` to the frontend container
  - Route `/api/*` to the API container

No application containers are live yet; the server is intentionally held at a clean, validated infrastructure baseline.

---

## 8. Current Server State (Summary)

The LoyaltyLadies VPS is now in the following state:

- ✅ Provisioned, sized, and stable
- ✅ Secure SSH access from multiple machines
- ✅ Firewall enabled and restrictive
- ✅ Docker & Docker Compose installed
- ✅ Caddy installed and serving HTTPS
- ✅ Domain (`punchcard.co.za`) correctly mapped
- ✅ Ready for application deployment via Docker Compose

This represents a **production-ready foundation** onto which the LoyaltyLadies application stack can now be deployed in a controlled, repeatable way.

---

*End of summary document.*

