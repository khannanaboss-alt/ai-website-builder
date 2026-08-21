AI Website Builder — GitHub Pages Edition

This version is designed for GitHub Pages and does NOT use Netlify Functions.

Setup:
1. Upload these files to the root of your GitHub repository.
2. Enable GitHub Pages from Settings > Pages > Deploy from branch > main > / (root).
3. Open the live site.
4. Paste your Gemini API key once. It is stored only in this browser's localStorage.
5. Enter a website prompt and press Generate.

IMPORTANT:
Because GitHub Pages is a static host, this edition calls the Gemini API directly from the browser. Your API key is therefore used client-side. For safer production use, move the Gemini call to a private server/backend later.
