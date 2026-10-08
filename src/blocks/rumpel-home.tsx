import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Film,
  Menu,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import {
  RumpelIntroduction,
  RumpelPromptGuide,
  RumpelUseCases,
} from '@/blocks/rumpel-editorial';
import { LocaleSelector } from '@/components/locale-selector';
import {
  ShowcasePlaybackControl,
  ShowcaseVideo,
  showcaseVideos,
} from '@/components/showcase-video';
import { SiteUserMenu } from '@/components/site-user-menu';

const heroImage = showcaseVideos.castle;
function startPreset(preset: string, prompt: string) {
  try {
    sessionStorage.setItem('rumpel-prompt', prompt);
    sessionStorage.setItem('rumpel-preset', preset);
  } catch {
    /* The studio also works without session storage. */
  }
}

export function RumpelHeader() {
  const [open, setOpen] = useState(false);
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const links = [
    { href: '/create', label: m['rumpel.nav.studio']() },
    { href: '/#inspiration', label: m['rumpel.nav.templates']() },
    { href: '/#how-it-works', label: m['rumpel.nav.how']() },
    { href: '/pricing', label: m['landing.nav.pricing']() },
  ];
  return (
    <header className="rumpel-nav">
      <div className="rumpel-nav-inner">
        <Link href="/" className="rumpel-brand">
          <img src={envConfigs.app_logo} width="32" height="32" alt="" />
          <span>{envConfigs.app_name}</span>
        </Link>
        <nav
          className="rumpel-desktop-links"
          aria-label={m['rumpel.nav.label']()}
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="rumpel-nav-actions">
          <LocaleSelector />
          {!sessionPending && !user && (
            <Link href="/sign-in" className="rumpel-login">
              {m['common.sign.sign_in_title']()}
            </Link>
          )}
        </div>
        {user && (
          <SiteUserMenu
            name={user.name || user.email}
            email={user.email}
            image={user.image}
            triggerLabel={m['rumpel.nav.signed_in']()}
          />
        )}
        <button
          className="rumpel-menu"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? m['rumpel.nav.close']() : m['rumpel.nav.open']()}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="rumpel-mobile-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          {!sessionPending && !user && (
            <Link href="/sign-in" onClick={() => setOpen(false)}>
              {m['common.sign.sign_in_title']()}
            </Link>
          )}
          <LocaleSelector />
        </nav>
      )}
    </header>
  );
}

export function RumpelHero() {
  const router = useRouter();
  const [preset, setPreset] = useState('castle');
  const [prompt, setPrompt] = useState('');
  const presets = [
    {
      id: 'castle',
      label: m['rumpel.preset.castle'](),
      prompt: m['rumpel.prompt.castle'](),
    },
    {
      id: 'forest',
      label: m['rumpel.preset.forest'](),
      prompt: m['rumpel.prompt.forest'](),
    },
    {
      id: 'ballroom',
      label: m['rumpel.preset.ballroom'](),
      prompt: m['rumpel.prompt.ballroom'](),
    },
  ];
  function create() {
    startPreset(
      preset,
      prompt.trim() || presets.find((p) => p.id === preset)!.prompt
    );
    router.push('/create');
  }
  return (
    <section className="rumpel-hero">
      <ShowcaseVideo
        className="rumpel-hero-image"
        src={heroImage}
        label={m['rumpel.hero.image_alt']()}
        controls={false}
      />
      <div className="rumpel-hero-shade" />
      <ShowcasePlaybackControl
        pauseLabel={m['rumpel.video.pause']()}
        playLabel={m['rumpel.video.play']()}
      />
      <div className="rumpel-hero-content">
        <div className="rumpel-hero-copy">
          <p className="rumpel-eyebrow">
            <Sparkles size={14} />
            {m['rumpel.hero.eyebrow']()}
          </p>
          <h1>
            <span>{m['rumpel.hero.title_a']()}</span>
          </h1>
          <p className="rumpel-hero-description">
            {m['rumpel.hero.description']()}
          </p>
          <Link href="/create" className="rumpel-button">
            {m['rumpel.hero.cta']()}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <form
          className="rumpel-prompt-box"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <div className="rumpel-prompt-tabs">
            <span>
              <WandSparkles size={16} />
              {m['rumpel.hero.prompt_label']()}
            </span>
            <span className="rumpel-prompt-kind">
              <Film size={14} />
              {m['rumpel.hero.video_type']()}
            </span>
          </div>
          <label className="sr-only" htmlFor="hero-prompt">
            {m['rumpel.hero.prompt_label']()}
          </label>
          <input
            id="hero-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={1800}
            placeholder={m['rumpel.hero.placeholder']()}
          />
          <div className="rumpel-prompt-bottom">
            <div className="rumpel-preset-chips">
              {presets.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  aria-pressed={preset === p.id}
                  className={preset === p.id ? 'active' : ''}
                  onClick={() => {
                    setPreset(p.id);
                    setPrompt(p.prompt);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="rumpel-button rumpel-prompt-submit"
            >
              {m['rumpel.hero.generate']()}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
        <p className="rumpel-art-caption">{m['rumpel.hero.art_caption']()}</p>
      </div>
    </section>
  );
}

export function RumpelInspiration() {
  const router = useRouter();
  const cards = [
    {
      id: 'castle',
      image: heroImage,
      title: m['rumpel.preset.castle'](),
      text: m['rumpel.examples.castle'](),
      prompt: m['rumpel.prompt.castle'](),
    },
    {
      id: 'forest',
      image: showcaseVideos.forest,
      title: m['rumpel.preset.forest'](),
      text: m['rumpel.examples.forest'](),
      prompt: m['rumpel.prompt.forest'](),
    },
    {
      id: 'ballroom',
      image: showcaseVideos.ballroom,
      title: m['rumpel.preset.ballroom'](),
      text: m['rumpel.examples.ballroom'](),
      prompt: m['rumpel.prompt.ballroom'](),
    },
  ];
  return (
    <section className="rumpel-section" id="inspiration">
      <div className="rumpel-section-heading">
        <h2>{m['rumpel.examples.title']()}</h2>
        <p>{m['rumpel.examples.description']()}</p>
      </div>
      <div className="rumpel-examples">
        {cards.map((c) => (
          <button
            className="rumpel-example"
            key={c.id}
            onClick={() => {
              startPreset(c.id, c.prompt);
              router.push('/create');
            }}
          >
            <div className="rumpel-example-image">
              <ShowcaseVideo src={c.image} label={c.title} controls={false} />
              <span className="rumpel-example-action">
                <ArrowUpRight size={24} />
              </span>
            </div>
            <div className="rumpel-example-caption">
              <div>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </div>
              <span>
                {m['rumpel.examples.use']()}
                <ArrowRight size={14} />
              </span>
            </div>
          </button>
        ))}
      </div>
      <p className="rumpel-concept-note">{m['rumpel.examples.note']()}</p>
    </section>
  );
}

export function RumpelFeatures() {
  const [tab, setTab] = useState(0);
  const features = [
    {
      title: m['rumpel.features.scene_title'](),
      text: m['rumpel.features.scene_text'](),
      image: heroImage,
      prompt: m['rumpel.prompt.castle'](),
    },
    {
      title: m['rumpel.features.motion_title'](),
      text: m['rumpel.features.motion_text'](),
      image: showcaseVideos.forest,
      prompt: m['rumpel.prompt.forest'](),
    },
    {
      title: m['rumpel.features.format_title'](),
      text: m['rumpel.features.format_text'](),
      image: showcaseVideos.ballroom,
      prompt: m['rumpel.prompt.ballroom'](),
    },
  ];
  return (
    <section className="rumpel-section rumpel-features" id="features">
      <div className="rumpel-feature-copy">
        <h2>{m['rumpel.features.title']()}</h2>
        <p className="rumpel-feature-intro">
          {m['rumpel.features.description']()}
        </p>
        <div
          className="rumpel-feature-tabs"
          role="tablist"
          aria-label={m['rumpel.features.title']()}
        >
          {features.map((f, i) => (
            <button
              key={f.title}
              role="tab"
              id={`feature-tab-${i}`}
              aria-controls="feature-panel"
              aria-selected={i === tab}
              onClick={() => setTab(i)}
            >
              <h3>
                {f.title}
                <ArrowUpRight size={18} />
              </h3>
              {tab === i && <p>{f.text}</p>}
            </button>
          ))}
        </div>
        <Link href="/create" className="rumpel-text-link">
          {m['rumpel.features.cta']()}
          <ArrowRight size={17} />
        </Link>
      </div>
      <div
        id="feature-panel"
        role="tabpanel"
        aria-labelledby={`feature-tab-${tab}`}
        className="rumpel-feature-media"
      >
        <ShowcaseVideo
          key={tab}
          src={features[tab].image}
          label={features[tab].title}
        />
        <div className="rumpel-feature-prompt">
          <WandSparkles size={16} />
          <p>{features[tab].prompt}</p>
        </div>
      </div>
    </section>
  );
}

export function RumpelHow() {
  const steps = [
    {
      title: m['rumpel.how.choose'](),
      text: m['rumpel.how.choose_text'](),
      icon: Film,
    },
    {
      title: m['rumpel.how.describe'](),
      text: m['rumpel.how.describe_text'](),
      icon: WandSparkles,
    },
    {
      title: m['rumpel.how.create'](),
      text: m['rumpel.how.create_text'](),
      icon: ArrowUpRight,
    },
  ];
  return (
    <section className="rumpel-section rumpel-how" id="how-it-works">
      <h2>{m['rumpel.how.title']()}</h2>
      <div className="rumpel-steps">
        {steps.map(({ title, text, icon: Icon }) => (
          <div key={title}>
            <Icon size={27} strokeWidth={1.5} />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RumpelStory() {
  return (
    <section className="rumpel-section rumpel-story">
      <div className="rumpel-story-image">
        <ShowcaseVideo src={heroImage} label={m['rumpel.story.alt']()} />
      </div>
      <div>
        <p className="rumpel-eyebrow">{m['rumpel.story.label']()}</p>
        <h2>{m['rumpel.story.title']()}</h2>
        <p>{m['rumpel.story.text']()}</p>
        <a
          className="rumpel-text-link"
          href="https://knowyourmeme.com/memes/ai-rumpelstiltskin-tip-toein-in-my-jordans"
          target="_blank"
          rel="noopener noreferrer"
        >
          {m['rumpel.story.source']()}
          <ArrowUpRight size={16} />
        </a>
      </div>
    </section>
  );
}

export function RumpelFAQ() {
  const items = [
    [m['rumpel.faq.movie_q'](), m['rumpel.faq.movie_a']()],
    [m['rumpel.faq.create_q'](), m['rumpel.faq.create_a']()],
    [m['rumpel.faq.music_q'](), m['rumpel.faq.music_a']()],
    [m['rumpel.faq.credits_q'](), m['rumpel.faq.credits_a']()],
    [m['rumpel.faq.result_q'](), m['rumpel.faq.result_a']()],
  ];
  return (
    <section className="rumpel-section rumpel-faq" id="faq">
      <h2>{m['rumpel.faq.title']()}</h2>
      <div>
        {items.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <ChevronDown size={20} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
export function RumpelCTA() {
  return (
    <section className="rumpel-section rumpel-final">
      <Sparkles size={32} strokeWidth={1.3} />
      <h2>{m['rumpel.cta.title']()}</h2>
      <p>{m['rumpel.cta.description']()}</p>
      <Link href="/create" className="rumpel-button">
        {m['rumpel.cta.button']()}
        <ArrowUpRight size={18} />
      </Link>
    </section>
  );
}
export function RumpelFooter() {
  return (
    <footer className="rumpel-footer">
      <div className="rumpel-footer-main">
        <div>
          <Link href="/" className="rumpel-brand">
            <img src={envConfigs.app_logo} width="30" height="30" alt="" />
            <span>{envConfigs.app_name}</span>
          </Link>
          <p>{m['rumpel.footer.description']()}</p>
        </div>
        <div>
          <span>{m['rumpel.footer.create']()}</span>
          <Link href="/create">{m['rumpel.nav.studio']()}</Link>
          <Link href="/#inspiration">{m['rumpel.nav.templates']()}</Link>
          <Link href="/settings/videos">{m['rumpel.nav.library']()}</Link>
        </div>
        <div>
          <span>{m['rumpel.footer.help']()}</span>
          <Link href="/#faq">{m['rumpel.faq.title']()}</Link>
          <Link href="/settings/tickets">{m['rumpel.footer.support']()}</Link>
          <a href="mailto:support@rumpelstiltskinai.org">
            {m['rumpel.footer.contact']()}
          </a>
        </div>
        <div>
          <span>{m['landing.footer.legal']()}</span>
          <Link href="/privacy-policy">{m['landing.footer.privacy']()}</Link>
          <Link href="/terms-of-service">{m['landing.footer.terms']()}</Link>
          <Link href="/acceptable-use-policy">{m['landing.footer.aup']()}</Link>
        </div>
      </div>
      <div className="rumpel-footer-bottom">
        <p>
          © {new Date().getFullYear()} {envConfigs.app_name}.{' '}
          {m['rumpel.footer.rights']()}
        </p>
      </div>
    </footer>
  );
}
export function RumpelHome() {
  return (
    <div className="rumpel-site">
      <RumpelHeader />
      <main>
        <RumpelHero />
        <RumpelIntroduction />
        <RumpelInspiration />
        <RumpelFeatures />
        <RumpelHow />
        <RumpelPromptGuide />
        <RumpelUseCases />
        <RumpelStory />
        <RumpelFAQ />
        <RumpelCTA />
      </main>
      <RumpelFooter />
    </div>
  );
}
