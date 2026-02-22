import { ChromaClient, DefaultEmbeddingFunction } from "chromadb";

const embeddingFunction = new DefaultEmbeddingFunction();

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

    return results.slice(0, nResults);
  } catch (err) {
    console.error("Memory search failed:", err);
    return [];
  }
}
