import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStudyHistory,
  getFavoriteStudies,
  getStudyHistory,
  isStudyFavorite,
  recordStudyHistory,
  removeStudyFavorite,
  toggleStudyFavorite,
} from "@/lib/client/studyLibrary";

const STUDY = {
  slug: "nicodemos-joao-3",
  title: "Nicodemos",
  summary: "Um estudo sobre Nicodemos.",
  reference: "Jo\u00e3o 3",
};

describe("studyLibrary", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("adiciona e remove um favorito", () => {
    expect(isStudyFavorite(STUDY.slug)).toBe(false);

    expect(toggleStudyFavorite(STUDY)).toBe(true);
    expect(isStudyFavorite(STUDY.slug)).toBe(true);
    expect(getFavoriteStudies()).toHaveLength(1);

    removeStudyFavorite(STUDY.slug);
    expect(isStudyFavorite(STUDY.slug)).toBe(false);
  });

  it("mantem o historico sem duplicar o mesmo estudo", () => {
    recordStudyHistory(STUDY);
    recordStudyHistory(STUDY);

    expect(getStudyHistory()).toHaveLength(1);
    expect(getStudyHistory()[0].slug).toBe(STUDY.slug);

    clearStudyHistory();
    expect(getStudyHistory()).toEqual([]);
  });
});