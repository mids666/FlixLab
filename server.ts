import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // NeoPay Secure Payment API
  app.post("/api/pay", async (req, res) => {
    const { cardNumber, expiry, cvc, amount, userId } = req.body;

    // SECURITY: In a real app, you would NEVER handle raw card data here.
    // You would use a token from your provider (like PayPal or a local bank).
    // For this custom gateway, we simulate a secure handshake.
    
    console.log(`Processing payment of $${amount} for user ${userId}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Basic validation simulation
    if (!cardNumber || cardNumber.length < 16) {
      return res.status(400).json({ success: false, message: "Invalid card details" });
    }

    // Success simulation
    res.json({ 
      success: true, 
      transactionId: `TXN_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      message: "Payment processed successfully via NeoPay Gateway"
    });
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
