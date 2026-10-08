import { ArrowUpRight, Film, Focus, MoveUpRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export function RumpelIntroduction() {
  return (
    <section className="rumpel-section rumpel-introduction" id="about">
      <div>
        <h2>{m['rumpel.seo.about_title']()}</h2>
        <p className="rumpel-intro-lead">{m['rumpel.seo.about_lead']()}</p>
      </div>
      <div className="rumpel-editorial-copy">
        <p>{m['rumpel.seo.about_a']()}</p>
        <p>{m['rumpel.seo.about_b']()}</p>
        <p>{m['rumpel.seo.about_c']()}</p>
        <Link href="/create" className="rumpel-text-link">
          {m['rumpel.seo.studio_link']()}
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </section>
  );
}

export function RumpelPromptGuide() {
  const tips = [
    {
      icon: Film,
      title: m['rumpel.seo.scene_title'](),
      text: m['rumpel.seo.scene_text'](),
    },
    {
      icon: MoveUpRight,
      title: m['rumpel.seo.action_title'](),
      text: m['rumpel.seo.action_text'](),
    },
    {
      icon: Focus,
      title: m['rumpel.seo.camera_title'](),
      text: m['rumpel.seo.camera_text'](),
    },
  ];
  return (
    <section className="rumpel-section rumpel-guide" id="prompt-guide">
      <div className="rumpel-guide-heading">
        <h2>{m['rumpel.seo.guide_title']()}</h2>
        <p>{m['rumpel.seo.guide_intro']()}</p>
      </div>
      <div className="rumpel-guide-layout">
        <div className="rumpel-guide-tips">
          {tips.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon size={23} strokeWidth={1.5} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
        <aside className="rumpel-prompt-study">
          <h3>{m['rumpel.seo.example_title']()}</h3>
          <blockquote>{m['rumpel.seo.example_prompt']()}</blockquote>
          <p>{m['rumpel.seo.example_note']()}</p>
        </aside>
      </div>
    </section>
  );
}

export function RumpelUseCases() {
  const uses = [
    [m['rumpel.seo.social_title'](), m['rumpel.seo.social_text']()],
    [m['rumpel.seo.story_title'](), m['rumpel.seo.story_text']()],
    [m['rumpel.seo.experiment_title'](), m['rumpel.seo.experiment_text']()],
  ];
  return (
    <section className="rumpel-section rumpel-usecases">
      <h2>{m['rumpel.seo.uses_title']()}</h2>
      <div className="rumpel-usecase-layout">
        <figure>
          <img
            src="/imgs/generated/rumpelstiltskin-forest.webp"
            width="900"
            height="600"
            loading="lazy"
            alt={m['rumpel.seo.uses_alt']()}
          />
          <figcaption>{m['rumpel.hero.art_caption']()}</figcaption>
        </figure>
        <div>
          {uses.map(([title, text]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
