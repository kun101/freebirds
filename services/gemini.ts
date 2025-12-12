
import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async generateQuizQuestions(courseName: string, topic: string, level: number): Promise<Question[]> {
    try {
      // Determine difficulty context based on level
      let difficultyContext = "Beginner / Introductory";
      let tier: 1 | 2 | 3 = 1;
      
      if (level >= 3 && level < 6) {
        difficultyContext = "Intermediate / High School level";
        tier = 2;
      } else if (level >= 6) {
        difficultyContext = "Advanced / College Undergraduate level";
        tier = 3;
      }

      const prompt = `Generate 5 unique multiple-choice questions specifically about: "${topic}" 
      within the course "${courseName}". 
      Difficulty Level: ${difficultyContext}.
      Target Audience: A university student in a pixel-art RPG game.
      
      Ensure the questions are strictly relevant to the topic "${topic}".
      Provide 4 options for each question.
      The 'correct' field should be the index (0-3) of the correct answer.
      The 'tier' should be ${tier}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                q: { type: Type.STRING, description: "The question text" },
                options: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Array of 4 possible answers"
                },
                correct: { type: Type.INTEGER, description: "Index of the correct answer (0-3)" },
                tier: { type: Type.INTEGER, description: "Difficulty tier (1, 2, or 3)" }
              },
              required: ["q", "options", "correct", "tier"]
            }
          }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        // Validate strictly just in case
        if (Array.isArray(data) && data.length > 0) {
          // Force strict typing
          return data.map((item: any) => ({
            q: item.q,
            options: item.options,
            correct: item.correct,
            tier: item.tier as 1 | 2 | 3
          }));
        }
      }

      throw new Error("Empty response from AI");

    } catch (error) {
      console.error("Gemini Quiz Generation Failed:", error);
      return []; // Return empty to trigger fallback
    }
  },

  async generateStudyMaterial(courseName: string, topic: string, level: number): Promise<string> {
    try {
       const prompt = `Write a short, engaging study summary (approx 100 words) for the topic "${topic}" within the course "${courseName}".
       Target Audience: A student level ${level} (1=Beginner, 10=Expert).
       Style: Educational but casual, suitable for a game.
       Content: Explain the key concepts of ${topic} clearly.`;

       const response = await ai.models.generateContent({
           model: 'gemini-3-pro-preview',
           contents: prompt
       });

       return response.text || "You stare at the books, but nothing seems to make sense right now.";
    } catch (error) {
        console.error("Gemini Study Gen Failed:", error);
        return "The library archives are currently inaccessible (API Error). Try again later.";
    }
  }
};
