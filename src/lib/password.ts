export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9]/,
} as const;

export const isStrongPassword = (password: string) =>
  password.length >= PASSWORD_REQUIREMENTS.minLength &&
  PASSWORD_REQUIREMENTS.uppercase.test(password) &&
  PASSWORD_REQUIREMENTS.lowercase.test(password) &&
  PASSWORD_REQUIREMENTS.number.test(password) &&
  PASSWORD_REQUIREMENTS.special.test(password);

export const strongPasswordMessage = "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.";