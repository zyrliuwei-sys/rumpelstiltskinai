import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/ai-livestream')({
  beforeLoad: () => {
    throw redirect({ to: '/create', statusCode: 301 });
  },
});
