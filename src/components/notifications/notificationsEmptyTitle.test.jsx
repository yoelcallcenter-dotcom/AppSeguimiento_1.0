import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { NotificationBell } from "./NotificationBell";
import { NotificationCenter } from "./NotificationCenter";
import useNotificationStore from "../../core/notifications/notificationStore";

// 1.10.1-fix: alertsSystem emite notificaciones con title vacío y el texto en
// `message`. Antes se renderizaba un título vacío con el punto de no leído
// suelto encima y el mensaje en una segunda línea desalineada. Ahora el título
// solo se pinta si existe; si no, el punto va inline con el mensaje. Este test
// mínimo cubre ese caso para ambos componentes (campana + Centro).
describe("notificaciones con title vacío", () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [
        {
          id: "n1",
          title: "",
          message: "Evento proximo: reunión en 3h",
          type: "warning",
          priority: "low",
          timestamp: Date.now(),
          read: false,
          dismissed: false,
        },
      ],
      showBellDropdown: true,
      showCenter: false,
    });
  });

  it("NotificationBell muestra el mensaje aunque title sea vacío", () => {
    render(<NotificationBell />);
    expect(screen.getByText("Evento proximo: reunión en 3h")).toBeTruthy();
  });

  it("NotificationCenter muestra el mensaje aunque title sea vacío", () => {
    useNotificationStore.setState({ showBellDropdown: false, showCenter: true });
    render(<NotificationCenter />);
    expect(screen.getByText("Evento proximo: reunión en 3h")).toBeTruthy();
  });
});
