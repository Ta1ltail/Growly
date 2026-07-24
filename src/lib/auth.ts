/**
 * Maps Supabase auth error messages to user-friendly, actionable strings.
 * Consolidates patterns from login and register pages.
 */
export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  // Credential errors (login)
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid email or password")
  ) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }
  if (lower.includes("user not found")) {
    return "No account found with this email address.";
  }

  // Registration errors
  if (lower.includes("weak password")) {
    return "Password is too weak. Use at least 8 characters with uppercase, lowercase, numbers, and symbols.";
  }
  if (
    lower.includes("already registered") ||
    lower.includes("user already exists")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (
    lower.includes("username") &&
    (lower.includes("taken") || lower.includes("already exists"))
  ) {
    return "This username is already taken. Please choose another one.";
  }
  if (lower.includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  // Rate limiting
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // Network errors
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("timeout")
  ) {
    return "Connection error. Please check your internet and try again.";
  }

  return message.length > 120 ? message.slice(0, 120) + "…" : message;
}
