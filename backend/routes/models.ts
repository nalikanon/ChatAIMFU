import { Router, Request, Response } from 'express';
import { ModelModel, ModelDocument } from '../models/Model';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../models/User';
import { TrainingHistory } from '../models/TrainingHistory';

const router = Router();

/**
 * GET /api/models
 * Retrieves all models (filtered based on user role)
 */
router.get('/', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    // console.log('User in models route:', user);
    
    // ดึงข้อมูลผู้ใช้
    const userId = user.nameID || user.username;
    const userGroups = user.groups || [];
    const isAdmin = userGroups.includes('Admin') || userGroups.includes('SuperAdmin');
    const userDepartment = user.department;
    
    // Get all models
    const models = await ModelModel.find({}).lean();
    // console.log('Found models:', models);
    
    // กรองโมเดลตามเงื่อนไข:
    // 1. ทุก User เห็นเฉพาะ official และ personal ของตัวเอง
    // 2. User เห็น department models ที่ตรงกับ department ของตัวเอง
    const filteredModels = models.filter(model => {
      // Official models - ทุกคนมองเห็น
      if (model.modelType === 'official') {
        return true;
      }
      
      // Personal models - เฉพาะเจ้าของเท่านั้น
      if (model.modelType === 'personal' && model.createdBy === userId) {
        return true;
      }
      
      // Department models - เฉพาะคนในแผนกเดียวกัน
      if (model.modelType === 'department' && model.department === userDepartment) {
        return true;
      }
      
      return false;
    });

    res.json(filteredModels);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Error fetching models' });
  }
});

/**
 * POST /api/models
 * Creates a new model
 */
router.post('/', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { name, modelType, department } = req.body;
    
    // Validate required fields
    if (!name || !modelType) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if user has Admin privileges from groups array
    const userGroups = user.groups || [];
    const isAdmin = userGroups.includes('Admin') || userGroups.includes('SuperAdmin');

    // Only Admin or SuperAdmin can create official or department models
    if ((modelType === 'official' || modelType === 'department') && !isAdmin) {
      res.status(403).json({ message: 'Only Admin or SuperAdmin can create official or department models' });
      return;
    }

    // Department models require a department field
    if (modelType === 'department' && !department) {
      res.status(400).json({ error: 'Department is required for department models' });
      return;
    }

    // For admin users, use username as createdBy since they don't have nameID
    const createdBy = user.nameID || user.username;
    if (!createdBy) {
      res.status(400).json({ error: 'User identifier not found in token' });
      return;
    }

    // Create the model with empty collections array
    const model = await ModelModel.create({
      name,
      createdBy,
      modelType,
      department: modelType === 'department' ? department : undefined,
      collections: [], // Start with empty collections array
    });

    res.status(201).json(model);
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({ error: 'Error creating model' });
  }
});

/**
 * PUT /api/models/:id/collections
 * Updates a model's collections
 */
router.put('/:id/collections', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { collections } = req.body;
    const user = (req as any).user;

    // ตรวจสอบว่า model มีอยู่จริง
    const model = await ModelModel.findById(id);
    if (!model) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    // ตรวจสอบสิทธิ์การแก้ไข
    const userGroups = user.groups || [];
    const isStaff = userGroups.includes('Staffs') || userGroups.includes('Admin') || userGroups.includes('Students') || userGroups.includes('SuperAdmin');
    const isOwner = model.createdBy === (user.nameID || user.username);

    if (!isStaff && !isOwner) {
      res.status(403).json({ error: 'Permission denied' });
      return;
    }

    // อัพเดท collections
    const updatedModel = await ModelModel.findByIdAndUpdate(
      id,
      { collections },
      { new: true, runValidators: true }
    );

    if (!updatedModel) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    // บันทึกประวัติการแก้ไข
    const userId = user.nameID || user.username;
    if (!userId) {
      throw new Error('User identifier not found');
    }

    // สร้าง TrainingHistory entries สำหรับแต่ละ collection
    await Promise.all(collections.map(async (collectionName: string) => {
      await TrainingHistory.create({
        userId: userId,
        username: user.username,
        collectionName: collectionName, // เพิ่ม collectionName
        documentName: model.name, // ใช้ชื่อ model เป็น documentName
        action: 'update_collection', // เปลี่ยนเป็น update_collection ตาม enum ที่กำหนด
        details: {
          modelId: id,
          modelName: model.name,
          collections: collections
        }
      });
    }));

    res.json(updatedModel);
  } catch (error) {
    console.error('Error updating model collections:', error);
    res.status(500).json({ error: 'Error updating model collections' });
  }
});

/**
 * DELETE /api/models/:id
 * Deletes a model
 */
router.delete('/:id', roleGuard(['Staffs', 'Admin', 'Students', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const model = await ModelModel.findByIdAndDelete(id);

    if (!model) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Error deleting model' });
  }
});

/**
 * GET /api/models/:id
 * Gets a model's details
 */
router.get('/:id', roleGuard(['Students', 'Staffs', 'Admin', 'SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const model = await ModelModel.findById(id);

    if (!model) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    res.json(model);
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({ error: 'Error fetching model' });
  }
});

export default router; 