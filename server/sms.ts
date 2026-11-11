// server/sms.ts
// Real SMS Delivery Service (Fast2SMS & Twilio Support)

interface SmsResult {
  success: boolean;
  provider: "fast2sms" | "twilio" | "dev_mock" | "none";
  messageId?: string;
  error?: string;
}

/**
 * Sends a 6-digit OTP to a 10-digit mobile number via Fast2SMS or Twilio.
 * In production, requires FAST2SMS_API_KEY or TWILIO credentials.
 * The OTP is NEVER exposed to the frontend website.
 */
export async function sendSmsOtp(phone: string, otp: string): Promise<SmsResult> {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  if (cleanPhone.length !== 10) {
    throw new Error("Invalid 10-digit mobile number");
  }

  const fast2smsKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  // 1. Fast2SMS Provider (Primary for India)
  if (fast2smsKey && fast2smsKey.trim()) {
    try {
      console.log(`[SMS] Sending OTP to +91 ${cleanPhone} via Fast2SMS...`);
      // Try Fast2SMS 'otp' route first
      let res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": fast2smsKey.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: cleanPhone,
        }),
      });

      let data: any = await res.json().catch(() => ({}));

      // If 'otp' route is not active or requires DLT, fallback to Quick SMS 'q' route
      if (!data?.return) {
        console.warn(`[SMS] Fast2SMS otp route failed (${data?.message?.[0] || data?.message}), trying Quick 'q' route...`);
        res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            "authorization": fast2smsKey.trim(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "q",
            message: `Your CouponsHub verification OTP is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`,
            language: "english",
            flash: 0,
            numbers: cleanPhone,
          }),
        });
        data = await res.json().catch(() => ({}));
      }

      if (data?.return) {
        console.log(`[SMS] Fast2SMS delivery initiated for +91 ${cleanPhone}. Request ID: ${data?.request_id}`);
        return {
          success: true,
          provider: "fast2sms",
          messageId: data?.request_id,
        };
      }

      const errMsg = Array.isArray(data?.message) ? data.message.join(", ") : (data?.message || "Fast2SMS error");
      console.error(`[SMS] Fast2SMS error: ${errMsg}`);
      throw new Error(`SMS delivery failed: ${errMsg}`);
    } catch (err: any) {
      console.error("[SMS] Fast2SMS request exception:", err.message);
      throw new Error(err.message || "Fast2SMS dispatch failed");
    }
  }

  // 2. Twilio Provider
  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      console.log(`[SMS] Sending OTP to +91 ${cleanPhone} via Twilio...`);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid.trim()}/Messages.json`;
      const basicAuth = Buffer.from(`${twilioSid.trim()}:${twilioAuth.trim()}`).toString("base64");

      const body = new URLSearchParams({
        To: `+91${cleanPhone}`,
        From: twilioFrom.trim(),
        Body: `Your CouponsHub verification OTP is ${otp}. Valid for 10 minutes.`,
      });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data: any = await res.json().catch(() => ({}));
      if (res.ok && data?.sid) {
        console.log(`[SMS] Twilio message sent: ${data.sid}`);
        return {
          success: true,
          provider: "twilio",
          messageId: data.sid,
        };
      }

      const errMsg = data?.message || `Twilio error HTTP ${res.status}`;
      console.error(`[SMS] Twilio failed: ${errMsg}`);
      throw new Error(`SMS delivery failed: ${errMsg}`);
    } catch (err: any) {
      console.error("[SMS] Twilio request exception:", err.message);
      throw new Error(err.message || "Twilio dispatch failed");
    }
  }

  // 3. Neither provider configured
  if (process.env.NODE_ENV === "test") {
    // In test environment, mock success without external API call
    console.log(`[SMS Test Mock] OTP generated for +91 ${cleanPhone}`);
    return {
      success: true,
      provider: "dev_mock",
    };
  }

  // In development, log clearly to console but DO NOT leak to frontend UI
  console.warn(`[SMS WARNING] No SMS provider configured (FAST2SMS_API_KEY or TWILIO credentials missing in .env).`);
  console.log(`[SMS DEV ONLY] Server OTP for +91 ${cleanPhone} is: ${otp} (This is NEVER sent to website UI)`);

  return {
    success: true,
    provider: "dev_mock",
    error: "No SMS gateway configured. Add FAST2SMS_API_KEY to .env for real SMS delivery.",
  };
}
