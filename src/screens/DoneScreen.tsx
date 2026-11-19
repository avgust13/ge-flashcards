import { useEffect, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { Pill } from '../components/ui/Pill';
import { trVisible } from '../content/reading';
import { translit } from '../content/translit';
import { getSettings } from '../db/progress';
import type { SessionResultRow } from '../engine/types';
import type { SessionMode } from '../srs/types';
import { Confetti } from './cards/Confetti';
import { ScoreRing } from './summary/ScoreRing';

interface DoneState {
  mode: SessionMode;
  results: SessionResultRow[];
  activeMs: number;
  origin: string;
}

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100dvh;
  overflow: auto;
`;

const Wrap = styled.div`
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Hero = styled.div`
  padding: 32px 20px 18px;
  text-align: center;
`;

const HeadKa = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-size: 26px;
  font-weight: 700;
`;

const HeadRu = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 2px;
`;

const Card = styled.div`
  background: #fff;
  border-radius: 22px;
  padding: 18px;
  box-shadow: ${({ theme }) => theme.shadow};
  display: flex;
  align-items: center;
  gap: 18px;
  margin: 0 20px;
`;

const Tag = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.inkMute};
  letter-spacing: 1.2px;
  text-transform: uppercase;
`;

const Value = styled.div`
  font-size: 30px;
  font-weight: 900;

  span {
    color: ${({ theme }) => theme.colors.inkMute};
    font-size: 18px;
    font-weight: 800;
  }
`;

const Sub = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 4px;
`;

const SectionTitle = styled(Tag)`
  margin: 18px 20px 8px;
`;

const List = styled.div`
  background: #fff;
  border-radius: 18px;
  box-shadow: ${({ theme }) => theme.shadow};
  overflow: hidden;
  margin: 0 20px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.line};

  &:first-child {
    border-top: none;
  }
`;

const Mark = styled.div<{ $ok: boolean }>`
  width: 26px;
  height: 26px;
  border-radius: 13px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $ok, theme }) => ($ok ? theme.colors.successSoft : theme.colors.dangerSoft)};
  color: ${({ $ok, theme }) => ($ok ? theme.colors.success : theme.colors.danger)};
`;

const RowKa = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: 16px;
`;

const RowMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const CTAs = styled.div`
  padding: 16px 20px;
  display: flex;
  gap: 10px;
  margin-top: auto;
`;

/** End of a session: how it went and which items to keep an eye on. */
export function DoneScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const data = useLocation().state as DoneState | null;

  useEffect(() => {
    if (!data) navigate('/', { replace: true });
  }, [data, navigate]);

  const { good, total, rows } = useMemo(() => {
    const results = data?.results ?? [];
    // One row per card: its weakest answer of the session.
    const worst = new Map<string, SessionResultRow>();
    for (const r of results) {
      const cur = worst.get(r.card);
      if (!cur || r.rating < cur.rating) worst.set(r.card, r);
    }
    const list = [...worst.values()].sort((a, b) => a.rating - b.rating);
    return {
      good: results.filter((r) => r.rating >= 3).length,
      total: results.length,
      rows: list,
    };
  }, [data]);

  if (!data) return null;

  const pct = total === 0 ? 100 : Math.round((good / total) * 100);
  const accent = pct >= 80 ? theme.colors.success : pct >= 50 ? theme.colors.warn : theme.colors.danger;
  const headKa = pct >= 80 ? 'შესანიშნავია!' : pct >= 50 ? 'კარგი მუშაობა' : 'ვარჯიში გრძელდება';
  const headRu = pct >= 80 ? 'Превосходно!' : pct >= 50 ? 'Хорошая работа' : 'Тренировка продолжается';
  const minutes = Math.max(1, Math.round(data.activeMs / 60_000));

  return (
    <Screen>
      <Wrap>
        <Hero>
          <HeadKa>{headKa}</HeadKa>
          <HeadRu>{headRu}</HeadRu>
        </Hero>

        <Card>
          <ScoreRing value={pct / 100} color={accent} />
          <div style={{ flex: 1 }}>
            <Tag>Уверенных ответов</Tag>
            <Value>
              {good} <span>/ {total}</span>
            </Value>
            <Sub>
              {minutes} мин · {rows.length} {rows.length === 1 ? 'карточка' : 'карточек'}
            </Sub>
          </div>
        </Card>

        {rows.length > 0 && (
          <>
            <SectionTitle>Что было в занятии</SectionTitle>
            <List>
              {rows.slice(0, 10).map((r) => (
                <Row key={r.card}>
                  <Mark $ok={r.rating >= 3}>
                    <Icon name={r.rating >= 3 ? 'check' : 'close'} size={14} stroke={2.6} />
                  </Mark>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <RowKa>{r.ka}</RowKa>
                    <RowMeta>
                      {r.ka && trVisible(r.ka) ? `${translit(r.ka)} · ` : ''}
                      {r.ru}
                    </RowMeta>
                  </div>
                </Row>
              ))}
              {rows.length > 10 && (
                <Row>
                  <RowMeta style={{ margin: '0 auto', fontWeight: 700 }}>и ещё {rows.length - 10}</RowMeta>
                </Row>
              )}
            </List>
          </>
        )}

        <CTAs>
          {data.origin !== '/' && (
            <Pill kind="ghost" size="lg" style={{ flex: 1 }} onClick={() => navigate(data.origin, { replace: true })}>
              Назад
            </Pill>
          )}
          <Pill kind="primary" size="lg" style={{ flex: 1.4 }} onClick={() => navigate('/', { replace: true })}>
            На главную
          </Pill>
        </CTAs>
      </Wrap>
      {pct >= 80 && total > 0 && <Confetti />}
    </Screen>
  );
}
