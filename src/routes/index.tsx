import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { RumpelHome } from '@/blocks/rumpel-home';

export const Route = createFileRoute('/')({
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['common.metadata.title']({}, { locale });
    const description = m['common.metadata.description']({}, { locale });
    const urlFor = (loc: typeof locale) =>
      localizeUrl(`${envConfigs.app_url}/`, { locale: loc }).href;
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: urlFor(locale) },
        {
          property: 'og:image',
          content: `${envConfigs.app_url}/imgs/generated/rumpelstiltskin-hero.webp`,
        },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale) },
        {
          rel: 'preload',
          as: 'image',
          href: '/imgs/generated/rumpelstiltskin-hero.webp',
          fetchPriority: 'high',
        },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebSite',
                '@id': `${envConfigs.app_url}/#website`,
                name: envConfigs.app_name,
                url: `${envConfigs.app_url}/`,
                inLanguage: locale,
              },
              {
                '@type': 'WebApplication',
                '@id': `${envConfigs.app_url}/#studio`,
                name: envConfigs.app_name,
                description,
                url: urlFor(locale),
                applicationCategory: 'MultimediaApplication',
                operatingSystem: 'Web',
                isPartOf: { '@id': `${envConfigs.app_url}/#website` },
              },
            ],
          }),
        },
      ],
    };
  },
  component: RumpelHome,
});
