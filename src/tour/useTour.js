import { useContext } from "react";
import { TourContext } from "./TourContext";

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour debe usarse dentro de un <TourProvider>");
  }
  return ctx;
}
