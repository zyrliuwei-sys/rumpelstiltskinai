import { EvoLinkProvider } from '@/core/ai/evolink';
import {
  RUMPELSTILTSKIN_MODEL,
  type RumpelstiltskinDuration,
  type RumpelstiltskinQuality,
  type RumpelstiltskinRatio,
} from '@/config/rumpelstiltskin';

/** Reference order identifies two people, NOT first and last video frames. */
export function barnPerformancePrompt(direction: string, duration: number) {
  return `Create an ORIGINAL vintage 1980s fantasy-film scene, ${duration} seconds. @image1 is the adult little-man performer; @image2 is the adult maiden. Preserve their distinct faces, hairstyles and skin tones throughout every cut. Do not swap faces, merge people or invent replacement identities. The man is a mischievous small HUMAN, NOT a goblin, elf, monster or cartoon. Give him a black velvet tailcoat, white shirt, black bow tie, knee breeches, pale stockings and black pointed flats. The maiden wears a modest ivory rustic dress. A warm dim timber barn filled with straw and stacked hay bales; cinematic amber light, subtle film grain. Only these two adults. Sequence: he crouches and approaches her on tiptoe with knees bent and heels raised; a close-up of his finger to his lips saying shhh silently; she gasps and covers her mouth; close-up of his wide mischievous toothy grin; she clutches her head in astonishment; he flings his arms wide, bounces and dances on the balls of his feet, coat tails swinging; finish on pointed shoes prancing in the straw. Clear hard cuts, legible full-body dancing and footwork. No text, subtitles, logos, watermarks, copyrighted soundtrack or copied footage. Additional creative direction (keep both uploaded identities and the barn sequence): ${direction}`;
}

export async function submitPerformance(
  provider: EvoLinkProvider,
  params: {
    photoA: string;
    photoB: string;
    prompt: string;
    duration: RumpelstiltskinDuration;
    aspectRatio: RumpelstiltskinRatio;
    quality?: RumpelstiltskinQuality;
  }
) {
  const images = await uploadPerformancePhotos(provider, params);
  return submitPreparedPerformance(provider, { ...params, images });
}

/** Uploads cannot create a paid video job; finish them before reserving credits. */
export async function uploadPerformancePhotos(
  provider: EvoLinkProvider,
  params: { photoA: string; photoB: string }
) {
  const a = await provider.uploadPhoto(params.photoA);
  const b = await provider.uploadPhoto(params.photoB);
  return [a, b] as [string, string];
}

export function submitPreparedPerformance(
  provider: EvoLinkProvider,
  params: {
    images: [string, string];
    prompt: string;
    duration: RumpelstiltskinDuration;
    aspectRatio: RumpelstiltskinRatio;
    quality?: RumpelstiltskinQuality;
  }
) {
  return provider.generateVideo({
    model: RUMPELSTILTSKIN_MODEL,
    prompt: barnPerformancePrompt(params.prompt, params.duration),
    image_urls: params.images,
    duration: params.duration,
    aspect_ratio: params.aspectRatio,
    quality: params.quality ?? '480p',
    generate_audio: false,
    content_filter: true,
  });
}
