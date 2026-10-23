module.exports = {
  apps: [
    {
      name: "alphabot-backend",
      script: "server.ts",
      interpreter: "npx",
      interpreter_args: "tsx"
    },
    {
      name: "alphabot-frontend",
      script: "./node_modules/vite/bin/vite.js",
      args: "--host",
      interpreter: "node"
    }
  ]
};