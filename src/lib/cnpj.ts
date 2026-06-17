// CNPJ validation — algoritmo de dígitos verificadores (spec §3.5).

/** Remove non-digit characters from a CNPJ string. */
export function sanitizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

/** Format a 14-digit CNPJ as XX.XXX.XXX/XXXX-XX for display. */
export function formatCnpj(cnpj: string): string {
  const s = sanitizeCnpj(cnpj);
  if (s.length !== 14) return cnpj;
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12, 14)}`;
}

/** Apply CNPJ input mask: returns formatted string while typing. */
export function maskCnpj(input: string): string {
  const s = sanitizeCnpj(input).slice(0, 14);
  if (s.length <= 2) return s;
  if (s.length <= 5) return `${s.slice(0, 2)}.${s.slice(2)}`;
  if (s.length <= 8) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5)}`;
  if (s.length <= 12) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8)}`;
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12, 14)}`;
}

/** Validate CNPJ check digits. Returns true if valid 14-digit DV-checked CNPJ. */
export function isValidCnpj(cnpj: string): boolean {
  const s = sanitizeCnpj(cnpj);
  if (s.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(s)) return false; // all-same digits

  const calcDv = (slice: string, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += parseInt(slice[i], 10) * weights[i];
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base = s.slice(0, 12);
  const dv1 = calcDv(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = calcDv(base + dv1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return s.slice(12) === `${dv1}${dv2}`;
}
