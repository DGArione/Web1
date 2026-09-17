import { PageHeader } from "@/components/dashboard/Shell";
import { getAllSettings, SETTING_KEYS as K } from "@/lib/settings";
import { saveSettings } from "../actions";

export default async function AdminSettings() {
  const s = await getAllSettings();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="System settings"
        description="Payment methods, bank & crypto details, expiration and registration rules."
      />

      <form action={saveSettings} className="space-y-6">
        {/* Payment method & terms */}
        <section className="card">
          <h2 className="mb-4 font-serif text-lg font-semibold">Payment</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={K.PAYMENT_METHOD}>Accepted methods</label>
              <select id={K.PAYMENT_METHOD} name={K.PAYMENT_METHOD} defaultValue={s[K.PAYMENT_METHOD]} className="input">
                <option value="BANK">Bank transfer only</option>
                <option value="CRYPTO">Crypto only</option>
                <option value="BOTH">Bank transfer + Crypto</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor={K.PAYMENT_TERMS}>Payment terms</label>
              <select id={K.PAYMENT_TERMS} name={K.PAYMENT_TERMS} defaultValue={s[K.PAYMENT_TERMS]} className="input">
                <option value="IMMEDIATE">Immediate</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor={K.CREDIT_DAYS}>Credit period (days)</label>
              <input id={K.CREDIT_DAYS} name={K.CREDIT_DAYS} type="number" min={0} defaultValue={s[K.CREDIT_DAYS]} className="input" />
            </div>
            <div>
              <label className="label" htmlFor={K.SETTLEMENT_DAYS}>Commission settlement period (days)</label>
              <input id={K.SETTLEMENT_DAYS} name={K.SETTLEMENT_DAYS} type="number" min={0} defaultValue={s[K.SETTLEMENT_DAYS]} className="input" />
            </div>
          </div>
        </section>

        {/* Bank details */}
        <section className="card">
          <h2 className="mb-4 font-serif text-lg font-semibold">Bank transfer details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={K.BANK_NAME}>Bank name</label>
              <input id={K.BANK_NAME} name={K.BANK_NAME} defaultValue={s[K.BANK_NAME]} className="input" />
            </div>
            <div>
              <label className="label" htmlFor={K.BANK_ACCOUNT_NAME}>Account name</label>
              <input id={K.BANK_ACCOUNT_NAME} name={K.BANK_ACCOUNT_NAME} defaultValue={s[K.BANK_ACCOUNT_NAME]} className="input" />
            </div>
            <div>
              <label className="label" htmlFor={K.BANK_ACCOUNT_NUMBER}>Account number</label>
              <input id={K.BANK_ACCOUNT_NUMBER} name={K.BANK_ACCOUNT_NUMBER} defaultValue={s[K.BANK_ACCOUNT_NUMBER]} className="input" />
            </div>
            <div>
              <label className="label" htmlFor={K.BANK_BRANCH}>Branch</label>
              <input id={K.BANK_BRANCH} name={K.BANK_BRANCH} defaultValue={s[K.BANK_BRANCH]} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor={K.BANK_INSTRUCTIONS}>Instructions</label>
              <textarea id={K.BANK_INSTRUCTIONS} name={K.BANK_INSTRUCTIONS} rows={2} defaultValue={s[K.BANK_INSTRUCTIONS]} className="input" />
            </div>
          </div>
        </section>

        {/* Crypto details */}
        <section className="card">
          <h2 className="mb-4 font-serif text-lg font-semibold">Crypto payment details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={K.CRYPTO_CURRENCY}>Currency</label>
              <input id={K.CRYPTO_CURRENCY} name={K.CRYPTO_CURRENCY} defaultValue={s[K.CRYPTO_CURRENCY]} className="input" />
            </div>
            <div>
              <label className="label" htmlFor={K.CRYPTO_NETWORK}>Network</label>
              <input id={K.CRYPTO_NETWORK} name={K.CRYPTO_NETWORK} defaultValue={s[K.CRYPTO_NETWORK]} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor={K.CRYPTO_ADDRESS}>Wallet / payment address</label>
              <input id={K.CRYPTO_ADDRESS} name={K.CRYPTO_ADDRESS} defaultValue={s[K.CRYPTO_ADDRESS]} className="input font-mono" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor={K.CRYPTO_INSTRUCTIONS}>Instructions</label>
              <textarea id={K.CRYPTO_INSTRUCTIONS} name={K.CRYPTO_INSTRUCTIONS} rows={2} defaultValue={s[K.CRYPTO_INSTRUCTIONS]} className="input" />
            </div>
          </div>
        </section>

        {/* Registration & expiration */}
        <section className="card">
          <h2 className="mb-4 font-serif text-lg font-semibold">Registration & privacy</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={K.DEFAULT_SELLER_REG_FEE}>Default seller registration fee ($)</label>
              <input id={K.DEFAULT_SELLER_REG_FEE} name={K.DEFAULT_SELLER_REG_FEE} type="number" min={0} defaultValue={s[K.DEFAULT_SELLER_REG_FEE]} className="input" />
            </div>
            <div>
              <label className="label" htmlFor={K.INVITE_EXPIRY_HOURS}>Default invitation lifetime (hours)</label>
              <input id={K.INVITE_EXPIRY_HOURS} name={K.INVITE_EXPIRY_HOURS} type="number" min={1} defaultValue={s[K.INVITE_EXPIRY_HOURS]} className="input" />
            </div>
            <div>
              <label className="label" htmlFor={K.EXPIRE_ORDER_INFO_SECONDS}>Order info expiry (seconds)</label>
              <input id={K.EXPIRE_ORDER_INFO_SECONDS} name={K.EXPIRE_ORDER_INFO_SECONDS} type="number" min={10} defaultValue={s[K.EXPIRE_ORDER_INFO_SECONDS]} className="input" />
              <p className="mt-1 text-xs text-tea-400">
                How long customers can see order payment/collection info before it expires.
              </p>
            </div>
          </div>
        </section>

        <button type="submit" className="btn-primary">Save settings</button>
      </form>
    </div>
  );
}
