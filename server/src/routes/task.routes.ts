import { Router } from "express";
import { taskController } from "../controllers/task.controller";
import { authenticate } from "../middleware/auth";
import { permissionGuard } from "../middleware/role.guard";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksSchema,
} from "../validation";
import { z } from "zod";

const router = Router();

router.use(authenticate);

const taskIdParamSchema = z.object({ taskId: z.string().uuid("Invalid task ID") });
const noteIdParamSchema = z.object({ taskId: z.string().uuid(), noteId: z.string().uuid() });

// ─── Stats & Reminders (before /:taskId) ──────────────

router.get("/stats", permissionGuard("task", "read"), taskController.stats);
router.get("/reminders", permissionGuard("task", "read"), taskController.reminders);

// ─── CRUD ─────────────────────────────────────────────

router.get("/", permissionGuard("task", "read"), validateQuery(listTasksSchema), taskController.list);
router.post("/", permissionGuard("task", "create"), validateBody(createTaskSchema), taskController.create);

router.get("/:taskId", validateParams(taskIdParamSchema), permissionGuard("task", "read"), taskController.getById);
router.patch("/:taskId", validateParams(taskIdParamSchema), permissionGuard("task", "update"), validateBody(updateTaskSchema), taskController.update);
router.delete("/:taskId", validateParams(taskIdParamSchema), permissionGuard("task", "delete"), taskController.delete);

// ─── Task Actions ─────────────────────────────────────

router.post("/:taskId/complete", validateParams(taskIdParamSchema), permissionGuard("task", "update"), taskController.complete);

// ─── Notes ────────────────────────────────────────────

router.get("/:taskId/notes", validateParams(taskIdParamSchema), permissionGuard("task", "read"), taskController.getNotes);
router.post("/:taskId/notes", validateParams(taskIdParamSchema), permissionGuard("task", "create"), taskController.addNote);
router.delete("/:taskId/notes/:noteId", validateParams(noteIdParamSchema), permissionGuard("task", "delete"), taskController.deleteNote);

export default router;
