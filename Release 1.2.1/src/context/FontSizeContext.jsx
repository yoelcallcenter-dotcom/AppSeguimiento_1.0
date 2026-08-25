import React, { createContext, useContext, useState, useEffect } from "react";

const FontSizeContext = createContext({
  fontSize: "medium",
  setFontSize: () => {},
});

export function FontSizeProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(() => {
    return localStorage.getItem("app-font-size") || "medium";
  });

  useEffect(() => {
    localStorage.setItem("app-font-size", fontSize);
    const sizeMap = {
      small: "14px",
      medium: "16px",
      large: "18px",
    };
    document.documentElement.style.fontSize = sizeMap[fontSize] || "16px";
    document.documentElement.style.setProperty(
      "--font-size-base",
      sizeMap[fontSize] || "16px"
    );
  }, [fontSize]);

  const setFontSize = (newSize) => {
    if (["small", "medium", "large"].includes(newSize)) {
      setFontSizeState(newSize);
    }
  };

  const value = { fontSize, setFontSize };

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error("useFontSize must be used within a FontSizeProvider");
  }
  return context;
}
