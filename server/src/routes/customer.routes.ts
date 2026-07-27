import { Router } from "express";
import { customerController } from "../controllers/customer.controller";
import { authenticate } from "../middleware/auth";
import { permissionGuard } from "../middleware/role.guard";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import { createCustomerSchema, updateCustomerSchema, listCustomersSchema } from "../validation";
import { z } from "zod";

const router = Router();

router.use(authenticate);

const customerIdParamSchema = z.object({ customerId: z.string().uuid("Invalid customer ID") });
const contactIdParamSchema = z.object({ customerId: z.string().uuid(), contactId: z.string().uuid() });

// ─── Stats (before /:customerId) ──────────────────────

router.get("/stats", permissionGuard("customer", "read"), customerController.stats);

// ─── CRUD ─────────────────────────────────────────────

router.get("/", permissionGuard("customer", "read"), validateQuery(listCustomersSchema), customerController.list);
router.post("/", permissionGuard("customer", "create"), validateBody(createCustomerSchema), customerController.create);

router.get("/:customerId", validateParams(customerIdParamSchema), permissionGuard("customer", "read"), customerController.getById);
router.patch("/:customerId", validateParams(customerIdParamSchema), permissionGuard("customer", "update"), validateBody(updateCustomerSchema), customerController.update);
router.delete("/:customerId", validateParams(customerIdParamSchema), permissionGuard("customer", "delete"), customerController.delete);

// ─── Assign ───────────────────────────────────────────

router.post("/:customerId/assign", validateParams(customerIdParamSchema), permissionGuard("customer", "update"), customerController.assign);

// ─── Timeline ─────────────────────────────────────────

router.get("/:customerId/timeline", validateParams(customerIdParamSchema), permissionGuard("customer", "read"), customerController.getTimeline);

// ─── Notes ────────────────────────────────────────────

router.get("/:customerId/notes", validateParams(customerIdParamSchema), permissionGuard("customer", "read"), customerController.getNotes);
router.post("/:customerId/notes", validateParams(customerIdParamSchema), permissionGuard("customer", "create"), customerController.addNote);

// ─── Contacts ─────────────────────────────────────────

router.get("/:customerId/contacts", validateParams(customerIdParamSchema), permissionGuard("customer", "read"), customerController.getContacts);
router.post("/:customerId/contacts", validateParams(customerIdParamSchema), permissionGuard("customer", "create"), customerController.addContact);
router.patch("/:customerId/contacts/:contactId", validateParams(contactIdParamSchema), permissionGuard("customer", "update"), customerController.updateContact);
router.delete("/:customerId/contacts/:contactId", validateParams(contactIdParamSchema), permissionGuard("customer", "delete"), customerController.deleteContact);

// ─── Deals ────────────────────────────────────────────

router.get("/:customerId/deals", validateParams(customerIdParamSchema), permissionGuard("deal", "read"), customerController.getDeals);

export default router;
