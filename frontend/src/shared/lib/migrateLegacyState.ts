export const migrateLegacyState = () => {
  const oldLang = localStorage.getItem("lang");
  if (oldLang === "en" || oldLang === "es") {
    localStorage.setItem("lang", oldLang);
  } else {
    localStorage.setItem("lang", "es");
  }

  const tutorialKeys = [
    "tutorial_done",
    "tut_main_seen",
    "tut_ctf_seen",
    "tut_learn_seen"
  ];

  if (tutorialKeys.some((key) => localStorage.getItem(key))) {
    localStorage.setItem("tutorial_done_/", "1");
  }
};
