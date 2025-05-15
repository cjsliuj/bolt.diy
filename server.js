import dns from 'node:dns';
import dotenv from "dotenv";
// 确保在所有其他导入和代码之前加载 .env 文件
dotenv.config();
dns.setDefaultResultOrder('ipv4first');

// Comment out or remove setup logs if no longer needed
// console.log("[Server Setup] Attempting to load .env file.");
// console.log("[Server Setup] DEEPSEEK_API_KEY from process.env:", 
//   process.env.DEEPSEEK_API_KEY 
//     ? `********${process.env.DEEPSEEK_API_KEY.slice(-4)} (Loaded)` 
//     : "Not Loaded or Undefined"
// );

import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
    : await import("./build/server/index.js"),
  mode: process.env.NODE_ENV,
  getLoadContext(req, res) {
    // Comment out or remove getLoadContext logs if no longer needed
    // console.log("[Server GetLoadContext] Creating load context.");
    const serverEnv = {
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
      // Add other server-side environment variables here as needed
      // e.g., OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    };
    // console.log("[Server GetLoadContext] DEEPSEEK_API_KEY in getLoadContext:", serverEnv.DEEPSEEK_API_KEY ? `********${serverEnv.DEEPSEEK_API_KEY.slice(-4)} (Set)` : "Not Set");
    return {
      serverEnv: serverEnv, 
    };
  },
});

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Vite fingerprints its assets so we can cache forever.
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("build/client", { maxAge: "1h" }));

app.use(morgan("tiny"));

// handle SSR requests
app.all("*", remixHandler);

const port = process.env.PORT || 5173;
app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
  // console.log("[Server Running] NODE_ENV:", process.env.NODE_ENV);
  // console.log("[Server Running] DEEPSEEK_API_KEY check again:", 
  //   process.env.DEEPSEEK_API_KEY 
  //     ? `********${process.env.DEEPSEEK_API_KEY.slice(-4)} (Still Loaded)` 
  //     : "No Longer Loaded or Undefined (Problem!)"
  // );
});
