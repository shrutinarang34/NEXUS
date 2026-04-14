"use server";

import { generateSecureToken, hashToken } from "@/lib/crypto";
// NOTE: db is the Firebase Admin Firestore instance
import { db } from "@/lib/firebase-admin";
// NOTE: clientDb is the client-side Firestore instance
import { db as clientDb } from "@/lib/firebase";
// We only need 'doc' and 'getDoc' for the client-side read function
import { doc, getDoc } from "firebase/firestore";
import sgMail from "@sendgrid/mail";

/**
 * Sends an email using the SendGrid API. This function is for internal use within server actions.
 * @param {{to: string, subject: string, html: string}} mailOptions - The email options.
 * @returns {Promise<boolean>} True if the email was sent, false otherwise.
 */
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<any> {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    console.error(
      "SENDGRID_API_KEY or SENDGRID_FROM_EMAIL is not set in the environment."
    );
    console.log(`Email to: ${to}\nSubject: ${subject}\nBody: ${html}`);
    return false;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: subject,
    html: html,
  };

  try {
    const response = await sgMail.send(msg);
    console.log("Email sent successfully via SendGrid.");
    return true;
  } catch (error: any) {
    console.error("Error sending email via SendGrid:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    return false;
  }
}

/**
 * Creates a secure one-time password (OTP), stores its hash in the database,
 * and triggers an email to be sent to the user.
 * This function uses the Firebase Admin SDK to write to Firestore.
 * @param {string} userId - The ID of the user for whom the OTP is being generated.
 * @param {string} email - The email address to send the OTP to.
 * @returns {Promise<boolean>} True if the process was successful, false otherwise.
 */
export async function send2faOtp(
  userId: string,
  email: string
): Promise<boolean | Error> {
  console.log(`Initiating 2FA OTP for userId: ${userId}`);
  try {
    const otp = generateSecureToken();
    const hashedOtp = await hashToken(otp);

    // CORRECTION: Use Admin SDK's dot notation for document reference and the .set() method.
    const otpDocRef = db.collection("otpSecrets").doc(userId);

    // CORRECTION: Use the Admin SDK's 'set' method directly on the document reference.
    await otpDocRef.set({
      secret: hashedOtp,
      createdAt: new Date(),
    });

    console.log(`OTP secret stored for userId: ${userId}`);

    return await sendEmail({
      to: email,
      subject: "Your Nexus Verification Code",
      html: `Your verification code is: <strong>${otp}</strong>. It will expire in 5 minutes.`,
    });
  } catch (error) {
    console.error("Error in send2faOtp action:", error);
    // Return the error to be handled by the caller.
    return error as Error;
  }
}

/**
 * Verifies a user-provided OTP against the stored hash.
 * This uses the client SDK for reads, which is fine.
 * @param {string} userId - The ID of the user to verify.
 * @param {string} otp - The 6-digit OTP provided by the user.
 * @returns {Promise<boolean>} True if the OTP is valid, false otherwise.
 */
export async function verifyOtp(userId: string, otp: string): Promise<boolean> {
  const otpDocRef = doc(clientDb, "otpSecrets", userId);
  const otpDoc = await getDoc(otpDocRef);

  if (!otpDoc.exists() || !otpDoc.data().secret) {
    console.error("User or OTP secret not found.");
    return false;
  }

  const { secret, createdAt } = otpDoc.data()!;

  const otpExpiryTime = 5 * 60 * 1000;
  if (new Date().getTime() - createdAt.toDate().getTime() > otpExpiryTime) {
    console.error("OTP has expired.");
    return false;
  }

  const hashedOtp = await hashToken(otp);
  return hashedOtp === secret;
}
