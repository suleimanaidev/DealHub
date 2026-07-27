import { Prisma, Organization } from "@prisma/client";
import { prisma } from "../database";

// ─── Types ─────────────────────────────────────────────

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  domain?: string;
  industry?: string;
  size?: string;
  timezone?: string;
  currency?: string;
  website?: string;
  phone?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  domain?: string;
  industry?: string;
  size?: string;
  timezone?: string;
  currency?: string;
  website?: string;
  phone?: string;
  logoUrl?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  settings?: Prisma.InputJsonValue;
}

// ─── Organization Repository ───────────────────────────

export const organizationRepository = {
  async create(data: CreateOrganizationInput): Promise<Organization> {
    return prisma.organization.create({ data });
  },

  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({ where: { id } });
  },

  async findBySlug(slug: string): Promise<Organization | null> {
    return prisma.organization.findUnique({ where: { slug } });
  },

  async slugExists(slug: string): Promise<boolean> {
    const count = await prisma.organization.count({
      where: { slug, deletedAt: null },
    });
    return count > 0;
  },

  async update(id: string, data: UpdateOrganizationInput): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async softDelete(id: string): Promise<void> {
    await prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async getSettings(organizationId: string) {
    return prisma.setting.findMany({
      where: { organizationId },
    });
  },

  async getSetting(organizationId: string, key: string) {
    return prisma.setting.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });
  },

  async setSetting(organizationId: string, key: string, value: Prisma.InputJsonValue, description?: string) {
    return prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, value, description },
      update: { value, description, updatedAt: new Date() },
    });
  },

  async getStats(organizationId: string) {
    const [userCount, leadCount, customerCount, dealCount] = await Promise.all([
      prisma.user.count({ where: { organizationId, deletedAt: null } }),
      prisma.lead.count({ where: { organizationId, deletedAt: null } }),
      prisma.customer.count({ where: { organizationId, deletedAt: null } }),
      prisma.deal.count({ where: { organizationId, deletedAt: null } }),
    ]);

    return { userCount, leadCount, customerCount, dealCount };
  },
};
