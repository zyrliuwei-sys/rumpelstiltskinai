import { createFileRoute, Outlet } from '@tanstack/react-router';
import { MDXProvider } from '@mdx-js/react';
import { ArrowLeft } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { RumpelFooter, RumpelHeader } from '@/blocks/rumpel-home';
import { mdxComponents } from '@/components/mdx-components';

export const Route = createFileRoute('/(pages)')({
  component: PagesLayout,
});

function PagesLayout() {
  return (
    <div className="bg-background min-h-screen">
      <RumpelHeader />
      <div className="brand-document">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="size-4" />
          {m['common.pages.back_to_home']()}
        </Link>
        <div className="mt-8">
          <MDXProvider components={mdxComponents}>
            <Outlet />
          </MDXProvider>
        </div>
      </div>
      <RumpelFooter />
    </div>
  );
}
