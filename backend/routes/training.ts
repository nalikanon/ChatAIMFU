import { Router, Request, Response } from 'express';
import { roleGuard } from '../middleware/roleGuard';
import multer from 'multer';
import path from 'path';
import { documentService } from '../services/document';
import { chromaService } from '../services/chroma';
import { titanEmbedService } from '../services/titan';
import { splitTextIntoChunks } from '../utils/textUtils';
import { webScraperService } from '../services/webScraper';
import { CollectionModel, CollectionDocument } from '../models/Collection';
import iconv from 'iconv-lite';
import { CollectionPermission } from '../models/Collection';
import { UserRole } from '../models/User';
import { TrainingHistory } from '../models/TrainingHistory';

const router = Router();

// Ensure default collection exists when server starts
chromaService.ensureDefaultCollection().catch(error => {
  console.error('Failed to create default collection:', error);
});

// -------------------------------------------------
// Multer Configuration for File Uploads
// -------------------------------------------------
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 1 * 1024 * 1024, // 500MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.json', '.xml'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported formats: PDF, TXT, DOC, DOCX, XLS, XLSX, CSV, JSON, XML'));
    }
  }
});

// -------------------------------------------------
// Helper Functions
// -------------------------------------------------

/**
 * Checks if the given user is allowed to access or modify the collection.
 * Returns true if user is Admin or SuperAdmin or is the owner of the collection.
 */
async function checkCollectionAccess(user: any, collection: any): Promise<boolean> {
  return user.groups.includes('Admin') || user.groups.includes('SuperAdmin') || 
         collection.createdBy === (user.nameID || user.username);
}

/**
 * Processes a file upload:
 * 1. Decodes the filename.
 * 2. Extracts text from the file.
 * 3. Splits the text into chunks.
 * 4. Embeds each chunk.
 * 5. Returns the array of document objects.
 */
async function processFileDocuments(file: Express.Multer.File, user: any, modelId: string, collectionName: string): Promise<{ text: string; metadata: any; embedding: number[] }[]> {
  // Decode filename to UTF-8
  const filename = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf-8');
  // console.log(`Processing file: ${filename}`);
  const text = await documentService.processFile(file);
  // console.log(`Text length (${text.length}) exceeds chunk size; splitting into chunks`);
  const chunks = splitTextIntoChunks(text);
  // console.log(`Created ${chunks.length} chunks`);

  const documents = await Promise.all(
    chunks.map(async (chunk) => {
      const embedResult = await titanEmbedService.embedText(chunk);
      return {
        text: chunk,
        metadata: {
          filename,
          uploadedBy: user.username,
          timestamp: new Date().toISOString(),
          modelId,
          collectionName
        },
        embedding: embedResult
      };
    })
  );
  return documents;
}

// -------------------------------------------------
// File Upload Endpoints
// -------------------------------------------------

/**
 * POST /upload
 * Staff-only endpoint that processes a file upload and stores document chunks with embeddings.
 */
router.post('/upload', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const { modelId, collectionName } = req.body;
    const user = (req as any).user;

    const documents = await processFileDocuments(file, user, modelId, collectionName);
    // console.log(`Adding ${documents.length} document chunks with embeddings to collection ${collectionName}`);
    await chromaService.addDocuments(collectionName, documents);
    
    const userId = user.nameID || user.username;
    if (!userId) {
      throw new Error('User identifier not found');
    }
    
    // Track the upload in history
    await TrainingHistory.create({
      userId: userId,
      username: user.username,
      collectionName,
      documentName: file.originalname,
      action: 'upload',
      details: {
        modelId,
        chunks: documents.length
      }
    });
    
    res.json({ 
      message: 'File processed successfully with vector embeddings',
      chunks: documents.length
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error processing upload' });
  }
});

/**
 * POST /documents
 * Endpoint for Students and Staffs to upload a file.
 * Also ensures collection exists before processing.
 */
router.post('/documents', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin'] as UserRole[]), upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { modelId, collectionName } = req.body;
    const user = (req as any).user;

    // Ensure the collection exists (creates if needed)
    await chromaService.ensureCollectionExists(collectionName, user);

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const documents = await processFileDocuments(file, user, modelId, collectionName);
    // console.log(`Adding documents with embeddings to collection ${collectionName}`);
    await chromaService.addDocuments(collectionName, documents);
    
    res.json({ 
      message: 'File processed successfully with embeddings',
      chunks: documents.length
    });
  } catch (error) {
    console.error('Error processing document:', error);
    res.status(500).json({ error: 'Error processing document' });
  }
});

// -------------------------------------------------
// Collection Endpoints (Using Collection ID consistently)
// -------------------------------------------------

/**
 * GET /collections
 * Lists all collections with ID, name, permission, and createdBy.
 */
router.get('/collections', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response) => {
  try {
    const collections = await CollectionModel.find({}).lean() as (CollectionDocument & { _id: any })[];
    res.json(
      collections.map(collection => ({
        id: collection._id.toString(),
        name: collection.name,
        permission: collection.permission,
        createdBy: collection.createdBy,
        createdAt: collection.createdAt
      }))
    );
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Error fetching collections' });
  }
});

/**
 * POST /collections
 * Creates a new collection.
 */
router.post('/collections', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response) => {
  try {
    const { name, permission } = req.body;
    const user = (req as any).user;
    
    // Use nameID if available, otherwise fall back to username (for admin users)
    const createdBy = user.nameID || user.username;
    if (!createdBy) {
      throw new Error('User identifier not found');
    }
    
    const newCollection = await chromaService.createCollection(name, permission, createdBy);
    
    // Track collection creation
    await TrainingHistory.create({
      userId: user.nameID || user.username,
      username: user.username,
      collectionName: name,
      action: 'create_collection',
      details: {
        permission
      }
    });
    
    res.status(201).json({
      message: 'Collection created successfully',
      collection: {
        id: newCollection.id.toString(),
        name: newCollection.name,
        permission: newCollection.permission,
        createdBy: newCollection.createdBy
      }
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

/**
 * PUT /collections/:id
 * Updates a collection using its MongoDB identifier.
 */
router.put('/collections/:id', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name: newName, permission } = req.body;
    const user = (req as any).user;

    const collection: CollectionDocument | null = await CollectionModel.findById(id).exec();
    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    const canAccess =
      collection.permission === CollectionPermission.PUBLIC || collection.permission === CollectionPermission.PRIVATE || collection.createdBy === user.nameID;
    if (!canAccess) {
      res.status(403).json({ error: 'Permission denied' });
      return;
    }
    
    // Update collection details
    collection.name = newName;
    collection.permission = permission;
    await collection.save();
    
    res.json({ message: 'Collection updated successfully' });
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

/**
 * DELETE /collections/:id
 * Deletes a single collection using its MongoDB identifier.
 */
router.delete('/collections/:id', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    const collection: CollectionDocument | null = await CollectionModel.findById(id);
    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }
    
    if (!(await checkCollectionAccess(user, collection))) {
      res.status(403).json({ error: 'Permission denied' });
      return;
    }

    // เพิ่มการตรวจสอบและกำหนด userId
    const userId = user.nameID || user.username;
    if (!userId) {
      throw new Error('User identifier not found');
    }
    
    // Track collection deletion with userId ที่ตรวจสอบแล้ว
    await TrainingHistory.create({
      userId: userId,
      username: user.username,
      collectionName: collection.name,
      action: 'delete_collection'
    });
    
    await chromaService.deleteCollection(collection.name);
    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

/**
 * DELETE /collections
 * Deletes multiple collections given an array of collection IDs.
 */
router.delete('/collections', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { collections } = req.body; // Expects an array of collection IDs
    const user = (req as any).user;
    if (!Array.isArray(collections)) {
      res.status(400).json({ error: 'Invalid collections array' });
      return;
    }
    
    const collectionNames: string[] = [];
    for (const id of collections) {
      const coll: CollectionDocument | null = await CollectionModel.findById(id);
      if (!coll) {
        res.status(404).json({ error: `Collection not found for id: ${id}` });
        return;
      }
      if (!(await checkCollectionAccess(user, coll))) {
        res.status(403).json({ error: `Permission denied for collection with id: ${id}` });
        return;
      }
      collectionNames.push(coll.name);
    }
    
    await chromaService.deleteCollections(collectionNames);
    res.json({ message: 'Collections deleted successfully' });
  } catch (error) {
    console.error('Error deleting collections:', error);
    res.status(500).json({ error: 'Failed to delete collections' });
  }
});

// -------------------------------------------------
// Document Endpoints
// -------------------------------------------------

/**
 * GET /documents
 * Retrieves documents for a given collection (provided via query parameter)
 * and groups document chunks by filename.
 */
router.get('/documents', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { collectionName } = req.query;
    const user = (req as any).user;
    if (!collectionName || typeof collectionName !== 'string') {
      res.status(400).json({ error: 'Collection name is required' });
      return;
    }
    
    const collection: CollectionDocument | null = await CollectionModel.findOne({ name: collectionName }).exec();
    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }
    
    // Check user permission based on collection settings.
    const userId = user.nameID || user.username;
    const canAccess = 
      collection.permission === CollectionPermission.PUBLIC || collection.createdBy === userId;
    if (!canAccess) {
      res.status(403).json({ error: 'No permission to access this collection' });
      return;
    }
    
    // Get raw document data from ChromaDB via our service.
    const docsData = await chromaService.getAllDocuments(collectionName);
    // docsData contains: { ids: string[], documents: string[], metadatas: Record<string, any>[] }
    
    // Group the document chunks by filename.
    const filesMap: {
      [filename: string]: { filename: string; uploadedBy: string; timestamp: string; ids: string[] }
    } = {};
    
    for (let i = 0; i < docsData.metadatas.length; i++) {
      const metadata = docsData.metadatas[i];
      const id = docsData.ids[i];
      // Expect metadata to include filename (set in the file processing code)
      if (metadata && metadata.filename) {
        const filename = metadata.filename;
        if (!filesMap[filename]) {
          filesMap[filename] = {
            filename,
            uploadedBy: metadata.uploadedBy,
            timestamp: metadata.timestamp,
            ids: []
          };
        }
        filesMap[filename].ids.push(id);
      }
    }
    
    const filesArray = Object.values(filesMap);
    res.json(filesArray);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

/**
 * DELETE /documents/:id
 * Deletes a single document given its ID and the collectionName in query.
 */
router.delete('/documents/:id', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { collectionName } = req.query;
    const user = (req as any).user;
    
    if (!id || !collectionName || typeof collectionName !== 'string') {
      res.status(400).json({ error: 'Missing document ID or collection name' });
      return;
    }

    const collection: CollectionDocument | null = await CollectionModel.findOne({ name: collectionName }).exec();
    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    const canDelete = user.groups.includes('Staffs') || collection.createdBy === (user.nameID || user.username);
    if (!canDelete) {
      res.status(403).json({ error: 'No permission to delete this document' });
      return;
    }

    await chromaService.deleteDocument(collectionName, id);
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * DELETE /documents/all/:collectionName
 * Deletes all documents for the provided collection.
 */
router.delete('/documents/all/:collectionName', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response) => {
  try {
    const { collectionName } = req.params;
    await chromaService.deleteAllDocuments(collectionName);
    res.status(200).json({ message: 'All documents deleted successfully' });
  } catch (error) {
    console.error('Error deleting all documents:', error);
    res.status(500).json({ error: 'Failed to delete all documents' });
  }
});

// -------------------------------------------------
// URL Processing Endpoint
// -------------------------------------------------

/**
 * POST /add-urls
 * Staff-only endpoint that scrapes content from URLs, processes them,
 * embeds them, and adds them to the specified collection.
 */
router.post('/add-urls', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { urls, modelId, collectionName } = req.body;
    const user = (req as any).user;

    if (!Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ error: 'URLs array is required' });
      return;
    }

    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const content = await webScraperService.scrapeUrl(url);
          const chunks = splitTextIntoChunks(content);
          const documents = await Promise.all(
            chunks.map(async (chunk) => {
              const embedResult = await titanEmbedService.embedText(chunk);
              return {
                text: chunk,
                metadata: {
                  url,
                  uploadedBy: user.username,
                  timestamp: new Date().toISOString(),
                  modelId,
                  collectionName
                },
                embedding: embedResult
              };
            })
          );
          await chromaService.addDocuments(collectionName, documents);
          return { url, success: true, chunks: documents.length };
        } catch (error: any) {
          console.error(`Error processing URL ${url}:`, error);
          return { url, success: false, error: error.message };
        }
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('Error processing URLs:', error);
    res.status(500).json({ error: 'Error processing URLs' });
  }
});

/**
 * DELETE /cleanup
 * Staff-only endpoint that cleans up orphaned documents.
 * Removes documents that do not have a model or collection reference.
 */
router.delete('/cleanup', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    await chromaService.deleteDocumentsWithoutModelOrCollection();
    res.json({ message: 'Cleanup completed successfully' });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Error during cleanup' });
  }
});

router.get('/example/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Use .exec() so that findById returns a properly typed Promise<CollectionDocument | null>
    const collection = await CollectionModel.findById(id).exec();
    if (!collection) {
      res.status(404).json({ error: 'Collection not found' });
      return;
    }

    const canAccess =
      collection.permission === CollectionPermission.PUBLIC || collection.createdBy === (req as any).user.nameID;

    res.status(200).json({
      id: collection._id,
      canAccess,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/collections/:id/upload', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response) => {
  // ... existing code ...
});

router.post('/collections/:id/process', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response) => {
  // ... existing code ...
});

router.post('/collections/:id/process-batch', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response) => {
  // ... existing code ...
});

router.post('/collections/:id/process-status', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response) => {
  // ... existing code ...
});

router.post('/collections/:id/documents/:docId/process', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response) => {
  // ... existing code ...
});

router.delete('/collections/:id/documents/:docId', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response) => {
  // ... existing code ...
});

router.post('/collections/:id/documents/:docId/process-status', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response) => {
  // ... existing code ...
});

/**
 * GET /history
 * Gets training history for the user
 */
router.get('/history', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let query = {};
    
    // If not admin or staff, only show user's own history
    if (!user.groups.includes('Admin') && !user.groups.includes('SuperAdmin')) {
      query = { userId: user.nameID };
    }

    const history = await TrainingHistory.find(query)
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(history);
  } catch (error) {
    console.error('Error fetching training history:', error);
    res.status(500).json({ error: 'Error fetching training history' });
  }
});

export default router; 