import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  ImagePlus,
  Images,
  LoaderCircle,
  Package,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { isDominicanTenant } from "../../utils/taxConfig";
import es from "../../i18n/locales/es.json";
import en from "../../i18n/locales/en.json";
import "../../styles/product-catalog.css";

export default function ProductCatalog() {
  const { tenant, language } = useAuth();
  const isDO = isDominicanTenant(tenant);
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";
  const dictionary = language === "en" ? en : es;

  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [imageProduct, setImageProduct] = useState(null);
  const [catalogImages, setCatalogImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [mainImageUploading, setMainImageUploading] = useState(false);

  const t = (path, fallback = "", vars = {}) => {
    const value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);

    const text = value || fallback || path;

    return Object.entries(vars).reduce(
      (acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val),
      text
    );
  };

  const money = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }),
    [locale, currency]
  );

  const loadData = async () => {
    try {
      setLoading(true);

      const [settingsRes, productsRes] = await Promise.all([
        api.get("/catalog/settings"),
        api.get("/products?status=active&type=product"),
      ]);

      setSettings(settingsRes.data);
      setProducts(
        Array.isArray(productsRes.data)
          ? productsRes.data
          : productsRes.data?.data || []
      );
    } catch (error) {
      console.log(error);
      alert(t("productCatalog.alerts.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const catalogProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      if (product.showInCatalog === false) return false;
      if (Number(product.stock || 0) <= 0) return false;
      if (!term) return true;

      return (
        product.name?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const generateLink = async () => {
    try {
      setGenerating(true);
      const { data } = await api.post("/catalog/generate-link");
      setSettings(data);
    } catch (error) {
      console.log(error);
      alert(t("productCatalog.alerts.generateError"));
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (!settings?.catalogUrl) return;
    await navigator.clipboard.writeText(settings.catalogUrl);
    alert(t("productCatalog.alerts.copied"));
  };

  const resizeImageToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const maxSize = 1100;
          let { width, height } = image;
          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        };
        image.onerror = reject;
        image.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const openImageManager = async (product) => {
    try {
      setImageProduct(product);
      setCatalogImages([]);
      setImagesLoading(true);
      const { data } = await api.get(`/catalog/products/${product.id}/images`);
      setCatalogImages(data.images || []);
    } catch (error) {
      console.log(error);
      alert(t("productCatalog.images.loadError"));
      setImageProduct(null);
    } finally {
      setImagesLoading(false);
    }
  };

  const uploadCatalogImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !imageProduct) return;

    if (!file.type.startsWith("image/")) {
      alert(t("productCatalog.images.invalidImage"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(t("productCatalog.images.imageTooLarge"));
      return;
    }
    if (catalogImages.length >= 3) {
      alert(t("productCatalog.images.limitReached"));
      return;
    }

    try {
      setImageUploading(true);
      const imageDataUrl = await resizeImageToDataUrl(file);
      const { data } = await api.post(
        `/catalog/products/${imageProduct.id}/images`,
        { imageDataUrl }
      );
      setCatalogImages((current) => [...current, data.image]);
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || t("productCatalog.images.uploadError"));
    } finally {
      setImageUploading(false);
    }
  };

  const replaceMainImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !imageProduct) return;

    if (!file.type.startsWith("image/")) {
      alert(t("productCatalog.images.invalidImage"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(t("productCatalog.images.imageTooLarge"));
      return;
    }

    try {
      setMainImageUploading(true);
      const imageDataUrl = await resizeImageToDataUrl(file);
      const { data } = await api.patch(
        `/catalog/products/${imageProduct.id}/main-image`,
        { imageDataUrl }
      );

      setImageProduct((current) => ({
        ...current,
        imageDataUrl: data.imageDataUrl,
      }));

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          Number(product.id) === Number(imageProduct.id)
            ? { ...product, imageDataUrl: data.imageDataUrl }
            : product
        )
      );
    } catch (error) {
      console.log(error);
      alert(
        error.response?.data?.message ||
          t("productCatalog.images.mainUpdateError")
      );
    } finally {
      setMainImageUploading(false);
    }
  };

  const removeCatalogImage = async (imageId) => {
    if (!imageProduct) return;
    if (!window.confirm(t("productCatalog.images.deleteConfirm"))) return;

    try {
      await api.delete(`/catalog/products/${imageProduct.id}/images/${imageId}`);
      setCatalogImages((current) => current.filter((image) => image.id !== imageId));
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || t("productCatalog.images.deleteError"));
    }
  };

  return (
    <div className="catalog-admin-page">
      <section className="catalog-admin-hero">
        <div>
          <span>{t("productCatalog.title")}</span>
          <h2>{t("productCatalog.subtitle")}</h2>
          <p>{t("productCatalog.description")}</p>
        </div>

        <div className="catalog-link-card">
          <label>{t("productCatalog.linkLabel")}</label>

          <div className="catalog-link-box">
            <input
              value={
                settings?.catalogUrl ||
                t("productCatalog.generatePlaceholder")
              }
              readOnly
            />
            <button
              type="button"
              onClick={copyLink}
              disabled={!settings?.catalogUrl}
            >
              <Copy size={17} />
            </button>
          </div>

          <div className="catalog-link-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={generateLink}
              disabled={generating}
            >
              <RefreshCcw size={17} />
              {settings?.catalogUrl
                ? t("productCatalog.regenerate")
                : generating
                ? t("productCatalog.generating")
                : t("productCatalog.generate")}
            </button>

            {settings?.catalogUrl && (
              <a
                href={settings.catalogUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-btn"
              >
                <ExternalLink size={17} />
                {t("productCatalog.viewCatalog")}
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="catalog-admin-panel">
        <div className="catalog-admin-toolbar">
          <div>
            <h3>{t("productCatalog.preview")}</h3>
            <p>
              {t("productCatalog.visibleProducts", "", {
                count: catalogProducts.length,
              })}
            </p>
          </div>

          <div className="catalog-search">
            <Search size={18} />
            <input
              placeholder={t("productCatalog.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="catalog-empty">{t("productCatalog.loading")}</div>
        ) : catalogProducts.length === 0 ? (
          <div className="catalog-empty">{t("productCatalog.empty")}</div>
        ) : (
          <div className="catalog-admin-grid">
            {catalogProducts.map((product) => (
              <article className="catalog-admin-card" key={product.id}>
                <div className="catalog-admin-image">
                  {product.imageDataUrl ? (
                    <img src={product.imageDataUrl} alt={product.name} />
                  ) : (
                    <ImagePlus size={32} />
                  )}
                </div>

                <div>
                  <span>
                    {product.category || t("productCatalog.defaultCategory")}
                  </span>
                  <h4>{product.name}</h4>
                  <div className="catalog-product-footer">
                    <strong>{money.format(Number(product.salePrice || 0))}</strong>

                    <small className="catalog-stock">
                      {t("productCatalog.availableStock", "", {
                        stock: Number(product.stock || 0),
                      })}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="catalog-manage-images-button"
                    onClick={() => openImageManager(product)}
                  >
                    <Images size={17} />
                    {t("productCatalog.images.manage")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {imageProduct && (
        <div className="catalog-image-manager-overlay" onClick={() => setImageProduct(null)}>
          <section className="catalog-image-manager" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>{t("productCatalog.images.title")}</span>
                <h3>{imageProduct.name}</h3>
                <p>{t("productCatalog.images.help")}</p>
              </div>
              <button type="button" onClick={() => setImageProduct(null)} aria-label={t("productCatalog.images.close")}>
                <X size={21} />
              </button>
            </header>

            {imagesLoading ? (
              <div className="catalog-images-loading"><LoaderCircle size={26} className="spin" /></div>
            ) : (
              <div className="catalog-images-manager-grid">
                <article className="catalog-manager-image is-main">
                  {imageProduct.imageDataUrl ? (
                    <img src={imageProduct.imageDataUrl} alt={imageProduct.name} />
                  ) : (
                    <ImagePlus size={34} />
                  )}
                  <span>{t("productCatalog.images.main")}</span>
                  <label className={`catalog-replace-main ${mainImageUploading ? "is-loading" : ""}`}>
                    {mainImageUploading ? (
                      <LoaderCircle size={17} className="spin" />
                    ) : (
                      <Upload size={17} />
                    )}
                    {mainImageUploading
                      ? t("productCatalog.images.uploading")
                      : t("productCatalog.images.replace")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={replaceMainImage}
                      disabled={mainImageUploading}
                    />
                  </label>
                </article>

                {catalogImages.map((image, index) => (
                  <article className="catalog-manager-image" key={image.id}>
                    <img src={image.imageDataUrl} alt={`${imageProduct.name} ${index + 2}`} />
                    <span>{t("productCatalog.images.additional", "", { number: index + 2 })}</span>
                    <button type="button" onClick={() => removeCatalogImage(image.id)} aria-label={t("productCatalog.images.delete")}>
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))}

                {catalogImages.length < 3 && (
                  <label className={`catalog-image-upload ${imageUploading ? "is-loading" : ""}`}>
                    {imageUploading ? <LoaderCircle size={28} className="spin" /> : <Upload size={28} />}
                    <strong>{imageUploading ? t("productCatalog.images.uploading") : t("productCatalog.images.add")}</strong>
                    <small>{t("productCatalog.images.remaining", "", { count: 3 - catalogImages.length })}</small>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCatalogImage} disabled={imageUploading} />
                  </label>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      <section className="catalog-note">
        <Package size={19} />
        <p>{t("productCatalog.note")}</p>
      </section>
    </div>
  );
}