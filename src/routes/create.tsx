import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { RumpelStudio } from '@/blocks/rumpel-studio';

export const Route = createFileRoute('/create')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['rumpel.studio.titleMeta']({}, { locale }),
      description: m['rumpel.studio.descriptionMeta']({}, { locale }),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const urlFor = (locale: typeof loaderData.locale) =>
      localizeUrl(`${envConfigs.app_url}/create`, { locale }).href;
    return {
      meta: [
        { title: loaderData.title },
        { name: 'description', content: loaderData.description },
        { property: 'og:title', content: loaderData.title },
        { property: 'og:description', content: loaderData.description },
        { property: 'og:url', content: urlFor(loaderData.locale) },
        {
          property: 'og:image',
          content: `${envConfigs.app_url}/imgs/generated/rumpelstiltskin-hero.webp`,
        },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [
        { rel: 'canonical', href: urlFor(loaderData.locale) },
        ...locales.map((locale) => ({
          rel: 'alternate',
          hrefLang: locale,
          href: urlFor(locale),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
    };
  },
  component: () => <RumpelStudio publicPage />,
});
