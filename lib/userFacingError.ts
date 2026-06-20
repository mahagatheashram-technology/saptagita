export function getUserFacingErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const knownMessages = [
    "You already have a bucket with this name",
    "Bucket name is required",
    "Bucket not found",
    "Not your bucket",
    "Cannot rename default bucket",
    "Cannot delete default bucket",
  ];

  for (const message of knownMessages) {
    if (raw.includes(message)) return message;
  }

  const convexMatch = raw.match(/Uncaught Error:\s*([^\n]+)/);
  if (convexMatch?.[1]) return convexMatch[1].trim();

  return "Something went wrong. Please try again.";
}
