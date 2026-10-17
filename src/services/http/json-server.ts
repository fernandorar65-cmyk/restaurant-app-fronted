/**
 * json-server recarga db.json cada vez que termina de escribir y puede descartar un cambio
 * que llega justo en ese momento (aunque responda 200). Cuando una acción hace varias
 * escrituras seguidas, se espera este margen entre una y otra.
 * Con el backend real cada acción será una sola petición y esto desaparece.
 */
export const JSON_SERVER_WRITE_GAP_MS = 400

export function waitForJsonServer(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, JSON_SERVER_WRITE_GAP_MS))
}
