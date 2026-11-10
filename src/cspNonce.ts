// Read from Vite's csp-nonce meta tag; absent in dev and tests.
const nonce =
  document.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')
    ?.nonce || undefined;

export const cspNonce = nonce;
export const getStyleNonce = nonce ? () => nonce : undefined;
