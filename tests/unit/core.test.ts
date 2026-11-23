import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { baseUsername, uniqueUsername } from "../../src/lib/username";
import { calcOverall, calcSubject, rankMap } from "../../src/lib/marks";
import { toEthiopian } from "../../src/lib/calendar";
import { canReadStudent, canWriteMarks, canManageSchool } from "../../src/lib/types";
import en from "../../messages/en";
import om from "../../messages/om";
import am from "../../messages/am";

describe("usernames", () => {
  it("builds first.father and numbers collisions", () => {
    assert.equal(baseUsername("Abebe", "Kebede"), "abebe.kebede");
    assert.equal(baseUsername("Chaltu!", "Megersa"), "chaltu.megersa");
    const taken = new Set(["abebe.kebede"]);
    assert.equal(uniqueUsername("abebe.kebede", taken), "abebe.kebede2");
  });

  it("falls back when the name has no ASCII letters", () => {
    assert.equal(baseUsername("አበበ", "ከበደ", "IFA0001"), "ifa0001");
  });
});

describe("marks", () => {
  it("passes at 50 percent and fails below it", () => {
    const pass = calcSubject([
      { componentId: "a", maxScore: 10, score: 10 },
      { componentId: "b", maxScore: 40, score: 15 },
    ], 50);
    assert.equal(pass.total, 25);
    assert.equal(pass.percent, 50);
    assert.equal(pass.status, "pass");
    const fail = calcSubject([{ componentId: "a", maxScore: 100, score: 49 }], 50);
    assert.equal(fail.status, "fail");
    const incomplete = calcSubject([{ componentId: "a", maxScore: 10, score: null }], 50);
    assert.equal(incomplete.status, "incomplete");
  });

  it("fails overall when any subject fails and ranks ties", () => {
    const overall = calcOverall([
      { status: "pass", percent: 80 },
      { status: "fail", percent: 40 },
    ]);
    assert.equal(overall.overall, "fail");
    const ranks = rankMap([
      { id: "a", average: 80 },
      { id: "b", average: 80 },
      { id: "c", average: 70 },
    ]);
    assert.equal(ranks.get("a"), 1);
    assert.equal(ranks.get("b"), 1);
    assert.equal(ranks.get("c"), 3);
  });
});

describe("calendar", () => {
  it("matches known Ethiopian anchors", () => {
    assert.deepEqual(toEthiopian(new Date(2005, 8, 11)), { year: 1998, month: 1, day: 1 });
    assert.deepEqual(toEthiopian(new Date(2024, 8, 11)), { year: 2017, month: 1, day: 1 });
    assert.deepEqual(toEthiopian(new Date(2026, 10, 23)), { year: 2019, month: 3, day: 14 });
    assert.deepEqual(toEthiopian(new Date(2023, 8, 12)), { year: 2016, month: 1, day: 1 });
  });
});

describe("access rules", () => {
  it("lets a student read only their own record", () => {
    assert.equal(canReadStudent("STUDENT", "s1", "s1"), true);
    assert.equal(canReadStudent("STUDENT", "s1", "s2"), false);
    assert.equal(canReadStudent("DIRECTOR", null, "s2"), true);
    assert.equal(canWriteMarks("DIRECTOR"), false);
    assert.equal(canWriteMarks("TEACHER"), true);
    assert.equal(canManageSchool("ADMIN"), true);
    assert.equal(canManageSchool("DIRECTOR"), false);
  });
});

describe("translations", () => {
  it("gives Afaan Oromoo and Amharic every English key", () => {
    const keys = (tree: unknown, prefix = ""): string[] => {
      if (!tree || typeof tree !== "object") return [prefix];
      return Object.entries(tree as Record<string, unknown>).flatMap(([key, value]) => keys(value, prefix ? `${prefix}.${key}` : key));
    };
    const english = keys(en).sort();
    assert.deepEqual(keys(om).sort(), english);
    assert.deepEqual(keys(am).sort(), english);
  });
});
