  module.exports = {
  parser: '@typescript-eslint/parser', // ← important pour comprendre TypeScript
  plugins: ['@typescript-eslint'],     // ← important pour utiliser les règles
  extends: [
    'next/core-web-vitals',             // si tu utilises Next.js
    'plugin:@typescript-eslint/recommended', 
    'plugin:react-hooks/recommended',   // pour les warnings useEffect par exemple
  ],
  rules: {
    // ici tu peux personnaliser tes règles
    "@next/next/no-img-element": "off"
  },
}

  