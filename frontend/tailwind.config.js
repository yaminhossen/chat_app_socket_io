/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          dark: '#2f3136',
          darker: '#202225',
          light: '#36393f',
          gray: '#40444b',
          blue: '#5865f2',
          green: '#43b581',
          text: {
            primary: '#ffffff',
            secondary: '#b9bbbe',
            muted: '#72767d',
            light: '#dcddde'
          }
        }
      }
    },
  },
  plugins: [],
}