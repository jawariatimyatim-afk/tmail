import './globals.css'

export const metadata = {
  title: 'TempMail Service',
  description: 'Disposable email service for testing',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}