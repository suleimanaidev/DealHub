import { Router } from "express";
import { leadController } from "../controllers/lead.controller";
import { authenticate } from "../middleware/auth";
import { permissionGuard } from "../middleware/role.guard";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import {
  createLeadSchema,
  updateLeadSchema,
  listLeadsSchema,
  convertLeadSchema,
  bulkLeadSchema,
  bulkAssignLeadSchema,
  bulkUpdateLeadStatusSchema,
} from "../validation";
import { z } from "zod";

const router = Router();

router.use(authenticate);

const leadIdParamSchema = z.object({ leadId: z.string().uuid("Invalid lead ID") });
const noteIdParamSchema = z.object({ leadId: z.string().uuid(), noteId: z.string().uuid() });

// ─── Stats & Export (before /:leadId) ─────────────────

router.get("/stats", permissionGuard("lead", "read"), leadController.stats);
router.get("/export", permissionGuard("lead", "export"), leadController.exportLeads);
router.post("/import", permissionGuard("lead", "import"), leadController.importLeads);

// ─── Bulk Operations ──────────────────────────────────

router.post("/bulk/assign", permissionGuard("lead", "assign"), validateBody(bulkAssignLeadSchema), leadController.bulkAssign);
router.post("/bulk/status", permissionGuard("lead", "update"), validateBody(bulkUpdateLeadStatusSchema), leadController.bulkUpdateStatus);
router.post("/bulk/delete", permissionGuard("lead", "delete"), validateBody(bulkLeadSchema), leadController.bulkDelete);

// ─── Duplicate Check ──────────────────────────────────

router.get("/check-duplicates", permissionGuard("lead", "read"), leadController.checkDuplicates);

// ─── CRUD ─────────────────────────────────────────────

router.get("/", permissionGuard("lead", "read"), validateQuery(listLeadsSchema), leadController.list);
router.post("/", permissionGuard("lead", "create"), validateBody(createLeadSchema), leadController.create);
router.post("/force", permissionGuard("lead", "create"), validateBody(createLeadSchema), leadController.createForce);

router.get("/:leadId", validateParams(leadIdParamSchema), permissionGuard("lead", "read"), leadController.getById);
router.patch("/:leadId", validateParams(leadIdParamSchema), permissionGuard("lead", "update"), validateBody(updateLeadSchema), leadController.update);
router.delete("/:leadId", validateParams(leadIdParamSchema), permissionGuard("lead", "delete"), leadController.delete);

// ─── Lead Actions ─────────────────────────────────────

router.post("/:leadId/assign", validateParams(leadIdParamSchema), permissionGuard("lead", "assign"), leadController.assign);
router.post("/:leadId/transfer", validateParams(leadIdParamSchema), permissionGuard("lead", "assign"), leadController.transfer);
router.post("/:leadId/convert", validateParams(leadIdParamSchema), permissionGuard("lead", "convert"), validateBody(convertLeadSchema), leadController.convert);

// ─── Timeline ─────────────────────────────────────────

router.get("/:leadId/timeline", validateParams(leadIdParamSchema), permissionGuard("lead", "read"), leadController.timeline);

// ─── Notes ────────────────────────────────────────────

router.get("/:leadId/notes", validateParams(leadIdParamSchema), permissionGuard("lead", "read"), leadController.getNotes);
router.post("/:leadId/notes", validateParams(leadIdParamSchema), permissionGuard("lead", "create"), leadController.addNote);
router.patch("/:leadId/notes/:noteId", validateParams(noteIdParamSchema), permissionGuard("lead", "update"), leadController.updateNote);
router.delete("/:leadId/notes/:noteId", validateParams(noteIdParamSchema), permissionGuard("lead", "delete"), leadController.deleteNote);

export default router;
