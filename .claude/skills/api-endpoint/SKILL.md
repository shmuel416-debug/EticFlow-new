---
name: api-endpoint
description: Use when creating new Express API routes, controllers, or middleware
---

# API Endpoint Pattern

## File Structure (per resource)
```
routes/<resource>.routes.js    → Route definitions + validation
controllers/<resource>.controller.js → Business logic
```

## Route File Template
```javascript
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import * as controller from '../controllers/<resource>.controller.js';

const router = Router();
router.get('/', authenticate, authorize(['ADMIN', 'SECRETARY']), controller.list);
router.post('/', authenticate, authorize(['RESEARCHER']), validate(createSchema), controller.create);
export default router;
```

## Controller Template
```javascript
/**
 * List all <resources> with pagination and filtering.
 * @param {Request} req - Express request (query: page, limit, status)
 * @param {Response} res - Express response
 */
export async function list(req, res, next) {
  try {
    // ... logic
    res.json({ data, pagination });
  } catch (error) {
    next(error);
  }
}
```

## Rules
- ALWAYS validate input with Zod before processing
- ALWAYS wrap controller logic in try/catch → next(error)
- ALWAYS check authorization via middleware, not in controller
- Error format: `{ error: "message", code: "RESOURCE_NOT_FOUND" }`
- Pagination: `{ data: [], pagination: { page, limit, total, pages } }`
- Log sensitive actions via audit middleware
