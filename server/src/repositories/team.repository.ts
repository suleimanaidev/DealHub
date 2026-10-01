// @ts-nocheck
import { Prisma, Team } from "@prisma/client";
import { prisma } from "../database";

export interface CreateTeamInput {
  organizationId: string;
  name: string;
  description?: string;
  managerId?: string;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  managerId?: string | null;
}

export const teamRepository = {
  async create(data: CreateTeamInput): Promise<Team> {
    return prisma.team.create({ data });
  },

  async findById(id: string) {
    return prisma.team.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        _count: { select: { members: true } },
      },
    });
  },

  async findMany(organizationId: string) {
    return prisma.team.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  async update(id: string, data: UpdateTeamInput): Promise<Team> {
    return prisma.team.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async softDelete(id: string): Promise<void> {
    // Remove all members first
    await prisma.user.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });

    await prisma.team.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async addMember(teamId: string, userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { teamId },
    });
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId, teamId },
      data: { teamId: null },
    });
  },

  async getMembers(teamId: string) {
    return prisma.user.findMany({
      where: { teamId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        jobTitle: true,
        isActive: true,
        lastLoginAt: true,
        roles: {
          include: { role: { select: { id: true, name: true } } },
        },
      },
      orderBy: { firstName: "asc" },
    });
  },
};
