const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.PAYSTACK_SECRET_KEY || "";

app.use(express.json());
app.use(express.static(__dirname));

const PRODUCTS = {"3 GB":20,"10 GB":45,"20 GB":80,"50 GB":170};

app.post("/api/initialize", async (req,res)=>{
  try {
    if(!SECRET) return res.status(500).json({error:"PAYSTACK_SECRET_KEY has not been added to Render yet."});
    const {email,phone,provider,items}=req.body||{};
    if(!email||!phone||!provider||!Array.isArray(items)||!items.length)
      return res.status(400).json({error:"Please complete all payment details."});
    if(!["mtn","vod","atl"].includes(provider))
      return res.status(400).json({error:"Unsupported Mobile Money network."});
    let total=0;
    for(const item of items){
      if(!item || !PRODUCTS[item.name]) return res.status(400).json({error:"Invalid product."});
      total += PRODUCTS[item.name];
    }
    const reference="MMGH_"+Date.now()+"_"+crypto.randomBytes(5).toString("hex");
    const r=await fetch("https://api.paystack.co/transaction/initialize",{
      method:"POST",
      headers:{"Authorization":"Bearer "+SECRET,"Content-Type":"application/json"},
      body:JSON.stringify({email,amount:String(total*100),currency:"GHS",reference,channels:["mobile_money"],metadata:{order_type:"data_bundle",recipient_phone:phone,provider,items}})
    });
    const d=await r.json();
    if(!r.ok||!d.status) return res.status(400).json({error:d.message||"Payment could not be initialized."});
    res.json({authorization_url:d.data.authorization_url,reference:d.data.reference});
  } catch(e) { console.error(e); res.status(500).json({error:"Payment service error."}); }
});

app.post("/api/paystack/webhook",(req,res)=>{
  const sig=req.headers["x-paystack-signature"];
  if(!sig||!SECRET) return res.sendStatus(401);
  const expected=crypto.createHmac("sha512",SECRET).update(JSON.stringify(req.body)).digest("hex");
  if(sig!==expected) return res.sendStatus(401);
  if(req.body.event==="charge.success") console.log("Verified payment:",req.body.data.reference);
  res.sendStatus(200);
});

app.get("/",(req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.listen(PORT,()=>console.log("MoMoMart GH running on port "+PORT));
