/*
 * @Author: wenguoliang
 * @Date: 2026-03-29 16:19:32
 * @FilePath: /huiman-ark/tailwind.config.js
 * @Description: Do not edit
 */
/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
    },
    extend: {},
  },
  plugins: [],
};
