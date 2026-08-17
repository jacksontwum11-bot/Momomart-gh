const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const PRODUCTS = {
  "3 GB": 20,
  "10 GB": 45,
  "20 GB": 80,
  "50 GB": 170
};

function safeReference() {
  return "MMGH_" + Date.now() + "_" + crypto.randomBytes(5).toString("hex");
}

app.post("/api/initialize", async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({error:"PAYSTACK_SECRET_KEY is not configured on the server."});
    }

    const {email, phone, provider, items} = req.body || {};
    if (!email || !phone || !provider || !Array.isArray(items) || !items.length) {
      return res.status(400).json({error:"Missing order information."});
    }

    // Never trust prices sent by the browser. Recalculate from our server-side product list.
    let totalGhs = 0;
    for (const item of items) {
      if (!PRODUCTS[item.name]) return res.status(400).json({error:"Invalid product."});
      totalGhs += PRODUCTS[item.name];
    }

    if (!["mtn","vod","atl"].includes(provider)) {
      return res.status(400).json({error:"Unsupported Ghana MoMo provider."});
    }

    const reference = safeReference();
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: String(totalGhs * 100),
        currency: "GHS",
        reference,
        channels: ["mobile_money"],
        metadata: {
          order_type: "data_bundle",
          recipient_phone: phone,
          provider,
          items
        }
      })
    });

    const data = await response.json();
    if (!response.ok || !data.status) {
      return res.status(400).json({error:data.message || "Paystack rejected the transaction."});
    }

    res.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({error:"Payment service error."});
  }
});

// Paystack sends webhook events here. In production, verify the signature before trusting the event.
app.post("/api/paystack/webhook", (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  if (!signature || !PAYSTACK_SECRET_KEY) return res.sendStatus(401);

  const expected = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (signature !== expected) return res.sendStatus(401);

  if (req.body.event === "charge.success") {
    // TODO: Mark the order paid in your database and trigger your approved
    // data-bundle fulfilment API here. Never fulfil before verified payment.
    console.log("PAID:", req.body.data.reference, req.body.data.amount);
  }

  res.sendStatus(200);
});

app.get("*", (req,res) => res.sendFile(path.join(__dirname,"index.html")));

app.listen(PORT, () => console.log(`MoMoMart server running on port ${PORT}`));
