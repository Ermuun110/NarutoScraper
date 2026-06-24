# For my friend in Japan 🙏 (no coding — just clicking on a website)

I need a small free server that lives in Japan. You don't have to install or
code anything. You'll click through a website, then send me **two things** at the
end. Takes ~15 minutes. Thank you!

## What I need from you at the end
1. An **IP address** (looks like `140.83.xx.xx`).
2. A small **key file** (downloads as something like `ssh-key.key`).

Send me both (the IP as text, the key file as an attachment). Then you're done —
I do everything else.

---

## Step 1 — Make a free Oracle account

1. **Turn OFF any VPN** on your computer first (Oracle rejects VPNs at signup).
2. Go to: **https://www.oracle.com/cloud/free/**
3. Click **Start for free**.
4. Sign up with your email.
5. For **Country**, choose **Japan**.
6. IMPORTANT — when it asks for **Home Region**, pick **Japan East (Tokyo)** or
   **Japan Central (Osaka)**. ⚠️ This **cannot be changed later**, so don't skip it.
7. It will ask for a phone number and a credit card (for identity only —
   **the free server does not charge you**). Use your real Japanese phone + card.
8. Finish and log in to the **Oracle Cloud Console** (the dashboard).

## Step 2 — Create the free server

1. In the dashboard, click the **hamburger menu (☰)** top-left →
   **Compute** → **Instances**.
2. Click **Create instance**.
3. **Name:** type anything, e.g. `naruto`.
4. **Image and shape** — click **Edit**:
   - **Image:** choose **Canonical Ubuntu** (any recent version).
   - **Shape:** click **Change shape** → pick **Ampere** → **VM.Standard.A1.Flex**
     → set it to **1 OCPU, 6 GB** (these say **"Always Free-eligible"**). Select it.
5. **Networking:** leave defaults (it makes a network for you). Make sure
   **"Assign a public IPv4 address"** is **Yes**.
6. **Add SSH keys** section:
   - Choose **Generate a key pair for me**.
   - Click **Save private key** → this downloads the **key file**. KEEP IT.
     (You can ignore "Save public key".)
7. Click **Create**. Wait ~1 minute until the instance says **RUNNING** (green).

## Step 3 — Get the IP and send me everything

1. On the instance page, find **Public IP address** — copy it.
2. Send me:
   - that **Public IP address**, and
   - the **private key file** you downloaded in Step 2.

That's everything. I'll connect and set up the rest myself.

---

### If something blocks you
- **"Out of capacity" / "out of host capacity"** when creating the instance →
  Oracle's free Tokyo servers are sometimes full. Just **try again later** (or
  try the Osaka region). It eventually works.
- **Signup won't accept your location** → make sure **VPN is OFF** and you're on
  normal home internet.
