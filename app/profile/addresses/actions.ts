'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  createAddressForUser,
  deleteAddressForUser,
  setDefaultAddressForUser,
  updateAddressForUser,
} from '@/lib/supabase/orders.server';

const addressSchema = z.object({
  label: z.string().trim().min(2, 'Address label is required').max(60, 'Address label is too long'),
  fullName: z.string().trim().min(2, 'Full name is required').max(120, 'Full name is too long'),
  phoneNumber: z.string().trim().min(7, 'Phone number is required').max(30, 'Phone number is too long'),
  line1: z.string().trim().min(3, 'Address line is required').max(180, 'Address line is too long'),
  line2: z.string().trim().max(180, 'Address line 2 is too long').optional(),
  city: z.string().trim().min(2, 'City is required').max(80, 'City is too long'),
  state: z.string().trim().min(2, 'State is required').max(80, 'State is too long'),
  postalCode: z.string().trim().max(20, 'Postal code is too long').optional(),
  country: z.string().trim().min(2, 'Country is required').max(80, 'Country is too long'),
  isDefault: z.boolean().optional(),
});

const addressIdSchema = z.union([z.number().int().positive(), z.string().trim().min(1, 'Address id is invalid')]);

const addressUpdateSchema = addressSchema.extend({
  id: addressIdSchema,
});

export type AddressActionResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function getAuthUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function createAddressAction(payload: z.infer<typeof addressSchema>): Promise<AddressActionResult> {
  const parsed = addressSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please correct the address fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: 'Please sign in to manage addresses.' };

  try {
    await createAddressForUser(userId, {
      label: parsed.data.label,
      full_name: parsed.data.fullName,
      phone_number: parsed.data.phoneNumber,
      line1: parsed.data.line1,
      line2: parsed.data.line2 ?? null,
      city: parsed.data.city,
      state: parsed.data.state,
      postal_code: parsed.data.postalCode ?? null,
      country: parsed.data.country,
      is_default: Boolean(parsed.data.isDefault),
    });
    revalidatePath('/profile/addresses');
    revalidatePath('/checkout');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to create address.' };
  }
}

export async function updateAddressAction(payload: z.infer<typeof addressUpdateSchema>): Promise<AddressActionResult> {
  const parsed = addressUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please correct the address fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: 'Please sign in to manage addresses.' };

  try {
    await updateAddressForUser(userId, parsed.data.id, {
      label: parsed.data.label,
      full_name: parsed.data.fullName,
      phone_number: parsed.data.phoneNumber,
      line1: parsed.data.line1,
      line2: parsed.data.line2 ?? null,
      city: parsed.data.city,
      state: parsed.data.state,
      postal_code: parsed.data.postalCode ?? null,
      country: parsed.data.country,
      is_default: Boolean(parsed.data.isDefault),
    });
    revalidatePath('/profile/addresses');
    revalidatePath('/checkout');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to update address.' };
  }
}

export async function deleteAddressAction(addressId: string | number): Promise<AddressActionResult> {
  const parsedId = addressIdSchema.safeParse(addressId);
  if (!parsedId.success) {
    return { ok: false, error: 'Address id is invalid.' };
  }

  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: 'Please sign in to manage addresses.' };

  try {
    await deleteAddressForUser(userId, parsedId.data);
    revalidatePath('/profile/addresses');
    revalidatePath('/checkout');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to delete address.' };
  }
}

export async function setDefaultAddressAction(addressId: string | number): Promise<AddressActionResult> {
  const parsedId = addressIdSchema.safeParse(addressId);
  if (!parsedId.success) {
    return { ok: false, error: 'Address id is invalid.' };
  }

  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: 'Please sign in to manage addresses.' };

  try {
    await setDefaultAddressForUser(userId, parsedId.data);
    revalidatePath('/profile/addresses');
    revalidatePath('/checkout');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to set default address.' };
  }
}
