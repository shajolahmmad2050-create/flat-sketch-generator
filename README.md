# Flat Sketch Generator — React Web App

Based on the provided `flat_sketch_generator(1).tsx` source. Includes garment/view/aspect controls, up to 4 sketches, black-and-white technical flat prompt, iPhone HEIC/HEIF conversion, and selectable PNG/JPEG/WebP downloads.

## Run locally (Windows / Mac)

Install Node.js 20+ then in this folder:

```bash
npm install
```

Copy `.env.example` to `.env`, replace `OPENAI_API_KEY` with your own OpenAI API key, and confirm `OPENAI_IMAGE_MODEL` is supported for your account.

Run **two terminals**:

```bash
npm run dev
```

```bash
npm run build
npm start
```

Open http://localhost:5173 (Vite proxy calls the API server on port 3001). In production run `npm run build && npm start`, then open port 3001.

## Deploy to a host

Use a Node.js hosting service (e.g. Render, Railway or similar) that supports environment variables. Build command: `npm install && npm run build`; start command: `npm start`; environment: `OPENAI_API_KEY`, optional `OPENAI_IMAGE_MODEL`. The host supplies `PORT`. Once deployed, the host provides a public URL.

## Important

- **A public live URL has NOT been deployed**. This ZIP contains deployable source code, not a hosted service.
- Image generation uses the paid/free-tier quota and limits of your own OpenAI API account, and is **not unlimited**.
- Never publish an API key in React source or git. The Express server stores it on the backend.
- If sharing the site with teammates, add sign-in, rate limits and usage controls before making it public; users of your site consume your API quota.
- The model can still misunderstand garment details. Manually verify technical flats against the source photo before use in a tech pack.
- HEIC conversion depends on the browser's ability to decode HEIC via heic2any; certain files may still fail.

## OpenAI API key

Create an API key at https://platform.openai.com/api-keys and set up API billing at https://platform.openai.com/settings/organization/billing/overview if required. ChatGPT Plus does not include API usage. The backend uses the OpenAI Images Edits endpoint with gpt-image-1.5. Never put API keys in browser source.
