import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ふたりの当番表',
  description: '夫婦で夕飯・在宅当番・夜不在を共有するカレンダー',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
        <meta name="theme-color" content="#f7f4ef" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="当番表" />
      </head>
      <body>{children}</body>
    </html>
  )
}
