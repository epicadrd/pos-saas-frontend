import { useEffect } from "react";
import { translateText, normalizeLanguage } from "./translations";

const translatedNodes = new WeakMap();
const translatedAttributes = new WeakMap();

const ATTRIBUTES_TO_TRANSLATE = ["placeholder", "title", "aria-label", "alt"];

const shouldSkipNode = (node) => {
  const parent = node.parentElement;
  if (!parent) return true;

  const tag = parent.tagName?.toLowerCase();

  return [
    "script",
    "style",
    "textarea",
    "code",
    "pre",
    "input",
    "select",
    "option",
  ].includes(tag);
};

const translateTextNode = (node, language) => {
  if (!node || shouldSkipNode(node)) return;

  const original = translatedNodes.get(node) ?? node.nodeValue;
  const cleanOriginal = String(original || "").replace(/\s+/g, " ").trim();

  if (!cleanOriginal) return;

  if (!translatedNodes.has(node)) {
    translatedNodes.set(node, original);
  }

  const translated =
    language === "es" ? original : String(original).replace(cleanOriginal, translateText(cleanOriginal, language));

  if (node.nodeValue !== translated) {
    node.nodeValue = translated;
  }
};

const translateElementAttributes = (element, language) => {
  if (!element?.getAttribute) return;

  ATTRIBUTES_TO_TRANSLATE.forEach((attribute) => {
    const current = element.getAttribute(attribute);
    if (!current) return;

    let originals = translatedAttributes.get(element);

    if (!originals) {
      originals = {};
      translatedAttributes.set(element, originals);
    }

    if (!originals[attribute]) {
      originals[attribute] = current;
    }

    const nextValue =
      language === "es"
        ? originals[attribute]
        : translateText(originals[attribute], language);

    if (element.getAttribute(attribute) !== nextValue) {
      element.setAttribute(attribute, nextValue);
    }
  });
};

const walkAndTranslate = (root, language) => {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    translateTextNode(node, language);
    node = walker.nextNode();
  }

  if (root.querySelectorAll) {
    root.querySelectorAll("*").forEach((element) => {
      translateElementAttributes(element, language);
    });
  }
};

export default function AutoTranslator({ language }) {
  useEffect(() => {
    const selectedLanguage = normalizeLanguage(language);

    let isTranslating = false;

    const run = () => {
      if (isTranslating) return;

      isTranslating = true;
      walkAndTranslate(document.body, selectedLanguage);
      isTranslating = false;
    };

    run();

    const observer = new MutationObserver((mutations) => {
      if (isTranslating) return;

      isTranslating = true;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node, selectedLanguage);
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            walkAndTranslate(node, selectedLanguage);
          }
        });
      });

      isTranslating = false;
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}