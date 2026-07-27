import { Router } from "express";
import { dealController } from "../controllers/deal.controller";
import { authenticate } from "../middleware/auth";
import { permissionGuard } from "../middleware/role.guard";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import { createDealSchema, updateDealSchema, listDealsSchema, createPipelineSchema, createStageSchema, reorderStagesSchema } from "../validation";
import { z } from "zod";

const router = Router();

router.use(authenticate);

const dealIdParamSchema = z.object({ dealId: z.string().uuid("Invalid deal ID") });
const pipelineIdParamSchema = z.object({ pipelineId: z.string().uuid("Invalid pipeline ID") });
const stageIdParamSchema = z.object({ stageId: z.string().uuid("Invalid stage ID") });
const noteIdParamSchema = z.object({ dealId: z.string().uuid(), noteId: z.string().uuid() });

// ─── Stats & Forecast (before /:dealId) ───────────────

router.get("/stats", permissionGuard("deal", "read"), dealController.stats);
router.get("/forecast", permissionGuard("deal", "read"), dealController.forecast);

// ─── Kanban View ──────────────────────────────────────

router.get("/kanban", permissionGuard("deal", "read"), dealController.kanban);

// ─── Pipeline CRUD ────────────────────────────────────

router.get("/pipelines", permissionGuard("deal", "read"), dealController.listPipelines);
router.post("/pipelines", permissionGuard("deal", "create"), validateBody(createPipelineSchema), dealController.createPipeline);

router.get("/pipelines/:pipelineId", validateParams(pipelineIdParamSchema), permissionGuard("deal", "read"), dealController.getPipeline);
router.patch("/pipelines/:pipelineId", validateParams(pipelineIdParamSchema), permissionGuard("deal", "update"), dealController.updatePipeline);
router.delete("/pipelines/:pipelineId", validateParams(pipelineIdParamSchema), permissionGuard("deal", "delete"), dealController.deletePipeline);

router.get("/pipelines/:pipelineId/stages", validateParams(pipelineIdParamSchema), permissionGuard("deal", "read"), dealController.getStageStats);
router.post("/pipelines/:pipelineId/stages", validateParams(pipelineIdParamSchema), permissionGuard("deal", "create"), validateBody(createStageSchema), dealController.createStage);
router.put("/pipelines/:pipelineId/stages/reorder", validateParams(pipelineIdParamSchema), permissionGuard("deal", "update"), validateBody(reorderStagesSchema), dealController.reorderStages);

router.patch("/stages/:stageId", validateParams(stageIdParamSchema), permissionGuard("deal", "update"), dealController.updateStage);
router.delete("/stages/:stageId", validateParams(stageIdParamSchema), permissionGuard("deal", "delete"), dealController.deleteStage);

// ─── Deal CRUD ────────────────────────────────────────

router.get("/", permissionGuard("deal", "read"), validateQuery(listDealsSchema), dealController.list);
router.post("/", permissionGuard("deal", "create"), validateBody(createDealSchema), dealController.create);

router.get("/:dealId", validateParams(dealIdParamSchema), permissionGuard("deal", "read"), dealController.getById);
router.patch("/:dealId", validateParams(dealIdParamSchema), permissionGuard("deal", "update"), validateBody(updateDealSchema), dealController.update);
router.delete("/:dealId", validateParams(dealIdParamSchema), permissionGuard("deal", "delete"), dealController.delete);

// ─── Deal Actions ─────────────────────────────────────

router.post("/:dealId/move-stage", validateParams(dealIdParamSchema), permissionGuard("deal", "update"), dealController.moveStage);
router.post("/:dealId/assign", validateParams(dealIdParamSchema), permissionGuard("deal", "update"), dealController.assign);

// ─── Timeline & Notes ─────────────────────────────────

router.get("/:dealId/timeline", validateParams(dealIdParamSchema), permissionGuard("deal", "read"), dealController.getTimeline);
router.get("/:dealId/notes", validateParams(dealIdParamSchema), permissionGuard("deal", "read"), dealController.getNotes);
router.post("/:dealId/notes", validateParams(dealIdParamSchema), permissionGuard("deal", "create"), dealController.addNote);

export default router;
