import { OAuth2Client } from "google-auth-library";

const client_id =
  "152806143876-gc2n8vf3j5g1gp9giiojn8lkssinv060.apps.googleusercontent.com";

// Setting up Google Client
const client = new OAuth2Client({
  clientId: client_id,
});

export async function verifyIdToken(idToken) {
  const loginTicket = await client.verifyIdToken({
    idToken,
    audience: client_id,
  });

  const userData = loginTicket.getPayload();
  return userData;
}



