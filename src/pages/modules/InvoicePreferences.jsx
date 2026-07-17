import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileKey2,
  Loader2,
  LockKeyhole,
  Percent,
  Save,
  UploadCloud,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function InvoicePreferences() {
const navigate = useNavigate();

const { tenant, setTenant } = useAuth();
const [certificate, setCertificate] = useState(null);
const [certificatePassword, setCertificatePassword] = useState("");
const [acceptedAuthorization, setAcceptedAuthorization] = useState(false);
const [ecfRequest, setEcfRequest] = useState(null);
const [loadingEcfRequest, setLoadingEcfRequest] = useState(true);
const [uploadingCertificate, setUploadingCertificate] = useState(false);
const [form, setForm] = useState({
  invoiceTaxEnabled: true,
  invoiceTaxMode: "global",
  invoiceTaxRate: 18,
  country: "DO",
  usStateTaxRate: 0,
  usCountyTaxRate: 0,
  usCityTaxRate: 0,
});

  useEffect(() => {
    if (tenant) {
      setForm({
        invoiceTaxEnabled: tenant.invoiceTaxEnabled !== false,
        invoiceTaxMode: tenant.invoiceTaxMode || "global",
        invoiceTaxRate: tenant.invoiceTaxRate ?? 18,
        country: tenant.country || "DO",
        usStateTaxRate: tenant.usStateTaxRate ?? 0,
        usCountyTaxRate: tenant.usCountyTaxRate ?? 0,
        usCityTaxRate: tenant.usCityTaxRate ?? 0,
      });
    }
  }, [tenant]);

  useEffect(() => {
  if ((tenant?.country || "DO") !== "DO") {
    setLoadingEcfRequest(false);
    return;
  }

  const loadElectronicInvoicingRequest = async () => {
    try {
      setLoadingEcfRequest(true);

      const { data } = await api.get(
        "/electronic-invoicing/request"
      );

      setEcfRequest(data.request);
    } catch (error) {
      console.error(
        "Error consultando solicitud e-CF:",
        error.response?.data || error.message
      );
    } finally {
      setLoadingEcfRequest(false);
    }
  };

  loadElectronicInvoicingRequest();
}, [tenant?.country]);

const handleCertificateChange = (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    setCertificate(null);
    return;
  }

  const extension = file.name
    .slice(file.name.lastIndexOf("."))
    .toLowerCase();

  if (![".p12", ".pfx"].includes(extension)) {
    event.target.value = "";
    setCertificate(null);
    alert("Selecciona un certificado con extensión .p12 o .pfx");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    event.target.value = "";
    setCertificate(null);
    alert("El certificado no puede superar los 5 MB");
    return;
  }

  setCertificate(file);
};

const submitCertificate = async () => {
  if (!tenant?.rnc?.trim()) {
    alert(
      "Debes registrar el RNC de la empresa antes de solicitar la emisión electrónica."
    );
    return;
  }

  if (!certificate) {
    alert("Selecciona tu certificado digital .p12 o .pfx");
    return;
  }

  if (!certificatePassword.trim()) {
    alert("Introduce la contraseña del certificado");
    return;
  }

  if (!acceptedAuthorization) {
    alert(
      "Debes aceptar la autorización para enviar la solicitud."
    );
    return;
  }

  try {
    setUploadingCertificate(true);

    const payload = new FormData();

    payload.append("certificate", certificate);
    payload.append(
      "certificatePassword",
      certificatePassword
    );
    payload.append(
      "acceptedAuthorization",
      String(acceptedAuthorization)
    );

    const { data } = await api.post(
      "/electronic-invoicing/request",
      payload,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    setEcfRequest(data.request);
    setCertificate(null);
    setCertificatePassword("");
    setAcceptedAuthorization(false);

    const fileInput = document.getElementById(
      "digital-certificate"
    );

    if (fileInput) {
      fileInput.value = "";
    }

    alert(data.message);
  } catch (error) {
    alert(
      error.response?.data?.message ||
        "No se pudo enviar el certificado digital"
    );
  } finally {
    setUploadingCertificate(false);
  }
};

const getRequestStatus = () => {
  const statuses = {
    not_requested: {
      label: "No solicitado",
      className: "not-requested",
    },
    pending: {
      label: "Solicitud recibida",
      className: "pending",
    },
    in_review: {
      label: "En revisión",
      className: "review",
    },
    configured: {
      label: "Configuración técnica",
      className: "configured",
    },
    active: {
      label: "Emisión electrónica activa",
      className: "active",
    },
    rejected: {
      label: "Requiere corrección",
      className: "rejected",
    },
  };

  return (
    statuses[ecfRequest?.status] ||
    statuses.not_requested
  );
};

const ecfStatus = getRequestStatus();
const requestIsProcessing = [
  "pending",
  "in_review",
  "configured",
  "active",
].includes(ecfRequest?.status);

  const savePreferences = async () => {
    try {
      const { data } = await api.patch("/auth/tenant", {
        businessName: tenant?.businessName || "",
        email: tenant?.email || "",
        address: tenant?.address || "",
        rnc: tenant?.rnc || "",
        phone: tenant?.phone || "",

        invoiceTaxEnabled: form.invoiceTaxEnabled,
        invoiceTaxMode: form.invoiceTaxMode,
        invoiceTaxRate: Number(form.invoiceTaxRate || 0),
        country: form.country,
        usStateTaxRate: Number(form.usStateTaxRate || 0),
        usCountyTaxRate: Number(form.usCountyTaxRate || 0),
        usCityTaxRate: Number(form.usCityTaxRate || 0),
      });
      
      setTenant(data.tenant);
      alert("Preferencias fiscales guardadas correctamente");
    } catch (error) {
      alert(error.response?.data?.message || "Error guardando preferencias");
    }
  };

  const usTotalTax =
    Number(form.usStateTaxRate || 0) +
    Number(form.usCountyTaxRate || 0) +
    Number(form.usCityTaxRate || 0);
 
    const taxLabel = form.country === "DO" ? "ITBIS" : "Sales Tax";

  return (
    <div className="qb-list-page">
      <div className="qb-list-header">
        <div>
          <button
            className="qb-back"
            onClick={() => navigate("/dashboard/facturacion?nueva=1")}
          >
            <ArrowLeft size={18} />
          </button>

          <h1>Preferencias fiscales</h1>
          <p>Configura el país y los impuestos que se aplicarán en tus documentos.</p>
        </div>

        <button className="qb-primary-btn" onClick={savePreferences}>
          <Save size={17} />
          Guardar cambios
        </button>
      </div>

{form.country === "DO" && (
  <div className="qb-table-card qb-preferences-card qb-certificate-card">
    <div className="qb-preferences-title">
      <FileKey2 size={22} />

      <div>
        <h3>Emisión electrónica e-CF</h3>
        <p>
          Solicita la activación de la facturación electrónica
          para tu empresa en República Dominicana.
        </p>
      </div>
    </div>

    {loadingEcfRequest ? (
      <div className="qb-ecf-loading">
        <Loader2 className="qb-spin" size={20} />
        Consultando estado de la solicitud...
      </div>
    ) : (
      <>
        <div className="qb-ecf-status-row">
          <div>
            <span
              className={`qb-ecf-status ${ecfStatus.className}`}
            >
              {ecfStatus.label}
            </span>

            {ecfRequest?.submittedAt && (
              <small>
                Solicitud enviada el{" "}
                {new Date(
                  ecfRequest.submittedAt
                ).toLocaleDateString("es-DO")}
              </small>
            )}
          </div>

          {ecfRequest?.status === "active" && (
            <CheckCircle2
              size={28}
              className="qb-ecf-active-icon"
            />
          )}
        </div>

        {ecfRequest?.certificateUploaded && (
          <div className="qb-certificate-received">
            <LockKeyhole size={20} />

            <div>
              <strong>Certificado recibido</strong>
              <small>
                {ecfRequest.certificateFileName} ·{" "}
                {(
                  Number(ecfRequest.certificateSize || 0) /
                  1024
                ).toFixed(1)}{" "}
                KB
              </small>
            </div>
          </div>
        )}

        {ecfRequest?.status === "rejected" &&
          ecfRequest?.rejectionReason && (
            <div className="qb-ecf-rejection">
              <strong>Corrección requerida:</strong>{" "}
              {ecfRequest.rejectionReason}
            </div>
          )}

        {!requestIsProcessing && (
          <div className="qb-certificate-form">
            <label className="qb-certificate-upload">
              <input
                id="digital-certificate"
                type="file"
                accept=".p12,.pfx,application/x-pkcs12"
                onChange={handleCertificateChange}
              />

              <UploadCloud size={28} />

              <div>
                <strong>
                  {certificate
                    ? certificate.name
                    : "Seleccionar certificado digital"}
                </strong>

                <small>
                  Archivos permitidos: .p12 o .pfx. Máximo
                  5 MB.
                </small>
              </div>
            </label>

            <label className="qb-certificate-password">
              Contraseña del certificado

              <input
                type="password"
                value={certificatePassword}
                onChange={(event) =>
                  setCertificatePassword(event.target.value)
                }
                placeholder="Introduce la contraseña del certificado"
                autoComplete="new-password"
                maxLength={255}
              />
            </label>

            <label className="qb-certificate-authorization">
              <input
                type="checkbox"
                checked={acceptedAuthorization}
                onChange={(event) =>
                  setAcceptedAuthorization(
                    event.target.checked
                  )
                }
              />

              <span>
               Autorizo a ÉPICA SRL a recibir y utilizar este certificado exclusivamente para
               gestionar la configuración de la emisión electrónica de mi empresa.
              </span>
            </label>

            <div className="qb-certificate-security">
              <LockKeyhole size={16} />

              <span>
                Tu certificado y su contraseña se almacenan cifrados y son tratados
                como información confidencial. Nunca serán visibles públicamente.
              </span>
            </div>

            <button
              type="button"
              className="qb-primary-btn qb-certificate-submit"
              onClick={submitCertificate}
              disabled={uploadingCertificate}
            >
              {uploadingCertificate ? (
                <>
                  <Loader2 className="qb-spin" size={18} />
                  Enviando certificado...
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  Enviar solicitud
                </>
              )}
            </button>
          </div>
        )}

        {requestIsProcessing &&
          ecfRequest?.status !== "active" && (
            <div className="qb-preference-note">
              <strong>Próximo paso:</strong> Próximo paso: el equipo de Aventra revisará tu certificado y completará
                la configuración necesaria para habilitar la emisión electrónica de tu empresa.
            </div>
          )}

        {ecfRequest?.status === "active" && (
          <div className="qb-ecf-success">
            <CheckCircle2 size={20} />
            Tu empresa está habilitada para emitir e-CF desde
            Aventra.
          </div>
        )}
      </>
    )}
  </div>
)}

{form.country !== "DO" && (
  <div className="qb-table-card qb-preferences-card">
    <div className="qb-preference-note">
      <strong>Nota:</strong> la emisión electrónica e-CF solo
      está disponible para empresas de República Dominicana.
    </div>
  </div>
)}

      <div className="qb-table-card qb-preferences-card">
        <div className="qb-preferences-title">
          <Percent size={22} />
          <div>
            <h3>Configuración de impuestos</h3>
            <p>
              En República Dominicana se usa {taxLabel}. En Estados Unidos puedes
              configurar impuesto estatal, condado y ciudad.
            </p>
          </div>
        </div>

        <div className="qb-preference-switch-row">
          <div>
            <strong>Aplicar impuestos en documentos</strong>
            <small>Activa o desactiva el cálculo de ITBIS / taxes.</small>
          </div>

          <label className="qb-image-switch">
            <input
              type="checkbox"
              checked={form.invoiceTaxEnabled}
              onChange={(e) =>
                setForm({ ...form, invoiceTaxEnabled: e.target.checked })
              }
            />
            <span>
              <b></b>
            </span>
          </label>
        </div>

        <div className="qb-form-grid">
          <label>
            País
            <select
              value={form.country}
              onChange={(e) =>
                setForm({
                  ...form,
                  country: e.target.value,
                  invoiceTaxRate: e.target.value === "DO" ? 18 : form.invoiceTaxRate,
                })
              }
              disabled={!form.invoiceTaxEnabled}
            >
              <option value="DO">República Dominicana</option>
              <option value="US">Estados Unidos</option>
            </select>
          </label>

          <label>
            Modo de impuesto
            <select
              value={form.invoiceTaxMode}
              onChange={(e) =>
                setForm({ ...form, invoiceTaxMode: e.target.value })
              }
              disabled={!form.invoiceTaxEnabled}
            >
              <option value="global">Global para todo el documento</option>
              <option value="line">Configurable por producto/línea</option>
            </select>
          </label>
        </div>

        {form.country === "DO" ? (
          <div className="qb-form-grid">
            <label>
              {taxLabel} %
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.invoiceTaxRate}
                onChange={(e) =>
                  setForm({ ...form, invoiceTaxRate: e.target.value })
                }
                disabled={!form.invoiceTaxEnabled}
              />
            </label>
          </div>
        ) : (
          <>
            <div className="qb-form-grid">
              <label>
                Impuesto estatal %
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.usStateTaxRate}
                  onChange={(e) =>
                    setForm({ ...form, usStateTaxRate: e.target.value })
                  }
                  disabled={!form.invoiceTaxEnabled}
                />
              </label>

              <label>
                Impuesto del condado %
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.usCountyTaxRate}
                  onChange={(e) =>
                    setForm({ ...form, usCountyTaxRate: e.target.value })
                  }
                  disabled={!form.invoiceTaxEnabled}
                />
              </label>

              <label>
                Impuesto de la ciudad %
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.usCityTaxRate}
                  onChange={(e) =>
                    setForm({ ...form, usCityTaxRate: e.target.value })
                  }
                  disabled={!form.invoiceTaxEnabled}
                />
              </label>
            </div>

            <div className="qb-preference-note">
              <strong>Total Sales Tax:</strong> {usTotalTax.toFixed(2)}%
            </div>
          </>
        )}

        <div className="qb-preference-note">
          <strong>Nota:</strong> estos valores serán usados por Aventra para
          calcular los impuestos según el país de la empresa.
        </div>
      </div>
    </div>
  );
}