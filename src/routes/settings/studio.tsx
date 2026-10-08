import { createFileRoute } from '@tanstack/react-router';

import { RumpelStudio } from '@/blocks/rumpel-studio';

export const Route = createFileRoute('/settings/studio')({
  component: RumpelStudio,
});
