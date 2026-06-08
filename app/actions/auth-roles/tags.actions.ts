"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/app/lib/auth";
import { ROUTES } from "@/app/lib/constants";
import { getOrganizationById } from "@/app/actions/tables/organizations.table.actions";
import {
  createTagRecord,
  deleteTagRecord,
  getTagById,
  getTagsByOrg,
  updateTagRecord,
} from "@/app/actions/tables/tags.table.actions";
import type { FinanceActionState } from "@/app/actions/auth-roles/finance.types";
import type { TagRecordDto } from "@/app/lib/finance.types";

const tagSchema = z.object({
  name: z.string().trim().min(2, "Tag name is required").max(100),
});

const tagIdSchema = z.object({
  tagId: z.coerce.number().int().positive(),
});

function normalizeTagName(value: string) {
  return value.trim().toLowerCase();
}

function findDuplicateTag(existingTags: TagRecordDto[], name: string, excludeTagId?: number) {
  const normalizedName = normalizeTagName(name);
  return existingTags.find(
    (tag) => tag.id !== excludeTagId && normalizeTagName(tag.name) === normalizedName
  );
}

function assertOrgId(currentUser: Awaited<ReturnType<typeof requireUser>>) {
  if (!currentUser.orgId) {
    throw new Error("Create or join an organization first");
  }

  return currentUser.orgId;
}

function toOrganizationDto(organization: Awaited<ReturnType<typeof getOrganizationById>>) {
  if (!organization) return null;

  return {
    id: organization.id,
    name: organization.name,
    createdBy: organization.createdBy,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

export async function getOrganizationTagsData() {
  const currentUser = await requireUser();

  if (!currentUser.orgId) {
    return {
      organization: null,
      tags: [],
      currentUser: {
        id: currentUser.id,
        role: currentUser.role,
        orgId: null,
      },
    };
  }

  const [organization, tags] = await Promise.all([
    getOrganizationById(currentUser.orgId),
    getTagsByOrg(currentUser.orgId),
  ]);

  return {
    organization: toOrganizationDto(organization),
    tags,
    currentUser: {
      id: currentUser.id,
      role: currentUser.role,
      orgId: currentUser.orgId,
    },
  };
}

export async function createTagAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create tag" };
  }

  const orgId = assertOrgId(currentUser);
  const existingTags = await getTagsByOrg(orgId);

  if (findDuplicateTag(existingTags, parsed.data.name)) {
    return { error: "Tag already exists" };
  }

  await createTagRecord({
    orgId,
    name: parsed.data.name,
    createdBy: currentUser.id,
  });

  redirect(ROUTES.TAGS);
}

export async function createTagInline(
  name: string
): Promise<{ tag: TagRecordDto } | { error: string }> {
  const currentUser = await requireUser();
  const parsed = tagSchema.safeParse({ name });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to create tag" };
  }

  const orgId = assertOrgId(currentUser);
  const existingTags = await getTagsByOrg(orgId);
  const existingTag = findDuplicateTag(existingTags, parsed.data.name);

  if (existingTag) {
    return { tag: existingTag };
  }

  const record = await createTagRecord({
    orgId,
    name: parsed.data.name,
    createdBy: currentUser.id,
  });

  if (!record) {
    return { error: "Unable to create tag" };
  }

  return {
    tag: {
      id: record.id,
      orgId: record.orgId,
      name: record.name,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    },
  };
}

export async function updateTagAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
  });
  const tagIdResult = tagIdSchema.safeParse({
    tagId: formData.get("tagId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Unable to update tag" };
  }

  if (!tagIdResult.success) {
    return { error: "Tag is required" };
  }

  const orgId = assertOrgId(currentUser);
  const tag = await getTagById(tagIdResult.data.tagId);

  if (!tag || tag.orgId !== orgId) {
    return { error: "Tag does not belong to your organization" };
  }

  const existingTags = await getTagsByOrg(orgId);
  if (findDuplicateTag(existingTags, parsed.data.name, tag.id)) {
    return { error: "Tag already exists" };
  }

  await updateTagRecord(tag.id, {
    name: parsed.data.name,
    updatedAt: new Date(),
  });

  redirect(ROUTES.TAGS);
}

export async function deleteTagAction(
  _previousState: FinanceActionState,
  formData: FormData
): Promise<FinanceActionState> {
  const currentUser = await requireUser();
  const tagIdResult = tagIdSchema.safeParse({
    tagId: formData.get("tagId"),
  });

  if (!tagIdResult.success) {
    return { error: "Tag is required" };
  }

  const orgId = assertOrgId(currentUser);
  const tag = await getTagById(tagIdResult.data.tagId);

  if (!tag || tag.orgId !== orgId) {
    return { error: "Tag does not belong to your organization" };
  }

  await deleteTagRecord(tag.id);

  redirect(ROUTES.TAGS);
}
