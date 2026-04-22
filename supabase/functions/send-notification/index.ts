// 1. These CORS headers are REQUIRED for React to communicate with the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

Deno.serve(async (req) => {
  console.log(`0. Incoming request: ${req.method}`);

  // 2. Handle the Preflight Request from the browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("1. Edge Function triggered!");
    
    // 3. Extract the data sent from your React forms
    const body = await req.json();
    console.log("2. Received data:", JSON.stringify(body));
    const { to, subject, employeeName, formType, url, amount } = body;

    // 4. Get the secure API key
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error("❌ ERROR: RESEND_API_KEY is missing from Supabase secrets!");
      throw new Error("Missing RESEND_API_KEY secret")
    }

    console.log(`3. Attempting to send email to: ${to}`);
    // 5. Send the email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'HDSB System <onboarding@resend.dev>', // Resend's default testing email
        to: to, // The array of HOS/HOD/Admin emails
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #003366;">New Form Submission</h2>
            <p>A new <strong>${formType}</strong> has been submitted and requires your attention.</p>
            
            <table style="width: 100%; text-align: left; margin-top: 20px; border-collapse: collapse;">
              <tr><th style="padding: 8px 0; border-bottom: 1px solid #eee;">Employee:</th><td style="border-bottom: 1px solid #eee;">${employeeName}</td></tr>
              <tr><th style="padding: 8px 0; border-bottom: 1px solid #eee;">Form Type:</th><td style="border-bottom: 1px solid #eee;">${formType}</td></tr>
              ${amount ? `<tr><th style="padding: 8px 0; border-bottom: 1px solid #eee;">Total Amount:</th><td style="border-bottom: 1px solid #eee;">RM ${amount}</td></tr>` : ''}
            </table>

            <div style="margin-top: 30px;">
              <a href="${url}/login" style="background-color: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Log In to Review
              </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              HICOM DIECASTINGS GATE SYSTEM V2.4
            </p>
          </div>
        `
      })
    })

    const data = await res.json()
    
    if (!res.ok) {
      console.error("❌ ERROR from Resend API:", JSON.stringify(data));
      throw new Error(`Resend Error: ${data.message || 'Unknown error'}`);
    }

    console.log("✅ 4. Email sent successfully!", JSON.stringify(data));

    // 6. Return success
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("❌ CATCH BLOCK ERROR:", error.message);
    // 7. Return error
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
