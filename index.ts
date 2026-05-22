import { serve } from "bun";
import indexHtml from "./index.html";

const server = serve({
  port: parseInt(process.env.PORT || "3000"),
  routes: {
    "/": indexHtml,
  },
  development: process.env.NODE_ENV !== "production" ? {
    hmr: true,
    console: true,
  } : false,
});

console.log(`Server running on http://localhost:${server.port}`);
