// src/disciplines.js

// 🔹 Groupes de disciplines et leurs options
export const DISCIPLINES = [
  {
    label: "Light Contact",
    options: [
      { value: "LightContact", label: "Light Contact" },
      { value: "KickLight", label: "Kick Light" },
      { value: "K1Light", label: "K1 Light" },
    ],
  },
  {
    label: "Full Contact",
    options: [
      { value: "LowKick", label: "Low Kick" },
      { value: "FullContact", label: "Full Contact" },
      { value: "K1", label: "K1" },
    ],
  },
];

// 🔹 Tous les types pour filtres ou dropdowns
export const LIGHT_TYPES = ["LightContact", "KickLight", "K1Light"];
export const FULL_TYPES = ["FullContact", "LowKick", "K1"];
export const ALL_TYPES = ["Tous", ...LIGHT_TYPES, ...FULL_TYPES];

// 🔹 Couleurs associées aux types de combat
export const TYPE_COLORS = {
  LightContact: "#ffd700",
  KickLight: "#1e90ff",
  K1Light: "#ff7f50",
  FullContact: "#8b0000",
  LowKick: "#32cd32",
  K1: "#535353",
};

// 🔹 Icônes des types de combat
export const TYPE_ICONS = {
  LightContact: "⚡ LightContact",
  KickLight: "🥷 KickLight",
  K1Light: "🔥 K1Light",
  FullContact: "💥 FullContact",
  LowKick: "🥊 LowKick",
  K1: "⚡ K1",
};

// 🔹 Icônes des casques
export const HELMET_ICONS = {
  Rouge: "/images/casque_rouge.png",
  Bleu: "/images/casque_bleu.png",
};
