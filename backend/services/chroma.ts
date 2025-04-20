
import { ChromaClient } from 'chromadb';
import { ICollection, CollectionModel, CollectionDocument } from '../models/Collection';
import { CollectionPermission } from '../models/Collection';
import { TitanEmbedService } from '../services/titan';
import { HydratedDocument } from 'mongoose';

interface DocumentMetadata {
  filename: string;
  timestamp: string;
  modelId: string;
  collectionName: string;
  uploadedBy: string;
}

class ChromaService {
  private client: ChromaClient;
  private collections: Map<string, any> = new Map();
  private processingFiles = new Set<string>();
  private titanEmbedService: TitanEmbedService;

  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://chroma:8000'
    });
    this.titanEmbedService = new TitanEmbedService();
  }

  async initCollection(collectionName: string): Promise<void> {
    try {
      if (!this.collections.has(collectionName)) {
        const collection = await this.client.getOrCreateCollection({
          name: collectionName
        });
        this.collections.set(collectionName, collection);
        // console.log(`ChromaService: Collection '${collectionName}' initialized.`);
      }
    } catch (error) {
      console.error(`ChromaService: Error initializing collection '${collectionName}':`, error);
      throw error;
    }
  }

  async getCollections(): Promise<string[]> {
    try {
      const collections = await this.client.listCollections();
      return collections;
    } catch (error) {
      console.error('Error getting collections:', error);
      throw error;
    }
  }

  /**
   * Adds an array of documents (with precomputed embeddings) to ChromaDB.
   * Each document must have an `embedding` property in addition to text and metadata.
   */
  async addDocuments(collectionName: string, documents: Array<{ text: string, metadata: any, embedding: number[] }>): Promise<void> {
    const fileKey = `${documents[0].metadata.filename}_${documents[0].metadata.uploadedBy}`;

    if (this.processingFiles.has(fileKey)) {
      // console.log(`File ${fileKey} is already being processed`);
      return;
    }

    this.processingFiles.add(fileKey);

    try {
      // console.log(`Adding documents to collection ${collectionName}`);
      await this.initCollection(collectionName);
      const collection = this.collections.get(collectionName);

      // Create a unique batch ID for this file upload
      const batchId = `batch_${Date.now()}`;

      // Enhance each document with a batchId and a 'processed' flag.
      const docsWithBatchId = documents.map(doc => ({
        text: doc.text,
        metadata: {
          ...doc.metadata,
          batchId,
          processed: true // Mark as fully processed
        },
        embedding: doc.embedding // Use the precomputed embedding
      }));

      // Check for duplicate files (avoid duplicate ingestion)
      const existingDocs = await collection.get();
      const existingMetadata = existingDocs.metadatas || [];

      const fileExists = existingMetadata.some((existing: DocumentMetadata) =>
        existing.filename === documents[0].metadata.filename &&
        existing.uploadedBy === documents[0].metadata.uploadedBy
      );

      if (fileExists) {
        // console.log(`File ${documents[0].metadata.filename} already exists, skipping upload`);
        return;
      }

      // Split document chunks into batches (100 chunks per batch)
      const BATCH_SIZE = 100;
      const batches = [];
      for (let i = 0; i < docsWithBatchId.length; i += BATCH_SIZE) {
        batches.push(docsWithBatchId.slice(i, i + BATCH_SIZE));
      }

      // Process and add each batch, now with embeddings
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        // console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} documents)`);

        const ids = batch.map((_, idx) => `${batchId}_${i * BATCH_SIZE + idx}`);
        const texts = batch.map(doc => doc.text);
        const metadatas = batch.map(doc => doc.metadata);
        const embeddings = batch.map(doc => doc.embedding); // Retrieve the embedding values

        await collection.add({
          ids,
          documents: texts,
          metadatas,
          embeddings // Store the actual vector embeddings for similarity search
        });

        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // console.log('Documents added successfully');
    } finally {
      this.processingFiles.delete(fileKey);
    }
  }

  /**
   * Computes and returns the query embedding vector using the Titan embedding service.
   */
  async getQueryEmbedding(query: string): Promise<number[]> {
    try {
      const embedding = await this.titanEmbedService.embedText(query);
      return embedding;
    } catch (error) {
      console.error("ChromaService: Error computing query embedding:", error);
      throw error;
    }
  }

  /**
   * Performs a similarity search on the specified collection using the provided query embedding.
   * Returns the concatenated document text from the top n_results.
   */
  async queryDocumentsWithEmbedding(collectionName: string, queryEmbedding: number[], n_results: number): Promise<{
    documents: string[];
    metadatas: Array<{
      modelId: string;
      filename: string;
      [key: string]: any;
    }>;
    distances?: number[];
  }> {
    try {
      await this.initCollection(collectionName);
      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`ChromaService: Collection '${collectionName}' not found.`);
      }

      // Check if collection has any documents
      const collectionContents = await collection.get();
      // console.log(`ChromaService: Collection '${collectionName}' contains:`, {
      //   documentCount: collectionContents.documents?.length || 0,
      //   metadataCount: collectionContents.metadatas?.length || 0,
      //   // Log a few sample documents with their metadata
      //   sampleDocs: (collectionContents.documents || []).slice(0, 2).map((doc: string, i: number) => ({
      //     text: doc.substring(0, 100) + '...',
      //     metadata: collectionContents.metadatas?.[i],
      //     id: collectionContents.ids?.[i]
      //   }))
      // });

      // ขอผลลัพธ์มากขึ้นเพื่อให้มีโอกาสได้ข้อมูลที่เกี่ยวข้องมากขึ้น
      // แต่จะกรองเฉพาะที่เกี่ยวข้องจริงๆ ในภายหลัง
      const QUERY_MULTIPLIER = 3; // เพิ่มจาก 2 เป็น 3
      
      const queryResult = await collection.query({
        queryEmbeddings: [queryEmbedding],
        n_results: n_results * QUERY_MULTIPLIER, // Request more results initially for better filtering
        include: ["documents", "metadatas", "distances"],
        where: { processed: true } // Only include fully processed documents
      });

      if (!queryResult.documents || !Array.isArray(queryResult.documents)) {
        throw new Error("ChromaService: queryResult.documents is not an array.");
      }

      // ปรับค่า MAX_L2_DISTANCE และ MIN_SIMILARITY_THRESHOLD
      // เพื่อให้กรองข้อมูลที่เกี่ยวข้องได้ดีขึ้น
      const MAX_L2_DISTANCE = 2.0; // ลดจาก 2.0 เพื่อให้ similarity score สูงขึ้น
      const MIN_SIMILARITY_THRESHOLD = 0.1; // เพิ่มจาก 0.0 เพื่อกรองข้อมูลที่ไม่เกี่ยวข้อง

      const documents = queryResult.documents[0];
      const distances = queryResult.distances?.[0] || [];
      const metadatas = queryResult.metadatas?.[0] || [];
      
      interface QueryResult {
        text: string;
        metadata: {
          modelId: string;
          filename: string;
          [key: string]: any;
        };
        similarity: number;
      }

      // ปรับฟังก์ชัน l2DistanceToSimilarity ให้คำนวณค่า similarity ได้แม่นยำขึ้น
      const l2DistanceToSimilarity = (distance: number): number => {
        // ใช้ exponential decay function เพื่อให้ค่า similarity ลดลงเร็วขึ้นเมื่อ distance สูงขึ้น
        return Math.exp(-distance / MAX_L2_DISTANCE);
      };

      // Log raw distances and computed similarities
      const rawScores = distances.map((distance: number, index: number) => ({
        distance,
        similarity: l2DistanceToSimilarity(distance),
        text: documents[index].substring(0, 100) + '...' // First 100 chars of document
      }));
      // console.log(`ChromaService: Raw similarity scores:`, rawScores);

      const filteredResults = documents
        .map((doc: string, index: number): QueryResult => ({
          text: doc,
          metadata: metadatas[index],
          similarity: l2DistanceToSimilarity(distances[index] || 0)
        }))
        .filter((result: QueryResult) => result.similarity >= MIN_SIMILARITY_THRESHOLD)
        .sort((a: QueryResult, b: QueryResult) => b.similarity - a.similarity)
        .slice(0, n_results);

      return {
        documents: filteredResults.map((r: QueryResult) => r.text),
        metadatas: filteredResults.map((r: QueryResult) => r.metadata),
        distances: filteredResults.map((r: QueryResult) => 1 - r.similarity)
      };
    } catch (error) {
      console.error(`ChromaService: Error querying documents in '${collectionName}':`, error);
      return {
        documents: [],
        metadatas: [],
        distances: []
      };
    }
  }

  async queryDocuments(collectionName: string, query: string, n_results: number = 5) {
    try {
      await this.initCollection(collectionName);
      const collection = this.collections.get(collectionName);
      // This method is now deprecated in favor of queryDocumentsWithEmbedding.
      const queryEmbedding = await this.titanEmbedService.embedText(query);
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: n_results,
        where: { processed: true }
      });
      return results;
    } catch (error) {
      console.error('Error querying ChromaDB:', error);
      throw error;
    }
  }

  async queryCollection(collectionName: string, query: string, limit: number = 5) {
    await this.initCollection(collectionName);
    const collection = this.collections.get(collectionName);
    const queryEmbedding = await this.titanEmbedService.embedText(query);
    const results = await this.queryDocumentsWithEmbedding(collectionName, queryEmbedding, limit);
    return results.documents.slice(0, limit);
  }

  async query(collectionName: string, query: string): Promise<any[]> {
    try {
      await this.initCollection(collectionName);
      const collection = this.collections.get(collectionName);
      const results = await collection.query({
        queryTexts: [query],
        nResults: 5,
        minScore: 0.7,
        where: {},
        include: ["documents", "metadatas", "distances"]
      });

      return results.documents[0].map((doc: string, index: number) => ({
        text: doc,
        metadata: results.metadatas[0][index],
        score: results.distances ? 1 - (results.distances[0][index] || 0) : 0
      }));
    } catch (error) {
      console.error('Error querying ChromaDB:', error);
      return [];
    }
  }

  async getAllDocuments(collectionName: string): Promise<{
    ids: string[];
    documents: string[];
    metadatas: Record<string, any>[];
  }> {
    try {
      await this.initCollection(collectionName);
      const collection = this.collections.get(collectionName);
      const results = await collection.get();
      return {
        ids: results.ids || [],
        documents: results.documents || [],
        metadatas: results.metadatas || []
      };
    } catch (error) {
      console.error('Error fetching documents from ChromaDB:', error);
      throw error;
    }
  }

  async deleteDocument(collectionName: string, id: string): Promise<void> {
    try {
      await this.initCollection(collectionName);
      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      // console.log(`Deleting document ${id} from collection ${collectionName}`);
      await collection.delete({
        ids: [id]
      });
      // console.log('Document deleted successfully');
    } catch (error) {
      console.error(`Error deleting document from ChromaDB:`, error);
      throw error;
    }
  }

  async deleteDocumentsWithoutModelOrCollection(): Promise<void> {
    try {
      const collections = await this.getCollections();
      
      for (const collectionName of collections) {
        await this.initCollection(collectionName);
        const collection = this.collections.get(collectionName);
        const results = await collection.get();
        
        if (results && results.ids) {
          for (let i = 0; i < results.ids.length; i++) {
            const metadata = results.metadatas?.[i] || {};
            if (!metadata.modelId || !metadata.collectionName) {
              await collection.delete({ ids: [results.ids[i]] });
              // console.log(`Deleted document ${results.ids[i]} without model/collection info`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up documents:', error);
      throw error;
    }
  }

  async deleteCollection(collectionName: string): Promise<void> {
    try {
      // Delete all documents in the collection first
      await this.initCollection(collectionName);
      const collection = this.collections.get(collectionName);
      if (collection) {
        const results = await collection.get();
        if (results && results.ids && results.ids.length > 0) {
          // Delete all document chunks and log each deletion
          for (let i = 0; i < results.ids.length; i++) {
            const metadata = results.metadatas?.[i];
            if (metadata && metadata.filename) {
              // console.log(`Deleting file: ${metadata.filename} (id: ${results.ids[i]}) from collection ${collectionName}`);
            } else {
              // console.log(`Deleting document with id: ${results.ids[i]} from collection ${collectionName}`);
            }
          }
          await collection.delete({
            ids: results.ids
          });
          // console.log(`Deleted ${results.ids.length} chunks from collection ${collectionName}`);
        }
      }

      // Delete collection from ChromaDB
      await this.client.deleteCollection({
        name: collectionName
      });
      this.collections.delete(collectionName);

      // Delete from MongoDB
      await CollectionModel.deleteOne({ name: collectionName });
      
      // console.log(`Collection ${collectionName} deleted successfully`);
    } catch (error) {
      // console.error(`Error deleting collection ${collectionName}:`, error);
      throw error;
    }
  }

  // เพิ่มเมธอดสำหรับลบหลาย collections พร้อมกัน
  async deleteCollections(collectionNames: string[]): Promise<void> {
    try {
      // ลบทีละ collection
      for (const name of collectionNames) {
        await this.deleteCollection(name);
      }
      // console.log(`${collectionNames.length} collections deleted successfully`);
    } catch (error) {
      console.error('Error deleting collections:', error);
      throw error;
    }
  }

  async createCollection(name: string, permission: CollectionPermission, createdBy: string): Promise<HydratedDocument<CollectionDocument>> {
    try {
      // Check if collection already exists
      const existingCollection = await CollectionModel.findOne({ name });
      if (existingCollection) {
        return existingCollection;
      }

      // Create collection in MongoDB
      const collection = await CollectionModel.create({
        name,
        permission,
        createdBy
      });

      // Initialize collection in ChromaDB
      await this.initCollection(name);

      return collection;
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  }

  async ensureDefaultCollection(): Promise<void> {
    try {
      const defaultCollection = await CollectionModel.findOne({ name: 'Default' });
      if (!defaultCollection) {
        await this.createCollection('Default', CollectionPermission.PUBLIC, 'system');
        // console.log('Created default collection');
      }
    } catch (error) {
      console.error('Error ensuring default collection:', error);
      throw error;
    }
  }

  async deleteAllDocuments(collectionName: string): Promise<void> {
    try {
      await this.initCollection(collectionName);
      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      const documents = await collection.get();
      if (documents.ids.length > 0) {
        await collection.delete({
          ids: documents.ids
        });
      }
      
      // console.log(`All documents in collection ${collectionName} deleted successfully`);
    } catch (error) {
      // console.error('Error deleting all documents:', error);
      throw error;
    }
  }

  async checkCollectionAccess(collectionName: string, user: { nameID: string, username: string, groups: string[] }) {
    try {
      // ค้นหา collection จาก MongoDB
      const collection = await CollectionModel.findOne({ name: collectionName });
      
      // ถ้าไม่พบ collection
      if (!collection) {
        return false;
      }

      // Admin has access to all collections
      if (user.groups.includes('Admin') || user.groups.includes('SuperAdmin')) {
        return true;
      }

      // Get user identifier (nameID or username)
      const userId = user.nameID || user.username;

      // ตรวจสอบสิทธิ์
      switch (collection.permission) {
        case CollectionPermission.PUBLIC:
          return true;
        case CollectionPermission.PRIVATE:
          return collection.createdBy === userId;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking collection access:', error);
      throw error;
    }
  }

  // เพิ่มเมธอดสำหรับตรวจสอบการมีอยู่ของ collection
  async ensureCollectionExists(name: string, user: { nameID: string }) {
    try {
      let collection = await CollectionModel.findOne({ name });
      
      if (!collection) {
        collection = await CollectionModel.create({
          name,
          permission: CollectionPermission.PUBLIC,
          createdBy: user.nameID,
          created: new Date()
        });
      }
      
      return collection;
    } catch (error) {
      console.error('Error ensuring collection exists:', error);
      throw error;
    }
  }
}

export const chromaService = new ChromaService(); 