import 'server-only';
import { Resend } from 'resend';

// L'email con il codice. Se Resend non è configurato o l'invio fallisce non si
// solleva niente: il lead è già salvato, e la card dirà al cliente di mostrare
// il codice in negozio invece di promettergli un'email che non arriva.

export type EsitoEmail = { inviata: boolean; motivo?: string };

const ORO = '#B8912A';
const CREMA = '#F5F5F3';
const INCHIOSTRO = '#1D1D1F';

function corpoHtml(nome: string, codice: string, scadenza: string, credito: number) {
  const scadenzaIt = new Date(`${scadenza}T00:00:00Z`).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `<!DOCTYPE html>
<html lang="it"><body style="margin:0;padding:24px;background:${CREMA};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INCHIOSTRO};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:24px;padding:32px;">
    <tr><td>
      <p style="margin:0 0 4px;letter-spacing:.18em;font-size:11px;color:${ORO};text-transform:uppercase;">Club Rama</p>
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;">Ciao ${nome}, il tuo credito è attivo</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:rgba(29,29,31,.72);">
        Mostra questo codice in showroom o citalo quando chiedi il preventivo:
        vale ${credito} € sul tuo progetto.
      </p>
      <div style="border:1px solid rgba(29,29,31,.10);border-radius:18px;padding:20px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;color:rgba(29,29,31,.45);">IL TUO CODICE</p>
        <p style="margin:0;font-size:27px;font-weight:600;letter-spacing:.06em;">${codice}</p>
      </div>
      <p style="margin:20px 0 0;font-size:13px;color:rgba(29,29,31,.55);">Valido fino al ${scadenzaIt}.</p>
      <p style="margin:24px 0 0;font-size:13px;color:rgba(29,29,31,.55);">Rama Ceramiche — Lugo (RA)</p>
    </td></tr>
  </table>
</body></html>`;
}

export async function inviaCodice(opzioni: {
  nome: string;
  email: string;
  codice: string;
  scadenza: string;
  credito: number;
}): Promise<EsitoEmail> {
  const chiave = process.env.RESEND_API_KEY;
  const mittente = process.env.EMAIL_MITTENTE;
  if (!chiave || !mittente) return { inviata: false, motivo: 'Resend non configurato' };

  try {
    const resend = new Resend(chiave);
    const risposta = await resend.emails.send({
      from: mittente,
      to: opzioni.email,
      replyTo: process.env.EMAIL_RISPOSTA || undefined,
      subject: `Il tuo credito Club Rama: ${opzioni.codice}`,
      html: corpoHtml(opzioni.nome, opzioni.codice, opzioni.scadenza, opzioni.credito),
      text: `Ciao ${opzioni.nome}, il tuo credito di ${opzioni.credito} € è attivo.\nCodice: ${opzioni.codice}\nValido fino al ${opzioni.scadenza}.\nRama Ceramiche — Lugo (RA)`,
    });
    if (risposta.error) return { inviata: false, motivo: risposta.error.message };
    return { inviata: true };
  } catch (errore) {
    return { inviata: false, motivo: errore instanceof Error ? errore.message : 'errore sconosciuto' };
  }
}
