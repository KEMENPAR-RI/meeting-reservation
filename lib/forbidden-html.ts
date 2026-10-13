// Self-contained 403 page served by proxy.ts; inline CSS only, no scripts.
export const FORBIDDEN_HTML: string = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>Akses Ditolak · Booking Rapat</title>
<style>
:root{--bg:#f8fafc;--card:#fff;--fg:#171717;--muted:#52525b;--primary:#132b50;--accent:#e9c06f;--border:#e4e4e7}
@media (prefers-color-scheme:dark){:root{--bg:#0b1626;--card:#132b50;--fg:#f4f4f5;--muted:#c3cad6;--primary:#e9c06f;--border:#24406b}}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.5}
main{width:100%;max-width:28rem;background:var(--card);border:1px solid var(--border);border-top:4px solid var(--accent);border-radius:16px;padding:28px 24px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.08)}
img{display:block;width:56px;height:56px;margin:0 auto 16px}
.code{margin:0;font-size:.75rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
h1{margin:4px 0 12px;font-size:1.375rem;line-height:1.3;color:var(--primary)}
p{margin:0;color:var(--muted);font-size:.9375rem}
.hint{margin-top:16px;padding:12px 14px;border-radius:10px;background:rgba(233,192,111,.18);color:var(--fg);font-size:.875rem;text-align:left}
</style>
</head>
<body>
<main>
<img src="/images/logo.webp" width="56" height="56" alt="">
<p class="code">403 · Akses ditolak</p>
<h1>Akses hanya dari jaringan kantor</h1>
<p>Halaman Booking Rapat hanya dapat dibuka dari jaringan internal kantor.</p>
<p class="hint">Sambungkan perangkat Anda ke WiFi kantor, lalu muat ulang halaman ini. Jika masih ditolak, hubungi tim APJAR.</p>
</main>
</body>
</html>`;
