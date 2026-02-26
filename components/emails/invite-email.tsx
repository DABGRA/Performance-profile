interface InviteEmailProps {
  inviteeName: string
  inviterName: string
  role: string
  loginUrl: string
}

const roleLabels: Record<string, string> = {
  teamlid: 'Teamlid',
  coach: 'Coach',
  superuser: 'Beheerder',
}

export function InviteEmail({ inviteeName, inviterName, role, loginUrl }: InviteEmailProps) {
  const roleLabel = roleLabels[role] ?? role

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0f', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#0a0a0f', padding: '40px 20px' }}>
          <tr>
            <td align="center">
              <table width="560" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#13131a', borderRadius: '12px', border: '1px solid #1f1f2e', overflow: 'hidden' }}>

                {/* Header */}
                <tr>
                  <td style={{ padding: '32px 40px 24px', borderBottom: '1px solid #1f1f2e' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6366f1' }}>
                      Performance Profile
                    </p>
                  </td>
                </tr>

                {/* Body */}
                <tr>
                  <td style={{ padding: '32px 40px' }}>
                    <h1 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 600, color: '#f4f4f5', lineHeight: 1.3 }}>
                      Welkom, {inviteeName}
                    </h1>
                    <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#a1a1aa', lineHeight: 1.6 }}>
                      <strong style={{ color: '#f4f4f5' }}>{inviterName}</strong> heeft je uitgenodigd voor het Performance Profile platform als <strong style={{ color: '#f4f4f5' }}>{roleLabel}</strong>.
                    </p>
                    <p style={{ margin: '0 0 32px', fontSize: '15px', color: '#a1a1aa', lineHeight: 1.6 }}>
                      Klik op de knop hieronder om je account te activeren en een wachtwoord in te stellen. De link in de uitnodigingsmail van Supabase is ook geldig.
                    </p>

                    {/* CTA */}
                    <table cellPadding={0} cellSpacing={0}>
                      <tr>
                        <td style={{ borderRadius: '8px', backgroundColor: '#6366f1' }}>
                          <a
                            href={loginUrl}
                            style={{ display: 'inline-block', padding: '12px 28px', fontSize: '14px', fontWeight: 600, color: '#ffffff', textDecoration: 'none', borderRadius: '8px' }}
                          >
                            Account activeren
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={{ padding: '20px 40px', borderTop: '1px solid #1f1f2e' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#52525b' }}>
                      Je ontvangt dit bericht omdat {inviterName} je heeft uitgenodigd. Als dit fout is, kun je dit bericht negeren.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}
