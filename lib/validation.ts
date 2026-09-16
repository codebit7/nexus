/**
 * Shared input validators.
 *
 * The email pattern was written out by hand in three places (invite a member,
 * create a client, the send-email API route). Three copies drift: fix a false
 * rejection in one and the other two keep rejecting the address.
 */

/** RFC 5322, simplified — covers real-world addresses without the full grammar. */
const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

/** The message every form shows for a bad address — one wording, everywhere. */
export const INVALID_EMAIL_MESSAGE =
  'Please enter a valid email address (e.g. name@company.com).';
