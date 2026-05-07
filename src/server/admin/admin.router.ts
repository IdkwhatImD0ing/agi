import { TRPCError } from '@trpc/server';
import * as z from 'zod/v4';
import { FieldValue, Timestamp, type CollectionReference, type DocumentSnapshot } from 'firebase-admin/firestore';

import { createTRPCRouter, publicProcedure } from '~/server/trpc/trpc.server';
import { getFirebaseAdminFirestore } from '~/server/firebase/firebaseAdmin';
import { MASTER_ADMIN_EMAIL, normalizeAdminEmail } from '~/common/admin/admin.config';

import { requireMasterAdmin } from './admin.access';


const userEmailSchema = z.string()
  .trim()
  .min(3)
  .max(254)
  .refine(email => email.includes('@'), 'Invalid email address.')
  .transform(normalizeAdminEmail);

const adminUserAccessSchema = z.object({
  email: z.string(),
  authorized: z.boolean(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export type AdminUserAccess = z.infer<typeof adminUserAccessSchema>;


function getUsersCollection(): CollectionReference {
  try {
    return getFirebaseAdminFirestore().collection('users');
  } catch (error) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: error instanceof Error ? error.message : 'Firebase Admin is not configured.',
      cause: error,
    });
  }
}

function timestampToIso(value: unknown): string | null {
  if (value instanceof Timestamp)
    return value.toDate().toISOString();
  if (value instanceof Date)
    return value.toISOString();
  return typeof value === 'string' ? value : null;
}

function userAccessFromDoc(docSnap: DocumentSnapshot): AdminUserAccess {
  const data = docSnap.data() ?? {};
  const email = normalizeAdminEmail(typeof data.email === 'string' ? data.email : docSnap.id);

  return {
    email,
    authorized: data.authorized === true,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export const adminRouter = createTRPCRouter({

  listUsers: publicProcedure
    .output(z.object({
      masterAdminEmail: z.literal(MASTER_ADMIN_EMAIL),
      users: z.array(adminUserAccessSchema),
    }))
    .query(async ({ ctx }) => {
      await requireMasterAdmin(ctx);

      const snapshot = await getUsersCollection().get();
      const users = snapshot.docs
        .map(userAccessFromDoc)
        .toSorted((a, b) => a.email.localeCompare(b.email));

      return {
        masterAdminEmail: MASTER_ADMIN_EMAIL,
        users,
      };
    }),

  setUserAuthorized: publicProcedure
    .input(z.object({
      email: userEmailSchema,
      authorized: z.boolean(),
    }))
    .output(adminUserAccessSchema)
    .mutation(async ({ ctx, input }) => {
      await requireMasterAdmin(ctx);

      if (input.email === MASTER_ADMIN_EMAIL && !input.authorized)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'The master admin account cannot be disabled.' });

      const userRef = getUsersCollection().doc(input.email);
      const existingDoc = await userRef.get();
      const now = FieldValue.serverTimestamp();

      await userRef.set({
        email: input.email,
        authorized: input.authorized,
        updatedAt: now,
        ...(!existingDoc.exists ? { createdAt: now } : {}),
      }, { merge: true });

      const updatedDoc = await userRef.get();
      return userAccessFromDoc(updatedDoc);
    }),

});
