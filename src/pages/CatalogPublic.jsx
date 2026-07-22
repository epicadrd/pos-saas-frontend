import { useEffect, useMemo, useState } from "react";
import {
  ImagePlus,
  Images,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { api } from "../api/axios";
import es from "../i18n/locales/es.json";
import en from "../i18n/locales/en.json";
import "../styles/product-catalog.css";

const getCartKey = (token) => `aventra_catalog_cart_${token}`;

const normalizeWhatsAppPhone = (phone, isDO) => {
  let digits = String(phone || "").replace(/\D/g, "");

  if (isDO) {
    if (digits.length === 10) digits = `1${digits}`;
    if (digits.length === 11 && !digits.startsWith("1")) return "";
  }

  return digits.length >= 8 && digits.length <= 15 ? digits : "";
};

export default function CatalogPublic() {
  const { token } = useParams();
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailImageIndex, setDetailImageIndex] = useState(0);

  const isDO = (business?.country || "DO") === "DO";
  const locale = isDO ? "es-DO" : "en-US";
  const currency = isDO ? "DOP" : "USD";
  const dictionary = isDO ? es : en;

  const t = (path, fallback = "", vars = {}) => {
    const value = path
      .split(".")
      .reduce((acc, key) => acc?.[key], dictionary);
    const text = value || fallback || path;

    return Object.entries(vars).reduce(
      (result, [key, val]) =>
        result.replaceAll(`{{${key}}}`, String(val)),
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

  useEffect(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem(getCartKey(token)) || "[]");
      setCart(Array.isArray(savedCart) ? savedCart : []);
    } catch {
      setCart([]);
    } finally {
      setCartReady(true);
    }
  }, [token]);

  useEffect(() => {
    if (!cartReady) return;
    localStorage.setItem(getCartKey(token), JSON.stringify(cart));
  }, [cart, cartReady, token]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/catalog/public/${token}`);
        const availableProducts = data.products || [];

        setBusiness(data.business);
        setProducts(availableProducts);
        setCart((currentCart) =>
          currentCart
            .map((item) => {
              const currentProduct = availableProducts.find(
                (product) => Number(product.id) === Number(item.id)
              );

              if (!currentProduct || Number(currentProduct.stock || 0) <= 0) {
                return null;
              }

              return {
                id: currentProduct.id,
                name: currentProduct.name,
                salePrice: Number(currentProduct.salePrice || 0),
                imageDataUrl: currentProduct.imageDataUrl || null,
                stock: Number(currentProduct.stock || 0),
                quantity: Math.min(
                  Math.max(Number(item.quantity || 1), 1),
                  Number(currentProduct.stock || 0)
                ),
              };
            })
            .filter(Boolean)
        );
      } catch (requestError) {
        console.log(requestError);
        setError(t("catalogPublic.unavailable"));
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, [token]);

  useEffect(() => {
    const modalOpen = cartOpen || Boolean(detailProduct);
    document.body.classList.toggle("catalog-cart-open", modalOpen);
    return () => document.body.classList.remove("catalog-cart-open");
  }, [cartOpen, detailProduct]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setCartOpen(false);
        setDetailProduct(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter(
      (product) =>
        product.name?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term)
    );
  }, [products, search]);

  const cartCount = useMemo(
    () => cart.reduce((total, item) => total + Number(item.quantity || 0), 0),
    [cart]
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + Number(item.salePrice || 0) * Number(item.quantity || 0),
        0
      ),
    [cart]
  );

  const addToCart = (product) => {
    const availableStock = Number(product.stock || 0);
    if (availableStock <= 0) return;

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => Number(item.id) === Number(product.id)
      );

      if (existingItem) {
        if (existingItem.quantity >= availableStock) return currentCart;

        return currentCart.map((item) =>
          Number(item.id) === Number(product.id)
            ? {
                ...item,
                stock: availableStock,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          id: product.id,
          name: product.name,
          salePrice: Number(product.salePrice || 0),
          imageDataUrl: product.imageDataUrl || null,
          stock: availableStock,
          quantity: 1,
        },
      ];
    });
  };

  const changeQuantity = (productId, amount) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (Number(item.id) !== Number(productId)) return item;

          const nextQuantity = Math.min(
            Number(item.stock || 0),
            Number(item.quantity || 0) + amount
          );

          return nextQuantity > 0
            ? { ...item, quantity: nextQuantity }
            : null;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => Number(item.id) !== Number(productId))
    );
  };

  const getProductImages = (product) => {
    const images = [];
    if (product?.imageDataUrl) images.push(product.imageDataUrl);
    (product?.catalogImages || []).forEach((image) => {
      if (image.imageDataUrl) images.push(image.imageDataUrl);
    });
    return images;
  };

  const openProductDetail = (product) => {
    setDetailProduct(product);
    setDetailImageIndex(0);
  };

  const moveDetailImage = (direction) => {
    const images = getProductImages(detailProduct);
    if (images.length <= 1) return;
    setDetailImageIndex((current) =>
      (current + direction + images.length) % images.length
    );
  };

  const sendToWhatsApp = () => {
    if (!cart.length) return;

    const phone = normalizeWhatsAppPhone(business?.phone, isDO);

    if (!phone) {
      window.alert(t("catalogPublic.cart.phoneUnavailable"));
      return;
    }

    const productLines = cart.map((item) => {
      const lineTotal = Number(item.salePrice || 0) * Number(item.quantity || 0);
      return `• ${item.quantity} x ${item.name} — ${money.format(lineTotal)}`;
    });

    const message = [
      t("catalogPublic.cart.whatsappGreeting"),
      "",
      ...productLines,
      "",
      `${t("catalogPublic.cart.total")}: ${money.format(cartTotal)}`,
      "",
      t("catalogPublic.cart.confirmationNotice"),
    ].join("\n");

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (loading) {
    return <div className="public-catalog-state">{t("catalogPublic.loading")}</div>;
  }

  if (error) {
    return <div className="public-catalog-state">{error}</div>;
  }

  return (
    <main
      className="public-catalog-page"
      style={{ "--catalog-accent": business?.primaryColor || "#111827" }}
    >
      <header className="public-catalog-header">
        <div className="public-catalog-brand">
          {business?.logoDataUrl ? (
            <img src={business.logoDataUrl} alt={business.businessName} />
          ) : (
            <div>{business?.businessName?.charAt(0) || "C"}</div>
          )}

          <section>
            <span>{t("catalogPublic.title")}</span>
            <h1>{business?.businessName || t("catalogPublic.fallbackTitle")}</h1>
            <p>{business?.address || t("catalogPublic.defaultAddress")}</p>
          </section>
        </div>

        <div className="public-catalog-actions">
          <div className="public-catalog-search">
            <Search size={18} />
            <input
              placeholder={t("catalogPublic.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="catalog-cart-button"
            onClick={() => setCartOpen(true)}
            aria-label={t("catalogPublic.cart.open")}
          >
            <ShoppingCart size={20} />
            <span>{t("catalogPublic.cart.title")}</span>
            {cartCount > 0 && <strong>{cartCount}</strong>}
          </button>
        </div>
      </header>

      {filteredProducts.length === 0 ? (
        <div className="catalog-empty">{t("catalogPublic.empty")}</div>
      ) : (
        <section className="public-catalog-grid">
          {filteredProducts.map((product) => {
            const cartItem = cart.find(
              (item) => Number(item.id) === Number(product.id)
            );
            const maxReached =
              Number(cartItem?.quantity || 0) >= Number(product.stock || 0);

            return (
              <article className="public-product-card" key={product.id}>
                <button
                  type="button"
                  className="public-product-image"
                  onClick={() => openProductDetail(product)}
                  aria-label={t("catalogPublic.details.open", "", { name: product.name })}
                >
                  {product.imageDataUrl ? (
                    <img src={product.imageDataUrl} alt={product.name} />
                  ) : (
                    <ImagePlus size={34} />
                  )}
                  <span className="catalog-view-detail">{t("catalogPublic.details.view")}</span>
                  {getProductImages(product).length > 1 && (
                    <span className="catalog-image-count"><Images size={14} /> {getProductImages(product).length}</span>
                  )}
                </button>

                <div className="public-product-info">
                  <span>
                    {product.category || t("catalogPublic.defaultCategory")}
                  </span>
                  <h2>{product.name}</h2>
                  {product.description && <p>{product.description}</p>}

                  <div className="catalog-product-footer">
                    <strong>{money.format(Number(product.salePrice || 0))}</strong>
                    <small className="catalog-stock">
                      {t("catalogPublic.availableStock", "", {
                        stock: Number(product.stock || 0),
                      })}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="catalog-add-button"
                    onClick={() => addToCart(product)}
                    disabled={maxReached}
                  >
                    <ShoppingCart size={17} />
                    {maxReached
                      ? t("catalogPublic.cart.maxReached")
                      : t("catalogPublic.cart.add")}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {detailProduct && (() => {
        const detailImages = getProductImages(detailProduct);
        const detailCartItem = cart.find((item) => Number(item.id) === Number(detailProduct.id));
        const maxReached = Number(detailCartItem?.quantity || 0) >= Number(detailProduct.stock || 0);

        return (
          <div className="catalog-detail-overlay" onClick={() => setDetailProduct(null)}>
            <section className="catalog-detail-modal" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="catalog-detail-close" onClick={() => setDetailProduct(null)} aria-label={t("catalogPublic.details.close")}>
                <X size={22} />
              </button>

              <div className="catalog-detail-gallery">
                {detailImages.length ? (
                  <img src={detailImages[detailImageIndex]} alt={`${detailProduct.name} ${detailImageIndex + 1}`} />
                ) : (
                  <div className="catalog-detail-placeholder"><ImagePlus size={52} /></div>
                )}

                {detailImages.length > 1 && (
                  <>
                    <button type="button" className="catalog-gallery-arrow is-left" onClick={() => moveDetailImage(-1)} aria-label={t("catalogPublic.details.previous")}>
                      <ChevronLeft size={24} />
                    </button>
                    <button type="button" className="catalog-gallery-arrow is-right" onClick={() => moveDetailImage(1)} aria-label={t("catalogPublic.details.next")}>
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                {detailImages.length > 1 && (
                  <div className="catalog-gallery-dots">
                    {detailImages.map((_, index) => (
                      <button key={index} type="button" className={index === detailImageIndex ? "is-active" : ""} onClick={() => setDetailImageIndex(index)} aria-label={`${index + 1}`} />
                    ))}
                  </div>
                )}
              </div>

              <div className="catalog-detail-content">
                <span>{detailProduct.category || t("catalogPublic.defaultCategory")}</span>
                <h2>{detailProduct.name}</h2>
                <strong>{money.format(Number(detailProduct.salePrice || 0))}</strong>
                <small className="catalog-stock">{t("catalogPublic.availableStock", "", { stock: Number(detailProduct.stock || 0) })}</small>
                <div className="catalog-detail-description">
                  <h3>{t("catalogPublic.details.description")}</h3>
                  <p>{detailProduct.description || t("catalogPublic.details.noDescription")}</p>
                </div>
                <button type="button" className="catalog-add-button" onClick={() => addToCart(detailProduct)} disabled={maxReached}>
                  <ShoppingCart size={18} />
                  {maxReached ? t("catalogPublic.cart.maxReached") : t("catalogPublic.cart.add")}
                </button>
              </div>
            </section>
          </div>
        );
      })()}

      {cartOpen && (
        <div className="catalog-cart-overlay" onClick={() => setCartOpen(false)}>
          <aside
            className="catalog-cart-drawer"
            onClick={(event) => event.stopPropagation()}
            aria-label={t("catalogPublic.cart.title")}
          >
            <div className="catalog-cart-header">
              <div>
                <span>{t("catalogPublic.cart.orderSummary")}</span>
                <h2>{t("catalogPublic.cart.title")}</h2>
              </div>
              <button type="button" onClick={() => setCartOpen(false)}>
                <X size={22} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="catalog-cart-empty">
                <ShoppingCart size={42} />
                <p>{t("catalogPublic.cart.empty")}</p>
                <button type="button" onClick={() => setCartOpen(false)}>
                  {t("catalogPublic.cart.continueShopping")}
                </button>
              </div>
            ) : (
              <>
                <div className="catalog-cart-items">
                  {cart.map((item) => (
                    <article className="catalog-cart-item" key={item.id}>
                      <div className="catalog-cart-item-image">
                        {item.imageDataUrl ? (
                          <img src={item.imageDataUrl} alt={item.name} />
                        ) : (
                          <ImagePlus size={24} />
                        )}
                      </div>

                      <div className="catalog-cart-item-info">
                        <h3>{item.name}</h3>
                        <strong>
                          {money.format(item.salePrice * item.quantity)}
                        </strong>

                        <div className="catalog-cart-quantity">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, -1)}
                            aria-label={t("catalogPublic.cart.decrease")}
                          >
                            <Minus size={15} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, 1)}
                            disabled={item.quantity >= item.stock}
                            aria-label={t("catalogPublic.cart.increase")}
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="catalog-cart-remove"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={t("catalogPublic.cart.remove")}
                      >
                        <Trash2 size={18} />
                      </button>
                    </article>
                  ))}
                </div>

                <div className="catalog-cart-summary">
                  <div>
                    <span>{t("catalogPublic.cart.total")}</span>
                    <strong>{money.format(cartTotal)}</strong>
                  </div>
                  <p>{t("catalogPublic.cart.confirmationNotice")}</p>
                  <button
                    type="button"
                    className="catalog-whatsapp-button"
                    onClick={sendToWhatsApp}
                  >
                    <MessageCircle size={20} />
                    {t("catalogPublic.cart.sendWhatsApp")}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {cartCount > 0 && !cartOpen && (
        <button
          type="button"
          className="catalog-floating-cart"
          onClick={() => setCartOpen(true)}
        >
          <ShoppingCart size={20} />
          <span>{t("catalogPublic.cart.viewCart")}</span>
          <strong>{cartCount}</strong>
        </button>
      )}
    </main>
  );
}