import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve the report.html file directly from public directory
  app.get("/report.html", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public/report.html"));
  });

  // Serve the output.xml file directly from public directory
  app.get("/output.xml", (req, res) => {
    res.setHeader("Content-Type", "application/xml");
    res.sendFile(path.join(process.cwd(), "public/output.xml"));
  });

  // Serve the log.html file directly from public directory
  app.get("/log.html", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public/log.html"));
  });

  // API Healthcheck route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "TMS QA Integrator" });
  });

  // Vite middleware integration for development environment
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve report.html first, then fall back to dynamic frontend routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
