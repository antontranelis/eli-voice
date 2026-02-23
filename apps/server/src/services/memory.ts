import { ChromaClient, type IEmbeddingFunction } from "chromadb";
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Same model as Chroma's default: all-MiniLM-L6-v2 (384 dimensions)
const MODEL = "Xenova/all-MiniLM-L6-v2";

let embedder: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", MODEL, {
      dtype: "fp32",
    });
  }
  return embedder;
}

const embeddingFunction: IEmbeddingFunction = {
  async generate(texts: string[]): Promise<number[][]> {
    const model = await getEmbedder();
    const results: number[][] = [];
    for (const text of texts) {
      const output = await model(text, { pooling: "mean", normalize: true });
      results.push(Array.from(output.data as Float32Array));
    }
    return results;
  },
};

let client: ChromaClient | null = null;

function getClient(): ChromaClient {
  if (!client) {
    const host = process.env.CHROMA_HOST || "chroma.utopia-lab.org";
    const port = parseInt(process.env.CHROMA_PORT || "443");
    const ssl = process.env.CHROMA_SSL !== "false";

    client = new ChromaClient({
      path: `${ssl ? "https" : "http"}://${host}:${port}`,
    });
  }
  return client;
}

export async function searchMemories(
  query: string,
  nResults: number = 5
): Promise<string[]> {
  try {
    const chromaClient = getClient();

    // Search both collections
    const results: string[] = [];

    for (const collName of ["erinnerungen", "privat"]) {
      try {
        const collection = await chromaClient.getCollection({
          name: collName,
          embeddingFunction,
        });
        const res = await collection.query({
          queryTexts: [query],
          nResults: Math.ceil(nResults / 2),
        });
        if (res.documents?.[0]) {
          results.push(
            ...res.documents[0].filter((d): d is string => d !== null)
          );
        }
      } catch {
        // Collection might not exist
      }
    }

    console.log(`[Memory] Query: "${query.slice(0, 80)}..." → ${results.length} Ergebnisse`);
    if (results.length > 0) {
      console.log(`[Memory] Erste Erinnerung: "${results[0].slice(0, 120)}..."`);
    }
    return results.slice(0, nResults);
  } catch (err) {
    console.error("Memory search failed:", err);
    return [];
  }
}
