import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    if (value === undefined) return undefined;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
}

/**
 * TitanEmbedService converts text chunks into 512-dimensional vectors using
 * the amazon.titan-embed-text-v2:0 model via AWS Bedrock.
 */
export class TitanEmbedService {
  private client: BedrockRuntimeClient;
  private modelId: string = "amazon.titan-embed-text-v2:0";
  private embeddingCache: LRUCache<string, number[]>;
  private readonly CACHE_SIZE = 1000;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
    this.embeddingCache = new LRUCache<string, number[]>(this.CACHE_SIZE);
  }

  /**
   * Embeds the provided text into a vector using the Titan model.
   * Uses an LRU cache to avoid recomputing embeddings for the same text.
   *
   * @param inputText - The text to be embedded.
   * @param dimensions - (Optional) The output dimensions (defaults to 512).
   * @param normalize - (Optional) Whether to normalize the embedding (defaults to true).
   * @returns A Promise resolving to an array of numbers representing the embedding.
   */
  async embedText(inputText: string, dimensions: number = 512, normalize: boolean = true): Promise<number[]> {
    // Generate cache key based on all parameters
    const cacheKey = `${inputText}:${dimensions}:${normalize}`;
    
    // Check cache first
    const cachedEmbedding = this.embeddingCache.get(cacheKey);
    if (cachedEmbedding) {
      // console.log("Cache hit for embedding");
      return cachedEmbedding;
    }

    // console.log("Cache miss for embedding, computing new one");
    const payload = {
      inputText,
      dimensions,
      normalize,
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: "application/json",
      accept: "*/*",
      body: JSON.stringify(payload)
    });

    try {
      const response = await this.client.send(command);
      if (!response.body) {
        throw new Error("Empty response body");
      }
      
      const responseText = await this.streamToString(response.body);
      const result = JSON.parse(responseText);
      if (!result.embedding) {
        throw new Error("No embedding field in the response");
      }

      // Cache the computed embedding
      this.embeddingCache.put(cacheKey, result.embedding);
      return result.embedding;
    } catch (error) {
      console.error("Error invoking Titan model:", error);
      throw error;
    }
  }

  /**
   * Helper function to convert a response stream into a string.
   * It now checks for various types such as Buffer, ArrayBuffer, typed arrays,
   * an SDK-specific transform method, the web stream API (getReader),
   * and async iterable streams.
   */
  private async streamToString(stream: any): Promise<string> {
    // If stream is already a string, return it.
    if (typeof stream === 'string') {
      return stream;
    }
    // If stream is a Buffer.
    if (Buffer.isBuffer(stream)) {
      return stream.toString('utf8');
    }
    // If stream is an ArrayBuffer.
    if (stream instanceof ArrayBuffer) {
      return Buffer.from(new Uint8Array(stream)).toString('utf8');
    }
    // If stream is a typed array (e.g. Uint8Array).
    if (ArrayBuffer.isView(stream)) {
      return Buffer.from(new Uint8Array(stream.buffer, stream.byteOffset, stream.byteLength)).toString("utf8");
    }
    // If stream has an SDK-specific method to transform to byte array.
    if (typeof stream.transformToByteArray === "function") {
      const data = await stream.transformToByteArray();
      return Buffer.from(data).toString("utf8");
    }
    // If stream supports the web stream API.
    if (typeof stream.getReader === "function") {
      let result = "";
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += typeof value === "string" ? value : Buffer.from(value).toString("utf8");
      }
      return result;
    }
    // If stream is async iterable.
    if (Symbol.asyncIterator in stream) {
      let result = "";
      for await (const chunk of stream) {
        result += typeof chunk === "string" 
          ? chunk 
          : (Buffer.isBuffer(chunk) ? chunk.toString("utf8") : Buffer.from(chunk).toString("utf8"));
      }
      return result;
    }
    
    throw new Error("Stream is not async iterable, not a web stream, nor a Buffer or string");
  }
}

export const titanEmbedService = new TitanEmbedService(); 