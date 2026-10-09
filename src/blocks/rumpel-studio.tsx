import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clapperboard,
  Loader2,
  WandSparkles,
} from 'lucide-react';
import { z } from 'zod';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { type RumpelstiltskinQuality } from '@/config/rumpelstiltskin';
import { apiGet, apiPost } from '@/lib/api-client';
import { preparePortrait } from '@/lib/portrait-input';
import { m } from '@/paraglide/messages.js';
import { RumpelFooter, RumpelHeader } from '@/blocks/rumpel-home';
import { PortraitSlot } from '@/components/portrait-slot';
import { ShowcaseVideo, showcaseVideos } from '@/components/showcase-video';

type Task = {
  id: string;
  status: string;
  videoUrl?: string | null;
  error?: string | null;
  prompt?: string;
  createdAt?: string;
};
type StudioStatus = {
  configured: boolean;
  costCredits: number;
  costs?: { 5: number; 10: number };
  qualityCosts?: Record<RumpelstiltskinQuality, { 5: number; 10: number }>;
  model: string;
};
const pendingStatuses = ['pending', 'processing', 'queued'];

function safeVideoUrl(value?: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function RumpelStudio({ publicPage = false }: { publicPage?: boolean }) {
  const { data: session, isPending: sessionPending } = useSession();
  const queryClient = useQueryClient();
  const [quality, setQuality] = useState<RumpelstiltskinQuality>('480p');
  const [duration, setDuration] = useState<5 | 10>(10);
  const [photos, setPhotos] = useState<[string | null, string | null]>([
    null,
    null,
  ]);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [submittedTask, setSubmittedTask] = useState<Task | null>(null);
  const statusQuery = useQuery({
    queryKey: ['rumpel-studio-status'],
    queryFn: () => apiGet<StudioStatus>('/api/rumpelstiltskin/status'),
    staleTime: 60_000,
  });
  const generateMutation = useMutation({
    mutationFn: (prompt: string) =>
      apiPost<Task>('/api/rumpelstiltskin/generate', {
        prompt,
        preset: 'custom',
        duration,
        aspectRatio,
        quality,
        expectedCredits:
          statusQuery.data?.qualityCosts?.[quality]?.[duration] ??
          statusQuery.data?.costs?.[duration],
        photoA: photos[0],
        photoB: photos[1],
        consent,
      }),
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: ['rumpel-studio-status'],
      });
    },
    onSuccess: (task) => {
      setSubmittedTask(task);
      try {
        window.sessionStorage.setItem(
          `rumpel-task-${session?.user.id}`,
          task.id
        );
      } catch {
        /* Storage is optional. */
      }
      void queryClient.invalidateQueries({ queryKey: ['user-credits'] });
      void queryClient.invalidateQueries({
        queryKey: ['rumpelstiltskin-videos'],
      });
    },
  });
  const taskQuery = useQuery({
    queryKey: ['rumpel-task', session?.user.id, submittedTask?.id],
    queryFn: () =>
      apiGet<Task>(
        `/api/rumpelstiltskin/task?id=${encodeURIComponent(submittedTask!.id)}`
      ),
    enabled: Boolean(submittedTask?.id && session?.user),
    refetchInterval: (query) =>
      pendingStatuses.includes(
        query.state.data?.status ?? submittedTask?.status ?? ''
      )
        ? 5000
        : false,
    refetchIntervalInBackground: false,
  });
  const task = taskQuery.data ?? submittedTask;
  const active =
    generateMutation.isPending ||
    Boolean(task && pendingStatuses.includes(task.status));
  const videoUrl = safeVideoUrl(task?.videoUrl);
  const failed = task?.status === 'failed' || task?.status === 'canceled';
  const ready = Boolean(photos[0] && photos[1] && consent);
  const form = useForm({
    defaultValues: { prompt: String(m['rumpel.studio.defaultPrompt']()) },
    validators: {
      onSubmit: z.object({
        prompt: z
          .string()
          .trim()
          .min(10, m['rumpel.studio.promptError']())
          .max(1800, m['rumpel.studio.promptError']()),
      }),
    },
    onSubmit: async ({ value }) => {
      if (
        !session?.user ||
        !statusQuery.data?.configured ||
        active ||
        preparing ||
        !ready
      )
        return;
      generateMutation.reset();
      try {
        await generateMutation.mutateAsync(value.prompt.trim());
      } catch {
        /* Mutation error is rendered below. */
      }
    },
  });

  useEffect(() => {
    try {
      const prompt = window.sessionStorage.getItem('rumpel-prompt');
      if (prompt) form.setFieldValue('prompt', prompt.slice(0, 1800));
      window.sessionStorage.removeItem('rumpel-prompt');
    } catch {
      /* Storage can be disabled; defaults remain usable. */
    }
  }, []);

  useEffect(() => {
    setSubmittedTask(null);
    if (!session?.user.id) return;
    try {
      const id = window.sessionStorage.getItem(
        `rumpel-task-${session.user.id}`
      );
      if (id) setSubmittedTask({ id, status: 'pending' });
    } catch {
      /* Storage is optional. */
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (task && !pendingStatuses.includes(task.status)) {
      try {
        window.sessionStorage.removeItem(`rumpel-task-${session?.user.id}`);
      } catch {
        /* Storage is optional. */
      }
      void queryClient.invalidateQueries({
        queryKey: ['rumpelstiltskin-videos'],
      });
      void queryClient.invalidateQueries({ queryKey: ['user-credits'] });
    }
  }, [task?.status, queryClient]);

  function saveDraft() {
    try {
      window.sessionStorage.setItem(
        'rumpel-prompt',
        form.getFieldValue('prompt')
      );
    } catch {
      /* Sign-in works even if session storage is unavailable. */
    }
  }

  async function selectPhoto(index: 0 | 1, file: File) {
    setPreparing(true);
    setPhotoError(null);
    try {
      const value = await preparePortrait(file);
      setPhotos((current) =>
        index === 0 ? [value, current[1]] : [current[0], value]
      );
    } catch {
      setPhotoError(m['rumpel.studio.photoError']());
    } finally {
      setPreparing(false);
    }
  }

  const slots = [
    {
      label: m['rumpel.studio.photoA'](),
      hint: m['rumpel.studio.photoAHint'](),
    },
    {
      label: m['rumpel.studio.photoB'](),
      hint: m['rumpel.studio.photoBHint'](),
    },
  ];
  const controlClass =
    'w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50';
  const cost =
    statusQuery.data?.qualityCosts?.[quality]?.[duration] ??
    statusQuery.data?.costs?.[duration] ??
    statusQuery.data?.costCredits;

  return (
    <div
      className={
        publicPage
          ? 'brand-studio bg-background text-foreground min-h-svh'
          : 'brand-studio text-foreground'
      }
    >
      {publicPage && <RumpelHeader />}
      <main className="brand-studio-main">
        {publicPage && (
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground mb-7 inline-flex items-center gap-2 text-xs"
          >
            <ArrowLeft className="size-3.5" />
            {m['rumpel.studio.home']()}
          </Link>
        )}
        <header className="brand-page-heading flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {m['rumpel.studio.title']()}
            </h1>
            <p className="text-muted-foreground mt-3 text-sm md:text-base">
              {m['rumpel.studio.subtitle']()}
            </p>
          </div>
          {!publicPage && (
            <Link
              href="/settings/videos"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
            >
              {m['rumpel.studio.history']()}
              <ArrowUpRight className="size-4" />
            </Link>
          )}
        </header>
        <div className="brand-studio-grid">
          <section
            className="brand-studio-controls border-border border"
            aria-label={m['rumpel.studio.promptLabel']()}
          >
            <form
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
              }}
            >
              <fieldset disabled={active || preparing} className="space-y-3">
                <legend className="mb-1 flex w-full items-center justify-between text-sm font-medium">
                  <span>{m['rumpel.studio.casting']()}</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    {photos.filter(Boolean).length}/2
                  </span>
                </legend>
                <p className="text-muted-foreground mb-3 text-xs leading-5">
                  {m['rumpel.studio.castingHint']()}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {slots.map((slot, index) => (
                    <PortraitSlot
                      key={index}
                      index={index + 1}
                      label={slot.label}
                      hint={slot.hint}
                      value={photos[index]}
                      disabled={active || preparing}
                      removeLabel={m['rumpel.studio.photoRemove']()}
                      onSelect={(file) =>
                        void selectPhoto(index as 0 | 1, file)
                      }
                      onRemove={() =>
                        setPhotos((current) =>
                          index === 0 ? [null, current[1]] : [current[0], null]
                        )
                      }
                    />
                  ))}
                </div>
                {preparing && (
                  <p
                    role="status"
                    className="text-muted-foreground flex items-center gap-2 text-xs"
                  >
                    <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                    {m['rumpel.studio.preparing']()}
                  </p>
                )}
                {photoError && (
                  <p role="alert" className="text-destructive text-xs">
                    {photoError}
                  </p>
                )}
              </fieldset>
              <form.Field name="prompt">
                {(field) => (
                  <div className="space-y-2.5">
                    <label
                      htmlFor="rumpel-prompt"
                      className="text-sm font-medium"
                    >
                      {m['rumpel.studio.promptLabel']()}
                    </label>
                    <textarea
                      id="rumpel-prompt"
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      maxLength={1800}
                      rows={4}
                      disabled={active}
                      placeholder={m['rumpel.studio.promptPlaceholder']()}
                      aria-invalid={field.state.meta.errors.length > 0}
                      aria-describedby="rumpel-prompt-meta"
                      className={`${controlClass} resize-y leading-6`}
                    />
                    <div
                      id="rumpel-prompt-meta"
                      className="text-muted-foreground flex justify-between gap-3 text-xs"
                    >
                      <span>
                        {field.state.meta.errors.length > 0
                          ? m['rumpel.studio.promptError']()
                          : m['rumpel.studio.promptHint']()}
                      </span>
                      <span>{field.state.value.length}/1800</span>
                    </div>
                  </div>
                )}
              </form.Field>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label
                    htmlFor="rumpel-duration"
                    className="text-sm font-medium"
                  >
                    {m['rumpel.studio.duration']()}
                  </label>
                  <select
                    id="rumpel-duration"
                    value={duration}
                    disabled={active}
                    onChange={(event) =>
                      setDuration(Number(event.target.value) as 5 | 10)
                    }
                    className={controlClass}
                  >
                    <option value={5}>{m['rumpel.studio.seconds5']()}</option>
                    <option value={10}>{m['rumpel.studio.seconds10']()}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="rumpel-ratio" className="text-sm font-medium">
                    {m['rumpel.studio.ratio']()}
                  </label>
                  <select
                    id="rumpel-ratio"
                    value={aspectRatio}
                    disabled={active}
                    onChange={(event) =>
                      setAspectRatio(event.target.value as '9:16' | '16:9')
                    }
                    className={controlClass}
                  >
                    <option value="9:16">
                      {m['rumpel.studio.portrait']()}
                    </option>
                    <option value="16:9">
                      {m['rumpel.studio.landscape']()}
                    </option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="rumpel-quality" className="text-sm font-medium">
                  {m['rumpel.studio.quality']()}
                </label>
                <select
                  id="rumpel-quality"
                  value={quality}
                  disabled={active}
                  onChange={(event) =>
                    setQuality(event.target.value as RumpelstiltskinQuality)
                  }
                  className={controlClass}
                >
                  <option value="480p">
                    {m['rumpel.studio.quality480']()}
                  </option>
                  <option value="720p">
                    {m['rumpel.studio.quality720']()}
                  </option>
                </select>
              </div>
              {statusQuery.isPending && (
                <p
                  className="text-muted-foreground flex items-center gap-2 text-xs"
                  role="status"
                >
                  <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
                  {m['rumpel.studio.loading']()}
                </p>
              )}
              {statusQuery.isError && (
                <div
                  role="alert"
                  className="border-destructive/30 bg-destructive/10 rounded-xl border p-3 text-sm"
                >
                  <p>{m['rumpel.studio.statusError']()}</p>
                  <button
                    type="button"
                    onClick={() => void statusQuery.refetch()}
                    className="mt-2 underline underline-offset-4"
                  >
                    {m['rumpel.studio.retry']()}
                  </button>
                </div>
              )}
              {statusQuery.data && !statusQuery.data.configured && (
                <div className="border-border bg-background rounded-xl border p-4">
                  <p className="text-sm font-medium">
                    {m['rumpel.studio.setupTitle']()}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs leading-5">
                    {m['rumpel.studio.setupDescription']()}
                  </p>
                </div>
              )}
              {generateMutation.isError && (
                <p role="alert" className="text-destructive text-sm">
                  {generateMutation.error instanceof Error
                    ? generateMutation.error.message
                    : m['rumpel.studio.generationError']()}
                </p>
              )}
              <label className="text-muted-foreground flex items-start gap-2.5 text-xs leading-5">
                <input
                  type="checkbox"
                  checked={consent}
                  disabled={active}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="accent-primary mt-0.5 size-4 shrink-0"
                />
                <span>{m['rumpel.studio.consent']()}</span>
              </label>
              <div className="border-border space-y-3 border-t pt-5">
                {cost != null && (
                  <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
                    <span>{m['rumpel.studio.cost']({ count: cost })}</span>
                    <Clapperboard className="size-4" />
                  </div>
                )}
                {!sessionPending && !session?.user ? (
                  <Link
                    href="/sign-in?callbackUrl=/create"
                    onClick={saveDraft}
                    className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold"
                  >
                    {m['rumpel.studio.signin']()}
                    <ArrowUpRight className="size-4" />
                  </Link>
                ) : (
                  <button
                    type="submit"
                    disabled={
                      sessionPending ||
                      active ||
                      preparing ||
                      !ready ||
                      !statusQuery.data?.configured
                    }
                    className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {active ? (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <WandSparkles className="size-4" />
                    )}
                    {active
                      ? m['rumpel.studio.generating']()
                      : ready
                        ? m['rumpel.studio.generate']()
                        : m['rumpel.studio.needPhotos']()}
                  </button>
                )}
                <p className="text-muted-foreground text-center text-[11px] leading-5">
                  {m['rumpel.studio.creditNotice']()}
                </p>
              </div>
            </form>
          </section>
          <section
            className="brand-studio-preview border-border overflow-hidden border"
            aria-label={m['rumpel.studio.previewLabel']()}
          >
            <div className="border-border flex items-center justify-between border-b px-5 py-4">
              <span className="text-sm font-medium">
                {m['rumpel.studio.previewLabel']()}
              </span>
              <span className="text-muted-foreground text-xs">
                {aspectRatio}
              </span>
            </div>
            <div className="brand-preview-stage bg-background relative flex items-center justify-center overflow-hidden">
              {videoUrl ? (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-[580px] w-full"
                  aria-label={m['rumpel.studio.previewLabel']()}
                />
              ) : (
                <>
                  <ShowcaseVideo
                    src={showcaseVideos.castle}
                    label={m['rumpel.studio.concept']()}
                    className="brand-preview-image absolute inset-0 h-full w-full object-cover"
                  />
                  {active && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                      <Loader2 className="text-primary size-9 animate-spin motion-reduce:animate-none" />
                    </div>
                  )}
                </>
              )}
            </div>
            {!videoUrl && (
              <div className="brand-preview-copy">
                <h2 className="text-2xl font-medium tracking-tight text-white">
                  {active
                    ? task?.status === 'processing'
                      ? m['rumpel.studio.processing']()
                      : m['rumpel.studio.queued']()
                    : failed
                      ? m['rumpel.studio.failed']()
                      : m['rumpel.studio.emptyTitle']()}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">
                  {active
                    ? m['rumpel.studio.workingDescription']()
                    : failed
                      ? m['rumpel.studio.failedDescription']()
                      : m['rumpel.studio.emptyDescription']()}
                </p>
              </div>
            )}
            <div className="space-y-3 px-5 py-4" aria-live="polite">
              {videoUrl ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm">
                    <Check className="text-primary size-4" />
                    {m['rumpel.studio.completed']()}
                  </p>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-2 text-xs"
                  >
                    {m['rumpel.studio.openVideo']()}
                    <ArrowUpRight className="size-3.5" />
                  </a>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {active
                    ? task?.status === 'processing'
                      ? m['rumpel.studio.processing']()
                      : m['rumpel.studio.queued']()
                    : m['rumpel.studio.concept']()}
                </p>
              )}
              {failed && (
                <p role="alert" className="text-destructive text-sm">
                  {task?.error || m['rumpel.studio.failedDescription']()}
                </p>
              )}
              {taskQuery.isError && (
                <div
                  role="alert"
                  className="text-destructive flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <span>{m['rumpel.studio.refreshError']()}</span>
                  <button
                    type="button"
                    onClick={() => void taskQuery.refetch()}
                    className="underline underline-offset-4"
                  >
                    {m['rumpel.studio.retry']()}
                  </button>
                </div>
              )}
              {statusQuery.data?.model && (
                <p className="text-muted-foreground text-[10px]">
                  {m['rumpel.studio.model']({ name: statusQuery.data.model })}
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
      {publicPage && <RumpelFooter />}
    </div>
  );
}
