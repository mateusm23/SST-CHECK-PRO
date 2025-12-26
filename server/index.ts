import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, seedDatabase } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./auth";
import { WebhookHandlers } from './webhookHandlers';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }
  console.log('Stripe initialization skipped: use environment variables and configure webhooks in Stripe dashboard.');
}

(async () => {
  // Segurança: Helmet para headers HTTP seguros
  app.use(helmet({
    contentSecurityPolicy: false, // Desabilitado para não conflitar com Vite/React
  }));

  // CORS configurado adequadamente
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        process.env.FRONTEND_URL || 'https://www.sstcheckpro.com.br',
        'https://www.sstcheckpro.com.br',
        'https://sstcheckpro.com.br',
        'https://sst-check-pro-production.up.railway.app'
      ]
    : ['http://localhost:5000', 'http://localhost:5173'];

  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));

  // Rate limiting global (100 requisições por 15 minutos)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas requisições deste IP, tente novamente em 15 minutos',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Rate limiting para autenticação
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // Aumentado para fase de testes
    message: 'Muitas tentativas de login, tente novamente em 15 minutos',
  });
  app.use('/api/auth', authLimiter);

  // Rate limiting para Stripe checkout
  const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Muitas tentativas de checkout, tente novamente em 15 minutos',
  });
  app.use('/api/subscription/checkout', checkoutLimiter);

  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];

      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature' });
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;

        if (!Buffer.isBuffer(req.body)) {
          console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
          return res.status(500).json({ error: 'Webhook processing error' });
        }

        await WebhookHandlers.processWebhook(req.body as Buffer, sig);
        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error('Webhook error:', error.message);
        res.status(400).json({ error: 'Webhook processing error' });
      }
    }
  );

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
      limit: '50mb',
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));

  await setupAuth(app);
  registerAuthRoutes(app);

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  // Health check para Railway
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  await initStripe();

  await seedDatabase();

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
