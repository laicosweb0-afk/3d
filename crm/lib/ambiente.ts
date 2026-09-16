// Le variabili d'ambiente lette in un posto solo, con un errore che dice quale
// manca invece di un crash oscuro a metà pagina. Si leggono a chiamata, non
// all'import: così `next build` gira anche su una macchina senza chiavi.

export function varObbligatoria(nome: string): string {
  const valore = process.env[nome];
  if (!valore) {
    throw new Error(
      `Manca la variabile d'ambiente ${nome}. In locale sta in crm/.env.local (vedi crm/.env.example), in produzione nelle impostazioni del progetto Vercel.`,
    );
  }
  return valore;
}

export const urlSupabase = () => varObbligatoria('NEXT_PUBLIC_SUPABASE_URL');
export const chiaveAnonima = () => varObbligatoria('NEXT_PUBLIC_SUPABASE_ANON_KEY');
export const chiaveServizio = () => varObbligatoria('SUPABASE_SERVICE_ROLE_KEY');
