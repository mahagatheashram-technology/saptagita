export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter((part) => /\p{L}/u.test(part));
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0] ?? "")[0] ?? "";
  const last =
    parts.length > 1
      ? Array.from(parts[parts.length - 1] ?? "")[0] ?? ""
      : "";
  return (first + last).toUpperCase();
}
