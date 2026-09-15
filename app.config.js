// Endereço base da web app:
//  - Vercel (aramea.vercel.app) → raiz "/"
//  - GitHub Pages (…github.io/aramea) → "/aramea"
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments ?? {}),
    baseUrl: process.env.VERCEL ? '' : '/aramea',
  },
});
