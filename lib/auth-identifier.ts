const staffUsernamePattern = /^[a-zA-Z0-9._-]{3,32}$/;

export function isValidStaffUsername(value: string) {
  return staffUsernamePattern.test(value.trim());
}

export function staffUsernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@staff.oksign.local`;
}

export function identifierToEmail(identifier: string) {
  const value = identifier.trim().toLowerCase();
  return value.includes('@') ? value : staffUsernameToEmail(value);
}
