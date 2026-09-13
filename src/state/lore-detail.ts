/** 西暦なら「年」を付け、「不明」のような文字列はそのまま出す(全国分の建立年は文字列) */
export function formatBuiltYear(builtYear: string): string {
  return /^\d{3,4}$/.test(builtYear) ? `${builtYear}年` : builtYear;
}
