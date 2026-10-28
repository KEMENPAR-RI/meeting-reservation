import localFont from 'next/font/local';

// Script font for rendered signatures; import only where a signature is shown.
export const signatureFont = localFont({
  src: './signature.otf',
  display: 'swap',
});
