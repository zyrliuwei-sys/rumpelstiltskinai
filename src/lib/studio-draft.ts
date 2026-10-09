import { z } from 'zod';

const portrait = z
  .string()
  .max(2_800_000)
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)
  .nullable();
export const studioDraftSchema = z.object({
  id: z.uuid(),
  userId: z.string().nullable(),
  photos: z.tuple([portrait, portrait]),
  prompt: z.string().min(10).max(1800),
  duration: z.union([z.literal(5), z.literal(10)]),
  quality: z.enum(['480p', '720p']),
  aspectRatio: z.enum(['9:16', '16:9']),
  consent: z.boolean(),
  resume: z.enum(['none', 'auth', 'checkout', 'generating']),
  requestId: z.uuid(),
  expectedCredits: z.number().int().positive().optional(),
  savedAt: z.number(),
});
export type StudioDraft = z.infer<typeof studioDraftSchema>;
const MAX_AGE = 24 * 60 * 60_000;

// IndexedDB holds both compressed portraits without sessionStorage's ~5 MB
// limit. Photos stay on this origin, never in URLs or auth/payment requests.
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rumpel-studio-drafts', 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore('drafts', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transact<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('drafts', mode);
    const request = action(transaction.objectStore('drafts'));
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result);
    };
    transaction.onerror = transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('Draft storage failed'));
    };
  });
}
export async function saveStudioDraft(draft: StudioDraft) {
  await transact('readwrite', (store) =>
    store.put(studioDraftSchema.parse(draft))
  );
}
export async function removeStudioDraft(id: string) {
  await transact('readwrite', (store) => store.delete(id));
}
export async function loadStudioDraft(id: string): Promise<StudioDraft | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const raw = await transact('readonly', (store) => store.get(id));
  const parsed = studioDraftSchema.safeParse(raw);
  if (!parsed.success || Date.now() - parsed.data.savedAt > MAX_AGE) {
    await removeStudioDraft(id);
    return null;
  }
  return parsed.data;
}
