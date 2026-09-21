import type { Deposito } from './deposito';

// Il telefono e l'email scritti a mano nella scheda **sono** identità: se non
// finiscono nella tabella delle identità, la stessa persona che poi scrive su
// WhatsApp diventa una seconda scheda. È il doppione che il titolare scopre
// tre settimane dopo, al telefono, facendo brutta figura.
//
// Quindi ogni volta che un recapito viene salvato passa anche di qui. Se quel
// recapito appartiene già a qualcun altro, `collegaIdentita` non lo tocca:
// rubarlo sarebbe peggio del doppione, e il caso finisce nell'avviso
// «possibile doppione», dove lo decide una persona.
export async function indicizzaRecapiti(
  dep: Deposito,
  contattoId: string,
  recapiti: { telefono?: string | null; email?: string | null },
): Promise<void> {
  const telefono = recapiti.telefono?.trim();
  if (telefono) await dep.collegaIdentita(contattoId, 'telefono', telefono, false);

  const email = recapiti.email?.trim();
  if (email) await dep.collegaIdentita(contattoId, 'email', email, false);
}
