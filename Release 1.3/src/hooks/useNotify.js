import { useCallback } from "react";
import { notificationManager } from "../core/notifications/notificationManager";

export function useNotify() {
  const notify = useCallback((event) => {
    return notificationManager.notify(event);
  }, []);

  const success = useCallback((title, message, options = {}) => {
    return notificationManager.notify({
      type: "success",
      title,
      message,
      priority: "low",
      ...options,
    });
  }, []);

  const error = useCallback((title, message, options = {}) => {
    return notificationManager.notify({
      type: "error",
      title,
      message,
      priority: "high",
      ...options,
    });
  }, []);

  const warning = useCallback((title, message, options = {}) => {
    return notificationManager.notify({
      type: "warning",
      title,
      message,
      priority: "medium",
      ...options,
    });
  }, []);

  const info = useCallback((title, message, options = {}) => {
    return notificationManager.notify({
      type: "info",
      title,
      message,
      priority: "low",
      ...options,
    });
  }, []);

  return { notify, success, error, warning, info };
}
