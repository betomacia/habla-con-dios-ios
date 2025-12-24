import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactRequest {
  name: string;
  email: string;
  message: string;
  language: string;
  toEmail: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { name, email, message, language, toEmail }: ContactRequest = await req.json();

    if (!name || !email || !message || !toEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`[Contact] New message from ${name} (${email}) in ${language}`);
    console.log(`[Contact] To: ${toEmail}`);
    console.log(`[Contact] Message: ${message}`);

    // Obtener la API key de Resend desde las variables de entorno
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      console.error('[Contact] RESEND_API_KEY not configured');
      // Aún así registrar el mensaje
      console.log(`[Contact] Message would be sent to: ${toEmail}`);
      console.log(`[Contact] From: ${name} <${email}>`);
      console.log(`[Contact] Body: ${message}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Contact message received and logged (email service not configured)",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Enviar email usando Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'contacto@movilive.com',
        to: toEmail,
        reply_to: email,
        subject: `Nuevo mensaje de contacto de ${name}`,
        html: `
          <h2>Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Idioma:</strong> ${language}</p>
          <hr>
          <h3>Mensaje:</h3>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('[Contact] Error sending email:', errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResult = await emailResponse.json();
    console.log('[Contact] Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Contact message sent successfully",
        emailId: emailResult.id,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (err) {
    console.error("[Contact] Error:", err);
    return new Response(
      JSON.stringify({ 
        error: "Failed to process contact request",
        details: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});