/** 0–3: length ≥ 8, letters + digits, length ≥ 12 or a symbol. */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0;
  let score = 1;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score++;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) score++;
  return score as 1 | 2 | 3;
}
