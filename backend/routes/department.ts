import { Router, Request, Response } from 'express';
import { roleGuard } from '../middleware/roleGuard';
import { UserRole } from '../models/User';
import { 
  getAllDepartments, 
  getDepartmentById, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} from '../services/department_service';

const router = Router();

// Get all departments
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const departments = await getAllDepartments();
    res.status(200).json(departments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get department by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const department = await getDepartmentById(req.params.id);
    if (!department) {
      res.status(404).json({ message: 'Department not found' });
      return;
    }
    res.status(200).json(department);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create new department (SuperAdmin only)
router.post('/', roleGuard(['SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      res.status(400).json({ message: 'Department name is required' });
      return;
    }
    
    const department = await createDepartment({ name, description });
    res.status(201).json(department);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: error.message });
  }
});

// Update department (SuperAdmin only)
router.put('/:id', roleGuard(['SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    
    if (!name && !description) {
      res.status(400).json({ message: 'At least one field is required to update' });
      return;
    }
    
    const department = await updateDepartment(req.params.id, { name, description });
    
    if (!department) {
      res.status(404).json({ message: 'Department not found' });
      return;
    }
    
    res.status(200).json(department);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: error.message });
  }
});

// Delete department (SuperAdmin only)
router.delete('/:id', roleGuard(['SuperAdmin'] as UserRole[]), async (req: Request, res: Response): Promise<void> => {
  try {
    const department = await deleteDepartment(req.params.id);
    
    if (!department) {
      res.status(404).json({ message: 'Department not found' });
      return;
    }
    
    res.status(200).json({ message: 'Department deleted successfully', department });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router; 