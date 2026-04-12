import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import axios from "axios";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
const db = getFirestore(firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Patreon OAuth Configuration
  const PATREON_CLIENT_ID = process.env.PATREON_CLIENT_ID;
  const PATREON_CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET;
  const PATREON_CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID;
  const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const REDIRECT_URI = `${APP_URL}/auth/patreon/callback`;

  // 1. Get Patreon Auth URL
  app.get("/api/auth/patreon/url", (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    if (!PATREON_CLIENT_ID || !PATREON_CLIENT_SECRET || !PATREON_CAMPAIGN_ID) {
      console.error("[Patreon OAuth] Missing environment variables:", { 
        hasClientId: !!PATREON_CLIENT_ID, 
        hasClientSecret: !!PATREON_CLIENT_SECRET, 
        hasCampaignId: !!PATREON_CAMPAIGN_ID 
      });
      return res.status(500).json({ error: "Patreon OAuth is not configured on the server." });
    }

    const params = new URLSearchParams({
      response_type: "code",
      client_id: PATREON_CLIENT_ID!,
      redirect_uri: REDIRECT_URI,
      scope: "identity identity.memberships",
      state: userId as string, // Pass userId as state to link account
    });

    const authUrl = `https://www.patreon.com/oauth2/authorize?${params.toString()}`;
    res.json({ url: authUrl });
  });

  // 2. Patreon Callback Handler
  app.get(["/auth/patreon/callback", "/auth/patreon/callback/"], async (req, res) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'PATREON_AUTH_ERROR', message: 'Missing code or state' }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    try {
      console.log(`[Patreon OAuth] Exchanging code for tokens. Redirect URI: ${REDIRECT_URI}`);
      
      // Exchange code for tokens
      const tokenResponse = await axios.post("https://www.patreon.com/api/oauth2/token", new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        client_id: PATREON_CLIENT_ID!,
        client_secret: PATREON_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
      }).toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      const accessToken = tokenResponse.data.access_token;
      console.log(`[Patreon OAuth] Token exchange successful.`);

      // Get user's memberships
      const identityResponse = await axios.get("https://www.patreon.com/api/oauth2/v2/identity?include=memberships.campaign&fields%5Bmember%5D=full_name,patron_status", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const memberships = identityResponse.data.included || [];
      console.log(`[Patreon OAuth] Found ${memberships.length} included items. Checking for campaign ${PATREON_CAMPAIGN_ID}`);
      
      const isPatron = memberships.some((m: any) => {
        const matchesCampaign = m.relationships?.campaign?.data?.id === PATREON_CAMPAIGN_ID;
        const isActive = m.attributes?.patron_status === "active_patron";
        if (m.type === "member") {
          console.log(`[Patreon OAuth] Member found: ${m.attributes?.full_name}, Status: ${m.attributes?.patron_status}, Campaign: ${m.relationships?.campaign?.data?.id}`);
        }
        return m.type === "member" && matchesCampaign && isActive;
      });

      console.log(`[Patreon OAuth] Subscription status for user ${userId}: ${isPatron ? 'ACTIVE' : 'NONE'}`);

      // Update Firestore
      const userDocRef = db.collection("users").doc(userId as string);
      await userDocRef.set({
        subscriptionStatus: isPatron ? "active" : "none",
        patreonConnected: true,
        lastPatreonCheck: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'PATREON_AUTH_SUCCESS', isPatron: ${isPatron} }, '*');
              window.close();
            </script>
            <p>Authentication successful! This window will close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Patreon OAuth Error:", error.response?.data || error.message);
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'PATREON_AUTH_ERROR', message: 'Failed to exchange code' }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NeoFlix Server running on http://localhost:${PORT}`);
  });
}

startServer();
