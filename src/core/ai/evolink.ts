/** Server-only EvoLink transport. Fixed official origins prevent key exfiltration. */
export type EvoLinkTask = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  results?: string[];
};
export class EvoLinkHttpError extends Error {
  constructor(public status: number) {
    super(`EvoLink request rejected (${status})`);
  }
}
export class EvoLinkProvider {
  constructor(private key: string) {
    if (!key.trim()) throw new Error('EvoLink API key is not configured');
  }
  private async request<T>(url: string, body?: object | FormData): Promise<T> {
    const multipart = body instanceof FormData;
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${this.key}`,
        ...(!multipart ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) throw new EvoLinkHttpError(response.status);
    return response.json() as Promise<T>;
  }
  async uploadPhoto(dataUrl: string) {
    const [header, encoded] = dataUrl.split(',');
    const mime = header.slice(5, header.indexOf(';'));
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append(
      'file',
      new Blob([bytes], { type: mime }),
      mime === 'image/jpeg'
        ? 'photo.jpg'
        : mime === 'image/png'
          ? 'photo.png'
          : 'photo.webp'
    );
    const result = await this.request<{
      success: boolean;
      data?: { file_url?: string };
    }>('https://files-api.evolink.ai/api/v1/files/upload/stream', form);
    const url = result.data?.file_url;
    if (!result.success || !url || new URL(url).protocol !== 'https:')
      throw new Error('Photo upload failed');
    return url;
  }
  async generateVideo(body: object) {
    const task = await this.request<EvoLinkTask>(
      'https://api.evolink.ai/v1/videos/generations',
      body
    );
    if (!task.id) throw new Error('Provider did not return a task id');
    return task;
  }
  query(taskId: string) {
    return this.request<EvoLinkTask>(
      `https://api.evolink.ai/v1/tasks/${encodeURIComponent(taskId)}`
    );
  }
}
