/** Catégories d'émojis du sélecteur (ALUM-260). Liste choisie, embarquée : aucun appel réseau. */
export interface CategorieEmoji {
  cle: string;
  libelle: string;
  /** Émoji affiché sur l'onglet de la catégorie. */
  icone: string;
  emojis: readonly string[];
}

const liste = (s: string): readonly string[] => s.trim().split(/\s+/);

export const CATEGORIES_EMOJI: readonly CategorieEmoji[] = [
  {
    cle: 'smileys',
    libelle: 'Smileys et émotions',
    icone: '😀',
    emojis: liste(`
      😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔
      🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕
      😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 💀 🤡 👻
    `),
  },
  {
    cle: 'gestes',
    libelle: 'Gestes et personnes',
    icone: '👍',
    emojis: liste(`
      👍 👎 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💪 🫶 🫡
      👀 🧠 👶 🧒 👦 👧 🧑 👨 👩 🧓 👴 👵 🧑‍🎓 👨‍🎓 👩‍🎓 🧑‍🏫 👨‍🏫 👩‍🏫 🧑‍💻 👨‍💻 👩‍💻 🧑‍💼 👨‍💼 👩‍💼 🧑‍🔬 🧑‍⚕️ 🙋 🙇 🤷 🤦
    `),
  },
  {
    cle: 'coeurs',
    libelle: 'Cœurs et symboles',
    icone: '❤️',
    emojis: liste(`
      ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 ✨ ⭐ 🌟 💫 🔥 💯 ✅ ☑️ ✔️ ❌ ❗ ❓
      ⚠️ 🚫 💤 💬 💭 🗨️ 📢 🔔 🆗 🆕 🔝 ➡️ ⬅️ ⬆️ ⬇️ 🔁 ➕ ➖ ✖️ 💲
    `),
  },
  {
    cle: 'fete',
    libelle: 'Célébrations',
    icone: '🎉',
    emojis: liste(`
      🎉 🎊 🥳 🎈 🎁 🎂 🍰 🏆 🥇 🥈 🥉 🏅 🎖️ 🎓 🎯 🎵 🎶 🎤 🎧 🎬 📸 🎨 🎮 ⚽ 🏀 🏐 🎾 🏃 💃 🕺
    `),
  },
  {
    cle: 'etudes',
    libelle: 'Études et travail',
    icone: '📚',
    emojis: liste(`
      📚 📖 📝 ✏️ 🖊️ 📎 📌 📍 📏 📐 🗂️ 📁 📂 📄 📃 📑 📊 📈 📉 🗓️ 📅 ⏰ ⏳ ⌛ 💡 🔍 🔎 🧪 🔬 🧮
      💻 🖥️ ⌨️ 🖱️ 📱 ☎️ 📞 📧 ✉️ 📨 📬 💼 🏢 🏫 🏛️ 🧳 💰 💳 🤝 🚀
    `),
  },
  {
    cle: 'nature',
    libelle: 'Nature et nourriture',
    icone: '🌍',
    emojis: liste(`
      🌍 🌞 🌙 ⛅ 🌧️ ⛈️ 🌈 ❄️ 🌊 🌴 🌳 🌱 🌸 🌻 🌹 🍀 🐶 🐱 🦁 🐘 🦒 🐒 🐦 🐟 🦋 🐝
      ☕ 🍵 🥤 🍕 🍔 🍟 🌮 🍗 🍚 🥗 🍞 🥐 🍉 🍊 🍌 🍍 🥭 🍎 🍓 🍇 🍫 🍪 🍩 🍿
    `),
  },
  {
    cle: 'lieux',
    libelle: 'Voyages et lieux',
    icone: '✈️',
    emojis: liste(`
      ✈️ 🚗 🚕 🚌 🚆 🚲 🛵 ⛵ 🚢 🗺️ 🧭 🏠 🏡 🏙️ 🌆 🏖️ 🏝️ ⛰️ 🕌 ⛪ 🇸🇳 🌐 🏁 🚩
    `),
  },
];

export const CLE_RECENTS = 'alumni.emojis.recents';
export const MAX_RECENTS = 24;
