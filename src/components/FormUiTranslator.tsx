import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useFormLanguage } from "@/contexts/FormLanguageContext";
import { msFormUi, supportsFormTranslation } from "@/lib/formLanguage";

const translatedNodes = new Map<Text, string>();
const translatedAttributes = new Map<Element, Map<string, string>>();

const translateTextNode = (node: Text) => {
  const original = translatedNodes.get(node) ?? node.nodeValue ?? "";
  const trimmed = original.trim();
  const translated = msFormUi[trimmed];
  if (!translated) return;
  if (!translatedNodes.has(node)) translatedNodes.set(node, original);
  node.nodeValue = original.replace(trimmed, translated);
};

const translateSingleElement = (element: Element) => {
  if (["SCRIPT", "STYLE"].includes(element.tagName)) return;
  element.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) translateTextNode(child as Text);
  });
  ["placeholder", "title", "aria-label"].forEach(attribute => {
    const original = element.getAttribute(attribute);
    if (!original || !msFormUi[original]) return;
    let attributes = translatedAttributes.get(element);
    if (!attributes) {
      attributes = new Map();
      translatedAttributes.set(element, attributes);
    }
    if (!attributes.has(attribute)) attributes.set(attribute, original);
    element.setAttribute(attribute, msFormUi[original]);
  });
};

const translateElement = (element: Element) => {
  translateSingleElement(element);
  element.querySelectorAll("*").forEach(translateSingleElement);
};

const restoreEnglish = () => {
  translatedNodes.forEach((original, node) => {
    if (node.isConnected) node.nodeValue = original;
  });
  translatedAttributes.forEach((attributes, element) => {
    if (!element.isConnected) return;
    attributes.forEach((original, attribute) => element.setAttribute(attribute, original));
  });
  translatedNodes.clear();
  translatedAttributes.clear();
};

const FormUiTranslator = () => {
  const { pathname } = useLocation();
  const { language } = useFormLanguage();

  useEffect(() => {
    restoreEnglish();
    if (
      language !== "ms"
      || !supportsFormTranslation(pathname)
      || [
        "/hr/car-rental", "/hr/leave", "/hr/ppe-request",
        "/finance/claim", "/finance/receipt-upload",
        "/it/cctv-access-request", "/it/help-desk", "/it/request-admin", "/it/request-application",
      ].includes(pathname)
    ) return;

    translateElement(document.body);
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);
          if (node.nodeType === Node.ELEMENT_NODE) translateElement(node as Element);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      restoreEnglish();
    };
  }, [language, pathname]);

  return null;
};

export default FormUiTranslator;
