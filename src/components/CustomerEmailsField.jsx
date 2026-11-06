import { Plus, Star, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MAX_CUSTOMER_EMAILS } from "../utils/customerEmails";
import "../styles/customer-emails.css";

export default function CustomerEmailsField({ value, onChange, className = "" }) {
  const { t } = useTranslation();
  const { emails, primaryIndex } = value;

  const update = (nextEmails, nextPrimary = primaryIndex) =>
    onChange({ emails: nextEmails, primaryIndex: nextPrimary });

  const setEmail = (index, text) =>
    update(emails.map((item, i) => (i === index ? text : item)));

  const addEmail = () => {
    if (emails.length >= MAX_CUSTOMER_EMAILS) return;
    update([...emails, ""]);
  };

  const removeEmail = (index) => {
    if (emails.length === 1) {
      update([""], 0);
      return;
    }

    const next = emails.filter((_, i) => i !== index);
    let nextPrimary = primaryIndex;
    if (index === primaryIndex) nextPrimary = 0;
    else if (index < primaryIndex) nextPrimary = primaryIndex - 1;

    update(next, nextPrimary);
  };

  return (
    <div className={`customer-emails ${className}`.trim()}>
      <div className="customer-emails-head">
        <span>{t("customers.form.emails")}</span>
        <small>
          {emails.length}/{MAX_CUSTOMER_EMAILS}
        </small>
      </div>

      <div className="customer-emails-list">
        {emails.map((email, index) => {
          const isPrimary = index === primaryIndex;

          return (
            <div
              key={index}
              className={`customer-emails-row${isPrimary ? " is-primary" : ""}`}
            >
              <input
                type="email"
                className="customer-emails-input"
                value={email}
                onChange={(e) => setEmail(index, e.target.value)}
                placeholder="cliente@email.com"
                aria-label={`${t("customers.form.email")} ${index + 1}`}
              />

              {isPrimary ? (
                <span className="customer-emails-badge">
                  <Star size={13} />
                  {t("customers.form.primaryEmail")}
                </span>
              ) : (
                <button
                  type="button"
                  className="customer-emails-make-primary"
                  onClick={() => update(emails, index)}
                  title={t("customers.form.makePrimary")}
                >
                  <Star size={13} />
                  <span>{t("customers.form.makePrimary")}</span>
                </button>
              )}

              <button
                type="button"
                className="customer-emails-remove"
                onClick={() => removeEmail(index)}
                title={t("customers.form.removeEmail")}
                aria-label={t("customers.form.removeEmail")}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="customer-emails-foot">
        <button
          type="button"
          className="customer-emails-add"
          onClick={addEmail}
          disabled={emails.length >= MAX_CUSTOMER_EMAILS}
        >
          <Plus size={15} />
          {t("customers.form.addEmail")}
        </button>
        <small>{t("customers.form.emailsHint")}</small>
      </div>
    </div>
  );
}
