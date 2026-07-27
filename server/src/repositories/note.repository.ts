import { Prisma, Note } from "@prisma/client";
import { prisma } from "../database";

export interface CreateNoteInput {
  organizationId: string;
  content: string;
  entityType: "lead" | "customer" | "deal" | "contact" | "activity";
  entityId: string;
  isPinned?: boolean;
  createdByUserId: string;
}

export interface UpdateNoteInput {
  content?: string;
  isPinned?: boolean;
}

export const noteRepository = {
  async create(data: CreateNoteInput): Promise<Note> {
    const noteData: Prisma.NoteCreateInput = {
      content: data.content,
      isPinned: data.isPinned || false,
      organization: { connect: { id: data.organizationId } },
      createdByUser: { connect: { id: data.createdByUserId } },
    };

    if (data.entityType === "lead") noteData.lead = { connect: { id: data.entityId } };
    else if (data.entityType === "customer") noteData.customer = { connect: { id: data.entityId } };
    else if (data.entityType === "deal") noteData.deal = { connect: { id: data.entityId } };
    else if (data.entityType === "contact") noteData.contact = { connect: { id: data.entityId } };
    else if (data.entityType === "activity") noteData.activity = { connect: { id: data.entityId } };

    return prisma.note.create({ data: noteData });
  },

  async findById(id: string): Promise<Note | null> {
    return prisma.note.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  },

  async findByEntity(entityType: string, entityId: string): Promise<Note[]> {
    const where: Prisma.NoteWhereInput = {
      [entityType]: { id: entityId },
      deletedAt: null,
    };

    return prisma.note.findMany({
      where,
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });
  },

  async update(id: string, data: UpdateNoteInput): Promise<Note> {
    return prisma.note.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async softDelete(id: string): Promise<void> {
    await prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
