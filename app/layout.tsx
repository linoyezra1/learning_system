import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'מערכת לימוד מתוקשבת - עזרה ראשונה חוברת 44',
  description: 'מערכת לימוד מתוקשבת לקורס עזרה ראשונה',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}



