# MoMoMart GH — Paystack-ready version

This version replaces the fake "Demo checkout" with a server-side payment initialization flow.

## What it does

1. Customer chooses a bundle.
2. The server recalculates the price instead of trusting the browser.
3. The server initializes a GHS transaction with Paystack.
4. The customer is sent to Paystack checkout with Mobile Money enabled.
5. Paystack can send a `charge.success` webhook to `/api/paystack/webhook`.
6. Only after verified payment should your data-bundle fulfilment API be called.

Paystack documents Ghana Mobile Money support for MTN, AirtelTigo and Telecel. See:
https://paystack.com/docs/payments/payment-channels/

## Setup

1. Create a Paystack business account.
2. Use the test keys first.
3. Put the SECRET key in the server environment as `PAYSTACK_SECRET_KEY`.
4. Never put the secret key in `index.html` or send it to anyone.
5. Install Node.js, then run:
   npm install
   npm start
6. Open http://localhost:3000
7. Configure the Paystack webhook URL:
   https://YOUR-DOMAIN/api/paystack/webhook

## Going live

Replace the test secret key with your live secret key in the hosting provider's environment variables.

IMPORTANT: Payment collection alone does not automatically supply the data bundle. The webhook's TODO section must be connected to an approved airtime/data fulfilment service or your own authorized supplier account. Do not deliver a bundle merely because the browser says payment succeeded; verify the transaction and amount on the server.

Do not send your secret key to ChatGPT or put it in the website files.
