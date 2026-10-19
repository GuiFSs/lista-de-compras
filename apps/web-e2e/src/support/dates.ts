// Datas de calendário usadas nas jornadas: o produto trabalha com
// `YYYY-MM-DD` sem fuso (RN-04) e exibe `DD/MM/AAAA`. Ficam no suporte porque
// as jornadas de checkout e histórico precisam das duas formas.

/** Data de calendário local em `YYYY-MM-DD` (RN-04: hoje no fuso desta máquina). */
export function todayLocal(date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Data futura em `YYYY-MM-DD` — jornada de rejeição de data futura (AC-04). */
export function futureLocal(days: number, date = new Date()): string {
  return todayLocal(new Date(date.getTime() + days * 24 * 60 * 60 * 1000));
}

/** `YYYY-MM-DD` → `DD/MM/AAAA`, a mesma formatação da tela (`purchase-format.ts`). */
export function displayDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match === null ? value : `${match[3]}/${match[2]}/${match[1]}`;
}
