import { describe, it, expect } from "vitest";
import { numerologyTools } from "./numerology";

const lifePath = numerologyTools.calculateLifePath.execute!;
const personalNumbers = numerologyTools.calculatePersonalNumbers.execute!;
const nameNumbers = numerologyTools.calculateNameNumbers.execute!;

describe("calculateLifePath", () => {
  it("Nigel Lee — 1991-06-01 → life path 9", async () => {
    const result = await lifePath({ birthdate: "1991-06-01" }, {});
    expect(result.lifePath).toBe(9);
    expect(result.breakdown).toEqual({ month: 6, day: 1, year: 2 });
    expect(result.isMasterNumber).toBe(false);
  });

  it("1980-03-07 → life path 1", async () => {
    const result = await lifePath({ birthdate: "1980-03-07" }, {});
    expect(result.lifePath).toBe(1);
    expect(result.breakdown).toEqual({ month: 3, day: 7, year: 9 });
  });

  it("2000-01-01 → life path 4", async () => {
    const result = await lifePath({ birthdate: "2000-01-01" }, {});
    expect(result.lifePath).toBe(4);
    expect(result.breakdown).toEqual({ month: 1, day: 1, year: 2 });
  });
});

describe("calculatePersonalNumbers", () => {
  it("Nigel Lee on 2026-05-08 → PY:8 PM:4 PD:3 UD:5", async () => {
    const result = await personalNumbers({ birthdate: "1991-06-01", date: "2026-05-08" }, {});
    expect(result.personalYear).toBe(8);
    expect(result.personalMonth).toBe(4);
    expect(result.personalDay).toBe(3);
    expect(result.universalDay).toBe(5);
  });

  it("Nigel Lee on 2020-01-01 → PY:11 PM:3 PD:4 UD:6", async () => {
    const result = await personalNumbers({ birthdate: "1991-06-01", date: "2020-01-01" }, {});
    expect(result.personalYear).toBe(11);
    expect(result.personalYearIsMaster).toBe(true);
    expect(result.personalMonth).toBe(3);
    expect(result.personalDay).toBe(4);
    expect(result.universalDay).toBe(6);
  });

  it("1975-12-28 on 2026-05-08 → PY:5 PM:1 PD:9 UD:5", async () => {
    const result = await personalNumbers({ birthdate: "1975-12-28", date: "2026-05-08" }, {});
    expect(result.personalYear).toBe(5);
    expect(result.personalMonth).toBe(1);
    expect(result.personalDay).toBe(9);
    expect(result.universalDay).toBe(5);
  });
});

describe("calculateNameNumbers", () => {
  it("Nigel Lee → expression:6 soulUrge:6 personality:9", async () => {
    const result = await nameNumbers({ fullName: "Nigel Lee" }, {});
    expect(result.expression).toBe(6);
    expect(result.soulUrge).toBe(6);
    expect(result.personality).toBe(9);
    expect(result.expressionIsMaster).toBe(false);
  });

  it("John Doe → expression:8 soulUrge:8 personality:9", async () => {
    const result = await nameNumbers({ fullName: "John Doe" }, {});
    expect(result.expression).toBe(8);
    expect(result.soulUrge).toBe(8);
    expect(result.personality).toBe(9);
  });

  it("Mary Jane → expression:33 soulUrge:7 personality:8", async () => {
    const result = await nameNumbers({ fullName: "Mary Jane" }, {});
    expect(result.expression).toBe(33);
    expect(result.expressionIsMaster).toBe(true);
    expect(result.soulUrge).toBe(7);
    expect(result.personality).toBe(8);
  });
});
