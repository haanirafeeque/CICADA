import { createHmac } from "node:crypto";

const secret = process.env.REFERRAL_SECRET?.trim();
if (!secret || secret.length < 32) {
  throw new Error("REFERRAL_SECRET must be set to a random string of at least 32 characters.");
}

for (let index = 1; index <= 15; index += 1) {
  const code = createHmac("sha256", secret)
    .update(`winner:${index}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  process.stdout.write(`${index}\tCICADA-${code}\n`);
}
