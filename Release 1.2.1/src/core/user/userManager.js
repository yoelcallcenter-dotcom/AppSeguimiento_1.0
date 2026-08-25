/**
 * userManager.js
 * Gestor de usuario
 * Responsabilidad: Manejar datos del usuario y preferencias
 */

import { storageManager } from "../storage/storageManager";

const USER_KEY = "user-preferences";

class UserManager {
  constructor() {
    this.user = {
      name: "",
      email: "",
      backupFrequency: "diario",
    };
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    const saved = await storageManager.get(USER_KEY, {});
    this.user = {
      name: saved.name || "",
      email: saved.email || "",
      backupFrequency: saved.backupFrequency || "diario",
    };
    this.initialized = true;
  }

  async save() {
    await storageManager.set(USER_KEY, this.user);
  }

  // ============ GETTERS ============
  getName() {
    return this.user.name || "";
  }

  getEmail() {
    return this.user.email || "";
  }

  getBackupFrequency() {
    return this.user.backupFrequency || "diario";
  }

  // ============ SETTERS ============
  async setName(name) {
    this.user.name = name;
    await this.save();
  }

  async setEmail(email) {
    this.user.email = email;
    await this.save();
  }

  async setBackupFrequency(frequency) {
    this.user.backupFrequency = frequency;
    await this.save();
  }

  // ============ UTILIDADES ============
  async syncFromGoogle(email) {
    if (email) {
      this.user.email = email;
      if (!this.user.name) {
        this.user.name = email.split("@")[0];
      }
      await this.save();
    }
  }

  getFullUser() {
    return { ...this.user };
  }
}

export const userManager = new UserManager();
