import { describe, it, expect, vi } from "vitest";
import {
  getAvailableProviders,
  getProviderConfig,
  compareProviderCosts,
  type LLMProvider,
} from "../multiProviderLLM";

describe("Multi-Provider LLM Service (Nov 2025 Update)", () => {
  describe("getAvailableProviders", () => {
    it("should return all 6 providers including DeepSeek", () => {
      const providers = getAvailableProviders();
      expect(providers).toHaveLength(6);
      expect(providers).toContain("openai");
      expect(providers).toContain("anthropic");
      expect(providers).toContain("google");
      expect(providers).toContain("deepseek");
      expect(providers).toContain("groq");
      expect(providers).toContain("together");
    });
  });

  describe("getProviderConfig", () => {
    it("should return OpenAI config with GPT-5 Mini", () => {
      const config = getProviderConfig("openai");
      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-5-mini");
      expect(config.costPer1kTokens.input).toBe(0.00025);
      expect(config.costPer1kTokens.output).toBe(0.002);
    });

    it("should return Anthropic config with Claude Sonnet 4", () => {
      const config = getProviderConfig("anthropic");
      expect(config.provider).toBe("anthropic");
      expect(config.model).toBe("claude-sonnet-4-20251022");
      expect(config.costPer1kTokens.input).toBe(0.003);
      expect(config.costPer1kTokens.output).toBe(0.015);
    });

    it("should return Google config with Gemini 2.5 Flash", () => {
      const config = getProviderConfig("google");
      expect(config.provider).toBe("google");
      expect(config.model).toBe("gemini-2.5-flash");
      expect(config.costPer1kTokens.input).toBe(0.00015);
      expect(config.costPer1kTokens.output).toBe(0.0006);
    });

    it("should return DeepSeek config - CHEAPEST provider!", () => {
      const config = getProviderConfig("deepseek");
      expect(config.provider).toBe("deepseek");
      expect(config.model).toBe("deepseek-chat");
      expect(config.costPer1kTokens.input).toBe(0.00028);
      expect(config.costPer1kTokens.output).toBe(0.00042);
    });

    it("should return Groq config", () => {
      const config = getProviderConfig("groq");
      expect(config.provider).toBe("groq");
      expect(config.model).toBe("llama-3.3-70b-versatile");
      expect(config.costPer1kTokens.input).toBe(0.00059);
      expect(config.costPer1kTokens.output).toBe(0.00079);
    });

    it("should return Together AI config", () => {
      const config = getProviderConfig("together");
      expect(config.provider).toBe("together");
      expect(config.model).toBe("meta-llama/Llama-3.3-70B-Instruct-Turbo");
      expect(config.costPer1kTokens.input).toBe(0.00088);
      expect(config.costPer1kTokens.output).toBe(0.00088);
    });
  });

  describe("compareProviderCosts", () => {
    it("should compare costs for typical entity extraction task", () => {
      // Typical entity extraction: 2000 input, 500 output tokens
      const comparison = compareProviderCosts(2000, 500);
      
      expect(comparison).toHaveLength(6);
      expect(comparison[0].provider).toBe("google"); // Should be cheapest
      
      // Verify all providers are included
      const providers = comparison.map(c => c.provider);
      expect(providers).toContain("openai");
      expect(providers).toContain("anthropic");
      expect(providers).toContain("google");
      expect(providers).toContain("deepseek");
      expect(providers).toContain("groq");
      expect(providers).toContain("together");
    });

    it("should calculate correct costs for report generation", () => {
      // Large report: 10000 input, 3000 output tokens
      const comparison = compareProviderCosts(10000, 3000);
      
      // Google should be cheapest
      expect(comparison[0].provider).toBe("google");
      const googleCost = (10000 / 1000) * 0.00015 + (3000 / 1000) * 0.0006;
      expect(comparison[0].cost).toBeCloseTo(googleCost, 4);
      
      // DeepSeek should be second cheapest
      const deepseekItem = comparison.find(c => c.provider === "deepseek");
      const deepseekCost = (10000 / 1000) * 0.00028 + (3000 / 1000) * 0.00042;
      expect(deepseekItem?.cost).toBeCloseTo(deepseekCost, 4);
      
      // Groq should be third
      const groqItem = comparison.find(c => c.provider === "groq");
      const groqCost = (10000 / 1000) * 0.00059 + (3000 / 1000) * 0.00079;
      expect(groqItem?.cost).toBeCloseTo(groqCost, 4);
      
      // Claude should be most expensive
      expect(comparison[5].provider).toBe("anthropic");
      const claudeCost = (10000 / 1000) * 0.003 + (3000 / 1000) * 0.015;
      expect(comparison[5].cost).toBeCloseTo(claudeCost, 4);
    });

    it("should include cost savings", () => {
      const comparison = compareProviderCosts(5000, 2000);
      
      // All items should have costSavings
      comparison.forEach(item => {
        expect(item.costSavings).toBeDefined();
        expect(item.costSavings).toBeGreaterThanOrEqual(0);
      });
      
      // Most expensive should have 0 savings
      const mostExpensive = comparison[comparison.length - 1];
      expect(mostExpensive.costSavings).toBe(0);
      
      // Cheapest should have maximum savings (approximately)
      const cheapest = comparison[0];
      expect(cheapest.costSavings).toBeCloseTo(mostExpensive.cost, 2);
    });

    it("should handle zero tokens", () => {
      const comparison = compareProviderCosts(0, 0);
      
      expect(comparison).toHaveLength(6);
      comparison.forEach(item => {
        expect(item.cost).toBe(0);
      });
    });

    it("should demonstrate massive cost savings with DeepSeek and open-source models", () => {
      // Large comprehensive analysis: 50000 input, 10000 output tokens
      const comparison = compareProviderCosts(50000, 10000);
      
      const googleCost = comparison.find(c => c.provider === "google")!.cost;
      const deepseekCost = comparison.find(c => c.provider === "deepseek")!.cost;
      const groqCost = comparison.find(c => c.provider === "groq")!.cost;
      const openaiCost = comparison.find(c => c.provider === "openai")!.cost;
      const claudeCost = comparison.find(c => c.provider === "anthropic")!.cost;
      
      // Google and DeepSeek should be ultra-cheap
      expect(googleCost).toBeLessThan(0.02); // Less than 2 cents
      expect(deepseekCost).toBeLessThan(0.02); // Less than 2 cents
      
      // Groq should be competitive with OpenAI
      expect(groqCost).toBeLessThan(openaiCost * 2); // Within 2x of OpenAI cost
      
      // Claude should be most expensive
      expect(claudeCost).toBeGreaterThan(openaiCost);
      
      // Calculate savings
      const deepseekSavings = claudeCost - deepseekCost;
      expect(deepseekSavings).toBeGreaterThan(0.2); // At least $0.20 savings
    });
  });

  describe("Cost optimization strategies", () => {
    it("should show Google/DeepSeek as best for cost-optimized strategy", () => {
      const comparison = compareProviderCosts(10000, 3000);
      // Either Google or DeepSeek should be cheapest
      expect(["google", "deepseek"]).toContain(comparison[0].provider);
    });

    it("should show realistic cost differences for production workloads", () => {
      // Simulate 1000 entity extractions per day
      const dailyExtractions = 1000;
      const tokensPerExtraction = { input: 2000, output: 500 };
      
      const comparison = compareProviderCosts(
        tokensPerExtraction.input * dailyExtractions,
        tokensPerExtraction.output * dailyExtractions
      );
      
      const googleDaily = comparison.find(c => c.provider === "google")!.cost;
      const deepseekDaily = comparison.find(c => c.provider === "deepseek")!.cost;
      const groqDaily = comparison.find(c => c.provider === "groq")!.cost;
      const openaiDaily = comparison.find(c => c.provider === "openai")!.cost;
      const claudeDaily = comparison.find(c => c.provider === "anthropic")!.cost;
      
      // Monthly costs (30 days)
      const googleMonthly = googleDaily * 30;
      const deepseekMonthly = deepseekDaily * 30;
      const groqMonthly = groqDaily * 30;
      const openaiMonthly = openaiDaily * 30;
      const claudeMonthly = claudeDaily * 30;
      
      console.log("\\nMonthly costs for 1000 extractions/day (Nov 2025 pricing):");
      console.log(`  Google Gemini 2.5 Flash: $${googleMonthly.toFixed(2)}`);
      console.log(`  DeepSeek V3.2-Exp: $${deepseekMonthly.toFixed(2)}`);
      console.log(`  Groq Llama 3.3: $${groqMonthly.toFixed(2)}`);
      console.log(`  OpenAI GPT-5 Mini: $${openaiMonthly.toFixed(2)}`);
      console.log(`  Claude Sonnet 4: $${claudeMonthly.toFixed(2)}`);
      console.log(`  Savings (DeepSeek vs Claude): $${(claudeMonthly - deepseekMonthly).toFixed(2)}/month`);
      console.log(`  Savings (Groq vs OpenAI): $${(openaiMonthly - groqMonthly).toFixed(2)}/month`);
      
      // DeepSeek/Google should be ultra-cheap
      expect(googleMonthly).toBeLessThan(25); // Less than $25/month
      expect(deepseekMonthly).toBeLessThan(30); // Less than $30/month
      
      // Groq should be similar to OpenAI (both around $45-47/month)
      expect(groqMonthly).toBeLessThan(openaiMonthly * 1.2); // Within 20% of OpenAI
      
      // Claude should be most expensive
      expect(claudeMonthly).toBeGreaterThan(openaiMonthly);
    });
  });
});
