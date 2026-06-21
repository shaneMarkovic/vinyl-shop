import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/*
  Haiku-powered extraction of fields that regex can't reliably pull from the
  hand-entered Kupindo description (condition grades written in prose, Serbian
  or English terms, non-standard formats; sometimes the release year).

  Structured outputs guarantee a clean, schema-valid object — no parsing.
  Each result carries a confidence so callers can ignore low-confidence guesses.
*/

// Kupindo's native condition scale: 5 (best) → 1 (worst), with +/- modifiers.
const GRADES = ["5", "5-", "4+", "4", "4-", "3+", "3", "3-", "2", "1"] as const;

const ExtractionSchema = z.object({
  conditionMedia: z.enum(GRADES).nullable(),
  conditionSleeve: z.enum(GRADES).nullable(),
  year: z.number().int().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

const SYSTEM = `You extract vinyl record condition and metadata from a seller's free-text listing (usually Serbian, sometimes English).

Return the condition of the MEDIA (the record/vinyl — "ploča") and the SLEEVE (cover — "omot") on Kupindo's grading scale: 5 (best) down to 1 (worst), with optional + or - (e.g. "5", "5-", "4+"). Valid values: 5, 5-, 4+, 4, 4-, 3+, 3, 3-, 2, 1.

How to read the listing:
- A numeric grade is usually written directly, e.g. "PLOČA 5- / OMOT 4+".
- Words map to the scale: "mint"→5, "near mint"/"odlično"/"odlicno"→5-, "vrlo dobro"/"very good"→4, "dobro"/"good"→3, "očuvan/očuvana"→4 (unless a number is also stated).
- "PLOČA"/"PLOCA"/"vinyl"/"disc" = media; "OMOT"/"cover"/"sleeve" = sleeve.

Rules:
- If the grade for media or sleeve is not stated or you cannot determine it, return null for that field. Do NOT guess.
- year: the release/pressing year if clearly stated, else null.
- confidence: "high" only if grades are explicitly stated; "medium" if inferred from clear wording; "low" if you are unsure.`;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return client;
}

export async function extractFromDescription(input: {
  artist: string;
  title: string;
  description: string | null;
}): Promise<Extraction | null> {
  if (!input.description || input.description.trim().length < 4) return null;

  try {
    const res = await getClient().messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Artist: ${input.artist}\nTitle: ${input.title}\n\nListing description:\n${input.description}`,
        },
      ],
      output_config: { format: zodOutputFormat(ExtractionSchema) },
    });
    return res.parsed_output ?? null;
  } catch (err) {
    console.warn(`  ⚠ Haiku extraction failed: ${(err as Error).message}`);
    return null;
  }
}
