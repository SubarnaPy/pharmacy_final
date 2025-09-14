import { Router } from 'express';
import multer from 'multer';
import {
  uploadMedicalDocument,
  getUserMedicalDocuments,
  getMedicalDocument,
  updateMedicalDocument,
  deleteMedicalDocument,
  shareMedicalDocument,
  revokeDocumentSharing,
  toggleDocumentArchive,
  getUserDocumentStats,
  reExtractDocumentText
} from '../controllers/medicalDocumentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file per request
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.'), false);
    }
  }
});

// Routes
router.post('/upload', 
  authenticate, 
  upload.single('document'), 
  asyncHandler(uploadMedicalDocument)
);

router.get('/stats', 
  authenticate, 
  asyncHandler(getUserDocumentStats)
);

router.get('/', 
  authenticate, 
  asyncHandler(getUserMedicalDocuments)
);

router.get('/:id', 
  authenticate, 
  asyncHandler(getMedicalDocument)
);

router.put('/:id', 
  authenticate, 
  asyncHandler(updateMedicalDocument)
);

router.delete('/:id', 
  authenticate, 
  asyncHandler(deleteMedicalDocument)
);

router.post('/:id/share', 
  authenticate, 
  asyncHandler(shareMedicalDocument)
);

router.delete('/:id/share/:shareUserId', 
  authenticate, 
  asyncHandler(revokeDocumentSharing)
);

router.patch('/:id/archive', 
  authenticate, 
  asyncHandler(toggleDocumentArchive)
);

router.post('/:id/re-extract', 
  authenticate, 
  asyncHandler(reExtractDocumentText)
);

export default router;
