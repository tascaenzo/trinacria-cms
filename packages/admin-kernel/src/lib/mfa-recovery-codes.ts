const RECOVERY_CODES_FILENAME = "trinacria-mfa-recovery-codes.txt";

export function formatMfaRecoveryCodes(codes: readonly string[]): string {
  return [
    "Trinacria CMS — codici di recupero 2FA",
    "",
    "Ogni codice può essere usato una sola volta per accedere senza l'app di autenticazione.",
    "Conserva questo file in un luogo sicuro e non condividerlo.",
    "",
    ...codes
  ].join("\n");
}

/** Downloads recovery codes only after an explicit user action. */
export function downloadMfaRecoveryCodes(codes: readonly string[]): void {
  const blob = new Blob([formatMfaRecoveryCodes(codes)], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = RECOVERY_CODES_FILENAME;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Opens a print-only copy of recovery codes after an explicit user action. */
export function printMfaRecoveryCodes(codes: readonly string[]): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.opener = null;
  printWindow.document.title = "Trinacria CMS — codici di recupero 2FA";

  const content = printWindow.document.createElement("pre");
  content.textContent = formatMfaRecoveryCodes(codes);
  content.style.whiteSpace = "pre-wrap";
  content.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
  content.style.fontSize = "14px";
  content.style.lineHeight = "1.6";
  content.style.padding = "24px";
  printWindow.document.body.replaceChildren(content);
  printWindow.focus();
  printWindow.print();
}
