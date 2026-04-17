import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = {
    host: process.env.SMTP_HOST || "mail.demisrestaurant.co.uk",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (Number(process.env.SMTP_PORT) || 465) === 465,
    user: process.env.SMTP_USER || "(not set)",
    passSet: !!process.env.SMTP_PASS,
    emailFrom: process.env.EMAIL_FROM || "(not set)",
  };

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    connectionTimeout: 10000,
  });

  try {
    // Test SMTP connection
    await transporter.verify();

    // Send a test email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Demi's Restaurant <bookings@demisrestaurant.co.uk>",
      to: process.env.SMTP_USER || "bookings@demisrestaurant.co.uk",
      subject: "Test Email from Vercel",
      html: "<h1>It works!</h1><p>SMTP is configured correctly on Vercel.</p>",
    });

    return NextResponse.json({ 
      success: true, 
      message: "SMTP connected and test email sent",
      config: { host: config.host, port: config.port, secure: config.secure, user: config.user, passSet: config.passSet }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      success: false, 
      error: message,
      config: { host: config.host, port: config.port, secure: config.secure, user: config.user, passSet: config.passSet }
    }, { status: 500 });
  }
}
