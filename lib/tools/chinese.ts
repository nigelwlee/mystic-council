import { tool } from "ai";
import { z } from "zod";
import { Solar } from "lunar-typescript";

const STEMS = ["Jiǎ", "Yǐ", "Bǐng", "Dīng", "Wù", "Jǐ", "Gēng", "Xīn", "Rén", "Guǐ"];
const BRANCHES = ["Zǐ", "Chǒu", "Yín", "Mǎo", "Chén", "Sì", "Wǔ", "Wèi", "Shēn", "Yǒu", "Xū", "Hài"];
const BRANCH_ANIMALS = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];
const STEM_ELEMENTS = ["Wood", "Wood", "Fire", "Fire", "Earth", "Earth", "Metal", "Metal", "Water", "Water"];
const STEM_POLARITY = ["Yang", "Yin", "Yang", "Yin", "Yang", "Yin", "Yang", "Yin", "Yang", "Yin"];

// What each element needs to be productive
const ELEMENT_INTERACTIONS: Record<string, { generates: string; controls: string }> = {
  Wood: { generates: "Fire", controls: "Earth" },
  Fire: { generates: "Earth", controls: "Metal" },
  Earth: { generates: "Metal", controls: "Water" },
  Metal: { generates: "Water", controls: "Wood" },
  Water: { generates: "Wood", controls: "Fire" },
};

function getYearPillar(year: number) {
  const stemIdx = ((year - 4) % 10 + 10) % 10;
  const branchIdx = ((year - 4) % 12 + 12) % 12;
  return {
    stem: STEMS[stemIdx] ?? "Unknown",
    branch: BRANCHES[branchIdx] ?? "Unknown",
    animal: BRANCH_ANIMALS[branchIdx] ?? "Unknown",
    element: STEM_ELEMENTS[stemIdx] ?? "Unknown",
    polarity: STEM_POLARITY[stemIdx] ?? "Unknown",
  };
}

const chineseChartSchema = z.object({
  date: z.string().describe("Birth date in YYYY-MM-DD format"),
  time: z.string().optional().describe("Birth time in HH:mm (needed for hour pillar)"),
  readingDate: z.string().optional().describe("Today's date in YYYY-MM-DD format (for current year/month pillars)"),
});

export const chineseAstrologyTools = {
  calculateChineseChart: tool({
    description:
      "Calculate Chinese astrology chart: zodiac animal, element, Four Pillars (Ba Zi), day-master analysis, element balance, and current year/month transit pillars.",
    parameters: chineseChartSchema,
    execute: async ({ date, time, readingDate }: z.infer<typeof chineseChartSchema>) => {
      const [year, month, day] = date.split("-").map(Number);

      const solar = Solar.fromYmd(year!, month!, day!);
      const lunar = solar.getLunar();
      const lunarYear = lunar.getYear();
      const yearPillar = getYearPillar(lunarYear);

      const eightChar = lunar.getEightChar();
      const monthStem = eightChar.getMonthGan();
      const monthBranch = eightChar.getMonthZhi();
      const monthBranchIdx = BRANCHES.indexOf(monthBranch);
      const monthAnimal = monthBranchIdx >= 0 ? BRANCH_ANIMALS[monthBranchIdx] : "Unknown";

      const dayStem = eightChar.getDayGan();
      const dayBranch = eightChar.getDayZhi();
      const dayBranchIdx = BRANCHES.indexOf(dayBranch);
      const dayAnimal = dayBranchIdx >= 0 ? BRANCH_ANIMALS[dayBranchIdx] : "Unknown";

      // Day master: the day stem element defines the self
      const dayStemIdx = STEMS.indexOf(dayStem);
      const dayMasterElement = dayStemIdx >= 0 ? STEM_ELEMENTS[dayStemIdx] ?? "Unknown" : "Unknown";
      const dayMasterPolarity = dayStemIdx >= 0 ? STEM_POLARITY[dayStemIdx] ?? "Unknown" : "Unknown";

      let hourPillar: { stem: string; branch: string; animal: string | undefined } | null = null;
      if (time) {
        const hourStem = eightChar.getTimeGan();
        const hourBranch = eightChar.getTimeZhi();
        const hourBranchIdx = BRANCHES.indexOf(hourBranch);
        hourPillar = {
          stem: hourStem,
          branch: hourBranch,
          animal: hourBranchIdx >= 0 ? BRANCH_ANIMALS[hourBranchIdx] : "Unknown",
        };
      }

      // Element count across all available pillars (including hour if present)
      const allStems = [eightChar.getYearGan(), monthStem, dayStem];
      if (time) allStems.push(eightChar.getTimeGan());
      const elementCount: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
      allStems.forEach((stem) => {
        const idx = STEMS.indexOf(stem);
        if (idx >= 0) {
          const el = STEM_ELEMENTS[idx];
          if (el) elementCount[el] = (elementCount[el] ?? 0) + 1;
        }
      });

      const missingElements = Object.entries(elementCount).filter(([, v]) => v === 0).map(([k]) => k);
      const dominantElement = Object.entries(elementCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "Unknown";

      // What the day-master element needs
      const interactions = ELEMENT_INTERACTIONS[dayMasterElement];

      // Current year/month transit pillars
      let currentPillars: { year: ReturnType<typeof getYearPillar>; month: { stem: string; branch: string; animal: string | undefined }; solar: string } | null = null;
      if (readingDate) {
        const [ry, rm, rd] = readingDate.split("-").map(Number);
        const rdSolar = Solar.fromYmd(ry!, rm!, rd!);
        const rdLunar = rdSolar.getLunar();
        const rdLunarYear = rdLunar.getYear();
        const rdYearPillar = getYearPillar(rdLunarYear);
        const rdEightChar = rdLunar.getEightChar();
        const rdMonthStem = rdEightChar.getMonthGan();
        const rdMonthBranch = rdEightChar.getMonthZhi();
        const rdMonthBranchIdx = BRANCHES.indexOf(rdMonthBranch);
        const rdMonthAnimal = rdMonthBranchIdx >= 0 ? BRANCH_ANIMALS[rdMonthBranchIdx] : "Unknown";
        const rdPrevJieQi = rdLunar.getPrevJieQi();
        currentPillars = {
          year: rdYearPillar,
          month: { stem: rdMonthStem, branch: rdMonthBranch, animal: rdMonthAnimal },
          solar: rdPrevJieQi ? rdPrevJieQi.getName() : "N/A",
        };
      }

      const prevJieQi = lunar.getPrevJieQi();

      return {
        zodiacAnimal: yearPillar.animal,
        element: yearPillar.element,
        polarity: yearPillar.polarity,
        lunarYear,
        lunarDate: `${lunar.getYear()}/${lunar.getMonth()}/${lunar.getDay()}`,
        fourPillars: {
          year: yearPillar,
          month: { stem: monthStem, branch: monthBranch, animal: monthAnimal },
          day: { stem: dayStem, branch: dayBranch, animal: dayAnimal },
          hour: hourPillar,
        },
        dayMaster: {
          element: dayMasterElement,
          polarity: dayMasterPolarity,
          generates: interactions?.generates ?? "Unknown",
          controls: interactions?.controls ?? "Unknown",
          note: `You are ${dayMasterPolarity} ${dayMasterElement}. Your ${interactions?.generates ?? "?"} needs are an outlet; ${interactions?.controls ?? "?"} is your strength.`,
        },
        elementBalance: elementCount,
        missingElements,
        dominantElement,
        solarTerm: prevJieQi ? prevJieQi.getName() : "N/A",
        currentPillars,
      };
    },
  }),
};
