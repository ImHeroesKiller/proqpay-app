/**
 * App public URLs.
 * Local: localhost:3001 · Production: proqpay.msg-os.com
 */
export const appConfig = {
  /** Canonical production hostname for the payroll app */
  productionUrl: "https://proqpay.msg-os.com",
  /** Corporate marketing site */
  corporateUrl: "https://www.msg-os.com",
  /**
   * Runtime public app URL (browser-safe).
   * Prefer NEXT_PUBLIC_APP_URL; fall back to production in prod, localhost in dev.
   */
  get url() {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }
    if (process.env.NODE_ENV === "production") {
      return this.productionUrl;
    }
    return "http://localhost:3001";
  },
  get loginUrl() {
    return `${this.url}/login`;
  },
} as const;
