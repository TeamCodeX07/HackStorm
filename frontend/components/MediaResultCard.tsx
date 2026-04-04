'use client';

interface BreakdownItem {
  aspect: string;
  severity: 'normal' | 'warning' | 'critical';
  score: number;
  description: string;
}

interface Props {
  verdict: string;
  confidence: number;
  overallForgeryScore: number;
  imageType: string;
  reasoning: string;
  breakdown: BreakdownItem[];
  fileUrl: string;
  timestamp: string;
  latencyMs: number;
}

interface LegacyProps {
  result: Partial<Props>;
}

export default function MediaResultCard(props: Props | LegacyProps) {
  const data = ('result' in props ? props.result : props) as Partial<Props>;

  const verdict = data.verdict || 'uncertain';
  const confidence = typeof data.confidence === 'number' ? data.confidence : 50;
  const overallForgeryScore =
    typeof data.overallForgeryScore === 'number' ? data.overallForgeryScore : confidence;
  const imageType = data.imageType || 'Media File';
  const reasoning = data.reasoning || 'Analysis summary is not available.';
  const breakdown = Array.isArray(data.breakdown) ? data.breakdown : [];
  const fileUrl = data.fileUrl || '';
  const timestamp = data.timestamp || '';
  const latencyMs = typeof data.latencyMs === 'number' ? data.latencyMs : 0;

  const scoreColor = (s: number) =>
    s > 70 ? '#f87171' : s > 40 ? '#fb923c' : '#4ade80';

  const verdictMap: Record<string, any> = {
    manipulated: {
      label: 'MANIPULATED',
      color: '#f87171',
      bg: 'rgba(248,113,113,0.12)',
      border: 'rgba(248,113,113,0.35)'
    },
    authentic: {
      label: 'AUTHENTIC',
      color: '#4ade80',
      bg: 'rgba(74,222,128,0.12)',
      border: 'rgba(74,222,128,0.35)'
    },
    uncertain: {
      label: 'UNCERTAIN',
      color: '#fb923c',
      bg: 'rgba(251,146,60,0.12)',
      border: 'rgba(251,146,60,0.35)'
    }
  };

  const severityMap: Record<string, any> = {
    critical: {
      bg:        'rgba(248,113,113,0.08)',
      border:    'rgba(248,113,113,0.30)',
      badgeBg:   '#ef4444',
      badgeText: '#fff',
      label:     'CRITICAL'
    },
    warning: {
      bg:        'rgba(251,146,60,0.08)',
      border:    'rgba(251,146,60,0.30)',
      badgeBg:   '#f97316',
      badgeText: '#fff',
      label:     'WARNING'
    },
    normal: {
      bg:        'rgba(255,255,255,0.03)',
      border:    'rgba(255,255,255,0.09)',
      badgeBg:   null,
      badgeText: null,
      label:     null
    }
  };

  const vc = verdictMap[verdict] || verdictMap.uncertain;

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '780px',
      margin: '0 auto',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '18px',
      overflow: 'hidden',
      color: '#fff',
      fontFamily: 'inherit'
    }}>

      {/* ── HEADER ─────────────────────────────── */}
      <div style={{
        textAlign: 'center',
        padding: '22px 28px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <h2 style={{
          margin: '0 0 5px',
          fontSize: '21px',
          fontWeight: 700,
          color: '#fff'
        }}>
          Detection Report
        </h2>
        <p style={{
          margin: 0,
          fontSize: '13px',
          color: 'rgba(255,255,255,0.45)'
        }}>
          Image Type:{' '}
          <strong style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
            {imageType}
          </strong>
        </p>
      </div>

      {/* ── SCORE ROW ──────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '22px',
        padding: '22px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        alignItems: 'flex-start'
      }}>
        {/* Thumbnail */}
        <div style={{
          flexShrink: 0,
          width: '145px',
          height: '135px',
          borderRadius: '10px',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.10)'
        }}>
          <img
            src={fileUrl}
            alt="Analyzed"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Score + verdict + summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: '0 0 3px',
            fontSize: '11px',
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.40)'
          }}>
            Overall Forgery Score
          </p>

          {/* Big score */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '1px',
            marginBottom: '13px'
          }}>
            <span style={{
              fontSize: '62px',
              fontWeight: 800,
              lineHeight: 1,
              color: scoreColor(overallForgeryScore)
            }}>
              {overallForgeryScore}
            </span>
            <span style={{
              fontSize: '26px',
              fontWeight: 700,
              color: scoreColor(overallForgeryScore)
            }}>%</span>
          </div>

          {/* Verdict badge */}
          <div style={{
            display: 'inline-block',
            padding: '5px 15px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.07em',
            color: vc.color,
            background: vc.bg,
            border: `1px solid ${vc.border}`,
            marginBottom: '16px'
          }}>
            {vc.label}
          </div>

          {/* Summary */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '13px'
          }}>
            <p style={{
              margin: '0 0 5px',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)'
            }}>
              Analysis Summary
            </p>
            <p style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: 1.65,
              color: 'rgba(255,255,255,0.60)'
            }}>
              {reasoning}
            </p>
          </div>
        </div>
      </div>

      {/* ── DETAILED BREAKDOWN ─────────────────── */}
      <div style={{ padding: '22px 28px' }}>
        <h3 style={{
          margin: '0 0 18px',
          fontSize: '17px',
          fontWeight: 700,
          textAlign: 'center',
          color: '#fff'
        }}>
          Detailed Breakdown
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {breakdown.map((item, idx) => {
            const sc = severityMap[item.severity] || severityMap.normal;
            const col = scoreColor(item.score);

            return (
              <div key={idx} style={{
                background: sc.bg,
                border: `1px solid ${sc.border}`,
                borderRadius: '10px',
                padding: '13px 16px'
              }}>
                {/* Top row: name + badge + score */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    flex: 1
                  }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#fff'
                    }}>
                      {item.aspect}
                    </span>
                    {sc.label && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: sc.badgeBg,
                        color: sc.badgeText,
                        letterSpacing: '0.05em'
                      }}>
                        {sc.label}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: col,
                    flexShrink: 0
                  }}>
                    {item.score}%
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{
                  height: '3px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '2px',
                  marginBottom: '9px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${item.score}%`,
                    background: col,
                    borderRadius: '2px'
                  }} />
                </div>

                {/* Description */}
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  lineHeight: 1.65,
                  color: 'rgba(255,255,255,0.50)'
                }}>
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '18px',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.28)'
        }}>
          <span>Analysis time: {(latencyMs / 1000).toFixed(1)}s</span>
          <span>{formatDate(timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
