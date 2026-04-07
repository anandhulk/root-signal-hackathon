module.exports = {
  apps: [
    {
      name: "Cookieyes Microservice - Site Diagnostics API - Dev ",
      script: "npm run dev:compile && npm run start",
      env: {
        DOTENV_CONFIG_PATH: ".env",
      },
      watch: "./src",
      watch_delay: 1000,
      watch_options: {
        followSymlinks: false,
      },
    },
  ],
};
