import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatDate, formatHeure, formatPrix, montant, type Locale } from '../format';
import type { Dictionnaire } from '../i18n/dictionnaires';
import type { Reservation, Ticket } from '../api/types';

const ORANGE = '#E67E22';
const DARK = '#2C3E50';

function etatStyle(
  statut: Ticket['statut'],
  t: Dictionnaire,
): { texte: string; couleur: string; fond: string } {
  switch (statut) {
    case 'valide':
      return { texte: t.ticket.etats.valide, couleur: '#1B7F4B', fond: '#DFF5E7' };
    case 'utilise':
      return { texte: t.ticket.etats.utilise, couleur: '#7F8C8D', fond: '#ECEFF1' };
    case 'annule':
      return { texte: t.ticket.etats.annule, couleur: '#C0392B', fond: '#FCEBEA' };
  }
}

function monogramme(nom: string): string {
  return nom
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? '')
    .join('');
}

function echapper(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

// Épingle Yègo (même tracé que src/components/Logo.tsx), en SVG inline.
const PIN = `<svg width="16" height="17" viewBox="0 0 110 118" xmlns="http://www.w3.org/2000/svg">
  <path d="M55 0C25 0 0 24 0 55c0 40 55 63 55 63s55-23 55-63C110 24 85 0 55 0Z" fill="${ORANGE}"/>
  <circle cx="55" cy="52" r="30" fill="#fff"/>
  <path d="M30 60C42 40 68 40 80 60" stroke="${DARK}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <circle cx="30" cy="60" r="5" fill="${DARK}"/><circle cx="80" cy="60" r="5" fill="${DARK}"/>
</svg>`;

// Un billet = une page. `qrDataUrls[i]` = PNG base64 (sans préfixe) du i-ème ticket.
export function billetHtml(
  reservation: Reservation,
  tickets: Ticket[],
  qrDataUrls: string[],
  t: Dictionnaire,
  locale: Locale = 'fr-FR',
): string {
  const trajet = reservation.depart?.trajet;
  const compagnie = trajet?.compagnie?.nom ?? t.ticket.compagnie;
  const logoCompagnie = trajet?.compagnie?.logoUrl
    ? `<img class="mono mono-img" src="${echapper(trajet.compagnie.logoUrl)}" alt="" />`
    : `<div class="mono">${echapper(monogramme(compagnie))}</div>`;
  const depart = trajet?.villeDepart?.nom ?? '—';
  const arrivee = trajet?.villeArrivee?.nom ?? '—';
  const dateStr = reservation.depart ? formatDate(reservation.depart.dateDepart, locale) : '';
  const heureStr = trajet ? formatHeure(trajet.heureDepart, locale) : '';
  const prixUnite = trajet ? montant(trajet.prix) : 0;
  const passager = reservation.passagerNom ?? t.ticket.voyageur;

  const pages = tickets
    .map((tk, i) => {
      const e = etatStyle(tk.statut, t);
      const qr = qrDataUrls[i]
        ? `<img class="qr" src="data:image/png;base64,${qrDataUrls[i]}" alt="QR" />`
        : `<div class="qr-fallback">${echapper(tk.codeQr)}</div>`;
      return `
    <section class="billet">
      <div class="carte">
        <div class="bandeau">
          ${logoCompagnie}
          <div class="bandeau-txt">
            <div class="compagnie">${echapper(compagnie)}</div>
            <div class="sous">${echapper(t.ticket.billetElectronique)}</div>
          </div>
          <div class="marque">${PIN}<span>Y<b>è</b>go</span></div>
        </div>

        <div class="corps">
          <div class="trajet">
            <div class="col">
              <div class="mini">${echapper(t.ticket.depart)}</div>
              <div class="ville">${echapper(depart)}</div>
              <div class="meta">${echapper(heureStr)}</div>
            </div>
            <div class="milieu"><span></span><i>&#128652;</i><span></span></div>
            <div class="col right">
              <div class="mini">${echapper(t.ticket.arrivee)}</div>
              <div class="ville">${echapper(arrivee)}</div>
              <div class="meta">${echapper(dateStr)}</div>
            </div>
          </div>
        </div>

        <div class="perfo"><b class="n left"></b><b class="d"></b><b class="n right"></b></div>

        <div class="corps">
          <div class="infos">
            <div class="cell"><div class="mini">${echapper(t.ticket.siege)}</div><div class="siege">${echapper(tk.siege ?? '—')}</div></div>
            <div class="cell"><div class="mini">${echapper(t.ticket.passager)}</div><div class="val">${echapper(passager)}</div></div>
            <div class="cell last"><div class="mini">${echapper(t.ticket.etat)}</div><span class="badge" style="color:${e.couleur};background:${e.fond}">${e.texte}</span></div>
          </div>

          <div class="qr-cadre">${qr}<div class="qr-leg">${echapper(t.ticket.presentezCeCode)}</div></div>

          <div class="pied">
            <span>${echapper(t.ticket.billetNSurN(i + 1, tickets.length))}</span>
            <span>${echapper(t.paiement.ref(reservation.id))}</span>
            <span class="prix">${formatPrix(prixUnite, locale)}</span>
          </div>
        </div>
      </div>
    </section>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: ${DARK}; background: #F5F6F7; }
  .billet { padding: 30px 26px; page-break-after: always; }
  .billet:last-child { page-break-after: auto; }
  .carte { border-radius: 22px; overflow: hidden; background: #fff; box-shadow: 0 10px 30px rgba(30,42,54,.10); border: 1px solid #EDEFF1; }

  .bandeau { display: flex; align-items: center; gap: 12px; background: ${DARK}; padding: 18px 20px; }
  .mono { width: 42px; height: 42px; border-radius: 12px; background: ${ORANGE}; color: #fff; font-weight: 800; font-size: 15px; display: flex; align-items: center; justify-content: center; }
  .mono-img { background: #fff; object-fit: contain; padding: 3px; box-sizing: border-box; }
  .bandeau-txt { flex: 1; }
  .compagnie { font-size: 16px; font-weight: 800; color: #fff; }
  .sous { font-size: 9px; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(255,255,255,.6); margin-top: 3px; }
  .marque { display: flex; align-items: center; gap: 5px; color: #fff; font-weight: 800; font-size: 13px; }
  .marque b { color: ${ORANGE}; font-weight: 800; }

  .corps { padding: 0 22px; }
  .trajet { display: flex; align-items: flex-start; padding: 22px 0; }
  .col { flex: 1; }
  .col.right { text-align: right; }
  .mini { font-size: 9px; letter-spacing: .7px; text-transform: uppercase; color: #AEB6B7; margin-bottom: 4px; }
  .ville { font-size: 21px; font-weight: 800; }
  .meta { font-size: 12px; color: #7F8C8D; font-weight: 600; margin-top: 3px; }
  .milieu { display: flex; align-items: center; gap: 5px; padding: 16px 8px 0; }
  .milieu span { width: 22px; height: 2px; background: #E5E7EB; display: block; }
  .milieu i { width: 28px; height: 28px; border-radius: 50%; background: ${ORANGE}; color: #fff; font-style: normal; font-size: 14px; display: flex; align-items: center; justify-content: center; }

  .perfo { display: flex; align-items: center; }
  .perfo .n { width: 22px; height: 22px; border-radius: 50%; background: #F5F6F7; display: block; }
  .perfo .n.left { margin-left: -11px; }
  .perfo .n.right { margin-right: -11px; }
  .perfo .d { flex: 1; border-top: 2px dashed #DEE2E5; margin: 0 6px; }

  .infos { display: flex; margin-top: 20px; border: 1px solid #EAEDEF; border-radius: 14px; overflow: hidden; }
  .cell { flex: 1; padding: 12px 14px; border-right: 1px solid #EAEDEF; }
  .cell.last { border-right: 0; }
  .siege { font-size: 26px; font-weight: 800; color: ${ORANGE}; line-height: 1.1; }
  .val { font-size: 15px; font-weight: 700; margin-top: 3px; }
  .badge { display: inline-block; font-size: 12px; font-weight: 800; padding: 4px 11px; border-radius: 999px; margin-top: 4px; }

  .qr-cadre { width: 214px; margin: 22px auto 0; padding: 16px 16px 12px; border: 1px solid #E5E7EB; border-radius: 16px; background: #FBFCFD; text-align: center; }
  .qr { width: 182px; height: 182px; display: block; margin: 0 auto; }
  .qr-fallback { font-family: monospace; font-size: 10px; word-break: break-all; }
  .qr-leg { font-size: 10px; color: #7F8C8D; margin-top: 10px; }

  .pied { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 14px 0 22px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #7F8C8D; font-weight: 600; }
  .pied .prix { color: ${DARK}; font-weight: 800; }
</style></head><body>${pages}</body></html>`;
}

// Génère le PDF et ouvre la feuille de partage (« Enregistrer dans Fichiers », etc.).
export async function telechargerBillet(
  reservation: Reservation,
  tickets: Ticket[],
  qrDataUrls: string[],
  t: Dictionnaire,
  locale: Locale = 'fr-FR',
): Promise<void> {
  const html = billetHtml(reservation, tickets, qrDataUrls, t, locale);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Yègo · ${t.ticket.billetElectronique}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
