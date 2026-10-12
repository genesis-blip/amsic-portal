import { AxiosError } from 'axios';
import { http } from './http';

export async function downloadFile(path: string, fileName: string, open = false) {
  const tab = open ? window.open('', '_blank') : null;
  try {
    const res = await http.get<Blob>(path, { responseType: 'blob', timeout: 60000 });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    if (tab) {
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 120000);
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (err) {
    tab?.close();
    if (err instanceof AxiosError && err.response?.data instanceof Blob) {
      const parsed: unknown = await err.response.data.text().then((t) => JSON.parse(t) as unknown).catch(() => null);
      if (parsed) err.response.data = parsed;
    }
    throw err;
  }
}
