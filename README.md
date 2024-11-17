# OCR with Llama through Together AI with Remix / Cloudflare Pages

## Summary
This is a quick demo of running OCR with Llama through Together AI with Remix / Cloudflare Pages.
![ocr-llama-remix-cloudflare](https://github.com/user-attachments/assets/7047ea5f-22f7-4d26-9e3a-42b3d6f0a0ef)

Heavily inspired by:

- https://llamaocr.com/
- https://github.com/Nutlope/llama-ocr/blob/main/src/index.ts

A few changes that I made:

- I wanted to run the `ocr()` function on the server side on Cloudflare Pages; had trouble implementing that, so I modified the code to take in an arrayBuffer of the image instead.

Other additions:

- Remix / Cloudflare Pages implementation with preview of the uploaded image
- Some error handling...
- Implementation of simple rate limiting with KV Cache, based on the IP address (probably not always accurate).

## How to use

1. Clone this repo
2. `npm install`
3. `npm run dev`

To deploy to Cloudflare Pages, run `npm run deploy`. You probably will have to configure a few things in your dashboard.
You definitely need to set the `TOGETHER_API_KEY` and `RATE_LIMITS` KV Cache in your dashboard via "Settings".

## Demo Site
You can checkout a demo site I put up: https://ocr-llama-remix.pages.dev/

Example output:
![CleanShot 2024-11-17 at 20 07 32@2x](https://github.com/user-attachments/assets/f72caedd-691e-480e-8a80-a8dd2130da2a)
