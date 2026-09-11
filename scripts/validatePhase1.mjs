import { validatedMockRoadmap } from "../src/data/mockRoadmap.js";
import { parseStudentProfile } from "../src/schemas/roadmapSchemas.js";

const sampleProfile = {
  name: "Aarav",
  stage: "UNDERGRADUATE",
  age: 19,
  field: {
    type: "TECH",
    customValue: "",
  },
  skills: ["Python", "Excel", "Communication"],
  goal: {
    type: "JOB_ROLE",
    description: "I want to become a data analyst at a startup.",
  },
  financialTier: "MEDIUM",
  preferences: ["Prefer online"],
};

const parsedProfile = parseStudentProfile(sampleProfile);

if (!validatedMockRoadmap.goalsToAchieve.milestones.length) {
  throw new Error("Mock roadmap must include milestones.");
}

console.log("Phase 1 validation passed");
console.log(`Profile: ${parsedProfile.name}, ${parsedProfile.stage}, ${parsedProfile.financialTier}`);
console.log(`Mock milestones: ${validatedMockRoadmap.goalsToAchieve.milestones.length}`);
