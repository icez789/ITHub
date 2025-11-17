/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // เปลี่ยนบรรทัดนี้ (จากเดิมคือ 'tailwindcss': {},)
    autoprefixer: {},
  },
};

export default config;